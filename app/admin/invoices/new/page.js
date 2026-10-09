'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, X, Minus, Plus } from 'lucide-react';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const GOLD_WASH = '#F6EFD9';
const LINE = '#E8E8E8';

const inputStyle = { border: `1px solid ${LINE}`, borderRadius: 4 };
const inputCls = 'w-full px-3 py-2 text-base sm:text-sm outline-none';

const img = (v) => v?.images?.[0] || '';
const totalStock = (v) => (v?.sizes || []).reduce((s, x) => s + (x.stock || 0), 0);

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: INK_SOFT }}>{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-2 sm:py-1.5 text-sm whitespace-nowrap shrink-0 disabled:opacity-40 disabled:line-through"
      style={{
        borderRadius: 4,
        border: `1px solid ${active ? INK : LINE}`,
        background: active ? INK : '#fff',
        color: active ? GOLD : INK,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Product picker modal: colour → size → qty → add ---------- */
function PickerModal({ product, onClose, onAdd }) {
  const firstVariant = product.variants?.find((v) => totalStock(v) > 0) || product.variants?.[0];
  const [variantId, setVariantId] = useState(firstVariant?._id);
  const variant = product.variants.find((v) => v._id === variantId);
  const [size, setSize] = useState(() => (firstVariant?.sizes.find((s) => s.stock > 0) || firstVariant?.sizes?.[0])?.size || '');
  const [sleeveType, setSleeveType] = useState('');
  const [zipType, setZipType] = useState('');
  const [pantOptionId, setPantOptionId] = useState('');
  const [shawlOptionId, setShawlOptionId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');

  const pant = product.pantOptions?.find((o) => o._id === pantOptionId);
  const shawl = product.shawlOptions?.find((o) => o._id === shawlOptionId);
  const sizeEntry = variant?.sizes.find((s) => s.size === size);
  const cap = Math.min(sizeEntry?.stock || 0, pant ? pant.stock || 0 : Infinity, shawl ? shawl.stock || 0 : Infinity);
  const list = (variant?.price || 0) + (pant?.price || 0) + (shawl?.price || 0);

  function chooseVariant(v) {
    setVariantId(v._id);
    setSize((v.sizes.find((s) => s.stock > 0) || v.sizes[0])?.size || '');
    setQty(1);
  }

  function add() {
    if (product.sleeveOptions?.length && !sleeveType) return setErr('Select a sleeve type');
    if (product.zipOptions?.length && !zipType) return setErr('Select a zip type');
    if (cap < 1) return setErr('Out of stock for this selection');
    onAdd({
      key: Math.random().toString(36).slice(2),
      productId: product._id,
      variantId,
      name: product.name,
      image: img(variant),
      color: variant.color,
      size,
      sleeveType,
      zipType,
      pantOptionId,
      shawlOptionId,
      addons: [pant && `Pant: ${pant.name}`, shawl && `Shawl: ${shawl.name}`].filter(Boolean).join(', '),
      qty,
      cap,
      listPrice: list,
      price,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-3" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-md">
        <div className="flex justify-between items-center px-4 py-3 sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="font-medium">{product.name}</div>
          <button onClick={onClose} style={{ color: INK_SOFT }}><X size={20} /></button>
        </div>

        <div className="p-4 grid sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <div className="h-52 sm:h-auto sm:aspect-[3/4] w-full overflow-hidden" style={{ background: '#F4F4F4', borderRadius: 4 }}>
              {img(variant) && <img src={img(variant)} alt={product.name} className="w-full h-full object-cover object-top" />}
            </div>
          </div>

          <div className="sm:col-span-3 space-y-4">
            <div>
              <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Colour — {variant?.color}</div>
              <div className="flex gap-2 flex-wrap">
                {product.variants.map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => chooseVariant(v)}
                    title={`${v.color} (${totalStock(v)} in stock)`}
                    className="w-14 h-16 overflow-hidden flex items-center justify-center text-[10px] text-center"
                    style={{ borderRadius: 4, border: `2px solid ${v._id === variantId ? GOLD : LINE}`, opacity: totalStock(v) ? 1 : 0.4 }}
                  >
                    {img(v) ? <img src={img(v)} alt={v.color} className="w-full h-full object-cover" /> : v.color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Size (stock shown)</div>
              <div className="flex gap-2 flex-wrap">
                {variant?.sizes.map((s) => (
                  <Chip key={s.size} active={s.size === size} disabled={!s.stock} onClick={() => { setSize(s.size); setQty(1); }}>
                    {s.size} · {s.stock}
                  </Chip>
                ))}
              </div>
            </div>

            {product.sleeveOptions?.length > 0 && (
              <div>
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Sleeve *</div>
                <div className="flex gap-2 flex-wrap">
                  {product.sleeveOptions.map((o) => <Chip key={o} active={o === sleeveType} onClick={() => setSleeveType(o)}>{o}</Chip>)}
                </div>
              </div>
            )}
            {product.zipOptions?.length > 0 && (
              <div>
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Zip *</div>
                <div className="flex gap-2 flex-wrap">
                  {product.zipOptions.map((o) => <Chip key={o} active={o === zipType} onClick={() => setZipType(o)}>{o}</Chip>)}
                </div>
              </div>
            )}
            {product.pantOptions?.length > 0 && (
              <div>
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Pant add-on</div>
                <div className="flex gap-2 flex-wrap">
                  <Chip active={!pantOptionId} onClick={() => { setPantOptionId(''); setQty(1); }}>None</Chip>
                  {product.pantOptions.map((o) => (
                    <Chip key={o._id} active={o._id === pantOptionId} disabled={!o.stock} onClick={() => { setPantOptionId(o._id); setQty(1); }}>
                      {o.name} +₹{o.price} · {o.stock}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {product.shawlOptions?.length > 0 && (
              <div>
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Shawl add-on</div>
                <div className="flex gap-2 flex-wrap">
                  <Chip active={!shawlOptionId} onClick={() => { setShawlOptionId(''); setQty(1); }}>None</Chip>
                  {product.shawlOptions.map((o) => (
                    <Chip key={o._id} active={o._id === shawlOptionId} disabled={!o.stock} onClick={() => { setShawlOptionId(o._id); setQty(1); }}>
                      {o.name} +₹{o.price} · {o.stock}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <div className="text-xs mb-1.5" style={{ color: INK_SOFT }}>Quantity (max {cap})</div>
                <div className="flex items-center" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
                  <button type="button" className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
                  <span className="w-10 text-center text-sm">{qty}</span>
                  <button type="button" className="px-3 py-2" onClick={() => setQty((q) => Math.min(cap || 1, q + 1))}><Plus size={14} /></button>
                </div>
              </div>
              <div className="w-36">
                <Field label={`Unit price (₹${list})`}>
                  <input type="number" min={0} className={inputCls} style={inputStyle} placeholder={String(list)} value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
              </div>
            </div>

            {err && <div className="text-sm px-3 py-2" style={{ background: GOLD_WASH, borderRadius: 4 }}>{err}</div>}

            <div className="sticky bottom-0 bg-white pt-2 pb-3 sm:pb-0">
              <button type="button" onClick={add} className="w-full py-3 text-sm font-medium" style={{ background: INK, color: GOLD, borderRadius: 4 }}>
                Add to invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function NewInvoicePage() {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', gstin: '' });
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [picking, setPicking] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('products'); // mobile only

  useEffect(() => {
    fetch('/api/admin/invoices/categories').then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingProducts(true);
      const res = await fetch(`/api/admin/invoices/product-search?category=${category}&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProducts(data.products || []);
      setLoadingProducts(false);
    }, 250);
    return () => clearTimeout(t);
  }, [category, q]);

  const unit = (l) => (l.price === '' ? l.listPrice : Number(l.price) || 0);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + unit(l) * l.qty, 0), [lines]);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = Math.round(subtotal - disc + (Number(shippingFee) || 0));

  const setQty = (key, qty) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(l.cap, qty)) } : l)));

  async function submit() {
    setError('');
    if (!customer.name.trim()) return setError('Customer name is required');
    if (!lines.length) return setError('Add at least one item');
    setSaving(true);
    const res = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          size: l.size,
          sleeveType: l.sleeveType,
          zipType: l.zipType,
          pantOptionId: l.pantOptionId || null,
          shawlOptionId: l.shawlOptionId || null,
          qty: l.qty,
          price: l.price,
        })),
        discount,
        shippingFee,
        paymentMethod,
        paymentStatus,
        notes,
      }),
    });
    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { /* server returned non-JSON */ }
    setSaving(false);
    if (!res.ok || !data.invoice) {
      return setError(data.error || `Server error (${res.status}). Check the terminal running "npm run dev" for the exact error.`);
    }
    router.push(`/admin/invoices/${data.invoice._id}`);
  }

  return (
    <div className="pb-24 lg:pb-0">
      <h1 className="text-xl font-medium mb-4" style={{ color: INK }}>New Invoice</h1>

      {/* Mobile tab switcher */}
      <div className="lg:hidden grid grid-cols-2 mb-4" style={{ border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden' }}>
        {[['products', 'Products'], ['invoice', `Invoice (${lines.length})`]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className="py-2.5 text-sm font-medium"
            style={{ background: tab === k ? INK : '#fff', color: tab === k ? GOLD : INK_SOFT }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-5 gap-6 items-start">
        {/* LEFT: category + product grid */}
        <div className={`min-w-0 lg:col-span-3 space-y-3 ${tab === 'invoice' ? 'hidden lg:block' : ''}`}>
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
            <Chip active={category === 'all'} onClick={() => setCategory('all')}>All</Chip>
            {categories.map((c) => (
              <Chip key={c._id} active={category === c._id} onClick={() => setCategory(c._id)}>{c.name}</Chip>
            ))}
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: INK_SOFT }} />
            <input className={`${inputCls} pl-9`} style={inputStyle} placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {loadingProducts && <p className="text-sm" style={{ color: INK_SOFT }}>Loading…</p>}
          {!loadingProducts && products.length === 0 && <p className="text-sm" style={{ color: INK_SOFT }}>No products found.</p>}

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:gap-3">
            {products.map((p) => {
              const v = p.variants?.[0];
              const stock = (p.variants || []).reduce((s, x) => s + totalStock(x), 0);
              return (
                <button
                  key={p._id}
                  type="button"
                  disabled={stock === 0}
                  onClick={() => setPicking(p)}
                  className="block w-full min-w-0 text-left disabled:opacity-50"
                  style={{ border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden' }}
                >
                  <div className="aspect-[3/4] w-full" style={{ background: '#F4F4F4' }}>
                    {img(v) && <img src={img(v)} alt={p.name} loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs truncate" style={{ color: INK_SOFT }}>
                      ₹{v?.price} · {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: invoice */}
        <div className={`min-w-0 lg:col-span-2 space-y-4 lg:sticky lg:top-4 ${tab === 'products' ? 'hidden lg:block' : ''}`}>
          <section className="p-4 space-y-3" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
            <h2 className="text-sm font-medium">Customer</h2>
            <input className={inputCls} style={inputStyle} placeholder="Name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} style={inputStyle} placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <input className={inputCls} style={inputStyle} placeholder="GSTIN (optional)" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} />
            </div>
            <input className={inputCls} style={inputStyle} placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <textarea rows={2} className={inputCls} style={inputStyle} placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </section>

          <section className="p-4 space-y-3" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
            <h2 className="text-sm font-medium">Items ({lines.length})</h2>
            {lines.length === 0 && <p className="text-sm" style={{ color: INK_SOFT }}>Tap a product on the left to add it.</p>}
            {lines.map((l) => (
              <div key={l.key} className="flex gap-3 pb-3" style={{ borderBottom: `1px solid ${LINE}` }}>
                <div className="w-14 h-[72px] shrink-0 overflow-hidden" style={{ background: '#F4F4F4', borderRadius: 4 }}>
                  {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div className="text-sm font-medium truncate">{l.name}</div>
                    <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} style={{ color: INK_SOFT }}><Trash2 size={15} /></button>
                  </div>
                  <div className="text-xs" style={{ color: INK_SOFT }}>
                    {[l.color, l.size, l.sleeveType, l.zipType, l.addons].filter(Boolean).join(' · ')}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
                      <button className="px-2 py-1" onClick={() => setQty(l.key, l.qty - 1)}><Minus size={12} /></button>
                      <span className="w-7 text-center text-sm">{l.qty}</span>
                      <button className="px-2 py-1" onClick={() => setQty(l.key, l.qty + 1)}><Plus size={12} /></button>
                    </div>
                    <div className="text-sm">₹{(unit(l) * l.qty).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="p-4 space-y-3" style={{ border: `1px solid ${LINE}`, borderRadius: 4 }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount (₹)"><input type="number" min={0} className={inputCls} style={inputStyle} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
              <Field label="Shipping (₹)"><input type="number" min={0} className={inputCls} style={inputStyle} value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} /></Field>
              <Field label="Payment method">
                <select className={inputCls} style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {['cash', 'upi', 'card', 'bank', 'other'].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} style={inputStyle} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </Field>
            </div>
            <textarea rows={2} className={inputCls} style={inputStyle} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="text-sm text-right space-y-1 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
              <div>Subtotal: ₹{subtotal.toLocaleString('en-IN')}</div>
              {disc > 0 && <div>Discount: −₹{disc.toLocaleString('en-IN')}</div>}
              {Number(shippingFee) > 0 && <div>Shipping: ₹{Number(shippingFee).toLocaleString('en-IN')}</div>}
              <div className="text-base font-medium">Total: ₹{total.toLocaleString('en-IN')}</div>
            </div>
          </section>

          {error && <div className="px-3 py-2 text-sm" style={{ background: GOLD_WASH, borderRadius: 4 }}>{error}</div>}

          <button onClick={submit} disabled={saving} className="w-full py-3 text-sm font-medium disabled:opacity-60" style={{ background: INK, color: GOLD, borderRadius: 4 }}>
            {saving ? 'Creating…' : 'Create Invoice & Reduce Stock'}
          </button>
        </div>
      </div>

      {/* Mobile sticky summary bar */}
      {tab === 'products' && lines.length > 0 && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-white"
          style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="text-sm">
            <div className="font-medium">{lines.length} item{lines.length > 1 ? 's' : ''}</div>
            <div style={{ color: INK_SOFT }}>₹{total.toLocaleString('en-IN')}</div>
          </div>
          <button type="button" onClick={() => { setTab('invoice'); window.scrollTo({ top: 0 }); }}
            className="px-5 py-2.5 text-sm font-medium" style={{ background: INK, color: GOLD, borderRadius: 4 }}>
            Review invoice
          </button>
        </div>
      )}

      {picking && (
        <PickerModal
          product={picking}
          onClose={() => setPicking(null)}
          onAdd={(line) => { setLines((ls) => [...ls, line]); setPicking(null); }}
        />
      )}
    </div>
  );
}