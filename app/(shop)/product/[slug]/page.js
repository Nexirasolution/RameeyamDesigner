import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import '@/models/Category'; // registers the Category schema — required for .populate('category')
import ProductClient from './ProductClient';

// Each product page is generated on first visit, then served from the CDN and
// refreshed in the background at most once a minute. Zero function time for
// most visitors, and no loading spinner (the data is already in the HTML).
export const revalidate = 60;

// Lets Next.js cache pages for slugs that weren't known at build time
export async function generateStaticParams() {
  return [];
}

const HAS_EXT = /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i;

const getProductData = unstable_cache(
  async (slug) => {
    await dbConnect();

    // ASSUMPTION: this mirrors what GET /api/products/[slug] returns.
    // Compare it with your API route and adjust the query if it does more.
    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug type sizeChart')
      .lean();

    if (!product) return null;

    const related = product.category?._id
      ? await Product.find({
          isActive: true,
          category: product.category._id,
          _id: { $ne: product._id },
        })
          // Only what ProductCard renders, and only the first variant
          .select({ name: 1, slug: 1, basePrice: 1, variants: { $slice: 1 } })
          .limit(4)
          .lean()
      : [];

    return JSON.parse(JSON.stringify({ product, related }));
  },
  ['product-detail'],
  { revalidate: 60, tags: ['products'] }
);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getProductData(slug); // deduped with the page's own call
  if (!data) return { title: 'Product not found' };

  const { product } = data;
  const first = product.variants?.[0]?.images?.[0];
  const ogImage = first ? (HAS_EXT.test(first) ? first : `${first}-1200.webp`) : undefined;

  return {
    title: `${product.name} | Mohith Trends`,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params; // Next.js 15: params is a Promise
  const data = await getProductData(slug);
  if (!data) notFound();

  return <ProductClient product={data.product} related={data.related} />;
}