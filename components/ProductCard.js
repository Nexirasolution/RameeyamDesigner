'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getVariantTotalStock } from '@/lib/stock';
import { useWishlist } from '@/components/WhishlistContext'; // adjust path as needed

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const GOLD_WASH = '#F6EFD9';
const PAPER = '#FFFFFF';
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function ProductCard({ product }) {
  const { isWishlisted, toggleWishlist } = useWishlist();

  const variant = product.variants?.[0];
  const image = variant?.images?.[0] || '/placeholder.png';
  const price = product.basePrice || variant?.price || 0;
  const compareAt = variant?.compareAtPrice || 0;
  const discountPct = compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const totalStock = getVariantTotalStock(variant);
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;

  const wishlistId = product.id ?? product._id ?? product.slug;
  const wishlisted = isWishlisted(wishlistId);
  const href = `/product/${product.slug}`;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(wishlistId);
  };

  return (
    <div style={{ background: PAPER, fontFamily: FONT_SANS }}>
      {/* Image */}
      <div className="relative">
        <Link href={href} className="block" aria-label={product.name}>
          <div className="relative aspect-[3/4] overflow-hidden" style={{ background: GOLD_WASH }}>
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={`object-cover ${outOfStock ? 'grayscale opacity-70' : ''}`}
            />
          </div>
        </Link>

        {/* Status badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          {outOfStock ? (
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: PAPER, background: INK_SOFT, padding: '5px 12px', borderRadius: '999px' }}
            >
              Out of stock
            </span>
          ) : lowStock ? (
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: PAPER, background: INK, padding: '5px 12px', borderRadius: '999px' }}
            >
              {totalStock} left
            </span>
          ) : discountPct > 0 ? (
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: INK, background: GOLD, padding: '5px 12px', borderRadius: '999px' }}
            >
              Sale
            </span>
          ) : null}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full transition-transform active:scale-90"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(2px)' }}
        >
          <Heart
            className="w-4 h-4"
            strokeWidth={2}
            style={{ color: wishlisted ? GOLD : INK }}
            fill={wishlisted ? GOLD : 'none'}
          />
        </button>
      </div>

      {/* Title + price */}
      <Link href={href} className="block pt-3">
        <h3
          className="text-[13px] sm:text-sm font-medium line-clamp-2"
          style={{ color: INK, lineHeight: 1.375, minHeight: '2.75em' }}
        >
          {product.name}
        </h3>

        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-base sm:text-lg" style={{ color: INK }}>
            {formatINR(price)}
          </span>
          {compareAt > price && (
            <span className="text-xs sm:text-sm line-through font-light" style={{ color: INK_SOFT }}>
              {formatINR(compareAt)}
            </span>
          )}
          {discountPct > 0 && (
            <span className="text-xs font-medium" style={{ color: INK }}>
              Save {discountPct}%
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}