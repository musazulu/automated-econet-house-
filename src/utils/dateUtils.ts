/**
 * Zimbabwe Africa/Harare (CAT, UTC+2) Date & Time Utilities
 */

export const ZIMBABWE_TZ = 'Africa/Harare';

/**
 * Get current date in Zimbabwe timezone in YYYY-MM-DD format
 */
export function getZimbabweDate(dateObj: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZIMBABWE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(dateObj); // YYYY-MM-DD
  } catch {
    return dateObj.toISOString().split('T')[0];
  }
}

/**
 * Get current time in Zimbabwe timezone in HH:mm:ss format
 */
export function getZimbabweTime(dateObj: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZIMBABWE_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(dateObj);
  } catch {
    return dateObj.toTimeString().split(' ')[0];
  }
}

/**
 * Full timestamp in Zimbabwe format: e.g. "2026-10-14 08:30:15 CAT"
 */
export function getZimbabweTimestamp(dateObj: Date = new Date()): string {
  return `${getZimbabweDate(dateObj)} ${getZimbabweTime(dateObj)} (CAT)`;
}

/**
 * Calculate difference in hours between two HH:mm:ss strings
 */
export function calculateHoursWorked(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  try {
    const [h1 = 0, m1 = 0, s1 = 0] = clockIn.split(':').map(Number);
    const [h2 = 0, m2 = 0, s2 = 0] = clockOut.split(':').map(Number);
    const startSeconds = h1 * 3600 + m1 * 60 + s1;
    const endSeconds = h2 * 3600 + m2 * 60 + s2;
    if (endSeconds <= startSeconds) return 0;
    const hours = (endSeconds - startSeconds) / 3600;
    return Math.round(hours * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Check if a time string is later than the cutoff string (e.g. "08:15:00" vs "08:15:00")
 */
export function isTimeLate(timeStr: string | null, cutoffStr: string = '08:15:00'): boolean {
  if (!timeStr) return false;
  try {
    const [h1, m1] = timeStr.split(':').map(Number);
    const [h2, m2] = cutoffStr.split(':').map(Number);
    return h1 > h2 || (h1 === h2 && m1 > m2);
  } catch {
    return false;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: 'USD' | 'ZiG' = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : 'ZiG ';
  return `${symbol}${amount.toFixed(2)}`;
}
