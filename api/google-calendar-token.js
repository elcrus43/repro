/**
 * api/google-calendar-token.js — Vercel Serverless Function
 *
 * Управляет токенами Google OAuth для интеграции с Календарем.
 * POST /api/google-calendar-token
 *
 * Тело запроса:
 *   { action: 'exchange', code, redirect_uri } — обмен кода на токены
 *   { action: 'refresh' }                      — обновление access_token по refresh_token
 *   { action: 'revoke' }                       — отзыв прав и удаление токена из БД
 *
 * Заголовок: Authorization: Bearer <Neon-JWT>
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_JWT_SECRET   = process.env.NEON_JWT_SECRET;

function err(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

async function getUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, NEON_JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch (e) {
    console.error('[google-calendar-token] Auth error:', e.message);
    return null;
  }
}

async function getRefreshToken(userId) {
  const sql = neon(NEON_DATABASE_URL);
  const rows = await sql`
    SELECT google_refresh_token 
    FROM profiles 
    WHERE id = ${userId} 
    LIMIT 1
  `;
  return rows[0]?.google_refresh_token || null;
}

async function updateRefreshToken(userId, refreshToken) {
  const sql = neon(NEON_DATABASE_URL);
  await sql`
    UPDATE profiles 
    SET google_refresh_token = ${refreshToken} 
    WHERE id = ${userId}
  `;
}

export default async function handler(req, res) {
  // ─── CORS ────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return err(res, 'Method Not Allowed', 405);
  }

  // ─── Конфигурация ────────────────────────────────────────────
  if (!NEON_DATABASE_URL) {
    console.error('[google-calendar-token] NEON_DATABASE_URL not set');
    return err(res, 'Database not configured', 500);
  }

  if (!NEON_JWT_SECRET) {
    console.error('[google-calendar-token] NEON_JWT_SECRET not set');
    return err(res, 'JWT secret not configured', 500);
  }

  if (!CLIENT_SECRET) {
    console.error('[google-calendar-token] GOOGLE_CLIENT_SECRET not set in .env');
    return err(res, 'В файле .env не настроен GOOGLE_CLIENT_SECRET. Пожалуйста, добавьте его в файл .env.', 500);
  }

  // ─── Проверка пользователя ───────────────────────────────────
  const user = await getUser(req);
  if (!user) {
    return err(res, 'Unauthorized', 401);
  }

  const { action, code, redirect_uri } = req.body || {};
  if (!action) {
    return err(res, 'Missing action', 400);
  }

  try {
    // ═══ EXCHANGE ════════════════════════════════════════════════
    if (action === 'exchange') {
      if (!code || !redirect_uri) {
        return err(res, 'Missing code or redirect_uri', 400);
      }

      console.log('[google-calendar-token] Exchanging code...');
      
      const params = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET || '',
        redirect_uri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!response.ok) {
        const tokenErr = await response.json().catch(() => ({}));
        console.error('[google-calendar-token] Exchange failed:', tokenErr);
        return err(res, tokenErr.error_description || tokenErr.error || 'Token exchange failed', 400);
      }

      const tokens = await response.json();

      if (!tokens.refresh_token) {
        console.error('[google-calendar-token] No refresh_token returned');
        return err(res, 'No refresh_token returned. Please revoke access in Google Account settings and reconnect.', 400);
      }

      await updateRefreshToken(user.id, tokens.refresh_token);

      return res.status(200).json({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
      });
    }

    // ═══ REFRESH ═════════════════════════════════════════════════
    if (action === 'refresh') {
      const refreshToken = await getRefreshToken(user.id);
      if (!refreshToken) {
        return err(res, 'No refresh token found. Please reconnect Google Calendar.', 400);
      }

      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      });

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!response.ok) {
        const tokenErr = await response.json().catch(() => ({}));
        console.error('[google-calendar-token] Refresh failed:', tokenErr);

        if (tokenErr.error === 'invalid_grant') {
          await updateRefreshToken(user.id, null).catch(() => {});
          return err(res, 'Refresh token revoked. Please reconnect Google Calendar.', 401);
        }

        return err(res, tokenErr.error_description || tokenErr.error || 'Token refresh failed', 400);
      }

      const tokens = await response.json();
      if (tokens.refresh_token) {
        await updateRefreshToken(user.id, tokens.refresh_token).catch(() => {});
      }

      return res.status(200).json({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
      });
    }

    // ═══ REVOKE ══════════════════════════════════════════════════
    if (action === 'revoke') {
      const refreshToken = await getRefreshToken(user.id);
      if (refreshToken) {
        await fetch(`${GOOGLE_REVOKE_URL}?token=${refreshToken}`, {
          method: 'POST',
        }).catch(() => {});
      }

      await updateRefreshToken(user.id, null);
      return res.status(200).json({ ok: true });
    }

    return err(res, `Unknown action: ${action}`, 400);

  } catch (e) {
    console.error('[google-calendar-token] Unhandled error:', e);
    return err(res, 'Internal server error', 500);
  }
}
