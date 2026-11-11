/**
 * reducer.js — чистый reducer без побочных эффектов.
 *
 * Вынесен из AppContext.jsx для:
 *  - изоляции логики состояния
 *  - упрощения тестирования (pure function)
 *  - уменьшения размера God Object
 */

import { hasPassedDealStage } from '../utils/matching';

function collectDealPartyIds(deal = {}, properties = [], propId = null, extraIds = []) {
  const idSet = new Set();
  const addList = (arr) => {
    if (Array.isArray(arr)) arr.forEach(id => { if (id) idSet.add(id); });
  };
  addList(deal.seller_ids);
  if (deal.seller_id) idSet.add(deal.seller_id);
  addList(deal.buyer_ids);
  if (deal.buyer_id) idSet.add(deal.buyer_id);

  const targetPropId = propId || deal.property_id;
  if (targetPropId) {
    const prop = (properties || []).find(p => p.id === targetPropId);
    if (prop) {
      addList(prop.client_ids);
      if (prop.client_id) idSet.add(prop.client_id);
      if (prop.owner_id) idSet.add(prop.owner_id);
    }
  }
  addList(extraIds);
  return Array.from(idSet);
}

/**
 * При закрытии сделки помечает связанные агентские договоры как исполненные
 * и переводит ВСЕ стороны по сделке (продавцов, сособственников, покупателей, сопокупателей)
 * по воронке в 'deal_closed' (Сделка закрыта), если у них нет других открытых сделок и активных договоров.
 */
export function syncClientsOnClosedDeal(clients, allDeals, properties, deal, propId, extraIds = []) {
  const participantIds = collectDealPartyIds(deal, properties, propId, extraIds);
  if (participantIds.length === 0 && !propId) return clients;

  const nowTs = new Date().toISOString();
  let anyClientChanged = false;
  const nextClients = clients.map(c => {
    const isParticipant = participantIds.includes(c.id);
    const rawContracts = Array.isArray(c.agency_contracts) ? c.agency_contracts : [];
    let contractsChanged = false;

    const updatedContracts = rawContracts.map(ct => {
      if (!ct) return ct;
      const isPropMatch = ct.property_id && propId && ct.property_id === propId;
      const isMatch = isPropMatch || (isParticipant && !ct.property_id);
      if (isMatch && ct.status !== 'fulfilled') {
        contractsChanged = true;
        return {
          ...ct,
          status: 'fulfilled',
          fulfilled_deal_id: deal.id || null,
          fulfilled_at: deal.deal_date || nowTs
        };
      }
      return ct;
    });

    if (!isParticipant && !contractsChanged) return c;

    const hasRemainingActiveContract = updatedContracts.some(
      ct => ct && !['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'].includes(ct.status)
    );
    const hasOtherOpenDeal = allDeals.some(d => {
      if (deal.id && d.id === deal.id) return false;
      if (['closed', 'completed', 'deal_closed', 'cancelled', 'refused', 'failed'].includes(d.status)) return false;
      const sIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
      const bIds = d.buyer_ids || (d.buyer_id ? [d.buyer_id] : []);
      return sIds.includes(c.id) || bIds.includes(c.id);
    });

    let nextStatus = c.status;
    let nextPipelineStage = c.pipeline_stage;
    if (isParticipant && !hasRemainingActiveContract && !hasOtherOpenDeal && c.status !== 'refused') {
      nextStatus = 'deal_closed';
      nextPipelineStage = 'completed';
    }

    const nextHasContract = rawContracts.length > 0 ? hasRemainingActiveContract : (isParticipant && !hasOtherOpenDeal ? false : c.has_agency_contract);

    if (!contractsChanged && nextStatus === c.status && nextPipelineStage === c.pipeline_stage && nextHasContract === c.has_agency_contract) {
      return c;
    }
    anyClientChanged = true;
    return {
      ...c,
      ...(contractsChanged ? { agency_contracts: updatedContracts } : {}),
      status: nextStatus,
      ...(nextPipelineStage ? { pipeline_stage: nextPipelineStage } : {}),
      has_agency_contract: nextHasContract,
      updated_at: nowTs
    };
  });

  return anyClientChanged ? nextClients : clients;
}

/**
 * При возврате закрытой сделки обратно в работу восстанавливает статус договоров и сторон.
 */
export function syncClientsOnReopenedDeal(clients, properties, deal, propId) {
  const participantIds = collectDealPartyIds(deal, properties, propId);
  const nowTs = new Date().toISOString();
  let anyChanged = false;

  const nextClients = clients.map(c => {
    const isParticipant = participantIds.includes(c.id);
    const rawContracts = Array.isArray(c.agency_contracts) ? c.agency_contracts : [];
    let contractsChanged = false;
    const updatedContracts = rawContracts.map(ct => {
      if (ct && ct.fulfilled_deal_id && deal.id && ct.fulfilled_deal_id === deal.id) {
        contractsChanged = true;
        return { ...ct, status: 'active', fulfilled_deal_id: null, fulfilled_at: null };
      }
      return ct;
    });

    if (!isParticipant && !contractsChanged) return c;
    const hasActiveContract = updatedContracts.some(
      ct => ct && !['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'].includes(ct.status)
    );
    const shouldReopenStatus = isParticipant && ['deal_closed', 'completed'].includes(c.status);
    if (!contractsChanged && !shouldReopenStatus) return c;

    anyChanged = true;
    return {
      ...c,
      ...(contractsChanged ? { agency_contracts: updatedContracts, has_agency_contract: hasActiveContract } : {}),
      ...(shouldReopenStatus ? { status: 'active', pipeline_stage: 'active' } : {}),
      updated_at: nowTs
    };
  });

  return anyChanged ? nextClients : clients;
}

export const EMPTY_STATE = {
  currentUser:  null,
  clients:      [],
  properties:   [],
  requests:     [],
  matches:      [],
  showings:     [],
  tasks:        [],
  pendingUsers: [],
  profiles:     [],
  pricelist:    [],
  deals:        [],
  loading:      true,
  error:        null,
  calendarStatus: null, // null | 'loading' | 'ok' | 'error'
  calendarErrorMessage: null,
  priceHistory: [],
  selectionItems: (() => {
    try {
      const items = JSON.parse(localStorage.getItem('rm_selection_items') || '[]');
      return items.map(item => ({
        ...item,
        client_ids: item.client_ids || (item.client_id ? [item.client_id] : []),
        client_id: (item.client_ids && item.client_ids.length > 0) ? item.client_ids[0] : (item.client_id || null)
      }));
    } catch {
      return [];
    }
  })(),
};

export function reducer(state, action) {
  switch (action.type) {

    /* ── Служебные ─────────────────────────────────────────────────────── */
    case 'SET_LOADING':
      return { ...state, loading: action.value };

    case 'SET_USER':
      return { ...state, currentUser: action.user };

    case 'UPDATE_PROFILE':
      return { 
        ...state, 
        currentUser: { ...state.currentUser, ...action.profile },
        users: (state.users || []).map(u => u.id === action.profile.id ? { ...u, ...action.profile } : u),
      };

    case 'SET_PENDING_USERS':
      return { ...state, pendingUsers: action.users };

    case 'APPROVE_USER':
      return {
        ...state,
        profiles:     state.profiles.map(p => p.id === action.userId ? { ...p, status: 'approved' } : p),
        pendingUsers: state.pendingUsers.filter(u => u.id !== action.userId),
      };

    case 'REJECT_USER':
      return {
        ...state,
        profiles:     state.profiles.map(p => p.id === action.userId ? { ...p, status: 'rejected' } : p),
        pendingUsers: state.pendingUsers.map(u => u.id === action.userId ? { ...u, status: 'rejected' } : u),
      };

    case 'LOGOUT':
      return { ...EMPTY_STATE, loading: false };

    case 'SET_ALL':
      return { 
        ...state, 
        ...action.data, 
        selectionItems: action.data.selectionItems !== undefined ? action.data.selectionItems : state.selectionItems,
        loading: false 
      };

    case 'SET_CALENDAR_STATUS':
      return { ...state, calendarStatus: action.status, calendarErrorMessage: action.errorMessage || null };

    /* ── Клиенты ────────────────────────────────────────────────────────── */
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.client] };

    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.client.id ? action.client : c) };

    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter(c => c.id !== action.id) };

    /* ── Объекты ────────────────────────────────────────────────────────── */
    case 'ADD_PROPERTY': {
      const isPassedDeal = hasPassedDealStage(action.property);
      return {
        ...state,
        properties: [...state.properties, action.property],
        matches:    isPassedDeal ? state.matches : [...state.matches, ...(action.matches || [])],
      };
    }

    case 'UPDATE_PROPERTY': {
      const isPassedDeal = hasPassedDealStage(action.property);
      return {
        ...state,
        properties: state.properties.map(p => p.id === action.property.id ? action.property : p),
        matches: isPassedDeal
          ? state.matches.filter(m => m.property_id !== action.property.id)
          : [
              ...state.matches.filter(m => m.property_id !== action.property.id || m.status !== 'new'),
              ...(action.matches || []),
            ],
      };
    }

    // Lightweight patch — merges only specified fields without replacing the whole object
    case 'PATCH_PROPERTY': {
      const existing = state.properties.find(p => p.id === action.patch.id);
      const patched = { ...(existing || {}), ...action.patch };
      const isPassedDeal = hasPassedDealStage(patched);
      return {
        ...state,
        properties: state.properties.map(p =>
          p.id === action.patch.id ? patched : p
        ),
        ...(isPassedDeal ? { matches: state.matches.filter(m => m.property_id !== action.patch.id) } : {}),
      };
    }

    case 'DELETE_PROPERTY':
      return { ...state, properties: state.properties.filter(p => p.id !== action.id) };

    /* ── Запросы ────────────────────────────────────────────────────────── */
    case 'ADD_REQUEST':
      return {
        ...state,
        requests: [...state.requests, action.request],
        matches:  [...state.matches, ...(action.matches || [])],
      };

    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r => r.id === action.request.id ? action.request : r),
        matches: [
          ...state.matches.filter(m => m.request_id !== action.request.id || m.status !== 'new'),
          ...(action.matches || []),
        ],
      };

    case 'DELETE_REQUEST':
      return { ...state, requests: state.requests.filter(r => r.id !== action.id) };

    /* ── Матчи ──────────────────────────────────────────────────────────── */
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.match.id ? action.match : m) };

    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.id) };

    case 'ADD_MATCHES':
      return { ...state, matches: [...state.matches, ...action.matches] };

    /* ── Закрытие сделки ────────────────────────────────────────────────── */
    case 'CLOSE_DEAL': {
      const { matchId, propertyId, requestId, now } = action;

      const properties = state.properties.map(p =>
        p.id === propertyId ? { ...p, status: 'sold', updated_at: now } : p
      );
      const requests = state.requests.map(r =>
        r.id === requestId ? { ...r, status: 'found', updated_at: now } : r
      );
      const matches = state.matches.map(m =>
        m.id === matchId
          ? { ...m, status: 'deal', updated_at: now }
          : (m.property_id === propertyId || m.request_id === requestId)
            ? { ...m, status: 'rejected', updated_at: now }
            : m
      );

      const prop = properties.find(p => p.id === propertyId);
      const req  = requests.find(r => r.id === requestId);
      const reqClientIds = req ? (req.client_ids || (req.client_id ? [req.client_id] : [])) : [];
      const propClientIds = prop ? (prop.client_ids || (prop.client_id ? [prop.client_id] : [])) : [];
      const clients = syncClientsOnClosedDeal(
        state.clients,
        state.deals,
        properties,
        { id: action.dealId || null, property_id: propertyId, deal_date: now },
        propertyId,
        [...propClientIds, ...reqClientIds]
      );

      return { ...state, matches, properties, requests, clients };
    }

    /* ── Показы ─────────────────────────────────────────────────────────── */
    case 'ADD_SHOWING':
      return {
        ...state,
        showings: [...state.showings, action.showing],
        matches:  action.matches !== undefined ? action.matches : state.matches,
        tasks:    action.task ? [...state.tasks, action.task] : state.tasks,
      };

    case 'UPDATE_SHOWING':
      return {
        ...state,
        showings: state.showings.map(s => s.id === action.showing.id ? action.showing : s),
        matches:  action.matches !== undefined ? action.matches : state.matches,
      };

    case 'DELETE_SHOWING':
      return { ...state, showings: state.showings.filter(s => s.id !== action.id) };

    /* ── Задачи ─────────────────────────────────────────────────────────── */
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };

    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.task.id ? action.task : t) };

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };

    /* ── Прайс-лист ─────────────────────────────────────────────────────── */
    case 'SET_PRICELIST':
      return { ...state, pricelist: action.data };

    case 'ADD_PRICE_ITEM':
      return { ...state, pricelist: [...state.pricelist, action.item] };

    case 'UPDATE_PRICE_ITEM':
      return { ...state, pricelist: state.pricelist.map(i => i.id === action.item.id ? action.item : i) };

    case 'DELETE_PRICE_ITEM':
      return { ...state, pricelist: state.pricelist.filter(i => i.id !== action.id) };

    /* ── Сделки ─────────────────────────────────────────────────────── */
    case 'ADD_DEAL': {
      const newDeal = { ...action.deal, status: action.deal.status || 'active' };
      const propId = action.deal.property_id;
      const targetPropStatus = newDeal.status === 'closed' ? 'sold' : 'deal';
      const properties = propId
        ? state.properties.map(p =>
            p.id === propId
              ? { ...p, status: targetPropStatus, updated_at: newDeal.created_at || new Date().toISOString() }
              : p
          )
        : state.properties;
      const matches = propId
        ? state.matches.filter(m => m.property_id !== propId)
        : state.matches;

      const nextDeals = [...state.deals, newDeal];
      const clients = newDeal.status === 'closed'
        ? syncClientsOnClosedDeal(state.clients, nextDeals, properties, newDeal, propId)
        : state.clients;

      return {
        ...state,
        deals: nextDeals,
        properties,
        matches,
        ...(clients === state.clients ? {} : { clients })
      };
    }

    case 'UPDATE_DEAL': {
      const incoming = action.deal;
      const prev = state.deals.find(d => d.id === incoming.id);
      const propertyIdNow = incoming.property_id || prev?.property_id;
      const propertyIdPrev = prev ? prev.property_id : null;
      const effectiveDealStatus = incoming.status || prev?.status || 'active';
      const propertyChanges = {};
      const nowTs = incoming.updated_at || new Date().toISOString();

      if (propertyIdNow) {
        propertyChanges[propertyIdNow] = effectiveDealStatus === 'closed' ? 'sold' : 'deal';
      }

      if (propertyIdPrev && propertyIdPrev !== propertyIdNow) {
        const hasOtherActiveDeal = state.deals.some(
          d => d.id !== incoming.id && d.property_id === propertyIdPrev && d.status !== 'closed'
        );
        if (!hasOtherActiveDeal) propertyChanges[propertyIdPrev] = 'meeting';
      }

      const properties = Object.keys(propertyChanges).length === 0
        ? state.properties
        : state.properties.map(p =>
            propertyChanges[p.id] ? { ...p, status: propertyChanges[p.id], updated_at: nowTs } : p
          );

      const affectedPassedPropIds = Object.keys(propertyChanges).filter(
        id => propertyChanges[id] === 'deal' || propertyChanges[id] === 'sold'
      );
      const matches = affectedPassedPropIds.length > 0
        ? state.matches.filter(m => !affectedPassedPropIds.includes(m.property_id))
        : state.matches;

      const nextDeals = state.deals.map(d => d.id === incoming.id ? { ...d, ...incoming } : d);
      const mergedDeal = { ...(prev || {}), ...incoming, property_id: propertyIdNow };
      let clients = state.clients;
      if (effectiveDealStatus === 'closed') {
        clients = syncClientsOnClosedDeal(state.clients, nextDeals, properties, mergedDeal, propertyIdNow);
      } else if (prev?.status === 'closed' && effectiveDealStatus !== 'closed') {
        clients = syncClientsOnReopenedDeal(state.clients, properties, mergedDeal, propertyIdNow);
      }

      return {
        ...state,
        deals: nextDeals,
        ...(properties === state.properties ? {} : { properties }),
        ...(matches === state.matches ? {} : { matches }),
        ...(clients === state.clients ? {} : { clients })
      };
    }

    case 'DELETE_DEAL': {
      const target = state.deals.find(d => d.id === action.id);
      const targetPropertyId = target ? target.property_id : null;
      const properties = targetPropertyId
        ? (() => {
            const hasOtherActiveDeal = state.deals.some(
              d => d.id !== action.id && d.property_id === targetPropertyId && d.status !== 'closed'
            );
            if (hasOtherActiveDeal) return state.properties;
            return state.properties.map(p =>
              p.id === targetPropertyId
                ? { ...p, status: 'meeting', updated_at: new Date().toISOString() }
                : p
            );
          })()
        : state.properties;
      return {
        ...state,
        deals: state.deals.filter(d => d.id !== action.id),
        ...(properties === state.properties ? {} : { properties }),
      };
    }

    /* ── История цен ──────────────────────────────────────────── */
    case 'ADD_PRICE_HISTORY':
      return { ...state, priceHistory: [...(state.priceHistory || []), action.entry] };

    case 'SET_PRICE_HISTORY':
      return { ...state, priceHistory: action.data };

    /* ── Подбор ─────────────────────────────────────────────────────────── */
    case 'ADD_SELECTION_ITEM': {
      const normalizedItem = {
        ...action.item,
        client_ids: action.item.client_ids || (action.item.client_id ? [action.item.client_id] : []),
        client_id: (action.item.client_ids && action.item.client_ids.length > 0) ? action.item.client_ids[0] : (action.item.client_id || null)
      };
      const selectionItems = [...(state.selectionItems || []), normalizedItem];
      try { localStorage.setItem('rm_selection_items', JSON.stringify(selectionItems)); } catch (e) {}
      return { ...state, selectionItems };
    }

    case 'UPDATE_SELECTION_ITEM': {
      const normalizedItem = {
        ...action.item,
        client_ids: action.item.client_ids || (action.item.client_id ? [action.item.client_id] : []),
        client_id: (action.item.client_ids && action.item.client_ids.length > 0) ? action.item.client_ids[0] : (action.item.client_id || null)
      };
      const selectionItems = (state.selectionItems || []).map(i => i.id === action.item.id ? normalizedItem : i);
      try { localStorage.setItem('rm_selection_items', JSON.stringify(selectionItems)); } catch (e) {}
      return { ...state, selectionItems };
    }

    case 'DELETE_SELECTION_ITEM': {
      const selectionItems = (state.selectionItems || []).filter(i => i.id !== action.id);
      try { localStorage.setItem('rm_selection_items', JSON.stringify(selectionItems)); } catch (e) {}
      return { ...state, selectionItems };
    }

    default:
      return state;
  }
}
