/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel's image optimizer is fully off: zero Image Optimization usage,
  // and the /_next/image abuse path is closed. Images are pre-sized WebP on Cloudflare R2.
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;