/**
 * scripts/check-gemini-key.js
 *
 * Быстрая проверка Gemini API-ключа без вывода самого ключа.
 * Показывает, какие модели доступны и не мешает ли биллинг/лимиты.
 *
 * Запуск: npm run check:gemini
 */

import fs from 'fs';

if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!key) {
  console.log('GEMINI_API_KEY не найден.');
  console.log('Добавьте в .env строку: GEMINI_API_KEY=ваш_ключ');
  console.log('Ключ: https://aistudio.google.com/apikey');
  process.exit(1);
}

const models = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

let okCount = 0;
let locationBlocked = false;

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ответь одним словом: OK' }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 }
      }),
      signal: AbortSignal.timeout(20000)
    });

    const text = await response.text();
    if (response.ok) {
      okCount += 1;
      let answer = '';
      try {
        answer = JSON.parse(text)?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      } catch {
        answer = '(не удалось разобрать ответ)';
      }
      console.log(`OK    ${model} - ${answer}`);
    } else {
      if (text.includes('User location is not supported')) locationBlocked = true;
      console.log(`FAIL  ${model} - HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`ERR   ${model} - ${err.message}`);
  }
}

console.log('');
if (okCount > 0) {
  console.log(`Рабочих моделей: ${okCount}. Ключ можно добавлять в .env и Vercel как GEMINI_API_KEY.`);
} else if (locationBlocked) {
  console.log('Ключ принят API, но текущая сеть находится в неподдерживаемом регионе (User location is not supported).');
  console.log('Локально нужен VPN/US-выход. На Vercel функции выполняются в US и ключ будет работать.');
  process.exit(2);
} else {
  console.log('Ни одна модель не ответила. Проверьте баланс/лимиты проекта, регион и restrictions ключа.');
  process.exit(1);
}
