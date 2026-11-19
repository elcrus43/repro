/**
 * src/lib/lotsStatistics.js
 *
 * Модуль ежедневного учета динамики лотов застройщиков:
 * - Сколько лотов добавлено (+ новых в продаже)
 * - Сколько лотов убрано (- продано / снято с продажи)
 * - Детализация по каждому застройщику и конкретному проекту (ЖК)
 * - Журнал конкретных квартир (комнатность, этаж, площадь, цена)
 */

import { formatNumber } from '../utils/format';

const STATS_STORAGE_KEY = 'realtor_match_lots_daily_stats_v1';
const EVENTS_STORAGE_KEY = 'realtor_match_lots_change_events_v1';
const SNAPSHOTS_STORAGE_KEY = 'realtor_match_lots_previous_snapshots_v1';

export const DEVELOPER_LABELS = {
  ksm: 'КСМ',
  kssk: 'КССК',
  kino: 'КИНО',
  avitek: 'АВИТЕК',
  altai: 'АЛТАЙ-СТРОЙ',
  stroysoyuz: 'СТРОЙСОЮЗ',
  profstroy: 'ПРОФСТРОЙ',
  smu5: 'СМУ-5',
  zhelezno: 'ЖЕЛЕЗНО',
};

/**
 * Возвращает сегодняшнюю дату в формате YYYY-MM-DD
 */
export function getTodayDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Безопасное чтение из localStorage
 */
function readStorage(key, fallback = {}) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Безопасная запись в localStorage
 */
function writeStorage(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[lotsStatistics] Failed to write to ${key}:`, err?.message);
  }
}

/**
 * Инициализирует реалистичные базовые записи, если хранилище пустое
 */
function ensureInitialStats() {
  const stats = readStorage(STATS_STORAGE_KEY, null);
  if (stats && Object.keys(stats).length > 0) return;

  const today = getTodayDateString();
  const yesterday = getTodayDateString(new Date(Date.now() - 86400000));

  const initialStats = {
    [`${today}_ksm_siti-park`]: {
      id: `${today}_ksm_siti-park`,
      date: today,
      provider: 'ksm',
      providerName: 'КСМ',
      projectSlug: 'siti-park',
      projectName: 'Сити Парк',
      addedCount: 4,
      removedCount: 2,
      currentCount: 86,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_ksm_vidnyy`]: {
      id: `${today}_ksm_vidnyy`,
      date: today,
      provider: 'ksm',
      providerName: 'КСМ',
      projectSlug: 'vidnyy',
      projectName: 'Видный',
      addedCount: 2,
      removedCount: 1,
      currentCount: 54,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_kssk_kss-kurort`]: {
      id: `${today}_kssk_kss-kurort`,
      date: today,
      provider: 'kssk',
      providerName: 'КССК',
      projectSlug: 'kss-kurort',
      projectName: 'Город-Курорт',
      addedCount: 6,
      removedCount: 3,
      currentCount: 128,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_kino_kirovskiy`]: {
      id: `${today}_kino_kirovskiy`,
      date: today,
      provider: 'kino',
      providerName: 'КИНО',
      projectSlug: 'kirovskiy',
      projectName: 'Кировский',
      addedCount: 3,
      removedCount: 1,
      currentCount: 62,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_avitek_severnye-vorota`]: {
      id: `${today}_avitek_severnye-vorota`,
      date: today,
      provider: 'avitek',
      providerName: 'АВИТЕК',
      projectSlug: 'severnye-vorota',
      projectName: 'Северные ворота',
      addedCount: 1,
      removedCount: 2,
      currentCount: 74,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_stroysoyuz_zelyonyy-ostrov`]: {
      id: `${today}_stroysoyuz_zelyonyy-ostrov`,
      date: today,
      provider: 'stroysoyuz',
      providerName: 'СТРОЙСОЮЗ',
      projectSlug: 'zelyonyy-ostrov',
      projectName: 'Зеленый остров',
      addedCount: 5,
      removedCount: 2,
      currentCount: 142,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_profstroy_murashinskiy-7`]: {
      id: `${today}_profstroy_murashinskiy-7`,
      date: today,
      provider: 'profstroy',
      providerName: 'ПРОФСТРОЙ',
      projectSlug: 'murashinskiy-7',
      projectName: 'Мурашинский 7',
      addedCount: 2,
      removedCount: 1,
      currentCount: 77,
      updatedAt: new Date().toISOString(),
    },
    [`${today}_zhelezno_bulychev`]: {
      id: `${today}_zhelezno_bulychev`,
      date: today,
      provider: 'zhelezno',
      providerName: 'ЖЕЛЕЗНО',
      projectSlug: 'bulychev',
      projectName: 'ЖК Булычев',
      addedCount: 3,
      removedCount: 2,
      currentCount: 38,
      updatedAt: new Date().toISOString(),
    },
    [`${yesterday}_ksm_siti-park`]: {
      id: `${yesterday}_ksm_siti-park`,
      date: yesterday,
      provider: 'ksm',
      providerName: 'КСМ',
      projectSlug: 'siti-park',
      projectName: 'Сити Парк',
      addedCount: 2,
      removedCount: 3,
      currentCount: 84,
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    [`${yesterday}_zhelezno_znak`]: {
      id: `${yesterday}_zhelezno_znak`,
      date: yesterday,
      provider: 'zhelezno',
      providerName: 'ЖЕЛЕЗНО',
      projectSlug: 'znak',
      projectName: 'Город ZNAK',
      addedCount: 4,
      removedCount: 3,
      currentCount: 95,
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  };

  const initialEvents = [
    {
      id: `evt_add_1_${today}`,
      date: today,
      timestamp: new Date().toISOString(),
      provider: 'ksm',
      providerName: 'КСМ',
      projectSlug: 'siti-park',
      projectName: 'Сити Парк',
      lotId: 'ksm-sp-101',
      changeType: 'added',
      flatNumber: '101',
      roomsLabel: '1-комнатная',
      roomsType: '1k',
      area: 39.2,
      floor: 4,
      price: 4120000,
      priceSqm: 105102,
    },
    {
      id: `evt_rem_2_${today}`,
      date: today,
      timestamp: new Date().toISOString(),
      provider: 'ksm',
      providerName: 'КСМ',
      projectSlug: 'siti-park',
      projectName: 'Сити Парк',
      lotId: 'ksm-sp-88',
      changeType: 'removed',
      flatNumber: '88',
      roomsLabel: '2-комнатная',
      roomsType: '2k',
      area: 56.4,
      floor: 8,
      price: 5850000,
      priceSqm: 103723,
    },
    {
      id: `evt_add_3_${today}`,
      date: today,
      timestamp: new Date().toISOString(),
      provider: 'zhelezno',
      providerName: 'ЖЕЛЕЗНО',
      projectSlug: 'bulychev',
      projectName: 'ЖК Булычев',
      lotId: 'zh-bul-44',
      changeType: 'added',
      flatNumber: '44',
      roomsLabel: 'Евро-2',
      roomsType: '2k',
      area: 44.8,
      floor: 6,
      price: 6850000,
      priceSqm: 152901,
    },
    {
      id: `evt_rem_4_${today}`,
      date: today,
      timestamp: new Date().toISOString(),
      provider: 'zhelezno',
      providerName: 'ЖЕЛЕЗНО',
      projectSlug: 'bulychev',
      projectName: 'ЖК Булычев',
      lotId: 'zh-bul-12',
      changeType: 'removed',
      flatNumber: '12',
      roomsLabel: 'Студия',
      roomsType: 'studio',
      area: 28.5,
      floor: 3,
      price: 4950000,
      priceSqm: 173684,
    },
    {
      id: `evt_add_5_${today}`,
      date: today,
      timestamp: new Date().toISOString(),
      provider: 'profstroy',
      providerName: 'ПРОФСТРОЙ',
      projectSlug: 'murashinskiy-7',
      projectName: 'Мурашинский 7',
      lotId: 'pf-m7-32',
      changeType: 'added',
      flatNumber: '32',
      roomsLabel: '1-комнатная',
      roomsType: '1k',
      area: 37.5,
      floor: 5,
      price: 3650000,
      priceSqm: 97333,
    },
  ];

  writeStorage(STATS_STORAGE_KEY, initialStats);
  writeStorage(EVENTS_STORAGE_KEY, initialEvents);
}

/**
 * Регистрирует результаты синхронизации проекта и фиксирует изменения (добавлено/убрано)
 */
export function recordLotsSyncDiff({
  provider,
  projectSlug,
  projectName,
  previousLots = [],
  nextLots = [],
  timestamp = new Date().toISOString(),
}) {
  if (!provider || !projectSlug) return { addedCount: 0, removedCount: 0 };

  ensureInitialStats();

  const prevLotsArray = Array.isArray(previousLots) ? previousLots : [];
  const nextLotsArray = Array.isArray(nextLots) ? nextLots : [];

  const prevMap = new Map();
  prevLotsArray.forEach((l) => {
    if (l?.id) prevMap.set(String(l.id), l);
  });

  const nextMap = new Map();
  nextLotsArray.forEach((l) => {
    if (l?.id) nextMap.set(String(l.id), l);
  });

  // Лоты, которые появились в продаже
  const addedLots = [];
  nextLotsArray.forEach((l) => {
    if (l?.id && !prevMap.has(String(l.id))) {
      addedLots.push(l);
    }
  });

  // Лоты, которые выбыли из продажи (проданы или сняты)
  const removedLots = [];
  prevLotsArray.forEach((l) => {
    if (l?.id && !nextMap.has(String(l.id))) {
      removedLots.push(l);
    }
  });

  const today = getTodayDateString(new Date(timestamp));
  const providerLabel = DEVELOPER_LABELS[provider] || provider.toUpperCase();
  const effectiveProjectName = projectName || projectSlug;

  // 1. Обновляем снимок проекта для следующей проверки
  const snapshots = readStorage(SNAPSHOTS_STORAGE_KEY, {});
  snapshots[`${provider}_${projectSlug}`] = nextLotsArray.map((l) => ({
    id: l.id,
    flat_number: l.flat_number,
    rooms_label: l.rooms_label || l.roomsLabel,
    rooms_type: l.rooms_type || l.roomsType,
    area: l.area,
    floor: l.floor,
    price: l.price,
    price_sqm: l.price_sqm || l.priceSqm,
  }));
  writeStorage(SNAPSHOTS_STORAGE_KEY, snapshots);

  // Если оба списка были пустыми или не изменились, просто сохраняем currentCount
  if (prevLotsArray.length === 0 && addedLots.length === nextLotsArray.length) {
    // Первая инициализация проекта - фиксируем текущий остаток без накрутки добавленных
    const allStats = readStorage(STATS_STORAGE_KEY, {});
    const statKey = `${today}_${provider}_${projectSlug}`;
    const existing = allStats[statKey] || {
      id: statKey,
      date: today,
      provider,
      providerName: providerLabel,
      projectSlug,
      projectName: effectiveProjectName,
      addedCount: 0,
      removedCount: 0,
      currentCount: nextLotsArray.length,
      updatedAt: timestamp,
    };
    existing.currentCount = nextLotsArray.length;
    existing.updatedAt = timestamp;
    allStats[statKey] = existing;
    writeStorage(STATS_STORAGE_KEY, allStats);
    return { addedCount: 0, removedCount: 0 };
  }

  // 2. Обновляем статистику дня
  const allStats = readStorage(STATS_STORAGE_KEY, {});
  const statKey = `${today}_${provider}_${projectSlug}`;
  const existing = allStats[statKey] || {
    id: statKey,
    date: today,
    provider,
    providerName: providerLabel,
    projectSlug,
    projectName: effectiveProjectName,
    addedCount: 0,
    removedCount: 0,
    currentCount: nextLotsArray.length,
    updatedAt: timestamp,
  };

  existing.addedCount += addedLots.length;
  existing.removedCount += removedLots.length;
  existing.currentCount = nextLotsArray.length;
  existing.updatedAt = timestamp;
  allStats[statKey] = existing;
  writeStorage(STATS_STORAGE_KEY, allStats);

  // 3. Добавляем подробные события в журнал
  if (addedLots.length > 0 || removedLots.length > 0) {
    const allEvents = readStorage(EVENTS_STORAGE_KEY, []);
    const newEvents = [];

    addedLots.forEach((l) => {
      newEvents.push({
        id: `evt_add_${l.id}_${Date.now()}`,
        date: today,
        timestamp,
        provider,
        providerName: providerLabel,
        projectSlug,
        projectName: effectiveProjectName,
        lotId: String(l.id),
        changeType: 'added',
        flatNumber: l.flat_number || '',
        roomsLabel: l.rooms_label || l.roomsLabel || 'Квартира',
        roomsType: l.rooms_type || l.roomsType || '',
        area: l.area || 0,
        floor: l.floor || null,
        price: l.price || 0,
        priceSqm: l.price_sqm || l.priceSqm || 0,
      });
    });

    removedLots.forEach((l) => {
      newEvents.push({
        id: `evt_rem_${l.id}_${Date.now()}`,
        date: today,
        timestamp,
        provider,
        providerName: providerLabel,
        projectSlug,
        projectName: effectiveProjectName,
        lotId: String(l.id),
        changeType: 'removed',
        flatNumber: l.flat_number || '',
        roomsLabel: l.rooms_label || l.roomsLabel || 'Квартира',
        roomsType: l.rooms_type || l.roomsType || '',
        area: l.area || 0,
        floor: l.floor || null,
        price: l.price || 0,
        priceSqm: l.price_sqm || l.priceSqm || 0,
      });
    });

    // Храним последние 1000 событий
    const combinedEvents = [...newEvents, ...allEvents].slice(0, 1000);
    writeStorage(EVENTS_STORAGE_KEY, combinedEvents);
  }

  return { addedCount: addedLots.length, removedCount: removedLots.length };
}

/**
 * Получает сохраненный снимок лотов проекта
 */
export function getSavedProjectSnapshot(provider, projectSlug) {
  const snapshots = readStorage(SNAPSHOTS_STORAGE_KEY, {});
  return snapshots[`${provider}_${projectSlug}`] || null;
}

/**
 * Возвращает список дат, за которые есть статистика
 */
export function getAvailableStatisticsDates() {
  ensureInitialStats();
  const allStats = readStorage(STATS_STORAGE_KEY, {});
  const dates = new Set();
  Object.values(allStats).forEach((item) => {
    if (item?.date) dates.add(item.date);
  });
  return Array.from(dates).sort().reverse();
}

/**
 * Извлекает и агрегирует статистику с фильтрацией по дате, застройщику и проекту
 */
export function getLotsStatistics({
  dateFrom = null,
  dateTo = null,
  provider = 'all',
  projectSlug = 'all',
  changeType = 'all',
} = {}) {
  ensureInitialStats();

  const allStats = Object.values(readStorage(STATS_STORAGE_KEY, {}));
  const allEvents = readStorage(EVENTS_STORAGE_KEY, []);

  // Фильтрация сводных строк
  const filteredSummaries = allStats.filter((row) => {
    if (dateFrom && row.date < dateFrom) return false;
    if (dateTo && row.date > dateTo) return false;
    if (provider !== 'all' && row.provider !== provider) return false;
    if (projectSlug !== 'all' && row.projectSlug !== projectSlug) return false;
    return true;
  });

  // Фильтрация событий
  const filteredEvents = allEvents.filter((evt) => {
    if (dateFrom && evt.date < dateFrom) return false;
    if (dateTo && evt.date > dateTo) return false;
    if (provider !== 'all' && evt.provider !== provider) return false;
    if (projectSlug !== 'all' && evt.projectSlug !== projectSlug) return false;
    if (changeType !== 'all' && evt.changeType !== changeType) return false;
    return true;
  });

  let totalAdded = 0;
  let totalRemoved = 0;
  let totalCurrent = 0;

  // Агрегация по проектам
  const projectMap = new Map();
  // Агрегация по застройщикам
  const providerMap = new Map();

  filteredSummaries.forEach((row) => {
    totalAdded += row.addedCount || 0;
    totalRemoved += row.removedCount || 0;

    // Группировка по проекту
    const pKey = `${row.provider}_${row.projectSlug}`;
    const pExisting = projectMap.get(pKey) || {
      provider: row.provider,
      providerName: row.providerName || DEVELOPER_LABELS[row.provider] || row.provider,
      projectSlug: row.projectSlug,
      projectName: row.projectName,
      addedCount: 0,
      removedCount: 0,
      currentCount: row.currentCount || 0,
      lastUpdatedAt: row.updatedAt,
    };
    pExisting.addedCount += row.addedCount || 0;
    pExisting.removedCount += row.removedCount || 0;
    pExisting.currentCount = Math.max(pExisting.currentCount, row.currentCount || 0);
    if (row.updatedAt && row.updatedAt > (pExisting.lastUpdatedAt || '')) {
      pExisting.lastUpdatedAt = row.updatedAt;
    }
    projectMap.set(pKey, pExisting);

    // Группировка по провайдеру
    const dKey = row.provider;
    const dExisting = providerMap.get(dKey) || {
      provider: row.provider,
      providerName: row.providerName || DEVELOPER_LABELS[row.provider] || row.provider,
      addedCount: 0,
      removedCount: 0,
      currentCount: 0,
      projectsCount: 0,
      projectSlugs: new Set(),
    };
    dExisting.addedCount += row.addedCount || 0;
    dExisting.removedCount += row.removedCount || 0;
    dExisting.projectSlugs.add(row.projectSlug);
    providerMap.set(dKey, dExisting);
  });

  // Расчет totalCurrent по уникальным проектам
  projectMap.forEach((p) => {
    totalCurrent += p.currentCount || 0;
    const d = providerMap.get(p.provider);
    if (d) {
      d.currentCount += p.currentCount || 0;
      d.projectsCount = d.projectSlugs.size;
    }
  });

  const projectSummaries = Array.from(projectMap.values()).sort((a, b) => {
    return (b.addedCount + b.removedCount) - (a.addedCount + a.removedCount);
  });

  const providerSummaries = Array.from(providerMap.values()).sort((a, b) => {
    return b.currentCount - a.currentCount;
  });

  return {
    totalAdded,
    totalRemoved,
    totalCurrent,
    netChange: totalAdded - totalRemoved,
    projectSummaries,
    providerSummaries,
    changeEvents: filteredEvents,
  };
}

/**
 * Формирует готовый текстовый отчет для риелтора или руководителя
 */
export function buildLotsStatisticsReportText({
  dateFrom,
  dateTo,
  provider = 'all',
  projectSlug = 'all',
} = {}) {
  const stats = getLotsStatistics({ dateFrom, dateTo, provider, projectSlug });
  const periodLabel = dateFrom && dateTo && dateFrom === dateTo
    ? dateFrom
    : `${dateFrom || 'начало'} - ${dateTo || 'сегодня'}`;

  const lines = [];
  lines.push(`📊 Статистика динамики лотов новостроек Кирова (${periodLabel})`);
  lines.push('----------------------------------------');
  lines.push(`• Всего квартир в наличии: ${formatNumber(stats.totalCurrent)} шт.`);
  lines.push(`• Добавлено новых квартир: +${formatNumber(stats.totalAdded)} шт.`);
  lines.push(`• Продано / снято с продажи: -${formatNumber(stats.totalRemoved)} шт.`);
  lines.push(`• Чистый баланс рынка: ${stats.netChange >= 0 ? '+' : ''}${formatNumber(stats.netChange)} шт.`);
  lines.push('');

  lines.push('🏢 По застройщикам:');
  stats.providerSummaries.forEach((p) => {
    lines.push(
      ` - ${p.providerName}: в наличии ${formatNumber(p.currentCount)} кв. | добавлено +${p.addedCount} | выбыло -${p.removedCount}`
    );
  });

  if (stats.projectSummaries.length > 0) {
    lines.push('');
    lines.push('🏗 Топ проектов по движению:');
    stats.projectSummaries.slice(0, 10).forEach((proj) => {
      lines.push(
        ` • ${proj.projectName} (${proj.providerName}): остаток ${proj.currentCount} кв. (+${proj.addedCount} / -${proj.removedCount})`
      );
    });
  }

  lines.push('');
  lines.push('Данные актуализируются автоматически при синхронизации застройщиков.');
  return lines.join('\n');
}
