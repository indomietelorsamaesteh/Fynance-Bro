import { ArrowUpRight, FileSpreadsheet, FolderOpen, Plus, Trash2 } from 'lucide-react';
import type { FinancialModelRecord, UserProfile } from '../types/financial';

interface HomeDashboardProps {
  user: UserProfile;
  models: FinancialModelRecord[];
  searchQuery: string;
  onlyModelsView?: boolean;
  onNewUpload: () => void;
  onViewAllModels: () => void;
  onOpenModel: (id: string) => void;
  onExportExcel: (id: string, ticker: string) => void;
  onDeleteModel: (id: string, name: string) => void;
  onOpenUpgrade: () => void;
}

export function HomeDashboard({
  user,
  models,
  searchQuery,
  onlyModelsView = false,
  onNewUpload,
  onViewAllModels,
  onOpenModel,
  onExportExcel,
  onDeleteModel,
  onOpenUpgrade,
}: HomeDashboardProps) {
  const firstName = user.name.split(' ')[0] || 'Analyst';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredModels = models.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.companyInfo.companyName.toLowerCase().includes(q) ||
      m.companyInfo.ticker.toLowerCase().includes(q) ||
      m.companyInfo.sector.toLowerCase().includes(q)
    );
  });

  const usedCount = Math.min(3, user.analysesUsed);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      {/* Welcome Header & Quick Actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">{todayLabel}</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#1A1A2E] sm:text-3xl">
            {onlyModelsView ? 'My Financial Models' : `Welcome back, ${firstName}`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!onlyModelsView && (
            <button
              type="button"
              onClick={onViewAllModels}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              View Saved Models
            </button>
          )}
          <button
            type="button"
            onClick={onNewUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Upload New 10-K</span>
          </button>
        </div>
      </div>

      {/* Free-Tier Usage Meter */}
      {!onlyModelsView && user.subscriptionTier === 'free' && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">
                <span className="font-mono-tabular font-semibold">{usedCount} of 3</span> free 10-K analyses used
              </span>
              <span className="text-xs text-slate-500">Free Plan</span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all ${usedCount >= 3 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                style={{ width: `${(usedCount / 3) * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#1A1A2E] hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Unlock Unlimited ($5/mo)
          </button>
        </div>
      )}

      {/* Recent Models Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#1A1A2E]">
            {onlyModelsView ? `All Saved Models (${filteredModels.length})` : 'Recent Models'}
          </h2>
          {searchQuery && (
            <span className="text-xs text-slate-500">Filtering by “{searchQuery}”</span>
          )}
        </div>

        {filteredModels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              {searchQuery ? 'No matching models found' : 'No financial models yet'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? 'Try clearing your search query or upload a new Form 10-K filing.'
                : 'Upload your first SEC Form 10-K PDF or HTML filing to build an institutional model.'}
            </p>
            <button
              type="button"
              onClick={onNewUpload}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Upload New 10-K</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => {
              const upside = model.dcfOutput.upsideDownsidePct;
              const isPositive = upside >= 0;
              const initials = model.companyInfo.ticker.slice(0, 4);

              return (
                <article
                  key={model.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A1A2E] font-mono-tabular text-xs font-bold text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-bold text-[#1A1A2E]">
                            {model.companyInfo.companyName}
                          </h3>
                          <p className="truncate text-xs text-slate-500">
                            {model.companyInfo.exchange} · {model.companyInfo.sector}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3">
                      <div>
                        <div className="text-[11px] text-slate-500">Implied DCF Price</div>
                        <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900">
                          ${model.dcfOutput.impliedSharePrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">Vs. Market (${model.companyInfo.stockPrice.toFixed(2)})</div>
                        <div
                          className={`mt-0.5 font-mono-tabular text-base font-bold ${
                            isPositive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {(upside * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Status: <strong className="font-medium capitalize text-slate-700">{model.status}</strong>
                      </span>
                      <span>{new Date(model.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenModel(model.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1A1A2E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] transition-colors"
                    >
                      <span>Open Model</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportExcel(model.id, model.companyInfo.ticker)}
                      aria-label={`Export ${model.companyInfo.companyName} to Excel`}
                      title="Export to Excel"
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteModel(model.id, model.companyInfo.companyName)}
                      aria-label={`Delete ${model.companyInfo.companyName}`}
                      title="Delete Model"
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
