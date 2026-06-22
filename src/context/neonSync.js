/**
 * src/context/neonSync.js — Синхронизация данных с Neon
 *
 * Аналог supabaseSync.js, но использует neonDb вместо supabase.from(...).
 * Все запросы идут через /api/neon-query (Vercel serverless).
 *
 * Экспортирует:
 *   loadUserData(userId, role) — загрузка всех данных пользователя
 *   syncAction(action, opts)  — запись изменений в БД
 */

import { neonDb } from '../lib/neon';
import { sanitizeObj, mapShowingFromDb, mapShowingToDb } from './supabaseSync';

/* ─── Loader ───────────────────────────────────────────────────────────── */

/**
 * Загружает все данные пользователя из Neon.
 * Аналог loadUserData из supabaseSync.js.
 */
export async function loadUserData(userId, role) {
  const isAdmin = role === 'admin';

  const sqlQuery = isAdmin
    ? `
      SELECT json_build_object(
        'clients', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "clients" t),
        'properties', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "properties" t),
        'requests', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "requests" t),
        'matches', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "matches" t),
        'showings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "showings" t),
        'tasks', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "tasks" t),
        'pricelist', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "pricelist" t),
        'deals', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "deals" t),
        'profiles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "profiles" t),
        'selection_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "selection_items" t)
      ) as data
    `
    : `
      SELECT json_build_object(
        'clients', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "clients" t WHERE t."realtor_id" = $1),
        'properties', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "properties" t),
        'requests', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "requests" t),
        'matches', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "matches" t WHERE t."realtor_id" = $1),
        'showings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "showings" t WHERE t."realtor_id" = $1),
        'tasks', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "tasks" t WHERE t."realtor_id" = $1),
        'pricelist', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "pricelist" t),
        'deals', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "deals" t WHERE t."realtor_id" = $1),
        'profiles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "profiles" t),
        'selection_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "selection_items" t WHERE t."realtor_id" = $1)
      ) as data
    `;

  console.warn(`[neonSync] Loading all tables in a single query...`);
  const start = Date.now();
  const res = await neonDb.query(sqlQuery, isAdmin ? [] : [userId]);
  console.warn(`[neonSync] Loaded all tables in ${Date.now() - start}ms`);

  const fetchedData = res.data?.[0]?.data || {};
  const error = res.error ? (typeof res.error === 'object' ? res.error.message : res.error) : null;

  if (error) {
    console.error('[neonSync loadUserData] Error:', error);
  }

  const profiles = fetchedData.profiles ?? [];
  const pendingUsers = isAdmin
    ? profiles.filter(p => ['pending', 'rejected'].includes(p.status))
    : [];

  const rawShowings = fetchedData.showings ?? [];
  const processedShowings = rawShowings.map(mapShowingFromDb);

  return {
    clients:     fetchedData.clients ?? [],
    properties:  fetchedData.properties ?? [],
    requests:    fetchedData.requests ?? [],
    matches:     fetchedData.matches ?? [],
    showings:    processedShowings,
    tasks:       fetchedData.tasks ?? [],
    profiles:    profiles,
    pendingUsers,
    pricelist:   fetchedData.pricelist ?? [],
    deals:       fetchedData.deals ?? [],
    selectionItems: (fetchedData.selection_items ?? []).map(item => ({
      ...item,
      client_ids: item.client_ids || (item.client_id ? [item.client_id] : []),
      client_id: (item.client_ids && item.client_ids.length > 0)
        ? item.client_ids[0]
        : (item.client_id || null),
    })),
    error: error,
    allFailed: !!error,
  };
}

/* ─── Sync ─────────────────────────────────────────────────────────────── */

/**
 * syncAction — отправляет изменение в Neon.
 * Аналог syncAction из supabaseSync.js.
 *
 * @param {object} rawAction    — действие (из useDbDispatch)
 * @param {function} onError    — (message: string) => void
 * @param {function} onRollback — (action: object) => void
 * @param {object} currentUser  — текущий пользователь
 */
export async function syncAction(rawAction, { onError, onRollback, currentUser } = {}) {
  const handleError = (msg) => {
    if (onError) onError(msg);
    else console.error('[neonSync]', msg);
  };

  try {
    const action = sanitizeObj(rawAction);
    let result;

    // ─── RBAC: Проверка прав для админских действий ─────────────
    const ADMIN_ONLY_ACTIONS = ['APPROVE_USER', 'REJECT_USER', 'ADD_PRICE_ITEM', 'UPDATE_PRICE_ITEM', 'DELETE_PRICE_ITEM'];
    if (ADMIN_ONLY_ACTIONS.includes(action.type)) {
      if (!currentUser || currentUser.role !== 'admin') {
        handleError(`Доступ запрещён: действие ${action.type} требует прав администратора`);
        return false;
      }
    }

    switch (action.type) {

      /* ── Профиль ────────────────────────────────────────────── */
      case 'UPDATE_PROFILE': {
        const { id, full_name, phone, agency_name, inn } = action.profile;
        const updateData = { full_name: full_name || '', phone: phone || '', agency_name: agency_name || '' };
        if (inn !== undefined) updateData.inn = inn || null;
        result = await neonDb.update('profiles', id, updateData);
        break;
      }

      /* ── Клиенты ──────────────────────────────────────────── */
      case 'ADD_CLIENT': {
        const clientData = {
          realtor_id: action.client.realtor_id,
          full_name: action.client.full_name || '',
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          email: action.client.email || null,
          messenger: action.client.messenger || null,
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts || [],
          source: action.client.source || null,
          status: action.client.status || 'active',
          notes: action.client.notes || null,
          passport_details: action.client.passport_details || null,
        };
        if (action.client.id) clientData.id = action.client.id;
        if (action.client.created_at) clientData.created_at = action.client.created_at;
        if (action.client.updated_at) clientData.updated_at = action.client.updated_at;
        Object.keys(clientData).forEach(key => { if (clientData[key] === undefined) delete clientData[key]; });
        result = await neonDb.insert('clients', clientData);
        break;
      }

      case 'UPDATE_CLIENT': {
        const { id: cId } = action.client;
        const normalizedData = {
          realtor_id: action.client.realtor_id,
          full_name: action.client.full_name,
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          email: action.client.email || null,
          messenger: action.client.messenger || null,
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts || [],
          source: action.client.source || null,
          status: action.client.status || 'active',
          notes: action.client.notes || null,
          passport_details: action.client.passport_details || null,
        };
        if (action.client.created_at) normalizedData.created_at = action.client.created_at;
        if (action.client.updated_at) normalizedData.updated_at = action.client.updated_at;
        Object.keys(normalizedData).forEach(key => { if (normalizedData[key] === undefined) delete normalizedData[key]; });
        result = await neonDb.update('clients', cId, normalizedData);
        break;
      }

      case 'DELETE_CLIENT':
        result = await neonDb.delete('clients', action.id);
        break;

      /* ── Подбор ────────────────────────────────────────────── */
      case 'ADD_SELECTION_ITEM': {
        const itemData = { ...action.item };
        Object.keys(itemData).forEach(key => { if (itemData[key] === undefined) delete itemData[key]; });
        result = await neonDb.insert('selection_items', itemData);
        break;
      }

      case 'UPDATE_SELECTION_ITEM': {
        const { id: iId, ...iData } = action.item;
        const itemData = { ...iData };
        Object.keys(itemData).forEach(key => { if (itemData[key] === undefined) delete itemData[key]; });
        result = await neonDb.update('selection_items', iId, itemData);
        break;
      }

      case 'DELETE_SELECTION_ITEM':
        result = await neonDb.delete('selection_items', action.id);
        break;

      /* ── Объекты ──────────────────────────────────────────── */
      case 'ADD_PROPERTY': {
        const propertyData = {
          ...action.property,
          deal_type:    action.property.deal_type || 'sale',
          property_type: action.property.property_type || 'apartment',
          floors_total: action.property.floors_total || 9,
          build_year:   action.property.build_year || new Date().getFullYear(),
          city:         action.property.city || 'Киров',
          district:     action.property.district || null,
          microdistrict: action.property.microdistrict || null,
          price_min:    action.property.price_min || null,
          notes:        action.property.notes || null,
          images:       action.property.images || [],
          floorplan_images: action.property.floorplan_images || [],
          commission:   action.property.commission ?? 0,
          client_ids:   action.property.client_ids || (action.property.client_id ? [action.property.client_id] : []),
          client_id:    (action.property.client_ids && action.property.client_ids.length > 0)
            ? action.property.client_ids[0]
            : (action.property.client_id || null),
          portfolio_analog_links: action.property.portfolio_analog_links || [],
        };
        delete propertyData.mortgage_calc_image;
        Object.keys(propertyData).forEach(key => { if (propertyData[key] === undefined) delete propertyData[key]; });

        result = await neonDb.insert('properties', propertyData);

        if (!result?.error && action.matches?.length > 0) {
          for (const m of action.matches) {
            const mRes = await neonDb.upsert('matches', m);
            if (mRes?.error) console.error('[neonSync Match Upsert Error]', mRes.error);
          }
        }
        break;
      }

      case 'UPDATE_PROPERTY': {
        const rawProp = action.property || { ...action.data, id: action.id };
        const propertyData = sanitizeObj(rawProp);
        const { id: pId, ...pData } = propertyData;
        const normalizedData = {
          ...pData,
          deal_type:    pData.deal_type || 'sale',
          property_type: pData.property_type || 'apartment',
          floors_total: pData.floors_total || 9,
          build_year:   pData.build_year || new Date().getFullYear(),
          city:         pData.city || 'Киров',
          district:     pData.district || null,
          microdistrict: pData.microdistrict || null,
          price_min:    pData.price_min || null,
          notes:        pData.notes || null,
          images:       pData.images || [],
          floorplan_images: pData.floorplan_images || [],
          commission:   pData.commission ?? 0,
          client_ids:   pData.client_ids || (pData.client_id ? [pData.client_id] : []),
          client_id:    (pData.client_ids && pData.client_ids.length > 0)
            ? pData.client_ids[0]
            : (pData.client_id || null),
          portfolio_analog_links: pData.portfolio_analog_links || [],
        };
        delete normalizedData.mortgage_calc_image;
        Object.keys(normalizedData).forEach(key => { if (normalizedData[key] === undefined) delete normalizedData[key]; });

        result = await neonDb.update('properties', pId, normalizedData);

        if (!result?.error && action.matches?.length > 0) {
          for (const m of action.matches) {
            const mRes = await neonDb.upsert('matches', m);
            if (mRes?.error) console.error('[neonSync Match Upsert Error]', mRes.error);
          }
        }
        break;
      }

      case 'PATCH_PROPERTY': {
        const { id: patchId, ...patchData } = action.patch;
        Object.keys(patchData).forEach(k => { if (patchData[k] === undefined) delete patchData[k]; });
        result = await neonDb.update('properties', patchId, {
          ...patchData,
          updated_at: new Date().toISOString()
        });
        break;
      }

      case 'DELETE_PROPERTY':
        result = await neonDb.delete('properties', action.id);
        break;

      /* ── Запросы ──────────────────────────────────────────── */
      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST': {
        result = await neonDb.upsert('requests', action.request);
        if (!result?.error && action.matches?.length > 0) {
          for (const m of action.matches) {
            const mRes = await neonDb.upsert('matches', m);
            if (mRes?.error) console.error('[neonSync Match Upsert Error]', mRes.error);
          }
        }
        break;
      }

      case 'DELETE_REQUEST':
        result = await neonDb.delete('requests', action.id);
        break;

      /* ── Матчи ────────────────────────────────────────────── */
      case 'UPDATE_MATCH':
        result = await neonDb.upsert('matches', action.match);
        break;

      case 'DELETE_MATCH':
        result = await neonDb.delete('matches', action.id);
        break;

      /* ── Показы ───────────────────────────────────────────── */
      case 'ADD_SHOWING': {
        const VALID_SHOWING_COLUMNS = [
          'id', 'realtor_id', 'match_id', 'property_id', 'client_id',
          'showing_date', 'status', 'client_feedback', 'feedback_comment',
          'created_at', 'updated_at', 'event_type', 'client_ids', 'google_event_id'
        ];
        const rawShowing = {};
        VALID_SHOWING_COLUMNS.forEach(col => {
          if (action.showing[col] !== undefined) rawShowing[col] = action.showing[col];
        });
        const showingData = mapShowingToDb(sanitizeObj(rawShowing));
        
        const showingResult = await neonDb.upsert('showings', showingData);
        if (showingResult?.error) {
          handleError(`Ошибка сохранения события: ${showingResult.error?.message || showingResult.error}`);
          if (typeof onRollback === 'function') onRollback(action);
          return false;
        }

        if (action.task) {
          const taskResult = await neonDb.upsert('tasks', sanitizeObj(action.task));
          if (taskResult?.error) console.error('[neonSync ADD_SHOWING task error]', taskResult.error);
        }
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) {
            const matchResult = await neonDb.upsert('matches', match);
            if (matchResult?.error) console.error('[neonSync ADD_SHOWING match error]', matchResult.error);
          }
        }
        return true;
      }

      case 'UPDATE_SHOWING': {
        const VALID_SHOWING_COLUMNS = [
          'id', 'realtor_id', 'match_id', 'property_id', 'client_id',
          'showing_date', 'status', 'client_feedback', 'feedback_comment',
          'created_at', 'updated_at', 'event_type', 'client_ids', 'google_event_id'
        ];
        const rawShowing = {};
        VALID_SHOWING_COLUMNS.forEach(col => {
          if (action.showing[col] !== undefined) rawShowing[col] = action.showing[col];
        });
        const showingData = mapShowingToDb(sanitizeObj(rawShowing));
        const showingResult = await neonDb.upsert('showings', showingData);
        if (showingResult?.error) {
          handleError(`Ошибка обновления события: ${showingResult.error?.message || showingResult.error}`);
          if (typeof onRollback === 'function') onRollback(action);
          return false;
        }
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) await neonDb.upsert('matches', match);
        }
        return true;
      }

      case 'DELETE_SHOWING':
        result = await neonDb.delete('showings', action.id);
        break;

      /* ── Задачи ───────────────────────────────────────────── */
      case 'ADD_TASK':
      case 'UPDATE_TASK':
        result = await neonDb.upsert('tasks', action.task);
        break;

      case 'DELETE_TASK':
        result = await neonDb.delete('tasks', action.id);
        break;

      /* ── Пользователи (admin) ─────────────────────────────── */
      case 'APPROVE_USER':
        result = await neonDb.update('profiles', action.userId, { status: 'approved' });
        break;

      case 'REJECT_USER':
        result = await neonDb.update('profiles', action.userId, { status: 'rejected' });
        break;

      /* ── Прайс-лист ───────────────────────────────────────── */
      case 'ADD_PRICE_ITEM':
        result = await neonDb.insert('pricelist', action.item);
        break;

      case 'UPDATE_PRICE_ITEM':
        result = await neonDb.update('pricelist', action.item.id, {
          name:             action.item.name,
          price:            action.item.price,
          show_in_sale:     action.item.show_in_sale,
          show_in_purchase: action.item.show_in_purchase,
        });
        break;

      case 'DELETE_PRICE_ITEM':
        result = await neonDb.delete('pricelist', action.id);
        break;

      /* ── Сделки ───────────────────────────────────────────── */
      case 'ADD_DEAL': {
        const dealData = {
          ...action.deal,
          deal_date:      action.deal.deal_date || null,
          deposit_date:   action.deal.deposit_date || null,
          deposit_amount: action.deal.deposit_amount || 0,
          seller_ids:     action.deal.seller_ids || [],
          buyer_ids:      action.deal.buyer_ids || [],
          notes:          action.deal.notes || null,
          mortgage_bank:  action.deal.mortgage_bank || null,
          mortgage_amount: action.deal.mortgage_amount || 0,
          mortgage_expiry: action.deal.mortgage_expiry || null,
          lawyer:         action.deal.lawyer || null,
        };
        Object.keys(dealData).forEach(key => { if (dealData[key] === undefined) delete dealData[key]; });
        result = await neonDb.insert('deals', dealData);
        break;
      }

      case 'UPDATE_DEAL': {
        const { id: dId, ...dData } = action.deal;
        const updateData = {
          ...dData,
          deal_date:      dData.deal_date || null,
          deposit_date:   dData.deposit_date || null,
          deposit_amount: dData.deposit_amount ?? 0,
          seller_ids:     dData.seller_ids || [],
          buyer_ids:      dData.buyer_ids || [],
          notes:          dData.notes || null,
          mortgage_bank:  dData.mortgage_bank || null,
          mortgage_amount: dData.mortgage_amount || 0,
          mortgage_expiry: dData.mortgage_expiry || null,
          lawyer:         dData.lawyer || null,
        };
        Object.keys(updateData).forEach(key => { if (updateData[key] === undefined) delete updateData[key]; });
        result = await neonDb.update('deals', dId, updateData);
        break;
      }

      case 'DELETE_DEAL':
        result = await neonDb.delete('deals', action.id);
        break;

      case 'CLOSE_DEAL': {
        const { propertyId, requestId, matchId, now } = action;
        const results = await Promise.all([
          neonDb.update('properties', propertyId, { status: 'sold', updated_at: now }),
          neonDb.update('requests',   requestId,  { status: 'found', updated_at: now }),
          neonDb.update('matches',    matchId,    { status: 'deal', updated_at: now }),
          // Отклоняем все остальные матчи для этого объекта или запроса
          neonDb.query(
            `UPDATE matches SET status = 'rejected', updated_at = $1
             WHERE (property_id = $2 OR request_id = $3) AND id != $4`,
            [now, propertyId, requestId, matchId]
          )
        ]);
        const firstError = results.find(r => r?.error);
        if (firstError) result = firstError;
        break;
      }

      default:
        return; // Неизвестный тип — ничего не делаем
    }

    /* ── Обработка ошибок ────────────────────────────────────── */
    if (result?.error) {
      const errMsg = typeof result.error === 'object' ? result.error.message : result.error;
      const errCode = typeof result.error === 'object' ? result.error.code : null;

      console.error('[neonSync Sync Error]', action.type, result.error);

      if (errCode === 'SESSION_EXPIRED' || errMsg?.includes('expired') || errMsg?.includes('token')) {
        handleError('Сессия авторизации истекла. Пожалуйста, войдите в систему заново.');
      } else if (errCode === '23502') {
        handleError('Не заполнено обязательное поле.');
      } else if (errCode === '23503') {
        handleError('Связанный объект не найден. Проверьте данные.');
      } else {
        handleError(`Ошибка сохранения: ${errMsg}`);
      }

      if (typeof onRollback === 'function') onRollback(action);
      return false;
    }

    return true;

  } catch (err) {
    console.error('[neonSync Critical Error]', err);
    handleError('Критическая ошибка соединения с базой данных. Проверьте подключение к интернету.');
    if (typeof onRollback === 'function') onRollback(rawAction);
    return false;
  }
}
