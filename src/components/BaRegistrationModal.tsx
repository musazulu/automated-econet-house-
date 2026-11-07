import React, { useState } from 'react';
import { BrandAmbassador, SalesCategory, SalesConsultant } from '../types';
import { DataService } from '../services/dataService';
import { getZimbabweDate, getZimbabweTimestamp } from '../utils/dateUtils';
import { X, UserPlus, Sparkles, Check, AlertCircle } from 'lucide-react';

interface BaRegistrationModalProps {
  baToEdit?: BrandAmbassador | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ba: BrandAmbassador) => void;
  consultants: SalesConsultant[];
  actorName: string;
}

export const BaRegistrationModal: React.FC<BaRegistrationModalProps> = ({
  baToEdit,
  isOpen,
  onClose,
  onSaved,
  consultants,
  actorName,
}) => {
  const isEditing = Boolean(baToEdit);

  // Auto-generate next ID if creating new
  const nextNumber = DataService.getBAs().length + 1001;
  const initialBaId = baToEdit ? baToEdit.baId : `ECO-BA-${nextNumber}`;

  const [fullName, setFullName] = useState<string>(baToEdit?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(baToEdit?.phoneNumber || '+263 77 ');
  const [nationalId, setNationalId] = useState<string>(baToEdit?.nationalId || '63-');
  const [category, setCategory] = useState<SalesCategory>(baToEdit?.category || 'BA');
  const [region, setRegion] = useState<string>(baToEdit?.region || 'Harare Central');
  const [branch, setBranch] = useState<string>(baToEdit?.branch || 'First Street Branch');
  const [consultantId, setConsultantId] = useState<string>(
    baToEdit?.salesConsultantId || consultants[0]?.id || ''
  );
  const [dailyRate, setDailyRate] = useState<number>(baToEdit?.dailyCommissionRate || 5.0);
  const [attendanceRate, setAttendanceRate] = useState<number>(
    baToEdit?.dailyAttendanceCommissionRate || 3.0
  );
  const [photoUrl, setPhotoUrl] = useState<string>(
    baToEdit?.photoUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop&crop=faces&q=80'
  );
  const [status, setStatus] = useState<'active' | 'inactive'>(baToEdit?.status || 'active');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('Please provide a valid full name for the Brand Ambassador.');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setError('Please provide a valid Zimbabwean mobile phone number.');
      return;
    }

    const assignedConsultant = consultants.find(c => c.id === consultantId);

    const token =
      baToEdit?.qrToken ||
      `ECO_TOKEN_${Math.random().toString(36).substr(2, 8).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

    const baData: BrandAmbassador = {
      id: baToEdit?.id || `ba-${Date.now()}`,
      baId: initialBaId,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      nationalId: nationalId.trim(),
      category,
      region,
      branch,
      salesConsultantId: consultantId,
      salesConsultantName: assignedConsultant?.name || 'Unassigned',
      dateRegistered: baToEdit?.dateRegistered || getZimbabweDate(),
      status,
      dailyCommissionRate: Number(dailyRate) || 5.0,
      dailyAttendanceCommissionRate: Number(attendanceRate) || 3.0,
      photoUrl,
      qrToken: token,
      qrRevoked: baToEdit ? baToEdit.qrRevoked : false,
      qrGeneratedAt: baToEdit?.qrGeneratedAt || getZimbabweTimestamp(),
    };

    try {
      const saved = DataService.saveBA(baData, actorName);
      setSuccess(isEditing ? 'BA profile updated successfully.' : 'New BA registered and secure QR token created.');
      onSaved(saved);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save BA.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 text-slate-800 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              {isEditing ? `Edit Brand Ambassador (${initialBaId})` : 'Register New Brand Ambassador'}
            </h3>
            <p className="text-xs text-slate-500">
              Econet Field Sales & OMI Personnel Enrollment Form
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
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assigned BA ID</label>
              <input
                type="text"
                value={initialBaId}
                disabled
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Full Legal Name *</label>
              <input
                type="text"
                placeholder="e.g. Tanaka Moyo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number (Econet) *</label>
              <input
                type="text"
                placeholder="+263 77 123 4567"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">National ID Number</label>
              <input
                type="text"
                placeholder="63-1234567-B-23"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sales Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as SalesCategory)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="BA">Brand Ambassador (BA)</option>
                <option value="OMI">OMI Merchant</option>
                <option value="Direct Sales Agent">Direct Sales Agent</option>
                <option value="Kiosk Rep">Kiosk Rep</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Region</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Harare Central">Harare Central</option>
                <option value="Harare South & Chitungwiza">Harare South & Chitungwiza</option>
                <option value="Bulawayo Metro">Bulawayo Metro</option>
                <option value="Manicaland">Manicaland</option>
                <option value="Midlands">Midlands</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Branch / Shop</label>
              <input
                type="text"
                placeholder="e.g. First Street Branch"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sales Consultant</label>
              <select
                value={consultantId}
                onChange={e => setConsultantId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                {consultants.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.teamName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Daily Sales Rate ($)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={dailyRate}
                onChange={e => setDailyRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Att. Rate ($)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={attendanceRate}
                onChange={e => setAttendanceRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              >
                <option value="active">Active (Permitted to clock-in)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Photo URL</label>
              <input
                type="text"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Saving will automatically provision a cryptographically unique QR security token. No salary, commission, or confidential data is embedded in the barcode.
            </span>
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
              {isEditing ? 'Save Changes' : 'Register BA & Issue Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
