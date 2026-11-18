import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { UserProfile } from '../types/financial';

interface UpgradeModalProps {
  reason?: string;
  onClose: () => void;
  onUpgraded: (user: UserProfile) => void;
}

export function UpgradeModal({ reason, onClose, onUpgraded }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.updateAccount({ subscriptionTier: 'pro' });
      onUpgraded(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to activate Pro subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="upgrade-modal-title" className="font-display text-xl font-bold text-[#1A1A2E]">
              Upgrade to Fynance Bro Pro
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {reason || 'Unlock unlimited 10-K analyses, PDF equity research reports, and clean Excel exports.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold text-[#1A1A2E]">$5</span>
            <span className="text-sm text-slate-500">/ month · Cancel anytime</span>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Unlimited 10-K uploads & saved workspaces</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Sell-side Equity Research PDF report exports</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Clean Excel workbooks without free-tier notices</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Multi-model AI selection (Gemini + Claude)</span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#1A1A2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2A2A48] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Activating Pro...' : 'Upgrade Now ($5/mo)'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
