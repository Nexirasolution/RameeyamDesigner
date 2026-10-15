import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import ProductCard from '@/components/ProductCard';
import Filters from '@/components/Filters';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';

// NOTE: this page reads searchParams, so Next.js renders it per request no matter what.
// The savings come from caching the DATABASE work below (unstable_cache), so most
// visits run zero queries. `export const dynamic = 'force-dynamic'` is removed.

// White, black and gold palette (matches the other pages)
const PAPER = '#FFFFFF';
const BLACK = '#004225';
const GREY = '#5E5E5E';      // secondary text on white
const GOLD = '#C9A24B';      // rules and accents
const GOLD_DEEP = '#8C6A12'; // gold text on white (readable contrast)
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

const PAGE_SIZE = 24;
const MAX_PAGE = 500;

const SORT_MAP = {
  newest: { createdAt: -1 },
  priceLow: { basePrice: 1 },
  priceHigh: { basePrice: -1 },
  popular: { soldCount: -1 },
  rating: { rating: -1 },
};

// Cached for 5 minutes per (sort, page) combination.
// To refresh instantly after an admin change, call in your admin API routes:
//   revalidateTag('products'); revalidatePath('/products');
const getProducts = unstable_cache(
  async (sort, page) => {
    await dbConnect();

    const query = { isActive: true };
    // _id tie-breaker keeps pagination stable when many products share a sort value
    const sortStage = { ...SORT_MAP[sort], _id: -1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        // Only what ProductCard renders. Only the first variant is sent, not all of them.
        .select({ name: 1, slug: 1, basePrice: 1, variants: { $slice: 1 } })
        .sort(sortStage)
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      products: JSON.parse(JSON.stringify(products)), // plain values for the client
      total,
    };
  },
  ['products-list'],
  { revalidate: 300, tags: ['products'] }
);

export const metadata = {
  title: 'All Products | Mohith Trends',
};

function pageHref(sort, page) {
  const params = new URLSearchParams();
  if (sort !== 'newest') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products';
}

export default async function ProductsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams; // Next.js 15: searchParams is a Promise

  // Whitelist the sort value so random query strings can't create endless cache entries
  const rawSort = resolvedSearchParams?.sort;
  const sort = SORT_MAP[rawSort] ? rawSort : 'newest';

  const rawPage = parseInt(resolvedSearchParams?.page, 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1;

  const { products, total } = await getProducts(sort, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkStyle = { border: `1px solid ${GOLD}`, color: BLACK };

  return (
    <section className="max-w-6xl mx-auto px-5 py-16" style={{ background: PAPER }}>
      <div
        className="mb-8 pb-5 flex items-baseline justify-between flex-wrap gap-3"
        style={{ borderBottom: `1px solid ${GOLD}` }}
      >
        <h1
          className="text-3xl sm:text-4xl tracking-tight"
          style={{ fontFamily: FONT_SERIF, color: BLACK, fontWeight: 400 }}
        >
          All Products
        </h1>
        <span className="text-xs tracking-wide" style={{ color: GOLD_DEEP }}>
          {total} {total === 1 ? 'item' : 'items'}
        </span>
      </div>

      <Filters sort={sort} />

      {products.length === 0 ? (
        <p className="text-sm" style={{ color: GREY }}>
          Nothing here yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10 mt-6">
          {products.map((p, i) => (
            // First row loads eagerly (helps the main image show faster); the rest are lazy
            <ProductCard key={p._id} product={p} priority={page === 1 && i < 2} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-12 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[2px]"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link href={pageHref(sort, page - 1)} className="px-5 py-2.5" style={linkStyle}>
              ← Prev
            </Link>
          ) : (
            <span className="px-5 py-2.5 opacity-30" style={linkStyle}>← Prev</span>
          )}

          <span style={{ color: GREY }}>
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={pageHref(sort, page + 1)} className="px-5 py-2.5" style={linkStyle}>
              Next →
            </Link>
          ) : (
            <span className="px-5 py-2.5 opacity-30" style={linkStyle}>Next →</span>
          )}
        </nav>
      )}
    </section>
  );
}