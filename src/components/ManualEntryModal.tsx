import React, { useState } from 'react';
import { BrandAmbassador, AttendanceStatus } from '../types';
import { DataService } from '../services/dataService';
import { getZimbabweDate } from '../utils/dateUtils';
import { X, Calendar, PlusCircle, Check } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryAdded?: () => void;
  bas: BrandAmbassador[];
  currentUserName: string;
  currentUserRole: 'admin' | 'consultant' | 'operator';
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onEntryAdded,
  bas,
  currentUserName,
  currentUserRole,
}) => {
  const [selectedBaId, setSelectedBaId] = useState<string>(bas[0]?.baId || '');
  const [entryDate, setEntryDate] = useState<string>(getZimbabweDate());
  const [entryType, setEntryType] = useState<'attendance' | 'exception'>('attendance');

  // Attendance fields
  const [clockIn, setClockIn] = useState<string>('08:00:00');
  const [clockOut, setClockOut] = useState<string>('17:00:00');
  const [status, setStatus] = useState<AttendanceStatus>('present');

  // Exception fields
  const [exceptionType, setExceptionType] = useState<string>('Sales Activation');
  const [exceptionStatus, setExceptionStatus] = useState<AttendanceStatus>('activation');
  const [reason, setReason] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBaId) {
      setError('Please select a Brand Ambassador.');
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setError('A detailed reason (at least 5 characters) is required for audit verification.');
      return;
    }

    try {
      if (entryType === 'attendance') {
        DataService.createManualAttendanceRecord(
          selectedBaId,
          entryDate,
          clockIn || null,
          clockOut || null,
          status,
          reason,
          currentUserName,
          currentUserRole === 'admin' ? 'admin' : 'consultant'
        );
        setSuccess('Manual attendance record created with audit log entry.');
      } else {
        DataService.flagException(
          selectedBaId,
          entryDate,
          exceptionType,
          reason,
          exceptionStatus,
          currentUserName,
          currentUserRole === 'admin' ? 'admin' : 'consultant'
        );
        setSuccess(`Exception '${exceptionType}' recorded successfully.`);
      }

      onEntryAdded?.();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record entry.');
    }
  };

  const handleExceptionTypeChange = (type: string) => {
    setExceptionType(type);
    if (type === 'Sales Activation') setExceptionStatus('activation');
    else if (type === 'Medical Sickness') setExceptionStatus('sick');
    else if (type === 'Out on Business') setExceptionStatus('business_duty');
    else if (type === 'Approved Leave') setExceptionStatus('leave');
    else if (type === 'Public Holiday') setExceptionStatus('public_holiday');
    else if (type === 'Rest Day') setExceptionStatus('rest_day');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-800 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Record Attendance or Exception
            </h3>
            <p className="text-xs text-slate-500">
              Manual entry with mandatory audit justification
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setEntryType('attendance')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                entryType === 'attendance' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Attendance (Clock-In/Out)
            </button>
            <button
              type="button"
              onClick={() => setEntryType('exception')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                entryType === 'exception' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved Exception (Sick / Activation / Duty)
            </button>
          </div>

          {/* BA Selection */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Brand Ambassador *</label>
            <select
              value={selectedBaId}
              onChange={e => setSelectedBaId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              required
            >
              {bas.map(b => (
                <option key={b.id} value={b.baId}>
                  {b.fullName} ({b.baId}) — {b.branch} [{b.category}]
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Attendance Date *</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          {entryType === 'attendance' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clock-In Time</label>
                  <input
                    type="text"
                    placeholder="08:00:00"
                    value={clockIn}
                    onChange={e => setClockIn(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clock-Out Time</label>
                  <input
                    type="text"
                    placeholder="17:00:00"
                    value={clockOut}
                    onChange={e => setClockOut(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="present">Present (Normal)</option>
                  <option value="late">Late Arrival</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Exception Category *</label>
              <select
                value={exceptionType}
                onChange={e => handleExceptionTypeChange(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Sales Activation">Sales Activation (Field Campaign)</option>
                <option value="Out on Business">Out on Business (Merchant Visits)</option>
                <option value="Medical Sickness">Medical Sickness (Doctor Approved)</option>
                <option value="Approved Leave">Approved Leave</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Rest Day">Rest Day</option>
              </select>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Mandatory Audit Reason / Supporting Documentation *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Lost physical badge, replacement card requested. Verified attendance with shop supervisor..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Submit Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
