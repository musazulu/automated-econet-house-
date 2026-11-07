import React, { useMemo } from 'react';
import { DataService } from '../services/dataService';
import { formatCurrency, getZimbabweDate } from '../utils/dateUtils';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  FileCheck,
  Send,
  Building,
  ShieldAlert,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const todayStr = getZimbabweDate();

  const bas = DataService.getBAs();
  const attendanceRecords = DataService.getAttendanceRecords();
  const auditLogs = DataService.getAuditLogs();
  const deliveryLogs = DataService.getDeliveryLogs();
  const consultants = DataService.getConsultants();

  // Active BAs
  const activeBas = bas.filter(b => b.status === 'active');
  const totalBas = bas.length;

  // Today's attendance numbers
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);
  const clockedInToday = todayRecords.filter(r => r.clockInTime).length;
  const clockedOutToday = todayRecords.filter(r => r.clockOutTime).length;
  const absentToday = todayRecords.filter(r => r.status === 'absent').length;
  const approvedExceptions = todayRecords.filter(r => r.exceptionApprovalStatus === 'approved').length;
  const pendingReviewToday = attendanceRecords.filter(
    r => r.status === 'pending_review' || r.missingClockOut || r.exceptionApprovalStatus === 'pending'
  ).length;

  // Attendance rate %
  const attendanceRatePct =
    activeBas.length > 0
      ? Math.round(((clockedInToday + approvedExceptions) / activeBas.length) * 100)
      : 0;

  // Month-to-date commission sums
  const summaries = useMemo(() => DataService.getBaCommissionSummaries(), []);
  const totalEligibleDays = summaries.reduce((a, b) => a + b.eligibleDays, 0);
  const totalDailyComm = summaries.reduce((a, b) => a + b.dailyCommission, 0);
  const totalAttComm = summaries.reduce((a, b) => a + b.attendanceCommission, 0);
  const totalNetComm = summaries.reduce((a, b) => a + b.totalCommission, 0);

  // Status distribution breakdown for today
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      present: 0,
      late: 0,
      activation: 0,
      business_duty: 0,
      sick: 0,
      absent: 0,
    };
    todayRecords.forEach(r => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });
    return counts;
  }, [todayRecords]);

  // Regional breakdown
  const regionalStats = useMemo(() => {
    const map = new Map<string, { count: number; comm: number }>();
    summaries.forEach(s => {
      const existing = map.get(s.region) || { count: 0, comm: 0 };
      existing.count += 1;
      existing.comm += s.totalCommission;
      map.set(s.region, existing);
    });
    return Array.from(map.entries()).map(([region, data]) => ({ region, ...data }));
  }, [summaries]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            EXECUTIVE TELECOM OPERATIONS OVERVIEW
          </div>
          <h2 className="text-2xl font-bold text-white">
            Econet Field Force Attendance & Commission Center
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Nationwide monitoring across Harare, Bulawayo, Chitungwiza, and regional branches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('scanner')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch QR Scan Station
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl backdrop-blur-md transition-colors"
          >
            Generate Reports
          </button>
        </div>
      </div>

      {/* Row 1: Real-time Attendance Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Total Active BAs
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {activeBas.length}{' '}
            <span className="text-xs font-normal text-slate-400">/ {totalBas}</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
            {activeBas.length} enrolled on roster
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
            Clocked In Today
          </span>
          <p className="text-2xl font-bold font-mono text-blue-950 mt-1">
            {clockedInToday}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {statusCounts.late} arrived after cutoff
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
            Shifts Completed
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-950 mt-1">
            {clockedOutToday}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Clock-out recorded</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
            Pending Reviews
          </span>
          <p className="text-2xl font-bold font-mono text-amber-950 mt-1">
            {pendingReviewToday}
          </p>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
            Missing clock-outs or approvals
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
            Approved Exceptions
          </span>
          <p className="text-2xl font-bold font-mono text-purple-950 mt-1">
            {approvedExceptions}
          </p>
          <span className="text-[11px] text-purple-700 font-medium mt-0.5 block">
            Activation / Sick / Duty
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Attendance Rate
          </span>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {attendanceRatePct}%
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {clockedInToday + approvedExceptions} active / {activeBas.length}
          </span>
        </div>
      </div>

      {/* Row 2: Financial Governance Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Eligible Days
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalEligibleDays} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <span className="text-[11px] text-slate-500">All registered teams</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Calculated Daily Comm
          </span>
          <p className="text-2xl font-bold font-mono text-blue-950 mt-1">
            {formatCurrency(totalDailyComm)}
          </p>
          <span className="text-[11px] text-slate-500">Method A sales commission</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
            Attendance-Based Comm
          </span>
          <p className="text-2xl font-bold font-mono text-indigo-950 mt-1">
            {formatCurrency(totalAttComm)}
          </p>
          <span className="text-[11px] text-slate-500">Method B formula: Days × Rate</span>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
            Total Organization Commission
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalNetComm)}
          </p>
          <span className="text-[11px] text-slate-300">Method C Combined Net Total</span>
        </div>
      </div>

      {/* Row 3: Visual Analytics & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Status Visual Breakdown */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Today's Attendance Status Distribution
            </h3>
            <span className="text-xs font-mono text-slate-500">{todayStr}</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Present bar */}
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present (On Time)
                </span>
                <span className="font-mono font-bold">{statusCounts.present}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (statusCounts.present / Math.max(1, activeBas.length)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Late bar */}
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late Arrival
                </span>
                <span className="font-mono font-bold">{statusCounts.late}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (statusCounts.late / Math.max(1, activeBas.length)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Activation bar */}
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> On Activation (Roadshows)
                </span>
                <span className="font-mono font-bold">{statusCounts.activation}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (statusCounts.activation / Math.max(1, activeBas.length)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Business Duty bar */}
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Out on Business (Merchant Visits)
                </span>
                <span className="font-mono font-bold">{statusCounts.business_duty}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (statusCounts.business_duty / Math.max(1, activeBas.length)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Sick / Absent bar */}
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Sick Leave & Absent
                </span>
                <span className="font-mono font-bold">{statusCounts.sick + statusCounts.absent}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((statusCounts.sick + statusCounts.absent) / Math.max(1, activeBas.length)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regional Commission Allocation */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Regional Force & Commission Breakdown
            </h3>
            <span className="text-xs text-slate-500">Active territories</span>
          </div>

          <div className="space-y-3">
            {regionalStats.map(r => (
              <div
                key={r.region}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <h5 className="font-bold text-slate-900">{r.region}</h5>
                  <span className="text-[11px] text-slate-500">{r.count} Brand Ambassadors assigned</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    {formatCurrency(r.comm)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Total Payout</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick scheduled delivery status */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-semibold text-blue-900 block">
                  Automatic Email Delivery Service:
                </span>
                <span className="text-[11px] text-blue-700">
                  {deliveryLogs.length} reports dispatched (simulated RFC 4180 UTF-8 CSVs)
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('scheduling')}
              className="text-blue-700 hover:text-blue-900 font-bold text-[11px] underline"
            >
              View Schedules
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Real-Time Audit Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Scans & Administrative Audit Activity
            </h3>
            <p className="text-xs text-slate-500">
              Complete accountability trail for QR scans, manual overrides, and commission adjustments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            View Full Audit Log ({auditLogs.length})
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {auditLogs.slice(0, 5).map(log => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                    {log.action}
                  </span>
                  <span className="font-semibold text-slate-900">{log.actor}</span>
                  <span className="text-[10px] text-slate-400">({log.actorRole})</span>
                </div>
                <p className="text-slate-600">{log.details}</p>
                {log.reason && (
                  <p className="text-[11px] text-slate-500 italic">Justification: {log.reason}</p>
                )}
              </div>
              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                {log.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
