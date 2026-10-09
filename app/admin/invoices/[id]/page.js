'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, Trash2 } from 'lucide-react';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/invoices/${id}`);
    if (res.ok) setInv((await res.json()).invoice);
    else setError('Invoice not found');
  }
  useEffect(() => { load(); }, [id]);

  async function cancelInvoice() {
    if (!confirm('Cancel this invoice? All items will be returned to inventory.')) return;
    setBusy(true);
    const res = await fetch(`/api/admin/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    setBusy(false);
    if (res.ok) load();
    else setError((await res.json()).error || 'Failed to cancel');
  }

  async function deleteInvoice() {
    const msg = inv.status === 'active'
      ? 'Delete this invoice? Its items will be returned to inventory.'
      : 'Delete this cancelled invoice? (Stock was already returned when it was cancelled.)';
    if (!confirm(msg)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/invoices');
    } else {
      setBusy(false);
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}
      setError(data.error || `Failed to delete (${res.status})`);
    }
  }

  if (error && !inv) return <p>{error}</p>;
  if (!inv) return <p style={{ color: INK_SOFT }}>Loading…</p>;

  return (
    <div className="max-w-3xl">
      {/* Hide admin sidebar/topbar and action buttons when printing */}
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>

      <div className="no-print flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Link href="/admin/invoices" className="flex items-center gap-1.5 text-sm" style={{ color: INK_SOFT }}>
          <ArrowLeft size={16} /> All invoices
        </Link>
        <div className="flex gap-2">
          {inv.status === 'active' && (
            <button onClick={cancelInvoice} disabled={busy} className="px-4 py-2 text-sm" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
              {busy ? 'Cancelling…' : 'Cancel & restock'}
            </button>
          )}
          <button onClick={deleteInvoice} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm" style={{ border: `1px solid ${LINE}`, borderRadius: 4, color: '#B42318' }}>
            <Trash2 size={16} /> Delete
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium" style={{ background: INK, color: GOLD, borderRadius: 4 }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
      {error && <p className="no-print text-sm mb-3">{error}</p>}

      <div className="p-4 sm:p-8 bg-white relative" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
        {inv.status === 'cancelled' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl sm:text-6xl font-bold -rotate-12" style={{ color: 'rgba(0,0,0,0.08)' }}>CANCELLED</span>
          </div>
        )}

        <div className="flex justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="text-lg font-medium">Rameeyam Designer</div>
            <div className="text-xs tracking-widest uppercase" style={{ color: INK_SOFT }}>Invoice</div>
          </div>
          <div className="text-sm text-right">
            <div className="font-medium">{inv.invoiceNumber}</div>
            <div style={{ color: INK_SOFT }}>{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div className="capitalize" style={{ color: INK_SOFT }}>{inv.paymentMethod} · {inv.paymentStatus}</div>
          </div>
        </div>

        <div className="text-sm mb-6">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: INK_SOFT }}>Billed to</div>
          <div className="font-medium">{inv.customer.name}</div>
          {inv.customer.phone && <div>{inv.customer.phone}</div>}
          {inv.customer.email && <div>{inv.customer.email}</div>}
          {inv.customer.address && <div className="whitespace-pre-line">{inv.customer.address}</div>}
          {inv.customer.gstin && <div>GSTIN: {inv.customer.gstin}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: `1px solid ${INK}` }}>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 pl-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td className="py-2 pr-2">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs" style={{ color: INK_SOFT }}>
                      {[it.sku, it.color, it.size, it.sleeveType, it.zipType].filter(Boolean).join(' · ')}
                      {it.pantOption && ` · Pant: ${it.pantOption.name}`}
                      {it.shawlOption && ` · Shawl: ${it.shawlOption.name}`}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">₹{it.price.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right">{it.qty}</td>
                  <td className="py-2 pl-2 text-right whitespace-nowrap">₹{it.lineTotal.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-right space-y-1 mt-4">
          <div>Subtotal: ₹{inv.subtotal.toLocaleString('en-IN')}</div>
          {inv.discount > 0 && <div>Discount: −₹{inv.discount.toLocaleString('en-IN')}</div>}
          {inv.shippingFee > 0 && <div>Shipping: ₹{inv.shippingFee.toLocaleString('en-IN')}</div>}
          <div className="text-base font-medium pt-1">Total: ₹{inv.total.toLocaleString('en-IN')}</div>
        </div>

        {inv.notes && <p className="text-sm mt-6" style={{ color: INK_SOFT }}>Note: {inv.notes}</p>}
      </div>
    </div>
  );
}