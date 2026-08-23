import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { adminApi, type D1Result } from './admin-api';
import './invoice-pdf-support.css';

type InvoiceRow = {
  id: number;
  client_id: number;
  client_name?: string | null;
  invoice_no: string;
  status: string;
  amount: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at?: string | null;
};

type ClientRow = {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
};

type PortalTarget = {
  invoice: InvoiceRow;
  element: HTMLElement;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function dateLabel(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch('/idealab-logo.jpg', { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateInvoicePdf(invoice: InvoiceRow, client?: ClientRow) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const right = pageWidth - margin;
  const dark = '#111318';
  const muted = '#69707A';
  const border = '#E5E7EB';
  const soft = '#F6F7F9';

  doc.setFillColor(dark);
  doc.rect(0, 0, pageWidth, 43, 'F');

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, 'JPEG', margin, 10, 23, 23, undefined, 'FAST'); } catch { /* text fallback */ }
  }

  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('IDEA LAB', logo ? margin + 29 : margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Creative & Digital Operations', logo ? margin + 29 : margin, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('INVOICE', right, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_no, right, 25, { align: 'right' });
  doc.text(invoice.status.replaceAll('_', ' ').toUpperCase(), right, 31, { align: 'right' });

  let y = 57;
  doc.setTextColor(muted);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);
  doc.text('INVOICE DETAILS', 118, y);

  y += 7;
  doc.setTextColor(dark);
  doc.setFontSize(11.5);
  doc.text(client?.name || invoice.client_name || 'Client', margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const clientLines = [client?.company, client?.email, client?.phone, client?.country].filter(Boolean) as string[];
  for (const line of clientLines.slice(0, 4)) {
    y += 5;
    doc.text(line, margin, y);
  }

  const detailY = 64;
  doc.setFontSize(9);
  doc.setTextColor(muted);
  doc.text('Issue date', 118, detailY);
  doc.text('Due date', 118, detailY + 7);
  doc.text('Currency', 118, detailY + 14);
  doc.text('Status', 118, detailY + 21);
  doc.setTextColor(dark);
  doc.setFont('helvetica', 'bold');
  doc.text(dateLabel(invoice.created_at), right, detailY, { align: 'right' });
  doc.text(dateLabel(invoice.due_date), right, detailY + 7, { align: 'right' });
  doc.text((invoice.currency || 'USD').toUpperCase(), right, detailY + 14, { align: 'right' });
  doc.text(invoice.status.replaceAll('_', ' '), right, detailY + 21, { align: 'right' });

  const tableY = Math.max(105, y + 17);
  doc.setFillColor(soft);
  doc.roundedRect(margin, tableY, pageWidth - margin * 2, 12, 2, 2, 'F');
  doc.setTextColor(muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DESCRIPTION', margin + 5, tableY + 7.6);
  doc.text('QTY', 135, tableY + 7.6, { align: 'right' });
  doc.text('AMOUNT', right - 5, tableY + 7.6, { align: 'right' });

  const rowY = tableY + 22;
  doc.setTextColor(dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Professional services', margin + 5, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(muted);
  doc.text('IDEA LAB project / service invoice', margin + 5, rowY + 5);
  doc.setTextColor(dark);
  doc.setFontSize(9.5);
  doc.text('1', 135, rowY, { align: 'right' });
  doc.text(money(invoice.amount, invoice.currency || 'USD'), right - 5, rowY, { align: 'right' });

  doc.setDrawColor(border);
  doc.line(margin, rowY + 12, right, rowY + 12);

  const totalY = rowY + 27;
  doc.setTextColor(muted);
  doc.setFontSize(9);
  doc.text('Subtotal', 130, totalY);
  doc.text('Total', 130, totalY + 11);
  doc.setTextColor(dark);
  doc.text(money(invoice.amount, invoice.currency || 'USD'), right, totalY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(money(invoice.amount, invoice.currency || 'USD'), right, totalY + 11, { align: 'right' });

  let notesY = totalY + 29;
  if (invoice.notes?.trim()) {
    doc.setFillColor(soft);
    const noteLines = doc.splitTextToSize(invoice.notes.trim(), pageWidth - margin * 2 - 10) as string[];
    const noteHeight = Math.max(24, 14 + noteLines.length * 4.5);
    doc.roundedRect(margin, notesY, pageWidth - margin * 2, noteHeight, 2, 2, 'F');
    doc.setTextColor(muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('NOTES', margin + 5, notesY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(dark);
    doc.text(noteLines, margin + 5, notesY + 14);
    notesY += noteHeight + 8;
  }

  if (invoice.status === 'paid' && invoice.paid_at) {
    doc.setTextColor('#18794E');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`PAID - ${dateLabel(invoice.paid_at)}`, margin, notesY + 3);
  }

  doc.setDrawColor(border);
  doc.line(margin, pageHeight - 27, right, pageHeight - 27);
  doc.setTextColor(muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Thank you for working with IDEA LAB.', margin, pageHeight - 18);
  doc.text(`Invoice ${invoice.invoice_no}`, right, pageHeight - 18, { align: 'right' });

  doc.save(`${safeFilename(invoice.invoice_no || `invoice-${invoice.id}`)}.pdf`);
}

function mountTarget(container: HTMLElement, invoice: InvoiceRow, targets: PortalTarget[]) {
  let mount = container.querySelector<HTMLElement>('[data-invoice-pdf-mount]');
  if (!mount) {
    mount = document.createElement('span');
    mount.dataset.invoicePdfMount = 'true';
    mount.className = 'il-invoice-pdf-mount';
    container.appendChild(mount);
  }
  targets.push({ invoice, element: mount });
}

function findInvoiceTargets(invoices: InvoiceRow[]) {
  const byNumber = new Map(invoices.map((invoice) => [invoice.invoice_no.trim(), invoice]));
  const targets: PortalTarget[] = [];
  const seen = new Set<number>();

  // Current v2 invoice UI: card list.
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.il-v2-card-list article'));
  for (const card of cards) {
    const invoiceNo = card.querySelector('b')?.textContent?.trim();
    if (!invoiceNo) continue;
    const invoice = byNumber.get(invoiceNo);
    if (!invoice || seen.has(invoice.id)) continue;
    const directChildren = Array.from(card.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
    const actions = directChildren[directChildren.length - 1];
    if (!actions) continue;
    mountTarget(actions, invoice, targets);
    seen.add(invoice.id);
  }

  // Legacy table UI kept for backwards compatibility.
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('.il-admin-table tbody tr'));
  for (const row of rows) {
    const invoiceNo = row.querySelector<HTMLTableCellElement>('td:first-child')?.innerText.trim().split('\n')[0]?.trim();
    if (!invoiceNo) continue;
    const invoice = byNumber.get(invoiceNo);
    if (!invoice || seen.has(invoice.id)) continue;
    const cells = row.querySelectorAll<HTMLTableCellElement>('td');
    const actionCell = cells[cells.length - 1];
    if (!actionCell) continue;
    mountTarget(actionCell, invoice, targets);
    seen.add(invoice.id);
  }

  return targets;
}

export default function InvoicePdfSupport() {
  const location = useLocation();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [targets, setTargets] = useState<PortalTarget[]>([]);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  useEffect(() => {
    if (location.pathname !== '/admin/invoices') {
      setInvoices([]);
      setClients([]);
      setTargets([]);
      return;
    }

    let active = true;
    const load = () => Promise.all([
      adminApi<D1Result<InvoiceRow>>('/api/invoices'),
      adminApi<D1Result<ClientRow>>('/api/clients'),
    ]).then(([invoiceResult, clientResult]) => {
      if (!active) return;
      setInvoices(invoiceResult.results || []);
      setClients(clientResult.results || []);
    }).catch(() => {
      if (!active) return;
      setInvoices([]);
      setClients([]);
    });

    void load();
    const refresh = () => { void load(); };
    window.addEventListener('idealab:invoice-saved', refresh);
    return () => {
      active = false;
      window.removeEventListener('idealab:invoice-saved', refresh);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/admin/invoices') return;
    const sync = () => setTargets(findInvoiceTargets(invoices));
    const timer = window.setTimeout(sync, 50);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [location.pathname, invoices]);

  const download = async (invoice: InvoiceRow) => {
    if (generatingId !== null) return;
    setGeneratingId(invoice.id);
    try {
      await generateInvoicePdf(invoice, clientMap.get(invoice.client_id));
    } catch (error) {
      console.error('Invoice PDF generation failed', error);
      window.alert('PDF generation failed. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <>
      {targets.map(({ invoice, element }) => createPortal(
        <button
          key={invoice.id}
          type="button"
          className="il-admin-button il-invoice-pdf-button"
          onClick={() => void download(invoice)}
          disabled={generatingId === invoice.id}
          title={generatingId === invoice.id ? 'Generating PDF...' : 'Download PDF invoice'}
          aria-label={`Download ${invoice.invoice_no} PDF`}
        >
          <FileDown size={15} />
          <span>{generatingId === invoice.id ? 'Generating…' : 'PDF'}</span>
        </button>,
        element,
      ))}
    </>
  );
}
