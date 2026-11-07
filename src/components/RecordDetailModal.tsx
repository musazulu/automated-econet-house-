import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { DataService } from '../services/dataService';
import { formatCurrency } from '../utils/dateUtils';
import { X, Clock, ShieldCheck, History, Edit3, CheckCircle2 } from 'lucide-react';

interface RecordDetailModalProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onRecordUpdated?: () => void;
  currentUserRole: 'admin' | 'consultant' | 'operator';
  currentUserName: string;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onRecordUpdated,
  currentUserRole,
  currentUserName,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>(record.status);
  const [editClockIn, setEditClockIn] = useState<string>(record.clockInTime || '');
  const [editClockOut, setEditClockOut] = useState<string>(record.clockOutTime || '');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manual Adjustment State (Admin only)
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>(
    record.manualAdjustments ? String(record.manualAdjustments) : '0'
  );
  const [adjustmentReason, setAdjustmentReason] = useState<string>(record.adjustmentReason || '');

  if (!isOpen) return null;

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!correctionReason || correctionReason.trim().length < 5) {
      setErrorMessage('A detailed reason (at least 5 characters) is mandatory for audit accountability.');
      return;
    }

    try {
      DataService.correctAttendanceRecord(
        record.id,
        {
          status: editStatus,
          clockInTime: editClockIn || null,
          clockOutTime: editClockOut || null,
        },
        correctionReason,
        currentUserName,
        currentUserRole === 'admin' ? 'admin' : 'consultant'
      );

      setSuccessMessage('Record corrected successfully with audit log entry.');
      setIsEditing(false);
      onRecordUpdated?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update record.');
    }
  };

  const handleApplyAdjustment = () => {
    setErrorMessage(null);
    const amt = parseFloat(adjustmentAmount);
    if (isNaN(amt)) {
      setErrorMessage('Please enter a valid numeric adjustment amount.');
      return;
    }

    if (!adjustmentReason || adjustmentReason.trim().length < 5) {
      setErrorMessage('A detailed reason is mandatory for commission adjustments.');
      return;
    }

    try {
      DataService.adjustCommission(record.id, amt, adjustmentReason, currentUserName);
      setSuccessMessage('Commission adjustment applied and recorded in audit log.');
      onRecordUpdated?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to apply adjustment.');
    }
  };

  const handleApproveException = () => {
    try {
      DataService.approveException(record.id, currentUserName);
      setSuccessMessage('Exception approved! Commission recalculated.');
      onRecordUpdated?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve exception.');
    }
  };

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'consultant';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-800 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Attendance Record #{record.id}
            </h3>
            <p className="text-xs text-slate-500">
              {record.baName} ({record.baId}) • {record.date} • {record.branch}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {/* Current Details Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
            <span className="font-bold text-xs uppercase text-slate-800">{record.status}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clock In</span>
            <span className="font-mono text-xs font-semibold text-slate-800">
              {record.clockInTime ? `${record.clockInTime} CAT` : '—'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clock Out</span>
            <span className="font-mono text-xs font-semibold text-slate-800">
              {record.clockOutTime ? `${record.clockOutTime} CAT` : '—'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Hours</span>
            <span className="font-mono text-xs font-bold text-blue-700">
              {record.totalHours ? `${record.totalHours} hrs` : '0 hrs'}
            </span>
          </div>
        </div>

        {/* Financial Breakdown Section */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2 mb-4">
          <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Commission Calculation Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Daily Sales Comm:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(record.calculatedDailyCommission)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Attendance Comm:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(record.calculatedAttendanceCommission)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Adjustments:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(record.manualAdjustments)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Total Commission:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatCurrency(record.totalEarned)}
              </span>
            </div>
          </div>

          {record.adjustmentReason && (
            <p className="text-[11px] text-slate-600 italic pt-1 border-t border-blue-100">
              Adjustment note: {record.adjustmentReason}
            </p>
          )}
        </div>

        {/* Pending Exception Approval Alert */}
        {record.exceptionType && record.exceptionApprovalStatus === 'pending' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-amber-900 block">
                Pending Exception: {record.exceptionType}
              </span>
              <span className="text-amber-800">{record.exceptionReason}</span>
            </div>
            {currentUserRole === 'admin' ? (
              <button
                onClick={handleApproveException}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Approve Exception
              </button>
            ) : (
              <span className="text-[11px] text-amber-700 italic">
                Awaiting Administrator Approval
              </span>
            )}
          </div>
        )}

        {/* Correction Form */}
        {isEditing ? (
          <form onSubmit={handleSaveCorrection} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mb-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Correct Attendance Record (Mandatory Reason Required)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="sick">Sick Leave</option>
                  <option value="activation">On Activation</option>
                  <option value="business_duty">Out on Business</option>
                  <option value="pending_review">Pending Review</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">Clock In (HH:mm:ss)</label>
                <input
                  type="text"
                  placeholder="08:00:00"
                  value={editClockIn}
                  onChange={e => setEditClockIn(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">Clock Out (HH:mm:ss)</label>
                <input
                  type="text"
                  placeholder="17:00:00"
                  value={editClockOut}
                  onChange={e => setEditClockOut(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Correction Reason (Mandatory for Audit Trail) *
              </label>
              <textarea
                rows={2}
                placeholder="Explain why this record is being modified (e.g. Card malfunction confirmed by shop manager, verified time with CCTV)..."
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Save Correction
              </button>
            </div>
          </form>
        ) : (
          canEdit && (
            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Correct Record
              </button>
            </div>
          )
        )}

        {/* Admin Commission Adjustment Box */}
        {currentUserRole === 'admin' && !isEditing && (
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 mb-4 space-y-2">
            <span className="text-[11px] font-bold text-amber-950 uppercase block">
              Administrative Commission Adjustment
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Amount ($)"
                  value={adjustmentAmount}
                  onChange={e => setAdjustmentAmount(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-amber-200 rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Mandatory Reason for adjustment..."
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  className="flex-1 text-xs p-2 bg-white border border-amber-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit History Timeline */}
        <div className="border-t border-slate-200 pt-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5 mb-2">
            <History className="w-4 h-4 text-slate-500" />
            Immutable Audit History Trail
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {record.history?.map((h, i) => (
              <div key={i} className="text-xs p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>{h.timestamp}</span>
                  <span className="font-semibold text-slate-700">{h.user}</span>
                </div>
                <div className="font-medium text-slate-900 mt-0.5">{h.action}</div>
                {h.note && <div className="text-slate-500 italic mt-0.5 text-[11px]">{h.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
