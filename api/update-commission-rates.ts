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

    // Update all Econet First BAs to new rate $13.50
    const result = await sql`
      UPDATE brand_ambassadors 
      SET daily_commission_rate = 13.50,
          daily_attendance_commission_rate = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE branch = 'Econet First'
      RETURNING id, full_name, daily_commission_rate
    `;

    return res.status(200).json({
      success: true,
      message: 'Commission rates updated to $13.50',
      basUpdated: result.length,
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
