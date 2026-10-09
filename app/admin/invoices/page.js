'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/invoices?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function remove(inv) {
    const msg = inv.status === 'active'
      ? `Delete ${inv.invoiceNumber}? Its items will be returned to inventory.`
      : `Delete cancelled invoice ${inv.invoiceNumber}? (Stock was already returned when it was cancelled.)`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/admin/invoices/${inv._id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvoices((list) => list.filter((x) => x._id !== inv._id));
    } else {
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}
      alert(data.error || `Failed to delete (${res.status})`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-xl font-medium" style={{ color: INK }}>Invoices</h1>
        <Link
          href="/admin/invoices/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
          style={{ background: INK, color: GOLD, borderRadius: 4 }}
        >
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      <div className="relative mb-4 sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: INK_SOFT }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search number, name or phone"
          className="w-full pl-9 pr-3 py-2 text-base sm:text-sm outline-none"
          style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}
        />
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {loading && <p className="text-sm text-center py-6" style={{ color: INK_SOFT }}>Loading…</p>}
        {!loading && invoices.length === 0 && <p className="text-sm text-center py-6" style={{ color: INK_SOFT }}>No invoices yet</p>}
        {invoices.map((inv) => (
          <Link key={inv._id} href={`/admin/invoices/${inv._id}`} className="block p-3" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{inv.invoiceNumber}</span>
              <span className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-xs capitalize" style={{ borderRadius: 3, background: inv.status === 'active' ? '#F6EFD9' : '#EEE', color: inv.status === 'active' ? INK : INK_SOFT }}>{inv.status}</span>
                <button
                  type="button"
                  aria-label="Delete invoice"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(inv); }}
                  className="p-1"
                  style={{ color: INK_SOFT }}
                >
                  <Trash2 size={17} />
                </button>
              </span>
            </div>
            <div className="text-sm mt-1">{inv.customer?.name} <span style={{ color: INK_SOFT }}>{inv.customer?.phone}</span></div>
            <div className="flex justify-between text-xs mt-1" style={{ color: INK_SOFT }}>
              <span>{new Date(inv.createdAt).toLocaleDateString('en-IN')} · <span className="capitalize">{inv.paymentMethod}</span></span>
              <span className="text-sm font-medium" style={{ color: INK }}>₹{inv.total?.toLocaleString('en-IN')}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#FAFAFA', color: INK_SOFT }} className="text-left">
              {['Invoice', 'Customer', 'Date', 'Payment', 'Total', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: INK_SOFT }}>Loading…</td></tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: INK_SOFT }}>No invoices yet</td></tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv._id} style={{ borderTop: `1px solid ${LINE}` }}>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/admin/invoices/${inv._id}`} style={{ color: INK }} className="underline-offset-2 hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {inv.customer?.name}
                  <div className="text-xs" style={{ color: INK_SOFT }}>{inv.customer?.phone}</div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-2.5 capitalize">{inv.paymentMethod} · {inv.paymentStatus}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">₹{inv.total?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="px-2 py-0.5 text-xs capitalize"
                    style={{
                      borderRadius: 3,
                      background: inv.status === 'active' ? '#F6EFD9' : '#EEE',
                      color: inv.status === 'active' ? INK : INK_SOFT,
                    }}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" aria-label="Delete invoice" onClick={() => remove(inv)} className="p-1 hover:opacity-70" style={{ color: INK_SOFT }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}