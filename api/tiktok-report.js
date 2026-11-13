/* global process */
/**
 * api/tiktok-report.js - Vercel Cron: ежедневный TikTok-дайджест в Telegram
 *
 *   GET /api/tiktok-report          - по cron, собирает отчёт и шлёт в Telegram
 *   GET /api/tiktok-report?dry=1    - собрать и вернуть текстом, без отправки
 *
 * Авторизация: CRON_SECRET через `Authorization: Bearer <CRON_SECRET>`,
 * заголовок `x-cron-secret` или `?secret=<CRON_SECRET>` - как в api/cron-lots.js.
 *
 * Секреты только без VITE_-префикса (AGENTS.md, п.5):
 *   TELEGRAM_SECURITY_BOT_TOKEN / ALERT_BOT_TOKEN
 *   TELEGRAM_SECURITY_CHAT_ID   / REALTOR_CHAT_ID
 */

import {
  collectTiktokReport,
  buildTelegramMessage,
  sendToTelegram,
  isAuthorizedCronRequest,
  fetchHtml,
} from './_tiktok-report.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthorizedCronRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const botToken = process.env.TELEGRAM_SECURITY_BOT_TOKEN || process.env.ALERT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SECURITY_CHAT_ID || process.env.REALTOR_CHAT_ID;
  const dryRun = String(req.query?.dry || '') === '1';

  try {
    // С Vercel-эгресса TikTok отдаёт подписи роликов напрямую - с российского IP нет.
    const report = await collectTiktokReport({ fetchVideo: fetchHtml });

    if (dryRun) {
      res.status(200).json({
        date: report.dateLabel,
        chunks: buildTelegramMessage(report),
        errors: report.errors,
      });
      return;
    }

    if (!botToken || !chatId) {
      res.status(400).json({ error: 'Telegram-секреты не настроены', errors: report.errors });
      return;
    }

    const sent = await sendToTelegram(report, { botToken, chatId });
    res.status(200).json({
      status: 'ok',
      sent,
      top: report.top ? { author: report.top.author, gained: report.top.gainedLabel } : null,
      errors: report.errors,
    });
  } catch (err) {
    console.error('[tiktok-report]', err);
    res.status(500).json({ error: err.message });
  }
}
