import imageCompression from 'browser-image-compression';

const WIDTHS = [400, 1200];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // reject huge originals before compressing

/**
 * Compresses an image into 400px + 1200px WebP variants, uploads both
 * directly to R2, and returns { base } to store in your database.
 */
export async function uploadImage(file, folder = 'uploads') {
  if (!file || !file.type.startsWith('image/')) throw new Error('Please select an image file');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Image is too large (max 15 MB)');

  const variants = {};
  for (const w of WIDTHS) {
    variants[w] = await imageCompression(file, {
      maxWidthOrHeight: w,
      maxSizeMB: w === 400 ? 0.1 : 0.5,
      fileType: 'image/webp',
      useWebWorker: true,
    });
  }

  const sizes = Object.fromEntries(WIDTHS.map((w) => [w, variants[w].size]));

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sizes, folder }),
  });
  if (!res.ok) throw new Error('Could not get upload URLs');
  const { uploadUrls, base } = await res.json();

  await Promise.all(
    WIDTHS.map(async (w) => {
      const put = await fetch(uploadUrls[w], {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: variants[w],
      });
      if (!put.ok) throw new Error(`Upload failed (${w}px)`);
    })
  );

  return { base };
}