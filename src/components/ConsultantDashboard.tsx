import React, { useState, useMemo } from 'react';
import { DataService } from '../services/dataService';
import { formatCurrency, getZimbabweDate } from '../utils/dateUtils';
import { AttendanceRecord, SalesConsultant, BrandAmbassador } from '../types';
import { RecordDetailModal } from './RecordDetailModal';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Briefcase,
  Activity,
  DollarSign,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface ConsultantDashboardProps {
  consultantId: string;
  consultantName: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'consultant' | 'operator';
}

export const ConsultantDashboard: React.FC<ConsultantDashboardProps> = ({
  consultantId,
  consultantName,
  currentUserName,
  currentUserRole,
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedBaId, setSelectedBaId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const todayStr = getZimbabweDate();

  // Load team data
  const teamBas = useMemo(() => {
    return DataService.getBAs().filter(b => b.salesConsultantId === consultantId);
  }, [consultantId]);

  const teamRecords = useMemo(() => {
    return DataService.getAttendanceRecords().filter(r => r.salesConsultantId === consultantId);
  }, [consultantId]);

  // Today's team stats
  const todayTeamRecords = teamRecords.filter(r => r.date === todayStr);
  const presentToday = todayTeamRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentToday = todayTeamRecords.filter(r => r.status === 'absent').length;
  const sickToday = todayTeamRecords.filter(r => r.status === 'sick').length;
  const activationToday = todayTeamRecords.filter(r => r.status === 'activation').length;
  const businessDutyToday = todayTeamRecords.filter(r => r.status === 'business_duty').length;
  const missingClockOuts = teamRecords.filter(r => r.missingClockOut).length;
  const pendingApprovals = teamRecords.filter(r => r.exceptionApprovalStatus === 'pending').length;

  // Summaries based on selected period
  const teamSummaries = useMemo(() => {
    let start: string | undefined;
    if (period === 'today') {
      start = todayStr;
    } else if (period === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      const d = new Date();
      d.setDate(1); // 1st of month
      start = d.toISOString().split('T')[0];
    }
    return DataService.getBaCommissionSummaries(start, undefined, consultantId);
  }, [period, consultantId, todayStr]);

  const totalTeamEligibleDays = teamSummaries.reduce((a, b) => a + b.eligibleDays, 0);
  const totalTeamDailyComm = teamSummaries.reduce((a, b) => a + b.dailyCommission, 0);
  const totalTeamAttComm = teamSummaries.reduce((a, b) => a + b.attendanceCommission, 0);
  const totalTeamGrossComm = teamSummaries.reduce((a, b) => a + b.totalCommission, 0);

  const selectedBa = teamBas.find(b => b.baId === selectedBaId);
  const selectedBaRecords = teamRecords.filter(r => r.baId === selectedBaId);

  const handleExportTeamCsv = () => {
    DataService.downloadReport(
      'team_report',
      `Team_Summary_${consultantName.replace(/\s+/g, '_')}_${todayStr}`,
      { consultantId },
      currentUserName
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-1">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            SALES CONSULTANT PORTAL
          </div>
          <h2 className="text-2xl font-bold text-white">
            Team Commission & Field Attendance Dashboard
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Consultant: <span className="font-semibold text-white">{consultantName}</span> • Managing{' '}
            <span className="font-semibold text-amber-300">{teamBas.length} Brand Ambassadors</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="inline-flex p-1 bg-white/10 rounded-xl text-xs font-semibold backdrop-blur-md">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'week' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={handleExportTeamCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white text-blue-950 hover:bg-blue-50 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            Export Team CSV
          </button>
        </div>
      </div>

      {/* Today's Operational Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Total Team BAs
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{teamBas.length}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Under Supervision</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
            Present Today
          </span>
          <p className="text-xl font-bold font-mono text-emerald-950 mt-0.5">{presentToday}</p>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Clocked In</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
            On Activation
          </span>
          <p className="text-xl font-bold font-mono text-blue-950 mt-0.5">{activationToday}</p>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Roadshows / Promos</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-xs bg-purple-50/20">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
            Out on Business
          </span>
          <p className="text-xl font-bold font-mono text-purple-950 mt-0.5">{businessDutyToday}</p>
          <span className="text-[10px] text-purple-700 mt-0.5 block">Merchant Deploy</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">
            Sick / Absent
          </span>
          <p className="text-xl font-bold font-mono text-rose-950 mt-0.5">{sickToday + absentToday}</p>
          <span className="text-[10px] text-rose-700 mt-0.5 block">{sickToday} sick, {absentToday} absent</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
            Missing Clock-Outs
          </span>
          <p className="text-xl font-bold font-mono text-amber-950 mt-0.5">{missingClockOuts}</p>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Requires Review</span>
        </div>
      </div>

      {/* Financial Team KPI Summary Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Team Eligible Days
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalTeamEligibleDays} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <span className="text-[11px] text-slate-500">Period: {period.toUpperCase()}</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Team Daily Sales Comm
          </span>
          <p className="text-2xl font-bold font-mono text-blue-950 mt-1">
            {formatCurrency(totalTeamDailyComm)}
          </p>
          <span className="text-[11px] text-slate-500">Calculated automatically</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
            Team Attendance Comm
          </span>
          <p className="text-2xl font-bold font-mono text-indigo-950 mt-1">
            {formatCurrency(totalTeamAttComm)}
          </p>
          <span className="text-[11px] text-slate-500">Days × $3.00 attendance rate</span>
        </div>

        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Net Team Commission
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalTeamGrossComm)}
          </p>
          <span className="text-[11px] text-slate-400">Total payable to team</span>
        </div>
      </div>

      {/* Team Roster & Commission Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Team Member Commission Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Zero manual arithmetic required. Click a team member to inspect individual attendance days.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {teamSummaries.length} Brand Ambassadors
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">BA ID</th>
                <th className="py-3 px-4">Brand Ambassador</th>
                <th className="py-3 px-3">Role / Branch</th>
                <th className="py-3 px-3 text-center">Eligible Days</th>
                <th className="py-3 px-3 text-right">Daily Rate</th>
                <th className="py-3 px-3 text-right">Att. Rate</th>
                <th className="py-3 px-3 text-right">Daily Comm</th>
                <th className="py-3 px-3 text-right">Att. Comm</th>
                <th className="py-3 px-3 text-right">Adjustments</th>
                <th className="py-3 px-4 text-right">Total Commission</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {teamSummaries.map(s => {
                const isSelected = selectedBaId === s.baId;
                return (
                  <tr
                    key={s.baId}
                    onClick={() => setSelectedBaId(isSelected ? null : s.baId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {s.baId}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{s.baName}</div>
                      <div className="text-[10px] text-slate-400">{s.category}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                      {s.region}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {s.eligibleDays}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(s.dailyRate)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(s.attendanceRate)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(s.dailyCommission)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(s.attendanceCommission)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(s.adjustments)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 text-sm whitespace-nowrap">
                      {formatCurrency(s.totalCommission)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <ChevronRight className={`w-4 h-4 text-slate-400 inline transition-transform ${isSelected ? 'rotate-90 text-blue-600' : ''}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected BA Detailed History Drawer */}
      {selectedBa && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Attendance & Shift Logs: {selectedBa.fullName} ({selectedBa.baId})
              </h4>
              <p className="text-xs text-slate-500">
                Transparent calculation trail for period {period.toUpperCase()}
              </p>
            </div>
            <button
              onClick={() => setSelectedBaId(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Close History
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-2 text-center">Hours</th>
                  <th className="py-2.5 px-3">Exception / Reason</th>
                  <th className="py-2.5 px-3 text-right">Commission</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {selectedBaRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-medium">{rec.date}</td>
                    <td className="py-2.5 px-3 uppercase font-semibold text-[11px]">{rec.status}</td>
                    <td className="py-2.5 px-3 font-mono">{rec.clockInTime || '—'}</td>
                    <td className="py-2.5 px-3 font-mono">{rec.clockOutTime || '—'}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{rec.totalHours ? `${rec.totalHours}h` : '0h'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {rec.exceptionType ? `${rec.exceptionType}: ${rec.exceptionReason}` : rec.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(rec.totalEarned)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="text-blue-600 hover:underline text-[11px] font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          currentUserRole={currentUserRole}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
};
