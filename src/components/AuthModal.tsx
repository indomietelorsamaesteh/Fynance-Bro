import { useState, type FormEvent } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { UserProfile } from '../types/financial';

export type AuthModalMode = 'login' | 'signup' | 'google' | 'reset';

interface AuthModalProps {
  mode: AuthModalMode;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  onSwitchMode: (mode: AuthModalMode) => void;
}

export function AuthModal({ mode, onClose, onSuccess, onSwitchMode }: AuthModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [issuedTokenHint, setIssuedTokenHint] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must be at least 8 characters with 1 uppercase letter and 1 number.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await api.signup({ name, email, password });
        onSuccess(res.user);
      } else if (mode === 'login') {
        const res = await api.login({ email, password });
        onSuccess(res.user);
      } else if (mode === 'google') {
        const res = await api.googleLogin({
          email: email || 'analyst@gmail.com',
          name: name || 'Google Analyst',
        });
        onSuccess(res.user);
      } else if (mode === 'reset') {
        if (resetStep === 'request') {
          const res = await api.requestReset(email);
          setNotice(res.message);
          if (res.resetToken) {
            setIssuedTokenHint(res.resetToken);
            setResetToken(res.resetToken);
          }
          setResetStep('confirm');
        } else {
          const res = await api.confirmReset({ token: resetToken, newPassword: password });
          setNotice(res.message);
          onSwitchMode('login');
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to complete authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.demoLogin();
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start demo workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-[#1A1A2E]">
              {mode === 'signup' && 'Create your Fynance Bro account'}
              {mode === 'login' && 'Log in to Fynance Bro'}
              {mode === 'google' && 'Continue with Google'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'signup' && 'Start with 3 complimentary 10-K financial models.'}
              {mode === 'login' && 'Access your saved financial models and valuation workspaces.'}
              {mode === 'google' && 'Authenticate with your Google workspace email.'}
              {mode === 'reset' && 'Generate a secure token to update your password.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {(mode === 'signup' || mode === 'google') && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Taylor"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
          )}

          {!(mode === 'reset' && resetStep === 'confirm') && (
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
                Work or Personal Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@firm.com"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
          )}

          {mode === 'reset' && resetStep === 'confirm' && (
            <>
              <div>
                <label htmlFor="auth-reset-token" className="block text-sm font-medium text-slate-700 mb-1">
                  Reset Token
                </label>
                <input
                  id="auth-reset-token"
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
                />
                {issuedTokenHint && (
                  <p className="mt-1 text-xs text-slate-500">Issued token pre-filled for verification.</p>
                )}
              </div>
              <div>
                <label htmlFor="auth-new-pw" className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  id="auth-new-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
                />
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      onSwitchMode('reset');
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-[#1A1A2E] underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 8 chars, 1 uppercase, 1 number' : 'Enter password'}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-confirm-pw" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                id="auth-confirm-pw"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A2E] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#272742] disabled:opacity-60 transition-colors"
          >
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                  ? 'Create Account'
                  : mode === 'login'
                    ? 'Log In'
                    : mode === 'google'
                      ? 'Continue with Google'
                      : resetStep === 'request'
                        ? 'Send Reset Token'
                        : 'Update Password'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onSwitchMode('google')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100/70 transition-colors"
            >
              Explore Demo Workspace (Apple & Microsoft 10-Ks)
            </button>
          </div>
        )}

        <div className="mt-5 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              New to Fynance Bro?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className="font-semibold text-[#1A1A2E] hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="font-semibold text-[#1A1A2E] hover:underline"
              >
                Log In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
