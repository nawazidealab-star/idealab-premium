import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WalletCards } from 'lucide-react';
import { CURRENCIES, getDefaultCurrency, setDefaultCurrency } from './currencies';
import './global-currency-picker.css';

function applyDefaultToNewCurrencyFields(code: string) {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('.il-admin-form label'));
  for (const label of labels) {
    const text = (label.childNodes[0]?.textContent || '').trim().toLowerCase();
    if (text !== 'currency') continue;
    const input = label.querySelector<HTMLInputElement>('input');
    if (!input) continue;

    const container = input.closest('.il-admin-modal, .il-admin-lead-form');
    const heading = container?.querySelector('h3')?.textContent?.toLowerCase() || '';
    if (heading.includes('edit')) continue;
    if (input.value && input.value !== 'USD') continue;

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, code);
    else input.value = code;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export default function GlobalCurrencyPicker() {
  const [currency, setCurrency] = useState(getDefaultCurrency());
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    const findTarget = () => setTarget(document.querySelector('.il-premium-top-actions'));
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDefaultCurrency(currency);
    applyDefaultToNewCurrencyFields(currency);
    const observer = new MutationObserver(() => applyDefaultToNewCurrencyFields(currency));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currency]);

  if (!target) return null;

  return createPortal(
    <label className="il-global-currency" title="Default currency for new financial records">
      <WalletCards size={15} />
      <span>Currency</span>
      <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
        {CURRENCIES.map((item) => (
          <option key={item.code} value={item.code}>{item.code}</option>
        ))}
      </select>
    </label>,
    target,
  );
}
