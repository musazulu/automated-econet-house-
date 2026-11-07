/**
 * CSV Generation & Download Utilities
 * With RFC 4180 standard escaping and CSV Formula Injection Protection
 */

/**
 * Escapes individual CSV cell to prevent spreadsheet formula injection (=, +, -, @)
 * and properly quote fields containing commas, newlines, or quotes.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // Security check: Formula injection protection
  // If the string starts with =, +, -, @, \t, \r, prepend a single quote so Excel/Sheets treats it as plain text
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Build CSV string from headers and row objects
 */
export function buildCsvString(headers: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(h => escapeCsvCell(h.label)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(h => escapeCsvCell(row[h.key] ?? '')).join(',');
  });

  // Include UTF-8 BOM so Excel opens accents and special characters cleanly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Trigger immediate browser download of CSV file
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
