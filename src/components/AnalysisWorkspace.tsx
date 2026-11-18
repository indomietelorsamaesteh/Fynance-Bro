import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  History,
  Lock,
  Save,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import {
  RISK_PROFILE_PRESETS,
  buildDefaultForecastConfig,
  calculateDcfValuation,
  generateForecastStatements,
  recalculateHistoricalBundle,
} from '../lib/financialModel';
import type {
  DcfInputs,
  FinancialModelRecord,
  ForecastConfig,
  ForecastHorizon,
  RiskProfile,
  UserProfile,
} from '../types/financial';
import { FinancialTable } from './FinancialTable';
import { ForecastPanel } from './ForecastPanel';
import { ValuationSection } from './ValuationSection';

interface AnalysisWorkspaceProps {
  model: FinancialModelRecord;
  user: UserProfile;
  onBack: () => void;
  onModelUpdated: (updated: FinancialModelRecord) => void;
  onOpenUpgrade: (reason: string) => void;
}

export function AnalysisWorkspace({
  model,
  user,
  onBack,
  onModelUpdated,
  onOpenUpgrade,
}: AnalysisWorkspaceProps) {
  const [localModel, setLocalModel] = useState<FinancialModelRecord>(model);
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalModel(model);
  }, [model.id]);

  const scheduleAutoSave = (nextModel: FinancialModelRecord, snapshotLabel?: string) => {
    setSaveState('saving');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await api.updateModel(nextModel.id, {
          companyInfo: nextModel.companyInfo,
          historical: nextModel.historical,
          forecastConfig: nextModel.forecastConfig,
          dcfInputs: nextModel.dcfInputs,
          status: nextModel.status,
          snapshotLabel,
        });
        setLocalModel(res.model);
        onModelUpdated(res.model);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 900);
  };

  const applyAndSave = (
    patch: Partial<Pick<FinancialModelRecord, 'companyInfo' | 'historical' | 'forecastConfig' | 'dcfInputs' | 'status'>>,
    snapshotLabel?: string
  ) => {
    const companyInfo = patch.companyInfo ?? localModel.companyInfo;
    const historical = patch.historical ?? localModel.historical;
    const forecastConfig = patch.forecastConfig ?? localModel.forecastConfig;
    const dcfInputs = patch.dcfInputs ?? localModel.dcfInputs;

    const forecast = generateForecastStatements(historical, forecastConfig);
    const dcfOutput = calculateDcfValuation(companyInfo, historical, forecast, dcfInputs);
    const nextModel: FinancialModelRecord = {
      ...localModel,
      companyInfo,
      historical,
      forecastConfig,
      forecast,
      dcfInputs,
      dcfOutput,
      status: patch.status ?? 'valued',
    };
    setLocalModel(nextModel);
    scheduleAutoSave(nextModel, snapshotLabel);
  };

  const handleEditHistoricalCell = (
    statement: 'income' | 'balance' | 'cashflow',
    yearIndex: number,
    field: string,
    newValue: number
  ) => {
    const nextIs = [...localModel.historical.incomeStatement];
    const nextBs = [...localModel.historical.balanceSheet];
    const nextCf = [...localModel.historical.cashFlow];

    if (statement === 'income' && nextIs[yearIndex]) {
      nextIs[yearIndex] = { ...nextIs[yearIndex], [field]: newValue };
    } else if (statement === 'balance' && nextBs[yearIndex]) {
      nextBs[yearIndex] = { ...nextBs[yearIndex], [field]: newValue };
    } else if (statement === 'cashflow' && nextCf[yearIndex]) {
      nextCf[yearIndex] = { ...nextCf[yearIndex], [field]: newValue };
    }

    const recalculatedHist = recalculateHistoricalBundle(nextIs, nextBs, nextCf);
    applyAndSave({ historical: recalculatedHist });
  };

  const handleSwitchRiskProfile = (profile: RiskProfile) => {
    const preset = RISK_PROFILE_PRESETS[profile];
    const nextConfig = buildDefaultForecastConfig(
      localModel.historical,
      profile,
      localModel.forecastConfig.horizonYears
    );
    nextConfig.aiModel = localModel.forecastConfig.aiModel;
    const nextDcfInputs: DcfInputs = {
      ...localModel.dcfInputs,
      terminalGrowthRate: preset.terminalGrowthRate,
      waccAdjustmentBps: preset.waccAdjustmentBps,
    };
    applyAndSave({ forecastConfig: nextConfig, dcfInputs: nextDcfInputs });
  };

  const handleSwitchHorizon = (horizonYears: ForecastHorizon) => {
    const nextConfig = buildDefaultForecastConfig(
      localModel.historical,
      localModel.forecastConfig.riskProfile,
      horizonYears
    );
    nextConfig.aiModel = localModel.forecastConfig.aiModel;
    applyAndSave({ forecastConfig: nextConfig });
  };

  const handleRunAiForecast = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await api.runAiForecast(localModel.id, {
        riskProfile: localModel.forecastConfig.riskProfile,
        horizonYears: localModel.forecastConfig.horizonYears,
        aiModel: localModel.forecastConfig.aiModel,
      });
      setLocalModel(res.model);
      onModelUpdated(res.model);
      setSaveState('saved');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PRO_REQUIRED') {
        onOpenUpgrade(err.message);
      } else {
        setAiError(err instanceof Error ? err.message : 'Unable to generate AI forecast drivers.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveSnapshot = async () => {
    setSaveState('saving');
    try {
      const label = `Snapshot (${localModel.forecastConfig.riskProfile.toUpperCase()} · $${localModel.dcfOutput.impliedSharePrice.toFixed(2)})`;
      const res = await api.updateModel(localModel.id, {
        companyInfo: localModel.companyInfo,
        historical: localModel.historical,
        forecastConfig: localModel.forecastConfig,
        dcfInputs: localModel.dcfInputs,
        status: localModel.status,
        snapshotLabel: label,
      });
      setLocalModel(res.model);
      onModelUpdated(res.model);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleRevertVersion = async (versionId: string) => {
    setSaveState('saving');
    try {
      const res = await api.revertModelVersion(localModel.id, versionId);
      setLocalModel(res.model);
      onModelUpdated(res.model);
      setShowVersions(false);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleExportExcel = async () => {
    setExportError(null);
    setExporting('excel');
    try {
      await api.downloadFile(
        `/api/models/${encodeURIComponent(localModel.id)}/export/excel`,
        `${localModel.companyInfo.ticker}_Model.xlsx`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export Excel workbook.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExportError(null);
    if (user.subscriptionTier !== 'pro') {
      onOpenUpgrade('Equity Research PDF reports are a Pro feature. Upgrade to Pro for $5/month.');
      return;
    }
    setExporting('pdf');
    try {
      await api.downloadFile(
        `/api/models/${encodeURIComponent(localModel.id)}/export/pdf`,
        `${localModel.companyInfo.ticker}_Equity_Research.pdf`
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PRO_REQUIRED') {
        onOpenUpgrade(err.message);
      } else {
        setExportError(err instanceof Error ? err.message : 'Failed to export PDF report.');
      }
    } finally {
      setExporting(null);
    }
  };

  const info = localModel.companyInfo;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
        {/* Workspace Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#1A1A2E] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="relative flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500" aria-live="polite">
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </span>
              )}
              {saveState === 'error' && <span className="text-red-700">Auto-save failed</span>}
            </span>

            <button
              type="button"
              onClick={() => setShowVersions((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span>Versions ({localModel.versions.length})</span>
            </button>

            {showVersions && (
              <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <div className="border-b border-slate-100 pb-2 text-xs font-semibold text-[#1A1A2E]">
                  Model Version Snapshots
                </div>
                <div className="mt-2 max-h-60 space-y-1.5 overflow-y-auto">
                  {localModel.versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between gap-2 rounded-lg p-2 text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">{ver.label}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(ver.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevertVersion(ver.id)}
                        className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
                      >
                        Revert
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Company Information Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A1A2E] font-mono-tabular text-sm font-bold text-white">
                {info.ticker}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
                  {info.companyName}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  {info.exchange}: {info.ticker} · {info.sector} / {info.industry} · FY End: {info.fiscalYearEnd}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompanyExpanded((v) => !v)}
              aria-expanded={companyExpanded}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <span>{companyExpanded ? 'Collapse Info' : 'Expand Info'}</span>
              {companyExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {companyExpanded && (
            <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <div className="text-slate-500">Headquarters</div>
                  <div className="mt-0.5 font-medium text-slate-900">{info.headquarters}</div>
                </div>
                <div>
                  <div className="text-slate-500">CEO</div>
                  <div className="mt-0.5 font-medium text-slate-900">{info.ceo}</div>
                </div>
                <div>
                  <div className="text-slate-500">Employees</div>
                  <div className="mt-0.5 font-mono-tabular font-medium text-slate-900">{info.employees}</div>
                </div>
                <div>
                  <div className="text-slate-500">Recent Stock Price</div>
                  <div className="mt-0.5 font-mono-tabular font-semibold text-slate-900">${info.stockPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Market Cap</div>
                  <div className="mt-0.5 font-mono-tabular font-semibold text-slate-900">
                    ${(info.marketCap / 1000).toFixed(1)}B
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Source Filing</div>
                  <div className="mt-0.5 truncate font-medium text-slate-700">{localModel.sourceFileName || 'Form 10-K'}</div>
                </div>
              </div>

              <div className="rounded-lg bg-[#F8FAFC] p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {info.description}
              </div>
            </div>
          )}
        </section>

        {/* Financial Statements Table */}
        <FinancialTable
          historical={localModel.historical}
          forecast={localModel.forecast}
          currencyUnit={info.currencyUnit}
          onEditHistoricalCell={handleEditHistoricalCell}
        />

        {/* Forecasting Engine & Charts */}
        <ForecastPanel
          historical={localModel.historical}
          forecast={localModel.forecast}
          config={localModel.forecastConfig}
          isPro={user.subscriptionTier === 'pro'}
          aiLoading={aiLoading}
          aiError={aiError}
          onChangeConfig={(nextCfg: ForecastConfig) => applyAndSave({ forecastConfig: nextCfg })}
          onSwitchRiskProfile={handleSwitchRiskProfile}
          onSwitchHorizon={handleSwitchHorizon}
          onRunAiForecast={handleRunAiForecast}
          onOpenUpgrade={onOpenUpgrade}
        />

        {/* Valuation & Sensitivity Matrix */}
        <ValuationSection
          companyInfo={localModel.companyInfo}
          historical={localModel.historical}
          forecastConfig={localModel.forecastConfig}
          forecast={localModel.forecast}
          dcfInputs={localModel.dcfInputs}
          dcfOutput={localModel.dcfOutput}
          onChangeDcfInputs={(nextDcf) => applyAndSave({ dcfInputs: nextDcf })}
          onChangeStockPrice={(price) =>
            applyAndSave({
              companyInfo: {
                ...localModel.companyInfo,
                stockPrice: price,
                marketCap: Math.round(
                  price *
                    (localModel.historical.incomeStatement[localModel.historical.incomeStatement.length - 1]
                      ?.sharesOutstanding || 1)
                ),
              },
            })
          }
        />

        {/* Mandatory Legal Disclaimer */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
          <strong className="font-semibold text-slate-700">Legal Disclaimer: </strong>
          This analysis was generated by AI and is provided for informational purposes only. It does not constitute
          financial advice, investment recommendations, or an offer to buy or sell securities. Users should
          independently verify all data and consult with qualified financial advisors before making investment
          decisions.
        </div>
      </div>

      {/* Sticky Bottom Export Bar */}
      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-2.5 lg:px-6 lg:py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <div className="hidden sm:block text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{info.ticker}</span> · Implied Value{' '}
            <span
              className={`font-mono-tabular font-semibold ${
                localModel.dcfOutput.upsideDownsidePct >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              ${localModel.dcfOutput.impliedSharePrice.toFixed(2)}
            </span>
          </div>

          {exportError && <div className="text-xs text-red-700 truncate">{exportError}</div>}

          <div className="flex flex-nowrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save Snapshot</span>
              <span className="sm:hidden">Save</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting === 'excel'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A2E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{exporting === 'excel' ? 'Exporting...' : 'Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting === 'pdf'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A1A2E] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A2E] hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {user.subscriptionTier !== 'pro' ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span>{exporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
