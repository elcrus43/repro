/**
 * api/neon-auth.js — Vercel Serverless Function
 *
 * Аутентификация для Neon (замена Supabase Auth).
 * POST /api/neon-auth
 *
 * Тело запроса:
 *   { action: 'login',    email, password }
 *   { action: 'register', email, password, fullName }
 *   { action: 'refresh',  token }
 *   { action: 'logout',   token }
 *
 * Возвращает: { data: { user, session }, error }
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_JWT_SECRET   = process.env.NEON_JWT_SECRET;

const JWT_EXPIRES_IN    = '7d';   // Время жизни токена
const SESSION_EXPIRES   = 7 * 24 * 60 * 60 * 1000; // 7 дней в мс
const BCRYPT_ROUNDS     = 10;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeJWT(profile) {
  return jwt.sign(
    {
      sub:   profile.id,
      email: profile.email,
      role:  profile.role,
      name:  profile.full_name,
    },
    NEON_JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function mapProfile(profile) {
  return {
    id:          profile.id,
    email:       profile.email,
    role:        profile.role,
    status:      profile.status,
    full_name:   profile.full_name,
    phone:       profile.phone || '',
    agency_name: profile.agency_name || '',
    inn:         profile.inn || null,
    user_metadata: {
      full_name: profile.full_name,
      name:      profile.full_name,
      phone:     profile.phone || '',
    }
  };
}

export default async function handler(req, res) {
  // ─── CORS ────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  // ─── Конфигурация ────────────────────────────────────────────
  if (!NEON_DATABASE_URL || !NEON_JWT_SECRET) {
    return res.status(500).json({ data: null, error: 'Server not configured' });
  }

  const { action, email, password, fullName, token } = req.body || {};

  if (!action) {
    return res.status(400).json({ data: null, error: 'Missing action' });
  }

  const sql = neon(NEON_DATABASE_URL);

  try {
    // ═══ LOGIN ═══════════════════════════════════════════════════
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ data: null, error: 'Email and password required' });
      }

      // Ищем пользователя
      const rows = await sql.query(
        'SELECT * FROM profiles WHERE email = $1 LIMIT 1',
        [email.toLowerCase().trim()]
      );

      if (!rows.length) {
        return res.status(401).json({ data: null, error: 'Неверный email или пароль' });
      }

      const profile = rows[0];

      // Проверяем пароль
      if (!profile.password_hash) {
        return res.status(401).json({
          data: null,
          error: 'Пароль не установлен. Обратитесь к администратору.'
        });
      }

      const passwordOk = await bcrypt.compare(password, profile.password_hash);
      if (!passwordOk) {
        return res.status(401).json({ data: null, error: 'Неверный email или пароль' });
      }

      // Проверяем статус
      if (profile.status === 'pending') {
        return res.status(403).json({
          data: null,
          error: 'Ваш аккаунт ожидает подтверждения администратором'
        });
      }
      if (profile.status === 'rejected') {
        return res.status(403).json({
          data: null,
          error: 'Ваш аккаунт отклонён. Обратитесь к администратору.'
        });
      }

      // Создаём JWT
      const accessToken = makeJWT(profile);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRES);

      // Сохраняем сессию
      await sql.query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (token_hash) DO NOTHING`,
        [profile.id, hashToken(accessToken), expiresAt.toISOString()]
      );

      return res.status(200).json({
        data: {
          user:    mapProfile(profile),
          session: { access_token: accessToken, expires_at: expiresAt.toISOString() }
        },
        error: null
      });
    }

    // ═══ REGISTER ════════════════════════════════════════════════
    if (action === 'register') {
      if (!email || !password) {
        return res.status(400).json({ data: null, error: 'Email and password required' });
      }

      // Проверяем уникальность email
      const existing = await sql.query(
        'SELECT id FROM profiles WHERE email = $1 LIMIT 1',
        [email.toLowerCase().trim()]
      );
      if (existing.length) {
        return res.status(409).json({ data: null, error: 'Пользователь с таким email уже существует' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const name = fullName || email.split('@')[0];

      const inserted = await sql.query(
        `INSERT INTO profiles (email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, 'realtor', 'pending')
         RETURNING *`,
        [email.toLowerCase().trim(), passwordHash, name]
      );

      const profile = inserted[0];
      const accessToken = makeJWT(profile);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRES);

      await sql.query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [profile.id, hashToken(accessToken), expiresAt.toISOString()]
      );

      return res.status(201).json({
        data: {
          user:    mapProfile(profile),
          session: { access_token: accessToken, expires_at: expiresAt.toISOString() }
        },
        error: null
      });
    }

    // ═══ REFRESH ═════════════════════════════════════════════════
    if (action === 'refresh') {
      if (!token) {
        return res.status(400).json({ data: null, error: 'Token required' });
      }

      let payload;
      try {
        // ignoreExpiration — чтобы можно было обновить даже истёкший токен
        payload = jwt.verify(token, NEON_JWT_SECRET, { ignoreExpiration: true });
      } catch {
        return res.status(401).json({ data: null, error: 'Invalid token' });
      }

      // Проверяем что сессия ещё существует
      const sessions = await sql.query(
        'SELECT * FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
        [hashToken(token)]
      );
      if (!sessions.length) {
        return res.status(401).json({ data: null, error: 'Session expired or not found' });
      }

      // Получаем профиль
      const profiles = await sql.query(
        'SELECT * FROM profiles WHERE id = $1 LIMIT 1',
        [payload.sub]
      );
      if (!profiles.length) {
        return res.status(401).json({ data: null, error: 'User not found' });
      }

      const profile = profiles[0];
      const newToken = makeJWT(profile);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRES);

      // Обновляем сессию (удаляем старую, создаём новую)
      await sql.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashToken(token)]);
      await sql.query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [profile.id, hashToken(newToken), expiresAt.toISOString()]
      );

      return res.status(200).json({
        data: {
          user:    mapProfile(profile),
          session: { access_token: newToken, expires_at: expiresAt.toISOString() }
        },
        error: null
      });
    }

    // ═══ LOGOUT ══════════════════════════════════════════════════
    if (action === 'logout') {
      if (token) {
        await sql.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashToken(token)]);
      }
      return res.status(200).json({ data: { success: true }, error: null });
    }

    // ═══ UPDATE PASSWORD ═════════════════════════════════════════
    if (action === 'updatePassword') {
      if (!password) {
        return res.status(400).json({ data: null, error: 'New password required' });
      }

      const authHeader = req.headers.authorization || '';
      const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!authToken) {
        return res.status(401).json({ data: null, error: 'Unauthorized' });
      }

      let payload;
      try {
        payload = jwt.verify(authToken, NEON_JWT_SECRET);
      } catch {
        return res.status(401).json({ data: null, error: 'Invalid or expired token' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await sql.query(
        'UPDATE profiles SET password_hash = $1 WHERE id = $2',
        [passwordHash, payload.sub]
      );

      return res.status(200).json({ data: { success: true }, error: null });
    }

    return res.status(400).json({ data: null, error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('[neon-auth] Error:', err.message);
    return res.status(500).json({ data: null, error: 'Internal server error' });
  }
}
