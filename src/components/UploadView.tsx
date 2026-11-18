import { useRef, useState, type DragEvent } from 'react';
import { FileUp, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { SAMPLE_10K_FILINGS } from '../data/seedModels';
import { api, ApiError } from '../lib/api';
import type { FinancialModelRecord, UserProfile } from '../types/financial';

interface UploadViewProps {
  user: UserProfile;
  onParsedSuccess: (model: FinancialModelRecord, updatedUser: UserProfile) => void;
  onOpenUpgrade: () => void;
}

const PROGRESS_STEPS = [
  'Uploading document...',
  'Parsing financial statements...',
  'Extracting historical data...',
  'Building your model...',
];

export function UploadView({ user, onParsedSuccess, onOpenUpgrade }: UploadViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [aiModel, setAiModel] = useState<'gemini' | 'claude'>('gemini');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const freeLimitReached = user.subscriptionTier === 'free' && user.analysesUsed >= 3;

  const startProgressCycle = () => {
    setStepIndex(0);
    return window.setInterval(() => {
      setStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (freeLimitReached) {
      onOpenUpgrade();
      return;
    }

    const validExt = /\.(pdf|html|htm|txt)$/i.test(file.name);
    if (!validExt) {
      setError('Unsupported format. Please upload a Form 10-K in PDF or HTML format.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('File exceeds the 30 MB upload limit. Please compress the PDF or upload the financial statements section.');
      return;
    }

    setLoading(true);
    const timer = startProgressCycle();
    try {
      const res = await api.parse10KFile(file);
      onParsedSuccess(res.model, res.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FREE_LIMIT_REACHED') {
        onOpenUpgrade();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse 10-K filing.');
      }
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  };

  const handleSampleParse = async (sampleId: string) => {
    setError(null);
    if (freeLimitReached) {
      onOpenUpgrade();
      return;
    }
    const sample = SAMPLE_10K_FILINGS.find((s) => s.id === sampleId);
    if (!sample) return;

    setLoading(true);
    const timer = startProgressCycle();
    try {
      const res = await api.parse10KText(sample.fileName, sample.content);
      onParsedSuccess(res.model, res.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FREE_LIMIT_REACHED') {
        onOpenUpgrade();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse sample 10-K filing.');
      }
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
          Upload SEC Form 10-K
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload an annual report (PDF or EDGAR HTML, up to 30 MB) to extract historical financials, generate forecasts,
          and build a DCF valuation.
        </p>
      </div>

      {freeLimitReached && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-amber-950">Free Analysis Limit Reached (3 / 3)</div>
            <p className="mt-1 text-xs text-amber-900">
              Upgrade to Pro for $5/month to analyze unlimited 10-K filings and export equity research PDFs.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="shrink-0 rounded-lg bg-[#1A1A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <div>{error}</div>
        </div>
      )}

      {/* AI Model Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-[#1A1A2E]">AI Document Parsing Engine</div>
            <p className="mt-0.5 text-xs text-slate-500">
              Select which reasoning model extracts statements and Item 1 business context.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAiModel('gemini')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                aiModel === 'gemini' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gemini AI
            </button>
            <button
              type="button"
              onClick={() => {
                if (user.subscriptionTier !== 'pro') {
                  onOpenUpgrade();
                } else {
                  setAiModel('claude');
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                aiModel === 'claude' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {user.subscriptionTier !== 'pro' && <Lock className="h-3 w-3" />}
              <span>Claude (Pro)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed bg-white p-10 text-center transition-colors ${
          dragging ? 'border-[#1A1A2E] bg-slate-50' : 'border-slate-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.html,.htm,.txt"
          aria-label="Choose 10-K filing"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleFile(file);
          }}
        />

        {loading ? (
          <div className="mx-auto max-w-md space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="font-display text-base font-semibold text-[#1A1A2E]">
              {PROGRESS_STEPS[stepIndex]}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-[#1A1A2E] transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Extracting multi-year Income Statement, Balance Sheet, Cash Flow, and Item 1 overview...
            </p>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 font-display text-lg font-semibold text-[#1A1A2E]">
              Drag & drop your Form 10-K PDF or HTML here
            </h2>
            <p className="mt-1 text-xs text-slate-500">Accepted formats: .pdf, .html, .htm · Maximum size 30 MB</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-6 rounded-lg bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors"
            >
              Select Filing from Computer
            </button>
          </>
        )}
      </div>

      {/* Sample Filings Quick-Test */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-[#1A1A2E]">Or parse a sample SEC Form 10-K excerpt</div>
        <p className="mt-0.5 text-xs text-slate-500">
          Runs the live Gemini AI extraction pipeline on a real SEC filing excerpt.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SAMPLE_10K_FILINGS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={loading}
              onClick={() => void handleSampleParse(sample.id)}
              className="flex flex-col items-start rounded-lg border border-slate-200 p-3.5 text-left hover:border-[#1A1A2E] hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <span className="text-xs font-semibold text-[#1A1A2E]">{sample.label}</span>
              <span className="mt-1 text-[11px] text-slate-500">Click to extract & build 3-statement DCF</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
