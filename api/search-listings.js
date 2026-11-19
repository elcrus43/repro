/**
 * api/search-listings.js - Vercel Serverless Function
 *
 * Поиск реальных объявлений с Авито, ЦИАН, ДомКлик, Яндекс и др.
 * из базы analog_listings (Neon PostgreSQL) по параметрам клиентского запроса.
 * Поддерживает оповещение риелтора в Telegram при нахождении объектов.
 */

import { neon } from '@neondatabase/serverless';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SECURITY_BOT_TOKEN || process.env.ALERT_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SECURITY_CHAT_ID || process.env.REALTOR_CHAT_ID;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 30,
};

/**
 * Отправляет сводку подходящих объектов в Telegram риелтора
 */
async function sendTelegramNotification({ clientName, querySummary, results, botToken, chatId }) {
  if (!botToken || !chatId || !Array.isArray(results) || results.length === 0) {
    return false;
  }

  const topListings = results.slice(0, 5);
  const itemsText = topListings.map((item, idx) => {
    const srcMap = {
      avito: 'Авито',
      cian: 'ЦИАН',
      domclick: 'ДомКлик',
      yandex: 'Яндекс',
      m2: 'М2',
    };
    const src = srcMap[item.source] || item.source.toUpperCase();
    const priceFormatted = Number(item.price).toLocaleString('ru-RU');
    const roomsText = item.rooms === 0 ? 'Студия' : (item.rooms ? `${item.rooms}-к.` : '');
    const areaText = item.total_area ? `${item.total_area} м²` : '';
    const details = [roomsText, areaText].filter(Boolean).join(' · ');

    return `${idx + 1}. 🏢 <b>${item.title || item.address || 'Объект'}</b>\n` +
           `   💰 <b>${priceFormatted} ₽</b>${details ? ` · ${details}` : ''}\n` +
           `   📍 ${item.address || 'Адрес не указан'}\n` +
           `   🔗 <a href="${item.source_url}">Открыть на ${src}</a>`;
  }).join('\n\n');

  const text =
    `🔔 <b>Автоподбор REA CRM - найдены объекты!</b>\n\n` +
    `👤 <b>Клиент:</b> ${clientName || 'Покупатель'}\n` +
    `🎯 <b>Параметры:</b> ${querySummary || 'Запрос на покупку'}\n\n` +
    `Найдено подходящих вариантов (${results.length}):\n\n` +
    itemsText;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[search-listings] Telegram dispatch failed:', err.message);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const {
      city = 'Киров',
      districts,
      rooms,
      budget_max,
      budget_min,
      area_min,
      area_max,
      property_types,
      deal_type = 'SALE',
      limit = 40,
      sources: requestedSources,
      notify_telegram = false,
      client_name = '',
      query_summary = '',
    } = req.body || {};

    const sql = neon(dbUrl);

    // Построение параметров и условий SQL
    const conditions = ['is_active = true'];
    const params = [];
    let pIdx = 1;

    // Город
    if (city) {
      conditions.push(`city ILIKE $${pIdx}`);
      params.push(`%${city.trim()}%`);
      pIdx++;
    }

    // Фильтр источников, если передан
    if (Array.isArray(requestedSources) && requestedSources.length > 0) {
      const upperSources = requestedSources.map(s => String(s).toUpperCase());
      conditions.push(`UPPER(source) = ANY($${pIdx}::text[])`);
      params.push(upperSources);
      pIdx++;
    }

    // Категория / тип недвижимости (квартиры, дома, дачи и т.д.)
    if (Array.isArray(property_types) && property_types.length > 0) {
      const catConditions = [];
      const isHouse = property_types.some(t => ['house', 'dacha', 'townhouse', 'cottage'].includes(t));
      const isApartment = property_types.includes('apartment');

      if (isHouse && !isApartment) {
        catConditions.push(`raw_data->>'avito_category' = 'doma'`);
      } else if (isApartment && !isHouse) {
        catConditions.push(`(raw_data->>'avito_category' IN ('kvartiry_vtorichka', 'kvartiry_novostroyka') OR raw_data->>'avito_category' IS NULL)`);
      }
      if (catConditions.length > 0) {
        conditions.push(`(${catConditions.join(' OR ')})`);
      }
    }

    // Тип сделки
    if (deal_type) {
      conditions.push(`deal_type = $${pIdx}`);
      params.push(deal_type.toUpperCase());
      pIdx++;
    }

    // Комнатность
    if (Array.isArray(rooms) && rooms.length > 0) {
      const roomNums = rooms.map(Number).filter(n => !isNaN(n));
      if (roomNums.length > 0) {
        conditions.push(`rooms = ANY($${pIdx}::int[])`);
        params.push(roomNums);
        pIdx++;
      }
    }

    // Бюджет
    if (budget_max && Number(budget_max) > 0) {
      conditions.push(`price <= $${pIdx}`);
      params.push(Number(budget_max));
      pIdx++;
    }

    if (budget_min && Number(budget_min) > 0) {
      conditions.push(`price >= $${pIdx}`);
      params.push(Number(budget_min));
      pIdx++;
    }

    // Площадь
    if (area_min && Number(area_min) > 0) {
      conditions.push(`total_area >= $${pIdx}`);
      params.push(Number(area_min));
      pIdx++;
    }

    if (area_max && Number(area_max) > 0) {
      conditions.push(`total_area <= $${pIdx}`);
      params.push(Number(area_max));
      pIdx++;
    }

    // Районы (если указаны - проверяем район или адрес)
    if (Array.isArray(districts) && districts.length > 0) {
      const districtConds = [];
      for (const d of districts) {
        if (!d) continue;
        districtConds.push(`(district ILIKE $${pIdx} OR address ILIKE $${pIdx})`);
        params.push(`%${d.trim()}%`);
        pIdx++;
      }
      if (districtConds.length > 0) {
        conditions.push(`(${districtConds.join(' OR ')})`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        id,
        source,
        source_id,
        source_url,
        title,
        price,
        address,
        district,
        rooms,
        total_area,
        floor,
        total_floors,
        building_type,
        deal_type,
        raw_data,
        last_seen_at
      FROM analog_listings
      ${whereClause}
      ORDER BY last_seen_at DESC
      LIMIT ${Math.min(Number(limit) || 40, 100)}
    `;

    const rows = await sql.query(query, params);

    // Подсчет источников
    const sourcesCount = {};
    const results = rows.map(r => {
      const src = (r.source || 'AVITO').toLowerCase();
      sourcesCount[src] = (sourcesCount[src] || 0) + 1;
      const raw = r.raw_data || {};

      return {
        id: r.id,
        source: src,
        source_id: r.source_id,
        source_url: r.source_url,
        title: r.title,
        price: Number(r.price),
        address: r.address,
        district: r.district,
        rooms: r.rooms,
        total_area: r.total_area ? parseFloat(r.total_area) : null,
        floor: r.floor,
        total_floors: r.total_floors,
        building_type: r.building_type,
        image_url: raw.image_url || raw.photo_url || (Array.isArray(raw.photos) ? raw.photos[0] : null) || null,
        deal_type: r.deal_type || deal_type,
        last_seen_at: r.last_seen_at,
      };
    });

    let telegramSent = false;
    if (notify_telegram && results.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      telegramSent = await sendTelegramNotification({
        clientName: client_name,
        querySummary: query_summary,
        results,
        botToken: TELEGRAM_BOT_TOKEN,
        chatId: TELEGRAM_CHAT_ID,
      });
    }

    return res.status(200).json({
      results,
      total: results.length,
      sources: sourcesCount,
      telegram_sent: telegramSent,
    });
  } catch (err) {
    console.error('[search-listings] Error:', err);
    return res.status(500).json({ error: err.message || 'Ошибка поиска объявлений' });
  }
}
