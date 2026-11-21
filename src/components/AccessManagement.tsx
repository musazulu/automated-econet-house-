import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { APIService, type AuthAccountSummary } from '../services/apiService';
import { DataService } from '../services/dataService';
import type { AccountRole, BrandAmbassador } from '../types';

export const AccessManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<AuthAccountSummary[]>([]);
  const [bas, setBas] = useState<BrandAmbassador[]>([]);
  const [role, setRole] = useState<AccountRole>('consultant');
  const [baId, setBaId] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [consultantId, setConsultantId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const consultants = DataService.getConsultants();

  const refresh = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [nextAccounts, nextBas] = await Promise.all([
        APIService.fetchAuthAccounts(),
        APIService.fetchBAsFromAPI(),
      ]);
      setAccounts(nextAccounts);
      setBas(nextBas.filter(ba => ba.status === 'active'));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load account details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(pin)) {
      setError('Use a six-digit PIN.');
      return;
    }

    if (role === 'ba' && !baId) {
      const baName = displayName.trim();
      if (baName.length < 2) {
        setError('Enter the Brand Ambassador name.');
        return;
      }
      setIsSaving(true);
      try {
        const created = await APIService.createBaWithAccount({ fullName: baName, pin });
        await DataService.refreshBAsFromDatabase();
        setPin('');
        setDisplayName('');
        setNotice(`${baName} registered. BA ID: ${created.baId}. Give the BA this ID and their PIN to sign in.`);
        await refresh();
      } catch (saveError: unknown) {
        setError(saveError instanceof Error ? saveError.message : 'Unable to create the BA account.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const selectedBa = bas.find(ba => ba.baId === baId);
    const accountLoginId = selectedBa ? selectedBa.baId : loginId.trim();
    const accountName = selectedBa ? selectedBa.fullName : displayName.trim();
    if (!selectedBa && (accountName.length < 2 || !accountLoginId)) {
      setError('Enter an account name and email address.');
      return;
    }

    setIsSaving(true);
    try {
      await APIService.provisionAuthAccount({
        loginId: accountLoginId,
        displayName: accountName,
        role: selectedBa ? 'ba' : role,
        pin,
        consultantId: role === 'consultant' ? consultantId : undefined,
      });
      setPin('');
      setLoginId('');
      setDisplayName('');
      setNotice(`PIN saved for ${accountName}. Share it directly with that account holder.`);
      await refresh();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save account PIN.');
    } finally {
      setIsSaving(false);
    }
  };

  const statusOf = (accountLoginId: string) =>
    accounts.some(account => account.login_id === accountLoginId.toLowerCase() && account.is_active);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Sign-in Accounts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create or reset personal PINs. Never share a PIN between users.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            BA portal link:{' '}
            <a className="font-semibold text-blue-700 underline" href={window.location.origin}>
              {window.location.origin}
            </a>
            {' '}— share the link with each BA along with their own BA ID and PIN.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{notice}</div>}

      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            Create account or reset PIN
          </h3>
          <label className="block text-sm font-medium text-slate-700">
            Account type
            <select
              value={role}
              onChange={event => setRole(event.target.value as AccountRole)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="ba">Brand Ambassador</option>
              <option value="consultant">Consultant</option>
              <option value="operator">Attendance operator</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          {role === 'ba' ? (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Brand Ambassador
                <select
                  value={baId}
                  onChange={event => setBaId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">+ New Brand Ambassador</option>
                  {bas.map(ba => <option key={ba.baId} value={ba.baId}>Reset PIN: {ba.fullName} ({ba.baId})</option>)}
                </select>
              </label>
              {!baId && (
                <label className="block text-sm font-medium text-slate-700">
                  BA full name
                  <input
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="e.g. Tendai Moyo"
                    required
                  />
                </label>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Staff name
                <input
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Staff email (sign-in ID)
                <input
                  type="email"
                  value={loginId}
                  onChange={event => setLoginId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              {role === 'consultant' && (
                <label className="block text-sm font-medium text-slate-700">
                  Assigned consultant ID
                  <select
                    value={consultantId}
                    onChange={event => setConsultantId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  >
                    <option value="">Select consultant</option>
                    {consultants.map(consultant => (
                      <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

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
              autoComplete="new-password"
              required
            />
          </label>
          <p className="text-xs text-slate-500">
            For a reset, choose a new PIN and give it privately to the user. The system never displays saved PINs.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5"
          >
            <KeyRound className="w-4 h-4" />
            {isSaving ? 'Saving…' : role === 'ba' && !baId ? 'Create BA account' : 'Save account PIN'}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-bold text-slate-900 mb-3">Provisioned accounts</h3>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-500">No accounts have been provisioned yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {accounts.map(account => (
                <li key={account.login_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{account.display_name}</p>
                    <p className="text-xs text-slate-500 truncate">{account.ba_id || account.login_id}</p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {account.is_active ? account.role : 'disabled'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {role === 'ba' && baId && (
            <p className="mt-3 text-xs text-slate-500">
              {statusOf(baId) ? 'This BA already has an account; saving will reset its PIN.' : 'This BA has no portal account yet.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
