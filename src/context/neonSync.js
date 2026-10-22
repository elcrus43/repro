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
import { DEMO_PROPERTIES, DEMO_REQUESTS } from '../data/seed';
import { hasPassedDealStage } from '../utils/matching';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Рекурсивно заменяет пустые строки на null перед отправкой в БД.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_KEYS = new Set(['id', 'realtor_id', 'client_id', 'agent_id', 'lawyer_id', 'property_id', 'seller_id', 'buyer_id', 'user_id', 'match_id', 'request_id', 'authorized_person_id']);

export function sanitizeObj(obj) {
  if (obj === '') return null;
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => {
    if (typeof item === 'string') return item === '' ? null : item;
    return sanitizeObj(item);
  });

  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    const val = sanitized[key];

    if (val === '') {
      sanitized[key] = null;
    } else if (UUID_KEYS.has(key) && typeof val === 'string' && !UUID_RE.test(val)) {
      sanitized[key] = null;
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map(item => {
        if (typeof item === 'string') return item === '' ? null : item;
        return sanitizeObj(item);
      });
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObj(val);
    }
  });
  return sanitized;
}

/**
 * Преобразует показ (showing) из формата БД в формат клиента.
 */
export function mapShowingFromDb(s) {
  if (!s) return s;
  let clientIds = s.client_ids;
  if (typeof clientIds === 'string') {
    clientIds = clientIds.replace(/[{}]/g, '').split(',').filter(Boolean);
  } else if (!Array.isArray(clientIds)) {
    clientIds = s.client_id ? [s.client_id] : [];
  }
  let showing = { ...s, client_ids: clientIds };
  if (showing.event_type === 'viewing' && showing.google_event_id?.startsWith('selection_prop_id:')) {
    const parts = showing.google_event_id.split('::cal_id:');
    const propId = parts[0].replace('selection_prop_id:', '');
    const calId = parts[1] || null;
    return {
      ...showing,
      property_id: propId,
      google_event_id: calId
    };
  }
  return showing;
}

/**
 * Преобразует показ (showing) из формата клиента в формат БД.
 */
export function mapShowingToDb(s) {
  if (!s) return s;
  const dbShowing = { ...s };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (dbShowing.client_id && !UUID_RE.test(dbShowing.client_id)) {
    dbShowing.client_id = null;
  }
  if (dbShowing.realtor_id && !UUID_RE.test(dbShowing.realtor_id)) {
    dbShowing.realtor_id = null;
  }
  if (dbShowing.property_id && !UUID_RE.test(dbShowing.property_id)) {
    dbShowing.property_id = null;
  }
  if (dbShowing.match_id && !UUID_RE.test(dbShowing.match_id)) {
    dbShowing.match_id = null;
  }
  if (dbShowing.property_id === '') dbShowing.property_id = null;
  if (dbShowing.client_id === '') dbShowing.client_id = null;
  if (dbShowing.realtor_id === '') dbShowing.realtor_id = null;
  if (dbShowing.match_id === '') dbShowing.match_id = null;
  let cIds = dbShowing.client_ids;
  if (typeof cIds === 'string') {
    cIds = cIds.replace(/[{}]/g, '').split(',').filter(Boolean);
  }
  if (Array.isArray(cIds)) {
    dbShowing.client_ids = cIds.filter(cid => UUID_RE.test(cid));
  } else if (dbShowing.client_id && UUID_RE.test(dbShowing.client_id)) {
    dbShowing.client_ids = [dbShowing.client_id];
  } else {
    dbShowing.client_ids = [];
  }

  if (dbShowing.event_type === 'viewing' && dbShowing.property_id) {
    const propId = dbShowing.property_id;
    dbShowing.property_id = null;
    
    let calId = dbShowing.google_event_id;
    if (dbShowing.google_event_id?.startsWith('selection_prop_id:')) {
      const parts = dbShowing.google_event_id.split('::cal_id:');
      calId = parts[1] || null;
    }
    
    if (calId) {
      dbShowing.google_event_id = `selection_prop_id:${propId}::cal_id:${calId}`;
    } else {
      dbShowing.google_event_id = `selection_prop_id:${propId}`;
    }
  } else if (dbShowing.property_id === '') {
    dbShowing.property_id = null;
  }
  return dbShowing;
}

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
        'profiles', (SELECT COALESCE(json_agg(json_build_object(
          'id', t.id,
          'email', t.email,
          'full_name', t.full_name,
          'phone', t.phone,
          'agency_name', t.agency_name,
          'inn', t.inn,
          'role', t.role,
          'status', t.status,
          'created_at', t.created_at,
          'passport_details', t.passport_details
        )), '[]'::json) FROM "profiles" t),
        'selection_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "selection_items" t)
      ) as data
    `
    : `
      SELECT json_build_object(
        'clients', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "clients" t WHERE t."realtor_id" = $1),
        'properties', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "properties" t),
        'requests', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "requests" t WHERE t."realtor_id" = $1),
        'matches', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "matches" t WHERE t."realtor_id" = $1),
        'showings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "showings" t WHERE t."realtor_id" = $1),
        'tasks', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "tasks" t WHERE t."realtor_id" = $1),
        'pricelist', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "pricelist" t),
        'deals', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "deals" t WHERE t."realtor_id" = $1),
        'profiles', (SELECT COALESCE(json_agg(json_build_object(
          'id', t.id,
          'email', t.email,
          'full_name', t.full_name,
          'phone', t.phone,
          'agency_name', t.agency_name,
          'inn', t.inn,
          'role', t.role,
          'status', t.status,
          'created_at', t.created_at,
          'passport_details', CASE WHEN t.id = $1 THEN t.passport_details ELSE NULL END
        )), '[]'::json) FROM "profiles" t),
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

  const DEMO_IDS = new Set([
    'c1', 'c2', 'c3', 'c4', 'c5', 'c9999999-0000-4000-8000-000000000099',
    'sh1', 't1', 't2', 't3',
    'bb9ece69-0b37-4f7f-8af2-36cba13f28ba', '30620d8f-65f4-4f7d-baa7-879079ac30e8'
  ]);

  const getLocal = (key) => {
    try {
      const d = localStorage.getItem(`repro_${key}`);
      if (!d) return [];
      const parsed = JSON.parse(d);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => item && item.id && !DEMO_IDS.has(item.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(`repro_${key}`, JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  };

  const mergeUnique = (fetchedList, localList, defaultList = []) => {
    const map = new Map();
    (defaultList || []).forEach(item => { if (item && item.id && !DEMO_IDS.has(item.id)) map.set(item.id, item); });
    (localList || []).forEach(item => { if (item && item.id && !DEMO_IDS.has(item.id)) map.set(item.id, item); });
    (fetchedList || []).forEach(item => { if (item && item.id && !DEMO_IDS.has(item.id)) map.set(item.id, item); });
    return Array.from(map.values());
  };

  const profiles = fetchedData.profiles ?? [];
  const pendingUsers = isAdmin
    ? profiles.filter(p => ['pending', 'rejected'].includes(p.status))
    : [];

  const rawShowings = mergeUnique(fetchedData.showings, getLocal('showings'), []);
  const processedShowings = rawShowings.map(mapShowingFromDb);

  const rawClients = mergeUnique(fetchedData.clients, getLocal('clients'), []);
  const clients = rawClients.map(c => {
    let addContacts = c.additional_contacts;
    if (typeof addContacts === 'string') {
      try { addContacts = JSON.parse(addContacts); } catch { addContacts = []; }
    }
    let passport = c.passport_details;
    if (typeof passport === 'string') {
      try { passport = JSON.parse(passport); } catch { passport = {}; }
    }
    let company = c.company_details;
    if (typeof company === 'string') {
      try { company = JSON.parse(company); } catch { company = {}; }
    }
    let authPerson = c.authorized_person;
    if (typeof authPerson === 'string') {
      try { authPerson = JSON.parse(authPerson); } catch { authPerson = {}; }
    }
    let contracts = c.agency_contracts;
    if (typeof contracts === 'string') {
      try { contracts = JSON.parse(contracts); } catch { contracts = []; }
    }
    if ((!contracts || contracts.length === 0) && c.agency_contract_date) {
      contracts = [{
        id: 'legacy-' + c.id,
        type: 'АД Продажа',
        contract_date: c.agency_contract_date,
        property_id: c.agency_contract_property_id || null,
        status: 'active'
      }];
    }
    return {
      ...c,
      additional_contacts: Array.isArray(addContacts) ? addContacts : [],
      passport_details: passport || {},
      company_details: company || {},
      authorized_person: authPerson || {},
      authorized_person_id: c.authorized_person_id || authPerson?.client_id || null,
      agency_contracts: Array.isArray(contracts) ? contracts : []
    };
  });
  const properties = mergeUnique(fetchedData.properties, getLocal('properties'), DEMO_PROPERTIES);
  const requests = mergeUnique(fetchedData.requests, getLocal('requests'), DEMO_REQUESTS);
  const matches = mergeUnique(fetchedData.matches, getLocal('matches'), []);
  const tasks = mergeUnique(fetchedData.tasks, getLocal('tasks'), []);
  const deals = mergeUnique(fetchedData.deals, getLocal('deals'), []);
  const rawSelection = mergeUnique(fetchedData.selection_items, getLocal('selectionItems'), []);

  return {
    clients,
    properties,
    requests,
    matches,
    showings:    processedShowings,
    tasks,
    profiles,
    pendingUsers,
    pricelist:   fetchedData.pricelist ?? [],
    deals,
    selectionItems: rawSelection.map(item => ({
      ...item,
      client_ids: item.client_ids || (item.client_id ? [item.client_id] : []),
      client_id: (item.client_ids && item.client_ids.length > 0)
        ? item.client_ids[0]
        : (item.client_id || null),
    })),
    error: error,
    allFailed: false,
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
        const { id, full_name, phone, agency_name, inn, passport_details } = action.profile;
        const updateData = { full_name: full_name || '', phone: phone || '', agency_name: agency_name || '' };
        if (inn !== undefined) updateData.inn = inn || null;
        if (passport_details !== undefined) {
          updateData.passport_details = typeof passport_details === 'string' ? JSON.parse(passport_details) : (passport_details || {});
        }
        result = await neonDb.update('profiles', id, updateData);
        break;
      }

      /* ── Клиенты ──────────────────────────────────────────── */
      case 'ADD_CLIENT': {
        const contracts = Array.isArray(action.client.agency_contracts) 
          ? action.client.agency_contracts 
          : (typeof action.client.agency_contracts === 'string' ? JSON.parse(action.client.agency_contracts || '[]') : []);
        const activeContracts = contracts.filter(ct => ct && ct.status !== 'terminated');
        const primaryContract = activeContracts[0] || contracts[0] || null;
        const primaryDate = primaryContract?.contract_date || action.client.agency_contract_date || null;
        const primaryPropId = primaryContract?.property_id || action.client.agency_contract_property_id || null;
        const hasContract = Boolean(contracts.length > 0 || action.client.has_agency_contract || action.client.agency_contract_date);

        const clientData = {
          realtor_id: action.client.realtor_id || currentUser?.id,
          full_name: action.client.full_name || '',
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          email: action.client.email || null,
          messenger: action.client.messenger || null,
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts ? (typeof action.client.additional_contacts === 'string' ? action.client.additional_contacts : JSON.stringify(action.client.additional_contacts)) : '[]',
          source: action.client.source || null,
          status: action.client.status || 'active',
          notes: action.client.notes || null,
          passport_details: action.client.passport_details ? (typeof action.client.passport_details === 'string' ? action.client.passport_details : JSON.stringify(action.client.passport_details)) : null,
          company_details: action.client.company_details ? (typeof action.client.company_details === 'string' ? action.client.company_details : JSON.stringify(action.client.company_details)) : '{}',
          authorized_person: action.client.authorized_person ? (typeof action.client.authorized_person === 'string' ? action.client.authorized_person : JSON.stringify(action.client.authorized_person)) : '{}',
          authorized_person_id: action.client.authorized_person_id || action.client.authorized_person?.client_id || null,
          agency_contracts: JSON.stringify(contracts),
          agency_contract_date: (primaryDate && String(primaryDate).trim()) ? primaryDate : null,
          agency_contract_property_id: (primaryPropId && String(primaryPropId).trim()) ? primaryPropId : null,
          has_agency_contract: hasContract,
          public_token: action.client.public_token || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null),
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
        const contracts = Array.isArray(action.client.agency_contracts) 
          ? action.client.agency_contracts 
          : (typeof action.client.agency_contracts === 'string' ? JSON.parse(action.client.agency_contracts || '[]') : []);
        const activeContracts = contracts.filter(ct => ct && ct.status !== 'terminated');
        const primaryContract = activeContracts[0] || contracts[0] || null;
        const primaryDate = primaryContract?.contract_date || action.client.agency_contract_date || null;
        const primaryPropId = primaryContract?.property_id || action.client.agency_contract_property_id || null;
        const hasContract = Boolean(contracts.length > 0 || action.client.has_agency_contract || action.client.agency_contract_date);

        const normalizedData = {
          realtor_id: action.client.realtor_id || currentUser?.id,
          full_name: action.client.full_name || '',
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          email: action.client.email || null,
          messenger: action.client.messenger || null,
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts ? (typeof action.client.additional_contacts === 'string' ? action.client.additional_contacts : JSON.stringify(action.client.additional_contacts)) : '[]',
          source: action.client.source || null,
          status: action.client.status || 'active',
          notes: action.client.notes || null,
          passport_details: action.client.passport_details ? (typeof action.client.passport_details === 'string' ? action.client.passport_details : JSON.stringify(action.client.passport_details)) : null,
          company_details: action.client.company_details ? (typeof action.client.company_details === 'string' ? action.client.company_details : JSON.stringify(action.client.company_details)) : '{}',
          authorized_person: action.client.authorized_person ? (typeof action.client.authorized_person === 'string' ? action.client.authorized_person : JSON.stringify(action.client.authorized_person)) : '{}',
          authorized_person_id: action.client.authorized_person_id || action.client.authorized_person?.client_id || null,
          agency_contracts: JSON.stringify(contracts),
          agency_contract_date: (primaryDate && String(primaryDate).trim()) ? primaryDate : null,
          agency_contract_property_id: (primaryPropId && String(primaryPropId).trim()) ? primaryPropId : null,
          has_agency_contract: hasContract,
          public_token: action.client.public_token || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null),
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

        if (propertyData.deal_expenses !== undefined) {
          propertyData.deal_expenses = propertyData.deal_expenses
            ? (typeof propertyData.deal_expenses === 'string' ? propertyData.deal_expenses : JSON.stringify(propertyData.deal_expenses))
            : '[]';
        }
        if (propertyData.client_shares !== undefined && propertyData.client_shares !== null) {
          propertyData.client_shares = typeof propertyData.client_shares === 'string'
            ? propertyData.client_shares
            : JSON.stringify(propertyData.client_shares);
        }

        result = await neonDb.insert('properties', propertyData);

        if (!result?.error && action.matches?.length > 0) {
          const VALID_MATCH_COLUMNS = [
            'id', 'realtor_id', 'property_id', 'request_id', 'score',
            'match_level', 'matched_params', 'mismatched_params', 'status',
            'rejection_reason', 'realtor_comment', 'created_at', 'updated_at'
          ];
          for (const m of action.matches) {
            const matchData = {};
            VALID_MATCH_COLUMNS.forEach(col => {
              if (m[col] !== undefined) matchData[col] = m[col];
            });
            const mRes = await neonDb.upsert('matches', matchData);
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
        if (normalizedData.deal_expenses !== undefined) {
          normalizedData.deal_expenses = normalizedData.deal_expenses
            ? (typeof normalizedData.deal_expenses === 'string' ? normalizedData.deal_expenses : JSON.stringify(normalizedData.deal_expenses))
            : '[]';
        }
        if (normalizedData.client_shares !== undefined && normalizedData.client_shares !== null) {
          normalizedData.client_shares = typeof normalizedData.client_shares === 'string'
            ? normalizedData.client_shares
            : JSON.stringify(normalizedData.client_shares);
        }
        Object.keys(normalizedData).forEach(key => { if (normalizedData[key] === undefined) delete normalizedData[key]; });

        result = await neonDb.update('properties', pId, normalizedData);

        if (hasPassedDealStage(normalizedData)) {
          await neonDb.query(
            `UPDATE matches SET status = 'rejected', updated_at = NOW() WHERE property_id = $1 AND status != 'rejected'`,
            [pId]
          );
        } else if (!result?.error && action.matches?.length > 0) {
          const VALID_MATCH_COLUMNS = [
            'id', 'realtor_id', 'property_id', 'request_id', 'score',
            'match_level', 'matched_params', 'mismatched_params', 'status',
            'rejection_reason', 'realtor_comment', 'created_at', 'updated_at'
          ];
          for (const m of action.matches) {
            const matchData = {};
            VALID_MATCH_COLUMNS.forEach(col => {
              if (m[col] !== undefined) matchData[col] = m[col];
            });
            const mRes = await neonDb.upsert('matches', matchData);
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
        const rawReq = action.request || {};
        const sanitized = sanitizeObj(rawReq);
        const VALID_REQUEST_COLUMNS = [
          'id', 'realtor_id', 'client_id', 'client_ids', 'parent_property_id',
          'status', 'property_types', 'market_types', 'city', 'districts',
          'microdistricts', 'budget_min', 'budget_max', 'rooms', 'area_min',
          'area_max', 'kitchen_area_min', 'floor_min', 'floor_max',
          'not_first_floor', 'not_last_floor', 'building_types', 'renovation_min',
          'balcony_required', 'parking_required', 'payment_types', 'mortgage',
          'mortgage_approved', 'mortgage_bank', 'mortgage_amount', 'urgency',
          'desired_move_date', 'must_have_notes', 'nice_to_have_notes',
          'deal_breakers', 'notes', 'commission', 'deal_expenses',
          'created_at', 'updated_at'
        ];
        const reqData = {};
        VALID_REQUEST_COLUMNS.forEach(col => {
          if (sanitized[col] !== undefined) reqData[col] = sanitized[col];
        });
        if (reqData.deal_expenses !== undefined) {
          reqData.deal_expenses = reqData.deal_expenses
            ? (typeof reqData.deal_expenses === 'string' ? reqData.deal_expenses : JSON.stringify(reqData.deal_expenses))
            : '[]';
        }
        if (Array.isArray(reqData.client_ids)) {
          reqData.client_ids = reqData.client_ids.filter(Boolean);
        }
        result = await neonDb.upsert('requests', reqData);
        if (!result?.error && action.matches?.length > 0) {
          const VALID_MATCH_COLUMNS = [
            'id', 'realtor_id', 'property_id', 'request_id', 'score',
            'match_level', 'matched_params', 'mismatched_params', 'status',
            'rejection_reason', 'realtor_comment', 'created_at', 'updated_at'
          ];
          for (const m of action.matches) {
            const matchData = {};
            VALID_MATCH_COLUMNS.forEach(col => {
              if (m[col] !== undefined) matchData[col] = m[col];
            });
            const mRes = await neonDb.upsert('matches', matchData);
            if (mRes?.error) console.error('[neonSync Match Upsert Error]', mRes.error);
          }
        }
        break;
      }

      case 'DELETE_REQUEST':
        result = await neonDb.delete('requests', action.id);
        break;

      /* ── Матчи ────────────────────────────────────────────── */
      case 'UPDATE_MATCH': {
        const VALID_MATCH_COLUMNS = [
          'id', 'realtor_id', 'property_id', 'request_id', 'score',
          'match_level', 'matched_params', 'mismatched_params', 'status',
          'rejection_reason', 'realtor_comment', 'created_at', 'updated_at'
        ];
        const matchData = {};
        VALID_MATCH_COLUMNS.forEach(col => {
          if (action.match[col] !== undefined) matchData[col] = action.match[col];
        });
        result = await neonDb.upsert('matches', matchData);
        break;
      }

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
        
        let showingResult = await neonDb.upsert('showings', showingData);
        // FK constraint recovery: if property_id, match_id, or client_id does not exist in DB, retry with null
        let addRetryCount = 0;
        while (showingResult?.error && (showingResult.error?.code === '23503' || String(showingResult.error?.message).includes('23503')) && addRetryCount < 3) {
          addRetryCount++;
          const detail = String(showingResult.error?.message || '');
          let changed = false;
          if (detail.includes('property_id') && showingData.property_id) {
            console.warn('[neonSync ADD_SHOWING] property_id FK failed, retrying without property_id...');
            showingData.property_id = null;
            changed = true;
          }
          if (detail.includes('match_id') && showingData.match_id) {
            console.warn('[neonSync ADD_SHOWING] match_id FK failed, retrying without match_id...');
            showingData.match_id = null;
            changed = true;
          }
          if (detail.includes('client_id') && showingData.client_id) {
            console.warn('[neonSync ADD_SHOWING] client_id FK failed, retrying without client_id...');
            showingData.client_id = null;
            changed = true;
          }
          if (!changed) break;
          showingResult = await neonDb.upsert('showings', showingData);
        }
        if (showingResult?.error) {
          handleError(`Ошибка сохранения события: ${showingResult.error?.message || showingResult.error}`);
          if (typeof onRollback === 'function') onRollback(action);
          return false;
        }

        if (action.task) {
          const VALID_TASK_COLUMNS = [
            'id', 'realtor_id', 'client_id', 'seller_id', 'property_id',
            'title', 'description', 'task_type', 'due_date', 'priority', 'status',
            'google_event_id', 'created_at', 'updated_at'
          ];
          const rawTask = {};
          VALID_TASK_COLUMNS.forEach(col => {
            if (action.task[col] !== undefined) rawTask[col] = action.task[col];
          });
          const taskData = sanitizeObj(rawTask);
          let taskResult = await neonDb.upsert('tasks', taskData);
          let taskRetry = 0;
          while (taskResult?.error && (taskResult.error?.code === '23503' || String(taskResult.error?.message).includes('23503')) && taskRetry < 3) {
            taskRetry++;
            const detail = String(taskResult.error?.message || '');
            let changed = false;
            if (detail.includes('client_id') && taskData.client_id) {
              console.warn('[neonSync ADD_SHOWING task] client_id FK failed, retrying without client_id...');
              taskData.client_id = null;
              changed = true;
            }
            if (detail.includes('seller_id') && taskData.seller_id) {
              console.warn('[neonSync ADD_SHOWING task] seller_id FK failed, retrying without seller_id...');
              taskData.seller_id = null;
              changed = true;
            }
            if (detail.includes('property_id') && taskData.property_id) {
              console.warn('[neonSync ADD_SHOWING task] property_id FK failed, retrying without property_id...');
              taskData.property_id = null;
              changed = true;
            }
            if (!changed) break;
            taskResult = await neonDb.upsert('tasks', taskData);
          }
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
        showingData.updated_at = new Date().toISOString();
        const sId = action.showing.id;
        const { id, ...dataToUpdate } = showingData;
        
        let showingResult = await neonDb.update('showings', sId, dataToUpdate);
        if (showingResult?.error || !showingResult?.data || showingResult.data.length === 0) {
          showingResult = await neonDb.upsert('showings', showingData);
        }
        // FK constraint recovery
        let updateRetryCount = 0;
        while (showingResult?.error && (showingResult.error?.code === '23503' || String(showingResult.error?.message).includes('23503')) && updateRetryCount < 3) {
          updateRetryCount++;
          const detail = String(showingResult.error?.message || '');
          let changed = false;
          if (detail.includes('property_id') && (dataToUpdate.property_id || showingData.property_id)) {
            console.warn('[neonSync UPDATE_SHOWING] property_id FK failed, retrying without property_id...');
            dataToUpdate.property_id = null;
            showingData.property_id = null;
            changed = true;
          }
          if (detail.includes('match_id') && (dataToUpdate.match_id || showingData.match_id)) {
            console.warn('[neonSync UPDATE_SHOWING] match_id FK failed, retrying without match_id...');
            dataToUpdate.match_id = null;
            showingData.match_id = null;
            changed = true;
          }
          if (detail.includes('client_id') && (dataToUpdate.client_id || showingData.client_id)) {
            console.warn('[neonSync UPDATE_SHOWING] client_id FK failed, retrying without client_id...');
            dataToUpdate.client_id = null;
            showingData.client_id = null;
            changed = true;
          }
          if (!changed) break;
          showingResult = await neonDb.update('showings', sId, dataToUpdate);
          if (showingResult?.error || !showingResult?.data || showingResult.data.length === 0) {
            showingResult = await neonDb.upsert('showings', showingData);
          }
        }
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
      case 'UPDATE_TASK': {
        const VALID_TASK_COLUMNS = [
          'id', 'realtor_id', 'client_id', 'seller_id', 'property_id',
          'title', 'description', 'task_type', 'due_date', 'priority', 'status',
          'google_event_id', 'created_at', 'updated_at'
        ];
        const rawTask = {};
        VALID_TASK_COLUMNS.forEach(col => {
          if (action.task[col] !== undefined) rawTask[col] = action.task[col];
        });
        const taskData = sanitizeObj(rawTask);
        result = await neonDb.upsert('tasks', taskData);
        let taskRetry = 0;
        while (result?.error && (result.error?.code === '23503' || String(result.error?.message).includes('23503')) && taskRetry < 3) {
          taskRetry++;
          const detail = String(result.error?.message || '');
          let changed = false;
          if (detail.includes('client_id') && taskData.client_id) {
            console.warn('[neonSync TASK] client_id FK failed, retrying without client_id...');
            taskData.client_id = null;
            changed = true;
          }
          if (detail.includes('seller_id') && taskData.seller_id) {
            console.warn('[neonSync TASK] seller_id FK failed, retrying without seller_id...');
            taskData.seller_id = null;
            changed = true;
          }
          if (detail.includes('property_id') && taskData.property_id) {
            console.warn('[neonSync TASK] property_id FK failed, retrying without property_id...');
            taskData.property_id = null;
            changed = true;
          }
          if (!changed) break;
          result = await neonDb.upsert('tasks', taskData);
        }
        break;
      }

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
        const VALID_DEAL_COLUMNS = [
          'id', 'realtor_id', 'title', 'seller_id', 'buyer_id', 'property_id',
          'seller_ids', 'buyer_ids', 'price', 'commission', 'deal_date',
          'deal_location', 'registration_date',
          'deposit_date', 'deposit_amount', 'deposit_paid', 'mortgage', 'mortgage_bank',
          'mortgage_amount', 'mortgage_expiry', 'lawyer', 'lawyer_id', 'expenses', 'notes',
          'status', 'created_at', 'updated_at', 'google_event_id', 'seller_agent_id', 'buyer_agent_id',
          'handover_date', 'handover_amount', 'has_agency_contract', 'agency_contract_date'
        ];
        const dealData = {};
        VALID_DEAL_COLUMNS.forEach(col => {
          if (action.deal[col] !== undefined) dealData[col] = action.deal[col];
        });
        dealData.deal_date =          dealData.deal_date || null;
        dealData.deal_location =      dealData.deal_location || null;
        dealData.registration_date =  dealData.registration_date || null;
        dealData.deposit_date =       dealData.deposit_date || null;
        dealData.deposit_amount =     dealData.deposit_amount || 0;
        dealData.deposit_paid =       action.deal.deposit_paid ? true : false;
        dealData.handover_date =      dealData.handover_date || null;
        dealData.handover_amount =    dealData.handover_amount || 0;
        dealData.seller_ids =         dealData.seller_ids || [];
        dealData.buyer_ids =          dealData.buyer_ids || [];
        dealData.notes =              dealData.notes || null;
        dealData.mortgage =           dealData.mortgage || false;
        dealData.mortgage_bank =      dealData.mortgage_bank || null;
        dealData.mortgage_amount =    dealData.mortgage_amount || 0;
        dealData.mortgage_expiry =    dealData.mortgage_expiry || null;
        dealData.lawyer =             dealData.lawyer || null;
        dealData.lawyer_id =          action.deal.lawyer_id || null;
        dealData.google_event_id =    dealData.google_event_id || null;
        dealData.seller_agent_id =    action.deal.seller_agent_id || null;
        dealData.buyer_agent_id =     action.deal.buyer_agent_id || null;
        dealData.has_agency_contract = action.deal.has_agency_contract || false;
        dealData.agency_contract_date = action.deal.agency_contract_date || null;

        // expenses must be JSON string for Neon jsonb column (raw array breaks)
        if (Array.isArray(dealData.expenses)) dealData.expenses = JSON.stringify(dealData.expenses);
        Object.keys(dealData).forEach(key => { if (dealData[key] === undefined) delete dealData[key]; });

        const isActive = (dealData.status || 'active') !== 'closed';
        const propStatus = isActive ? 'deal' : 'sold';
        const propertyIdForStatus = dealData.property_id;
        const propertyUpdatedAt = dealData.created_at || new Date().toISOString();
        const dealResult = await neonDb.insert('deals', dealData);
        if (propertyIdForStatus && !dealResult?.error) {
          const propResult = await neonDb.update('properties', propertyIdForStatus, {
            status: propStatus,
            updated_at: propertyUpdatedAt,
          });
          await neonDb.query(
            `UPDATE matches SET status = 'rejected', updated_at = NOW() WHERE property_id = $1 AND status != 'rejected'`,
            [propertyIdForStatus]
          );
          result = propResult?.error ? propResult : dealResult;
        } else {
          result = dealResult;
        }
        break;
      }

      case 'UPDATE_DEAL': {
        const { id: dId } = action.deal;
        const VALID_DEAL_COLUMNS = [
          'realtor_id', 'title', 'seller_id', 'buyer_id', 'property_id',
          'seller_ids', 'buyer_ids', 'price', 'commission', 'deal_date',
          'deal_location', 'registration_date',
          'deposit_date', 'deposit_amount', 'deposit_paid', 'mortgage', 'mortgage_bank',
          'mortgage_amount', 'mortgage_expiry', 'lawyer', 'lawyer_id', 'expenses', 'notes',
          'status', 'created_at', 'updated_at', 'google_event_id', 'seller_agent_id', 'buyer_agent_id',
          'handover_date', 'handover_amount', 'has_agency_contract', 'agency_contract_date'
        ];
        const updateData = {};
        VALID_DEAL_COLUMNS.forEach(col => {
          if (action.deal[col] !== undefined) updateData[col] = action.deal[col];
        });
        updateData.deal_date =          updateData.deal_date || null;
        updateData.deal_location =      updateData.deal_location !== undefined ? updateData.deal_location : null;
        updateData.registration_date =  updateData.registration_date || null;
        updateData.deposit_date =       updateData.deposit_date || null;
        updateData.deposit_amount =     updateData.deposit_amount ?? 0;
        if (action.deal.deposit_paid !== undefined) {
          updateData.deposit_paid = Boolean(action.deal.deposit_paid);
        }
        updateData.handover_date =      updateData.handover_date || null;
        updateData.handover_amount =    updateData.handover_amount ?? 0;
        updateData.seller_ids =     updateData.seller_ids || [];
        updateData.buyer_ids =      updateData.buyer_ids || [];
        updateData.notes =          updateData.notes || null;
        updateData.mortgage =       updateData.mortgage || false;
        updateData.mortgage_bank =  updateData.mortgage_bank || null;
        updateData.mortgage_amount = updateData.mortgage_amount || 0;
        updateData.mortgage_expiry = updateData.mortgage_expiry || null;
        updateData.lawyer =         updateData.lawyer || null;
        updateData.lawyer_id =      action.deal.lawyer_id || null;
        updateData.google_event_id = updateData.google_event_id || null;
        updateData.seller_agent_id = action.deal.seller_agent_id || null;
        updateData.buyer_agent_id =  action.deal.buyer_agent_id || null;
        updateData.has_agency_contract = action.deal.has_agency_contract || false;
        updateData.agency_contract_date = action.deal.agency_contract_date || null;

        // expenses must be JSON string for Neon jsonb column (raw array breaks)
        if (Array.isArray(updateData.expenses)) updateData.expenses = JSON.stringify(updateData.expenses);
        Object.keys(updateData).forEach(key => { if (updateData[key] === undefined) delete updateData[key]; });
        result = await neonDb.update('deals', dId, updateData);

        // Sync linked property status when deal status changes or deal is updated
        if (updateData.property_id && updateData.status) {
          const propStatus = updateData.status === 'closed' ? 'sold' : 'deal';
          await neonDb.update('properties', updateData.property_id, {
            status: propStatus,
            updated_at: updateData.updated_at || new Date().toISOString()
          });
          await neonDb.query(
            `UPDATE matches SET status = 'rejected', updated_at = NOW() WHERE property_id = $1 AND status != 'rejected'`,
            [updateData.property_id]
          );
        }
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
