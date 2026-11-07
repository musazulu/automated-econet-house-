/**
 * BA Smart Attendance & Commission Management System
 * Core Data Models & Type Definitions
 */

export type UserRole = 'admin' | 'consultant' | 'operator';

export type SalesCategory = 'BA' | 'OMI' | 'Direct Sales Agent' | 'Kiosk Rep';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'sick'
  | 'activation'
  | 'business_duty'
  | 'leave'
  | 'public_holiday'
  | 'rest_day'
  | 'pending_review'
  | 'late';

export type ExceptionApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  region?: string;
  branch?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  avatarUrl?: string;
}

export interface BrandAmbassador {
  id: string; // internal UUID
  baId: string; // e.g. ECO-BA-1001
  fullName: string;
  phoneNumber: string; // e.g. +263 77 123 4567
  nationalId?: string; // e.g. 63-1234567-B-23
  category: SalesCategory;
  region: string;
  branch: string;
  salesConsultantId: string;
  salesConsultantName: string;
  dateRegistered: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  dailyCommissionRate: number; // e.g. $5.00
  dailyAttendanceCommissionRate: number; // e.g. $3.00
  photoUrl: string;
  qrToken: string; // revocable unguessable token
  qrRevoked: boolean;
  qrGeneratedAt: string;
}

export interface SalesConsultant {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  teamName: string;
  activeBaCount?: number;
}

export interface AttendanceHistoryEntry {
  timestamp: string;
  action: string;
  user: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  baId: string; // ECO-BA-XXXX
  baInternalId: string;
  baName: string;
  category: SalesCategory;
  region: string;
  branch: string;
  salesConsultantId: string;
  salesConsultantName: string;
  clockInTime: string | null; // e.g. "07:54:12"
  clockOutTime: string | null; // e.g. "17:02:40"
  totalHours: number;
  status: AttendanceStatus;
  source: 'qr_scan' | 'manual_entry';
  isCompleted: boolean;
  missingClockOut: boolean;
  isLate: boolean;
  exceptionType?: string;
  exceptionReason?: string;
  exceptionApprovalStatus?: ExceptionApprovalStatus;
  exceptionApprovedBy?: string;
  exceptionApprovedAt?: string;
  calculatedDailyCommission: number;
  calculatedAttendanceCommission: number;
  manualAdjustments: number;
  adjustmentReason?: string;
  totalEarned: number;
  notes?: string;
  history: AttendanceHistoryEntry[];
}

export type CommissionMethod = 'method_a' | 'method_b' | 'method_c';

export interface CommissionSettings {
  calculationMethod: CommissionMethod; // A: Daily, B: Attendance-based, C: Total
  currency: 'USD' | 'ZiG';
  defaultDailyRate: number;
  defaultAttendanceRate: number;
  reportingTimeCutoff: string; // "08:15"
  minimumHoursForFullDay: number; // 6
  exceptionRules: {
    sick: { eligible: boolean; commissionPercent: number };
    activation: { eligible: boolean; commissionPercent: number };
    business_duty: { eligible: boolean; commissionPercent: number };
    leave: { eligible: boolean; commissionPercent: number };
    public_holiday: { eligible: boolean; commissionPercent: number };
    rest_day: { eligible: boolean; commissionPercent: number };
    late: { eligible: boolean; commissionPercent: number };
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // Africa/Harare time
  actor: string;
  actorRole: UserRole;
  action:
    | 'CLOCK_IN'
    | 'CLOCK_OUT'
    | 'MANUAL_ATTENDANCE'
    | 'RECORD_CORRECTION'
    | 'EXCEPTION_FLAGGED'
    | 'EXCEPTION_APPROVED'
    | 'COMMISSION_ADJUSTMENT'
    | 'COMMISSION_RATE_UPDATE'
    | 'COMMISSION_RULE_CHANGED'
    | 'BA_REGISTERED'
    | 'BA_UPDATED'
    | 'QR_TOKEN_REVOKED'
    | 'REPORT_EXPORTED'
    | 'REPORT_SCHEDULED'
    | 'REPORT_DELIVERED';
  targetId: string;
  targetType: 'ATTENDANCE' | 'BA' | 'COMMISSION' | 'REPORT' | 'EXCEPTION';
  details: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface ReportSchedule {
  id: string;
  reportType:
    | 'daily_register'
    | 'clock_in_out'
    | 'exceptions'
    | 'ba_summary'
    | 'team_report'
    | 'daily_commission'
    | 'weekly_commission'
    | 'monthly_commission'
    | 'commission_audit'
    | 'missing_clockout';
  frequency: 'daily' | 'weekly' | 'monthly';
  deliveryTime: string; // "17:30"
  recipients: string[];
  regionFilter: string; // "All" or region
  salesCategoryFilter: string; // "All" or category
  includeDraft: boolean;
  deliveryMethod: 'email_attachment' | 'secure_link';
  status: 'active' | 'paused';
  lastRun?: string;
  nextRun?: string;
}

export interface DeliveryLog {
  id: string;
  scheduleId?: string;
  reportName: string;
  timestamp: string;
  recipients: string[];
  status: 'SENT' | 'PENDING' | 'FAILED' | 'SIMULATED';
  rowsCount: number;
  fileSize: string;
  details: string;
}

export interface BaCommissionSummary {
  baId: string;
  baName: string;
  category: SalesCategory;
  salesConsultantName: string;
  region: string;
  totalDays: number;
  eligibleDays: number;
  presentDays: number;
  approvedExceptionDays: number;
  dailyRate: number;
  attendanceRate: number;
  dailyCommission: number;
  attendanceCommission: number;
  adjustments: number;
  totalCommission: number;
  missingClockOuts: number;
}
