/**
 * reducer.js — чистый reducer без побочных эффектов.
 *
 * Вынесен из AppContext.jsx для:
 *  - изоляции логики состояния
 *  - упрощения тестирования (pure function)
 *  - уменьшения размера God Object
 */

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
      return { ...state, currentUser: { ...state.currentUser, ...action.profile } };

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
    case 'ADD_PROPERTY':
      return {
        ...state,
        properties: [...state.properties, action.property],
        matches:    [...state.matches, ...(action.matches || [])],
      };

    case 'UPDATE_PROPERTY':
      return {
        ...state,
        properties: state.properties.map(p => p.id === action.property.id ? action.property : p),
        matches: [
          ...state.matches.filter(m => m.property_id !== action.property.id || m.status !== 'new'),
          ...(action.matches || []),
        ],
      };

    // Lightweight patch — merges only specified fields without replacing the whole object
    case 'PATCH_PROPERTY':
      return {
        ...state,
        properties: state.properties.map(p =>
          p.id === action.patch.id ? { ...p, ...action.patch } : p
        ),
      };

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
      const clients = state.clients.map(c => {
        if (prop && (prop.client_ids || [prop.client_id]).includes(c.id)) return { ...c, status: 'deal_closed' };
        if (req  && (req.client_ids || [req.client_id]).includes(c.id))  return { ...c, status: 'deal_closed' };
        return c;
      });

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
      const properties = action.deal.property_id
        ? state.properties.map(p =>
            p.id === action.deal.property_id
              ? { ...p, status: 'deal', updated_at: newDeal.created_at || new Date().toISOString() }
              : p
          )
        : state.properties;
      return { ...state, deals: [...state.deals, newDeal], properties };
    }

    case 'UPDATE_DEAL': {
      const incoming = action.deal;
      const prev = state.deals.find(d => d.id === incoming.id);
      const propertyIdNow = incoming.property_id;
      const propertyIdPrev = prev ? prev.property_id : null;
      const propertyChanges = {};
      const nowTs = incoming.updated_at || new Date().toISOString();

      if (prev && prev.status !== incoming.status) {
        if (propertyIdNow) propertyChanges[propertyIdNow] = incoming.status === 'closed' ? 'sold' : 'deal';
      } else if (!prev && propertyIdNow) {
        propertyChanges[propertyIdNow] = incoming.status === 'closed' ? 'sold' : 'deal';
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

      return {
        ...state,
        deals: state.deals.map(d => d.id === incoming.id ? incoming : d),
        ...(properties === state.properties ? {} : { properties }),
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
