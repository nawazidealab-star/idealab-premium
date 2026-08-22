export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

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

export function getDefaultCurrency() {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  const saved = window.localStorage.getItem('idealab-default-currency');
  return CURRENCIES.some((currency) => currency.code === saved) ? saved! : DEFAULT_CURRENCY;
}

export function setDefaultCurrency(code: string) {
  if (typeof window === 'undefined') return;
  if (CURRENCIES.some((currency) => currency.code === code)) {
    window.localStorage.setItem('idealab-default-currency', code);
  }
}

export function currencyLabel(code: string) {
  const currency = CURRENCIES.find((item) => item.code === code);
  return currency ? `${currency.code} — ${currency.name}` : code;
}

export function formatMoney(value: number, currency = DEFAULT_CURRENCY) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

export function groupCurrencyTotals<T>(rows: T[], amount: (row: T) => number, currency: (row: T) => string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const code = (currency(row) || DEFAULT_CURRENCY).toUpperCase();
    totals.set(code, (totals.get(code) || 0) + Number(amount(row) || 0));
  }
  return Array.from(totals.entries())
    .map(([code, total]) => ({ code, total }))
    .sort((a, b) => b.total - a.total);
}

export function formatCurrencyTotals(totals: Array<{ code: string; total: number }>, empty = '—') {
  if (!totals.length) return empty;
  return totals.map(({ code, total }) => formatMoney(total, code)).join(' · ');
}
