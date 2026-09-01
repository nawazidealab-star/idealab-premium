export type CurrencyOption = { code: string; name: string; symbol: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
];

export const DEFAULT_CURRENCY = 'USD';
export const CURRENCY_EVENT = 'idealab:currency-change';

export function normalizeCurrency(code: string | null | undefined) {
  const normalized = String(code || DEFAULT_CURRENCY).trim().toUpperCase();
  return CURRENCIES.some((currency) => currency.code === normalized) ? normalized : DEFAULT_CURRENCY;
}

export function getDefaultCurrency() {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  return normalizeCurrency(window.localStorage.getItem('idealab-default-currency'));
}

export function setDefaultCurrency(code: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeCurrency(code);
  window.localStorage.setItem('idealab-default-currency', normalized);
  window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: normalized }));
}

export function currencyLabel(code: string) {
  const normalized = normalizeCurrency(code);
  const currency = CURRENCIES.find((item) => item.code === normalized);
  return currency ? `${currency.code} — ${currency.name}` : normalized;
}

export function formatMoney(value: number, currency = DEFAULT_CURRENCY) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  const code = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(safeValue);
  } catch {
    return `${code} ${safeValue.toLocaleString(undefined,{maximumFractionDigits:2})}`;
  }
}

export function groupCurrencyTotals<T>(rows: T[], amount: (row: T) => number, currency: (row: T) => string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const code = normalizeCurrency(currency(row));
    const numeric = Number(amount(row));
    if (!Number.isFinite(numeric)) continue;
    totals.set(code, (totals.get(code) || 0) + numeric);
  }
  return Array.from(totals.entries()).map(([code, total]) => ({ code, total })).sort((a, b) => b.total - a.total);
}

export function formatCurrencyTotals(totals: Array<{ code: string; total: number }>, empty = '—') {
  if (!totals.length) return empty;
  return totals.map(({ code, total }) => formatMoney(total, code)).join(' · ');
}

export type FxRates = Record<string, number>;
export function convertMoney(amount: number, from: string, to: string, rates?: FxRates | null) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  const source = normalizeCurrency(from);
  const target = normalizeCurrency(to);
  if (source === target) return numeric;
  const sourceRate = Number(rates?.[source]);
  const targetRate = Number(rates?.[target]);
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) return null;
  const converted = numeric / sourceRate * targetRate;
  return Number.isFinite(converted) ? converted : null;
}
