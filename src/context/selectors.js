/**
 * selectors.js — мемоизированные селекторы для AppContext.
 *
 * Зачем:
 *  - Предотвращают лишние ре-рендеры (useMemo внутри)
 *  - Компоненты подписываются только на нужные срезы данных
 *  - Заменяют деструктуризацию { state } на useSelectClients() и т.д.
 *
 * Использование:
 *   import { useSelectClients, useSelectProperties } from './selectors';
 *   const clients = useSelectClients();
 */

import { useMemo } from 'react';
import { useApp } from './AppContext';

/* ── Базовые селекторы ──────────────────────────────────────────────── */

export function useSelectUser() {
  const { state } = useApp();
  return useMemo(() => state.currentUser, [state.currentUser]);
}

export function useSelectLoading() {
  const { state } = useApp();
  return state.loading;
}

export function useSelectClients() {
  const { state } = useApp();
  return useMemo(() => state.clients, [state.clients]);
}

export function useSelectProperties() {
  const { state } = useApp();
  return useMemo(() => state.properties, [state.properties]);
}

export function useSelectRequests() {
  const { state } = useApp();
  return useMemo(() => state.requests, [state.requests]);
}

export function useSelectMatches() {
  const { state } = useApp();
  return useMemo(() => state.matches, [state.matches]);
}

export function useSelectShowings() {
  const { state } = useApp();
  return useMemo(() => state.showings, [state.showings]);
}

export function useSelectTasks() {
  const { state } = useApp();
  return useMemo(() => state.tasks, [state.tasks]);
}

export function useSelectPendingUsers() {
  const { state } = useApp();
  return useMemo(() => state.pendingUsers, [state.pendingUsers]);
}

export function useSelectProfiles() {
  const { state } = useApp();
  return useMemo(() => state.profiles, [state.profiles]);
}

export function useSelectPricelist() {
  const { state } = useApp();
  return useMemo(() => state.pricelist, [state.pricelist]);
}

export function useSelectCalendarStatus() {
  const { state } = useApp();
  return state.calendarStatus;
}

/* ── Композитные селекторы (вычисляют данные) ───────────────────────── */

export function useSelectMatchesByRequest(requestId) {
  const { state } = useApp();
  return useMemo(() =>
    state.matches
      .filter(m => m.request_id === requestId)
      .sort((a, b) => b.score - a.score),
    [state.matches, requestId]
  );
}

export function useSelectMatchesByProperty(propertyId) {
  const { state } = useApp();
  return useMemo(() =>
    state.matches
      .filter(m => m.property_id === propertyId)
      .sort((a, b) => b.score - a.score),
    [state.matches, propertyId]
  );
}

export function useSelectPendingMatches() {
  const { state } = useApp();
  return useMemo(() =>
    state.matches.filter(m => m.status === 'new'),
    [state.matches]
  );
}

export function useSelectNewMatchesCount() {
  const { state } = useApp();
  return useMemo(() =>
    state.matches.filter(m => m.status === 'new').length,
    [state.matches]
  );
}

export function useSelectPropertiesByClient(clientId) {
  const { state } = useApp();
  return useMemo(() =>
    state.properties.filter(p => p.client_id === clientId),
    [state.properties, clientId]
  );
}

export function useSelectRequestsByClient(clientId) {
  const { state } = useApp();
  return useMemo(() =>
    state.requests.filter(r => r.client_id === clientId),
    [state.requests, clientId]
  );
}

export function useSelectTasksByPriority(priority) {
  const { state } = useApp();
  return useMemo(() =>
    state.tasks.filter(t => t.priority === priority),
    [state.tasks, priority]
  );
}

export function useSelectPendingTasks() {
  const { state } = useApp();
  return useMemo(() =>
    state.tasks.filter(t => t.status !== 'completed'),
    [state.tasks]
  );
}

export function useSelectPropertiesByStatus(status) {
  const { state } = useApp();
  return useMemo(() =>
    state.properties.filter(p => p.status === status),
    [state.properties, status]
  );
}

export function useSelectRequestsByStatus(status) {
  const { state } = useApp();
  return useMemo(() =>
    state.requests.filter(r => r.status === status),
    [state.requests, status]
  );
}

export function useSelectClientsByStatus(status) {
  const { state } = useApp();
  return useMemo(() =>
    state.clients.filter(c => c.status === status),
    [state.clients, status]
  );
}

export function useSelectIsAdmin() {
  const { state } = useApp();
  return useMemo(() =>
    state.currentUser?.role === 'admin' || state.currentUser?.status === 'approved',
    [state.currentUser]
  );
}

export function useSelectIsApproved() {
  const { state } = useApp();
  return useMemo(() =>
    state.currentUser?.status === 'approved',
    [state.currentUser]
  );
}
