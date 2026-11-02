/**
 * format.ts — one authority for how a number or a date is printed.
 *
 * The CS Dashboard declares small `fmt*` helpers per page, which is fine when
 * the figures are decorative. Here they are the product: a weight shown to two
 * decimals on one screen and three on another is a weight someone will dispute,
 * so money and kilograms are formatted in exactly one place.
 *
 * Two rules carried over from that app, both of which exist because of IST:
 *   - a date-only string is parsed as `new Date(iso + 'T00:00:00')`, never
 *     `new Date(iso)`, which would read it as UTC and shift the day;
 *   - "today" comes from `todayIso()`, never `toISOString()`, for the same reason.
 */

const EN_IN = 'en-IN';

// --- Money -----------------------------------------------------------------

/** `₹1,23,456.78` — lakh grouping, always two decimals. */
export function rupees(n: number | null | undefined, { sign = false } = {}) {
  const v = Number(n || 0);
  const body = Math.abs(v).toLocaleString(EN_IN, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  return `${prefix}₹${body}`;
}

/** `₹1.23 L` / `₹45,600` — for tiles, where two decimals are noise. */
export function rupeesShort(n: number | null | undefined) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  const prefix = v < 0 ? '−₹' : '₹';
  if (abs >= 1e7) return `${prefix}${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${prefix}${(abs / 1e5).toFixed(2)} L`;
  return `${prefix}${Math.round(abs).toLocaleString(EN_IN)}`;
}

// --- Weight ----------------------------------------------------------------

/**
 * `1,234.500` — three decimals, because the trade settles in grams and a
 * rounded kilogram is a rounded invoice.
 */
export function kgs(n: number | null | undefined, { unit = true } = {}) {
  const v = Number(n || 0);
  const body = v.toLocaleString(EN_IN, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return unit ? `${body} kg` : body;
}

/** `1,234.5 kg` — trailing zeros dropped, for tiles and chips. */
export function kgsShort(n: number | null | undefined) {
  const v = Number(n || 0);
  return `${v.toLocaleString(EN_IN, { maximumFractionDigits: 2 })} kg`;
}

export function percent(n: number | null | undefined, dp = 2) {
  return `${Number(n || 0).toFixed(dp)}%`;
}

export const number = (n: number | null | undefined) => Number(n || 0).toLocaleString(EN_IN);

// --- Dates -----------------------------------------------------------------

/** Local YYYY-MM-DD. Never `toISOString()`, which shifts the day in IST. */
export function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Midnight-anchored, so day arithmetic never crosses a timezone boundary. */
const atMidnight = (iso: string) => new Date(`${iso}T00:00:00`);

export function daysBetween(iso: string, from = todayIso()) {
  return Math.round((atMidnight(iso).getTime() - atMidnight(from).getTime()) / 86_400_000);
}

/** `02 Nov 2026` */
export function fmtDate(iso: string) {
  if (!iso) return '';
  return atMidnight(iso).toLocaleDateString(EN_IN, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** `02 Nov` — for dense tables where the year is obvious from context. */
export function fmtDateShort(iso: string) {
  if (!iso) return '';
  return atMidnight(iso).toLocaleDateString(EN_IN, { day: '2-digit', month: 'short' });
}

/** `Today` / `Yesterday` / `02 Nov` — how a person reads a recent date. */
export function fmtDateRelative(iso: string) {
  if (!iso) return '';
  const n = daysBetween(iso);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n === 1) return 'Tomorrow';
  return fmtDateShort(iso);
}

/** `November 2026` from a `YYYY-MM` key. */
export function fmtMonth(key: string) {
  if (!key) return '';
  return atMidnight(`${key}-01`).toLocaleDateString(EN_IN, { month: 'long', year: 'numeric' });
}

/** The first and last day of the month a date falls in. */
export function monthBounds(iso = todayIso()) {
  const d = atMidnight(iso);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const pad = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { from: pad(first), to: pad(last) };
}

/** The Indian financial year (1 April – 31 March) containing `iso`. */
export function financialYearBounds(iso = todayIso()) {
  const d = atMidnight(iso);
  const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
    label: `FY ${String(startYear).slice(2)}–${String(startYear + 1).slice(2)}`,
  };
}
