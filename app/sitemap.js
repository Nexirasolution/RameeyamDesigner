import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Combo from '@/models/Combo';

// Rebuilt at most once an hour, so crawlers hitting /sitemap.xml cost almost nothing
export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rameeyam.com').replace(/\/$/, '');

export default async function sitemap() {
  const staticPages = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    await dbConnect();

    const [products, categories, combos] = await Promise.all([
      Product.find({ isActive: true }).select('slug updatedAt').limit(5000).lean(),
      Category.find({ isActive: true }).select('slug updatedAt').lean(),
      Combo.find({ isActive: true }).select('slug updatedAt').lean(),
    ]);

    return [
      ...staticPages,
      ...categories.map((c) => ({
        url: `${SITE_URL}/category/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${SITE_URL}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      })),
      ...combos.map((c) => ({
        url: `${SITE_URL}/combo/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      })),
    ];
  } catch {
    // If the database is unreachable, still return a valid sitemap
    return staticPages;
  }
}