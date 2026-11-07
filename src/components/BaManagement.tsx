import React, { useState } from 'react';
import { BrandAmbassador } from '../types';
import { DataService } from '../services/dataService';
import { formatCurrency } from '../utils/dateUtils';
import { PrintableCardModal } from './PrintableCardModal';
import { BaRegistrationModal } from './BaRegistrationModal';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  CreditCard,
  Edit,
  ShieldAlert,
  Phone,
  RefreshCw,
} from 'lucide-react';

interface BaManagementProps {
  currentUserRole: 'admin' | 'consultant' | 'operator';
  currentUserName: string;
}

export const BaManagement: React.FC<BaManagementProps> = ({
  currentUserRole,
  currentUserName,
}) => {
  const [bas, setBas] = useState<BrandAmbassador[]>(DataService.getBAs());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterRegion, setFilterRegion] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Modals
  const [cardModalBa, setCardModalBa] = useState<BrandAmbassador | null>(null);
  const [editModalBa, setEditModalBa] = useState<BrandAmbassador | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);

  const consultants = DataService.getConsultants();

  const reloadData = () => {
    setBas([...DataService.getBAs()]);
  };

  const filteredBas = bas.filter(b => {
    if (filterCategory !== 'All' && b.category !== filterCategory) return false;
    if (filterRegion !== 'All' && b.region !== filterRegion) return false;
    if (filterStatus !== 'All' && b.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = b.fullName.toLowerCase().includes(q);
      const matchId = b.baId.toLowerCase().includes(q);
      const matchBranch = b.branch.toLowerCase().includes(q);
      const matchPhone = b.phoneNumber.includes(q);
      if (!matchName && !matchId && !matchBranch && !matchPhone) return false;
    }
    return true;
  });

  const handleToggleStatus = (ba: BrandAmbassador) => {
    if (currentUserRole !== 'admin') {
      alert('Only administrators are authorised to deactivate or reactivate BAs.');
      return;
    }

    const newStatus = ba.status === 'active' ? 'inactive' : 'active';
    const confirmed = confirm(`Are you sure you want to mark ${ba.fullName} (${ba.baId}) as ${newStatus.toUpperCase()}?`);
    if (confirmed) {
      const updated: BrandAmbassador = { ...ba, status: newStatus };
      DataService.saveBA(updated, currentUserName);
      reloadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Brand Ambassador & OMI Directory
          </h2>
          <p className="text-xs text-slate-500">
            Field workforce roster, identification badge provisioning, and commission rate governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUserRole === 'admin' && (
            <button
              onClick={() => {
                setEditModalBa(null);
                setIsRegisterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register New BA
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, BA ID, branch, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="All">All Categories</option>
            <option value="BA">Brand Ambassador (BA)</option>
            <option value="OMI">OMI Merchant</option>
          </select>

          <select
            value={filterRegion}
            onChange={e => setFilterRegion(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="All">All Regions</option>
            <option value="Harare Central">Harare Central</option>
            <option value="Harare South & Chitungwiza">Harare South & Chitungwiza</option>
            <option value="Bulawayo Metro">Bulawayo Metro</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* BA Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBas.map(ba => {
          const isInactive = ba.status === 'inactive';
          return (
            <div
              key={ba.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                isInactive ? 'border-slate-200 bg-slate-50/60 opacity-70' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header row with photo and badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ba.photoUrl}
                      alt={ba.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{ba.fullName}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {ba.baId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {ba.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isInactive ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {ba.status}
                  </span>
                </div>

                {/* Details list */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Workplace:</span>
                    <span className="font-semibold text-slate-800">{ba.branch}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Region:</span>
                    <span className="text-slate-700">{ba.region}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Team / Consultant:</span>
                    <span className="text-slate-700 font-medium">{ba.salesConsultantName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Econet Mobile:</span>
                    <span className="font-mono text-slate-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-blue-500" />
                      {ba.phoneNumber}
                    </span>
                  </div>
                </div>

                {/* Commission Rates Strip */}
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Sales Rate</span>
                    <span className="font-mono font-bold text-blue-900">{formatCurrency(ba.dailyCommissionRate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
                    <span className="font-mono font-bold text-blue-900">{formatCurrency(ba.dailyAttendanceCommissionRate)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setCardModalBa(ba)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Print ID Card
                </button>

                {currentUserRole === 'admin' && (
                  <>
                    <button
                      onClick={() => {
                        setEditModalBa(ba);
                        setIsRegisterOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(ba)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isInactive
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-rose-500 hover:bg-rose-50'
                      }`}
                      title={isInactive ? 'Reactivate BA' : 'Deactivate BA'}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable Card Modal */}
      {cardModalBa && (
        <PrintableCardModal
          ba={cardModalBa}
          isOpen={Boolean(cardModalBa)}
          onClose={() => setCardModalBa(null)}
          onCardUpdated={() => reloadData()}
          currentUserRole={currentUserRole}
        />
      )}

      {/* BA Registration & Edit Modal */}
      {isRegisterOpen && (
        <BaRegistrationModal
          baToEdit={editModalBa}
          isOpen={isRegisterOpen}
          onClose={() => {
            setIsRegisterOpen(false);
            setEditModalBa(null);
          }}
          onSaved={() => reloadData()}
          consultants={consultants}
          actorName={currentUserName}
        />
      )}
    </div>
  );
};
