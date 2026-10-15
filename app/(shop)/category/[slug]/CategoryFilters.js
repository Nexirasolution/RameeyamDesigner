'use client';

import { useRouter, usePathname } from 'next/navigation';
import Filters from '@/components/Filters';

// The server page can't pass a function to Filters, so this small client
// wrapper turns a sort change into a URL update. The server then renders
// (and caches) the right products for that URL.
//
// Same rules as before:
//  - "New arrivals"  -> ?flag=newarrival
//  - "Best selling"  -> ?flag=bestseller
//  - anything else   -> ?sort=<value> (and the flag is cleared)
export default function CategoryFilters({ sort }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSortChange(value) {
    const params = new URLSearchParams();
    if (value === 'newarrival') params.set('flag', 'newarrival');
    else if (value === 'bestselling') params.set('flag', 'bestseller');
    else if (value && value !== 'newest') params.set('sort', value);

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return <Filters sort={sort} onSortChange={handleSortChange} />;
}