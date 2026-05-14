/**
 * supabaseSync.js — вся логика синхронизации с Supabase.
 *
 * Вынесена из AppContext.jsx для:
 *  - разделения ответственности (SRP)
 *  - удобного тестирования
 *  - устранения God Object
 *
 * ИЗМЕНЕНИЯ vs оригинала:
 *  1. Убран alert() — заменён на onError callback (передаётся из AppContext)
 *  2. Добавлен rollback callback — вызывается при критической ошибке
 *     чтобы откатить optimistic update
 *  3. Добавлен retry с экспоненциальной задержкой для сетевых ошибок
 */

import { supabase } from '../lib/supabase';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Рекурсивно заменяет пустые строки на null перед отправкой в БД.
 * Supabase/PostgreSQL воспринимает '' и NULL по-разному в NOT NULL полях.
 */
export function sanitizeObj(obj) {
  if (obj === '') return null;
  if (!obj || typeof obj !== 'object') return obj;
  // Массивы (client_ids и др.) обрабатываем без UUID-проверки элементов
  if (Array.isArray(obj)) return obj.map(item => {
    if (typeof item === 'string') return item; // строки в массивах не заменяем null
    return sanitizeObj(item);
  });

  const UUID_FIELDS = new Set(['id', 'client_id', 'realtor_id', 'property_id', 'request_id']);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    const val = sanitized[key];

    // UUID-поля: заменяем невалидный UUID null — но не для client_ids!
    if (UUID_FIELDS.has(key) && key !== 'id' &&
        typeof val === 'string' && val.length > 0 && !UUID_RE.test(val)) {
      console.warn(`[Supabase] Stripping invalid UUID for field ${key}:`, val);
      sanitized[key] = null;
      return;
    }

    if (val === '') {
      sanitized[key] = null;
    } else if (Array.isArray(val)) {
      // Массивы (client_ids, images и др.) обрабатываем через рекурсию без UUID-замены
      sanitized[key] = val.map(item => {
        if (typeof item === 'string') return item; // строки (UUID, URL) — не трогаем
        return sanitizeObj(item);
      });
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObj(val);
    }
  });
  return sanitized;
}

/**
 * Retry-обёртка для сетевых сбоев.
 * Не повторяет запрос при ошибках доступа (RLS) или схемы.
 */
async function withRetry(fn, { retries = 2, delay = 500 } = {}) {
  const NON_RETRYABLE_CODES = ['42501', 'PGRST301', 'PGRST116', '42703', 'PGRST204'];
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    try {
      // Race the actual function against the timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      // Supabase возвращает error внутри объекта, а не бросает исключение
      if (result?.error && NON_RETRYABLE_CODES.includes(result.error.code)) {
        return result; // не ретраим — это не сетевая ошибка
      }
      if (result?.error && attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
        lastError = result;
        continue;
      }
      return result;
    } catch (err) {
      const isTimeout = err.message === 'TIMEOUT';
      lastError = { error: { message: isTimeout ? 'Превышено время ожидания (15с)' : err.message, code: isTimeout ? 'TIMEOUT' : 'NETWORK' } };
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
      }
    }
  }
  return lastError;
}

/* ─── Loader ───────────────────────────────────────────────────────────────── */

/**
 * Загружает все данные пользователя из Supabase.
 * Оптимизировано для мобильных браузеров (Chrome Android):
 *  - AbortController вместо Promise.race (совместимо с Supabase)
 *  - Пакетная загрузка вместо 8 параллельных запросов
 *  - Retry при сетевых сбоях
 */
export async function loadUserData(userId, role) {
  const isAdmin = role === 'admin';

  /**
   * Безопасный запрос с таймаутом.
   * Promise.race более надежен в старых мобильных браузерах, чем AbortController.
   */
  async function safeQuery(queryFn, timeoutMs = 30000) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    
    try {
      const res = await Promise.race([queryFn(), timeoutPromise]);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      const isTimeout = e?.message === 'TIMEOUT';
      const message = isTimeout
        ? 'Превышено время ожидания (30с)'
        : (e?.message || 'Сетевая ошибка');
      console.error('[safeQuery] Error:', message, e?.name);
      return { data: null, error: { message, code: isTimeout ? 'TIMEOUT' : 'NETWORK' } };
    }
  }

  // Загружаем все данные параллельно (один батч)
  // Современные браузеры отлично справляются с 8+ запросами одновременно
  const [
    clientsRes, propertiesRes, requestsRes, matchesRes,
    showingsRes, tasksRes, priceRes, dealsRes, profilesRes
  ] = await Promise.all([
    isAdmin
      ? safeQuery(() => supabase.from('clients').select('*'))
      : safeQuery(() => supabase.from('clients').select('*').eq('realtor_id', userId)),
    isAdmin
      ? safeQuery(() => supabase.from('properties').select('*'))
      : safeQuery(() => supabase.from('properties').select('*').eq('realtor_id', userId)),
    isAdmin
      ? safeQuery(() => supabase.from('requests').select('*'))
      : safeQuery(() => supabase.from('requests').select('*').eq('realtor_id', userId)),
    isAdmin
      ? safeQuery(() => supabase.from('matches').select('*'))
      : safeQuery(() => supabase.from('matches').select('*').eq('realtor_id', userId)),
    isAdmin
      ? safeQuery(() => supabase.from('showings').select('*'))
      : safeQuery(() => supabase.from('showings').select('*').eq('realtor_id', userId)),
    isAdmin
      ? safeQuery(() => supabase.from('tasks').select('*'))
      : safeQuery(() => supabase.from('tasks').select('*').eq('realtor_id', userId)),
    safeQuery(() => supabase.from('pricelist').select('*')),
    isAdmin
      ? safeQuery(() => supabase.from('deals').select('*'))
      : safeQuery(() => supabase.from('deals').select('*').eq('realtor_id', userId)),
    safeQuery(() => supabase.from('profiles').select('*')),
  ]);

  const profiles = profilesRes?.data ?? [];
  const pendingUsers = isAdmin
    ? profiles.filter(p => ['pending', 'rejected'].includes(p.status))
    : [];

  const errors = [
    clientsRes.error, propertiesRes.error, requestsRes.error,
    matchesRes.error, showingsRes.error, tasksRes.error,
    priceRes?.error, dealsRes?.error, profilesRes?.error
  ].filter(Boolean).map(e => e.message);

  if (errors.length > 0) {
    console.warn('[loadUserData] Partial errors:', errors);
  }

  const allFailed = [clientsRes, propertiesRes, requestsRes, matchesRes].every(r => r.error != null);

  return {
    clients:     clientsRes.data ?? [],
    properties:  propertiesRes.data ?? [],
    requests:    requestsRes.data ?? [],
    matches:     matchesRes.data ?? [],
    showings:    showingsRes.data ?? [],
    tasks:       tasksRes.data ?? [],
    profiles:    profiles ?? [],
    pendingUsers,
    pricelist:   priceRes?.data ?? [],
    deals:       dealsRes?.data ?? [],
    error: errors.length > 0 ? errors.join('; ') : null,
    allFailed,
  };
}

/* ─── Session Cache ─────────────────────────────────────────────────────────── */
// Ключ кеша per-user чтобы не смешивать данные разных риелторов
const CACHE_KEY = (userId) => `rm_cache_${userId}`;
const CACHE_TTL = 2 * 60 * 1000; // 2 минуты — данные должны быть актуальными

export function getCachedData(userId) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY(userId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedData(userId, data) {
  try {
    sessionStorage.setItem(CACHE_KEY(userId), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // sessionStorage может быть недоступен в private mode — не критично
  }
}

export function clearCachedData(userId) {
  try {
    if (userId) sessionStorage.removeItem(CACHE_KEY(userId));
  } catch { /* ignore */ }
}



/* ─── Sync ─────────────────────────────────────────────────────────────────── */

/**
 * syncAction — отправляет изменение в Supabase.
 *
 * @param {object} rawAction      — действие после enhance (из useDbDispatch)
 * @param {function} onError      — (message: string) => void  — заменяет alert()
 * @param {function} onRollback   — (action: object) => void   — откат optimistic update
 */
export async function syncAction(rawAction, { onError, onRollback, currentUser } = {}) {
  const handleError = onError ?? ((msg) => console.error('[Supabase]', msg));

  try {
    const action = sanitizeObj(rawAction);
    let result;

    // ─── RBAC: Проверка прав для админских действий ─────────────────────
    const ADMIN_ONLY_ACTIONS = ['APPROVE_USER', 'REJECT_USER', 'ADD_PRICE_ITEM', 'UPDATE_PRICE_ITEM', 'DELETE_PRICE_ITEM'];
    
    if (ADMIN_ONLY_ACTIONS.includes(action.type)) {
      if (!currentUser || currentUser.role !== 'admin') {
        handleError(`Доступ запрещён: действие ${action.type} требует прав администратора`);
        return; // Не выполняем действие
      }
    }

    switch (action.type) {

      /* ── Профиль ─────────────────────────────────────────────────────── */
      case 'UPDATE_PROFILE': {
        const { id, full_name, phone, agency_name } = action.profile;
        result = await withRetry(() =>
          supabase.from('profiles').update({ full_name: full_name || '', phone: phone || '', agency_name: agency_name || '' }).eq('id', id)
        );
        break;
      }

      /* ── Клиенты ─────────────────────────────────────────────────────── */
      case 'ADD_CLIENT': {
        // Normalize client data
        const clientData = {
          ...action.client,
          // Extract phone from phones array if present
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts || [],
          passport_details: action.client.passport_details || null,
          source: action.client.source || null,
          notes: action.client.notes || null,
        };
        // Remove phones array (not in schema) and undefined fields
        delete clientData.phones;
        Object.keys(clientData).forEach(key => {
          if (clientData[key] === undefined) delete clientData[key];
        });

        result = await withRetry(() => supabase.from('clients').insert(clientData));

        // Ретрай без passport_details при ошибке схемы (hotfix для старых БД)
        if (_isPassportColumnError(result?.error)) {
          console.warn('[Supabase] passport_details column missing, retrying without it');
          const { passport_details: _pd, ...clientWithout } = clientData;
          result = await withRetry(() => supabase.from('clients').insert(clientWithout));
        }
        break;
      }

      case 'UPDATE_CLIENT': {
        const { id: cId, ...cData } = action.client;
        // Normalize client data
        const normalizedData = {
          ...cData,
          // Extract phone from phones array if present
          phone: cData.phone || (cData.phones && cData.phones[0]) || '',
          phone_2: (cData.phones && cData.phones.length > 1) ? cData.phones[1] : (cData.phone_2 || ''),
          client_types: cData.client_types || ['buyer'],
          additional_contacts: cData.additional_contacts || [],
          passport_details: cData.passport_details || null,
          source: cData.source || null,
          notes: cData.notes || null,
        };
        // Remove phones array (not in schema) and undefined fields
        delete normalizedData.phones;
        Object.keys(normalizedData).forEach(key => {
          if (normalizedData[key] === undefined) delete normalizedData[key];
        });

        result = await withRetry(() => supabase.from('clients').update(normalizedData).eq('id', cId));

        if (_isPassportColumnError(result?.error)) {
          console.warn('[Supabase] passport_details column missing, retrying without it');
          const { passport_details: _pd, ...dataWithout } = normalizedData;
          result = await withRetry(() => supabase.from('clients').update(dataWithout).eq('id', cId));
        }
        break;
      }

      case 'DELETE_CLIENT':
        result = await withRetry(() => supabase.from('clients').delete().eq('id', action.id));
        break;

      /* ── Объекты ─────────────────────────────────────────────────────── */
      case 'ADD_PROPERTY': {
        // Normalize property data - handle missing columns gracefully
        const propertyData = {
          ...action.property,
          // Ensure required fields exist
          deal_type: action.property.deal_type || 'sale',
          property_type: action.property.property_type || 'apartment',
          floors_total: action.property.floors_total || 9,
          build_year: action.property.build_year || new Date().getFullYear(),
          city: action.property.city || 'Киров',
          district: action.property.district || null,
          microdistrict: action.property.microdistrict || null,
          price_min: action.property.price_min || null,
          notes: action.property.notes || null,
          images: action.property.images || [],
          commission: action.property.commission ?? 0,
          client_ids: action.property.client_ids || (action.property.client_id ? [action.property.client_id] : []),
          client_id: (action.property.client_ids && action.property.client_ids.length > 0) 
            ? action.property.client_ids[0] 
            : (action.property.client_id || null),
          portfolio_analog_links: action.property.portfolio_analog_links || [],
        };
        // Remove legacy field
        delete propertyData.mortgage_calc_image;
        // Remove undefined fields to avoid schema errors
        Object.keys(propertyData).forEach(key => {
          if (propertyData[key] === undefined) delete propertyData[key];
        });

        result = await withRetry(() => supabase.from('properties').insert(propertyData));

        // Retry without notes if column missing
        if (result?.error && result.error.message?.includes('notes')) {
          console.warn('[Supabase] notes column missing, retrying without it');
          const { notes: _n, ...propertyWithoutNotes } = propertyData;
          result = await withRetry(() => supabase.from('properties').insert(propertyWithoutNotes));
        }
        // Retry without images if column missing
        if (result?.error && result.error.message?.includes('images')) {
          console.warn('[Supabase] images column missing, retrying without it');
          const { images: _i, ...propertyWithoutImages } = propertyData;
          result = await withRetry(() => supabase.from('properties').insert(propertyWithoutImages));
        }
        // Retry without new fields if columns are missing (migration 032 not applied)
        if (result?.error && _isNewPropertyColumnError(result.error)) {
          console.warn('[Supabase] New property columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewPropertyFields(propertyData, result.error);
          result = await withRetry(() => supabase.from('properties').insert(stripped));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;
      }

      case 'UPDATE_PROPERTY': {
        // Handle both { property: { ... } } and { id, data } formats
        const rawProp = action.property || { ...action.data, id: action.id };
        const propertyData = sanitizeObj(rawProp);
        const { id: pId, ...pData } = propertyData;
        // Normalize and clean property data
        const normalizedData = {
          ...pData,
          deal_type: pData.deal_type || 'sale',
          property_type: pData.property_type || 'apartment',
          floors_total: pData.floors_total || 9,
          build_year: pData.build_year || new Date().getFullYear(),
          city: pData.city || 'Киров',
          district: pData.district || null,
          microdistrict: pData.microdistrict || null,
          price_min: pData.price_min || null,
          notes: pData.notes || null,
          images: pData.images || [],
          commission: pData.commission ?? 0,
          client_ids: pData.client_ids || (pData.client_id ? [pData.client_id] : []),
          client_id: (pData.client_ids && pData.client_ids.length > 0)
            ? pData.client_ids[0]
            : (pData.client_id || null),
          portfolio_analog_links: pData.portfolio_analog_links || [],
        };
        // Remove legacy field
        delete normalizedData.mortgage_calc_image;
        // Remove undefined fields
        Object.keys(normalizedData).forEach(key => {
          if (normalizedData[key] === undefined) delete normalizedData[key];
        });

        result = await withRetry(() => supabase.from('properties').update(normalizedData).eq('id', pId));

        // Retry without notes if column missing
        if (result?.error && result.error.message?.includes('notes')) {
          console.warn('[Supabase] notes column missing, retrying without it');
          const { notes: _n, ...dataWithoutNotes } = normalizedData;
          result = await withRetry(() => supabase.from('properties').update(dataWithoutNotes).eq('id', pId));
        }
        // Retry without images if column missing
        if (result?.error && result.error.message?.includes('images')) {
          console.warn('[Supabase] images column missing, retrying without it');
          const { images: _i, ...dataWithoutImages } = normalizedData;
          result = await withRetry(() => supabase.from('properties').update(dataWithoutImages).eq('id', pId));
        }
        // Retry without new fields if columns are missing (migration 032 not applied)
        if (result?.error && _isNewPropertyColumnError(result.error)) {
          console.warn('[Supabase] New property columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewPropertyFields(normalizedData, result.error);
          result = await withRetry(() => supabase.from('properties').update(stripped).eq('id', pId));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;
      }

      case 'DELETE_PROPERTY':
        result = await withRetry(() => supabase.from('properties').delete().eq('id', action.id));
        break;

      /* ── Запросы ─────────────────────────────────────────────────────── */
      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST':
        result = await withRetry(() => supabase.from('requests').upsert(action.request));
        
        if (result?.error && _isNewRequestColumnError(result.error)) {
          console.warn('[Supabase] New request columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewRequestFields(action.request, result.error);
          result = await withRetry(() => supabase.from('requests').upsert(stripped));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;

      case 'DELETE_REQUEST':
        result = await withRetry(() => supabase.from('requests').delete().eq('id', action.id));
        break;

      /* ── Матчи ───────────────────────────────────────────────────────── */
      case 'UPDATE_MATCH':
        result = await withRetry(() => supabase.from('matches').upsert(action.match));
        break;

      /* ── Закрытие сделки ─────────────────────────────────────────────── */
      case 'CLOSE_DEAL': {
        const { matchId, propertyId, requestId, now } = action;
        const results = await Promise.all([
          supabase.from('matches').update({ status: 'deal', updated_at: now }).eq('id', matchId),
          supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('property_id', propertyId).neq('id', matchId),
          supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('request_id', requestId).neq('id', matchId),
          supabase.from('properties').update({ status: 'sold', updated_at: now }).eq('id', propertyId),
          supabase.from('requests').update({ status: 'found', updated_at: now }).eq('id', requestId),
        ]);
        results.forEach((res, i) => {
          if (res.error) console.error(`[Supabase Deal Sync Error ${i}]`, res.error);
        });
        return; // Ранний выход — нет единственного result для проверки
      }

      /* ── Показы ──────────────────────────────────────────────────────── */
      case 'ADD_SHOWING': {
        const showingData = sanitizeObj(action.showing);
        const queries = [withRetry(() => supabase.from('showings').upsert(showingData))];
        if (action.task) queries.push(withRetry(() => supabase.from('tasks').upsert(action.task)));
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) queries.push(withRetry(() => supabase.from('matches').upsert(match)));
        }
        const results = await Promise.all(queries);
        
        // Retry showing if failed due to missing columns
        if (results[0]?.error && _isNewShowingColumnError(results[0].error)) {
          console.warn('[Supabase] New showing columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewShowingFields(showingData, results[0].error);
          await withRetry(() => supabase.from('showings').upsert(stripped));
        }
        
        results.forEach((res, i) => {
          if (res?.error && !_isNewShowingColumnError(res.error)) console.error(`[Supabase Showing Sync Error ${i}]`, res.error);
        });
        return;
      }

      case 'UPDATE_SHOWING': {
        const showingData = sanitizeObj(action.showing);
        const queries = [withRetry(() => supabase.from('showings').upsert(showingData))];
        if (action.matches) queries.push(withRetry(() => supabase.from('matches').upsert(action.matches)));
        const results = await Promise.all(queries);
        
        // Retry showing if failed due to missing columns
        if (results[0]?.error && _isNewShowingColumnError(results[0].error)) {
          console.warn('[Supabase] New showing columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewShowingFields(showingData, results[0].error);
          await withRetry(() => supabase.from('showings').upsert(stripped));
        }

        results.forEach((res, i) => {
          if (res?.error && !_isNewShowingColumnError(res.error)) console.error(`[Supabase Showing Update Error ${i}]`, res.error);
        });
        return;
      }

      case 'DELETE_SHOWING':
        result = await withRetry(() => supabase.from('showings').delete().eq('id', action.id));
        break;

      /* ── Задачи ──────────────────────────────────────────────────────── */
      case 'ADD_TASK':
      case 'UPDATE_TASK':
        result = await withRetry(() => supabase.from('tasks').upsert(action.task));
        break;

      case 'DELETE_TASK':
        result = await withRetry(() => supabase.from('tasks').delete().eq('id', action.id));
        break;

      /* ── Пользователи (admin) ────────────────────────────────────────── */
      case 'APPROVE_USER':
        result = await withRetry(() => supabase.from('profiles').update({ status: 'approved' }).eq('id', action.userId));
        break;

      case 'REJECT_USER':
        result = await withRetry(() => supabase.from('profiles').update({ status: 'rejected' }).eq('id', action.userId));
        break;

      /* ── Прайс-лист ──────────────────────────────────────────────────── */
      case 'ADD_PRICE_ITEM':
        result = await withRetry(() => supabase.from('pricelist').insert(action.item));
        break;

      case 'UPDATE_PRICE_ITEM':
        result = await withRetry(() =>
          supabase.from('pricelist')
            .update({ name: action.item.name, price: action.item.price, show_in_sale: action.item.show_in_sale, show_in_purchase: action.item.show_in_purchase })
            .eq('id', action.item.id)
        );
        break;

      case 'DELETE_PRICE_ITEM':
        result = await withRetry(() => supabase.from('pricelist').delete().eq('id', action.id));
        break;
      

      case 'DELETE_SHOWING':
        result = await withRetry(() => supabase.from('showings').delete().eq('id', action.id));
        break;

      /* ── Сделки ──────────────────────────────────────────────────────── */
      case 'ADD_DEAL': {
        const dealData = {
          ...action.deal,
          deal_date: action.deal.deal_date || null,
          deposit_date: action.deal.deposit_date || null,
          deposit_amount: action.deal.deposit_amount || 0,
          seller_ids: action.deal.seller_ids || [],
          buyer_ids: action.deal.buyer_ids || [],
          notes: action.deal.notes || null,
          mortgage_bank: action.deal.mortgage_bank || null,
          mortgage_amount: action.deal.mortgage_amount || 0,
          mortgage_expiry: action.deal.mortgage_expiry || null,
        };
        // Remove undefined
        Object.keys(dealData).forEach(key => {
          if (dealData[key] === undefined) delete dealData[key];
        });
        result = await withRetry(() => supabase.from('deals').insert(dealData));
        
        if (result?.error && _isNewDealColumnError(result.error)) {
          console.warn('[Supabase] New deal columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewDealFields(dealData, result.error);
          result = await withRetry(() => supabase.from('deals').insert(stripped));
        }
        break;
      }

      case 'UPDATE_DEAL': {
        const { id: dId, ...dData } = action.deal;
        const updateData = {
          ...dData,
          deal_date: dData.deal_date || null,
          deposit_date: dData.deposit_date || null,
          deposit_amount: dData.deposit_amount ?? 0,
          seller_ids: dData.seller_ids || [],
          buyer_ids: dData.buyer_ids || [],
          notes: dData.notes || null,
          mortgage_bank: dData.mortgage_bank || null,
          mortgage_amount: dData.mortgage_amount || 0,
          mortgage_expiry: dData.mortgage_expiry || null,
        };
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) delete updateData[key];
        });
        result = await withRetry(() => supabase.from('deals').update(updateData).eq('id', dId));

        if (result?.error && _isNewDealColumnError(result.error)) {
          console.warn('[Supabase] New deal columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewDealFields(updateData, result.error);
          result = await withRetry(() => supabase.from('deals').update(stripped).eq('id', dId));
        }
        break;
      }

      case 'DELETE_DEAL':
        result = await withRetry(() => supabase.from('deals').delete().eq('id', action.id));
        break;

      case 'CLOSE_DEAL': {
        const { propertyId, requestId, matchId, now } = action;
        // Run updates in parallel
        await Promise.all([
          withRetry(() => supabase.from('properties').update({ status: 'sold', updated_at: now }).eq('id', propertyId)),
          withRetry(() => supabase.from('requests').update({ status: 'found', updated_at: now }).eq('id', requestId)),
          withRetry(() => supabase.from('matches').update({ status: 'deal', updated_at: now }).eq('id', matchId)),
          withRetry(() => 
            supabase.from('matches')
              .update({ status: 'rejected', updated_at: now })
              .or(`property_id.eq.${propertyId},request_id.eq.${requestId}`)
              .neq('id', matchId)
          )
        ]);
        break;
      }

      default:
        return; // Неизвестный тип — ничего не делаем
    }

    /* ── Обработка финальной ошибки ──────────────────────────────────── */
    if (result?.error) {
      console.error('[Supabase Sync Error]', action.type, result.error);

      // Check for missing column error
      const missingColumnMatch = result.error.message.match(/Could not find the '(\w+)' column/);

      if (result.error.code === '42501') {
        // RLS — ошибка доступа
        handleError('Ошибка доступа (RLS): у вашей роли нет прав на это действие.');
      } else if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
        // Table doesn't exist - migration needed
        handleError('Таблица не найдена. Необходимо выполнить миграцию базы данных.');
      } else if (result.error.code === '23502') {
        // NOT NULL violation
        handleError('Не заполнено обязательное поле.');
      } else if (result.error.code === '23503') {
        // Foreign key violation
        handleError('Связанный объект не найден. Проверьте данные.');
      } else if (missingColumnMatch) {
        // Missing column - provide helpful message
        const columnName = missingColumnMatch[1];
        handleError(
          `Отсутствует колонка "${columnName}". Необходима миграция БД.`
        );
      } else {
        // Прочие ошибки
        handleError(`Ошибка сохранения: ${result.error.message}`);
        if (typeof onRollback === 'function') {
          onRollback(action);
        }
      }
    }

  } catch (err) {
    console.error('[Supabase Critical Error]', rawAction.type, err);
    handleError('Критическая ошибка соединения с базой данных. Проверьте подключение к интернету.');
    if (typeof onRollback === 'function') {
      onRollback(rawAction);
    }
  }
}

/* ─── Private Helpers ──────────────────────────────────────────────────────── */

function _isPassportColumnError(error) {
  return (
    error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    error.message?.includes('passport_details')
  );
}

// Fields added in migration 032 that may not exist in older DB schemas
const NEW_PROPERTY_FIELDS = [
  'seeking_alternative', 'elevator_type',
  'renovation', 'bathroom', 'balcony', 'parking', 'furniture',
  'mortgage',
  'mortgage_available',
  'matcapital_available', 'certificate_available',
  'encumbrance', 'minor_owners', 'docs_ready',
  'apartments_count', 'has_elevator', 'has_garbage_chute',
  'ceiling_height', 'house_series', 'developer',
  'management_company', 'cadastral_number', 'building_type',
  'urgency', 'market_type', 'residential_complex', 'price_min',
  'portfolio_new_builds_files',
  'portfolio_resale_files',
  'portfolio_mortgage_files',
  'portfolio_analog_links',
  'client_ids',
];

function _isNewPropertyColumnError(error) {
  if (!error) return false;
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  return NEW_PROPERTY_FIELDS.some(f => error.message?.includes(f));
}

function _stripNewPropertyFields(data, error) {
  const stripped = { ...data };
  if (error && error.message) {
    // Only strip fields that are mentioned in the error message
    NEW_PROPERTY_FIELDS.forEach(f => {
      if (error.message.includes(f)) {
        delete stripped[f];
      }
    });
  } else {
    // Fallback: if no message, strip all new fields
    NEW_PROPERTY_FIELDS.forEach(f => delete stripped[f]);
  }
  return stripped;
}

const NEW_REQUEST_FIELDS = ['client_ids', 'mortgage'];
const NEW_SHOWING_FIELDS = ['client_ids', 'event_type'];
const NEW_DEAL_FIELDS    = ['mortgage', 'expenses', 'mortgage_bank', 'mortgage_amount', 'mortgage_expiry'];

function _isNewRequestColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_REQUEST_FIELDS.some(f => error.message?.includes(f));
}

function _isNewShowingColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_SHOWING_FIELDS.some(f => error.message?.includes(f));
}

function _isNewDealColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_DEAL_FIELDS.some(f => error.message?.includes(f));
}

function _stripNewRequestFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_REQUEST_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_REQUEST_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}

function _stripNewShowingFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_SHOWING_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_SHOWING_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}

function _stripNewDealFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_DEAL_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_DEAL_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}
