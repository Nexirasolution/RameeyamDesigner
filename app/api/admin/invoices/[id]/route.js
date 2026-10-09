import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { restoreStock } from '@/lib/invoice';

export async function GET(_req, { params }) {
  await dbConnect();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const invoice = await Invoice.findById(id).select('-stockOps').lean();
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ invoice });
}

// PATCH { action: 'cancel' } — cancels the invoice and returns its stock to inventory.
export async function PATCH(req, { params }) {
  await dbConnect();
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'cancel') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  // Atomic status flip guarantees stock is restored only once, even on double-clicks.
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!invoice) return NextResponse.json({ error: 'Invoice not found or already cancelled' }, { status: 400 });

  await restoreStock(invoice.stockOps || []);
  return NextResponse.json({ ok: true });
}

// DELETE — removes the invoice. If it was still active, its stock goes back to
// inventory (a cancelled invoice already restocked, so nothing more is added).
export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Atomic delete: only one request can ever get the document back, so stock is restored once.
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const restocked = invoice.status === 'active';
    if (restocked) await restoreStock(invoice.stockOps || []);
    return NextResponse.json({ ok: true, restocked });
  } catch (err) {
    console.error('Invoice delete failed:', err);
    return NextResponse.json({ error: `Failed to delete invoice: ${err.message}` }, { status: 500 });
  }
}