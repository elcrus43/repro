/* global process */
/**
 * scripts/tiktok-daily-report.js
 *
 * Ручной запуск ежедневного TikTok-дайджеста: собирает данные, кладёт markdown
 * в .notes/tiktok-trends/YYYY-MM-DD.md и присылает короткую версию в Telegram.
 *
 *   node scripts/tiktok-daily-report.js              # собрать + отправить + файл
 *   node scripts/tiktok-daily-report.js --dry-run    # только показать в консоли
 *   node scripts/tiktok-daily-report.js --no-send    # файл без отправки
 *   node scripts/tiktok-daily-report.js --no-file    # только отправка
 *   node scripts/tiktok-daily-report.js --direct     # достать подписи нишевых роликов с TikTok
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  collectTiktokReport,
  buildTelegramMessage,
  buildMarkdownReport,
  sendToTelegram,
  fetchHtml,
} from '../api/_tiktok-report.js';

dotenv.config();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = new Set(process.argv.slice(2));

function toDayKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function main() {
  // --direct: тянуть подписи нишевых роликов напрямую с TikTok. С российского IP
  // они не отдаются (ru_cross_border_block), проверено локально; со стороны Vercel
  // cron делает это всегда.
  const report = await collectTiktokReport(
    flags.has('--direct') ? { fetchVideo: fetchHtml } : {}
  );
  const chunks = buildTelegramMessage(report);

  console.log(chunks.join('\n\n────────\n\n'));

  if (report.errors.length) {
    console.warn('\n[warn] без данных:', report.errors.join('; '));
  }

  if (!flags.has('--dry-run') && !flags.has('--no-file')) {
    const dir = path.join(ROOT, '.notes', 'tiktok-trends');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${toDayKey(report.date)}.md`);
    fs.writeFileSync(file, buildMarkdownReport(report), { encoding: 'utf8' });
    console.log(`\n[ok] сохранено: ${path.relative(ROOT, file)}`);
  }

  if (flags.has('--dry-run') || flags.has('--no-send')) {
    console.log('[skip] отправка в Telegram не выполнена');
    return;
  }

  const botToken = process.env.TELEGRAM_SECURITY_BOT_TOKEN || process.env.ALERT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SECURITY_CHAT_ID || process.env.REALTOR_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('[error] не заданы TELEGRAM_SECURITY_BOT_TOKEN / TELEGRAM_SECURITY_CHAT_ID в .env');
    process.exitCode = 1;
    return;
  }

  const sent = await sendToTelegram(report, { botToken, chatId });
  console.log(`[ok] отправлено частей: ${sent}`);
}

main().catch((err) => {
  console.error('[error]', err);
  process.exitCode = 1;
});
