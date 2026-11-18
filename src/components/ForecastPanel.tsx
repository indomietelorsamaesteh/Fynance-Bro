import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RISK_PROFILE_PRESETS } from '../lib/financialModel';
import type {
  FinancialStatementsBundle,
  ForecastConfig,
  ForecastHorizon,
  RiskProfile,
} from '../types/financial';
import { InfoTooltip } from './InfoTooltip';

interface ForecastPanelProps {
  historical: FinancialStatementsBundle;
  forecast: FinancialStatementsBundle;
  config: ForecastConfig;
  isPro: boolean;
  aiLoading: boolean;
  aiError: string | null;
  onChangeConfig: (next: ForecastConfig) => void;
  onSwitchRiskProfile: (profile: RiskProfile) => void;
  onSwitchHorizon: (horizon: ForecastHorizon) => void;
  onRunAiForecast: () => void;
  onOpenUpgrade: (reason: string) => void;
}

export function ForecastPanel({
  historical,
  forecast,
  config,
  isPro,
  aiLoading,
  aiError,
  onChangeConfig,
  onSwitchRiskProfile,
  onSwitchHorizon,
  onRunAiForecast,
  onOpenUpgrade,
}: ForecastPanelProps) {
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  const chartData = [
    ...historical.incomeStatement.map((yr) => ({
      year: yr.year,
      revenue: Number(yr.revenue.toFixed(1)),
      ebitda: Number(yr.ebitda.toFixed(1)),
      opMargin: Number(((yr.ebit / Math.max(1, yr.revenue)) * 100).toFixed(1)),
    })),
    ...forecast.incomeStatement.map((yr) => ({
      year: yr.year,
      revenue: Number(yr.revenue.toFixed(1)),
      ebitda: Number(yr.ebitda.toFixed(1)),
      opMargin: Number(((yr.ebit / Math.max(1, yr.revenue)) * 100).toFixed(1)),
    })),
  ];

  const activePreset = RISK_PROFILE_PRESETS[config.riskProfile];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-lg font-bold text-[#1A1A2E]">
            Forecasting Engine & Risk Assumptions
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure projection horizon, risk posture, and operating drivers. All changes recalculate DCF valuation immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunAiForecast}
          disabled={aiLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{aiLoading ? 'Generating AI Assumptions...' : 'Run AI Forecast Drivers'}</span>
        </button>
      </div>

      {aiError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
          {aiError}
        </div>
      )}

      {config.aiRationale && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-[#1A1A2E]">Forecast Thesis: </span>
          {config.aiRationale}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-7">
          {/* Horizon & Risk Profile Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label htmlFor="fcst-horizon" className="text-xs font-semibold text-slate-700">
                  Forecast Horizon
                </label>
                <InfoTooltip
                  label="Forecast Horizon"
                  text="Number of explicit projection years before Terminal Value. 5 years is the institutional standard for DCF valuation."
                />
              </div>
              <select
                id="fcst-horizon"
                value={config.horizonYears}
                onChange={(e) => onSwitchHorizon(Number(e.target.value) as ForecastHorizon)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                {([1, 3, 5, 7, 10] as const).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} {yr === 1 ? 'Year' : 'Years'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-semibold text-slate-700">AI Reasoning Model</span>
                <InfoTooltip
                  label="AI Model"
                  text="Gemini is fast and available on all plans. Claude multi-model reasoning is unlocked on Pro."
                />
              </div>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ ...config, aiModel: 'gemini' })}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    config.aiModel === 'gemini' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Gemini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      onOpenUpgrade('Multi-model forecasting with Claude requires the Pro plan ($5/mo).');
                    } else {
                      onChangeConfig({ ...config, aiModel: 'claude' });
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    config.aiModel === 'claude' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {!isPro && <Lock className="h-3 w-3" />}
                  <span>Claude</span>
                </button>
              </div>
            </div>
          </div>

          {/* Risk Profile Segmented Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Risk Profile</span>
                <InfoTooltip
                  label="Risk Profile"
                  text="Adjusts revenue CAGR multiplier, operating margin trajectory, terminal growth, and WACC risk spread simultaneously."
                />
              </div>
              <button
                type="button"
                onClick={() => setShowRiskDetails((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#1A1A2E]"
              >
                <span>Learn More</span>
                {showRiskDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
              {(['low', 'medium', 'high'] as const).map((rp) => {
                const active = config.riskProfile === rp;
                return (
                  <button
                    key={rp}
                    type="button"
                    onClick={() => onSwitchRiskProfile(rp)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      active ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rp === 'low' ? 'Low Risk' : rp === 'medium' ? 'Medium Risk' : 'High Risk'}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{activePreset.summary}</p>

            {showRiskDetails && (
              <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
                <div className="font-semibold text-[#1A1A2E] mb-1">{activePreset.label}</div>
                {activePreset.learnMore}
              </div>
            )}
          </div>

          {/* Driver Controls Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label htmlFor="rev-model" className="text-xs font-medium text-slate-700">
                  Revenue Growth
                </label>
                <InfoTooltip
                  label="Revenue Growth Model"
                  text="AI-Suggested blends trend & guidance; Linear adds constant dollar increments; CAGR applies historical compound rate; Custom unlocks per-year overrides."
                />
              </div>
              <select
                id="rev-model"
                value={config.revenueGrowthModel}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    revenueGrowthModel: e.target.value as ForecastConfig['revenueGrowthModel'],
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                <option value="ai_suggested">AI-Suggested</option>
                <option value="linear">Linear Trend</option>
                <option value="cagr">CAGR-Based</option>
                <option value="custom">Custom Overrides</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label htmlFor="margin-model" className="text-xs font-medium text-slate-700">
                  Margin Assumptions
                </label>
                <InfoTooltip
                  label="Margin Assumptions"
                  text="Controls whether EBIT operating margins expand, contract, remain flat vs last year, or use custom per-year targets."
                />
              </div>
              <select
                id="margin-model"
                value={config.marginAssumption}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    marginAssumption: e.target.value as ForecastConfig['marginAssumption'],
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                <option value="ai_suggested">AI-Suggested</option>
                <option value="flat">Flat (Last Year)</option>
                <option value="expanding">Expanding (+100bps/yr)</option>
                <option value="contracting">Contracting (−75bps/yr)</option>
                <option value="custom">Custom Overrides</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label htmlFor="capex-model" className="text-xs font-medium text-slate-700">
                  CapEx Model
                </label>
                <InfoTooltip
                  label="CapEx Model"
                  text="% of Revenue scales capital expenditures with top-line growth; Flat holds dollar reinvestment constant."
                />
              </div>
              <select
                id="capex-model"
                value={config.capexModel}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    capexModel: e.target.value as ForecastConfig['capexModel'],
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                <option value="pct_revenue">% of Revenue ({(config.capexPctRevenue * 100).toFixed(1)}%)</option>
                <option value="flat">Flat Dollar CapEx</option>
                <option value="custom">Custom % of Revenue</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label htmlFor="tax-mode" className="text-xs font-medium text-slate-700">
                  Tax Rate
                </label>
                <InfoTooltip
                  label="Tax Rate"
                  text="Effective uses the company's actual 10-K rate; Statutory applies the 21% US corporate rate."
                />
              </div>
              <select
                id="tax-mode"
                value={config.taxRateMode}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    taxRateMode: e.target.value as ForecastConfig['taxRateMode'],
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                <option value="effective">Effective (from 10-K)</option>
                <option value="statutory">Statutory (21.0%)</option>
                <option value="custom">Custom ({(config.customTaxRate * 100).toFixed(1)}%)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label htmlFor="wc-mode" className="text-xs font-medium text-slate-700">
                  Working Capital
                </label>
                <InfoTooltip
                  label="Working Capital"
                  text="Days-Based projects AR, Inventory, and AP using historical DSO, DIO, and DPO cash conversion cycles."
                />
              </div>
              <select
                id="wc-mode"
                value={config.workingCapitalMode}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    workingCapitalMode: e.target.value as ForecastConfig['workingCapitalMode'],
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              >
                <option value="days">Days-Based (DSO/DIO/DPO)</option>
                <option value="pct_revenue">% of Revenue</option>
              </select>
            </div>

            {(config.capexModel === 'custom' || config.taxRateMode === 'custom') && (
              <div>
                <label htmlFor="custom-pct-input" className="block text-xs font-medium text-slate-700 mb-1">
                  {config.capexModel === 'custom' ? 'CapEx % of Rev' : 'Custom Tax %'}
                </label>
                <input
                  id="custom-pct-input"
                  type="number"
                  step="0.5"
                  value={
                    config.capexModel === 'custom'
                      ? Number((config.capexPctRevenue * 100).toFixed(1))
                      : Number((config.customTaxRate * 100).toFixed(1))
                  }
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(60, Number(e.target.value) || 0)) / 100;
                    if (config.capexModel === 'custom') {
                      onChangeConfig({ ...config, capexPctRevenue: val });
                    } else {
                      onChangeConfig({ ...config, customTaxRate: val });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono-tabular text-xs text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Custom Per-Year Inputs when Custom mode selected */}
          {(config.revenueGrowthModel === 'custom' || config.marginAssumption === 'custom') && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800">Per-Year Forecast Driver Overrides (%)</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {forecast.incomeStatement.map((yr, idx) => (
                  <div key={yr.year} className="space-y-1.5">
                    <div className="font-mono-tabular text-[11px] font-semibold text-slate-600">{yr.year}</div>
                    {config.revenueGrowthModel === 'custom' && (
                      <input
                        type="number"
                        step="0.5"
                        aria-label={`${yr.year} revenue growth percent`}
                        value={Number(((config.customRevenueGrowthRates[idx] ?? 0.05) * 100).toFixed(1))}
                        onChange={(e) => {
                          const nextRates = [...config.customRevenueGrowthRates];
                          nextRates[idx] = (Number(e.target.value) || 0) / 100;
                          onChangeConfig({ ...config, customRevenueGrowthRates: nextRates });
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono-tabular text-xs"
                        title="Revenue Growth %"
                      />
                    )}
                    {config.marginAssumption === 'custom' && (
                      <input
                        type="number"
                        step="0.5"
                        aria-label={`${yr.year} operating margin percent`}
                        value={Number(((config.customOperatingMargins[idx] ?? 0.2) * 100).toFixed(1))}
                        onChange={(e) => {
                          const nextMargins = [...config.customOperatingMargins];
                          nextMargins[idx] = (Number(e.target.value) || 0) / 100;
                          onChangeConfig({ ...config, customOperatingMargins: nextMargins });
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono-tabular text-xs"
                        title="Operating Margin %"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visual Trajectory Chart Column */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#FAFBFC] p-4 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1A1A2E]">Revenue & Operating Margin Trajectory</span>
              <span className="text-slate-500">Bars: Rev / Line: EBIT %</span>
            </div>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: '#15803D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                    }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue ($M)" fill="#1A1A2E" radius={[3, 3, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="opMargin"
                    name="EBIT Margin (%)"
                    stroke="#15803D"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 text-[11px] text-slate-500">
            <span>Terminal Year Revenue</span>
            <span className="font-mono-tabular font-semibold text-slate-800">
              ${forecast.incomeStatement[forecast.incomeStatement.length - 1]?.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}M
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
