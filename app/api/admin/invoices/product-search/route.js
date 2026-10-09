import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';

// GET ?category=<id|all>&q=<text>
export async function GET(req) {
  await dbConnect();
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') || '').trim();
  const category = sp.get('category');
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const filter = { isActive: true };
  if (q) filter.$or = [{ name: new RegExp(esc, 'i') }, { sku: new RegExp(esc, 'i') }];
  if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  const products = await Product.find(filter)
    .select('name sku variants sleeveOptions zipOptions pantOptions shawlOptions')
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();
  return NextResponse.json({ products });
}