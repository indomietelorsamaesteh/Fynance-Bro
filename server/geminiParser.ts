import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildDefaultForecastConfig,
  calculateDcfValuation,
  generateForecastStatements,
  recalculateHistoricalBundle,
} from '../src/lib/financialModel';
import type {
  BalanceSheetYear,
  CashFlowYear,
  CompanyInfo,
  DcfInputs,
  FinancialModelRecord,
  FinancialStatementsBundle,
  IncomeStatementYear,
  RiskProfile,
} from '../src/types/financial';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripHtmlToReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatGeminiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown AI error');
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: number; status?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Check if JSON is embedded inside message string
    const match = /\{[\s\S]*"message"\s*:\s*"([^"]+)"[\s\S]*\}/.exec(raw);
    if (match?.[1]) return match[1];
  }
  return raw;
}

function isTransientGeminiError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('timeout') ||
    msg.includes('econnreset')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  buildRequest: (model: string, includeThinking: boolean) => Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  let lastError: unknown;
  // Attempt primary model (gemini-4-hydrogen) with bounded timeout & 1 retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await withTimeout(
        ai.models.generateContent(buildRequest('gemini-4-hydrogen', true)),
        32000,
        'Gemini 10-K extraction'
      );
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err) && !(err instanceof Error && err.message.includes('timed out'))) {
        throw err;
      }
      if (attempt === 0) {
        await sleep(800);
      }
    }
  }

  // Fallback to gemini-3.1-flash-lite if primary model remains transiently unavailable or timed out
  if (
    isTransientGeminiError(lastError) ||
    (lastError instanceof Error && lastError.message.includes('timed out'))
  ) {
    try {
      return await withTimeout(
        ai.models.generateContent(buildRequest('gemini-3.1-flash-lite', false)),
        32000,
        'Gemini fallback extraction'
      );
    } catch (fallbackErr) {
      lastError = fallbackErr;
    }
  }

  throw new Error(formatGeminiErrorMessage(lastError));
}

export interface ParsedFilingResult {
  companyInfo: CompanyInfo;
  historical: FinancialStatementsBundle;
  aiRationale: string;
}

export async function parse10KWithGemini(params: {
  fileBuffer?: Buffer;
  mimeType?: string;
  fileName: string;
  rawText?: string;
}): Promise<ParsedFilingResult> {
  const ai = getGeminiClient();

  const systemInstruction = `You are a senior Wall Street equity research analyst and CPA.
Extract structured company metadata and 3-5 years of historical consolidated financial statements (Income Statement, Balance Sheet, Cash Flow Statement) from the provided SEC Form 10-K filing.
Normalize all monetary figures into USD Millions (e.g., if the filing reports in thousands, divide by 1,000; if in raw dollars, divide by 1,000,000). Report Shares Outstanding in Millions.
Provide a crisp, institutional 2-paragraph company description summarizing Item 1 (Business, revenue segments, competitive positioning, geographic footprint).
Ensure CapEx is returned as a positive outflow number so Free Cash Flow = CFO - CapEx.
Order years chronologically from oldest to newest (e.g., FY2022, FY2023, FY2024).`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      companyInfo: {
        type: Type.OBJECT,
        properties: {
          companyName: { type: Type.STRING },
          ticker: { type: Type.STRING },
          exchange: { type: Type.STRING },
          sector: { type: Type.STRING },
          industry: { type: Type.STRING },
          headquarters: { type: Type.STRING },
          ceo: { type: Type.STRING },
          fiscalYearEnd: { type: Type.STRING },
          employees: { type: Type.STRING },
          description: { type: Type.STRING },
          stockPrice: { type: Type.NUMBER },
          marketCap: { type: Type.NUMBER },
        },
        required: [
          'companyName',
          'ticker',
          'exchange',
          'sector',
          'industry',
          'headquarters',
          'ceo',
          'fiscalYearEnd',
          'employees',
          'description',
          'stockPrice',
          'marketCap',
        ],
      },
      incomeStatement: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            revenue: { type: Type.NUMBER },
            cogs: { type: Type.NUMBER },
            sga: { type: Type.NUMBER },
            rd: { type: Type.NUMBER },
            da: { type: Type.NUMBER },
            interestExpense: { type: Type.NUMBER },
            taxExpense: { type: Type.NUMBER },
            sharesOutstanding: { type: Type.NUMBER },
          },
          required: ['year', 'revenue', 'cogs', 'sga', 'rd', 'da', 'interestExpense', 'taxExpense', 'sharesOutstanding'],
        },
      },
      balanceSheet: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            cashAndEquivalents: { type: Type.NUMBER },
            accountsReceivable: { type: Type.NUMBER },
            inventory: { type: Type.NUMBER },
            ppeNet: { type: Type.NUMBER },
            goodwill: { type: Type.NUMBER },
            intangibles: { type: Type.NUMBER },
            accountsPayable: { type: Type.NUMBER },
            shortTermDebt: { type: Type.NUMBER },
            longTermDebt: { type: Type.NUMBER },
            shareholdersEquity: { type: Type.NUMBER },
          },
          required: [
            'year',
            'cashAndEquivalents',
            'accountsReceivable',
            'inventory',
            'ppeNet',
            'goodwill',
            'intangibles',
            'accountsPayable',
            'shortTermDebt',
            'longTermDebt',
            'shareholdersEquity',
          ],
        },
      },
      cashFlow: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            cfo: { type: Type.NUMBER },
            capex: { type: Type.NUMBER },
            acquisitions: { type: Type.NUMBER },
            dividends: { type: Type.NUMBER },
            shareRepurchases: { type: Type.NUMBER },
            debtIssuanceRepayment: { type: Type.NUMBER },
          },
          required: ['year', 'cfo', 'capex', 'acquisitions', 'dividends', 'shareRepurchases', 'debtIssuanceRepayment'],
        },
      },
      aiRationale: { type: Type.STRING },
    },
    required: ['companyInfo', 'incomeStatement', 'balanceSheet', 'cashFlow', 'aiRationale'],
  };

  const isPdfFile =
    Boolean(params.fileBuffer) &&
    (params.mimeType === 'application/pdf' ||
      params.mimeType === 'application/x-pdf' ||
      params.fileName.toLowerCase().endsWith('.pdf') ||
      params.fileBuffer!.subarray(0, 5).toString('ascii') === '%PDF-');

  let uploadedFileName: string | null = null;
  let contents: unknown;

  try {
    if (isPdfFile && params.fileBuffer) {
      const promptText = `Parse this Form 10-K or Annual Report filing (${params.fileName}) and extract the company profile and multi-year Income Statement, Balance Sheet, and Cash Flow Statement in USD Millions.`;

      // Use Gemini Files API for PDFs > 8 MB to avoid inline payload size limits
      if (params.fileBuffer.byteLength > 8 * 1024 * 1024) {
        const pdfBlob = new Blob([new Uint8Array(params.fileBuffer)], { type: 'application/pdf' });
        const uploaded = await ai.files.upload({
          file: pdfBlob,
          config: { mimeType: 'application/pdf', displayName: params.fileName },
        });
        uploadedFileName = uploaded.name ?? null;

        let activeFile = uploaded;
        for (let poll = 0; poll < 15 && activeFile.state === 'PROCESSING'; poll++) {
          await sleep(1000);
          if (activeFile.name) {
            activeFile = await ai.files.get({ name: activeFile.name });
          }
        }
        if (activeFile.state === 'FAILED') {
          throw new Error('Gemini could not process the uploaded PDF file. Please ensure the PDF is not corrupted or password-protected.');
        }

        contents = {
          parts: [
            {
              fileData: {
                fileUri: activeFile.uri,
                mimeType: activeFile.mimeType ?? 'application/pdf',
              },
            },
            { text: promptText },
          ],
        };
      } else {
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: params.fileBuffer.toString('base64'),
              },
            },
            { text: promptText },
          ],
        };
      }
    } else {
      const rawStr = params.rawText ?? params.fileBuffer?.toString('utf8') ?? '';
      const cleaned = stripHtmlToReadableText(rawStr).slice(0, 180000);
      contents = `Parse the following SEC Form 10-K / Annual Report filing (${params.fileName}) and extract company profile plus multi-year Income Statement, Balance Sheet, and Cash Flow Statement in USD Millions:\n\n${cleaned}`;
    }

    const response = await generateWithRetryAndFallback(ai, (model, includeThinking) => ({
      model,
      contents: contents as string,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        ...(includeThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    }));

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response while parsing the filing.');
    }

    const parsed = JSON.parse(text) as {
    companyInfo: Omit<CompanyInfo, 'currencyUnit'>;
    incomeStatement: Array<{
      year: string;
      revenue: number;
      cogs: number;
      sga: number;
      rd: number;
      da: number;
      interestExpense: number;
      taxExpense: number;
      sharesOutstanding: number;
    }>;
    balanceSheet: Array<{
      year: string;
      cashAndEquivalents: number;
      accountsReceivable: number;
      inventory: number;
      ppeNet: number;
      goodwill: number;
      intangibles: number;
      accountsPayable: number;
      shortTermDebt: number;
      longTermDebt: number;
      shareholdersEquity: number;
    }>;
    cashFlow: Array<{
      year: string;
      cfo: number;
      capex: number;
      acquisitions: number;
      dividends: number;
      shareRepurchases: number;
      debtIssuanceRepayment: number;
    }>;
    aiRationale: string;
  };

  if (!parsed.incomeStatement?.length) {
    throw new Error('Could not locate consolidated Income Statement data in the uploaded document.');
  }

  const isRows: IncomeStatementYear[] = parsed.incomeStatement.map((r) => ({
    year: r.year,
    revenue: r.revenue,
    cogs: r.cogs,
    grossProfit: 0,
    sga: r.sga,
    rd: r.rd,
    da: r.da,
    ebit: 0,
    interestExpense: r.interestExpense,
    preTaxIncome: 0,
    taxExpense: r.taxExpense,
    netIncome: 0,
    epsBasic: 0,
    epsDiluted: 0,
    sharesOutstanding: Math.max(1, r.sharesOutstanding),
    ebitda: 0,
  }));

  const bsRows: BalanceSheetYear[] = parsed.balanceSheet.map((r) => ({
    year: r.year,
    cashAndEquivalents: r.cashAndEquivalents,
    accountsReceivable: r.accountsReceivable,
    inventory: r.inventory,
    totalCurrentAssets: 0,
    ppeNet: r.ppeNet,
    goodwill: r.goodwill,
    intangibles: r.intangibles,
    totalAssets: 0,
    accountsPayable: r.accountsPayable,
    shortTermDebt: r.shortTermDebt,
    totalCurrentLiabilities: 0,
    longTermDebt: r.longTermDebt,
    totalLiabilities: 0,
    shareholdersEquity: r.shareholdersEquity,
  }));

  const cfRows: CashFlowYear[] = parsed.cashFlow.map((r) => ({
    year: r.year,
    cfo: r.cfo,
    capex: Math.abs(r.capex),
    fcf: 0,
    acquisitions: Math.abs(r.acquisitions),
    dividends: Math.abs(r.dividends),
    shareRepurchases: Math.abs(r.shareRepurchases),
    debtIssuanceRepayment: r.debtIssuanceRepayment,
    netChangeInCash: 0,
  }));

  const historical = recalculateHistoricalBundle(isRows, bsRows, cfRows);
  const lastIs = historical.incomeStatement[historical.incomeStatement.length - 1];
  const stockPrice =
    parsed.companyInfo.stockPrice > 0
      ? parsed.companyInfo.stockPrice
      : Math.max(10, Math.round((lastIs.epsDiluted * 20) * 100) / 100);
  const marketCap =
    parsed.companyInfo.marketCap > 0
      ? parsed.companyInfo.marketCap
      : Math.round(stockPrice * lastIs.sharesOutstanding);

    return {
      companyInfo: {
        ...parsed.companyInfo,
        stockPrice,
        marketCap,
        currencyUnit: 'USD Millions',
      },
      historical,
      aiRationale: parsed.aiRationale,
    };
  } finally {
    if (uploadedFileName) {
      await ai.files.delete({ name: uploadedFileName }).catch(() => {});
    }
  }
}

export async function generateAiForecastDrivers(params: {
  companyInfo: CompanyInfo;
  historical: FinancialStatementsBundle;
  riskProfile: RiskProfile;
  horizonYears: number;
}): Promise<{
  revenueGrowthRates: number[];
  operatingMargins: number[];
  capexPctRevenue: number;
  rationale: string;
}> {
  const ai = getGeminiClient();

  const histSummary = params.historical.incomeStatement.map((is, idx) => ({
    year: is.year,
    revenue: is.revenue,
    grossMargin: params.historical.ratios[idx]?.grossMargin,
    operatingMargin: params.historical.ratios[idx]?.operatingMargin,
    capexPctRev: params.historical.cashFlow[idx]
      ? params.historical.cashFlow[idx].capex / Math.max(1, is.revenue)
      : 0.05,
  }));

  const response = await generateWithRetryAndFallback(ai, (model, includeThinking) => ({
    model,
    contents: `Generate ${params.horizonYears}-year institutional forecast drivers for ${params.companyInfo.companyName} (${params.companyInfo.ticker}) in ${params.companyInfo.industry}.
Risk profile requested: ${params.riskProfile.toUpperCase()} (low=conservative, medium=base case, high=aggressive).
Historical trajectory: ${JSON.stringify(histSummary)}
Return exact arrays of length ${params.horizonYears} with decimal rates (e.g., 0.085 for 8.5%).`,
    config: {
      systemInstruction:
        'You are an institutional equity analyst generating realistic, disciplined forecast assumptions grounded in historical financials and risk posture.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          revenueGrowthRates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          operatingMargins: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          capexPctRevenue: { type: Type.NUMBER },
          rationale: { type: Type.STRING },
        },
        required: ['revenueGrowthRates', 'operatingMargins', 'capexPctRevenue', 'rationale'],
      },
      ...(includeThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
    },
  }));

  const parsed = JSON.parse(response.text ?? '{}') as {
    revenueGrowthRates: number[];
    operatingMargins: number[];
    capexPctRevenue: number;
    rationale: string;
  };

  if (!Array.isArray(parsed.revenueGrowthRates) || parsed.revenueGrowthRates.length === 0) {
    throw new Error('Gemini did not return valid forecast driver arrays.');
  }

  return parsed;
}

export function assembleNewModelRecord(params: {
  id: string;
  userId: string;
  fileName: string;
  parsed: ParsedFilingResult;
}): FinancialModelRecord {
  const forecastConfig = buildDefaultForecastConfig(params.parsed.historical, 'medium', 5);
  forecastConfig.aiRationale = params.parsed.aiRationale;
  const forecast = generateForecastStatements(params.parsed.historical, forecastConfig);
  const dcfInputs: DcfInputs = {
    riskFreeRate: 0.0425,
    beta: 1.1,
    equityRiskPremium: 0.048,
    terminalGrowthRate: 0.025,
    waccAdjustmentBps: 0,
  };
  const dcfOutput = calculateDcfValuation(params.parsed.companyInfo, params.parsed.historical, forecast, dcfInputs);
  const now = new Date().toISOString();

  return {
    id: params.id,
    userId: params.userId,
    companyInfo: params.parsed.companyInfo,
    historical: params.parsed.historical,
    forecastConfig,
    forecast,
    dcfInputs,
    dcfOutput,
    status: 'valued',
    sourceFileName: params.fileName,
    versions: [
      {
        id: `v-${Date.now()}`,
        timestamp: now,
        label: 'Initial 10-K Parse & Base DCF',
        companyInfo: params.parsed.companyInfo,
        historical: params.parsed.historical,
        forecastConfig,
        forecast,
        dcfInputs,
        dcfOutput,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
