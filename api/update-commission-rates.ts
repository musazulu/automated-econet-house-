import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, requireRole } from '../src/server/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = getDatabase();
    const user = await requireRole(req, res, ['admin'], sql);
    if (!user) return;

    // Standardise every BA on the $13.50 daily rate, then correct their existing attendance earnings.
    const result = await sql`
      UPDATE brand_ambassadors 
      SET daily_commission_rate = 13.50,
          daily_attendance_commission_rate = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE daily_commission_rate <> 13.50 OR daily_attendance_commission_rate <> 0
      RETURNING id, ba_id, full_name, daily_commission_rate
    `;
    const updatedBaIds = result.map((ba: any) => ba.ba_id);
    let recordsUpdated = 0;
    if (updatedBaIds.length > 0) {
      const records = await sql`
        UPDATE attendance_records
        SET calculated_daily_commission = CASE WHEN calculated_daily_commission > 0 THEN 13.50 ELSE 0 END,
            calculated_attendance_commission = 0,
            total_earned = CASE WHEN calculated_daily_commission > 0 THEN 13.50 ELSE 0 END
              + COALESCE(manual_adjustments, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE ba_id = ANY(${updatedBaIds})
        RETURNING id
      `;
      recordsUpdated = records.length;
    }

    return res.status(200).json({
      success: true,
      message: 'Commission rates updated to $13.50',
      basUpdated: result.length,
      recordsUpdated,
      updatedBAs: result.map((ba: any) => ({
        id: ba.id,
        name: ba.full_name,
        newRate: parseFloat(ba.daily_commission_rate)
      }))
    });
  } catch (error: any) {
    console.error('Commission rate update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
