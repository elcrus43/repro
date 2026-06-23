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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || process.env.VITE_ZHIPU_API_KEY;
const OPENMODEL_API_KEY = process.env.OPENMODEL_API_KEY || process.env.VITE_OPENMODEL_API_KEY;

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
