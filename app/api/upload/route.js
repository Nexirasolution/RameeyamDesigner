import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Newer AWS SDK versions add checksum headers that break presigned PUTs on R2
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const WIDTHS = [400, 1200];
const MAX_BYTES = 2 * 1024 * 1024; // each variant is pre-compressed, so 2 MB is generous

// Replace with your real auth check (NextAuth, Clerk, Supabase, etc.)
async function isAuthorized(req) {
  // const session = await getServerSession(authOptions);
  // return !!session;
  return true; // TODO: do NOT leave this open in production
}

export async function POST(req) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sizes, folder: rawFolder } = body || {};

  for (const w of WIDTHS) {
    const s = sizes?.[w];
    if (!Number.isInteger(s) || s <= 0 || s > MAX_BYTES) {
      return NextResponse.json({ error: `Invalid size for ${w}` }, { status: 400 });
    }
  }

  const folder =
    String(rawFolder || 'uploads')
      .replace(/[^a-zA-Z0-9_\-/]/g, '')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+|\/+$/g, '') || 'uploads';

  const id = randomUUID();
  const base = `${folder}/${id}`;

  try {
    const uploadUrls = {};
    for (const w of WIDTHS) {
      uploadUrls[w] = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: `${base}-${w}.webp`,
          ContentType: 'image/webp',
          ContentLength: sizes[w], // signed, so the client can't upload a bigger file
        }),
        { expiresIn: 60 }
      );
    }

    return NextResponse.json({
      uploadUrls,
      base: `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${base}`, // save this in your DB
    });
  } catch (err) {
    console.error('Presign failed:', err);
    return NextResponse.json({ error: 'Could not create upload URLs' }, { status: 500 });
  }
}