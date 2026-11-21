import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// Import BAs data inline to avoid module resolution issues
const INITIAL_BAS = [
  { id: 'ba-001', baId: 'ECO-BA-1001', fullName: 'Anesu', phoneNumber: '+263 77 123 4001', nationalId: '63-1289441-A-01', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-01-15', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_ANESU_001', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-002', baId: 'ECO-BA-1002', fullName: 'David', phoneNumber: '+263 77 123 4002', nationalId: '63-2287119-D-02', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-02-01', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_DAVID_002', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-003', baId: 'ECO-BA-1003', fullName: 'Nyasha', phoneNumber: '+263 77 123 4003', nationalId: '63-3398112-N-03', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-02-10', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_NYASHA_003', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-004', baId: 'ECO-BA-1004', fullName: 'Victory', phoneNumber: '+263 77 123 4004', nationalId: '63-4412998-V-04', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-02-15', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_VICTORY_004', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-005', baId: 'ECO-BA-1005', fullName: 'Pilot', phoneNumber: '+263 77 123 4005', nationalId: '63-5523887-P-05', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-03-01', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_PILOT_005', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-006', baId: 'ECO-BA-1006', fullName: 'Zulu', phoneNumber: '+263 77 123 4006', nationalId: '63-6634776-Z-06', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-03-05', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_ZULU_006', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-007', baId: 'ECO-BA-1007', fullName: 'Rumbi', phoneNumber: '+263 77 123 4007', nationalId: '29-1188992-R-07', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-01-20', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_RUMBI_007', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-008', baId: 'ECO-BA-1008', fullName: 'Dexter', phoneNumber: '+263 77 123 4008', nationalId: '29-2277881-D-08', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-02-05', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_DEXTER_008', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-009', baId: 'ECO-BA-1009', fullName: 'Belinda', phoneNumber: '+263 77 123 4009', nationalId: '29-3366770-B-09', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-02-18', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_BELINDA_009', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-010', baId: 'ECO-BA-1010', fullName: 'Denzel', phoneNumber: '+263 77 123 4010', nationalId: '29-4455669-D-10', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-03-02', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_DENZEL_010', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-011', baId: 'ECO-BA-1011', fullName: 'Moses', phoneNumber: '+263 77 123 4011', nationalId: '29-5544338-M-11', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-03-10', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1534751516642-a171ed292022?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_MOSES_011', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
  { id: 'ba-012', baId: 'ECO-BA-1012', fullName: 'Playflex', phoneNumber: '+263 77 123 4012', nationalId: '08-1122334-P-12', category: 'BA', region: 'Harare Central', branch: 'Econet First', salesConsultantId: 'CON-001', salesConsultantName: 'Chipo Mutasa', dateRegistered: '2026-01-10', status: 'active', dailyCommissionRate: 13.50, dailyAttendanceCommissionRate: 0, photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&fit=crop&crop=faces&q=80', qrToken: 'ECO_TOKEN_PLAYFLEX_012', qrRevoked: false, qrGeneratedAt: '2026-11-07 08:00:00 (CAT)' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');
  const configuredKey = process.env.AUTH_SETUP_KEY || '';
  const suppliedKey = req.headers['x-setup-key'];
  const supplied = Buffer.from(typeof suppliedKey === 'string' ? suppliedKey : '');
  const expected = Buffer.from(configuredKey);
  if (
    configuredKey.length < 32 ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ success: false, error: 'A valid one-time setup key is required.' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL not configured' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Create tables
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

    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_ba_id ON attendance_records(ba_id)`;

    // Seed initial BAs
    for (const ba of INITIAL_BAS) {
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
        ON CONFLICT (ba_id) DO NOTHING
      `;
    }

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      basSeeded: INITIAL_BAS.length,
    });
  } catch (error: any) {
    console.error('Database init error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
