/**
 * api/ai-proxy.js — Vercel Serverless Function
 *
 * Прокси для работы с AI-провайдерами из России.
 * Запросы от клиента перенаправляются сюда, а Vercel уже обращается к API.
 *
 * Цепочка fallback (оптимизировано для работы из РФ):
 *   1. DeepSeek V4 Flash via OpenModel (быстро, доступно из РФ)
 *   2. Zhipu AI GLM (китайский провайдер, доступен из РФ)
 *   3. Gemini (резерв, может быть недоступен из РФ)
 */
import { neon } from '@neondatabase/serverless';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || process.env.VITE_ZHIPU_API_KEY;
const OPENMODEL_API_KEY = process.env.OPENMODEL_API_KEY || process.env.VITE_OPENMODEL_API_KEY;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  try {
    if (action === 'generateAd') {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt parameter' });
      }
      const text = await handleGenerateAd(prompt);
      return res.status(200).json({ text });
    } 
    
    if (action === 'parseHouse') {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt parameter' });
      }
      const data = await handleParseHouse(prompt);
      return res.status(200).json(data);
    }
    
    if (action === 'runCma') {
      const { property } = req.body;
      if (!property) {
        return res.status(400).json({ error: 'Missing property parameter' });
      }
      const data = await handleRunCma(property);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[ai-proxy error]:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function handleGenerateAd(prompt) {
  let lastError = null;

  // 1. Сначала пробуем DeepSeek через OpenModel (доступно из РФ!)
  if (OPENMODEL_API_KEY) {
    const modelCandidates = ['deepseek-v4-flash', 'deepseek-v4-pro', 'qwen3.6-flash'];
    for (const modelName of modelCandidates) {
      try {
        console.log(`[ai-proxy] Trying OpenModel/DeepSeek (${modelName})...`);
        const response = await fetch('https://api.openmodel.ai/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENMODEL_API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,
          })
        });

        if (response.ok) {
          const data = await response.json();
          // OpenModel Messages Protocol: content is an array of blocks
          const textBlock = data?.content?.find(b => b.type === 'text');
          let content = textBlock?.text?.trim() || '';
          content = content
            .replace(/^```(?:json|markdown|text)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          if (content) return content;
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] OpenModel (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`OpenModel ${modelName} failed: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] OpenModel (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  // 2. Если OpenModel не справился — пробуем Zhipu AI
  if (ZHIPU_API_KEY) {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const modelCandidates = ['glm-4.7-flash', 'glm-4-flash', 'glm-4.5-air', 'glm-5-turbo'];
    for (const modelName of modelCandidates) {
      try {
        console.log(`[ai-proxy] Trying Zhipu (${modelName})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4000,
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data?.choices?.[0]?.message?.content?.trim() || '';
          content = content
            .replace(/^```(?:json|markdown|text)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          if (content) return content;
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] Zhipu (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`Zhipu ${modelName} failed: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] Zhipu (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  // 3. Последний резерв — Gemini (может быть недоступен из РФ)
  if (GEMINI_API_KEY) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
    for (const modelName of geminiModels) {
      try {
        console.log(`[ai-proxy] Trying Gemini (${modelName})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          content = content
            .replace(/^```(?:json|markdown|text)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          if (content) return content;
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] Gemini (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`Gemini ${modelName} failed: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] Gemini (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Все модели ИИ недоступны или не сконфигурированы.');
}

async function handleParseHouse(prompt) {
  let lastError = null;

  // 1. Пробуем DeepSeek через OpenModel (доступно из РФ, поддерживает extended thinking)
  if (OPENMODEL_API_KEY) {
    const modelCandidates = ['deepseek-v4-flash', 'deepseek-v4-pro', 'qwen3.6-flash'];
    for (const modelName of modelCandidates) {
      try {
        console.log(`[ai-proxy] Trying OpenModel/DeepSeek Parse (${modelName})...`);
        const response = await fetch('https://api.openmodel.ai/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENMODEL_API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,
          })
        });

        if (response.ok) {
          const data = await response.json();
          // OpenModel Messages Protocol: content is an array of blocks
          const textBlock = data?.content?.find(b => b.type === 'text');
          let content = textBlock?.text?.trim() || '';
          content = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
            return parsed;
          }
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] OpenModel Parse (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`OpenModel Parse ${modelName} failed: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] OpenModel Parse (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  // 2. Пробуем Zhipu с веб-поиском
  if (ZHIPU_API_KEY) {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const modelCandidates = ['glm-4.7-flash', 'glm-4-flash', 'glm-4.5-air', 'glm-5-turbo'];
    for (const modelName of modelCandidates) {
      try {
        console.log(`[ai-proxy] Trying Zhipu Search (${modelName})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            tools: [{
              type: 'web_search',
              web_search: { enable: true, search_result: true }
            }],
            temperature: 0.05,
            max_tokens: 4000,
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data?.choices?.[0]?.message?.content?.trim() || '';
          content = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
            return parsed;
          }
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] Zhipu Search (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`Zhipu Search ${modelName} failed: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] Zhipu Search (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  // 3. Последний резерв — Gemini с Google Search (может быть недоступен из РФ)
  if (GEMINI_API_KEY) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    for (const modelName of geminiModels) {
      try {
        console.log(`[ai-proxy] Trying Gemini Search (${modelName})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          content = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
            return parsed;
          }
        } else {
          const errText = await response.text();
          console.warn(`[ai-proxy] Gemini Search (${modelName}) returned status ${response.status}:`, errText);
          lastError = new Error(`Gemini Search ${modelName} failed: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[ai-proxy] Gemini Search (${modelName}) error:`, err.message);
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Все модели ИИ для парсинга недоступны.');
}

async function handleRunCma(property) {
  if (!NEON_DATABASE_URL) {
    throw new Error('Database not configured on server');
  }

  const sql = neon(NEON_DATABASE_URL);
  const analogs = await findLocalAnalogs(sql, property);

  if (analogs.length === 0) {
    throw new Error('Не найдено похожих предложений (аналогов) в базе данных. Пожалуйста, сначала добавьте объявления.');
  }

  const pricesPerSqm = analogs.map(a => Number(a.price) / parseFloat(a.total_area));
  
  let filteredAnalogs = analogs;
  if (pricesPerSqm.length >= 5) {
    const sortedPrices = [...pricesPerSqm].sort((a, b) => a - b);
    const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    filteredAnalogs = analogs.filter((_, idx) => pricesPerSqm[idx] >= lowerBound && pricesPerSqm[idx] <= upperBound);
  }

  if (filteredAnalogs.length === 0) {
    filteredAnalogs = analogs;
  }

  const finalPricesPerSqm = filteredAnalogs.map(a => Number(a.price) / parseFloat(a.total_area));
  const totalArea = parseFloat(property.total_area || property.area_total || 40);
  
  const sum = finalPricesPerSqm.reduce((acc, p) => acc + p, 0);
  const pricePerSqmAvg = Math.round(sum / finalPricesPerSqm.length);
  
  const sortedSqm = [...finalPricesPerSqm].sort((a, b) => a - b);
  const pricePerSqmMedian = Math.round(sortedSqm[Math.floor(sortedSqm.length / 2)]);
  
  const p25 = sortedSqm[Math.floor(sortedSqm.length * 0.25)];
  const p75 = sortedSqm[Math.floor(sortedSqm.length * 0.75)];

  const marketMin = Math.round(p25 * totalArea);
  const marketAvg = Math.round(pricePerSqmAvg * totalArea);
  const marketMax = Math.round(p75 * totalArea);

  const priceFast = marketMin;
  const priceOptimal = marketAvg;
  const pricePremium = marketMax;

  const yourPrice = Number(property.property_price || property.price || 0);
  const positionPct = marketAvg > 0 ? parseFloat((((yourPrice - marketAvg) / marketAvg) * 100).toFixed(1)) : 0.0;

  let daysForecastCurrent = 30;
  if (positionPct > 15) {
    daysForecastCurrent = Math.round(90 + positionPct * 2);
  } else if (positionPct > 5) {
    daysForecastCurrent = Math.round(60 + positionPct * 1.5);
  } else if (positionPct >= -5) {
    daysForecastCurrent = Math.round(30 + Math.max(-10, positionPct));
  } else {
    daysForecastCurrent = Math.max(10, Math.round(20 + positionPct));
  }
  const daysForecastOptimal = 30;

  const sourcesCount = {};
  filteredAnalogs.forEach(a => {
    sourcesCount[a.source] = (sourcesCount[a.source] || 0) + 1;
  });

  const confidence = filteredAnalogs.length >= 15 ? 'HIGH' : filteredAnalogs.length >= 5 ? 'MEDIUM' : 'LOW';

  const rooms = property.rooms !== undefined && property.rooms !== null ? parseInt(property.rooms) : 1;
  const analogsText = filteredAnalogs.slice(0, 10).map(a => 
    `- ${a.source} (${a.title || 'Объект'}): ${Number(a.price).toLocaleString('ru-RU')} руб., площадь: ${a.total_area} кв.м., этаж: ${a.floor}/${a.total_floors}`
  ).join('\n');

  const aiPrompt = `Ты — профессиональный аналитик рынка недвижимости. Сделай сравнительный маркетинговый анализ (СМА) для следующего объекта:
Параметры объекта:
- Город: ${property.city || 'Москва'}
- Район: ${property.district || 'Не указан'}
- Комнат: ${rooms}
- Площадь: ${totalArea} кв.м.
- Этаж: ${property.floor || 1}/${property.total_floors || 1}
- Тип здания: ${property.building_type || 'Не указан'}
- Заявленная цена: ${yourPrice} руб.

Рыночные показатели по аналогичным объектам (найдено аналогов: ${filteredAnalogs.length}):
- Минимальная цена: ${marketMin} руб.
- Средняя цена: ${marketAvg} руб.
- Максимальная цена: ${marketMax} руб.
- Средняя цена за кв.м: ${pricePerSqmAvg} руб.
- Медианная цена за кв.м: ${pricePerSqmMedian} руб.
- Отклонение заявленной цены от рынка: ${positionPct}%

Конкурирующие предложения на рынке:
${analogsText}

Напиши краткую экспертную рекомендацию для собственника (3-5 предложений) на русском языке. 
Оцени правильность позиционирования цены, укажи риски (простой объекта, упущенная выгода) и предложи оптимальные действия. 
Ответ должен быть в виде простого сплошного текста, без какого-либо форматирования markdown (без звездочек, без жирного шрифта, без списков, без заголовков).`;

  let recommendation = '';
  try {
    recommendation = await handleGenerateAd(aiPrompt);
  } catch (err) {
    console.error('[CMA AI Error]:', err.message);
    if (positionPct > 15) {
      recommendation = `Ваша цена (${yourPrice.toLocaleString('ru-RU')} ₽) значительно выше средней рыночной цены (${marketAvg.toLocaleString('ru-RU')} ₽) на ${positionPct}%. Рекомендуется снизить цену ближе к оптимальной (${marketAvg.toLocaleString('ru-RU')} ₽) для предотвращения простоя объекта.`;
    } else if (positionPct > 5) {
      recommendation = `Ваша цена (${yourPrice.toLocaleString('ru-RU')} ₽) выше средней рыночной цены на ${positionPct}%. Срок экспозиции может быть увеличен. Для ускорения продажи рассмотрите небольшую скидку до (${marketAvg.toLocaleString('ru-RU')} ₽).`;
    } else if (positionPct >= -5) {
      recommendation = `Ваша цена (${yourPrice.toLocaleString('ru-RU')} ₽) находится в оптимальном рыночном коридоре (отклонение всего ${positionPct}%). Отличное позиционирование для стабильной продажи.`;
    } else {
      recommendation = `Ваша цена (${yourPrice.toLocaleString('ru-RU')} ₽) ниже рыночной цены на ${Math.abs(positionPct)}%. Это обеспечит быструю продажу, но вы можете недополучить прибыль. Рекомендуется поднять цену до оптимальной (${marketAvg.toLocaleString('ru-RU')} ₽).`;
    }
  }

  return {
    analogs: filteredAnalogs.slice(0, 10).map(a => ({
      source: a.source,
      source_id: a.source_id,
      source_url: a.source_url,
      title: a.title || 'Квартира',
      price: Number(a.price),
      rooms: a.rooms,
      total_area: parseFloat(a.total_area),
      floor: a.floor,
      total_floors: a.total_floors
    })),
    market_min: marketMin,
    market_avg: marketAvg,
    market_max: marketMax,
    price_per_sqm_avg: pricePerSqmAvg,
    price_per_sqm_median: pricePerSqmMedian,
    your_price: yourPrice,
    position_pct: positionPct,
    recommendation: recommendation,
    price_fast: priceFast,
    price_optimal: priceOptimal,
    price_premium: pricePremium,
    days_forecast_current: daysForecastCurrent,
    days_forecast_optimal: daysForecastOptimal,
    sources_count: sourcesCount,
    confidence: confidence
  };
}

async function findLocalAnalogs(sql, property) {
  const city = property.city || 'Москва';
  const dealType = property.deal_type || 'SALE';
  const rooms = property.rooms !== undefined && property.rooms !== null ? parseInt(property.rooms) : 1;
  const area = parseFloat(property.total_area || property.area_total || 40);
  const district = property.district || '';
  const lat = property.latitude ? parseFloat(property.latitude) : null;
  const lon = property.longitude ? parseFloat(property.longitude) : null;

  // We define search steps.
  // 1. Geo-location (within 1.5 km)
  if (lat && lon) {
    const lat_delta = 1.5 / 111.0;
    const lon_delta = 1.5 / (111.0 * 0.57);
    const rows = await sql`
      SELECT * FROM analog_listings
      WHERE city = ${city}
        AND deal_type = ${dealType}
        AND is_active = true
        AND rooms = ${rooms}
        AND total_area BETWEEN ${area - 5} AND ${area + 5}
        AND latitude BETWEEN ${lat - lat_delta} AND ${lat + lat_delta}
        AND longitude BETWEEN ${lon - lon_delta} AND ${lon + lon_delta}
      ORDER BY last_seen_at DESC
      LIMIT 50
    `;
    if (rows.length >= 3) {
      console.log(`[CMA] Found ${rows.length} analogs using step: geo (1.5km) + area ±5`);
      return rows;
    }
  }

  // 2. District
  if (district) {
    const rows = await sql`
      SELECT * FROM analog_listings
      WHERE city = ${city}
        AND deal_type = ${dealType}
        AND is_active = true
        AND rooms = ${rooms}
        AND total_area BETWEEN ${area - 5} AND ${area + 5}
        AND district ILIKE ${'%' + district + '%'}
      ORDER BY last_seen_at DESC
      LIMIT 50
    `;
    if (rows.length >= 3) {
      console.log(`[CMA] Found ${rows.length} analogs using step: district + area ±5`);
      return rows;
    }
  }

  // 3. City-wide with area ±5
  {
    const rows = await sql`
      SELECT * FROM analog_listings
      WHERE city = ${city}
        AND deal_type = ${dealType}
        AND is_active = true
        AND rooms = ${rooms}
        AND total_area BETWEEN ${area - 5} AND ${area + 5}
      ORDER BY last_seen_at DESC
      LIMIT 50
    `;
    if (rows.length >= 3) {
      console.log(`[CMA] Found ${rows.length} analogs using step: city + area ±5`);
      return rows;
    }
  }

  // 4. City-wide with wider area ±10
  {
    const rows = await sql`
      SELECT * FROM analog_listings
      WHERE city = ${city}
        AND deal_type = ${dealType}
        AND is_active = true
        AND rooms = ${rooms}
        AND total_area BETWEEN ${area - 10} AND ${area + 10}
      ORDER BY last_seen_at DESC
      LIMIT 50
    `;
    if (rows.length >= 3) {
      console.log(`[CMA] Found ${rows.length} analogs using step: city + area ±10`);
      return rows;
    }
  }

  // 5. Desperate fallback
  const rows = await sql`
    SELECT * FROM analog_listings
    WHERE city = ${city}
      AND deal_type = ${dealType}
      AND is_active = true
      AND rooms = ${rooms}
    ORDER BY last_seen_at DESC
    LIMIT 50
  `;
  console.log(`[CMA] Fallback to all active listings in city for rooms. Found ${rows.length} analogs.`);
  return rows;
}
