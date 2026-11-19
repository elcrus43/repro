/* global process */
/**
 * api/image-proxy.js - Vercel Serverless Function & Dev Proxy for external images
 *
 * Безопасное проксирование изображений планировок и фасадов застройщиков с добавлением CORS:
 *   GET /api/image-proxy?url=https://ksm-kirov.ru/upload/...
 */

export const config = {
  maxDuration: 15,
};

function isPrivateIpOrHost(hostname) {
  const lower = String(hostname || '').toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0.0.0.0'
  ) {
    return true;
  }
  if (/^10\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawUrl = (req.query?.url || '').toString().trim();
  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http and https protocols are supported' });
  }

  if (isPrivateIpOrHost(parsed.hostname)) {
    return res.status(403).json({ error: 'Access to local or private networks is prohibited' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`,
      },
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream error: ${upstream.status} ${upstream.statusText}`,
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(502).json({ error: `Proxy fetch failed: ${err.message}` });
  }
}
