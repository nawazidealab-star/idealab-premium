import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { CircleDollarSign, WalletCards } from 'lucide-react';
import { adminApi, type D1Result } from './admin-api';
import { CURRENCIES, formatCurrencyTotals, formatMoney, groupCurrencyTotals } from './currencies';
import './currency-support.css';

type InvoiceRow = {
  id: number;
  invoice_no: string;
  status: string;
  amount: number;
  currency: string;
};

function enhanceCurrencyInputs() {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('.il-admin-form label'));
  for (const label of labels) {
    const text = (label.childNodes[0]?.textContent || '').trim().toLowerCase();
    if (text !== 'currency') continue;
    const input = label.querySelector<HTMLInputElement>('input');
    if (!input) continue;
    input.setAttribute('list', 'idealab-currency-options');
    input.setAttribute('maxlength', '3');
    input.setAttribute('placeholder', 'USD, PKR, AUD...');
    input.setAttribute('autocomplete', 'off');
    input.classList.add('il-currency-input');
  }
}

export default function CurrencySupport() {
  const location = useLocation();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    enhanceCurrencyInputs();
    const observer = new MutationObserver(() => enhanceCurrencyInputs());
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  const needsFinancialSummary = location.pathname === '/admin' || location.pathname === '/admin/invoices';

  useEffect(() => {
    setPortalTarget(document.querySelector('.il-admin-content'));
    if (!needsFinancialSummary) {
      setInvoices([]);
      delete document.documentElement.dataset.multiCurrencyDashboard;
      delete document.documentElement.dataset.multiCurrencyInvoices;
      return;
    }

    let active = true;
    adminApi<D1Result<InvoiceRow>>('/api/invoices')
      .then((result) => {
        if (active) setInvoices(result.results || []);
      })
      .catch(() => {
        if (active) setInvoices([]);
      });
    return () => { active = false; };
  }, [location.pathname, needsFinancialSummary]);

  const paidTotals = useMemo(
    () => groupCurrencyTotals(invoices.filter((row) => row.status === 'paid'), (row) => row.amount, (row) => row.currency),
    [invoices],
  );
  const outstandingTotals = useMemo(
    () => groupCurrencyTotals(invoices.filter((row) => row.status === 'sent' || row.status === 'due'), (row) => row.amount, (row) => row.currency),
    [invoices],
  );
  const allTotals = useMemo(
    () => groupCurrencyTotals(invoices.filter((row) => row.status !== 'void'), (row) => row.amount, (row) => row.currency),
    [invoices],
  );

  const currencyCount = new Set(invoices.map((row) => (row.currency || 'USD').toUpperCase())).size;
  const isMixed = currencyCount > 1;

  useEffect(() => {
    if (location.pathname === '/admin' && isMixed) document.documentElement.dataset.multiCurrencyDashboard = 'true';
    else delete document.documentElement.dataset.multiCurrencyDashboard;

    if (location.pathname === '/admin/invoices' && isMixed) document.documentElement.dataset.multiCurrencyInvoices = 'true';
    else delete document.documentElement.dataset.multiCurrencyInvoices;
  }, [location.pathname, isMixed]);

  const summary = needsFinancialSummary && invoices.length && portalTarget ? createPortal(
    <section className={`il-currency-summary ${isMixed ? 'is-mixed' : ''}`}>
      <div className="il-currency-summary-head">
        <div>
          <span className="il-currency-kicker"><WalletCards size={14} /> Multi-currency ledger</span>
          <h3>{isMixed ? 'Financial totals by currency' : 'Financial currency summary'}</h3>
          <p>{isMixed ? 'Currencies are kept separate—no misleading cross-currency addition.' : 'Financial records are tracked in their original currency.'}</p>
        </div>
        <span className="il-currency-count">{currencyCount || 1} currenc{currencyCount === 1 ? 'y' : 'ies'}</span>
      </div>
      <div className="il-currency-total-grid">
        <div>
          <span><CircleDollarSign size={16} /> Paid revenue</span>
          <b>{formatCurrencyTotals(paidTotals, formatMoney(0, invoices[0]?.currency || 'USD'))}</b>
        </div>
        <div>
          <span>Outstanding</span>
          <b>{formatCurrencyTotals(outstandingTotals, formatMoney(0, invoices[0]?.currency || 'USD'))}</b>
        </div>
        {location.pathname === '/admin/invoices' && <div>
          <span>All non-void invoices</span>
          <b>{formatCurrencyTotals(allTotals, formatMoney(0, invoices[0]?.currency || 'USD'))}</b>
        </div>}
      </div>
    </section>,
    portalTarget,
  ) : null;

  return (
    <>
      <datalist id="idealab-currency-options">
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>{currency.name} ({currency.symbol})</option>
        ))}
      </datalist>
      {summary}
    </>
  );
}
