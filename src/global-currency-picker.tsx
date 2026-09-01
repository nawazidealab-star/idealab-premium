import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WalletCards } from 'lucide-react';
import { CURRENCIES, CURRENCY_EVENT, getDefaultCurrency, setDefaultCurrency } from './currencies';
import './global-currency-picker.css';

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
    const sync = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === 'string' && next !== currency) setCurrency(next);
    };
    window.addEventListener(CURRENCY_EVENT, sync);
    return () => window.removeEventListener(CURRENCY_EVENT, sync);
  }, [currency]);

  if (!target) return null;

  return createPortal(
    <label className="il-global-currency" title="Display currency and default currency for new financial records">
      <WalletCards size={15} />
      <span>Currency</span>
      <select value={currency} onChange={(event) => { const next = event.target.value; setCurrency(next); setDefaultCurrency(next); }}>
        {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
      </select>
    </label>,
    target,
  );
}
