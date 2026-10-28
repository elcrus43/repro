/**
 * api/security-alerts.js
 *
 * Модуль обнаружения и мгновенного оповещения об инцидентах безопасности:
 * 1. Запись инцидента в базу данных Neon (таблица app_errors).
 * 2. Мгновенная отправка экстренного алерта в Telegram администратору.
 * 3. Rate limiting сообщений для защиты от спама при автоматических сканированиях.
 */

import { neon } from '@neondatabase/serverless';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SECURITY_BOT_TOKEN || process.env.ALERT_BOT_TOKEN || '8944341501:AAGrqtVZRwfOQUjlOsYhnsmZsUMsGWu8rlY';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SECURITY_CHAT_ID || process.env.REALTOR_CHAT_ID || '263593715';
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

// Кэш для защиты от спама: не более 1 алерта каждые 3 секунды по ключу type+ip
const recentAlertsCache = new Map();
const ALERT_COOLDOWN_MS = 3000;

/**
 * Извлекает реальный IP-адрес клиента из заголовков Vercel / прокси
 */
export function getClientIp(req) {
  if (!req || !req.headers) return 'unknown';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Главная функция регистрации инцидента безопасности
 */
export async function reportSecurityIncident({
  type = 'SUSPICIOUS_QUERY',
  details = '',
  query = '',
  userId = null,
  req = null,
  dbClient = null
}) {
  const ip = getClientIp(req);
  const now = new Date();
  const timeFormatted = now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const userAgent = req?.headers?.['user-agent'] || 'unknown';

  const cacheKey = `${type}:${ip}:${userId || 'anon'}`;
  const lastSent = recentAlertsCache.get(cacheKey);
  const shouldSendTelegram = !lastSent || (now.getTime() - lastSent > ALERT_COOLDOWN_MS);

  if (shouldSendTelegram) {
    recentAlertsCache.set(cacheKey, now.getTime());
    // Очистка старых записей кэша
    if (recentAlertsCache.size > 200) {
      const expirationThreshold = now.getTime() - 60000;
      for (const [k, v] of recentAlertsCache.entries()) {
        if (v < expirationThreshold) recentAlertsCache.delete(k);
      }
    }
  }

  // 1. Асинхронная запись в БД (app_errors)
  try {
    const sql = dbClient || (NEON_DATABASE_URL ? neon(NEON_DATABASE_URL) : null);
    if (sql) {
      const sanitizedQuery = (query || '').slice(0, 1000);
      const contextData = {
        security_alert: true,
        type,
        ip,
        details,
        user_id: userId,
        user_agent: userAgent,
        query: sanitizedQuery,
        timestamp: now.toISOString()
      };

      await sql.query(
        `INSERT INTO app_errors (realtor_id, error_message, error_stack, context_data)
         VALUES ($1, $2, $3, $4)`,
        [
          userId && /^[0-9a-fA-F-]{36}$/.test(userId) ? userId : null,
          `[SECURITY ALERT] ${type}: ${details}`,
          `IP: ${ip} | UA: ${userAgent.slice(0, 200)}`,
          JSON.stringify(contextData)
        ]
      ).catch(err => console.error('[security-alerts] DB insert failed:', err.message));
    }
  } catch (dbErr) {
    console.error('[security-alerts] Failed to write to app_errors:', dbErr.message);
  }

  // 2. Мгновенная отправка в Telegram
  if (shouldSendTelegram && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const querySnippet = query ? (query.length > 300 ? query.slice(0, 300) + '...' : query) : 'n/a';
      
      const messageText = 
`🚨 <b>ВНИМАНИЕ! ПОПЫТКА ВЗЛОМА / ИНЦИДЕНТ БЕЗОПАСНОСТИ</b>

⚠️ <b>Тип:</b> <code>${escapeHtml(type)}</code>
📝 <b>Детали:</b> ${escapeHtml(details)}
🌐 <b>IP-адрес:</b> <code>${escapeHtml(ip)}</code>
👤 <b>User ID:</b> <code>${escapeHtml(userId || 'Неавторизован')}</code>
⏰ <b>Время (МСК):</b> ${timeFormatted}

🔍 <b>Фрагмент запроса:</b>
<pre>${escapeHtml(querySnippet)}</pre>`;

      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      
      fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }).catch(tgErr => console.error('[security-alerts] Telegram send failed:', tgErr.message));
    } catch (tgOuterErr) {
      console.error('[security-alerts] Telegram dispatch error:', tgOuterErr.message);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
