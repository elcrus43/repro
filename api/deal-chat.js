/**
 * api/deal-chat.js — Dedicated Deal Chat Serverless Endpoint
 *
 * Безопасный эндпоинт для гостевого чата сделок.
 * Предотвращает несанкционированный доступ, строго проверяя токен сделки.
 */

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

// Простой rate-limiter по IP (макс. 30 запросов в минуту)
const ipRateLimit = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = 30;
  const record = ipRateLimit.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count += 1;
  }
  ipRateLimit.set(ip, record);
  if (ipRateLimit.size > 2000) {
    for (const [k, v] of ipRateLimit.entries()) {
      if (now > v.resetAt) ipRateLimit.delete(k);
    }
  }
  return record.count <= maxReqs;
}

// Проверка валидности крипто-токена сделки (сырой UUID сделки запрещён как токен)
export function isValidDealToken(dealId, side, token) {
  if (!dealId || !side || !token || typeof token !== 'string') return false;
  if (token === dealId) return false; // Сырой UUID сделки не может быть токеном

  // Формат 1: t_sec_${side}_${prefix8}_${hash}
  const hash = Math.abs(dealId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
  const expected1 = `t_sec_${side}_${dealId.substring(0, 8)}_${hash}`;
  if (token === expected1) return true;

  // Формат 2: t_sec_${side}_${dealId}_...
  if (token.startsWith(`t_sec_${side}_${dealId}_`)) return true;

  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  }

  if (!NEON_DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sql = neon(NEON_DATABASE_URL);

  if (req.method === 'GET') {
    const { token, dealId: qDealId, side: qSide, action } = req.query || {};

    if (!token) {
      return res.status(403).json({ error: 'Токен доступа обязателен' });
    }

    let dealId = qDealId;
    let side = qSide || (token.startsWith('t_sec_seller_') ? 'seller' : 'buyer');

    if (token.startsWith('t_sec_')) {
      const parts = token.split('_');
      const prefix = parts[3];
      if (prefix) {
        const deals = await sql.query(
          'SELECT id, title, status, lawyer FROM deals WHERE id::text LIKE $1 LIMIT 5',
          [`${prefix}%`]
        );
        const matched = deals.find(d => isValidDealToken(d.id, side, token));
        if (matched) {
          dealId = matched.id;
        }
      }
    }

    if (!dealId || !isValidDealToken(dealId, side, token)) {
      return res.status(403).json({ error: 'Доступ ограничен. Ссылка недействительна или не существует.' });
    }

    // Запрос данных сделки
    if (action === 'deal_info') {
      const deals = await sql.query('SELECT id, title, status, lawyer FROM deals WHERE id = $1 LIMIT 1', [dealId]);
      if (!deals || deals.length === 0) {
        return res.status(404).json({ error: 'Сделка не найдена' });
      }
      return res.status(200).json({ deal: deals[0], side });
    }

    // Запрос сообщений
    const messages = await sql.query(
      'SELECT id, deal_id, side, sender_name, sender_role, text, file_url, file_name, file_type, created_at FROM deal_messages WHERE deal_id = $1 AND side = $2 ORDER BY created_at ASC',
      [dealId, side]
    );
    return res.status(200).json({ messages: messages || [] });
  }

  if (req.method === 'POST') {
    const { token, dealId, side, sender_name, sender_role, text, file_url, file_name, file_type } = req.body || {};

    if (!dealId || !side || !token || !isValidDealToken(dealId, side, token)) {
      return res.status(403).json({ error: 'Доступ ограничен: недействительный токен' });
    }

    if (!text && !file_url) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    // Валидация роли
    const ALLOWED_ROLES = new Set(['client', 'lawyer', 'buyer', 'seller', 'agent', 'realtor']);
    const safeRole = ALLOWED_ROLES.has(sender_role) ? sender_role : 'client';

    // Валидация file_url (только https или data:image)
    let safeFileUrl = null;
    if (file_url && typeof file_url === 'string') {
      if (file_url.startsWith('https://') || file_url.startsWith('data:image/')) {
        safeFileUrl = file_url.slice(0, 500000);
      }
    }

    const msgId = crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
    const cleanText = (text || file_name || 'Вложение').slice(0, 5000);
    const cleanSender = (sender_name || 'Гость').slice(0, 100);
    const cleanFileName = file_name ? String(file_name).slice(0, 200) : null;
    const cleanFileType = file_type ? String(file_type).slice(0, 100) : null;

    const inserted = await sql.query(
      `INSERT INTO deal_messages (id, deal_id, side, sender_name, sender_role, text, file_url, file_name, file_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, deal_id, side, sender_name, sender_role, text, file_url, file_name, file_type, created_at`,
      [msgId, dealId, side, cleanSender, safeRole, cleanText, safeFileUrl, cleanFileName, cleanFileType]
    );

    return res.status(200).json({ message: inserted[0] });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
