import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, requireRole } from '../src/server/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = getDatabase();
    const user = await requireRole(
      req,
      res,
      req.method === 'GET' ? ['admin', 'consultant', 'operator', 'ba'] : ['admin'],
      sql
    );
    if (!user) return;

    if (req.method === 'POST' || req.method === 'PUT') {
      const ba = req.body;
      if (
        !ba ||
        typeof ba !== 'object' ||
        typeof ba.id !== 'string' ||
        typeof ba.baId !== 'string' ||
        typeof ba.fullName !== 'string' ||
        typeof ba.qrToken !== 'string'
      ) {
        return res.status(400).json({ success: false, error: 'A complete BA profile is required.' });
      }

      if (req.method === 'POST') {
        await sql`
          INSERT INTO brand_ambassadors (
            id, ba_id, full_name, phone_number, national_id, category, region, branch,
            sales_consultant_id, sales_consultant_name, date_registered, status,
            daily_commission_rate, daily_attendance_commission_rate, photo_url,
            qr_token, qr_revoked, qr_generated_at
          ) VALUES (
            ${ba.id}, ${ba.baId}, ${ba.fullName}, ${ba.phoneNumber || null}, ${ba.nationalId || null},
            ${ba.category}, ${ba.region}, ${ba.branch}, ${ba.salesConsultantId}, ${ba.salesConsultantName},
            ${ba.dateRegistered}, ${ba.status}, ${ba.dailyCommissionRate},
            ${ba.dailyAttendanceCommissionRate}, ${ba.photoUrl || null}, ${ba.qrToken},
            ${Boolean(ba.qrRevoked)}, ${ba.qrGeneratedAt || null}
          )
        `;
        return res.status(201).json({ success: true, message: 'BA profile created.' });
      }

      const updated = await sql`
        UPDATE brand_ambassadors SET
          full_name = ${ba.fullName},
          phone_number = ${ba.phoneNumber || null},
          national_id = ${ba.nationalId || null},
          category = ${ba.category},
          region = ${ba.region},
          branch = ${ba.branch},
          sales_consultant_id = ${ba.salesConsultantId},
          sales_consultant_name = ${ba.salesConsultantName},
          status = ${ba.status},
          daily_commission_rate = ${ba.dailyCommissionRate},
          daily_attendance_commission_rate = ${ba.dailyAttendanceCommissionRate},
          photo_url = ${ba.photoUrl || null},
          qr_token = ${ba.qrToken},
          qr_revoked = ${Boolean(ba.qrRevoked)},
          qr_generated_at = ${ba.qrGeneratedAt || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE ba_id = ${ba.baId}
        RETURNING ba_id
      `;
      if (updated.length === 0) {
        return res.status(404).json({ success: false, error: 'BA profile not found.' });
      }
      return res.status(200).json({ success: true, message: 'BA profile updated.' });
    }

    let rows;
    if (user.role === 'ba') {
      rows = await sql`
        SELECT * FROM brand_ambassadors
        WHERE lower(ba_id) = ${(user.baId || '').toLowerCase()}
        ORDER BY full_name
      `;
    } else if (user.role === 'consultant') {
      rows = await sql`
        SELECT * FROM brand_ambassadors
        WHERE sales_consultant_id = ${user.consultantId || ''}
        ORDER BY full_name
      `;
    } else {
      rows = await sql`SELECT * FROM brand_ambassadors ORDER BY full_name`;
    }
    
    const bas = rows.map((row: any) => ({
      id: row.id,
      baId: row.ba_id,
      fullName: row.full_name,
      ...(user.role === 'ba' ? {} : { phoneNumber: row.phone_number, nationalId: row.national_id }),
      category: row.category,
      region: row.region,
      branch: row.branch,
      salesConsultantId: row.sales_consultant_id,
      salesConsultantName: row.sales_consultant_name,
      dateRegistered: row.date_registered,
      status: row.status,
      ...(user.role === 'ba'
        ? {}
        : {
            dailyCommissionRate: parseFloat(row.daily_commission_rate),
            dailyAttendanceCommissionRate: parseFloat(row.daily_attendance_commission_rate),
          }),
      photoUrl: row.photo_url,
      ...(user.role === 'ba'
        ? {}
        : { qrToken: row.qr_token, qrRevoked: row.qr_revoked, qrGeneratedAt: row.qr_generated_at }),
    }));

    return res.status(200).json({
      success: true,
      data: bas,
      count: bas.length,
    });
  } catch (error: any) {
    console.error('Error fetching BAs:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
