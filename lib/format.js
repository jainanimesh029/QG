/** Indian-style money: ₹11,342.00 */
export function formatINR(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Dates are stored as UTC midnight, so always format in UTC to avoid off-by-one days. */
export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Value for <input type="date"> (yyyy-mm-dd) from an ISO string / Date. */
export function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export function todayInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysInput(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function pdfFileName(quotation) {
  const clean = (s) =>
    String(s || '')
      .replace(/[\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return `${clean(quotation.quotationId)}_${clean(quotation.clientName)}.pdf`;
}
