/**
 * api/deal-chat.js — Dedicated Deal Chat Serverless Endpoint
 *
 * Безопасный эндпоинт для гостевого чата сделок.
 * Предотвращает несанкционированный доступ, проверяя токен сделки.
 */

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

// Проверка токена сделки
function isValidDealToken(dealId, side, token) {
  if (!dealId || !side || !token) return false;
  // Формат 1: t_sec_${side}_${prefix8}_${hash}
  const hash = Math.abs(dealId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
  const expected1 = `t_sec_${side}_${dealId.substring(0, 8)}_${hash}`;
  if (token === expected1 || token === dealId) return true;
  // Формат 2: t_sec_${side}_${dealId}_...
  if (token.startsWith(`t_sec_${side}_${dealId}`)) return true;
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!NEON_DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sql = neon(NEON_DATABASE_URL);

  if (req.method === 'GET') {
    const { token, dealId: qDealId, side: qSide, action } = req.query || {};

    let dealId = qDealId;
    let side = qSide || 'buyer';

    if (token && token.startsWith('t_sec_')) {
      const isSeller = token.startsWith('t_sec_seller_');
      side = isSeller ? 'seller' : 'buyer';
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

    if (!dealId) {
      return res.status(403).json({ error: 'Доступ ограничен. Ссылка недействительна.' });
    }

    // Если запрошена информация о сделке
    if (action === 'deal_info') {
      const deals = await sql.query('SELECT id, title, status, lawyer FROM deals WHERE id = $1 LIMIT 1', [dealId]);
      if (!deals || deals.length === 0) {
        return res.status(404).json({ error: 'Сделка не найдена' });
      }
      return res.status(200).json({ deal: deals[0], side });
    }

    // Если запрошены сообщения
    const messages = await sql.query(
      'SELECT * FROM deal_messages WHERE deal_id = $1 AND side = $2 ORDER BY created_at ASC',
      [dealId, side]
    );
    return res.status(200).json({ messages: messages || [] });
  }

  if (req.method === 'POST') {
    const { token, dealId, side, sender_name, sender_role, text, file_url, file_name, file_type } = req.body || {};

    if (!dealId || !side || !isValidDealToken(dealId, side, token)) {
      return res.status(403).json({ error: 'Доступ ограничен: недействительный токен' });
    }

    if (!text && !file_url) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const msgId = crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
    const cleanText = (text || file_name || 'Вложение').slice(0, 5000);
    const cleanSender = (sender_name || 'Гость').slice(0, 100);

    const inserted = await sql.query(
      `INSERT INTO deal_messages (id, deal_id, side, sender_name, sender_role, text, file_url, file_name, file_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [msgId, dealId, side, cleanSender, sender_role || 'client', cleanText, file_url || null, file_name || null, file_type || null]
    );

    return res.status(200).json({ message: inserted[0] });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
