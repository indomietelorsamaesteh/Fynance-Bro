import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSeedAppleModel, createSeedMicrosoftModel } from '../src/data/seedModels';
import type { FinancialModelRecord, UserProfile } from '../src/types/financial';

export interface StoredUser extends UserProfile {
  passwordHash?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface StoreSchema {
  users: StoredUser[];
  models: FinancialModelRecord[];
  resetTokens: { token: string; userId: string; expiresAt: number }[];
  supportTickets: SupportTicket[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'fynance_store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'fynance-bro-dev-session-secret-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function signSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (!parsed.sub || parsed.exp < Date.now()) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

export function sanitizeUser(user: StoredUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider,
    subscriptionTier: user.subscriptionTier,
    analysesUsed: user.analysesUsed,
    createdAt: user.createdAt,
  };
}

function createInitialStore(): StoreSchema {
  const demoUserId = 'demo-analyst-001';
  const demoUser: StoredUser = {
    id: demoUserId,
    email: 'alex@fynancebro.com',
    name: 'Alex Morgan',
    authProvider: 'demo',
    subscriptionTier: 'free',
    analysesUsed: 2,
    createdAt: new Date(Date.now() - 86400 * 1000 * 7).toISOString(),
    passwordHash: hashPassword('Analyst2026'),
  };

  return {
    users: [demoUser],
    models: [createSeedAppleModel(demoUserId), createSeedMicrosoftModel(demoUserId)],
    resetTokens: [],
    supportTickets: [],
  };
}

let cachedStore: StoreSchema | null = null;

export function readStore(): StoreSchema {
  if (cachedStore) return cachedStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      cachedStore = JSON.parse(raw) as StoreSchema;
      return cachedStore;
    }
  } catch {
    // Fall through to re-seed if file was corrupted
  }
  cachedStore = createInitialStore();
  writeStore(cachedStore);
  return cachedStore;
}

export function writeStore(store: StoreSchema): void {
  cachedStore = store;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least 1 uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least 1 number.';
  }
  return null;
}
