import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultForecastConfig,
  buildSensitivityMatrix,
  calculateDcfValuation,
  computeHistoricalCagr,
  generateForecastStatements,
  recalculateHistoricalBundle,
} from './financialModel';
import { createSeedAppleModel } from '../data/seedModels';

test('recalculateHistoricalBundle computes derived margins and FCF accurately', () => {
  const bundle = recalculateHistoricalBundle(
    [
      {
        year: 'FY2024',
        revenue: 1000,
        cogs: 400,
        grossProfit: 0,
        sga: 150,
        rd: 100,
        da: 50,
        ebit: 0,
        interestExpense: 20,
        preTaxIncome: 0,
        taxExpense: 56,
        netIncome: 0,
        epsBasic: 0,
        epsDiluted: 0,
        sharesOutstanding: 100,
        ebitda: 0,
      },
    ],
    [
      {
        year: 'FY2024',
        cashAndEquivalents: 200,
        accountsReceivable: 100,
        inventory: 50,
        totalCurrentAssets: 0,
        ppeNet: 300,
        goodwill: 50,
        intangibles: 0,
        totalAssets: 0,
        accountsPayable: 80,
        shortTermDebt: 20,
        totalCurrentLiabilities: 0,
        longTermDebt: 180,
        totalLiabilities: 0,
        shareholdersEquity: 420,
      },
    ],
    [
      {
        year: 'FY2024',
        cfo: 300,
        capex: 75,
        fcf: 0,
        acquisitions: 0,
        dividends: 25,
        shareRepurchases: 50,
        debtIssuanceRepayment: 0,
        netChangeInCash: 0,
      },
    ]
  );

  assert.equal(bundle.incomeStatement[0].grossProfit, 600);
  assert.equal(bundle.incomeStatement[0].ebit, 300);
  assert.equal(bundle.incomeStatement[0].ebitda, 350);
  assert.equal(bundle.incomeStatement[0].netIncome, 224);
  assert.equal(bundle.incomeStatement[0].epsDiluted, 2.24);
  assert.equal(bundle.balanceSheet[0].totalCurrentAssets, 350);
  assert.equal(bundle.balanceSheet[0].totalAssets, 700);
  assert.equal(bundle.cashFlow[0].fcf, 225);
  assert.equal(bundle.ratios[0].grossMargin, 0.6);
  assert.equal(bundle.ratios[0].operatingMargin, 0.3);
});

test('risk profiles produce monotonically higher implied valuations from Low -> Medium -> High risk', () => {
  const seed = createSeedAppleModel('test-user');

  const lowCfg = buildDefaultForecastConfig(seed.historical, 'low', 5);
  const medCfg = buildDefaultForecastConfig(seed.historical, 'medium', 5);
  const highCfg = buildDefaultForecastConfig(seed.historical, 'high', 5);

  const lowForecast = generateForecastStatements(seed.historical, lowCfg);
  const medForecast = generateForecastStatements(seed.historical, medCfg);
  const highForecast = generateForecastStatements(seed.historical, highCfg);

  const lowDcf = calculateDcfValuation(seed.companyInfo, seed.historical, lowForecast, {
    ...seed.dcfInputs,
    terminalGrowthRate: 0.015,
    waccAdjustmentBps: 100,
  });
  const medDcf = calculateDcfValuation(seed.companyInfo, seed.historical, medForecast, {
    ...seed.dcfInputs,
    terminalGrowthRate: 0.025,
    waccAdjustmentBps: 0,
  });
  const highDcf = calculateDcfValuation(seed.companyInfo, seed.historical, highForecast, {
    ...seed.dcfInputs,
    terminalGrowthRate: 0.035,
    waccAdjustmentBps: -50,
  });

  assert.ok(lowForecast.incomeStatement.length === 5);
  assert.ok(lowDcf.impliedSharePrice < medDcf.impliedSharePrice);
  assert.ok(medDcf.impliedSharePrice < highDcf.impliedSharePrice);
  assert.ok(lowDcf.wacc > medDcf.wacc);
  assert.ok(medDcf.wacc > highDcf.wacc);
});

test('forecast horizons support 1, 3, 5, 7, and 10 years', () => {
  const seed = createSeedAppleModel('test-user');
  for (const horizon of [1, 3, 5, 7, 10] as const) {
    const cfg = buildDefaultForecastConfig(seed.historical, 'medium', horizon);
    const out = generateForecastStatements(seed.historical, cfg);
    assert.equal(out.incomeStatement.length, horizon);
    assert.equal(out.balanceSheet.length, horizon);
    assert.equal(out.cashFlow.length, horizon);
    assert.equal(out.ratios.length, horizon);
  }
});

test('sensitivity matrix highlights base cell and classifies upside/downside buckets', () => {
  const seed = createSeedAppleModel('test-user');
  const matrix = buildSensitivityMatrix(
    'wacc_tgr',
    seed.companyInfo,
    seed.historical,
    seed.forecastConfig,
    seed.forecast,
    seed.dcfInputs,
    seed.dcfOutput
  );

  assert.equal(matrix.cells.length, 7);
  assert.equal(matrix.cells[0].length, 7);

  let baseCount = 0;
  for (const row of matrix.cells) {
    for (const cell of row) {
      if (cell.isBase) baseCount++;
      assert.ok(['upside', 'neutral', 'downside'].includes(cell.bucket));
    }
  }
  assert.equal(baseCount, 1);

  // Higher WACC (last row) must yield lower implied share price than lower WACC (first row)
  assert.ok(matrix.cells[0][3].impliedPrice > matrix.cells[6][3].impliedPrice);
  // Higher terminal growth (last col) must yield higher implied share price than lower TGR (first col)
  assert.ok(matrix.cells[3][6].impliedPrice > matrix.cells[3][0].impliedPrice);
  // Center cell matches base DCF output
  assert.equal(matrix.cells[3][3].isBase, true);
  assert.ok(Math.abs(matrix.cells[3][3].impliedPrice - seed.dcfOutput.impliedSharePrice) < 0.05);
});

test('computeHistoricalCagr computes valid multi-year growth rate', () => {
  const seed = createSeedAppleModel('test-user');
  const cagr = computeHistoricalCagr(seed.historical.incomeStatement);
  assert.ok(cagr > 0 && cagr < 0.15);
});

test('calibrated Apple seed model yields realistic positive implied upside', () => {
  const seed = createSeedAppleModel('test-user');
  assert.ok(seed.dcfOutput.impliedSharePrice > seed.companyInfo.stockPrice);
  assert.ok(seed.dcfOutput.impliedSharePrice > 225 && seed.dcfOutput.impliedSharePrice < 265);
  assert.ok(seed.dcfOutput.upsideDownsidePct > 0);
});
