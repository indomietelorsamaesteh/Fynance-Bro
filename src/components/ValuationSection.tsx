import { useMemo, useState } from 'react';
import { FIELD_TOOLTIPS } from '../data/learningContent';
import { buildSensitivityMatrix } from '../lib/financialModel';
import type {
  CompanyInfo,
  DcfInputs,
  DcfOutput,
  FinancialStatementsBundle,
  ForecastConfig,
  SensitivityPair,
} from '../types/financial';
import { InfoTooltip } from './InfoTooltip';

interface ValuationSectionProps {
  companyInfo: CompanyInfo;
  historical: FinancialStatementsBundle;
  forecastConfig: ForecastConfig;
  forecast: FinancialStatementsBundle;
  dcfInputs: DcfInputs;
  dcfOutput: DcfOutput;
  onChangeDcfInputs: (next: DcfInputs) => void;
  onChangeStockPrice: (price: number) => void;
}

export function ValuationSection({
  companyInfo,
  historical,
  forecastConfig,
  forecast,
  dcfInputs,
  dcfOutput,
  onChangeDcfInputs,
  onChangeStockPrice,
}: ValuationSectionProps) {
  const [sensitivityPair, setSensitivityPair] = useState<SensitivityPair>('wacc_tgr');

  const sensitivityMatrix = useMemo(
    () =>
      buildSensitivityMatrix(
        sensitivityPair,
        companyInfo,
        historical,
        forecastConfig,
        forecast,
        dcfInputs,
        dcfOutput
      ),
    [sensitivityPair, companyInfo, historical, forecastConfig, forecast, dcfInputs, dcfOutput]
  );

  const upside = dcfOutput.upsideDownsidePct;
  const isUpside = upside >= 0;

  return (
    <div className="space-y-6">
      {/* 4 Valuation KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Implied Share Price</span>
            <InfoTooltip label="Implied Share Price" text={FIELD_TOOLTIPS.impliedSharePrice} />
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#1A1A2E]">
            ${dcfOutput.impliedSharePrice.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Equity Value: ${(dcfOutput.equityValue / 1000).toFixed(1)}B
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">Current Market Price</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-tabular text-2xl font-bold text-slate-900">
              ${companyInfo.stockPrice.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {companyInfo.exchange}: {companyInfo.ticker}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500">Implied Upside / Downside</div>
          <div
            className={`mt-2 font-mono-tabular text-2xl font-bold ${
              isUpside ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {isUpside ? '+' : ''}
            {(upside * 100).toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Signal: {upside >= 0.12 ? 'Undervalued (Buy)' : upside <= -0.1 ? 'Overvalued (Sell)' : 'Fair Value (Hold)'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>WACC (Discount Rate)</span>
            <InfoTooltip label="WACC" text={FIELD_TOOLTIPS.wacc} />
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#1A1A2E]">
            {(dcfOutput.wacc * 100).toFixed(2)}%
          </div>
          <div className="mt-1 font-mono-tabular text-xs text-slate-500">
            Ke: {(dcfOutput.costOfEquity * 100).toFixed(1)}% · TGR: {(dcfOutput.terminalGrowthRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Supporting Multiples Strip */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500">Implied EV / Revenue</div>
          <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">
            {dcfOutput.multiples.evToRevenue.toFixed(1)}x
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Implied EV / EBITDA</div>
          <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">
            {dcfOutput.multiples.evToEbitda.toFixed(1)}x
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Implied Forward P/E</div>
          <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">
            {dcfOutput.multiples.impliedPE.toFixed(1)}x
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Implied EV / FCF</div>
          <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">
            {dcfOutput.multiples.evToFcf.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* DCF Assumptions & Valuation Bridge */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-[#1A1A2E]">
          Discounted Cash Flow (DCF) Valuation & WACC Inputs
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Interactive Inputs */}
          <div className="space-y-4 lg:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dcf-rf" className="block text-xs font-medium text-slate-700 mb-1">
                  Risk-Free Rate (%)
                </label>
                <input
                  id="dcf-rf"
                  type="number"
                  step="0.1"
                  value={Number((dcfInputs.riskFreeRate * 100).toFixed(2))}
                  onChange={(e) =>
                    onChangeDcfInputs({ ...dcfInputs, riskFreeRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label htmlFor="dcf-beta" className="text-xs font-medium text-slate-700">
                    Equity Beta (β)
                  </label>
                  <InfoTooltip
                    label="Beta"
                    text="Measures stock volatility relative to the broader market (1.0 = market average)."
                  />
                </div>
                <input
                  id="dcf-beta"
                  type="number"
                  step="0.05"
                  value={dcfInputs.beta}
                  onChange={(e) => onChangeDcfInputs({ ...dcfInputs, beta: Math.max(0.2, Number(e.target.value) || 1) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dcf-erp" className="block text-xs font-medium text-slate-700 mb-1">
                  Equity Risk Premium (%)
                </label>
                <input
                  id="dcf-erp"
                  type="number"
                  step="0.1"
                  value={Number((dcfInputs.equityRiskPremium * 100).toFixed(2))}
                  onChange={(e) =>
                    onChangeDcfInputs({ ...dcfInputs, equityRiskPremium: (Number(e.target.value) || 0) / 100 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label htmlFor="dcf-tgr" className="text-xs font-medium text-slate-700">
                    Terminal Growth (%)
                  </label>
                  <InfoTooltip
                    label="Terminal Growth Rate"
                    text="Perpetual growth rate beyond the forecast horizon (typically 1.5%–3.5%, near long-term GDP)."
                  />
                </div>
                <input
                  id="dcf-tgr"
                  type="number"
                  step="0.25"
                  value={Number((dcfInputs.terminalGrowthRate * 100).toFixed(2))}
                  onChange={(e) =>
                    onChangeDcfInputs({ ...dcfInputs, terminalGrowthRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dcf-price" className="block text-xs font-medium text-slate-700 mb-1">
                  Market Share Price ($)
                </label>
                <input
                  id="dcf-price"
                  type="number"
                  step="0.5"
                  value={companyInfo.stockPrice}
                  onChange={(e) => onChangeStockPrice(Math.max(0.01, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dcf-wacc-adj" className="block text-xs font-medium text-slate-700 mb-1">
                  Risk WACC Adj. (bps)
                </label>
                <input
                  id="dcf-wacc-adj"
                  type="number"
                  step="25"
                  value={dcfInputs.waccAdjustmentBps}
                  onChange={(e) =>
                    onChangeDcfInputs({ ...dcfInputs, waccAdjustmentBps: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>
            </div>

            {/* Enterprise to Equity Bridge Summary */}
            <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-xs space-y-2 font-mono-tabular">
              <div className="flex justify-between">
                <span className="font-sans text-slate-600">PV of Forecast UFCFs</span>
                <span className="font-semibold text-slate-900">${dcfOutput.sumPvOfFcfs.toLocaleString('en-US', { maximumFractionDigits: 1 })}M</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-slate-600">PV of Terminal Value</span>
                <span className="font-semibold text-slate-900">${dcfOutput.pvOfTerminalValue.toLocaleString('en-US', { maximumFractionDigits: 1 })}M</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-sans font-semibold text-slate-900">Enterprise Value (EV)</span>
                <span className="font-bold text-[#1A1A2E]">${dcfOutput.enterpriseValue.toLocaleString('en-US', { maximumFractionDigits: 1 })}M</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Less: Total Debt</span>
                <span>(${dcfOutput.totalDebt.toLocaleString('en-US', { maximumFractionDigits: 1 })}M)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Plus: Cash & Equivalents</span>
                <span>${dcfOutput.cashAndEquivalents.toLocaleString('en-US', { maximumFractionDigits: 1 })}M</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-sans font-semibold text-slate-900">Implied Equity Value</span>
                <span className="font-bold text-emerald-800">${dcfOutput.equityValue.toLocaleString('en-US', { maximumFractionDigits: 1 })}M</span>
              </div>
            </div>
          </div>

          {/* UFCF Schedule Table */}
          <div className="overflow-x-auto lg:col-span-7">
            <table className="w-full border-collapse text-right font-mono-tabular text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="px-3 py-2.5 text-left font-sans font-semibold">Unlevered FCF Schedule</th>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <th key={y.year} className="px-3 py-2.5 font-semibold text-sky-950 bg-sky-50/80">
                      {y.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 text-left font-sans text-slate-600">EBIT</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">${y.ebit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-left font-sans text-slate-600">NOPAT</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">${y.nopat.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-left font-sans text-slate-600">Plus: D&A</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">${y.da.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-left font-sans text-slate-600">Less: CapEx</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2 text-red-700">(${y.capex.toLocaleString('en-US', { maximumFractionDigits: 0 })})</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-left font-sans text-slate-600">Less: Δ Working Capital</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">{y.deltaNwc.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="px-3 py-2 text-left font-sans">Unlevered Free Cash Flow</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">${y.ufcf.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
                <tr className="font-semibold text-[#1A1A2E]">
                  <td className="px-3 py-2 text-left font-sans">Present Value of UFCF</td>
                  {dcfOutput.projectedFcfs.map((y) => (
                    <td key={y.year} className="px-3 py-2">${y.pvOfFcf.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sensitivity Analysis Heatmap */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1A1A2E]">
              Sensitivity Analysis Matrix (Implied Share Price)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Green = &gt;20% upside · Amber = within ±20% · Red = &gt;20% downside vs ${companyInfo.stockPrice.toFixed(2)} · Outlined cell = Base Case
            </p>
          </div>

          <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(
              [
                ['wacc_tgr', 'WACC × TGR'],
                ['growth_margin', 'Rev Growth × Margin'],
                ['capex_tgr', 'CapEx % × TGR'],
              ] as const
            ).map(([pairId, label]) => (
              <button
                key={pairId}
                type="button"
                onClick={() => setSensitivityPair(pairId)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  sensitivityPair === pairId ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-center font-mono-tabular text-xs">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-100 px-3 py-2.5 text-left font-sans font-semibold text-slate-700">
                  {sensitivityMatrix.yLabel} \ {sensitivityMatrix.xLabel}
                </th>
                {sensitivityMatrix.xValues.map((xVal, xIdx) => (
                  <th key={xIdx} className="border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800">
                    {(xVal * 100).toFixed(1)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityMatrix.yValues.map((yVal, yIdx) => (
                <tr key={yIdx}>
                  <th className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-800">
                    {(yVal * 100).toFixed(1)}%
                  </th>
                  {sensitivityMatrix.cells[yIdx].map((cell, xIdx) => {
                    const bgClass =
                      cell.bucket === 'upside'
                        ? 'bg-emerald-50 text-emerald-950'
                        : cell.bucket === 'downside'
                          ? 'bg-red-50 text-red-950'
                          : 'bg-amber-50 text-amber-950';
                    return (
                      <td
                        key={xIdx}
                        title={`Upside: ${(cell.upsidePct * 100).toFixed(1)}%`}
                        className={`border px-3 py-2.5 ${bgClass} ${
                          cell.isBase
                            ? 'border-2 border-[#1A1A2E] font-bold ring-1 ring-[#1A1A2E]'
                            : 'border-slate-200'
                        }`}
                      >
                        ${cell.impliedPrice.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
