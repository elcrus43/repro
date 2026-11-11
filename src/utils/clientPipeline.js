import { getContractStatusInfo } from './contractTerms';

export const CLIENT_PIPELINE_STAGES = [
  {
    id: 'active',
    statusValue: 'active',
    label: 'В работе',
    shortLabel: 'В работе',
    subLabel: 'Действующий АД, сделка не закрыта',
    color: '#10b981',
    textColor: '#059669',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.30)'
  },
  {
    id: 'control',
    statusValue: 'control',
    label: 'На контроле',
    shortLabel: 'На контроле',
    subLabel: 'Есть встречи, но нет АД',
    color: '#f59e0b',
    textColor: '#d97706',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.30)'
  },
  {
    id: 'other',
    statusValue: 'new',
    label: 'Остальные',
    shortLabel: 'Остальные',
    subLabel: 'Новые контакты и в подборе',
    color: '#3b82f6',
    textColor: '#2563eb',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.30)'
  },
  {
    id: 'completed',
    statusValue: 'deal_closed',
    label: 'Сделка закрыта',
    shortLabel: 'Сделка закрыта',
    subLabel: 'Завершённые сделки',
    color: '#0f766e',
    textColor: '#0f766e',
    badgeBg: 'rgba(15, 118, 110, 0.12)',
    border: 'rgba(15, 118, 110, 0.30)'
  },
  {
    id: 'refused',
    statusValue: 'refused',
    label: 'Отказ / Архив',
    shortLabel: 'Отказ',
    subLabel: 'Отказы клиентов',
    color: '#ef4444',
    textColor: '#dc2626',
    badgeBg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.30)'
  }
];

export const CLOSED_DEAL_STATUSES = ['closed', 'completed', 'deal_closed'];
export const INACTIVE_CONTRACT_STATUSES = ['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'];

/**
 * Собирает сводку по сделкам и агентским договорам клиента
 * с учётом сособственников (property.client_ids / seller_ids) и сопокупателей (buyer_ids).
 */
export function getClientPipelineMeta(client, { deals = [], properties = [] } = {}) {
  if (!client) {
    return {
      clientDeals: [],
      hasClosedDeal: false,
      hasOpenDeal: false,
      activeContracts: [],
      fulfilledContracts: [],
      hasActiveAD: false,
      hasFulfilledAD: false,
      latestClosedDealTs: 0
    };
  }

  const clientPropIds = new Set(
    (properties || [])
      .filter(p =>
        p.client_id === client.id ||
        p.owner_id === client.id ||
        (Array.isArray(p.client_ids) && p.client_ids.includes(client.id))
      )
      .map(p => p.id)
  );

  const clientDeals = (deals || []).filter(d => {
    const sIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
    const bIds = d.buyer_ids || (d.buyer_id ? [d.buyer_id] : []);
    return sIds.includes(client.id) || bIds.includes(client.id) || (d.property_id && clientPropIds.has(d.property_id));
  });

  const closedDeals = clientDeals.filter(d => CLOSED_DEAL_STATUSES.includes(d.status));
  const hasClosedDeal = closedDeals.length > 0;
  const hasOpenDeal = clientDeals.some(
    d => !CLOSED_DEAL_STATUSES.includes(d.status) && !['cancelled', 'refused', 'failed'].includes(d.status)
  );

  const latestClosedDealTs = closedDeals.reduce((maxTs, d) => {
    const ts = Math.max(
      d.updated_at ? new Date(d.updated_at).getTime() : 0,
      d.deal_date ? new Date(d.deal_date).getTime() : 0,
      d.created_at ? new Date(d.created_at).getTime() : 0
    );
    return Number.isFinite(ts) && ts > maxTs ? ts : maxTs;
  }, 0);

  const rawContracts = Array.isArray(client.agency_contracts) ? client.agency_contracts : [];
  const activeContracts = [];
  const fulfilledContracts = [];

  for (const ct of rawContracts) {
    if (!ct) continue;
    if (['terminated', 'cancelled'].includes(ct.status)) continue;
    if (['fulfilled', 'executed'].includes(ct.status)) {
      fulfilledContracts.push(ct);
      continue;
    }
    const info = getContractStatusInfo(ct, new Date(), { deals, client });
    if (info?.isFulfilled) {
      fulfilledContracts.push(ct);
    } else if (!info?.isTerminated && ct.status !== 'closed') {
      activeContracts.push(ct);
    }
  }

  const hasLegacyAD =
    rawContracts.length === 0 &&
    Boolean(client.has_agency_contract || client.agency_contract_date) &&
    !hasClosedDeal;
  const hasActiveAD = activeContracts.length > 0 || hasLegacyAD;
  const hasFulfilledAD =
    fulfilledContracts.length > 0 ||
    (rawContracts.length === 0 && Boolean(client.has_agency_contract || client.agency_contract_date) && hasClosedDeal);

  return {
    clientDeals,
    hasClosedDeal,
    hasOpenDeal,
    activeContracts,
    fulfilledContracts,
    hasActiveAD,
    hasFulfilledAD,
    latestClosedDealTs
  };
}

/**
 * Определяет текущий этап воронки клиента.
 */
export function getClientPipelineStage(client, { deals = [], properties = [], showings = [] } = {}) {
  if (!client) return 'other';

  // 1. Отказ / Архив
  if (client.status === 'refused' || client.pipeline_stage === 'refused') {
    return 'refused';
  }

  // 2. Явный выбор этапа в текущей сессии (переключатель в профиле или drag-and-drop)
  if (client.pipeline_stage && CLIENT_PIPELINE_STAGES.some(s => s.id === client.pipeline_stage)) {
    return client.pipeline_stage;
  }

  const { hasClosedDeal, hasOpenDeal, hasActiveAD, latestClosedDealTs } = getClientPipelineMeta(client, { deals, properties });

  // 3. Клиент помечен как 'deal_closed' / 'completed'
  if (['deal_closed', 'completed'].includes(client.status)) {
    // Если после закрытия появился новый действующий АД или новая открытая сделка -> снова В работе
    if (hasActiveAD || hasOpenDeal) {
      return 'active';
    }
    return 'completed';
  }

  // 4. Действующий АД или открытая сделка -> «В работе»
  if (hasActiveAD || hasOpenDeal) {
    return 'active';
  }

  // 5. Ручной статус «На контроле»
  if (client.status === 'control') {
    return 'control';
  }

  // 6. Если есть закрытая сделка (и клиент не переводился вручную в 'active' уже после закрытия сделки)
  if (hasClosedDeal) {
    const clientUpdatedTs = client.updated_at ? new Date(client.updated_at).getTime() : 0;
    const wasManuallyReactivated = client.status === 'active' && clientUpdatedTs > latestClosedDealTs + 60000;
    if (!wasManuallyReactivated) {
      return 'completed';
    }
  }

  // 7. «На контроле» (по которым есть встречи/показы, но нет АД)
  const clientShowings = (showings || []).filter(s => {
    const cIds = s.client_ids || (s.client_id ? [s.client_id] : []);
    return cIds.includes(client.id);
  });
  const hasMeetings = clientShowings.some(s => ['meeting', 'showing', 'viewing'].includes(s.event_type));
  if (hasMeetings) {
    return 'control';
  }

  // 8. Явный статус «В работе»
  if (client.status === 'active') {
    return 'active';
  }

  // 9. «Остальные»
  return 'other';
}
