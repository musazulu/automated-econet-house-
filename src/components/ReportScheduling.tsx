import React, { useState } from 'react';
import { ReportSchedule, DeliveryLog } from '../types';
import { DataService } from '../services/dataService';
import {
  Send,
  Clock,
  Calendar,
  Mail,
  Play,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Server,
  Info,
} from 'lucide-react';

interface ReportSchedulingProps {
  currentUserName: string;
}

export const ReportScheduling: React.FC<ReportSchedulingProps> = ({ currentUserName }) => {
  const [schedules, setSchedules] = useState<ReportSchedule[]>(DataService.getSchedules());
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>(DataService.getDeliveryLogs());
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // New Schedule form
  const [reportType, setReportType] = useState<ReportSchedule['reportType']>('daily_register');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [deliveryTime, setDeliveryTime] = useState<string>('18:00');
  const [recipientsStr, setRecipientsStr] = useState<string>('admin@econet.co.zw, operations@econet.co.zw');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [deliveryMethod, setDeliveryMethod] = useState<'email_attachment' | 'secure_link'>('email_attachment');
  const [includeDraft, setIncludeDraft] = useState<boolean>(false);

  const [triggerNotice, setTriggerNotice] = useState<string | null>(null);

  const reloadData = () => {
    setSchedules([...DataService.getSchedules()]);
    setDeliveryLogs([...DataService.getDeliveryLogs()]);
  };

  const handleTriggerNow = (scheduleId: string) => {
    try {
      const log = DataService.triggerReportDelivery(scheduleId, currentUserName);
      setTriggerNotice(`Simulated report delivery dispatched! (${log.reportName} -> ${log.recipients.join(', ')})`);
      reloadData();
      setTimeout(() => setTriggerNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to trigger schedule');
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = recipientsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.includes('@'));

    if (emails.length === 0) {
      alert('Please enter at least one valid recipient email address.');
      return;
    }

    const newSch: ReportSchedule = {
      id: `sch-${Date.now()}`,
      reportType,
      frequency,
      deliveryTime,
      recipients: emails,
      regionFilter,
      salesCategoryFilter: 'All',
      includeDraft,
      deliveryMethod,
      status: 'active',
      nextRun: `Scheduled for next ${frequency} run at ${deliveryTime} (CAT)`,
    };

    DataService.saveSchedule(newSch, currentUserName);
    setIsCreating(false);
    reloadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Automatic Report Delivery & Scheduler
          </h2>
          <p className="text-xs text-slate-500">
            Automate daily, weekly, and monthly CSV attendance and commission reports directly to administrators and payroll.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add Delivery Schedule
        </button>
      </div>

      {triggerNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {triggerNotice}
        </div>
      )}

      {/* Production Architecture Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-start gap-3 text-xs">
        <Server className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-blue-300">
            PROTOTYPE SIMULATION & PRODUCTION SETUP NOTICE:
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            In this prototype environment, scheduled reports generate genuine RFC 4180 CSV datasets with UTF-8 encoding and formula protection, recorded with status <strong className="text-amber-400">SIMULATED</strong>. For live SMTP delivery, connect backend environment variables (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>) with a cron daemon or Google Cloud Tasks queue.
          </p>
        </div>
      </div>

      {/* New Schedule Modal / Inline Card */}
      {isCreating && (
        <form onSubmit={handleCreateSchedule} className="bg-white rounded-2xl border border-blue-200 p-6 shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              Configure New Scheduled Delivery
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-700 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value as ReportSchedule['reportType'])}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="daily_register">Daily Attendance Register</option>
                <option value="clock_in_out">Daily Clock-In & Out Report</option>
                <option value="exceptions">Attendance Exception Report</option>
                <option value="daily_commission">Daily Commission Report</option>
                <option value="weekly_commission">Weekly Commission Rollup</option>
                <option value="monthly_commission">Monthly Commission Rollup</option>
                <option value="missing_clockout">Missing Clock-Out Alert</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Monday 08:00)</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Delivery Time (CAT)</label>
              <input
                type="text"
                placeholder="18:00"
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Recipient Email Addresses (Comma Separated) *
              </label>
              <input
                type="text"
                placeholder="admin@econet.co.zw, payroll@econet.co.zw"
                value={recipientsStr}
                onChange={e => setRecipientsStr(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Delivery Format</label>
              <select
                value={deliveryMethod}
                onChange={e => setDeliveryMethod(e.target.value as 'email_attachment' | 'secure_link')}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="email_attachment">Encrypted CSV Attachment (.csv)</option>
                <option value="secure_link">Secure Authenticated Download Link</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Activate Schedule
            </button>
          </div>
        </form>
      )}

      {/* Active Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Active Automated Delivery Schedules
          </h3>
          <span className="text-xs text-slate-500">{schedules.length} configured schedules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Report Type</th>
                <th className="py-3 px-3">Frequency</th>
                <th className="py-3 px-3">Delivery Time (CAT)</th>
                <th className="py-3 px-4">Recipients</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Last Run</th>
                <th className="py-3 px-3 text-center">Trigger Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {schedules.map(sch => (
                <tr key={sch.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {sch.reportType.replace(/_/g, ' ').toUpperCase()}
                  </td>
                  <td className="py-3 px-3 uppercase font-semibold text-[11px] text-blue-700 whitespace-nowrap">
                    {sch.frequency}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-800 whitespace-nowrap">
                    {sch.deliveryTime} CAT
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                    {sch.recipients.join(', ')}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                    {sch.deliveryMethod === 'email_attachment' ? 'CSV Attachment' : 'Secure Link'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {sch.lastRun || 'Not run yet'}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleTriggerNow(sch.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      title="Trigger simulated email dispatch immediately"
                    >
                      <Play className="w-3 h-3 fill-blue-600 text-blue-600" /> Run Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Log History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
          <Clock className="w-4 h-4 text-slate-500" />
          Report Delivery Dispatch History & Audit Records
        </h3>

        <div className="divide-y divide-slate-100 text-xs mt-2">
          {deliveryLogs.map(log => (
            <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.reportName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {log.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{log.fileSize}</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Recipients: {log.recipients.join(', ')} • {log.rowsCount} records exported
                </p>
                <p className="text-slate-400 text-[10px] italic mt-0.5">{log.details}</p>
              </div>

              <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                {log.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
