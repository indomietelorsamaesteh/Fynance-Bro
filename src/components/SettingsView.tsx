import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { UserProfile } from '../types/financial';

interface SettingsViewProps {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onAccountDeleted: () => void;
  onOpenUpgrade: () => void;
}

export function SettingsView({
  user,
  onUserUpdated,
  onAccountDeleted,
  onOpenUpgrade,
}: SettingsViewProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.updateAccount({
        name,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      onUserUpdated(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Account settings saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.updateAccount({ subscriptionTier: 'free' });
      onUserUpdated(res.user);
      setMessage('Subscription reverted to Free tier.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await api.deleteAccount();
      onAccountDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete account.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
          Account & Subscription Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your analyst profile, security credentials, and billing tier.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      )}

      {/* Profile & Password Form */}
      <form onSubmit={handleSaveProfile} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-[#1A1A2E]">Profile & Security</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="block text-xs font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="settings-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1A1A2E] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="settings-email"
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-cur-pw" className="block text-xs font-medium text-slate-700 mb-1">
              Current Password (optional)
            </label>
            <input
              id="settings-cur-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required if changing password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1A1A2E] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-new-pw" className="block text-xs font-medium text-slate-700 mb-1">
              New Password (optional)
            </label>
            <input
              id="settings-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1A1A2E] focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Subscription Management */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-bold text-[#1A1A2E]">Subscription Plan</h2>
            <p className="mt-1 text-sm text-slate-600">
              Current Tier:{' '}
              <strong className="font-semibold text-[#1A1A2E]">
                {user.subscriptionTier === 'pro' ? 'Pro ($5/month)' : 'Free Tier (3 Analyses)'}
              </strong>
            </p>
          </div>
          {user.subscriptionTier === 'free' ? (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors"
            >
              Upgrade to Pro ($5/mo)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDowngrade}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel Pro Subscription
            </button>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="font-display text-base font-bold text-red-900">Delete Account</h2>
        <p className="mt-1 text-xs text-slate-600">
          Permanently remove your profile, uploaded filings, and all saved financial models. This action cannot be
          undone.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            Delete My Account
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={loading}
              className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 transition-colors"
            >
              Confirm Permanent Deletion
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
