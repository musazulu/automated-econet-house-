import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, requireRole } from '../src/server/auth.js';
import { isTimeLate } from '../src/utils/dateUtils.js';

const getHarareClock = (): { date: string; time: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Harare',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}:${part('second')}`,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const sql = getDatabase();
    const user = await requireRole(
      req,
      res,
      req.method === 'GET'
        ? ['admin', 'consultant', 'operator', 'ba']
        : req.method === 'POST'
          ? ['admin', 'consultant', 'operator']
          : ['admin', 'consultant'],
      sql
    );
    if (!user) return;

    // GET - Fetch attendance records
    if (req.method === 'GET') {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const baId = typeof req.query.baId === 'string' ? req.query.baId : undefined;
      const consultantId = typeof req.query.consultantId === 'string' ? req.query.consultantId : undefined;
      if (user.role === 'ba' && baId && baId.toLowerCase() !== user.baId?.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'You can only view your own register.' });
      }
      if (user.role === 'consultant' && consultantId && consultantId !== user.consultantId) {
        return res.status(403).json({ success: false, error: 'You can only view your assigned team.' });
      }

      let rows;
      if (user.role === 'ba') {
        rows = date
          ? await sql`SELECT * FROM attendance_records WHERE date = ${date} AND lower(ba_id) = ${user.baId?.toLowerCase() || ''} ORDER BY created_at DESC LIMIT 1000`
          : await sql`SELECT * FROM attendance_records WHERE lower(ba_id) = ${user.baId?.toLowerCase() || ''} ORDER BY date DESC, created_at DESC LIMIT 1000`;
      } else if (user.role === 'consultant') {
        rows = date
          ? await sql`SELECT * FROM attendance_records WHERE date = ${date} AND sales_consultant_id = ${user.consultantId || ''} ORDER BY created_at DESC LIMIT 1000`
          : await sql`SELECT * FROM attendance_records WHERE sales_consultant_id = ${user.consultantId || ''} ORDER BY date DESC, created_at DESC LIMIT 1000`;
      } else if (date && baId) {
        rows = await sql`SELECT * FROM attendance_records WHERE date = ${date} AND ba_id = ${baId} ORDER BY created_at DESC LIMIT 1000`;
      } else if (date) {
        rows = await sql`SELECT * FROM attendance_records WHERE date = ${date} ORDER BY date DESC, created_at DESC LIMIT 1000`;
      } else if (baId) {
        rows = await sql`SELECT * FROM attendance_records WHERE ba_id = ${baId} ORDER BY date DESC, created_at DESC LIMIT 1000`;
      } else {
        rows = await sql`SELECT * FROM attendance_records ORDER BY date DESC, created_at DESC LIMIT 1000`;
      }
      
      const records = rows.map((row: any) => {
        const record = {
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
          totalHours: parseFloat(row.total_hours || 0),
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
          calculatedDailyCommission: parseFloat(row.calculated_daily_commission || 0),
          calculatedAttendanceCommission: parseFloat(row.calculated_attendance_commission || 0),
          manualAdjustments: parseFloat(row.manual_adjustments || 0),
          adjustmentReason: row.adjustment_reason,
          totalEarned: parseFloat(row.total_earned || 0),
          notes: row.notes,
          history: row.history || [],
        };
        if (user.role !== 'ba') return record;
        return {
          id: record.id,
          date: record.date,
          baId: record.baId,
          baName: record.baName,
          branch: record.branch,
          clockInTime: record.clockInTime,
          clockOutTime: record.clockOutTime,
          totalHours: record.totalHours,
          status: record.status,
          source: record.source,
          isCompleted: record.isCompleted,
          missingClockOut: record.missingClockOut,
          isLate: record.isLate,
          signatureDataUrl: record.signatureDataUrl,
        };
      });

      return res.status(200).json({
        success: true,
        data: records,
        count: records.length,
      });
    }

    // POST - Create new attendance record
    if (req.method === 'POST') {
      const record = req.body;
      if (!record || typeof record !== 'object' || typeof record.id !== 'string' || typeof record.baId !== 'string') {
        return res.status(400).json({ success: false, error: 'A valid attendance record is required.' });
      }
      if (user.role === 'consultant' && record.salesConsultantId !== user.consultantId) {
        return res.status(403).json({ success: false, error: 'You can only record attendance for your assigned team.' });
      }
      if (record.source === 'qr_scan') {
        const clock = getHarareClock();
        record.date = clock.date;
        record.clockInTime = clock.time;
        record.isLate = isTimeLate(clock.time);
        if (record.status === 'present' || record.status === 'late') {
          record.status = record.isLate ? 'late' : 'present';
        }
      } else {
        record.isLate = isTimeLate(record.clockInTime || null);
        if (record.status === 'present' || record.status === 'late') {
          record.status = record.isLate ? 'late' : 'present';
        }
      }

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
          ${JSON.stringify(record.history || [])}
        )
      `;

      return res.status(201).json({
        success: true,
        message: 'Attendance record created',
      });
    }

    // PUT - Update attendance record
    if (req.method === 'PUT') {
      const record = req.body;
      if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
        return res.status(400).json({ success: false, error: 'A valid attendance record is required.' });
      }
      record.isLate = isTimeLate(record.clockInTime || null);
      if (record.status === 'present' || record.status === 'late') {
        record.status = record.isLate ? 'late' : 'present';
      }

      const updatedRows = user.role === 'consultant'
        ? await sql`
          UPDATE attendance_records SET
            clock_in_time = ${record.clockInTime},
            clock_out_time = ${record.clockOutTime},
            total_hours = ${record.totalHours},
            status = ${record.status},
            is_late = ${record.isLate},
            is_completed = ${record.isCompleted},
            missing_clock_out = ${record.missingClockOut},
            signature_data_url = ${record.signatureDataUrl},
            calculated_daily_commission = ${record.calculatedDailyCommission},
            calculated_attendance_commission = ${record.calculatedAttendanceCommission},
            manual_adjustments = ${record.manualAdjustments},
            total_earned = ${record.totalEarned},
            notes = ${record.notes},
            history = ${JSON.stringify(record.history || [])},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${record.id} AND sales_consultant_id = ${user.consultantId || ''}
          RETURNING id
        `
        : await sql`
        UPDATE attendance_records SET
          clock_in_time = ${record.clockInTime},
          clock_out_time = ${record.clockOutTime},
          total_hours = ${record.totalHours},
          status = ${record.status},
          is_late = ${record.isLate},
          is_completed = ${record.isCompleted},
          missing_clock_out = ${record.missingClockOut},
          signature_data_url = ${record.signatureDataUrl},
          calculated_daily_commission = ${record.calculatedDailyCommission},
          calculated_attendance_commission = ${record.calculatedAttendanceCommission},
          manual_adjustments = ${record.manualAdjustments},
          total_earned = ${record.totalEarned},
          notes = ${record.notes},
          history = ${JSON.stringify(record.history || [])},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${record.id}
        RETURNING id
      `;
      if (updatedRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Attendance record not found or outside your access.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Attendance record updated',
      });
    }

    // DELETE - Delete attendance record
    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      
      if (!id) {
        return res.status(400).json({ error: 'Record ID required' });
      }

      const deletedRows = user.role === 'consultant'
        ? await sql`DELETE FROM attendance_records WHERE id = ${id} AND sales_consultant_id = ${user.consultantId || ''} RETURNING id`
        : await sql`DELETE FROM attendance_records WHERE id = ${id} RETURNING id`;
      if (deletedRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Attendance record not found or outside your access.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Attendance record deleted',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Attendance API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
