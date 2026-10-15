import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import R2Image from '@/components/R2Image';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import CategoryFilters from './CategoryFilters';

// This page was a client component that made two fetches in a row from the
// browser (category, then up to 1000 products) on every visit and every sort
// change. Now the data is loaded on the server and cached, so most visits run
// zero database queries and the HTML arrives with the products already in it.
//
// (The page reads searchParams, so Next.js renders it per request; the savings
// come from the cached database work below.)

// White / black / gold theme
// black  #0A0A0A   gold  #C9A227   deep gold #A8861A
// gold wash #F7F0D8   line #E8E2D0   muted #5A5A5A
const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

const PAGE_SIZE = 24;
const MAX_PAGE = 500;

// Same sort options as the products page
const SORT_MAP = {
  newest: { createdAt: -1 },
  priceLow: { basePrice: 1 },
  priceHigh: { basePrice: -1 },
  popular: { soldCount: -1 },
  rating: { rating: -1 },
};

// ASSUMPTION: these flag -> field mappings match your /api/products route.
// (newarrival uses isActiveSeller, the same field the homepage uses for "New Arrivals".)
const FLAG_FIELD = {
  bestseller: 'isBestSeller',
  topseller: 'isTopSeller',
  newarrival: 'isActiveSeller',
};

const UI_SORTS = ['newest', 'priceLow', 'priceHigh', 'popular', 'rating', 'newarrival', 'bestselling'];

function flagToSortValue(flag) {
  if (flag === 'bestseller') return 'bestselling';
  if (flag === 'newarrival') return 'newarrival';
  return 'newest';
}

function sortToApiSort(sort) {
  if (sort === 'newarrival') return 'newest';
  if (sort === 'bestselling') return 'popular';
  return sort;
}

// Category + its subcategories. Cached for 5 minutes.
const getCategory = unstable_cache(
  async (slug) => {
    await dbConnect();
    const category = await Category.findOne({ slug, isActive: true })
      .populate('parent', 'name slug')
      .lean();
    if (!category) return null;

    const subcategories = await Category.find({ parent: category._id, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return JSON.parse(JSON.stringify({ category, subcategories }));
  },
  ['category-detail'],
  { revalidate: 300, tags: ['categories'] }
);

// Products for one category page. Cached per (slug, sort, flag, page).
// To refresh instantly after admin changes: revalidateTag('products'); revalidateTag('categories');
const getCategoryProducts = unstable_cache(
  async (slug, apiSort, flag, page) => {
    await dbConnect();

    const category = await Category.findOne({ slug, isActive: true }).select('_id').lean();
    if (!category) return { products: [], total: 0 };

    // ASSUMPTION: a category page also lists products from its subcategories.
    // Remove the next two lines (and use `category: category._id`) if yours shouldn't.
    const children = await Category.find({ parent: category._id }).select('_id').lean();
    const categoryIds = [category._id, ...children.map((c) => c._id)];

    const query = { isActive: true, category: { $in: categoryIds } };
    if (flag && FLAG_FIELD[flag]) query[FLAG_FIELD[flag]] = true;

    const sortStage = { ...SORT_MAP[apiSort], _id: -1 }; // _id keeps paging stable

    const [products, total] = await Promise.all([
      Product.find(query)
        // Only what ProductCard renders, and only the first variant
        .select({ name: 1, slug: 1, basePrice: 1, variants: { $slice: 1 } })
        .sort(sortStage)
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Product.countDocuments(query),
    ]);

    return { products: JSON.parse(JSON.stringify(products)), total };
  },
  ['category-products'],
  { revalidate: 300, tags: ['products'] }
);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getCategory(slug);
  if (!data) return { title: 'Category not found' };
  return {
    title: `${data.category.name} | Mohith Trends`,
    description: data.category.description?.slice(0, 160),
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;                 // Next.js 15: both are Promises
  const sp = (await searchParams) || {};

  // Whitelist every URL value so random query strings can't create endless cache entries
  const flag = FLAG_FIELD[sp.flag] ? sp.flag : '';
  const sort = UI_SORTS.includes(sp.sort) ? sp.sort : flagToSortValue(flag);
  const apiSort = SORT_MAP[sortToApiSort(sort)] ? sortToApiSort(sort) : 'newest';

  const rawPage = parseInt(sp.page, 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1;

  const catData = await getCategory(slug);
  if (!catData) notFound();
  const { category, subcategories } = catData;

  const { products, total } = await getCategoryProducts(slug, apiSort, flag, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const heading =
    flag === 'bestseller' ? `Best Sellers in ${category.name}` :
    flag === 'topseller' ? `Top Sellers in ${category.name}` :
    flag === 'newarrival' ? `New Arrivals in ${category.name}` :
    category.name;

  function pageHref(n) {
    const params = new URLSearchParams();
    if (flag) params.set('flag', flag);
    else if (sort !== 'newest') params.set('sort', sort);
    if (n > 1) params.set('page', String(n));
    const qs = params.toString();
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`;
  }

  return (
    <div className="bg-white text-[#0A0A0A]">

      {/* ── Header band ─────────────────────────────────────────── */}
      <header className="bg-[#0A0A0A] border-b-2 border-[#C9A227]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-8 sm:pb-10">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-xs text-white/60">
            <Link href="/" className="hover:text-[#C9A227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]">
              Home
            </Link>
            {category.parent && (
              <>
                <ChevronRight size={12} aria-hidden="true" />
                <Link
                  href={`/category/${category.parent.slug}`}
                  className="hover:text-[#C9A227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]"
                >
                  {category.parent.name}
                </Link>
              </>
            )}
            <ChevronRight size={12} aria-hidden="true" />
            <span className="text-white/90">{category.name}</span>
          </nav>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="max-w-2xl">
              <h1
                className="text-[28px] sm:text-4xl leading-tight text-white"
                style={{ fontFamily: FONT_SERIF }}
              >
                {heading}
              </h1>
              {category.description && (
                <p className="text-sm mt-2 text-white/65 leading-relaxed">{category.description}</p>
              )}
            </div>

            <p className="text-sm text-[#C9A227] shrink-0">
              {total} {total === 1 ? 'style' : 'styles'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Subcategories: arched tiles ───────────────────────── */}
        {subcategories.length > 0 && (
          <section aria-label="Subcategories" className="pt-8">
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 -mx-1 px-1">
              {subcategories.map((sub) => (
                <Link
                  key={sub._id}
                  href={`/category/${sub.slug}`}
                  className="group flex-shrink-0 w-24 sm:w-28 flex flex-col items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A227]"
                >
                  <div className="w-full aspect-[3/4] overflow-hidden rounded-t-full bg-[#F7F0D8] border border-[#E8E2D0] group-hover:border-[#C9A227]">
                    {sub.image && (
                      <R2Image
                        src={sub.image}
                        alt={sub.name}
                        sizes="112px"
                        className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight text-[#0A0A0A] group-hover:text-[#A8861A]">
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Toolbar: sort/filter ──────────────────────────────── */}
        <div className="mt-6 py-3 border-y border-[#E8E2D0]">
          <CategoryFilters sort={sort} />
        </div>

        {/* ── Product grid ──────────────────────────────────────── */}
        <div className="py-8 sm:py-10">
          {products.length === 0 ? (
            <div className="text-center py-16 sm:py-24 max-w-sm mx-auto">
              <ShoppingBag size={30} strokeWidth={1.5} className="mx-auto mb-4 text-[#C9A227]" />
              <p className="text-lg" style={{ fontFamily: FONT_SERIF }}>
                No products in this category yet
              </p>
              <p className="text-sm mt-1.5 text-[#5A5A5A]">
                New styles arrive every week. Browse the rest of the collection in the meantime.
              </p>
              <Link
                href="/"
                className="inline-block mt-6 px-6 py-3 text-sm font-medium bg-[#0A0A0A] text-white rounded-[4px] transition-colors hover:bg-[#C9A227] hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
              {products.map((p, i) => (
                <ProductCard key={p._id} product={p} priority={page === 1 && i < 2} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[2px]"
              aria-label="Pagination"
            >
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="px-5 py-2.5 border border-[#C9A227] text-[#0A0A0A]">
                  ← Prev
                </Link>
              ) : (
                <span className="px-5 py-2.5 border border-[#C9A227] opacity-30">← Prev</span>
              )}

              <span className="text-[#5A5A5A]">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="px-5 py-2.5 border border-[#C9A227] text-[#0A0A0A]">
                  Next →
                </Link>
              ) : (
                <span className="px-5 py-2.5 border border-[#C9A227] opacity-30">Next →</span>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}