import React, { useState, useMemo } from 'react';
import { CommissionSettings, CommissionMethod, BrandAmbassador, AttendanceRecord } from '../types';
import { DataService } from '../services/dataService';
import { formatCurrency } from '../utils/dateUtils';
import {
  DollarSign,
  Calculator,
  Sliders,
  Download,
  Calendar,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Save,
} from 'lucide-react';

interface CommissionManagementProps {
  currentUserRole: 'admin' | 'consultant' | 'operator';
  currentUserName: string;
}

export const CommissionManagement: React.FC<CommissionManagementProps> = ({
  currentUserRole,
  currentUserName,
}) => {
  const [settings, setSettings] = useState<CommissionSettings>(DataService.getCommissionSettings());
  const [activeTab, setActiveTab] = useState<'summaries' | 'settings' | 'audit'>('summaries');

  // Filter dates
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('All');
  const [selectedBaId, setSelectedBaId] = useState<string | null>(null);

  // Settings form
  const [selectedMethod, setSelectedMethod] = useState<CommissionMethod>(settings.calculationMethod);
  const [defaultDaily, setDefaultDaily] = useState<number>(settings.defaultDailyRate);
  const [defaultAtt, setDefaultAtt] = useState<number>(settings.defaultAttendanceRate);
  const [reportingCutoff, setReportingCutoff] = useState<string>(settings.reportingTimeCutoff);

  // Exception rules
  const [sickEligible, setSickEligible] = useState<boolean>(settings.exceptionRules.sick.eligible);
  const [sickPercent, setSickPercent] = useState<number>(settings.exceptionRules.sick.commissionPercent);
  const [activationEligible, setActivationEligible] = useState<boolean>(settings.exceptionRules.activation.eligible);
  const [activationPercent, setActivationPercent] = useState<number>(settings.exceptionRules.activation.commissionPercent);
  const [bizDutyEligible, setBizDutyEligible] = useState<boolean>(settings.exceptionRules.business_duty.eligible);
  const [bizDutyPercent, setBizDutyPercent] = useState<number>(settings.exceptionRules.business_duty.commissionPercent);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const consultants = DataService.getConsultants();
  const bas = DataService.getBAs();

  // Calculate summaries with current filter
  const summaries = useMemo(() => {
    return DataService.getBaCommissionSummaries(
      startDate || undefined,
      endDate || undefined,
      selectedConsultant === 'All' ? undefined : selectedConsultant
    );
  }, [startDate, endDate, selectedConsultant, settings]);

  // Selected BA's attendance records for transparent breakdown
  const selectedBaRecords = useMemo(() => {
    if (!selectedBaId) return [];
    return DataService.getAttendanceRecords().filter(r => {
      if (r.baId !== selectedBaId) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [selectedBaId, startDate, endDate]);

  const selectedBaObj = bas.find(b => b.baId === selectedBaId);

  // Aggregated totals
  const totalEligibleDays = summaries.reduce((acc, s) => acc + s.eligibleDays, 0);
  const totalDailyComm = summaries.reduce((acc, s) => acc + s.dailyCommission, 0);
  const totalAttComm = summaries.reduce((acc, s) => acc + s.attendanceCommission, 0);
  const totalAdjustments = summaries.reduce((acc, s) => acc + s.adjustments, 0);
  const totalGrossPayout = summaries.reduce((acc, s) => acc + s.totalCommission, 0);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      alert('Only administrators can modify commission calculation policies.');
      return;
    }

    const updated: CommissionSettings = {
      ...settings,
      calculationMethod: selectedMethod,
      defaultDailyRate: Number(defaultDaily),
      defaultAttendanceRate: Number(defaultAtt),
      reportingTimeCutoff: reportingCutoff,
      exceptionRules: {
        ...settings.exceptionRules,
        sick: { eligible: sickEligible, commissionPercent: Number(sickPercent) },
        activation: { eligible: activationEligible, commissionPercent: Number(activationPercent) },
        business_duty: { eligible: bizDutyEligible, commissionPercent: Number(bizDutyPercent) },
      },
    };

    DataService.updateCommissionSettings(updated, currentUserName);
    setSettings(updated);
    setSaveNotice('Commission policy updated and all records automatically recalculated.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleExportCsv = () => {
    DataService.downloadReport(
      'daily_commission',
      `Econet_Commission_Report_${new Date().toISOString().split('T')[0]}`,
      {
        startDate,
        endDate,
        consultantId: selectedConsultant,
      },
      currentUserName
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Daily & Attendance Commission Engine
          </h2>
          <p className="text-xs text-slate-500">
            Automated multi-method commission governance for Brand Ambassadors and OMI sales forces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('summaries')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'summaries' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Commission Rollup
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'settings' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculation Rules & Rates
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Total Eligible Days
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalEligibleDays} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across {summaries.length} Brand Ambassadors
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
            Daily Sales Commission
          </span>
          <p className="text-2xl font-bold font-mono text-blue-950 mt-1">
            {formatCurrency(totalDailyComm)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Method A Portion</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
            Attendance Commission
          </span>
          <p className="text-2xl font-bold font-mono text-indigo-950 mt-1">
            {formatCurrency(totalAttComm)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Days × Daily Rate (Method B)</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-md">
          <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wide">
            Total Calculated Payout
          </span>
          <p className="text-2xl font-bold font-mono mt-1 text-white">
            {formatCurrency(totalGrossPayout)}
          </p>
          <span className="text-[11px] text-emerald-100 mt-0.5 block">
            Active: {settings.calculationMethod.toUpperCase()}
          </span>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {saveNotice}
        </div>
      )}

      {activeTab === 'summaries' ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">Period From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">Team / Consultant:</span>
                <select
                  value={selectedConsultant}
                  onChange={e => setSelectedConsultant(e.target.value)}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="All">All Teams</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.teamName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Active Policy Formula:{' '}
              <span className="font-semibold text-slate-800">
                {settings.calculationMethod === 'method_a'
                  ? 'Daily Sales Commission Only'
                  : settings.calculationMethod === 'method_b'
                  ? 'Eligible Days × Attendance Rate ($3.00)'
                  : 'Daily Sales + Attendance-based + Adjustments'}
              </span>
            </div>
          </div>

          {/* Main Commission Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Individual BA Commission Breakdown Table
              </h3>
              <span className="text-xs text-slate-500">
                Click any BA to view transparent calculation proof and daily logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">BA ID</th>
                    <th className="py-3 px-4">Brand Ambassador</th>
                    <th className="py-3 px-3">Team / Consultant</th>
                    <th className="py-3 px-3 text-center">Eligible Days</th>
                    <th className="py-3 px-3 text-right">Daily Rate</th>
                    <th className="py-3 px-3 text-right">Att. Rate</th>
                    <th className="py-3 px-3 text-right">Daily Comm ($)</th>
                    <th className="py-3 px-3 text-right">Att. Comm ($)</th>
                    <th className="py-3 px-3 text-right">Adjustments ($)</th>
                    <th className="py-3 px-4 text-right">Total Payout ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summaries.map(s => {
                    const isSelected = selectedBaId === s.baId;
                    return (
                      <tr
                        key={s.baId}
                        onClick={() => setSelectedBaId(isSelected ? null : s.baId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {s.baId}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{s.baName}</div>
                          <div className="text-[10px] text-slate-400">{s.category} • {s.region}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                          {s.salesConsultantName}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {s.eligibleDays} days
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drilldown / Transparent Audit Panel for Selected BA */}
          {selectedBaObj && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-1">
                    TRANSPARENT AUDIT CALCULATION PROOF
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {selectedBaObj.fullName} ({selectedBaObj.baId})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Category: {selectedBaObj.category} • Team: {selectedBaObj.salesConsultantName} • Assigned Rates: Daily ${selectedBaObj.dailyCommissionRate.toFixed(2)} | Att. ${selectedBaObj.dailyAttendanceCommissionRate.toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBaId(null)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Close Proof
                </button>
              </div>

              {/* Formula Step-by-Step Proof */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2 text-xs">
                <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Formula Verification Breakdown:
                </h5>
                <div className="font-mono text-slate-200 space-y-1">
                  <div>
                    1. <strong>Eligible Attendance Days:</strong>{' '}
                    {selectedBaRecords.filter(r => r.status === 'present' || r.exceptionApprovalStatus === 'approved').length} eligible calendar dates.
                  </div>
                  <div>
                    2. <strong>Attendance Commission Formula (Method B):</strong>{' '}
                    Eligible Days ({selectedBaRecords.filter(r => r.status === 'present' || r.exceptionApprovalStatus === 'approved').length}) × Daily Attendance Rate (${selectedBaObj.dailyAttendanceCommissionRate.toFixed(2)}) ={' '}
                    <span className="text-emerald-400 font-bold">
                      ${(selectedBaRecords.filter(r => r.status === 'present' || r.exceptionApprovalStatus === 'approved').length * selectedBaObj.dailyAttendanceCommissionRate).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    3. <strong>Daily Sales Commission (Method A):</strong>{' '}
                    {selectedBaRecords.filter(r => r.status === 'present').length} present days × Daily Sales Rate (${selectedBaObj.dailyCommissionRate.toFixed(2)}) ={' '}
                    <span className="text-blue-400 font-bold">
                      ${(selectedBaRecords.filter(r => r.status === 'present').length * selectedBaObj.dailyCommissionRate).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="py-2">Date</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Clock In / Out</th>
                      <th className="py-2">Hours</th>
                      <th className="py-2">Exception</th>
                      <th className="py-2 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedBaRecords.map(r => (
                      <tr key={r.id}>
                        <td className="py-2 font-mono">{r.date}</td>
                        <td className="py-2 uppercase font-semibold text-[11px]">{r.status}</td>
                        <td className="py-2 font-mono">
                          {r.clockInTime || '—'} / {r.clockOutTime || '—'}
                        </td>
                        <td className="py-2 font-mono">{r.totalHours ? `${r.totalHours}h` : '0h'}</td>
                        <td className="py-2 text-slate-400">{r.exceptionType ? `${r.exceptionType} (${r.exceptionApprovalStatus})` : '—'}</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(r.totalEarned)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Commission Configuration Form */
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Commission Policy & Formula Governance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure how the organization calculates Brand Ambassador and OMI sales compensation.
            </p>
          </div>

          {/* Method Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
              1. Commission Calculation Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'method_a'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="calc_method"
                    value="method_a"
                    checked={selectedMethod === 'method_a'}
                    onChange={() => setSelectedMethod('method_a')}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-slate-900">Method A: Daily Commission</span>
                </div>
                <p className="text-slate-500 mt-2 text-[11px] leading-relaxed">
                  Calculates earnings based purely on active daily sales rate. Does not add attendance days multiplier.
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'method_b'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="calc_method"
                    value="method_b"
                    checked={selectedMethod === 'method_b'}
                    onChange={() => setSelectedMethod('method_b')}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-slate-900">Method B: Attendance-Based</span>
                </div>
                <p className="text-slate-500 mt-2 text-[11px] leading-relaxed">
                  Eligible Attendance Days × Daily Attendance Rate (e.g., 20 days × $3.00 = $60.00).
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'method_c'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="calc_method"
                    value="method_c"
                    checked={selectedMethod === 'method_c'}
                    onChange={() => setSelectedMethod('method_c')}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-slate-900">Method C: Total Combined</span>
                </div>
                <p className="text-slate-500 mt-2 text-[11px] leading-relaxed">
                  Total Commission = Earned Daily Sales Commission + Attendance-based Commission + Approved Adjustments.
                </p>
              </label>
            </div>
          </div>

          {/* Default Rates & Cutoffs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Default Daily Sales Rate ($ USD)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={defaultDaily}
                onChange={e => setDefaultDaily(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Default Daily Attendance Rate ($ USD)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={defaultAtt}
                onChange={e => setDefaultAtt(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Morning Reporting Cutoff Time (CAT)
              </label>
              <input
                type="text"
                placeholder="08:15"
                value={reportingCutoff}
                onChange={e => setReportingCutoff(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>
          </div>

          {/* Exception Commission Treatment Matrix */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              2. Exception Eligibility & Commission Policy
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
                <span className="font-semibold text-slate-800">Medical Sickness Absence</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sickEligible}
                    onChange={e => setSickEligible(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Counts as Eligible Day</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Comm %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sickPercent}
                    onChange={e => setSickPercent(Number(e.target.value))}
                    className="w-20 p-1 bg-white border border-slate-200 rounded text-center font-mono"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-800">Sales Activation Duty</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activationEligible}
                    onChange={e => setActivationEligible(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Counts as Eligible Day</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Comm %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={activationPercent}
                    onChange={e => setActivationPercent(Number(e.target.value))}
                    className="w-20 p-1 bg-white border border-slate-200 rounded text-center font-mono"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-800">Out on Business (Merchant Visits)</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bizDutyEligible}
                    onChange={e => setBizDutyEligible(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Counts as Eligible Day</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Comm %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bizDutyPercent}
                    onChange={e => setBizDutyPercent(Number(e.target.value))}
                    className="w-20 p-1 bg-white border border-slate-200 rounded text-center font-mono"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          {currentUserRole === 'admin' && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors text-xs"
              >
                <Save className="w-4 h-4" />
                Save & Recalculate All Periods
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
