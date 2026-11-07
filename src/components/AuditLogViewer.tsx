import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { History, Search, Filter, ShieldCheck, Download } from 'lucide-react';
import { buildCsvString, downloadCsvFile } from '../utils/csvExport';

export const AuditLogViewer: React.FC = () => {
  const [logs] = useState(DataService.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('All');
  const [filterTarget, setFilterTarget] = useState<string>('All');

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'All' && log.action !== filterAction) return false;
    if (filterTarget !== 'All' && log.targetType !== filterTarget) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchActor = log.actor.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchReason = log.reason?.toLowerCase().includes(q);
      if (!matchActor && !matchDetails && !matchReason) return false;
    }
    return true;
  });

  const handleExportAuditCsv = () => {
    const headers = [
      { key: 'timestamp', label: 'Timestamp (CAT)' },
      { key: 'actor', label: 'Actor User' },
      { key: 'actorRole', label: 'Role' },
      { key: 'action', label: 'Action Event' },
      { key: 'targetType', label: 'Target Type' },
      { key: 'targetId', label: 'Target ID' },
      { key: 'details', label: 'Audit Summary' },
      { key: 'oldValue', label: 'Previous Value' },
      { key: 'newValue', label: 'New Value' },
      { key: 'reason', label: 'Mandatory Reason' },
    ];
    const csv = buildCsvString(headers, filteredLogs as unknown as Record<string, unknown>[]);
    downloadCsvFile(`Econet_Audit_Trail_${new Date().toISOString().split('T')[0]}`, csv);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Compliance & System Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of attendance corrections, exception approvals, commission adjustments, and report dispatches.
          </p>
        </div>

        <button
          onClick={handleExportAuditCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Audit Log CSV
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, reason, details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="All">All Actions</option>
            <option value="CLOCK_IN">Clock-Ins</option>
            <option value="CLOCK_OUT">Clock-Outs</option>
            <option value="RECORD_CORRECTION">Record Corrections</option>
            <option value="EXCEPTION_APPROVED">Exception Approvals</option>
            <option value="COMMISSION_ADJUSTMENT">Commission Adjustments</option>
            <option value="QR_TOKEN_REVOKED">QR Token Rotations</option>
          </select>

          <select
            value={filterTarget}
            onChange={e => setFilterTarget(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="All">All Entities</option>
            <option value="ATTENDANCE">Attendance Records</option>
            <option value="COMMISSION">Commission</option>
            <option value="EXCEPTION">Exceptions</option>
            <option value="BA">Brand Ambassadors</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                <th className="py-3 px-4">Timestamp (CAT)</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-3">Previous Value</th>
                <th className="py-3 px-3">New Value</th>
                <th className="py-3 px-3">Mandatory Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{log.actor}</span>
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-blue-700 whitespace-nowrap text-[11px]">
                    {log.targetType} #{log.targetId.substring(0, 10)}
                  </td>
                  <td className="py-3 px-4 text-slate-800 max-w-sm">
                    {log.details}
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] text-rose-700 max-w-xs truncate">
                    {log.oldValue || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] text-emerald-700 max-w-xs truncate">
                    {log.newValue || '—'}
                  </td>
                  <td className="py-3 px-3 italic text-slate-500 max-w-xs">
                    {log.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
