import React, { useState } from 'react';
import { UserRole, UserProfile } from './types';
import { INITIAL_USERS } from './data/initialData';
import { DataService } from './services/dataService';
import { getZimbabweTime, getZimbabweDate } from './utils/dateUtils';

// Components
import { AdminDashboard } from './components/AdminDashboard';
import { ConsultantDashboard } from './components/ConsultantDashboard';
import { AttendanceScanner } from './components/AttendanceScanner';
import { AttendanceRegister } from './components/AttendanceRegister';
import { BaManagement } from './components/BaManagement';
import { TeamsManagement } from './components/TeamsManagement';
import { CommissionManagement } from './components/CommissionManagement';
import { ReportModule } from './components/ReportModule';
import { ReportScheduling } from './components/ReportScheduling';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AcceptanceTestsRunner } from './components/AcceptanceTestsRunner';

// Icons
import {
  LayoutDashboard,
  QrCode,
  FileSpreadsheet,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Send,
  History,
  CheckCircle,
  RotateCcw,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Building,
  HelpCircle,
  Database,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]); // Default Admin: Tinashe Moyo
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);

  const [harareTime, setHarareTime] = React.useState<string>(getZimbabweTime());

  React.useEffect(() => {
    const timer = setInterval(() => setHarareTime(getZimbabweTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUserSwitch = (userId: string) => {
    const user = INITIAL_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      // If operator switches to tab not allowed, redirect to scanner
      if (user.role === 'operator' && activeTab !== 'scanner' && activeTab !== 'tests') {
        setActiveTab('scanner');
      }
    }
  };

  const handleResetDemoData = () => {
    if (confirm('Are you sure you want to restore the pristine Econet demonstration dataset? All recent test scans will be restored to initial sample records.')) {
      DataService.resetToSampleData();
      window.location.reload();
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'scanner',
      label: 'Scan Attendance',
      icon: QrCode,
      roles: ['admin', 'consultant', 'operator'],
      highlight: true,
    },
    {
      id: 'register',
      label: 'Attendance Register',
      icon: FileSpreadsheet,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'bas',
      label: 'BA Management',
      icon: Users,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'teams',
      label: 'Teams & Consultants',
      icon: Briefcase,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'commission',
      label: 'Commission Engine',
      icon: DollarSign,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'reports',
      label: 'CSV Reports',
      icon: FileText,
      roles: ['admin', 'consultant'],
    },
    {
      id: 'scheduling',
      label: 'Report Scheduling',
      icon: Send,
      roles: ['admin'],
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      roles: ['admin'],
    },
    {
      id: 'tests',
      label: 'Acceptance Tests (12/12)',
      icon: ShieldCheck,
      roles: ['admin', 'consultant', 'operator'],
      accent: true,
    },
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-base shadow-sm border border-blue-500/20">
                E
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                    ECONET WIRELESS
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold tracking-wider uppercase">
                    BA SYSTEM
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Smart Attendance & Commission Management
                </div>
              </div>
            </div>
          </div>

          {/* Center: Live Zimbabwe Harare CAT Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Harare, ZW (CAT):</span>
            <strong className="text-slate-900">{harareTime}</strong>
          </div>

          {/* Right: Role Switcher & Database Architecture Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchitectureModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="View Production Database Architecture & API guidelines"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Production Setup</span>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline ml-1">
                Active User:
              </span>
              <select
                value={currentUser.id}
                onChange={e => handleUserSwitch(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="USR-ADM-01">👑 Tinashe Moyo (Administrator)</option>
                <option value="USR-CON-01">💼 Chipo Mutasa (Sales Consultant - Harare Central)</option>
                <option value="USR-CON-02">💼 Farai Sithole (Sales Consultant - Chitungwiza)</option>
                <option value="USR-CON-03">💼 Nomalanga Ndlovu (Sales Consultant - Bulawayo)</option>
                <option value="USR-OPR-01">📱 Nyasha Chiweshe (Attendance Operator)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`lg:w-64 shrink-0 no-print transition-all ${
            mobileMenuOpen ? 'block fixed inset-0 z-50 bg-slate-900/60 p-4' : 'hidden lg:block'
          }`}
        >
          <div
            className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-1 ${
              mobileMenuOpen ? 'max-w-xs w-full bg-white h-auto max-h-[90vh] overflow-y-auto' : ''
            }`}
          >
            {mobileMenuOpen && (
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">Navigation Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Workforce Navigation
            </div>

            {allowedNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : item.highlight
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : item.accent
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-white'
                        : item.highlight
                        ? 'text-blue-600'
                        : item.accent
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-3 border-t border-slate-100 space-y-1">
              <button
                onClick={handleResetDemoData}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Restore sample demonstration dataset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Seed Data</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            currentUser.role === 'admin' ? (
              <AdminDashboard onNavigate={tab => setActiveTab(tab)} />
            ) : (
              <ConsultantDashboard
                consultantId={currentUser.assignedTeamId || 'CON-001'}
                consultantName={currentUser.name}
                currentUserName={currentUser.name}
                currentUserRole={currentUser.role}
              />
            )
          )}

          {/* TAB: QR ATTENDANCE SCANNER */}
          {activeTab === 'scanner' && (
            <AttendanceScanner
              actorName={currentUser.name}
              actorRole={currentUser.role}
              onRecordUpdated={() => {}}
            />
          )}

          {/* TAB: ATTENDANCE REGISTER */}
          {activeTab === 'register' && (
            <AttendanceRegister
              currentUserRole={currentUser.role}
              currentUserName={currentUser.name}
              assignedConsultantId={currentUser.assignedTeamId}
            />
          )}

          {/* TAB: BA MANAGEMENT */}
          {activeTab === 'bas' && (
            <BaManagement
              currentUserRole={currentUser.role}
              currentUserName={currentUser.name}
            />
          )}

          {/* TAB: TEAMS & CONSULTANTS */}
          {activeTab === 'teams' && <TeamsManagement />}

          {/* TAB: COMMISSION ENGINE */}
          {activeTab === 'commission' && (
            <CommissionManagement
              currentUserRole={currentUser.role}
              currentUserName={currentUser.name}
            />
          )}

          {/* TAB: CSV REPORTS */}
          {activeTab === 'reports' && (
            <ReportModule
              currentUserName={currentUser.name}
              currentUserRole={currentUser.role}
            />
          )}

          {/* TAB: REPORT SCHEDULING */}
          {activeTab === 'scheduling' && (
            <ReportScheduling currentUserName={currentUser.name} />
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'audit' && <AuditLogViewer />}

          {/* TAB: ACCEPTANCE TESTS */}
          {activeTab === 'tests' && (
            <AcceptanceTestsRunner onNavigateToRegister={() => setActiveTab('register')} />
          )}
        </main>
      </div>

      {/* Production Architecture & Database Setup Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-800 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Production Database & Backend Integration Guide
                </h3>
              </div>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600 max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <strong className="block mb-1 text-sm text-blue-950 font-bold">
                  Prototype vs Production Architecture
                </strong>
                This application has a clearly abstracted <code>DataService</code> layer. In prototype mode, state is stored in <code>localStorage</code> with rich seed records and atomic audit logging. For enterprise deployment at Econet, connect the service to a relational PostgreSQL database and Django REST Framework or FastAPI service.
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  1. Relational Database Schema Entities
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>users</code> (id, email, password_hash, role: admin/consultant/operator, is_active)</li>
                  <li><code>brand_ambassadors</code> (id, ba_id UNIQUE, full_name, phone_number, category, region_id, branch_id, consultant_id, daily_rate, att_rate, qr_token UNIQUE, qr_revoked)</li>
                  <li><code>attendance_records</code> (id, ba_id, date, clock_in_time, clock_out_time, total_hours, status, source, exception_type, exception_status, calculated_comm)</li>
                  <li><code>audit_logs</code> (id, timestamp, actor_id, action, target_type, target_id, old_value, new_value, reason)</li>
                  <li><code>report_schedules</code> (id, report_type, frequency, delivery_time, recipients_json, status)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  2. Required Environment Variables (.env)
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                  <div>DATABASE_URL="postgresql://econet_user:password@localhost:5432/econet_attendance"</div>
                  <div>TIMEZONE="Africa/Harare"</div>
                  <div>SMTP_HOST="smtp.mailgun.org"</div>
                  <div>SMTP_PORT="587"</div>
                  <div>SMTP_USER="postmaster@econet.co.zw"</div>
                  <div>SMTP_PASSWORD="[SECRET_KEY]"</div>
                  <div>JWT_SECRET="[SECRET_JWT_KEY]"</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  3. Production Security Checklist
                </h4>
                <p>
                  • Server-authoritative timestamps (never trust client device clock).<br />
                  • QR credentials encode non-sequential revocable cryptographic tokens.<br />
                  • Mandatory justification reason recorded for every attendance record manual correction.<br />
                  • CSV formula injection protection (automatic escaping of <code>=, +, -, @</code>).
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
