import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { createSeedAppleModel, createSeedMicrosoftModel } from './src/data/seedModels';
import {
  calculateDcfValuation,
  generateForecastStatements,
  recalculateHistoricalBundle,
} from './src/lib/financialModel';
import type {
  CompanyInfo,
  DcfInputs,
  FinancialModelRecord,
  ForecastConfig,
  RiskProfile,
} from './src/types/financial';
import { buildFinancialModelWorkbook } from './server/excelExport';
import { assembleNewModelRecord, generateAiForecastDrivers, parse10KWithGemini } from './server/geminiParser';
import { generateEquityResearchPdf } from './server/pdfExport';
import {
  hashPassword,
  readStore,
  sanitizeUser,
  signSessionToken,
  validatePasswordStrength,
  verifyPassword,
  verifySessionToken,
  writeStore,
  type StoredUser,
} from './server/store';

interface AuthedRequest extends Request {
  user?: StoredUser;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return [part.trim(), ''];
      return [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim())];
    })
  );
}

function getTokenFromReq(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.fynance_session;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie('fynance_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = getTokenFromReq(req);
  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  const store = readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'Session expired or user not found.' });
    return;
  }
  req.user = user;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // =========================================================================
  // AUTHENTICATION & USER ACCOUNT ROUTES
  // =========================================================================
  app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanName = (name ?? '').trim();

    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const pwError = validatePasswordStrength(password ?? '');
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    const store = readStore();
    if (store.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const newUser: StoredUser = {
      id: userId,
      email: cleanEmail,
      name: cleanName,
      authProvider: 'email',
      subscriptionTier: 'free',
      analysesUsed: 0,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password!),
    };
    store.users.push(newUser);
    writeStore(store);

    const token = signSessionToken(userId);
    setSessionCookie(res, token);
    res.status(201).json({ user: sanitizeUser(newUser), token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const store = readStore();
    const user = store.users.find((u) => u.email === cleanEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const token = signSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/demo', (_req, res) => {
    const store = readStore();
    let demoUser = store.users.find((u) => u.id === 'demo-analyst-001');
    if (!demoUser) {
      demoUser = {
        id: 'demo-analyst-001',
        email: 'alex@fynancebro.com',
        name: 'Alex Morgan',
        authProvider: 'demo',
        subscriptionTier: 'free',
        analysesUsed: 2,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword('Analyst2026'),
      };
      store.users.push(demoUser);
      store.models.push(createSeedAppleModel(demoUser.id), createSeedMicrosoftModel(demoUser.id));
      writeStore(store);
    }
    const token = signSessionToken(demoUser.id);
    setSessionCookie(res, token);
    res.json({ user: sanitizeUser(demoUser), token });
  });

  app.post('/api/auth/google', (req, res) => {
    const { email, name } = req.body as { email?: string; name?: string };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Valid Google account email is required.' });
      return;
    }
    const store = readStore();
    let user = store.users.find((u) => u.email === cleanEmail);
    if (!user) {
      user = {
        id: `usr_${crypto.randomUUID().slice(0, 12)}`,
        email: cleanEmail,
        name: (name ?? cleanEmail.split('@')[0]).trim(),
        authProvider: 'google',
        subscriptionTier: 'free',
        analysesUsed: 0,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
      writeStore(store);
    }
    const token = signSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/reset-request', (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    const store = readStore();
    const user = store.users.find((u) => u.email === cleanEmail);
    if (!user) {
      res.json({ message: 'If an account matches that email, a reset token has been generated.' });
      return;
    }
    const resetToken = crypto.randomBytes(12).toString('hex');
    store.resetTokens = store.resetTokens.filter((t) => t.userId !== user.id);
    store.resetTokens.push({ token: resetToken, userId: user.id, expiresAt: Date.now() + 3600 * 1000 });
    writeStore(store);
    res.json({
      message: 'Password reset token issued. Enter it below to set a new password.',
      resetToken,
    });
  });

  app.post('/api/auth/reset-confirm', (req, res) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    const pwErr = validatePasswordStrength(newPassword ?? '');
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    const store = readStore();
    const record = store.resetTokens.find((t) => t.token === token && t.expiresAt > Date.now());
    if (!record) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }
    const user = store.users.find((u) => u.id === record.userId);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    user.passwordHash = hashPassword(newPassword!);
    store.resetTokens = store.resetTokens.filter((t) => t.token !== token);
    writeStore(store);
    res.json({ message: 'Password updated. You may now sign in.' });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('fynance_session', { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.patch('/api/auth/account', requireAuth, (req: AuthedRequest, res) => {
    const { name, currentPassword, newPassword, subscriptionTier } = req.body as {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
      subscriptionTier?: 'free' | 'pro';
    };
    const store = readStore();
    const user = store.users.find((u) => u.id === req.user!.id)!;

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        res.status(400).json({ error: 'Name must be at least 2 characters.' });
        return;
      }
      user.name = trimmed;
    }

    if (newPassword) {
      if (user.passwordHash && !verifyPassword(currentPassword ?? '', user.passwordHash)) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      const pwErr = validatePasswordStrength(newPassword);
      if (pwErr) {
        res.status(400).json({ error: pwErr });
        return;
      }
      user.passwordHash = hashPassword(newPassword);
    }

    if (subscriptionTier === 'free' || subscriptionTier === 'pro') {
      user.subscriptionTier = subscriptionTier;
    }

    writeStore(store);
    res.json({ user: sanitizeUser(user) });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthedRequest, res) => {
    const store = readStore();
    const uid = req.user!.id;
    store.users = store.users.filter((u) => u.id !== uid);
    store.models = store.models.filter((m) => m.userId !== uid);
    store.supportTickets = store.supportTickets.filter((t) => t.userId !== uid);
    writeStore(store);
    res.clearCookie('fynance_session', { path: '/' });
    res.json({ ok: true });
  });

  // =========================================================================
  // FINANCIAL MODELS CRUD & AI PARSING ROUTES (STRICT USER ISOLATION)
  // =========================================================================
  app.get('/api/models', requireAuth, (req: AuthedRequest, res) => {
    const query = String(req.query.q ?? '').trim().toLowerCase();
    const store = readStore();
    let models = store.models
      .filter((m) => m.userId === req.user!.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    if (query) {
      models = models.filter(
        (m) =>
          m.companyInfo.companyName.toLowerCase().includes(query) ||
          m.companyInfo.ticker.toLowerCase().includes(query) ||
          m.companyInfo.sector.toLowerCase().includes(query)
      );
    }
    res.json({ models });
  });

  app.get('/api/models/:id', requireAuth, (req: AuthedRequest, res) => {
    const store = readStore();
    const model = store.models.find((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (!model) {
      res.status(404).json({ error: 'Financial model not found.' });
      return;
    }
    res.json({ model });
  });

  app.post('/api/models/parse', requireAuth, upload.single('file'), async (req: AuthedRequest, res) => {
    const store = readStore();
    const user = store.users.find((u) => u.id === req.user!.id)!;

    if (user.subscriptionTier === 'free' && user.analysesUsed >= 3) {
      res.status(402).json({
        code: 'FREE_LIMIT_REACHED',
        error: "You've used all 3 free analyses. Upgrade to Pro ($5/month) for unlimited 10-K models.",
      });
      return;
    }

    const file = req.file;
    const rawText = typeof req.body?.content === 'string' ? req.body.content : undefined;
    const fileName = file?.originalname ?? (typeof req.body?.fileName === 'string' ? req.body.fileName : '10K_Filing.pdf');

    if (!file && (!rawText || rawText.trim().length < 50)) {
      res.status(400).json({ error: 'Please upload a valid 10-K PDF/HTML file or select a sample filing.' });
      return;
    }

    try {
      const parsed = await parse10KWithGemini({
        fileBuffer: file?.buffer,
        mimeType: file?.mimetype,
        fileName,
        rawText,
      });

      const modelId = `mdl_${crypto.randomUUID().slice(0, 12)}`;
      const model = assembleNewModelRecord({
        id: modelId,
        userId: user.id,
        fileName,
        parsed,
      });

      store.models.unshift(model);
      user.analysesUsed += 1;
      writeStore(store);

      res.status(201).json({ model, user: sanitizeUser(user) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse 10-K filing with Gemini AI.';
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/models/:id', requireAuth, (req: AuthedRequest, res) => {
    const store = readStore();
    const idx = store.models.findIndex((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Financial model not found.' });
      return;
    }

    const existing = store.models[idx];
    const body = req.body as {
      companyInfo?: CompanyInfo;
      historical?: FinancialModelRecord['historical'];
      forecastConfig?: ForecastConfig;
      dcfInputs?: DcfInputs;
      status?: FinancialModelRecord['status'];
      snapshotLabel?: string;
    };

    const companyInfo = body.companyInfo ?? existing.companyInfo;
    const historical = body.historical
      ? recalculateHistoricalBundle(
          body.historical.incomeStatement,
          body.historical.balanceSheet,
          body.historical.cashFlow
        )
      : existing.historical;
    const forecastConfig = body.forecastConfig ?? existing.forecastConfig;
    const forecast = generateForecastStatements(historical, forecastConfig);
    const dcfInputs = body.dcfInputs ?? existing.dcfInputs;
    const dcfOutput = calculateDcfValuation(companyInfo, historical, forecast, dcfInputs);
    const now = new Date().toISOString();

    const versions = [...existing.versions];
    if (body.snapshotLabel) {
      versions.unshift({
        id: `v-${Date.now()}`,
        timestamp: now,
        label: body.snapshotLabel,
        companyInfo,
        historical,
        forecastConfig,
        forecast,
        dcfInputs,
        dcfOutput,
      });
    }

    const updated: FinancialModelRecord = {
      ...existing,
      companyInfo,
      historical,
      forecastConfig,
      forecast,
      dcfInputs,
      dcfOutput,
      status: body.status ?? existing.status,
      versions: versions.slice(0, 15),
      updatedAt: now,
    };

    store.models[idx] = updated;
    writeStore(store);
    res.json({ model: updated });
  });

  app.post('/api/models/:id/ai-forecast', requireAuth, async (req: AuthedRequest, res) => {
    const store = readStore();
    const idx = store.models.findIndex((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Financial model not found.' });
      return;
    }

    const existing = store.models[idx];
    const { riskProfile, horizonYears, aiModel } = req.body as {
      riskProfile?: RiskProfile;
      horizonYears?: 1 | 3 | 5 | 7 | 10;
      aiModel?: 'gemini' | 'claude';
    };

    if (aiModel === 'claude' && req.user!.subscriptionTier !== 'pro') {
      res.status(402).json({
        code: 'PRO_REQUIRED',
        error: 'Claude model selection requires a Pro subscription ($5/month).',
      });
      return;
    }

    const targetRisk = riskProfile ?? existing.forecastConfig.riskProfile;
    const targetHorizon = horizonYears ?? existing.forecastConfig.horizonYears;

    try {
      const aiDrivers = await generateAiForecastDrivers({
        companyInfo: existing.companyInfo,
        historical: existing.historical,
        riskProfile: targetRisk,
        horizonYears: targetHorizon,
      });

      const nextConfig: ForecastConfig = {
        ...existing.forecastConfig,
        riskProfile: targetRisk,
        horizonYears: targetHorizon,
        revenueGrowthModel: 'ai_suggested',
        marginAssumption: 'ai_suggested',
        customRevenueGrowthRates: aiDrivers.revenueGrowthRates.slice(0, targetHorizon),
        customOperatingMargins: aiDrivers.operatingMargins.slice(0, targetHorizon),
        capexPctRevenue: aiDrivers.capexPctRevenue,
        aiRationale: aiDrivers.rationale,
      };

      const forecast = generateForecastStatements(existing.historical, nextConfig);
      const dcfOutput = calculateDcfValuation(existing.companyInfo, existing.historical, forecast, existing.dcfInputs);
      const now = new Date().toISOString();

      const updated: FinancialModelRecord = {
        ...existing,
        forecastConfig: nextConfig,
        forecast,
        dcfOutput,
        status: 'valued',
        versions: [
          {
            id: `v-${Date.now()}`,
            timestamp: now,
            label: `AI Forecast (${targetRisk.toUpperCase()}, ${targetHorizon}Y)`,
            companyInfo: existing.companyInfo,
            historical: existing.historical,
            forecastConfig: nextConfig,
            forecast,
            dcfInputs: existing.dcfInputs,
            dcfOutput,
          },
          ...existing.versions,
        ].slice(0, 15),
        updatedAt: now,
      };

      store.models[idx] = updated;
      writeStore(store);
      res.json({ model: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI Forecast generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/models/:id/revert/:versionId', requireAuth, (req: AuthedRequest, res) => {
    const store = readStore();
    const idx = store.models.findIndex((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Financial model not found.' });
      return;
    }

    const existing = store.models[idx];
    const ver = existing.versions.find((v) => v.id === req.params.versionId);
    if (!ver) {
      res.status(404).json({ error: 'Version snapshot not found.' });
      return;
    }

    const updated: FinancialModelRecord = {
      ...existing,
      companyInfo: ver.companyInfo,
      historical: ver.historical,
      forecastConfig: ver.forecastConfig,
      forecast: ver.forecast,
      dcfInputs: ver.dcfInputs,
      dcfOutput: ver.dcfOutput,
      updatedAt: new Date().toISOString(),
    };
    store.models[idx] = updated;
    writeStore(store);
    res.json({ model: updated });
  });

  app.delete('/api/models/:id', requireAuth, (req: AuthedRequest, res) => {
    const store = readStore();
    const before = store.models.length;
    store.models = store.models.filter((m) => !(m.id === req.params.id && m.userId === req.user!.id));
    if (store.models.length === before) {
      res.status(404).json({ error: 'Model not found.' });
      return;
    }
    writeStore(store);
    res.json({ ok: true });
  });

  // =========================================================================
  // EXCEL (.XLSX) & PDF EQUITY RESEARCH EXPORT ROUTES
  // =========================================================================
  app.get('/api/models/:id/export/excel', requireAuth, async (req: AuthedRequest, res) => {
    const store = readStore();
    const model = store.models.find((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (!model) {
      res.status(404).json({ error: 'Model not found.' });
      return;
    }
    const wb = await buildFinancialModelWorkbook(
      model,
      req.user!.name,
      req.user!.subscriptionTier === 'free'
    );
    const buffer = await wb.xlsx.writeBuffer();
    const safeTicker = model.companyInfo.ticker.replace(/[^a-zA-Z0-9_-]/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTicker}_Financial_Model_FynanceBro.xlsx"`);
    res.send(Buffer.from(buffer));
  });

  app.get('/api/models/:id/export/pdf', requireAuth, async (req: AuthedRequest, res) => {
    if (req.user!.subscriptionTier !== 'pro') {
      res.status(402).json({
        code: 'PRO_REQUIRED',
        error: 'Equity Research PDF export is a Pro feature. Upgrade to Pro ($5/month) to download PDF reports.',
      });
      return;
    }
    const store = readStore();
    const model = store.models.find((m) => m.id === req.params.id && m.userId === req.user!.id);
    if (!model) {
      res.status(404).json({ error: 'Model not found.' });
      return;
    }
    const pdfBuffer = await generateEquityResearchPdf(model, req.user!.name);
    const safeTicker = model.companyInfo.ticker.replace(/[^a-zA-Z0-9_-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTicker}_Equity_Research_FynanceBro.pdf"`);
    res.send(pdfBuffer);
  });

  // =========================================================================
  // SUPPORT / REPORT ISSUE ROUTE
  // =========================================================================
  app.post('/api/support', requireAuth, (req: AuthedRequest, res) => {
    const { subject, message } = req.body as { subject?: string; message?: string };
    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }
    const store = readStore();
    const ticket = {
      id: `tkt_${crypto.randomUUID().slice(0, 8)}`,
      userId: req.user!.id,
      email: req.user!.email,
      subject: subject.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    store.supportTickets.push(ticket);
    writeStore(store);
    res.status(201).json({ ticket });
  });

  // Guarantee all unknown /api/* routes and upload/middleware errors return JSON (never HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file exceeds the 30 MB limit. Please upload a smaller PDF or EDGAR HTML filing.'
          : `Upload error: ${err.message}`;
      res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: message });
      return;
    }
    if (req.path.startsWith('/api/')) {
      const message = err instanceof Error ? err.message : 'Unexpected server error.';
      res.status(500).json({ error: message });
      return;
    }
    next(err);
  });

  // =========================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Fynance Bro server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
