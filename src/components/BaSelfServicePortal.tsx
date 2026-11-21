import React, { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, CalendarDays, Clock3, LogOut, RefreshCw } from 'lucide-react';
import { APIService } from '../services/apiService';
import { getZimbabweDate } from '../utils/dateUtils';
import type { AttendanceRecord, AuthenticatedUser, BaSelfServiceProfile } from '../types';

interface BaSelfServicePortalProps {
  user: AuthenticatedUser;
  profile: BaSelfServiceProfile | null;
  onLogout: () => void;
}

export const BaSelfServicePortal: React.FC<BaSelfServicePortalProps> = ({ user, profile, onLogout }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = async () => {
    if (!user.baId) {
      setError('This account is not linked to a BA profile. Contact an administrator.');
      setIsLoading(false);
      return;
    }
    try {
      const personalRecords = await APIService.fetchAttendanceFromAPI({ baId: user.baId });
      setRecords(personalRecords.sort((a, b) => b.date.localeCompare(a.date) || (b.clockInTime || '').localeCompare(a.clockInTime || '')));
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (refreshError: unknown) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load your attendance register.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [user.baId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Econet BA Portal</p>
            <h1 className="text-xl font-bold text-slate-900">{profile?.fullName || user.displayName}</h1>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">My registration</h2>
              <div className="mt-3 grid sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">BA ID</p>
                  <p className="font-mono font-semibold text-slate-900">{profile?.baId || user.baId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Registered</p>
                  <p className="font-semibold text-slate-900">{profile?.dateRegistered || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Registration status</p>
                  <p className={`font-semibold ${profile?.status === 'active' ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {profile?.status === 'active' ? 'Active' : profile?.status === 'inactive' ? 'Inactive' : 'Unavailable'}
                  </p>
                </div>
              </div>
            </div>
            <p className="max-w-sm text-xs text-slate-500">
              This page is view-only. Contact your administrator if any registration or attendance information needs correction.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                My signed attendance register
              </h2>
              <p className="text-xs text-slate-500 mt-1">Read-only record. Updates automatically every 30 seconds.</p>
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

          {isLoading && records.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Loading your register…</p>
          ) : records.length === 0 ? (
            <div className="p-8 text-center">
              <Clock3 className="w-7 h-7 mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-600">No attendance records are linked to your BA account yet.</p>
              <p className="text-xs text-slate-500 mt-1">Today is {getZimbabweDate()}.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map(record => (
                <article key={record.id} className="p-5 grid md:grid-cols-[1fr_auto] gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{record.date}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        record.isLate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {record.isLate ? 'Late' : 'On time'}
                      </span>
                      <span className="text-xs text-slate-500">{record.status.replaceAll('_', ' ')}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                      <span>Clock-in: <strong className="font-mono text-slate-900">{record.clockInTime || '—'}</strong></span>
                      <span>Clock-out: <strong className="font-mono text-slate-900">{record.clockOutTime || '—'}</strong></span>
                      <span>{record.branch}</span>
                    </div>
                    {lastUpdated && <p className="mt-2 text-[11px] text-slate-400">Last refreshed {lastUpdated}</p>}
                  </div>
                  <div className="md:text-right">
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 md:justify-end">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      {record.signatureDataUrl ? 'Signed register entry' : 'No signature captured'}
                    </p>
                    {record.signatureDataUrl && (
                      <img
                        src={record.signatureDataUrl}
                        alt={`Signature for attendance on ${record.date}`}
                        className="mt-2 ml-auto w-36 h-16 object-contain border border-slate-100 rounded bg-white"
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
