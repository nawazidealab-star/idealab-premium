import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WalletCards } from 'lucide-react';
import { CURRENCIES, getDefaultCurrency, setDefaultCurrency } from './currencies';
import './global-currency-picker.css';

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyDefaultToCurrencyFields(code: string) {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('.il-admin-form label'));
  for (const label of labels) {
    const input = label.querySelector<HTMLInputElement>('input');
    if (!input) continue;
    const labelText = (label.textContent || '').trim().toLowerCase();
    if (!labelText.startsWith('currency')) continue;

    const modal = input.closest('.il-admin-modal, .il-admin-lead-form');
    const heading = modal?.querySelector('h3')?.textContent?.toLowerCase() || '';
    if (heading.includes('edit')) continue;

    if (!input.value || input.value.toUpperCase() === 'USD') {
      setReactInputValue(input, code);
    }
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
    applyDefaultToCurrencyFields(currency);
    window.dispatchEvent(new CustomEvent('idealab:currency-change', { detail: { currency } }));

    const observer = new MutationObserver(() => applyDefaultToCurrencyFields(currency));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currency]);

  if (!target) return null;

  return createPortal(
    <label className="il-global-currency" title="Default currency for new leads, projects and invoices">
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
