/**
 * api/firebase-auth.js — Vercel Serverless Function
 *
 * Прокси для Firebase Identity Toolkit API.
 * Позволяет обойти блокировку Google/Firebase в России:
 * клиент → /api/firebase-auth?action=... → identitytoolkit.googleapis.com
 *
 * Поддерживаемые actions:
 *   - signInWithPassword
 *   - signUp
 *   - sendOobCode  (сброс пароля)
 *   - update       (смена пароля)
 *   - lookup       (получение данных пользователя)
 */

const FIREBASE_IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

export default async function handler(req, res) {
  // CORS — разрешаем запросы с нашего домена
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.query;
  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Firebase API key not configured on server' });
  }

  const firebaseUrl = `${FIREBASE_IDENTITY_URL}:${action}?key=${apiKey}`;

  try {
    const firebaseRes = await fetch(firebaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await firebaseRes.json();
    return res.status(firebaseRes.status).json(data);
  } catch (err) {
    console.error('[firebase-auth proxy] fetch error:', err.message);
    return res.status(502).json({ error: 'Proxy fetch failed', details: err.message });
  }
}
