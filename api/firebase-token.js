/**
 * api/firebase-token.js — Vercel Serverless Function
 *
 * Прокси для Firebase Secure Token Service API.
 * Используется для обновления idToken через refreshToken:
 * клиент → /api/firebase-token → securetoken.googleapis.com
 */

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Firebase API key not configured on server' });
  }

  const firebaseUrl = `${FIREBASE_TOKEN_URL}?key=${apiKey}`;

  try {
    const firebaseRes = await fetch(firebaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(req.body).toString(),
    });

    const data = await firebaseRes.json();
    return res.status(firebaseRes.status).json(data);
  } catch (err) {
    console.error('[firebase-token proxy] fetch error:', err.message);
    return res.status(502).json({ error: 'Proxy fetch failed', details: err.message });
  }
}
