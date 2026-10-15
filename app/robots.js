const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rameeyam.com').replace(/\/$/, '');

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or useless-for-search paths. Adjust to match your real routes.
        // (Don't block /_next/ — Google needs your JS and CSS to render pages.)
        disallow: ['/api/', '/admin', '/cart', '/checkout'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}