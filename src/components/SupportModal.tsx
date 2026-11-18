import { useState, type FormEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface SupportModalProps {
  onClose: () => void;
}

export function SupportModal({ onClose }: SupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.submitSupport({ subject, message });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send support message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="support-modal-title" className="font-display text-lg font-bold text-[#1A1A2E]">
              Support & Report Issue
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Flag a 10-K extraction discrepancy or request help with your model.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close support modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">Ticket Logged</h3>
            <p className="mt-1 text-sm text-slate-600">
              Our financial engineering team has received your report and will follow up by email.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="support-subject" className="block text-sm font-medium text-slate-700 mb-1">
                Subject
              </label>
              <input
                id="support-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Balance sheet extraction question"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="support-message" className="block text-sm font-medium text-slate-700 mb-1">
                Details
              </label>
              <textarea
                id="support-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the filing, ticker, or issue encountered..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48] disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
