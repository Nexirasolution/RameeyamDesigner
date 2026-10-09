import mongoose from 'mongoose';
import Product from '@/models/Product';
import Counter from '@/models/Counter';

export class InvoiceError extends Error {}

const oid = (v) => new mongoose.Types.ObjectId(String(v));

export async function nextInvoiceNumber() {
  const c = await Counter.findOneAndUpdate(
    { key: 'invoice' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `INV-${String(c.seq).padStart(5, '0')}`;
}

// Validates each line against the live DB and returns invoice lines + the
// stock operations needed. Does NOT touch stock.
export async function buildInvoiceLines(items) {
  if (!Array.isArray(items) || !items.length) throw new InvoiceError('Add at least one item');

  const lines = [];
  const stockOps = [];

  for (const item of items) {
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) throw new InvoiceError('Quantity must be a whole number ≥ 1');
    if (!mongoose.Types.ObjectId.isValid(item.productId) || !mongoose.Types.ObjectId.isValid(item.variantId)) {
      throw new InvoiceError('Invalid product in invoice');
    }

    const product = await Product.findById(item.productId);
    if (!product) throw new InvoiceError('A product on this invoice no longer exists');
    const variant = product.variants.id(item.variantId);
    if (!variant) throw new InvoiceError(`${product.name}: variant not found`);
    const sizeEntry = variant.sizes.find((s) => s.size === item.size);
    if (!sizeEntry) throw new InvoiceError(`${product.name}: size ${item.size} not found`);
    if (sizeEntry.stock < qty) {
      throw new InvoiceError(`${product.name} (${variant.color}, ${item.size}) — only ${sizeEntry.stock} in stock`);
    }

    const sleeveType = item.sleeveType || '';
    const zipType = item.zipType || '';
    if (product.sleeveOptions?.length && !product.sleeveOptions.includes(sleeveType)) {
      throw new InvoiceError(`${product.name} — select a sleeve type`);
    }
    if (product.zipOptions?.length && !product.zipOptions.includes(zipType)) {
      throw new InvoiceError(`${product.name} — select a zip type`);
    }

    let pant = null;
    if (item.pantOptionId) {
      pant = product.pantOptions?.id(item.pantOptionId);
      if (!pant) throw new InvoiceError(`${product.name} — pant option not found`);
      if (pant.stock < qty) throw new InvoiceError(`${product.name} — ${pant.name} (pant) only ${pant.stock} in stock`);
    }
    let shawl = null;
    if (item.shawlOptionId) {
      shawl = product.shawlOptions?.id(item.shawlOptionId);
      if (!shawl) throw new InvoiceError(`${product.name} — shawl option not found`);
      if (shawl.stock < qty) throw new InvoiceError(`${product.name} — ${shawl.name} (shawl) only ${shawl.stock} in stock`);
    }

    const listPrice = variant.price + (pant?.price || 0) + (shawl?.price || 0);
    const hasOverride = item.price !== undefined && item.price !== null && item.price !== '';
    const price = hasOverride ? Number(item.price) : listPrice;
    if (!Number.isFinite(price) || price < 0) throw new InvoiceError('Invalid price');

    lines.push({
      product: product._id,
      variantId: variant._id,
      name: product.name,
      sku: sizeEntry.sku || product.sku || '',
      color: variant.color,
      size: item.size,
      sleeveType,
      zipType,
      pantOption: pant ? { optionId: pant._id, name: pant.name, price: pant.price, sku: pant.sku || '' } : null,
      shawlOption: shawl ? { optionId: shawl._id, name: shawl.name, price: shawl.price, sku: shawl.sku || '' } : null,
      listPrice,
      price,
      qty,
      lineTotal: price * qty,
    });
    stockOps.push({
      productId: String(product._id),
      variantId: String(variant._id),
      size: item.size,
      pantOptionId: pant ? String(pant._id) : null,
      shawlOptionId: shawl ? String(shawl._id) : null,
      qty,
    });
  }
  return { lines, stockOps };
}

function incUpdate(op, sign) {
  const inc = { 'variants.$[v].sizes.$[s].stock': sign * op.qty };
  const arrayFilters = [{ 'v._id': oid(op.variantId) }, { 's.size': op.size }];
  if (op.pantOptionId) {
    inc['pantOptions.$[p].stock'] = sign * op.qty;
    arrayFilters.push({ 'p._id': oid(op.pantOptionId) });
  }
  if (op.shawlOptionId) {
    inc['shawlOptions.$[w].stock'] = sign * op.qty;
    arrayFilters.push({ 'w._id': oid(op.shawlOptionId) });
  }
  return { update: { $inc: inc }, options: { arrayFilters } };
}

// Atomically deducts stock. Each line uses a conditional update (stock >= qty),
// so two simultaneous sales can never oversell. If any line fails, every line
// already applied is rolled back.
export async function deductStock(stockOps) {
  const applied = [];
  for (const op of stockOps) {
    const filter = {
      _id: oid(op.productId),
      variants: {
        $elemMatch: {
          _id: oid(op.variantId),
          sizes: { $elemMatch: { size: op.size, stock: { $gte: op.qty } } },
        },
      },
    };
    if (op.pantOptionId) filter.pantOptions = { $elemMatch: { _id: oid(op.pantOptionId), stock: { $gte: op.qty } } };
    if (op.shawlOptionId) filter.shawlOptions = { $elemMatch: { _id: oid(op.shawlOptionId), stock: { $gte: op.qty } } };

    const { update, options } = incUpdate(op, -1);
    const res = await Product.updateOne(filter, update, options);
    if (res.matchedCount === 0) {
      await restoreStock(applied);
      throw new InvoiceError('Stock changed while creating the invoice — an item no longer has enough stock. Please retry.');
    }
    applied.push(op);
  }
}

export async function restoreStock(stockOps) {
  for (const op of stockOps) {
    const { update, options } = incUpdate(op, +1);
    await Product.updateOne({ _id: oid(op.productId) }, update, options);
  }
}