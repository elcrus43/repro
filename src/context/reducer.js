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
      return { ...state, ...action.data, loading: false };

    case 'SET_CALENDAR_STATUS':
      return { ...state, calendarStatus: action.status };

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
        matches:    [...state.matches, ...action.matches],
      };

    case 'UPDATE_PROPERTY':
      return {
        ...state,
        properties: state.properties.map(p => p.id === action.property.id ? action.property : p),
        matches: [
          ...state.matches.filter(m => m.property_id !== action.property.id || m.status !== 'new'),
          ...action.matches,
        ],
      };

    case 'DELETE_PROPERTY':
      return { ...state, properties: state.properties.filter(p => p.id !== action.id) };

    /* ── Запросы ────────────────────────────────────────────────────────── */
    case 'ADD_REQUEST':
      return {
        ...state,
        requests: [...state.requests, action.request],
        matches:  [...state.matches, ...action.matches],
      };

    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r => r.id === action.request.id ? action.request : r),
        matches: [
          ...state.matches.filter(m => m.request_id !== action.request.id || m.status !== 'new'),
          ...action.matches,
        ],
      };

    case 'DELETE_REQUEST':
      return { ...state, requests: state.requests.filter(r => r.id !== action.id) };

    /* ── Матчи ──────────────────────────────────────────────────────────── */
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.match.id ? action.match : m) };

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
        if (prop && c.id === prop.client_id) return { ...c, status: 'deal_closed' };
        if (req  && c.id === req.client_id)  return { ...c, status: 'deal_closed' };
        return c;
      });

      return { ...state, matches, properties, requests, clients };
    }

    /* ── Показы ─────────────────────────────────────────────────────────── */
    case 'ADD_SHOWING':
      return {
        ...state,
        showings: [...state.showings, action.showing],
        matches:  action.matches,
        tasks:    [...state.tasks, action.task],
      };

    case 'UPDATE_SHOWING':
      return {
        ...state,
        showings: state.showings.map(s => s.id === action.showing.id ? action.showing : s),
        matches:  action.matches,
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

    default:
      return state;
  }
}
