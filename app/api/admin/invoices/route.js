import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { buildInvoiceLines, deductStock, restoreStock, nextInvoiceNumber, InvoiceError } from '@/lib/invoice';

// TODO: protect these routes the same way your other /api/admin/* routes are
// (e.g. verify the admin session cookie at the top of each handler).

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(req) {
  try {
    await dbConnect();
    const q = new URL(req.url).searchParams.get('q')?.trim();
    const filter = q
      ? {
          $or: [
            { invoiceNumber: new RegExp(esc(q), 'i') },
            { 'customer.name': new RegExp(esc(q), 'i') },
            { 'customer.phone': new RegExp(esc(q), 'i') },
          ],
        }
      : {};
    const invoices = await Invoice.find(filter)
      .select('invoiceNumber customer.name customer.phone total status paymentStatus paymentMethod createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error('Invoice list failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to load invoices' }, { status: 500 });
  }
}

export async function POST(req) {
  let stockOps = [];
  let deducted = false;
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));

    const customer = body.customer || {};
    if (!customer.name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const built = await buildInvoiceLines(body.items);
    stockOps = built.stockOps;

    const subtotal = built.lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = Math.min(Math.max(Number(body.discount) || 0, 0), subtotal);
    const shippingFee = Math.max(Number(body.shippingFee) || 0, 0);
    const total = Math.round(subtotal - discount + shippingFee);

    await deductStock(stockOps);
    deducted = true;

    const invoice = await Invoice.create({
      invoiceNumber: await nextInvoiceNumber(),
      customer: {
        name: customer.name.trim(),
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        gstin: customer.gstin || '',
      },
      items: built.lines,
      subtotal,
      discount,
      shippingFee,
      total,
      paymentMethod: body.paymentMethod || 'cash',
      paymentStatus: body.paymentStatus || 'paid',
      notes: body.notes || '',
      stockOps,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    // Invoice couldn't be saved after stock was taken → put the stock back.
    if (deducted) await restoreStock(stockOps).catch(() => {});
    if (err instanceof InvoiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Invoice create failed:', err);
    return NextResponse.json({ error: `Failed to create invoice: ${err.message}` }, { status: 500 });
  }
}