import React, { useState, useMemo } from 'react';
import { DataService } from '../services/dataService';
import { getZimbabweDate } from '../utils/dateUtils';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Eye,
  FileText,
  Clock,
  ShieldAlert,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface ReportModuleProps {
  currentUserName: string;
  currentUserRole: string;
}

const REPORT_DEFINITIONS = [
  {
    id: 'daily_register',
    name: '1. Daily Attendance Register',
    description: 'Complete digital register of all physical and manual check-ins, exceptions, and hours worked.',
  },
  {
    id: 'clock_in_out',
    name: '2. Daily Clock-In and Clock-Out Report',
    description: 'Detailed timestamps, reporting times, late arrival flags, and station scanner details.',
  },
  {
    id: 'exceptions',
    name: '3. Attendance Exception Report',
    description: 'Approved and pending medical sick leaves, activations, business duties, and justifications.',
  },
  {
    id: 'ba_summary',
    name: '4. BA Attendance Summary',
    description: 'Aggregated calendar days, present count, exception count, and total shift hours per BA.',
  },
  {
    id: 'team_report',
    name: '5. Sales Consultant Team Report',
    description: 'Performance and attendance rollup grouped by Sales Consultant and sales territory.',
  },
  {
    id: 'daily_commission',
    name: '6. Daily Commission Report',
    description: 'Daily commission calculations, attendance multipliers, and net pay breakdown.',
  },
  {
    id: 'weekly_commission',
    name: '7. Weekly Commission Report',
    description: '7-day rolling commission rollup with eligible attendance days formula verification.',
  },
  {
    id: 'monthly_commission',
    name: '8. Monthly Commission Report',
    description: 'Payroll-ready monthly commission total including manual adjustments and audit notes.',
  },
  {
    id: 'commission_audit',
    name: '9. Commission Calculation Audit Report',
    description: 'Audit log of all manual adjustments, rate overrides, and formula changes.',
  },
  {
    id: 'missing_clockout',
    name: '10. Missing Clock-Out & Incomplete Records',
    description: 'Exception list of BAs who clocked in without completing checkout, requiring supervisor verification.',
  },
];

export const ReportModule: React.FC<ReportModuleProps> = ({ currentUserName, currentUserRole }) => {
  const [selectedReportId, setSelectedReportId] = useState<string>('daily_register');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [consultantFilter, setConsultantFilter] = useState<string>('All');

  const [previewCsvContent, setPreviewCsvContent] = useState<string | null>(null);

  const consultants = DataService.getConsultants();

  const selectedReportDef = REPORT_DEFINITIONS.find(r => r.id === selectedReportId)!;

  const handleGeneratePreview = () => {
    const csv = DataService.generateReportCsv(selectedReportId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      region: regionFilter,
      category: categoryFilter,
      consultantId: consultantFilter,
    });
    setPreviewCsvContent(csv);
  };

  const handleDownload = () => {
    const filename = `Econet_${selectedReportId}_${getZimbabweDate()}`;
    DataService.downloadReport(
      selectedReportId,
      filename,
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        region: regionFilter,
        category: categoryFilter,
        consultantId: consultantFilter,
      },
      currentUserName
    );
  };

  // Parse CSV preview for table rendering
  const parsedPreview = useMemo(() => {
    if (!previewCsvContent) return null;
    const lines = previewCsvContent.split('\r\n').filter(Boolean);
    if (lines.length === 0) return null;
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1, 11).map(line => {
      // Split basic CSV
      return line.split(',').map(cell => cell.replace(/^["']|["']$/g, ''));
    });
    return { headers, rows, totalRows: lines.length - 1 };
  }, [previewCsvContent]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Automatic CSV Report Generator
          </h2>
          <p className="text-xs text-slate-500">
            Generate enterprise UTF-8 CSV exports with RFC 4180 compliance and spreadsheet formula injection protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePreview}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview Data
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report Catalogue (10 required reports) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
            Select Report Type (10 Presets)
          </h3>

          <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
            {REPORT_DEFINITIONS.map(report => {
              const isSelected = selectedReportId === report.id;
              return (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setPreviewCsvContent(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold text-xs ${
                        isSelected ? 'text-blue-900' : 'text-slate-800'
                      }`}
                    >
                      {report.name}
                    </h4>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Filters & Parameters & Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Filter className="w-4 h-4 text-blue-600" />
              Report Parameters: {selectedReportDef.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Region
                </label>
                <select
                  value={regionFilter}
                  onChange={e => setRegionFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Regions</option>
                  <option value="Harare Central">Harare Central</option>
                  <option value="Harare South & Chitungwiza">Harare South & Chitungwiza</option>
                  <option value="Bulawayo Metro">Bulawayo Metro</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Sales Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="All">All Categories</option>
                  <option value="BA">Brand Ambassador (BA)</option>
                  <option value="OMI">OMI Merchant Specialist</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Sales Consultant / Team
                </label>
                <select
                  value={consultantFilter}
                  onChange={e => setConsultantFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleGeneratePreview}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                Refresh Preview
              </button>
              <button
                onClick={handleDownload}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Download CSV Now
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600" />
                Live CSV Data Preview (First 10 Rows)
              </h4>
              {parsedPreview && (
                <span className="text-[11px] font-mono text-slate-500">
                  Total Rows: {parsedPreview.totalRows}
                </span>
              )}
            </div>

            {parsedPreview ? (
              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px] border-collapse font-mono">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      {parsedPreview.headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {parsedPreview.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                Click "Preview Data" above to view records before downloading.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
