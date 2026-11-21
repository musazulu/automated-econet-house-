import {
  BrandAmbassador,
  SalesConsultant,
  AttendanceRecord,
  CommissionSettings,
  AuditLogEntry,
  ReportSchedule,
  DeliveryLog,
  UserProfile,
  AttendanceStatus,
  BaCommissionSummary,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CONSULTANTS,
  INITIAL_BAS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_COMMISSION_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCHEDULES,
  INITIAL_DELIVERY_LOGS,
} from '../data/initialData';
import {
  getZimbabweDate,
  getZimbabweTime,
  getZimbabweTimestamp,
  calculateHoursWorked,
  isTimeLate,
} from '../utils/dateUtils';
import { buildCsvString, downloadCsvFile } from '../utils/csvExport';
import { APIService } from './apiService';

const STORAGE_KEY = 'ECONET_BA_DATA_V1';
let useDatabaseAPI = false;

// Check if database is available on initialization
(async () => {
  try {
    useDatabaseAPI = await APIService.checkDatabaseConnection();
    if (useDatabaseAPI) {
      console.log('✅ Database connected - using API for data sync');
    } else {
      console.log('📦 Using localStorage fallback');
    }
  } catch (error) {
    console.log('📦 Database check failed - using localStorage fallback');
    useDatabaseAPI = false;
  }
})();

interface AppState {
  users: UserProfile[];
  consultants: SalesConsultant[];
  bas: BrandAmbassador[];
  attendanceRecords: AttendanceRecord[];
  commissionSettings: CommissionSettings;
  auditLogs: AuditLogEntry[];
  schedules: ReportSchedule[];
  deliveryLogs: DeliveryLog[];
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const savedState = JSON.parse(raw) as AppState;
      return {
        ...savedState,
        commissionSettings: {
          ...savedState.commissionSettings,
          reportingTimeCutoff: '08:00',
        },
      };
    }
  } catch (e) {
    console.error('Failed to load local state:', e);
  }
  return {
    users: INITIAL_USERS,
    consultants: INITIAL_CONSULTANTS,
    bas: INITIAL_BAS,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    commissionSettings: INITIAL_COMMISSION_SETTINGS,
    auditLogs: INITIAL_AUDIT_LOGS,
    schedules: INITIAL_SCHEDULES,
    deliveryLogs: INITIAL_DELIVERY_LOGS,
  };
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

let currentState: AppState = loadState();

export const DataService = {
  // Reset demo data to pristine state
  resetToSampleData(): void {
    currentState = {
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      consultants: JSON.parse(JSON.stringify(INITIAL_CONSULTANTS)),
      bas: JSON.parse(JSON.stringify(INITIAL_BAS)),
      attendanceRecords: JSON.parse(JSON.stringify(INITIAL_ATTENDANCE_RECORDS)),
      commissionSettings: JSON.parse(JSON.stringify(INITIAL_COMMISSION_SETTINGS)),
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      schedules: JSON.parse(JSON.stringify(INITIAL_SCHEDULES)),
      deliveryLogs: JSON.parse(JSON.stringify(INITIAL_DELIVERY_LOGS)),
    };
    saveState(currentState);
  },

  // USERS
  getUsers(): UserProfile[] {
    return currentState.users;
  },

  // CONSULTANTS
  getConsultants(): SalesConsultant[] {
    return currentState.consultants;
  },

  // BAS
  getBAs(): BrandAmbassador[] {
    // Fetch from API in background to update cache
    if (useDatabaseAPI) {
      APIService.fetchBAsFromAPI()
        .then(basFromAPI => {
          currentState.bas = basFromAPI;
          saveState(currentState);
        })
        .catch(err => console.error('Background BA sync failed:', err));
    }
    return currentState.bas;
  },

  // Force refresh from database
  async refreshBAsFromDatabase(): Promise<BrandAmbassador[]> {
    if (useDatabaseAPI) {
      try {
        const basFromAPI = await APIService.fetchBAsFromAPI();
        currentState.bas = basFromAPI;
        saveState(currentState);
        return basFromAPI;
      } catch (error) {
        console.error('Failed to refresh BAs from database:', error);
      }
    }
    return currentState.bas;
  },

  getBAById(baId: string): BrandAmbassador | undefined {
    return currentState.bas.find(b => b.baId === baId || b.id === baId);
  },

  getBAByQrToken(token: string): BrandAmbassador | undefined {
    return currentState.bas.find(b => b.qrToken === token);
  },

  async saveBA(ba: BrandAmbassador, actorName: string = 'System Admin'): Promise<BrandAmbassador> {
    const existingIndex = currentState.bas.findIndex(b => b.id === ba.id || b.baId === ba.baId);
    const isNew = existingIndex === -1;
    await APIService.saveBAToAPI(ba, isNew);
    if (isNew) {
      currentState.bas.unshift(ba);
      this.logAudit({
        actor: actorName,
        actorRole: 'admin',
        action: 'BA_REGISTERED',
        targetId: ba.baId,
        targetType: 'BA',
        details: `Registered new BA ${ba.fullName} (${ba.baId}) under ${ba.salesConsultantName}.`,
      });
    } else {
      currentState.bas[existingIndex] = ba;
      this.logAudit({
        actor: actorName,
        actorRole: 'admin',
        action: 'BA_UPDATED',
        targetId: ba.baId,
        targetType: 'BA',
        details: `Updated details for BA ${ba.fullName} (${ba.baId}).`,
      });
    }
    saveState(currentState);
    return ba;
  },

  async revokeAndRegenerateQrToken(baId: string, actorName: string = 'System Admin'): Promise<BrandAmbassador | null> {
    const ba = currentState.bas.find(b => b.baId === baId || b.id === baId);
    if (!ba) return null;

    const oldToken = ba.qrToken;
    const randPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timePart = Date.now().toString(36).toUpperCase();
    const updatedBa: BrandAmbassador = {
      ...ba,
      qrToken: `ECO_TOKEN_${randPart}_${timePart}`,
      qrRevoked: false,
      qrGeneratedAt: getZimbabweTimestamp(),
    };
    await APIService.saveBAToAPI(updatedBa, false);
    currentState.bas[currentState.bas.indexOf(ba)] = updatedBa;

    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'QR_TOKEN_REVOKED',
      targetId: updatedBa.baId,
      targetType: 'BA',
      details: `Revoked previous QR token and issued secure token for ${updatedBa.fullName}.`,
      oldValue: oldToken,
      newValue: updatedBa.qrToken,
      reason: 'Security key rotation or reported compromised badge.',
    });

    saveState(currentState);
    return updatedBa;
  },

  // ATTENDANCE
  getAttendanceRecords(): AttendanceRecord[] {
    // Fetch from API in background to update cache
    if (useDatabaseAPI) {
      APIService.fetchAttendanceFromAPI()
        .then(recordsFromAPI => {
          currentState.attendanceRecords = recordsFromAPI;
          saveState(currentState);
        })
        .catch(err => console.error('Background attendance sync failed:', err));
    }
    return currentState.attendanceRecords;
  },

  // Force refresh from database
  async refreshAttendanceFromDatabase(): Promise<AttendanceRecord[]> {
    if (useDatabaseAPI) {
      try {
        const recordsFromAPI = await APIService.fetchAttendanceFromAPI();
        currentState.attendanceRecords = recordsFromAPI;
        saveState(currentState);
        return recordsFromAPI;
      } catch (error) {
        console.error('Failed to refresh attendance from database:', error);
      }
    }
    return currentState.attendanceRecords;
  },

  getAttendanceRecordById(id: string): AttendanceRecord | undefined {
    return currentState.attendanceRecords.find(r => r.id === id);
  },

  // COMMISSION CALCULATION CORE ENGINE
  calculateCommissionForRecord(
    record: AttendanceRecord,
    settings: CommissionSettings = currentState.commissionSettings,
    ba?: BrandAmbassador
  ): { daily: number; attendance: number; total: number } {
    const baObj = ba || currentState.bas.find(b => b.baId === record.baId || b.id === record.baInternalId);
    const dailyRate = baObj ? baObj.dailyCommissionRate : settings.defaultDailyRate; // $13.50

    // NEW SIMPLE LOGIC:
    // - Present or Late = $13.50
    // - Sick/Activation (approved by team leader) = $13.50
    // - Absent or pending exceptions = $0

    let isEligible = false;

    if (record.status === 'present' || record.status === 'late') {
      // Present or late = eligible for full commission
      isEligible = true;
    } else if (
      record.status === 'sick' ||
      record.status === 'activation' ||
      record.status === 'business_duty' ||
      record.status === 'public_holiday'
    ) {
      // Exceptions ONLY count if approved by team leader (consultant)
      if (record.exceptionApprovalStatus === 'approved') {
        const ruleKey = record.status as keyof typeof settings.exceptionRules;
        const rule = settings.exceptionRules[ruleKey];
        isEligible = rule && rule.eligible;
      } else {
        // Pending or no approval = NOT eligible = $0
        isEligible = false;
      }
    } else {
      // Absent, leave, rest_day, pending_review = $0
      isEligible = false;
    }

    // Simple calculation: If eligible, get daily rate. If not, get $0
    const dailyCommission = isEligible ? dailyRate : 0;
    const total = dailyCommission + (record.manualAdjustments || 0);

    return {
      daily: Math.round(dailyCommission * 100) / 100,
      attendance: 0, // Not used anymore
      total: Math.round(total * 100) / 100,
    };
  },

  // QR ATTENDANCE SCAN LOGIC
  processQrScan(
    qrToken: string,
    actorName: string = 'Scan Operator',
    actorRole: 'admin' | 'consultant' | 'operator' = 'operator',
    signatureDataUrl?: string
  ): {
    success: boolean;
    actionTaken: 'CLOCK_IN' | 'CLOCK_OUT' | 'ALREADY_COMPLETED' | 'DUPLICATE_SCAN' | 'REVOKED' | 'INVALID';
    message: string;
    record?: AttendanceRecord;
    ba?: BrandAmbassador;
  } {
    const ba = this.getBAByQrToken(qrToken);

    if (!ba) {
      return {
        success: false,
        actionTaken: 'INVALID',
        message: 'Invalid or unknown BA Identification card. QR token not recognized in system.',
      };
    }

    if (ba.qrRevoked) {
      return {
        success: false,
        actionTaken: 'REVOKED',
        message: `Card for ${ba.fullName} (${ba.baId}) was revoked for security. Please issue a replacement card.`,
        ba,
      };
    }

    if (ba.status === 'inactive') {
      return {
        success: false,
        actionTaken: 'INVALID',
        message: `BA ${ba.fullName} (${ba.baId}) is currently marked inactive in the system.`,
        ba,
      };
    }

    const todayDate = getZimbabweDate();
    const currentTime = getZimbabweTime();
    const currentTimestamp = getZimbabweTimestamp();

    // Check if record exists for today
    let record = currentState.attendanceRecords.find(
      r => r.baId === ba.baId && r.date === todayDate
    );

    // Scenario 1: No record today -> CLOCK IN
    if (!record) {
      const isLate = isTimeLate(currentTime, currentState.commissionSettings.reportingTimeCutoff);
      const status: AttendanceStatus = isLate ? 'late' : 'present';

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: todayDate,
        baId: ba.baId,
        baInternalId: ba.id,
        baName: ba.fullName,
        category: ba.category,
        region: ba.region,
        branch: ba.branch,
        salesConsultantId: ba.salesConsultantId,
        salesConsultantName: ba.salesConsultantName,
        clockInTime: currentTime,
        clockOutTime: null,
        totalHours: 0,
        status,
        source: 'qr_scan',
        isCompleted: false,
        missingClockOut: false,
        isLate,
        signatureDataUrl: signatureDataUrl || undefined,
        calculatedDailyCommission: 0,
        calculatedAttendanceCommission: 0,
        manualAdjustments: 0,
        totalEarned: 0,
        notes: isLate ? `Clocked in after cutoff ${currentState.commissionSettings.reportingTimeCutoff}` : undefined,
        history: [
          {
            timestamp: currentTimestamp,
            action: `Clocked In via QR Scan (${status.toUpperCase()})`,
            user: actorName,
          },
        ],
      };

      // Calculate initial projected commission
      const comm = this.calculateCommissionForRecord(newRecord, currentState.commissionSettings, ba);
      newRecord.calculatedDailyCommission = comm.daily;
      newRecord.calculatedAttendanceCommission = comm.attendance;
      newRecord.totalEarned = comm.total;

      currentState.attendanceRecords.unshift(newRecord);

      // Save to database API if available
      if (useDatabaseAPI) {
        APIService.createAttendanceRecordAPI(newRecord).catch(err => {
          console.error('Failed to save attendance to database:', err);
        });
      }

      this.logAudit({
        actor: actorName,
        actorRole,
        action: 'CLOCK_IN',
        targetId: newRecord.id,
        targetType: 'ATTENDANCE',
        details: `${ba.fullName} (${ba.baId}) clocked in at ${currentTime} at ${ba.branch}. Status: ${status.toUpperCase()}.`,
      });

      saveState(currentState);

      return {
        success: true,
        actionTaken: 'CLOCK_IN',
        message: `Successfully clocked in ${ba.fullName} at ${currentTime} CAT. ${isLate ? '(Flagged: Late arrival)' : '(On time)'}`,
        record: newRecord,
        ba,
      };
    }

    // Scenario 2: Record exists, has clock-in, but no clock-out -> CLOCK OUT
    if (record.clockInTime && !record.clockOutTime) {
      // Check debounce duplicate scan (within 15 seconds)
      const [hIn, mIn, sIn = 0] = record.clockInTime.split(':').map(Number);
      const [hNow, mNow, sNow = 0] = currentTime.split(':').map(Number);
      const diffSecs = (hNow * 3600 + mNow * 60 + sNow) - (hIn * 3600 + mIn * 60 + sIn);

      if (diffSecs < 15 && diffSecs >= 0) {
        return {
          success: false,
          actionTaken: 'DUPLICATE_SCAN',
          message: `${ba.fullName} just clocked in ${diffSecs}s ago. Duplicate scan ignored.`,
          record,
          ba,
        };
      }

      // Record clock-out!
      record.clockOutTime = currentTime;
      record.totalHours = calculateHoursWorked(record.clockInTime, currentTime);
      record.isCompleted = true;
      record.missingClockOut = false;

      // Recalculate commission
      const comm = this.calculateCommissionForRecord(record, currentState.commissionSettings, ba);
      record.calculatedDailyCommission = comm.daily;
      record.calculatedAttendanceCommission = comm.attendance;
      record.totalEarned = comm.total;

      record.history.push({
        timestamp: currentTimestamp,
        action: `Clocked Out via QR Scan (${record.totalHours} hrs worked)`,
        user: actorName,
      });

      // Save to database API if available
      if (useDatabaseAPI) {
        APIService.updateAttendanceRecordAPI(record).catch(err => {
          console.error('Failed to update attendance in database:', err);
        });
      }

      this.logAudit({
        actor: actorName,
        actorRole,
        action: 'CLOCK_OUT',
        targetId: record.id,
        targetType: 'ATTENDANCE',
        details: `${ba.fullName} (${ba.baId}) clocked out at ${currentTime}. Total hours: ${record.totalHours} hrs.`,
      });

      saveState(currentState);

      return {
        success: true,
        actionTaken: 'CLOCK_OUT',
        message: `Successfully clocked out ${ba.fullName} at ${currentTime} CAT. Shift completed (${record.totalHours} hrs).`,
        record,
        ba,
      };
    }

    // Scenario 3: Record already completed for today
    if (record.clockInTime && record.clockOutTime) {
      return {
        success: false,
        actionTaken: 'ALREADY_COMPLETED',
        message: `${ba.fullName} already clocked in (${record.clockInTime}) and clocked out (${record.clockOutTime}) today. Session already completed.`,
        record,
        ba,
      };
    }

    // Scenario 4: Record exists but has no clock-in (corrupted data) -> Delete and allow re-clock-in
    // This handles the bug where null times exist
    const recordIndex = currentState.attendanceRecords.findIndex(r => r.id === record.id);
    if (recordIndex !== -1) {
      currentState.attendanceRecords.splice(recordIndex, 1);
    }

    // Now treat as new clock-in
    const isLate = isTimeLate(currentTime, currentState.commissionSettings.reportingTimeCutoff);
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: todayDate,
      baId: ba.baId,
      baInternalId: ba.id,
      baName: ba.fullName,
      category: ba.category,
      region: ba.region,
      branch: ba.branch,
      salesConsultantId: ba.salesConsultantId,
      salesConsultantName: ba.salesConsultantName,
      clockInTime: currentTime,
      clockOutTime: null,
      totalHours: 0,
      status,
      source: 'qr_scan',
      isCompleted: false,
      missingClockOut: false,
      isLate,
      signatureDataUrl: signatureDataUrl || undefined,
      calculatedDailyCommission: 0,
      calculatedAttendanceCommission: 0,
      manualAdjustments: 0,
      totalEarned: 0,
      notes: isLate ? `Clocked in after cutoff ${currentState.commissionSettings.reportingTimeCutoff}` : undefined,
      history: [
        {
          timestamp: currentTimestamp,
          action: `Clocked In via QR Scan (${status.toUpperCase()}) - Replaced corrupted record`,
          user: actorName,
        },
      ],
    };

    // Calculate initial projected commission
    const comm = this.calculateCommissionForRecord(newRecord, currentState.commissionSettings, ba);
    newRecord.calculatedDailyCommission = comm.daily;
    newRecord.calculatedAttendanceCommission = comm.attendance;
    newRecord.totalEarned = comm.total;

    currentState.attendanceRecords.unshift(newRecord);

    // Save to database API if available
    if (useDatabaseAPI) {
      APIService.createAttendanceRecordAPI(newRecord).catch(err => {
        console.error('Failed to save attendance to database:', err);
      });
    }

    this.logAudit({
      actor: actorName,
      actorRole,
      action: 'CLOCK_IN',
      targetId: newRecord.id,
      targetType: 'ATTENDANCE',
      details: `${ba.fullName} (${ba.baId}) clocked in at ${currentTime} at ${ba.branch}. Status: ${status.toUpperCase()}. (Replaced corrupted record)`,
    });

    saveState(currentState);

    return {
      success: true,
      actionTaken: 'CLOCK_IN',
      message: `Successfully clocked in ${ba.fullName} at ${currentTime} CAT. ${isLate ? '(Flagged: Late arrival)' : '(On time)'}`,
      record: newRecord,
      ba,
    };
  },

  // MANUAL ATTENDANCE ENTRY (For lost card, camera failure, etc.)
  createManualAttendanceRecord(
    baId: string,
    date: string,
    clockIn: string | null,
    clockOut: string | null,
    status: AttendanceStatus,
    reason: string,
    actorName: string,
    actorRole: 'admin' | 'consultant' = 'admin'
  ): AttendanceRecord {
    const ba = this.getBAById(baId);
    if (!ba) throw new Error('BA not found');

    const totalHours = calculateHoursWorked(clockIn, clockOut);
    const isCompleted = Boolean(clockIn && clockOut);

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date,
      baId: ba.baId,
      baInternalId: ba.id,
      baName: ba.fullName,
      category: ba.category,
      region: ba.region,
      branch: ba.branch,
      salesConsultantId: ba.salesConsultantId,
      salesConsultantName: ba.salesConsultantName,
      clockInTime: clockIn,
      clockOutTime: clockOut,
      totalHours,
      status,
      source: 'manual_entry',
      isCompleted,
      missingClockOut: Boolean(clockIn && !clockOut),
      isLate: isTimeLate(clockIn, currentState.commissionSettings.reportingTimeCutoff),
      notes: reason,
      calculatedDailyCommission: 0,
      calculatedAttendanceCommission: 0,
      manualAdjustments: 0,
      totalEarned: 0,
      history: [
        {
          timestamp: getZimbabweTimestamp(),
          action: `Manual attendance recorded by ${actorName}`,
          user: actorName,
          note: reason,
        },
      ],
    };

    const comm = this.calculateCommissionForRecord(record, currentState.commissionSettings, ba);
    record.calculatedDailyCommission = comm.daily;
    record.calculatedAttendanceCommission = comm.attendance;
    record.totalEarned = comm.total;

    currentState.attendanceRecords.unshift(record);

    this.logAudit({
      actor: actorName,
      actorRole,
      action: 'MANUAL_ATTENDANCE',
      targetId: record.id,
      targetType: 'ATTENDANCE',
      details: `Manual attendance recorded for ${ba.fullName} on ${date}. Status: ${status}.`,
      reason,
    });

    saveState(currentState);
    return record;
  },

  // RECORD CORRECTION WITH MANDATORY REASON
  correctAttendanceRecord(
    recordId: string,
    updates: Partial<AttendanceRecord>,
    reason: string,
    actorName: string,
    actorRole: 'admin' | 'consultant' = 'admin'
  ): AttendanceRecord {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed reason is mandatory for all attendance corrections.');
    }

    const index = currentState.attendanceRecords.findIndex(r => r.id === recordId);
    if (index === -1) throw new Error('Record not found');

    const oldRecord = currentState.attendanceRecords[index];
    const previousSnapshot = `Status: ${oldRecord.status}, In: ${oldRecord.clockInTime}, Out: ${oldRecord.clockOutTime}, Commission: $${oldRecord.totalEarned}`;

    const updatedRecord: AttendanceRecord = {
      ...oldRecord,
      ...updates,
      history: [
        ...oldRecord.history,
        {
          timestamp: getZimbabweTimestamp(),
          action: `Record corrected by ${actorName}: ${reason}`,
          user: actorName,
          note: reason,
        },
      ],
    };

    // Recompute hours if clock times changed
    if (updates.clockInTime !== undefined || updates.clockOutTime !== undefined) {
      updatedRecord.totalHours = calculateHoursWorked(updatedRecord.clockInTime, updatedRecord.clockOutTime);
      updatedRecord.isCompleted = Boolean(updatedRecord.clockInTime && updatedRecord.clockOutTime);
      updatedRecord.missingClockOut = Boolean(updatedRecord.clockInTime && !updatedRecord.clockOutTime);
    }

    // Recompute commission
    const comm = this.calculateCommissionForRecord(updatedRecord, currentState.commissionSettings);
    updatedRecord.calculatedDailyCommission = comm.daily;
    updatedRecord.calculatedAttendanceCommission = comm.attendance;
    updatedRecord.totalEarned = comm.total;

    currentState.attendanceRecords[index] = updatedRecord;

    this.logAudit({
      actor: actorName,
      actorRole,
      action: 'RECORD_CORRECTION',
      targetId: recordId,
      targetType: 'ATTENDANCE',
      details: `Corrected attendance for ${updatedRecord.baName} on ${updatedRecord.date}.`,
      oldValue: previousSnapshot,
      newValue: `Status: ${updatedRecord.status}, In: ${updatedRecord.clockInTime}, Out: ${updatedRecord.clockOutTime}, Commission: $${updatedRecord.totalEarned}`,
      reason,
    });

    saveState(currentState);
    return updatedRecord;
  },

  // EXCEPTION RECORDING & APPROVAL
  flagException(
    baId: string,
    date: string,
    exceptionType: string,
    reason: string,
    status: AttendanceStatus,
    actorName: string,
    actorRole: 'admin' | 'consultant'
  ): AttendanceRecord {
    const ba = this.getBAById(baId);
    if (!ba) throw new Error('BA not found');

    // Check if an existing record exists for this date
    let existingIndex = currentState.attendanceRecords.findIndex(
      r => r.baId === ba.baId && r.date === date
    );

    const isAutoApproved = actorRole === 'admin'; // Admin flags are auto-approved, consultant flags are pending review
    const approvalStatus: 'approved' | 'pending' = isAutoApproved ? 'approved' : 'pending';

    let record: AttendanceRecord;

    if (existingIndex !== -1) {
      record = currentState.attendanceRecords[existingIndex];
      record.status = status;
      record.exceptionType = exceptionType;
      record.exceptionReason = reason;
      record.exceptionApprovalStatus = approvalStatus;
      if (isAutoApproved) {
        record.exceptionApprovedBy = actorName;
        record.exceptionApprovedAt = getZimbabweTimestamp();
      }
      record.history.push({
        timestamp: getZimbabweTimestamp(),
        action: `Exception flagged: ${exceptionType} (${approvalStatus})`,
        user: actorName,
        note: reason,
      });
    } else {
      record = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date,
        baId: ba.baId,
        baInternalId: ba.id,
        baName: ba.fullName,
        category: ba.category,
        region: ba.region,
        branch: ba.branch,
        salesConsultantId: ba.salesConsultantId,
        salesConsultantName: ba.salesConsultantName,
        clockInTime: null,
        clockOutTime: null,
        totalHours: 0,
        status,
        source: 'manual_entry',
        isCompleted: true,
        missingClockOut: false,
        isLate: false,
        exceptionType,
        exceptionReason: reason,
        exceptionApprovalStatus: approvalStatus,
        exceptionApprovedBy: isAutoApproved ? actorName : undefined,
        exceptionApprovedAt: isAutoApproved ? getZimbabweTimestamp() : undefined,
        calculatedDailyCommission: 0,
        calculatedAttendanceCommission: 0,
        manualAdjustments: 0,
        totalEarned: 0,
        history: [
          {
            timestamp: getZimbabweTimestamp(),
            action: `Exception flagged: ${exceptionType} (${approvalStatus}) by ${actorName}`,
            user: actorName,
            note: reason,
          },
        ],
      };
      currentState.attendanceRecords.unshift(record);
    }

    const comm = this.calculateCommissionForRecord(record, currentState.commissionSettings, ba);
    record.calculatedDailyCommission = comm.daily;
    record.calculatedAttendanceCommission = comm.attendance;
    record.totalEarned = comm.total;

    this.logAudit({
      actor: actorName,
      actorRole,
      action: isAutoApproved ? 'EXCEPTION_APPROVED' : 'EXCEPTION_FLAGGED',
      targetId: record.id,
      targetType: 'EXCEPTION',
      details: `Exception ${exceptionType} (${approvalStatus}) recorded for ${ba.fullName} on ${date}.`,
      reason,
    });

    saveState(currentState);
    return record;
  },

  approveException(recordId: string, adminName: string): AttendanceRecord {
    const record = currentState.attendanceRecords.find(r => r.id === recordId);
    if (!record) throw new Error('Record not found');

    record.exceptionApprovalStatus = 'approved';
    record.exceptionApprovedBy = adminName;
    record.exceptionApprovedAt = getZimbabweTimestamp();

    record.history.push({
      timestamp: getZimbabweTimestamp(),
      action: `Exception approved by ${adminName}`,
      user: adminName,
    });

    const comm = this.calculateCommissionForRecord(record, currentState.commissionSettings);
    record.calculatedDailyCommission = comm.daily;
    record.calculatedAttendanceCommission = comm.attendance;
    record.totalEarned = comm.total;

    this.logAudit({
      actor: adminName,
      actorRole: 'admin',
      action: 'EXCEPTION_APPROVED',
      targetId: record.id,
      targetType: 'EXCEPTION',
      details: `Admin ${adminName} approved ${record.exceptionType} for ${record.baName} on ${record.date}.`,
    });

    saveState(currentState);
    return record;
  },

  // MANUAL COMMISSION ADJUSTMENT
  adjustCommission(
    recordId: string,
    adjustmentAmount: number,
    reason: string,
    actorName: string
  ): AttendanceRecord {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed reason is required for commission adjustments.');
    }

    const record = currentState.attendanceRecords.find(r => r.id === recordId);
    if (!record) throw new Error('Record not found');

    const oldTotal = record.totalEarned;
    record.manualAdjustments = adjustmentAmount;
    record.adjustmentReason = reason;

    const comm = this.calculateCommissionForRecord(record, currentState.commissionSettings);
    record.calculatedDailyCommission = comm.daily;
    record.calculatedAttendanceCommission = comm.attendance;
    record.totalEarned = comm.total;

    record.history.push({
      timestamp: getZimbabweTimestamp(),
      action: `Commission adjusted by $${adjustmentAmount.toFixed(2)} (${reason})`,
      user: actorName,
      note: reason,
    });

    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'COMMISSION_ADJUSTMENT',
      targetId: record.id,
      targetType: 'COMMISSION',
      details: `Adjusted commission for ${record.baName} on ${record.date} by $${adjustmentAmount.toFixed(2)}.`,
      oldValue: `$${oldTotal.toFixed(2)}`,
      newValue: `$${record.totalEarned.toFixed(2)}`,
      reason,
    });

    saveState(currentState);
    return record;
  },

  // COMMISSION SETTINGS
  getCommissionSettings(): CommissionSettings {
    return currentState.commissionSettings;
  },

  updateCommissionSettings(settings: CommissionSettings, actorName: string): void {
    const oldMethod = currentState.commissionSettings.calculationMethod;
    currentState.commissionSettings = settings;

    // Recalculate all records in current state
    currentState.attendanceRecords.forEach(r => {
      const comm = this.calculateCommissionForRecord(r, settings);
      r.calculatedDailyCommission = comm.daily;
      r.calculatedAttendanceCommission = comm.attendance;
      r.totalEarned = comm.total;
    });

    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'COMMISSION_RULE_CHANGED',
      targetId: 'COMMISSION_SETTINGS',
      targetType: 'COMMISSION',
      details: `Updated commission engine settings. Method: ${settings.calculationMethod}. Rates: Daily $${settings.defaultDailyRate}, Attendance $${settings.defaultAttendanceRate}.`,
      oldValue: `Method ${oldMethod}`,
      newValue: `Method ${settings.calculationMethod}`,
    });

    saveState(currentState);
  },

  // SUMMARIES
  getBaCommissionSummaries(startDate?: string, endDate?: string, consultantId?: string): BaCommissionSummary[] {
    const bas = consultantId
      ? currentState.bas.filter(b => b.salesConsultantId === consultantId)
      : currentState.bas;

    return bas.map(ba => {
      let records = currentState.attendanceRecords.filter(r => r.baId === ba.baId);

      if (startDate) {
        records = records.filter(r => r.date >= startDate);
      }
      if (endDate) {
        records = records.filter(r => r.date <= endDate);
      }

      // Count distinct calendar dates
      const distinctDates = Array.from(new Set(records.map(r => r.date)));
      let presentDays = 0;
      let approvedExceptionDays = 0;
      let eligibleDays = 0;
      let dailyCommissionTotal = 0;
      let attendanceCommissionTotal = 0;
      let adjustmentsTotal = 0;
      let totalCommission = 0;
      let missingClockOuts = 0;

      records.forEach(r => {
        if (r.status === 'present' || r.status === 'late') {
          presentDays++;
          eligibleDays++;
        } else if (r.exceptionApprovalStatus === 'approved') {
          approvedExceptionDays++;
          const ruleKey = r.status as keyof typeof currentState.commissionSettings.exceptionRules;
          const rule = currentState.commissionSettings.exceptionRules[ruleKey];
          if (rule && rule.eligible) {
            eligibleDays += (rule.commissionPercent / 100);
          }
        }

        if (r.missingClockOut) {
          missingClockOuts++;
        }

        dailyCommissionTotal += r.calculatedDailyCommission;
        attendanceCommissionTotal += r.calculatedAttendanceCommission;
        adjustmentsTotal += r.manualAdjustments;
        totalCommission += r.totalEarned;
      });

      return {
        baId: ba.baId,
        baName: ba.fullName,
        category: ba.category,
        salesConsultantName: ba.salesConsultantName,
        region: ba.region,
        totalDays: distinctDates.length,
        eligibleDays: Math.round(eligibleDays * 100) / 100,
        presentDays,
        approvedExceptionDays,
        dailyRate: ba.dailyCommissionRate,
        attendanceRate: ba.dailyAttendanceCommissionRate,
        dailyCommission: Math.round(dailyCommissionTotal * 100) / 100,
        attendanceCommission: Math.round(attendanceCommissionTotal * 100) / 100,
        adjustments: Math.round(adjustmentsTotal * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        missingClockOuts,
      };
    });
  },

  // AUDIT LOGS
  getAuditLogs(): AuditLogEntry[] {
    return currentState.auditLogs;
  },

  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: getZimbabweTimestamp(),
      ...entry,
    };
    currentState.auditLogs.unshift(newEntry);
    saveState(currentState);
  },

  // SCHEDULES & DELIVERY
  getSchedules(): ReportSchedule[] {
    return currentState.schedules;
  },

  getDeliveryLogs(): DeliveryLog[] {
    return currentState.deliveryLogs;
  },

  saveSchedule(schedule: ReportSchedule, actorName: string): void {
    const idx = currentState.schedules.findIndex(s => s.id === schedule.id);
    if (idx === -1) {
      currentState.schedules.push(schedule);
    } else {
      currentState.schedules[idx] = schedule;
    }
    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'REPORT_SCHEDULED',
      targetId: schedule.id,
      targetType: 'REPORT',
      details: `Saved report schedule for ${schedule.reportType} (${schedule.frequency} at ${schedule.deliveryTime}).`,
    });
    saveState(currentState);
  },

  // RUN SCHEDULE OR IMMEDIATE REPORT DELIVERY (Simulated in prototype with complete details)
  triggerReportDelivery(scheduleId: string, actorName: string): DeliveryLog {
    const schedule = currentState.schedules.find(s => s.id === scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const csvData = this.generateReportCsv(schedule.reportType, {
      region: schedule.regionFilter,
      category: schedule.salesCategoryFilter,
    });

    const lines = csvData.split('\r\n').length - 1;
    const log: DeliveryLog = {
      id: `del-${Date.now()}`,
      scheduleId: schedule.id,
      reportName: `${schedule.reportType.toUpperCase()} Report (${schedule.frequency})`,
      timestamp: getZimbabweTimestamp(),
      recipients: schedule.recipients,
      status: 'SIMULATED',
      rowsCount: lines,
      fileSize: `${(csvData.length / 1024).toFixed(1)} KB`,
      details: `Simulated scheduled delivery generated valid UTF-8 CSV with RFC 4180 escaping and dispatched to ${schedule.recipients.join(', ')}.`,
    };

    schedule.lastRun = getZimbabweTimestamp();
    currentState.deliveryLogs.unshift(log);

    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'REPORT_DELIVERED',
      targetId: log.id,
      targetType: 'REPORT',
      details: `Dispatched scheduled report ${log.reportName} to ${schedule.recipients.join(', ')}.`,
    });

    saveState(currentState);
    return log;
  },

  // GENERATE CSV DATA
  generateReportCsv(
    reportType: string,
    filters: {
      startDate?: string;
      endDate?: string;
      region?: string;
      consultantId?: string;
      category?: string;
    } = {}
  ): string {
    let records = [...currentState.attendanceRecords];

    if (filters.startDate) records = records.filter(r => r.date >= filters.startDate!);
    if (filters.endDate) records = records.filter(r => r.date <= filters.endDate!);
    if (filters.region && filters.region !== 'All') records = records.filter(r => r.region === filters.region);
    if (filters.consultantId && filters.consultantId !== 'All') records = records.filter(r => r.salesConsultantId === filters.consultantId);
    if (filters.category && filters.category !== 'All') records = records.filter(r => r.category === filters.category);

    if (reportType === 'daily_commission' || reportType === 'weekly_commission' || reportType === 'monthly_commission') {
      const summaries = this.getBaCommissionSummaries(filters.startDate, filters.endDate, filters.consultantId);
      const headers = [
        { key: 'baId', label: 'BA ID' },
        { key: 'baName', label: 'BA Full Name' },
        { key: 'category', label: 'Sales Category' },
        { key: 'salesConsultantName', label: 'Sales Consultant' },
        { key: 'region', label: 'Region' },
        { key: 'totalDays', label: 'Total Calendar Days' },
        { key: 'eligibleDays', label: 'Eligible Attendance Days' },
        { key: 'dailyRate', label: 'Daily Sales Rate ($)' },
        { key: 'attendanceRate', label: 'Daily Attendance Rate ($)' },
        { key: 'dailyCommission', label: 'Daily Sales Commission ($)' },
        { key: 'attendanceCommission', label: 'Attendance Commission ($)' },
        { key: 'adjustments', label: 'Approved Adjustments ($)' },
        { key: 'totalCommission', label: 'Total Net Commission ($)' },
      ];
      return buildCsvString(headers, summaries as unknown as Record<string, unknown>[]);
    }

    if (reportType === 'missing_clockout') {
      const missing = records.filter(r => r.missingClockOut);
      const headers = [
        { key: 'date', label: 'Date' },
        { key: 'baId', label: 'BA ID' },
        { key: 'baName', label: 'BA Name' },
        { key: 'branch', label: 'Assigned Branch' },
        { key: 'salesConsultantName', label: 'Sales Consultant' },
        { key: 'clockInTime', label: 'Clock In Time' },
        { key: 'clockOutTime', label: 'Clock Out Time' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'System Notes' },
      ];
      return buildCsvString(headers, missing as unknown as Record<string, unknown>[]);
    }

    if (reportType === 'exceptions') {
      const exceptions = records.filter(r => r.exceptionType);
      const headers = [
        { key: 'date', label: 'Date' },
        { key: 'baId', label: 'BA ID' },
        { key: 'baName', label: 'BA Name' },
        { key: 'status', label: 'Attendance Status' },
        { key: 'exceptionType', label: 'Exception Category' },
        { key: 'exceptionReason', label: 'Supporting Reason' },
        { key: 'exceptionApprovalStatus', label: 'Approval Status' },
        { key: 'exceptionApprovedBy', label: 'Approved By' },
        { key: 'exceptionApprovedAt', label: 'Approved At (CAT)' },
      ];
      return buildCsvString(headers, exceptions as unknown as Record<string, unknown>[]);
    }

    // Default: Daily Attendance Register
    const headers = [
      { key: 'date', label: 'Date' },
      { key: 'baId', label: 'BA ID' },
      { key: 'baName', label: 'BA Full Name' },
      { key: 'category', label: 'Category' },
      { key: 'region', label: 'Region' },
      { key: 'branch', label: 'Branch / Workplace' },
      { key: 'salesConsultantName', label: 'Sales Consultant' },
      { key: 'status', label: 'Attendance Status' },
      { key: 'clockInTime', label: 'Clock In' },
      { key: 'clockOutTime', label: 'Clock Out' },
      { key: 'totalHours', label: 'Hours Worked' },
      { key: 'source', label: 'Source' },
      { key: 'exceptionType', label: 'Exception Type' },
      { key: 'exceptionApprovalStatus', label: 'Approval Status' },
      { key: 'calculatedDailyCommission', label: 'Daily Commission ($)' },
      { key: 'calculatedAttendanceCommission', label: 'Attendance Commission ($)' },
      { key: 'manualAdjustments', label: 'Adjustments ($)' },
      { key: 'totalEarned', label: 'Total Commission ($)' },
    ];

    return buildCsvString(headers, records as unknown as Record<string, unknown>[]);
  },

  // DOWNLOAD CSV
  downloadReport(reportType: string, filename: string, filters?: Record<string, string | undefined>, actorName: string = 'User'): void {
    const csv = this.generateReportCsv(reportType, filters);
    downloadCsvFile(filename, csv);
    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'REPORT_EXPORTED',
      targetId: reportType,
      targetType: 'REPORT',
      details: `Exported CSV report ${filename} (${csv.length} bytes).`,
    });
  },

  // DOWNLOAD ATTENDANCE REGISTER WITH SIGNATURES AS HTML
  downloadAttendanceRegisterWithSignatures(
    dateFilter?: string,
    regionFilter?: string,
    consultantFilter?: string,
    actorName: string = 'Admin'
  ): void {
    const date = dateFilter || getZimbabweDate();
    const allBAs = this.getBAs();
    const attendanceRecords = currentState.attendanceRecords.filter(r => {
      if (r.date !== date) return false;
      if (regionFilter && regionFilter !== 'All' && r.region !== regionFilter) return false;
      if (consultantFilter && consultantFilter !== 'All' && r.salesConsultantId !== consultantFilter) return false;
      return true;
    });

    // Create a map of BA attendance
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => {
      attendanceMap.set(r.baId, r);
    });

    // Get all BAs that should be on this register (filtered by region/consultant)
    const relevantBAs = allBAs.filter(ba => {
      if (ba.status !== 'active') return false;
      if (regionFilter && regionFilter !== 'All' && ba.region !== regionFilter) return false;
      if (consultantFilter && consultantFilter !== 'All' && ba.salesConsultantId !== consultantFilter) return false;
      return true;
    });

    // Build HTML document
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Econet Wireless - Attendance Register ${date}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
    }
    .header h1 {
      color: #2563eb;
      margin: 5px 0;
      font-size: 24px;
    }
    .header p {
      margin: 3px 0;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #2563eb;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: bold;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .signature-cell {
      width: 150px;
      text-align: center;
    }
    .signature-img {
      max-width: 140px;
      max-height: 60px;
      border: 1px solid #cbd5e1;
      background: white;
    }
    .status-present {
      color: #059669;
      font-weight: bold;
    }
    .status-late {
      color: #d97706;
      font-weight: bold;
    }
    .status-absent {
      color: #dc2626;
      font-weight: bold;
    }
    .status-exception {
      color: #7c3aed;
      font-weight: bold;
    }
    .no-signature {
      color: #94a3b8;
      font-style: italic;
      font-size: 10px;
    }
    @media print {
      .no-print { display: none; }
      body { margin: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ECONET WIRELESS ZIMBABWE</h1>
    <h2>Daily Attendance Register</h2>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Generated:</strong> ${getZimbabweTimestamp()}</p>
    ${regionFilter && regionFilter !== 'All' ? `<p><strong>Region:</strong> ${regionFilter}</p>` : ''}
    ${consultantFilter && consultantFilter !== 'All' ? `<p><strong>Consultant:</strong> ${this.getConsultants().find(c => c.id === consultantFilter)?.name || consultantFilter}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>BA ID</th>
        <th>Full Name</th>
        <th>Branch</th>
        <th>Clock In</th>
        <th>Clock Out</th>
        <th>Hours</th>
        <th>Status</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
`;

    // Add rows for each BA
    relevantBAs.forEach((ba, index) => {
      const record = attendanceMap.get(ba.baId);
      
      if (record) {
        // BA has attendance record
        const statusClass = 
          record.status === 'present' ? 'status-present' :
          record.status === 'late' ? 'status-late' :
          record.status === 'absent' ? 'status-absent' :
          'status-exception';

        const signatureHtml = record.signatureDataUrl 
          ? `<img src="${record.signatureDataUrl}" alt="Signature" class="signature-img" />`
          : `<span class="no-signature">No signature</span>`;

        html += `
      <tr>
        <td>${index + 1}</td>
        <td>${record.baId}</td>
        <td>${record.baName}</td>
        <td>${record.branch}</td>
        <td>${record.clockInTime || '-'}</td>
        <td>${record.clockOutTime || '-'}</td>
        <td>${record.totalHours > 0 ? record.totalHours.toFixed(2) : '-'}</td>
        <td class="${statusClass}">${record.status.toUpperCase()}</td>
        <td class="signature-cell">${signatureHtml}</td>
      </tr>`;
      } else {
        // BA is ABSENT - no record for today
        html += `
      <tr>
        <td>${index + 1}</td>
        <td>${ba.baId}</td>
        <td>${ba.fullName}</td>
        <td>${ba.branch}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td class="status-absent">ABSENT</td>
        <td class="signature-cell"><span class="no-signature">Not present</span></td>
      </tr>`;
      }
    });

    html += `
    </tbody>
  </table>

  <div style="margin-top: 40px; page-break-before: always;">
    <p style="color: #64748b; font-size: 11px;">
      <strong>Summary:</strong> Total BAs: ${relevantBAs.length} | 
      Present: ${attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length} | 
      Absent: ${relevantBAs.length - attendanceRecords.length} | 
      Exceptions: ${attendanceRecords.filter(r => r.status !== 'present' && r.status !== 'late' && r.status !== 'absent').length}
    </p>
    <p style="color: #64748b; font-size: 10px; margin-top: 20px;">
      This is an official Econet Wireless attendance register. All signatures are digitally captured.
    </p>
  </div>

  <script>
    // Auto print dialog
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Econet_Attendance_Register_${date}_with_signatures.html`);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.logAudit({
      actor: actorName,
      actorRole: 'admin',
      action: 'REPORT_EXPORTED',
      targetId: 'attendance_register_html',
      targetType: 'REPORT',
      details: `Exported Attendance Register with signatures for ${date} (HTML format, ${relevantBAs.length} BAs).`,
    });
  },
};
