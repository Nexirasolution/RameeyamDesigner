import './globals.css';
import { Playfair_Display, Poppins } from 'next/font/google';
import { unstable_cache } from 'next/cache';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WhishlistContext';
// import BottomNav from '@/components/BottomNav';
import { dbConnect } from '@/lib/mongodb';
import Settings from '@/models/Settings';

// `display: 'swap'` shows text immediately in a fallback font while the web
// font loads (better for Core Web Vitals, which Google uses for ranking).
const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
  display: 'swap',
});
const body = Poppins({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const SITE_NAME = 'Rameeyam Designer';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rameeyam.com').replace(/\/$/, '');

// Add your real profile links; they are used for the Organization structured data
const SOCIAL_LINKS = [
  // 'https://www.instagram.com/yourhandle',
  // 'https://www.facebook.com/yourpage',
];

const DEFAULT_TITLE = 'Rameeyam Designer - Women Kurtis, Nighties & More';
const DEFAULT_DESCRIPTION =
  'Shop authentic women kurtis, nighties, innerwear and trending collections online from Rameeyam Designer.';

// Before, this ran a database query for every uncached page render.
// Now it is cached for an hour and only reads the two fields it uses.
// After editing SEO settings in your admin, call revalidateTag('settings').
const getSeoSettings = unstable_cache(
  async () => {
    await dbConnect();
    const s = await Settings.findOne({ key: 'global' }).select('seoTitle seoDescription').lean();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  },
  ['seo-settings'],
  { revalidate: 3600, tags: ['settings'] }
);

export async function generateMetadata() {
  let settings = null;
  try {
    settings = await getSeoSettings();
  } catch {
    settings = null;
  }

  const title = settings?.seoTitle || DEFAULT_TITLE;
  const description = settings?.seoDescription || DEFAULT_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    keywords: ['women kurtis online', 'nighties online', 'innerwear online', SITE_NAME, 'women fashion'],

    // './' resolves to each page's own URL, so every page gets a correct canonical
    // (stops sorted/paginated/tracking URLs from competing with the main page)
    alternates: { canonical: './' },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    openGraph: {
      title,
      description,
      url: '/',
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      // Put a 1200x630 image at public/og-default.jpg (used when a page has no image of its own)
      images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: SITE_NAME }],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-default.jpg'],
    },

    icons: { icon: '/favicon.ico' },

    // Optional: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to verify Search Console
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8B0000', // browser toolbar colour on mobile; change to match your brand
};

// Structured data: helps Google understand the brand and show it correctly in results
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`, // make sure public/logo.png exists
      ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'en-IN',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
      <body
        className={`${display.variable} ${body.variable} font-body antialiased`}
        style={{ background: '#fdf5f5' }}
      >
        <script
          type="application/ld+json"
          // `<` is escaped so the JSON can never close the script tag early
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, '\\u003c') }}
        />

        <CartProvider>
          <WishlistProvider>
            {children}

            {/* spacer so page content isn't hidden behind the fixed mobile nav */}
            <div className="md:hidden h-16" />

            {/* <BottomNav /> */}
          </WishlistProvider>
        </CartProvider>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              background: '#fff',
              color: '#8B0000',
              border: '1.5px solid #C9A84C',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
            },
            success: {
              iconTheme: {
                primary: '#8B0000',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#C9A84C',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}