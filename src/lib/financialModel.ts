import type {
  BalanceSheetYear,
  CashFlowYear,
  CompanyInfo,
  DcfInputs,
  DcfOutput,
  DcfProjectedYear,
  FinancialStatementsBundle,
  ForecastConfig,
  IncomeStatementYear,
  KeyRatiosYear,
  RiskProfile,
  SensitivityCell,
  SensitivityMatrix,
  SensitivityPair,
} from '../types/financial';

export const RISK_PROFILE_PRESETS: Record<
  RiskProfile,
  {
    label: string;
    shortTag: string;
    growthMultiplier: number;
    growthCap: number;
    marginStepBpsPerYear: number;
    capexMultiplier: number;
    nwcDaysMultiplier: number;
    terminalGrowthRate: number;
    waccAdjustmentBps: number;
    summary: string;
    learnMore: string;
  }
> = {
  low: {
    label: 'Low Risk (Conservative)',
    shortTag: 'Conservative',
    growthMultiplier: 0.7,
    growthCap: 0.08,
    marginStepBpsPerYear: -50,
    capexMultiplier: 1.15,
    nwcDaysMultiplier: 1.08,
    terminalGrowthRate: 0.015,
    waccAdjustmentBps: 100,
    summary: 'Historical CAGR × 0.7, −50bps/yr margins, 1.5% terminal growth, +100bps WACC.',
    learnMore:
      'The Low Risk profile assumes the company grows slower than its historical average, operating margins compress by 50bps annually, reinvestment needs remain conservative, and the discount rate increases by 100bps to reflect uncertainty. Best suited for mature businesses or cautious macro scenarios.',
  },
  medium: {
    label: 'Medium Risk (Base Case)',
    shortTag: 'Base Case',
    growthMultiplier: 1.0,
    growthCap: 0.22,
    marginStepBpsPerYear: 15,
    capexMultiplier: 1.0,
    nwcDaysMultiplier: 1.0,
    terminalGrowthRate: 0.025,
    waccAdjustmentBps: 0,
    summary: 'Trend-aligned revenue growth, steady margins, 2.5% terminal growth, base WACC.',
    learnMore:
      'The Medium Risk profile represents a balanced institutional base case. Revenue tapers gradually from recent historical momentum toward long-term sector norms, margins hold steady with modest operating leverage, and WACC reflects current market pricing.',
  },
  high: {
    label: 'High Risk (Aggressive)',
    shortTag: 'Aggressive',
    growthMultiplier: 1.3,
    growthCap: 0.35,
    marginStepBpsPerYear: 100,
    capexMultiplier: 0.88,
    nwcDaysMultiplier: 0.92,
    terminalGrowthRate: 0.035,
    waccAdjustmentBps: -50,
    summary: 'Historical CAGR × 1.3, +100bps/yr margin expansion, 3.5% terminal growth, −50bps WACC.',
    learnMore:
      'The High Risk profile models an upside bull case with accelerated revenue expansion, +100bps/yr operating margin leverage, higher capital efficiency, and a lower discount rate. Appropriate for high-conviction secular growth theses.',
  },
};

const safeDiv = (num: number, den: number, fallback = 0): number => {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-9) {
    return fallback;
  }
  return num / den;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * Computes historical ratios cleanly from IS, BS, and CF arrays.
 */
export function computeRatios(
  incomeStatement: IncomeStatementYear[],
  balanceSheet: BalanceSheetYear[]
): KeyRatiosYear[] {
  return incomeStatement.map((isRow, idx) => {
    const bsRow = balanceSheet[idx] ?? balanceSheet[balanceSheet.length - 1];
    const prevIs = idx > 0 ? incomeStatement[idx - 1] : null;

    const revenueGrowthYoY =
      prevIs && Math.abs(prevIs.revenue) > 1e-6
        ? round4((isRow.revenue - prevIs.revenue) / Math.abs(prevIs.revenue))
        : null;

    const totalDebt = bsRow ? bsRow.shortTermDebt + bsRow.longTermDebt : 0;
    const equity = bsRow ? bsRow.shareholdersEquity : 0;
    const investedCapital = Math.max(1, equity + totalDebt - (bsRow?.cashAndEquivalents ?? 0));
    const effectiveTax = Math.min(0.4, Math.max(0, safeDiv(isRow.taxExpense, Math.max(1, isRow.preTaxIncome), 0.21)));
    const nopat = isRow.ebit * (1 - effectiveTax);

    return {
      year: isRow.year,
      isForecast: isRow.isForecast,
      revenueGrowthYoY,
      grossMargin: round4(safeDiv(isRow.grossProfit, isRow.revenue)),
      operatingMargin: round4(safeDiv(isRow.ebit, isRow.revenue)),
      netMargin: round4(safeDiv(isRow.netIncome, isRow.revenue)),
      ebitdaMargin: round4(safeDiv(isRow.ebitda, isRow.revenue)),
      roe: round4(safeDiv(isRow.netIncome, equity)),
      roa: round4(safeDiv(isRow.netIncome, bsRow?.totalAssets ?? 1)),
      roic: round4(safeDiv(nopat, investedCapital)),
      currentRatio: round2(safeDiv(bsRow?.totalCurrentAssets ?? 0, bsRow?.totalCurrentLiabilities ?? 1)),
      debtToEquity: round2(safeDiv(totalDebt, equity)),
      interestCoverage: round2(
        isRow.interestExpense > 0.01 ? safeDiv(isRow.ebit, isRow.interestExpense) : 99.9
      ),
    };
  });
}

/**
 * Recalculates derived totals on a historical bundle after any manual cell edit.
 */
export function recalculateHistoricalBundle(
  incomeStatement: IncomeStatementYear[],
  balanceSheet: BalanceSheetYear[],
  cashFlow: CashFlowYear[]
): FinancialStatementsBundle {
  const normalizedIs = incomeStatement.map((row) => {
    const grossProfit = round2(row.revenue - row.cogs);
    const ebit = round2(grossProfit - row.sga - row.rd - row.da);
    const ebitda = round2(ebit + row.da);
    const preTaxIncome = round2(ebit - row.interestExpense);
    const netIncome = round2(preTaxIncome - row.taxExpense);
    const shares = Math.max(1, row.sharesOutstanding);
    const epsDiluted = round2(netIncome / shares);
    return {
      ...row,
      grossProfit,
      ebit,
      ebitda,
      preTaxIncome,
      netIncome,
      epsDiluted,
      epsBasic: round2(epsDiluted * 1.01),
    };
  });

  const normalizedBs = balanceSheet.map((row) => {
    const totalCurrentAssets = round2(row.cashAndEquivalents + row.accountsReceivable + row.inventory);
    const totalAssets = round2(totalCurrentAssets + row.ppeNet + row.goodwill + row.intangibles);
    const totalCurrentLiabilities = round2(row.accountsPayable + row.shortTermDebt);
    const totalLiabilities = round2(totalCurrentLiabilities + row.longTermDebt);
    return {
      ...row,
      totalCurrentAssets,
      totalAssets,
      totalCurrentLiabilities,
      totalLiabilities,
    };
  });

  const normalizedCf = cashFlow.map((row) => {
    const fcf = round2(row.cfo - row.capex);
    const netChangeInCash = round2(
      row.cfo - row.capex - row.acquisitions - row.dividends - row.shareRepurchases + row.debtIssuanceRepayment
    );
    return {
      ...row,
      fcf,
      netChangeInCash,
    };
  });

  return {
    incomeStatement: normalizedIs,
    balanceSheet: normalizedBs,
    cashFlow: normalizedCf,
    ratios: computeRatios(normalizedIs, normalizedBs),
  };
}

/**
 * Computes historical CAGR across the available historical income statements.
 */
export function computeHistoricalCagr(incomeStatement: IncomeStatementYear[]): number {
  if (incomeStatement.length < 2) return 0.06;
  const first = incomeStatement[0].revenue;
  const last = incomeStatement[incomeStatement.length - 1].revenue;
  const periods = incomeStatement.length - 1;
  if (first <= 0 || last <= 0 || periods <= 0) return 0.06;
  const cagr = Math.pow(last / first, 1 / periods) - 1;
  return Math.max(-0.15, Math.min(0.45, round4(cagr)));
}

/**
 * Builds default ForecastConfig based on historical statements and a selected RiskProfile.
 */
export function buildDefaultForecastConfig(
  historical: FinancialStatementsBundle,
  riskProfile: RiskProfile = 'medium',
  horizonYears: 1 | 3 | 5 | 7 | 10 = 5
): ForecastConfig {
  const preset = RISK_PROFILE_PRESETS[riskProfile];
  const baseCagr = computeHistoricalCagr(historical.incomeStatement);
  const histIs = historical.incomeStatement;
  const lastIs = histIs[histIs.length - 1];
  const prevIs = histIs.length >= 2 ? histIs[histIs.length - 2] : null;
  const latestYoY =
    prevIs && prevIs.revenue > 0 ? round4((lastIs.revenue - prevIs.revenue) / prevIs.revenue) : baseCagr;
  const anchorGrowth = Math.max(baseCagr, round4(baseCagr * 0.5 + Math.max(0.02, latestYoY) * 0.5));
  const lastCf = historical.cashFlow[historical.cashFlow.length - 1];

  const baseGrowth = Math.min(
    preset.growthCap,
    Math.max(0.01, round4(anchorGrowth * preset.growthMultiplier))
  );
  const customRevenueGrowthRates = Array.from({ length: horizonYears }, (_, i) => {
    // Smooth mean-reversion taper over longer horizons
    const taper = Math.max(0.55, 1 - i * 0.06);
    return round4(baseGrowth * taper + (1 - taper) * preset.terminalGrowthRate);
  });

  const lastOpMargin = safeDiv(lastIs.ebit, lastIs.revenue, 0.2);
  const customOperatingMargins = Array.from({ length: horizonYears }, (_, i) => {
    const delta = (preset.marginStepBpsPerYear / 10000) * (i + 1);
    return round4(Math.max(0.03, Math.min(0.58, lastOpMargin + delta)));
  });

  const histCapexPct = safeDiv(lastCf.capex, lastIs.revenue, 0.05);
  const capexPctRevenue = round4(Math.max(0.01, Math.min(0.25, histCapexPct * preset.capexMultiplier)));
  const effTax = Math.max(
    0.1,
    Math.min(0.35, round4(safeDiv(lastIs.taxExpense, Math.max(1, lastIs.preTaxIncome), 0.21)))
  );

  return {
    horizonYears,
    riskProfile,
    revenueGrowthModel: 'ai_suggested',
    customRevenueGrowthRates,
    marginAssumption: 'ai_suggested',
    customOperatingMargins,
    capexModel: 'pct_revenue',
    capexPctRevenue,
    taxRateMode: 'effective',
    customTaxRate: effTax,
    workingCapitalMode: 'days',
    aiModel: 'gemini',
  };
}

/**
 * Generates full 3-statement forecast + ratios from historical statements and ForecastConfig.
 */
export function generateForecastStatements(
  historical: FinancialStatementsBundle,
  config: ForecastConfig
): FinancialStatementsBundle {
  const histIs = historical.incomeStatement;
  const histBs = historical.balanceSheet;
  const histCf = historical.cashFlow;

  const lastIs = histIs[histIs.length - 1];
  const lastBs = histBs[histBs.length - 1];
  const lastCf = histCf[histCf.length - 1];
  const preset = RISK_PROFILE_PRESETS[config.riskProfile];

  const baseCagr = computeHistoricalCagr(histIs);
  const lastYearNum = parseInt(lastIs.year.replace(/\D/g, ''), 10) || 2025;

  const histGrossMargin = safeDiv(lastIs.grossProfit, lastIs.revenue, 0.45);
  const histOpMargin = safeDiv(lastIs.ebit, lastIs.revenue, 0.2);
  const histDaPct = safeDiv(lastIs.da, lastIs.revenue, 0.04);
  const histRdPct = safeDiv(lastIs.rd, lastIs.revenue, 0.06);
  const histEffectiveTax = Math.max(
    0.1,
    Math.min(0.35, safeDiv(lastIs.taxExpense, Math.max(1, lastIs.preTaxIncome), 0.21))
  );

  const taxRate =
    config.taxRateMode === 'statutory'
      ? 0.21
      : config.taxRateMode === 'custom'
        ? config.customTaxRate
        : histEffectiveTax;

  // Historical Working Capital days
  const dso = Math.max(10, safeDiv(lastBs.accountsReceivable, lastIs.revenue) * 365) * preset.nwcDaysMultiplier;
  const dio = Math.max(0, safeDiv(lastBs.inventory, Math.max(1, lastIs.cogs)) * 365) * preset.nwcDaysMultiplier;
  const dpo = Math.max(10, safeDiv(lastBs.accountsPayable, Math.max(1, lastIs.cogs)) * 365);

  const forecastIs: IncomeStatementYear[] = [];
  const forecastBs: BalanceSheetYear[] = [];
  const forecastCf: CashFlowYear[] = [];

  let prevRev = lastIs.revenue;
  let prevPpe = lastBs.ppeNet;
  let prevCash = lastBs.cashAndEquivalents;
  let prevEquity = lastBs.shareholdersEquity;
  let prevAr = lastBs.accountsReceivable;
  let prevInv = lastBs.inventory;
  let prevAp = lastBs.accountsPayable;

  // Compute linear slope if linear growth model selected
  const linearIncrement =
    histIs.length >= 2
      ? (lastIs.revenue - histIs[0].revenue) / (histIs.length - 1)
      : lastIs.revenue * 0.05;

  for (let i = 0; i < config.horizonYears; i++) {
    const yearLabel = `FY${lastYearNum + i + 1}E`;

    // 1. Determine Revenue Growth Rate
    let growthRate = config.customRevenueGrowthRates[i] ?? baseCagr * preset.growthMultiplier;
    if (config.revenueGrowthModel === 'cagr') {
      growthRate = Math.min(preset.growthCap, Math.max(-0.05, baseCagr * preset.growthMultiplier));
    } else if (config.revenueGrowthModel === 'linear') {
      const nextLinearRev = Math.max(prevRev * 0.85, prevRev + linearIncrement * preset.growthMultiplier);
      growthRate = safeDiv(nextLinearRev - prevRev, prevRev, 0.05);
    } else if (config.revenueGrowthModel === 'ai_suggested') {
      // Use customRevenueGrowthRates (which AI or default preset populated), or fallback taper
      if (config.customRevenueGrowthRates[i] === undefined) {
        const taper = Math.max(0.55, 1 - i * 0.06);
        growthRate = baseCagr * preset.growthMultiplier * taper + preset.terminalGrowthRate * (1 - taper);
      }
    }
    growthRate = Math.max(-0.25, Math.min(0.6, growthRate));
    const revenue = round2(prevRev * (1 + growthRate));

    // 2. Determine Operating Margin
    let opMargin = config.customOperatingMargins[i] ?? histOpMargin;
    if (config.marginAssumption === 'flat') {
      opMargin = histOpMargin;
    } else if (config.marginAssumption === 'expanding') {
      opMargin = Math.min(0.6, histOpMargin + 0.01 * (i + 1));
    } else if (config.marginAssumption === 'contracting') {
      opMargin = Math.max(0.03, histOpMargin - 0.0075 * (i + 1));
    } else if (config.marginAssumption === 'ai_suggested') {
      if (config.customOperatingMargins[i] === undefined) {
        opMargin = histOpMargin + (preset.marginStepBpsPerYear / 10000) * (i + 1);
      }
    }
    opMargin = Math.max(0.02, Math.min(0.62, opMargin));

    // Split gross profit & operating expenses consistently with target opMargin
    const marginDelta = opMargin - histOpMargin;
    const grossMargin = Math.max(0.15, Math.min(0.92, histGrossMargin + marginDelta * 0.45));
    const grossProfit = round2(revenue * grossMargin);
    const cogs = round2(revenue - grossProfit);
    const da = round2(revenue * histDaPct);
    const rd = round2(revenue * histRdPct);
    const ebit = round2(revenue * opMargin);
    const sga = round2(Math.max(0, grossProfit - ebit - rd - da));
    const ebitda = round2(ebit + da);

    const interestExpense = round2(lastIs.interestExpense);
    const preTaxIncome = round2(ebit - interestExpense);
    const taxExpense = round2(Math.max(0, preTaxIncome * taxRate));
    const netIncome = round2(preTaxIncome - taxExpense);
    const sharesOutstanding = round2(lastIs.sharesOutstanding * Math.pow(0.992, i + 1)); // modest buyback assumption
    const epsDiluted = round2(safeDiv(netIncome, sharesOutstanding));

    const driverNote = `Rev growth ${(growthRate * 100).toFixed(1)}% · Op margin ${(opMargin * 100).toFixed(1)}% (${config.riskProfile} risk)`;

    forecastIs.push({
      year: yearLabel,
      isForecast: true,
      revenue,
      cogs,
      grossProfit,
      sga,
      rd,
      da,
      ebit,
      interestExpense,
      preTaxIncome,
      taxExpense,
      netIncome,
      epsBasic: round2(epsDiluted * 1.01),
      epsDiluted,
      sharesOutstanding,
      ebitda,
      driverNote,
    });

    // 3. Working Capital & CapEx
    let accountsReceivable: number;
    let inventory: number;
    let accountsPayable: number;
    if (config.workingCapitalMode === 'pct_revenue') {
      accountsReceivable = round2(revenue * safeDiv(lastBs.accountsReceivable, lastIs.revenue, 0.1));
      inventory = round2(revenue * safeDiv(lastBs.inventory, lastIs.revenue, 0.04));
      accountsPayable = round2(revenue * safeDiv(lastBs.accountsPayable, lastIs.revenue, 0.08));
    } else {
      accountsReceivable = round2((revenue * dso) / 365);
      inventory = round2((cogs * dio) / 365);
      accountsPayable = round2((cogs * dpo) / 365);
    }

    const deltaNwc = round2(accountsReceivable - prevAr + (inventory - prevInv) - (accountsPayable - prevAp));
    const capex =
      config.capexModel === 'flat'
        ? round2(lastCf.capex * preset.capexMultiplier)
        : round2(revenue * config.capexPctRevenue);

    const cfo = round2(netIncome + da - deltaNwc);
    const fcf = round2(cfo - capex);
    const dividends = round2(Math.max(0, netIncome * safeDiv(lastCf.dividends, Math.max(1, lastIs.netIncome), 0.15)));
    const shareRepurchases = round2(Math.max(0, fcf * 0.25));
    const netChangeInCash = round2(cfo - capex - dividends - shareRepurchases);

    const cashAndEquivalents = round2(Math.max(0, prevCash + netChangeInCash));
    const ppeNet = round2(Math.max(0, prevPpe + capex - da));
    const totalCurrentAssets = round2(cashAndEquivalents + accountsReceivable + inventory);
    const totalAssets = round2(totalCurrentAssets + ppeNet + lastBs.goodwill + lastBs.intangibles);
    const totalCurrentLiabilities = round2(accountsPayable + lastBs.shortTermDebt);
    const totalLiabilities = round2(totalCurrentLiabilities + lastBs.longTermDebt);
    const shareholdersEquity = round2(prevEquity + netIncome - dividends - shareRepurchases);

    forecastBs.push({
      year: yearLabel,
      isForecast: true,
      cashAndEquivalents,
      accountsReceivable,
      inventory,
      totalCurrentAssets,
      ppeNet,
      goodwill: lastBs.goodwill,
      intangibles: lastBs.intangibles,
      totalAssets,
      accountsPayable,
      shortTermDebt: lastBs.shortTermDebt,
      totalCurrentLiabilities,
      longTermDebt: lastBs.longTermDebt,
      totalLiabilities,
      shareholdersEquity,
    });

    forecastCf.push({
      year: yearLabel,
      isForecast: true,
      cfo,
      capex,
      fcf,
      acquisitions: 0,
      dividends,
      shareRepurchases,
      debtIssuanceRepayment: 0,
      netChangeInCash,
    });

    prevRev = revenue;
    prevPpe = ppeNet;
    prevCash = cashAndEquivalents;
    prevEquity = shareholdersEquity;
    prevAr = accountsReceivable;
    prevInv = inventory;
    prevAp = accountsPayable;
  }

  const combinedIs = [...histIs, ...forecastIs];
  const combinedBs = [...histBs, ...forecastBs];
  const combinedRatios = computeRatios(combinedIs, combinedBs);

  return {
    incomeStatement: forecastIs,
    balanceSheet: forecastBs,
    cashFlow: forecastCf,
    ratios: combinedRatios.slice(histIs.length),
  };
}

/**
 * Calculates full DCF valuation, WACC, Enterprise Value, Equity Value, Implied Share Price, and Multiples.
 */
export function calculateDcfValuation(
  companyInfo: CompanyInfo,
  historical: FinancialStatementsBundle,
  forecast: FinancialStatementsBundle,
  dcfInputs: DcfInputs
): DcfOutput {
  const lastHistIs = historical.incomeStatement[historical.incomeStatement.length - 1];
  const lastHistBs = historical.balanceSheet[historical.balanceSheet.length - 1];

  const totalDebt = round2(lastHistBs.shortTermDebt + lastHistBs.longTermDebt);
  const cashAndEquivalents = round2(lastHistBs.cashAndEquivalents);
  const netDebt = round2(totalDebt - cashAndEquivalents);

  const equityMarketValue =
    companyInfo.marketCap > 0
      ? companyInfo.marketCap
      : Math.max(1, companyInfo.stockPrice * lastHistIs.sharesOutstanding);

  const totalCapital = Math.max(1, equityMarketValue + totalDebt);
  const equityWeight = round4(equityMarketValue / totalCapital);
  const debtWeight = round4(totalDebt / totalCapital);

  const costOfEquity = round4(dcfInputs.riskFreeRate + dcfInputs.beta * dcfInputs.equityRiskPremium);
  const computedCostOfDebt =
    totalDebt > 0.01 ? Math.min(0.12, Math.max(0.02, safeDiv(lastHistIs.interestExpense, totalDebt, 0.045))) : 0.04;
  const costOfDebt = round4(dcfInputs.costOfDebtOverride ?? computedCostOfDebt);

  const effectiveTaxRate = Math.max(
    0.1,
    Math.min(0.35, round4(safeDiv(lastHistIs.taxExpense, Math.max(1, lastHistIs.preTaxIncome), 0.21)))
  );
  const afterTaxCostOfDebt = round4(costOfDebt * (1 - effectiveTaxRate));

  const baseWacc = round4(equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt);
  const adjustedWacc = round4(Math.max(0.045, Math.min(0.2, baseWacc + dcfInputs.waccAdjustmentBps / 10000)));
  const terminalGrowthRate = Math.min(adjustedWacc - 0.01, Math.max(0.005, dcfInputs.terminalGrowthRate));

  const projectedFcfs: DcfProjectedYear[] = [];
  let prevNwc =
    lastHistBs.accountsReceivable + lastHistBs.inventory - lastHistBs.accountsPayable;

  for (let i = 0; i < forecast.incomeStatement.length; i++) {
    const fIs = forecast.incomeStatement[i];
    const fBs = forecast.balanceSheet[i];
    const fCf = forecast.cashFlow[i];

    const nwc = fBs.accountsReceivable + fBs.inventory - fBs.accountsPayable;
    const deltaNwc = round2(nwc - prevNwc);
    prevNwc = nwc;

    const nopat = round2(fIs.ebit * (1 - effectiveTaxRate));
    const ufcf = round2(nopat + fIs.da - fCf.capex - deltaNwc);
    const discountFactor = round4(1 / Math.pow(1 + adjustedWacc, i + 1));
    const pvOfFcf = round2(ufcf * discountFactor);

    projectedFcfs.push({
      year: fIs.year,
      ebit: fIs.ebit,
      nopat,
      da: fIs.da,
      capex: fCf.capex,
      deltaNwc,
      ufcf,
      discountFactor,
      pvOfFcf,
    });
  }

  const sumPvOfFcfs = round2(projectedFcfs.reduce((acc, y) => acc + y.pvOfFcf, 0));
  const finalUfcf = projectedFcfs[projectedFcfs.length - 1]?.ufcf ?? 0;
  const n = Math.max(1, projectedFcfs.length);

  const terminalValue = round2(
    (finalUfcf * (1 + terminalGrowthRate)) / Math.max(0.01, adjustedWacc - terminalGrowthRate)
  );
  const pvOfTerminalValue = round2(terminalValue / Math.pow(1 + adjustedWacc, n));
  const enterpriseValue = round2(sumPvOfFcfs + pvOfTerminalValue);
  const equityValue = round2(enterpriseValue - totalDebt + cashAndEquivalents);

  const dilutedShares = Math.max(1, lastHistIs.sharesOutstanding);
  const impliedSharePrice = round2(equityValue / dilutedShares);
  const currentSharePrice = round2(companyInfo.stockPrice || 100);
  const upsideDownsidePct = round4(safeDiv(impliedSharePrice - currentSharePrice, currentSharePrice));

  const fwdIs = forecast.incomeStatement[0] ?? lastHistIs;
  const fwdCf = forecast.cashFlow[0] ?? historical.cashFlow[historical.cashFlow.length - 1];

  return {
    costOfEquity,
    costOfDebt,
    effectiveTaxRate,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    baseWacc,
    wacc: adjustedWacc,
    terminalGrowthRate,
    projectedFcfs,
    sumPvOfFcfs,
    terminalValue,
    pvOfTerminalValue,
    enterpriseValue,
    totalDebt,
    cashAndEquivalents,
    netDebt,
    equityValue,
    dilutedShares,
    impliedSharePrice,
    currentSharePrice,
    upsideDownsidePct,
    multiples: {
      evToRevenue: round2(safeDiv(enterpriseValue, fwdIs.revenue)),
      evToEbitda: round2(safeDiv(enterpriseValue, fwdIs.ebitda)),
      impliedPE: round2(safeDiv(impliedSharePrice, Math.max(0.01, fwdIs.epsDiluted))),
      evToFcf: round2(safeDiv(enterpriseValue, Math.max(1, fwdCf.fcf))),
    },
  };
}

/**
 * Generates a 2-variable Sensitivity Analysis heatmap matrix.
 */
export function buildSensitivityMatrix(
  pair: SensitivityPair,
  companyInfo: CompanyInfo,
  historical: FinancialStatementsBundle,
  forecastConfig: ForecastConfig,
  forecast: FinancialStatementsBundle,
  dcfInputs: DcfInputs,
  baseDcf: DcfOutput
): SensitivityMatrix {
  const currentPrice = Math.max(0.01, companyInfo.stockPrice || baseDcf.currentSharePrice);

  const classify = (upsidePct: number): 'upside' | 'neutral' | 'downside' => {
    if (upsidePct > 0.2) return 'upside';
    if (upsidePct < -0.2) return 'downside';
    return 'neutral';
  };

  if (pair === 'wacc_tgr') {
    const tgrOffsets = [-0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015];
    const waccOffsets = [-0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015];
    const xValues = tgrOffsets.map((d) => round4(Math.max(0.005, Math.min(baseDcf.wacc - 0.008, baseDcf.terminalGrowthRate + d))));
    const yValues = waccOffsets.map((d) => round4(Math.max(0.04, Math.min(0.22, baseDcf.wacc + d))));

    const n = Math.max(1, baseDcf.projectedFcfs.length);
    const finalUfcf = baseDcf.projectedFcfs[baseDcf.projectedFcfs.length - 1]?.ufcf ?? 0;

    const cells: SensitivityCell[][] = yValues.map((waccVal, yIdx) =>
      xValues.map((tgrVal, xIdx) => {
        const effWacc = Math.max(tgrVal + 0.008, waccVal);
        const sumPv = baseDcf.projectedFcfs.reduce(
          (sum, f, idx) => sum + f.ufcf / Math.pow(1 + effWacc, idx + 1),
          0
        );
        const tv = (finalUfcf * (1 + tgrVal)) / Math.max(0.008, effWacc - tgrVal);
        const pvTv = tv / Math.pow(1 + effWacc, n);
        const ev = sumPv + pvTv;
        const eqVal = ev - baseDcf.totalDebt + baseDcf.cashAndEquivalents;
        const impliedPrice = round2(eqVal / baseDcf.dilutedShares);
        const upsidePct = round4((impliedPrice - currentPrice) / currentPrice);

        return {
          xValue: tgrVal,
          yValue: waccVal,
          impliedPrice,
          upsidePct,
          bucket: classify(upsidePct),
          isBase: xIdx === 3 && yIdx === 3,
        };
      })
    );

    return {
      pair,
      xLabel: 'Terminal Growth Rate',
      yLabel: 'WACC',
      xFormat: 'pct',
      yFormat: 'pct',
      xValues,
      yValues,
      cells,
    };
  }

  if (pair === 'growth_margin') {
    const baseGrowth = forecastConfig.customRevenueGrowthRates[0] ?? 0.08;
    const baseMargin = forecastConfig.customOperatingMargins[0] ?? 0.22;
    const xValues = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03].map((d) => round4(baseMargin + d));
    const yValues = [-0.04, -0.02, -0.01, 0, 0.01, 0.02, 0.04].map((d) => round4(baseGrowth + d));

    const cells: SensitivityCell[][] = yValues.map((gVal, yIdx) =>
      xValues.map((mVal, xIdx) => {
        const gDelta = gVal - baseGrowth;
        const mDelta = mVal - baseMargin;
        const modConfig: ForecastConfig = {
          ...forecastConfig,
          revenueGrowthModel: 'custom',
          marginAssumption: 'custom',
          customRevenueGrowthRates: forecastConfig.customRevenueGrowthRates.map((r) =>
            Math.max(-0.15, round4(r + gDelta))
          ),
          customOperatingMargins: forecastConfig.customOperatingMargins.map((m) =>
            Math.max(0.03, Math.min(0.6, round4(m + mDelta)))
          ),
        };
        const modForecast = generateForecastStatements(historical, modConfig);
        const modDcf = calculateDcfValuation(companyInfo, historical, modForecast, dcfInputs);
        return {
          xValue: mVal,
          yValue: gVal,
          impliedPrice: modDcf.impliedSharePrice,
          upsidePct: modDcf.upsideDownsidePct,
          bucket: classify(modDcf.upsideDownsidePct),
          isBase: xIdx === 3 && yIdx === 3,
        };
      })
    );

    return {
      pair,
      xLabel: 'Operating Margin (Yr 1)',
      yLabel: 'Revenue Growth (Yr 1)',
      xFormat: 'pct',
      yFormat: 'pct',
      xValues,
      yValues,
      cells,
    };
  }

  // capex_tgr
  const baseCapex = forecastConfig.capexPctRevenue;
  const xValues = [0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04];
  const yValues = [-0.02, -0.01, -0.005, 0, 0.005, 0.01, 0.02].map((d) =>
    Math.max(0.005, round4(baseCapex + d))
  );

  let closestX = 3;
  let minX = Infinity;
  xValues.forEach((x, idx) => {
    if (Math.abs(x - baseDcf.terminalGrowthRate) < minX) {
      minX = Math.abs(x - baseDcf.terminalGrowthRate);
      closestX = idx;
    }
  });

  const cells: SensitivityCell[][] = yValues.map((capexVal, yIdx) =>
    xValues.map((tgrVal, xIdx) => {
      const modConfig: ForecastConfig = {
        ...forecastConfig,
        capexModel: 'pct_revenue',
        capexPctRevenue: capexVal,
      };
      const modForecast = generateForecastStatements(historical, modConfig);
      const modDcf = calculateDcfValuation(companyInfo, historical, modForecast, {
        ...dcfInputs,
        terminalGrowthRate: tgrVal,
      });
      return {
        xValue: tgrVal,
        yValue: capexVal,
        impliedPrice: modDcf.impliedSharePrice,
        upsidePct: modDcf.upsideDownsidePct,
        bucket: classify(modDcf.upsideDownsidePct),
        isBase: xIdx === closestX && yIdx === 3,
      };
    })
  );

  return {
    pair,
    xLabel: 'Terminal Growth Rate',
    yLabel: 'CapEx % of Revenue',
    xFormat: 'pct',
    yFormat: 'pct',
    xValues,
    yValues,
    cells,
  };
}
