import React, { useState } from 'react';
import { AlertCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { APIService } from '../services/apiService';
import type { AuthenticatedUser } from '../types';

interface AuthScreenProps {
  setupRequired: boolean;
  initialError?: string | null;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ setupRequired, initialError, onAuthenticated }) => {
  const [isSetup, setIsSetup] = useState(setupRequired);
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError('Use a six-digit PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSetup) {
        if (pin !== confirmPin) {
          setError('The PINs do not match.');
          return;
        }
        const result = await APIService.bootstrapAdmin(setupKey, loginId, displayName, pin);
        onAuthenticated(result.user);
      } else {
        const user = await APIService.login(loginId, pin);
        onAuthenticated(user);
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-7">
        <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center mb-5">
          {isSetup ? <ShieldCheck className="w-6 h-6" /> : <LockKeyhole className="w-6 h-6" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {isSetup ? 'Set up the administrator account' : 'Sign in to Econet Attendance'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSetup
            ? 'Complete one-time setup using the key configured in Vercel.'
            : 'Staff use their email. Brand Ambassadors use their BA ID. Enter your personal six-digit PIN.'}
        </p>

        {error && (
          <div role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isSetup && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Vercel setup key
                <input
                  type="password"
                  autoComplete="off"
                  value={setupKey}
                  onChange={event => setSetupKey(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Administrator name
                <input
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  autoComplete="name"
                  required
                />
              </label>
            </>
          )}

          <label className="block text-sm font-medium text-slate-700">
            {isSetup ? 'Administrator email' : 'Email or BA ID'}
            <input
              type={isSetup ? 'email' : 'text'}
              value={loginId}
              onChange={event => setLoginId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              autoComplete={isSetup ? 'email' : 'username'}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Personal six-digit PIN
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              value={pin}
              onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.3em]"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {isSetup && (
            <label className="block text-sm font-medium text-slate-700">
              Confirm PIN
              <input
                type="password"
                inputMode="numeric"
                minLength={6}
                maxLength={6}
                value={confirmPin}
                onChange={event => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.3em]"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5"
          >
            {isSubmitting ? 'Please wait…' : isSetup ? 'Create administrator account' : 'Sign in'}
          </button>
        </form>

        {!setupRequired && (
          <p className="mt-4 text-xs text-slate-500 text-center">
            Ask your administrator to create your account or reset your PIN if you cannot sign in.
          </p>
        )}
      </div>
    </div>
  );
};
