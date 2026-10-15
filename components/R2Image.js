/**
 * Responsive image served straight from Cloudflare R2 (no Vercel optimizer).
 *
 * Accepts either:
 *  - a "base" from uploadImage() (no file extension) -> renders 400w/1200w WebP srcset
 *  - a legacy full URL (ends in .jpg/.png/.webp/...) -> renders a plain <img>
 *
 * <R2Image src={item.image} width={800} height={600} alt={item.title} />
 * Use `priority` only on above-the-fold images (hero / first row).
 */
const HAS_EXT = /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i;

export default function R2Image({
  base,
  src,
  alt = '',
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  ...props
}) {
  const input = base || src;
  if (!input) return null;

  const common = {
    alt,
    width,
    height,
    loading: priority ? 'eager' : 'lazy',
    fetchPriority: priority ? 'high' : 'auto',
    decoding: 'async',
    ...props,
  };

  // Legacy image (or local /public file like /placeholder.png): plain single URL
  if (HAS_EXT.test(input)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={input} {...common} />;
  }

  // New upload: `input` is the base URL without extension
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${input}-1200.webp`}
      srcSet={`${input}-400.webp 400w, ${input}-1200.webp 1200w`}
      sizes={sizes}
      {...common}
    />
  );
}