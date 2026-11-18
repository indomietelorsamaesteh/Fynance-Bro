export type RiskProfile = 'low' | 'medium' | 'high';
export type ForecastHorizon = 1 | 3 | 5 | 7 | 10;
export type RevenueGrowthModel = 'ai_suggested' | 'linear' | 'cagr' | 'custom';
export type MarginAssumption = 'ai_suggested' | 'flat' | 'expanding' | 'contracting' | 'custom';
export type CapexModel = 'pct_revenue' | 'flat' | 'custom';
export type TaxRateMode = 'effective' | 'statutory' | 'custom';
export type WorkingCapitalMode = 'days' | 'pct_revenue' | 'custom';
export type AiModelChoice = 'gemini' | 'claude';
export type SensitivityPair = 'wacc_tgr' | 'growth_margin' | 'capex_tgr';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  authProvider: 'email' | 'google' | 'demo';
  subscriptionTier: 'free' | 'pro';
  analysesUsed: number;
  createdAt: string;
}

export interface CompanyInfo {
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  headquarters: string;
  ceo: string;
  fiscalYearEnd: string;
  employees: string;
  description: string;
  stockPrice: number;
  marketCap: number;
  currencyUnit: string;
}

export interface IncomeStatementYear {
  year: string;
  isForecast?: boolean;
  revenue: number;
  cogs: number;
  grossProfit: number;
  sga: number;
  rd: number;
  da: number;
  ebit: number;
  interestExpense: number;
  preTaxIncome: number;
  taxExpense: number;
  netIncome: number;
  epsBasic: number;
  epsDiluted: number;
  sharesOutstanding: number;
  ebitda: number;
  driverNote?: string;
}

export interface BalanceSheetYear {
  year: string;
  isForecast?: boolean;
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  totalCurrentAssets: number;
  ppeNet: number;
  goodwill: number;
  intangibles: number;
  totalAssets: number;
  accountsPayable: number;
  shortTermDebt: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  shareholdersEquity: number;
}

export interface CashFlowYear {
  year: string;
  isForecast?: boolean;
  cfo: number;
  capex: number;
  fcf: number;
  acquisitions: number;
  dividends: number;
  shareRepurchases: number;
  debtIssuanceRepayment: number;
  netChangeInCash: number;
}

export interface KeyRatiosYear {
  year: string;
  isForecast?: boolean;
  revenueGrowthYoY: number | null;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  roe: number;
  roa: number;
  roic: number;
  currentRatio: number;
  debtToEquity: number;
  interestCoverage: number;
}

export interface FinancialStatementsBundle {
  incomeStatement: IncomeStatementYear[];
  balanceSheet: BalanceSheetYear[];
  cashFlow: CashFlowYear[];
  ratios: KeyRatiosYear[];
}

export interface ForecastConfig {
  horizonYears: ForecastHorizon;
  riskProfile: RiskProfile;
  revenueGrowthModel: RevenueGrowthModel;
  customRevenueGrowthRates: number[];
  marginAssumption: MarginAssumption;
  customOperatingMargins: number[];
  capexModel: CapexModel;
  capexPctRevenue: number;
  taxRateMode: TaxRateMode;
  customTaxRate: number;
  workingCapitalMode: WorkingCapitalMode;
  aiModel: AiModelChoice;
  aiRationale?: string;
}

export interface DcfInputs {
  riskFreeRate: number;
  beta: number;
  equityRiskPremium: number;
  costOfDebtOverride?: number;
  terminalGrowthRate: number;
  waccAdjustmentBps: number;
}

export interface DcfProjectedYear {
  year: string;
  ebit: number;
  nopat: number;
  da: number;
  capex: number;
  deltaNwc: number;
  ufcf: number;
  discountFactor: number;
  pvOfFcf: number;
}

export interface DcfOutput {
  costOfEquity: number;
  costOfDebt: number;
  effectiveTaxRate: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  baseWacc: number;
  wacc: number;
  terminalGrowthRate: number;
  projectedFcfs: DcfProjectedYear[];
  sumPvOfFcfs: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  totalDebt: number;
  cashAndEquivalents: number;
  netDebt: number;
  equityValue: number;
  dilutedShares: number;
  impliedSharePrice: number;
  currentSharePrice: number;
  upsideDownsidePct: number;
  multiples: {
    evToRevenue: number;
    evToEbitda: number;
    impliedPE: number;
    evToFcf: number;
  };
}

export interface SensitivityCell {
  xValue: number;
  yValue: number;
  impliedPrice: number;
  upsidePct: number;
  bucket: 'upside' | 'neutral' | 'downside';
  isBase: boolean;
}

export interface SensitivityMatrix {
  pair: SensitivityPair;
  xLabel: string;
  yLabel: string;
  xFormat: 'pct' | 'bps';
  yFormat: 'pct' | 'bps';
  xValues: number[];
  yValues: number[];
  cells: SensitivityCell[][];
}

export interface ModelVersion {
  id: string;
  timestamp: string;
  label: string;
  companyInfo: CompanyInfo;
  historical: FinancialStatementsBundle;
  forecastConfig: ForecastConfig;
  forecast: FinancialStatementsBundle;
  dcfInputs: DcfInputs;
  dcfOutput: DcfOutput;
}

export interface FinancialModelRecord {
  id: string;
  userId: string;
  companyInfo: CompanyInfo;
  historical: FinancialStatementsBundle;
  forecastConfig: ForecastConfig;
  forecast: FinancialStatementsBundle;
  dcfInputs: DcfInputs;
  dcfOutput: DcfOutput;
  status: 'historical' | 'forecasted' | 'valued';
  sourceFileName?: string;
  versions: ModelVersion[];
  createdAt: string;
  updatedAt: string;
}
