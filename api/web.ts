import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({});
const bucket = process.env.WEB_BUCKET ?? '';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function contentType(key: string): string {
  const dot = key.lastIndexOf('.');
  return dot >= 0 ? MIME_TYPES[key.slice(dot).toLowerCase()] ?? 'application/octet-stream' : 'application/octet-stream';
}

function objectKey(rawPath: string): string {
  const clean = rawPath.split('?')[0].replace(/^\/+/, '');
  if (!clean || clean.endsWith('/')) return `${clean}index.html`.replace(/^\/+/, '');
  return clean;
}

export const handler = async (event: any) => {
  if (!bucket) {
    return { statusCode: 500, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: 'WEB_BUCKET no configurado' };
  }

  const rawPath = event?.rawPath ?? event?.path ?? '/';
  let key = objectKey(rawPath);

  try {
    let response;
    try {
      response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error: any) {
      // SPA fallback: unknown browser routes are rendered by index.html.
      if (error?.name !== 'NoSuchKey' && error?.$metadata?.httpStatusCode !== 404) throw error;
      key = 'index.html';
      response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    }

    const bytes = response.Body ? await response.Body.transformToByteArray() : new Uint8Array();
    const body = Buffer.from(bytes).toString('base64');
    const isHtml = key.endsWith('.html');

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'content-type': response.ContentType || contentType(key),
        'cache-control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
      },
      body,
    };
  } catch (error) {
    console.error('Error sirviendo archivo GÓTITA:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: 'No se pudo cargar GÓTITA',
    };
  }
};
