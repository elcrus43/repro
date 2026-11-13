/* global process */
/**
 * api/developer-lots.js - Unified Vercel Serverless Function for all 7 Kirov Developers
 *
 * Фасадный эндпоинт доступа к живым лотам застройщиков:
 *   GET  /api/developer-lots?provider=ksm|kssk|kino|avitek|altai|stroysoyuz|profstroy&projectSlug=...
 *   POST /api/developer-lots?provider=... { action: 'list' | 'syncProject', projectSlug: '...' }
 *
 * Обратная совместимость с path-based запросами:
 *   GET /api/ksm-lots  -> rewrite в vercel.json -> /api/developer-lots?provider=ksm
 */

import ksmHandler from './_ksm-lots.js';
import ksskHandler from './_kssk-lots.js';
import kinoHandler from './_kino-lots.js';
import avitekHandler from './_avitek-lots.js';
import altaiHandler from './_altai-lots.js';
import stroysoyuzHandler from './_stroysoyuz-lots.js';
import profstroyHandler from './_profstroy-lots.js';

export const config = {
  maxDuration: 60,
};

const HANDLERS = {
  ksm: ksmHandler,
  kssk: ksskHandler,
  kino: kinoHandler,
  avitek: avitekHandler,
  altai: altaiHandler,
  stroysoyuz: stroysoyuzHandler,
  profstroy: profstroyHandler,
};

export default async function handler(req, res) {
  const provider = (
    req.query?.provider ||
    req.body?.provider ||
    req.headers['x-developer-provider'] ||
    ''
  ).toString().toLowerCase().trim();

  const targetHandler = HANDLERS[provider];
  if (!targetHandler) {
    return res.status(400).json({
      data: null,
      error: `Неизвестный провайдер застройщика: "${provider}". Доступны: ${Object.keys(HANDLERS).join(', ')}`,
    });
  }

  return targetHandler(req, res);
}
