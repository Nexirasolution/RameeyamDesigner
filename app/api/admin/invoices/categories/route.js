import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';

export async function GET() {
  await dbConnect();
  const categories = await Category.find({}).select('name').sort({ name: 1 }).lean();
  return NextResponse.json({ categories });
}