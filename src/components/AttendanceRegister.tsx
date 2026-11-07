import React, { useState, useMemo } from 'react';
import { AttendanceRecord, SalesCategory, AttendanceStatus } from '../types';
import { DataService } from '../services/dataService';
import { formatCurrency } from '../utils/dateUtils';
import { RecordDetailModal } from './RecordDetailModal';
import { ManualEntryModal } from './ManualEntryModal';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  Clock,
  QrCode,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface AttendanceRegisterProps {
  currentUserRole: 'admin' | 'consultant' | 'operator';
  currentUserName: string;
  assignedConsultantId?: string;
}

export const AttendanceRegister: React.FC<AttendanceRegisterProps> = ({
  currentUserRole,
  currentUserName,
  assignedConsultantId,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>(DataService.getAttendanceRecords());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterConsultant, setFilterConsultant] = useState<string>(
    currentUserRole === 'consultant' && assignedConsultantId ? assignedConsultantId : 'All'
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const consultants = DataService.getConsultants();
  const bas = DataService.getBAs();

  const reloadData = () => {
    setRecords([...DataService.getAttendanceRecords()]);
  };

  // Filtered & Sorted list
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Role scope: Consultants only see assigned BAs
      if (currentUserRole === 'consultant' && assignedConsultantId && r.salesConsultantId !== assignedConsultantId) {
        return false;
      }
      if (filterConsultant !== 'All' && r.salesConsultantId !== filterConsultant) {
        return false;
      }
      if (filterRegion !== 'All' && r.region !== filterRegion) {
        return false;
      }
      if (filterCategory !== 'All' && r.category !== filterCategory) {
        return false;
      }
      if (filterStatus !== 'All' && r.status !== filterStatus) {
        return false;
      }
      if (startDate && r.date < startDate) {
        return false;
      }
      if (endDate && r.date > endDate) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.baName.toLowerCase().includes(q);
        const matchId = r.baId.toLowerCase().includes(q);
        const matchBranch = r.branch.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchBranch) return false;
      }
      return true;
    });
  }, [records, currentUserRole, assignedConsultantId, filterConsultant, filterRegion, filterCategory, filterStatus, startDate, endDate, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCsv = () => {
    DataService.downloadReport(
      'daily_register',
      `Econet_Attendance_Register_${new Date().toISOString().split('T')[0]}`,
      {
        region: filterRegion,
        consultantId: filterConsultant,
        category: filterCategory,
        startDate,
        endDate,
      },
      currentUserName
    );
  };

  const getStatusBadge = (status: AttendanceStatus, missingClockOut: boolean) => {
    if (missingClockOut) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertCircle className="w-3 h-3 text-amber-600" /> Missing Clock-Out
        </span>
      );
    }

    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Late
          </span>
        );
      case 'sick':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Sick Leave
          </span>
        );
      case 'activation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> On Activation
          </span>
        );
      case 'business_duty':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Out on Business
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
            Absent
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Pending Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Daily Attendance Register
          </h2>
          <p className="text-xs text-slate-500">
            Official Econet digital register replacing manual paper logbooks. Shows physical scans, approved exceptions, and calculated commissions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={reloadData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh Register"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUserRole !== 'operator' && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Record Attendance / Exception
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV Register
          </button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500" />
          Filter Register Records
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Search BA</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name, BA ID, branch..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Region</label>
            <select
              value={filterRegion}
              onChange={e => {
                setFilterRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="All">All Regions</option>
              <option value="Harare Central">Harare Central</option>
              <option value="Harare South & Chitungwiza">Harare South & Chitungwiza</option>
              <option value="Bulawayo Metro">Bulawayo Metro</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={e => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="All">All Categories</option>
              <option value="BA">Brand Ambassador (BA)</option>
              <option value="OMI">OMI Merchant</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="sick">Sick Leave</option>
              <option value="activation">On Activation</option>
              <option value="business_duty">Out on Business</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>

          {/* Sales Consultant (Disabled if logged in as consultant) */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Consultant</label>
            <select
              value={filterConsultant}
              disabled={currentUserRole === 'consultant'}
              onChange={e => {
                setFilterConsultant(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-60"
            >
              <option value="All">All Teams</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.teamName.split(' ')[1] || c.teamName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-semibold">Date From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-semibold">Date To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          {(startDate || endDate || searchQuery || filterRegion !== 'All' || filterStatus !== 'All' || filterCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterRegion('All');
                setFilterCategory('All');
                setFilterStatus('All');
                if (currentUserRole !== 'consultant') setFilterConsultant('All');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Reset Filters
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredRecords.length}</strong> matching attendance records
          </span>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">BA Identifier</th>
                <th className="py-3 px-4">Brand Ambassador</th>
                <th className="py-3 px-3">Team / Branch</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Clock In</th>
                <th className="py-3 px-3">Clock Out</th>
                <th className="py-3 px-2 text-center">Hours</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3 text-right">Daily Comm</th>
                <th className="py-3 px-3 text-right">Att. Comm</th>
                <th className="py-3 px-3 text-right">Total Comm</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(record => (
                  <tr
                    key={record.id}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {record.date}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {record.baId}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{record.baName}</div>
                      <div className="text-[10px] text-slate-400">{record.category} Specialist</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{record.branch}</div>
                      <div className="text-[10px] text-slate-400">{record.salesConsultantName}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(record.status, record.missingClockOut)}
                    </td>

                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {record.clockInTime ? (
                        <span className={record.isLate ? 'text-amber-700 font-semibold' : 'text-slate-800'}>
                          {record.clockInTime}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {record.clockOutTime ? (
                        <span className="text-slate-800">{record.clockOutTime}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {record.totalHours ? `${record.totalHours}h` : '0h'}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {record.source === 'qr_scan' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                          <QrCode className="w-3 h-3 text-blue-600" /> QR Card
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-medium border border-amber-200">
                          Manual
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {formatCurrency(record.calculatedDailyCommission)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {formatCurrency(record.calculatedAttendanceCommission)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(record.totalEarned)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Audit Details & History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          onRecordUpdated={reloadData}
          currentUserRole={currentUserRole}
          currentUserName={currentUserName}
        />
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <ManualEntryModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onEntryAdded={reloadData}
          bas={bas}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
};
