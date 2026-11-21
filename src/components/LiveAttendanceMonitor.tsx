import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { APIService } from '../services/apiService';
import { getZimbabweDate, getZimbabweTimestamp } from '../utils/dateUtils';
import type { AttendanceRecord } from '../types';

export const LiveAttendanceMonitor: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const refresh = async () => {
      try {
        const latestRecords = await APIService.fetchAttendanceFromAPI({ date: getZimbabweDate() });
        if (!active) return;
        setRecords(latestRecords.sort((a, b) => (b.clockInTime || '').localeCompare(a.clockInTime || '')));
        setLastUpdated(getZimbabweTimestamp());
        setError(null);
      } catch (refreshError: unknown) {
        if (active) {
          setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh live attendance.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
          timer = setTimeout(refresh, 10000);
        }
      }
    };

    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const clockedIn = records.filter(record => record.clockInTime);
  const lateCount = clockedIn.filter(record => record.isLate).length;
  const onTimeCount = clockedIn.length - lateCount;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Live Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Today’s clock-ins refresh automatically every 10 seconds.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-700">{lastUpdated ? `Updated ${lastUpdated}` : 'Connecting…'}</p>
          <p className="text-xs text-slate-500">Harare time</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Live attendance refresh failed: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs uppercase font-bold text-slate-500">Clock-ins today</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{clockedIn.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs uppercase font-bold text-emerald-700">On time (by 08:00)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{onTimeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs uppercase font-bold text-amber-700">Late (after 08:00)</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{lateCount}</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Today’s signed attendance</h3>
          {isLoading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
        {isLoading && records.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Loading attendance…</p>
        ) : clockedIn.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-7 h-7 mx-auto text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No clock-ins have been recorded today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">BA</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Clock-in</th>
                  <th className="px-5 py-3">Clock-out</th>
                  <th className="px-5 py-3">Arrival</th>
                  <th className="px-5 py-3">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clockedIn.map(record => (
                  <tr key={record.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{record.baName}</p>
                      <p className="font-mono text-xs text-slate-500">{record.baId}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{record.branch}</td>
                    <td className="px-5 py-3 font-mono text-slate-800">{record.clockInTime}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{record.clockOutTime || '—'}</td>
                    <td className="px-5 py-3">
                      {record.isLate ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> Late
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> On time
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{record.signatureDataUrl ? 'Signed' : 'Not captured'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
