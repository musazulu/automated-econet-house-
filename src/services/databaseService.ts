/**
 * Database Service - Neon Postgres Integration
 * Handles all database operations for cross-device data sync
 */

import { neon } from '@neondatabase/serverless';
import type { BrandAmbassador, AttendanceRecord, SalesConsultant, AuditLogEntry } from '../types';

// Check if database is configured
const isDatabaseConfigured = (): boolean => {
  return typeof process !== 'undefined' && !!process.env.DATABASE_URL;
};

// Get database client
const getDb = () => {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL not configured');
  }
  return neon(process.env.DATABASE_URL!);
};

// Initialize database schema
export const initializeDatabase = async (): Promise<void> => {
  try {
    const sql = getDb();

    // Create brand_ambassadors table
    await sql`
      CREATE TABLE IF NOT EXISTS brand_ambassadors (
        id TEXT PRIMARY KEY,
        ba_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        national_id TEXT,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        branch TEXT NOT NULL,
        sales_consultant_id TEXT NOT NULL,
        sales_consultant_name TEXT NOT NULL,
        date_registered TEXT NOT NULL,
        status TEXT NOT NULL,
        daily_commission_rate DECIMAL(10,2) NOT NULL,
        daily_attendance_commission_rate DECIMAL(10,2) NOT NULL,
        photo_url TEXT,
        qr_token TEXT UNIQUE NOT NULL,
        qr_revoked BOOLEAN DEFAULT FALSE,
        qr_generated_at TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create attendance_records table
    await sql`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        ba_id TEXT NOT NULL,
        ba_internal_id TEXT NOT NULL,
        ba_name TEXT NOT NULL,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        branch TEXT NOT NULL,
        sales_consultant_id TEXT NOT NULL,
        sales_consultant_name TEXT NOT NULL,
        clock_in_time TEXT,
        clock_out_time TEXT,
        total_hours DECIMAL(10,2) DEFAULT 0,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        missing_clock_out BOOLEAN DEFAULT FALSE,
        is_late BOOLEAN DEFAULT FALSE,
        signature_data_url TEXT,
        exception_type TEXT,
        exception_reason TEXT,
        exception_approval_status TEXT,
        exception_approved_by TEXT,
        exception_approved_at TEXT,
        calculated_daily_commission DECIMAL(10,2) DEFAULT 0,
        calculated_attendance_commission DECIMAL(10,2) DEFAULT 0,
        manual_adjustments DECIMAL(10,2) DEFAULT 0,
        adjustment_reason TEXT,
        total_earned DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for faster queries
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_ba_id ON attendance_records(ba_id)`;

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Brand Ambassadors CRUD
export const dbGetAllBAs = async (): Promise<BrandAmbassador[]> => {
  const sql = getDb();
  const rows = await sql`SELECT * FROM brand_ambassadors ORDER BY full_name`;
  
  return rows.map((row: any) => ({
    id: row.id,
    baId: row.ba_id,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    nationalId: row.national_id,
    category: row.category,
    region: row.region,
    branch: row.branch,
    salesConsultantId: row.sales_consultant_id,
    salesConsultantName: row.sales_consultant_name,
    dateRegistered: row.date_registered,
    status: row.status,
    dailyCommissionRate: parseFloat(row.daily_commission_rate),
    dailyAttendanceCommissionRate: parseFloat(row.daily_attendance_commission_rate),
    photoUrl: row.photo_url,
    qrToken: row.qr_token,
    qrRevoked: row.qr_revoked,
    qrGeneratedAt: row.qr_generated_at,
  }));
};

export const dbInsertBA = async (ba: BrandAmbassador): Promise<void> => {
  const sql = getDb();
  await sql`
    INSERT INTO brand_ambassadors (
      id, ba_id, full_name, phone_number, national_id, category, region, branch,
      sales_consultant_id, sales_consultant_name, date_registered, status,
      daily_commission_rate, daily_attendance_commission_rate, photo_url,
      qr_token, qr_revoked, qr_generated_at
    ) VALUES (
      ${ba.id}, ${ba.baId}, ${ba.fullName}, ${ba.phoneNumber}, ${ba.nationalId},
      ${ba.category}, ${ba.region}, ${ba.branch}, ${ba.salesConsultantId},
      ${ba.salesConsultantName}, ${ba.dateRegistered}, ${ba.status},
      ${ba.dailyCommissionRate}, ${ba.dailyAttendanceCommissionRate},
      ${ba.photoUrl}, ${ba.qrToken}, ${ba.qrRevoked}, ${ba.qrGeneratedAt}
    )
    ON CONFLICT (ba_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone_number = EXCLUDED.phone_number,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
  `;
};

// Attendance Records CRUD
export const dbGetAttendanceRecords = async (filters?: {
  date?: string;
  baId?: string;
  region?: string;
  consultantId?: string;
}): Promise<AttendanceRecord[]> => {
  const sql = getDb();
  
  let query = 'SELECT * FROM attendance_records WHERE 1=1';
  const params: any[] = [];
  
  if (filters?.date) {
    query += ` AND date = $${params.length + 1}`;
    params.push(filters.date);
  }
  if (filters?.baId) {
    query += ` AND ba_id = $${params.length + 1}`;
    params.push(filters.baId);
  }
  if (filters?.region) {
    query += ` AND region = $${params.length + 1}`;
    params.push(filters.region);
  }
  if (filters?.consultantId) {
    query += ` AND sales_consultant_id = $${params.length + 1}`;
    params.push(filters.consultantId);
  }
  
  query += ' ORDER BY date DESC, created_at DESC';
  
  const rows = await sql(query, params);
  
  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    baId: row.ba_id,
    baInternalId: row.ba_internal_id,
    baName: row.ba_name,
    category: row.category,
    region: row.region,
    branch: row.branch,
    salesConsultantId: row.sales_consultant_id,
    salesConsultantName: row.sales_consultant_name,
    clockInTime: row.clock_in_time,
    clockOutTime: row.clock_out_time,
    totalHours: parseFloat(row.total_hours),
    status: row.status,
    source: row.source,
    isCompleted: row.is_completed,
    missingClockOut: row.missing_clock_out,
    isLate: row.is_late,
    signatureDataUrl: row.signature_data_url,
    exceptionType: row.exception_type,
    exceptionReason: row.exception_reason,
    exceptionApprovalStatus: row.exception_approval_status,
    exceptionApprovedBy: row.exception_approved_by,
    exceptionApprovedAt: row.exception_approved_at,
    calculatedDailyCommission: parseFloat(row.calculated_daily_commission),
    calculatedAttendanceCommission: parseFloat(row.calculated_attendance_commission),
    manualAdjustments: parseFloat(row.manual_adjustments),
    adjustmentReason: row.adjustment_reason,
    totalEarned: parseFloat(row.total_earned),
    notes: row.notes,
    history: row.history || [],
  }));
};

export const dbInsertAttendanceRecord = async (record: AttendanceRecord): Promise<void> => {
  const sql = getDb();
  await sql`
    INSERT INTO attendance_records (
      id, date, ba_id, ba_internal_id, ba_name, category, region, branch,
      sales_consultant_id, sales_consultant_name, clock_in_time, clock_out_time,
      total_hours, status, source, is_completed, missing_clock_out, is_late,
      signature_data_url, exception_type, exception_reason, exception_approval_status,
      exception_approved_by, exception_approved_at, calculated_daily_commission,
      calculated_attendance_commission, manual_adjustments, adjustment_reason,
      total_earned, notes, history
    ) VALUES (
      ${record.id}, ${record.date}, ${record.baId}, ${record.baInternalId},
      ${record.baName}, ${record.category}, ${record.region}, ${record.branch},
      ${record.salesConsultantId}, ${record.salesConsultantName},
      ${record.clockInTime}, ${record.clockOutTime}, ${record.totalHours},
      ${record.status}, ${record.source}, ${record.isCompleted},
      ${record.missingClockOut}, ${record.isLate}, ${record.signatureDataUrl},
      ${record.exceptionType}, ${record.exceptionReason},
      ${record.exceptionApprovalStatus}, ${record.exceptionApprovedBy},
      ${record.exceptionApprovedAt}, ${record.calculatedDailyCommission},
      ${record.calculatedAttendanceCommission}, ${record.manualAdjustments},
      ${record.adjustmentReason}, ${record.totalEarned}, ${record.notes},
      ${JSON.stringify(record.history)}
    )
  `;
};

export const dbUpdateAttendanceRecord = async (record: AttendanceRecord): Promise<void> => {
  const sql = getDb();
  await sql`
    UPDATE attendance_records SET
      clock_in_time = ${record.clockInTime},
      clock_out_time = ${record.clockOutTime},
      total_hours = ${record.totalHours},
      status = ${record.status},
      is_completed = ${record.isCompleted},
      missing_clock_out = ${record.missingClockOut},
      signature_data_url = ${record.signatureDataUrl},
      calculated_daily_commission = ${record.calculatedDailyCommission},
      calculated_attendance_commission = ${record.calculatedAttendanceCommission},
      manual_adjustments = ${record.manualAdjustments},
      total_earned = ${record.totalEarned},
      notes = ${record.notes},
      history = ${JSON.stringify(record.history)},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${record.id}
  `;
};

export const dbDeleteAttendanceRecord = async (recordId: string): Promise<void> => {
  const sql = getDb();
  await sql`DELETE FROM attendance_records WHERE id = ${recordId}`;
};

// Health check
export const dbHealthCheck = async (): Promise<boolean> => {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

export const DatabaseService = {
  isDatabaseConfigured,
  initializeDatabase,
  dbGetAllBAs,
  dbInsertBA,
  dbGetAttendanceRecords,
  dbInsertAttendanceRecord,
  dbUpdateAttendanceRecord,
  dbDeleteAttendanceRecord,
  dbHealthCheck,
};
