import mongoose from 'mongoose';

const addonSchema = new mongoose.Schema(
  { optionId: mongoose.Schema.Types.ObjectId, name: String, price: Number, sku: String },
  { _id: false }
);

const invoiceItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: mongoose.Schema.Types.ObjectId,
    name: String,
    sku: String,
    color: String,
    size: String,
    sleeveType: { type: String, default: '' },
    zipType: { type: String, default: '' },
    pantOption: { type: addonSchema, default: null },
    shawlOption: { type: addonSchema, default: null },
    listPrice: Number, // system price (variant + add-ons)
    price: Number,     // price actually charged (admin may override)
    qty: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      gstin: { type: String, default: '' },
    },
    items: [invoiceItemSchema],
    subtotal: Number,
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: Number,
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'other'], default: 'cash' },
    paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active', index: true },
    cancelledAt: Date,
    // What was deducted from inventory — used to restore stock on cancel.
    stockOps: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);