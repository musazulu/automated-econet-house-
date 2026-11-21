import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, requireRole } from '../src/server/auth';

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

    // Get all attendance records
    const records = await sql`SELECT * FROM attendance_records`;

    // Get all BAs with their rates
    const bas = await sql`SELECT ba_id, daily_commission_rate FROM brand_ambassadors`;
    
    // Create a map of BA rates for quick lookup
    const baRates: { [key: string]: number } = {};
    bas.forEach((ba: any) => {
      baRates[ba.ba_id] = parseFloat(ba.daily_commission_rate);
    });

    let updatedCount = 0;

    // Recalculate commission for each record
    for (const record of records as any[]) {
      const baRate = baRates[record.ba_id] || 13.5; // Default to $13.50
      
      // Simple logic: Present or Late or Approved Exception = full rate, else $0
      let dailyCommission = 0;
      
      if (record.status === 'present' || record.status === 'late') {
        dailyCommission = baRate;
      } else if (
        (record.status === 'sick' || 
         record.status === 'activation' || 
         record.status === 'business_duty' || 
         record.status === 'public_holiday') &&
        record.exception_approval_status === 'approved'
      ) {
        dailyCommission = baRate;
      }

      const totalEarned = dailyCommission + (parseFloat(record.manual_adjustments) || 0);

      // Update the record
      await sql`
        UPDATE attendance_records 
        SET calculated_daily_commission = ${dailyCommission},
            calculated_attendance_commission = 0,
            total_earned = ${totalEarned},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${record.id}
      `;

      updatedCount++;
    }

    return res.status(200).json({
      success: true,
      message: 'All attendance records recalculated with new $13.50 rate',
      recordsUpdated: updatedCount,
    });
  } catch (error: any) {
    console.error('Recalculation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
