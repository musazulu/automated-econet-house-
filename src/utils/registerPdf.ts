import type { AttendanceRecord, AttendanceStatus, BrandAmbassador } from '../types';
import { getZimbabweDate, getZimbabweTimestamp } from './dateUtils';

export interface RegisterFilters {
  region?: string;
  consultantName?: string;
}

interface RegisterInput {
  bas: BrandAmbassador[];
  records: AttendanceRecord[];
  filters: RegisterFilters;
  preparedBy: string;
}

const BLUE: [number, number, number] = [29, 78, 216];
const SLATE: [number, number, number] = [71, 85, 105];
const GREEN: [number, number, number] = [5, 150, 105];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];
const PURPLE: [number, number, number] = [124, 58, 237];
const LIGHT: [number, number, number] = [241, 245, 249];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  sick: 'Sick',
  activation: 'Activation',
  business_duty: 'Business duty',
  leave: 'Leave',
  public_holiday: 'Public holiday',
  rest_day: 'Rest day',
  pending_review: 'Pending review',
};

const statusColor = (status: AttendanceStatus): [number, number, number] => {
  if (status === 'present') return GREEN;
  if (status === 'late') return AMBER;
  if (status === 'absent') return RED;
  return PURPLE;
};

const loadPdfTools = async () => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable: autoTableModule.default };
};

const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const daysInMonth = (month: string): number => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
};

const dateKey = (month: string, day: number): string => `${month}-${String(day).padStart(2, '0')}`;

const weekdayOf = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

const shortDate = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });

// Sundays are treated as non-working days; future days are not marked absent.
const isNonWorkingDay = (date: string): boolean => weekdayOf(date) === 0;

const pickRecord = (existing: AttendanceRecord | undefined, candidate: AttendanceRecord) => {
  if (!existing) return candidate;
  if (!existing.signatureDataUrl && candidate.signatureDataUrl) return candidate;
  return existing;
};

type PdfDoc = InstanceType<Awaited<ReturnType<typeof loadPdfTools>>['jsPDF']>;

const drawHeader = (doc: PdfDoc, title: string, lines: string[]) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, width, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ECONET WIRELESS ZIMBABWE', 12, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 12, 17);
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  lines.forEach((line, index) => doc.text(line, 12, 29 + index * 5));
  return 29 + lines.length * 5;
};

const addPageNumbers = (doc: PdfDoc, generatedAt: string) => {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(`Generated ${generatedAt} · Official Econet digital attendance register`, 12, height - 7);
    doc.text(`Page ${page} of ${pages}`, width - 12, height - 7, { align: 'right' });
  }
};

const drawSignature = (doc: PdfDoc, dataUrl: string | undefined, x: number, y: number, w: number, h: number) => {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
  try {
    const format = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    const props = doc.getImageProperties(dataUrl);
    const scale = Math.min((w - 2) / props.width, (h - 1.5) / props.height);
    const drawW = props.width * scale;
    const drawH = props.height * scale;
    doc.addImage(dataUrl, format, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
  } catch {
    // An unreadable signature image leaves the cell blank rather than failing the whole register.
  }
};

const drawSignOff = (doc: PdfDoc, y: number, preparedBy: string) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...SLATE);
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.line(12, y, 90, y);
  doc.text(`Verified by (Admin): ${preparedBy}`, 12, y + 5);
  doc.line(width - 90, y, width - 12, y);
  doc.text('Date', width - 90, y + 5);
};

const saveDoc = (doc: PdfDoc, filename: string) => {
  doc.save(filename);
};

export const downloadDailyRegisterPdf = async (date: string, input: RegisterInput): Promise<number> => {
  const { jsPDF, autoTable } = await loadPdfTools();
  const { bas, records, filters, preparedBy } = input;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const dayRecords = new Map<string, AttendanceRecord>();
  records
    .filter(record => record.date === date)
    .forEach(record => dayRecords.set(record.baId, pickRecord(dayRecords.get(record.baId), record)));

  const rows = bas
    .filter(ba => ba.status === 'active' || dayRecords.has(ba.baId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const headerLines = [
    `Daily Attendance Register — ${shortDate(date)} ${date.slice(0, 4)}`,
    ...(filters.region ? [`Region: ${filters.region}`] : []),
    ...(filters.consultantName ? [`Team: ${filters.consultantName}`] : []),
  ];
  const startY = drawHeader(doc, 'Daily Attendance Register with Signatures', headerLines);

  const tableRows = rows.map((ba, index) => {
    const record = dayRecords.get(ba.baId);
    return [
      String(index + 1),
      ba.baId,
      ba.fullName,
      ba.branch,
      record?.clockInTime || '—',
      record?.clockOutTime || '—',
      record && record.totalHours > 0 ? record.totalHours.toFixed(2) : '—',
      record ? STATUS_LABEL[record.status] ?? record.status : 'Absent',
      '',
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: 12, right: 12 },
    head: [['#', 'BA ID', 'Brand Ambassador', 'Branch', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Signature']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [226, 232, 240] },
    headStyles: { fillColor: BLUE, textColor: 255 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 16 },
      7: { cellWidth: 26, fontStyle: 'bold' },
      8: { cellWidth: 42, minCellHeight: 14 },
    },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 7) {
        const record = dayRecords.get(rows[data.row.index]?.baId ?? '');
        data.cell.styles.textColor = statusColor(record?.status ?? 'absent');
      }
    },
    didDrawCell: data => {
      if (data.section === 'body' && data.column.index === 8) {
        const record = dayRecords.get(rows[data.row.index]?.baId ?? '');
        drawSignature(doc, record?.signatureDataUrl, data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      }
    },
  });

  const present = rows.filter(ba => {
    const status = dayRecords.get(ba.baId)?.status;
    return status === 'present' || status === 'late';
  }).length;
  const late = rows.filter(ba => dayRecords.get(ba.baId)?.status === 'late').length;
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let summaryY = lastY + 10;
  if (summaryY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    summaryY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(
    `Summary: ${rows.length} BAs · ${present} present (${late} late) · ${rows.length - present} absent / other`,
    12,
    summaryY
  );
  drawSignOff(doc, summaryY + 16, preparedBy);

  addPageNumbers(doc, getZimbabweTimestamp());
  saveDoc(doc, `Econet_Attendance_Register_${date}.pdf`);
  return rows.length;
};

export const downloadMonthlyRegisterPdf = async (month: string, input: RegisterInput): Promise<number> => {
  const { jsPDF, autoTable } = await loadPdfTools();
  const { bas, records, filters, preparedBy } = input;
  const totalDays = daysInMonth(month);
  const today = getZimbabweDate();
  const monthRecords = records.filter(record => record.date.startsWith(`${month}-`));

  const byBa = new Map<string, Map<string, AttendanceRecord>>();
  monthRecords.forEach(record => {
    const days = byBa.get(record.baId) ?? new Map<string, AttendanceRecord>();
    days.set(record.date, pickRecord(days.get(record.date), record));
    byBa.set(record.baId, days);
  });

  const rows = bas
    .filter(ba => ba.status === 'active' || byBa.has(ba.baId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const title = monthLabel(month);
  const headerLines = [
    `Monthly Attendance Register — ${title}`,
    ...(filters.region ? [`Region: ${filters.region}`] : []),
    ...(filters.consultantName ? [`Team: ${filters.consultantName}`] : []),
  ];

  const countsFor = (baId: string) => {
    const days = byBa.get(baId);
    let attended = 0;
    let late = 0;
    let exceptions = 0;
    let absent = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      const key = dateKey(month, day);
      const record = days?.get(key);
      if (record) {
        if (record.status === 'present') attended += 1;
        else if (record.status === 'late') {
          attended += 1;
          late += 1;
        } else if (record.status === 'absent') absent += 1;
        else exceptions += 1;
      } else if (key <= today && !isNonWorkingDay(key)) {
        absent += 1;
      }
    }
    return { attended, late, exceptions, absent };
  };

  // Page 1+: month-at-a-glance grid.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawHeader(doc, 'Month-End Register Summary', headerLines);

  const dayHeaders = Array.from({ length: totalDays }, (_, index) => String(index + 1));
  const gridBody = rows.map(ba => {
    const days = byBa.get(ba.baId);
    const marks = dayHeaders.map((_, index) => {
      const key = dateKey(month, index + 1);
      const record = days?.get(key);
      if (record) {
        if (record.status === 'present') return 'P';
        if (record.status === 'late') return 'L';
        if (record.status === 'absent') return 'A';
        return 'E';
      }
      if (key > today) return '';
      return isNonWorkingDay(key) ? '–' : 'A';
    });
    const counts = countsFor(ba.baId);
    return [`${ba.fullName}\n${ba.baId}`, ...marks, String(counts.attended), String(counts.late), String(counts.absent)];
  });

  const dayColumnStyles: Record<number, { cellWidth: number; halign: 'center' }> = {};
  for (let column = 1; column <= totalDays; column += 1) dayColumnStyles[column] = { cellWidth: 6, halign: 'center' };
  const totalsStart = totalDays + 1;

  autoTable(doc, {
    startY,
    margin: { left: 12, right: 12 },
    head: [['Brand Ambassador', ...dayHeaders, 'Days', 'Late', 'Abs.']],
    body: gridBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 0.8, valign: 'middle', lineColor: [226, 232, 240] },
    headStyles: { fillColor: BLUE, textColor: 255, halign: 'center', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 40, halign: 'left' },
      ...dayColumnStyles,
      [totalsStart]: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      [totalsStart + 1]: { cellWidth: 9, halign: 'center' },
      [totalsStart + 2]: { cellWidth: 9, halign: 'center' },
    },
    didParseCell: data => {
      if (data.section !== 'body' || data.column.index < 1 || data.column.index > totalDays) return;
      const mark = String(data.cell.raw);
      if (mark === 'P') {
        data.cell.styles.textColor = GREEN;
        data.cell.styles.fontStyle = 'bold';
      } else if (mark === 'L') {
        data.cell.styles.textColor = AMBER;
        data.cell.styles.fontStyle = 'bold';
      } else if (mark === 'A') {
        data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 242, 242];
      } else if (mark === 'E') {
        data.cell.styles.textColor = PURPLE;
        data.cell.styles.fontStyle = 'bold';
      } else {
        data.cell.styles.fillColor = LIGHT;
        data.cell.styles.textColor = [148, 163, 184];
      }
    },
  });

  const gridEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let legendY = gridEnd + 8;
  if (legendY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    legendY = 20;
  }
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(
    'P = Present   L = Late (after 08:00)   A = Absent   E = Approved/other exception   – = Sunday   Signatures for every day follow on each BA page.',
    12,
    legendY
  );

  // One page per BA with the daily signed entries.
  rows.forEach(ba => {
    doc.addPage('a4', 'portrait');
    const counts = countsFor(ba.baId);
    const bodyStart = drawHeader(doc, `Signed Attendance — ${title}`, [
      `${ba.fullName}   ·   ${ba.baId}   ·   ${ba.branch}`,
    ]);
    const days = byBa.get(ba.baId);
    const dayRows = Array.from({ length: totalDays }, (_, index) => {
      const key = dateKey(month, index + 1);
      const record = days?.get(key);
      let status = '';
      if (record) status = STATUS_LABEL[record.status] ?? record.status;
      else if (key <= today) status = isNonWorkingDay(key) ? 'Off' : 'Absent';
      return {
        key,
        record,
        cells: [
          shortDate(key),
          record?.clockInTime || '—',
          record?.clockOutTime || '—',
          record && record.totalHours > 0 ? record.totalHours.toFixed(2) : '—',
          status,
          '',
        ],
      };
    });

    autoTable(doc, {
      startY: bodyStart,
      margin: { left: 12, right: 12, bottom: 16 },
      head: [['Date', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Signature']],
      body: dayRows.map(row => row.cells),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1, valign: 'middle', lineColor: [226, 232, 240], minCellHeight: 6.8 },
      headStyles: { fillColor: BLUE, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 28, fontStyle: 'bold' },
        5: { cellWidth: 70 },
      },
      didParseCell: data => {
        if (data.section !== 'body') return;
        const row = dayRows[data.row.index];
        if (data.column.index === 4) {
          if (row.record) data.cell.styles.textColor = statusColor(row.record.status);
          else if (data.cell.text[0] === 'Absent') data.cell.styles.textColor = RED;
          else data.cell.styles.textColor = [148, 163, 184];
        }
        if (!row.record && isNonWorkingDay(row.key)) data.cell.styles.fillColor = LIGHT;
      },
      didDrawCell: data => {
        if (data.section === 'body' && data.column.index === 5) {
          const row = dayRows[data.row.index];
          drawSignature(doc, row.record?.signatureDataUrl, data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      },
    });

    const tableEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    let footerY = tableEnd + 8;
    if (footerY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage('a4', 'portrait');
      footerY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(
      `Days attended: ${counts.attended}   ·   Late: ${counts.late}   ·   Exceptions: ${counts.exceptions}   ·   Absent: ${counts.absent}`,
      12,
      footerY
    );
    doc.setFont('helvetica', 'normal');
    drawSignOff(doc, footerY + 16, preparedBy);
  });

  addPageNumbers(doc, getZimbabweTimestamp());
  saveDoc(doc, `Econet_Monthly_Register_${month}.pdf`);
  return rows.length;
};
