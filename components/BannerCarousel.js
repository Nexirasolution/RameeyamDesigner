'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import R2Image from '@/components/R2Image';

// Design tokens — shared black/white/gold system
const INK = '#000000';
const GOLD = '#C9A227';
const PAPER = '#FFFFFF';

const AUTOPLAY_MS = 4500;

export default function BannerCarousel({ banners }) {
  const count = banners?.length || 0;
  const [index, setIndex] = useState(0);

  // Only slides that have been shown (or are next in line) are put in the page.
  // Before, every banner image downloaded up front, competing with the first
  // one that the visitor actually sees.
  const [visited, setVisited] = useState(() => new Set([0]));

  useEffect(() => {
    if (count < 2) return;
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % count); // preload the upcoming slide
      return next;
    });
  }, [index, count]);

  // Autoplay: skipped for a single banner or reduced-motion users, and paused
  // while the tab is hidden (no wasted renders in background tabs).
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let timer;
    const start = () => {
      timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    };
    const stop = () => clearInterval(timer);
    const onVisibility = () => {
      stop();
      if (!document.hidden) start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count]);

  if (!count) return null;

  return (
    <section className="relative w-full overflow-hidden" style={{ background: PAPER }}>
      {/*
        One image for all screen sizes (recommended upload: 1920 x 810 px).
        The box keeps the same aspect ratio on every device, so on mobile it
        simply scales down and the WHOLE image stays visible.
        - mobile:  object-contain -> never crops, even if the ratio is slightly off
        - desktop: object-cover   -> fills the box edge to edge
      */}
      <div className="relative w-full aspect-[1920/810]">
        {banners.map((b, i) => (
          <Link
            key={b._id}
            href={b.link || '#'}
            className={`absolute inset-0 block transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${!b.link ? 'pointer-events-none' : ''}`}
            tabIndex={i === index ? 0 : -1}
            aria-hidden={i !== index}
          >
            {visited.has(i) && (
              <R2Image
                src={b.image}
                alt={b.title || 'Banner'}
                sizes="100vw"
                // The first banner is the page's main image: load it first, at high priority
                priority={i === 0}
                className="absolute inset-0 w-full h-full object-contain object-center sm:object-cover"
              />
            )}
          </Link>
        ))}

        {count > 1 && (
          <>
            {/* Arrows — white with a thin gold outline so they read on any banner image */}
            <button
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full transition z-10"
              style={{ background: PAPER, color: INK, border: `1px solid ${GOLD}` }}
              aria-label="Previous"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full transition z-10"
              style={{ background: PAPER, color: INK, border: `1px solid ${GOLD}` }}
              aria-label="Next"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>

            {/* Thin dash indicators */}
            <div className="absolute bottom-2 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className="rounded-full transition-all"
                  style={{
                    height: '3px',
                    width: i === index ? '22px' : '10px',
                    background: i === index ? GOLD : 'rgba(255,255,255,0.7)',
                    boxShadow: i === index ? '0 0 0 1px rgba(0,0,0,0.25)' : '0 0 0 1px rgba(0,0,0,0.15)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}