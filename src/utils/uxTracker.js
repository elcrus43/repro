/**
 * uxTracker.js - модуль трекинга UX-метрик для REA CRM
 * Отслеживание времени на задачу, кликов, ошибок, drop-off, rage clicks и микроопросов (CES/CSAT).
 * 
 * Правила проекта:
 * - Строго дефис '-', никаких длинных тире.
 * - Кодировка UTF-8, окончания LF.
 */

// Хранилище сессий и накопленных метрик
let activeScenario = null;
const completedScenarios = [];
const feedbackStore = [];
const rageClickEvents = [];

// Конфигурация детектора rage clicks
const RAGE_CLICK_THRESHOLD = 3; // 3 клика
const RAGE_CLICK_INTERVAL_MS = 600; // в пределах 600 мс
const RAGE_CLICK_DISTANCE_PX = 30; // в радиусе 30 px

let clickHistory = [];

/**
 * Очистить конфиденциальные данные (PII) из селекторов и метаданных
 * @param {string} selector 
 * @returns {string}
 */
export function sanitizeSelector(selector = '') {
  if (typeof selector !== 'string') return '';
  return selector
    .replace(/(password|token|secret|pin|cvv)=[^&]+/gi, '$1=[REDACTED]')
    .slice(0, 100);
}

/**
 * Проверка эргономики: находится ли точка касания в комфортной зоне большого пальца (нижние 50% экрана)
 * @param {number} clientY 
 * @param {number} screenHeight 
 * @returns {boolean}
 */
export function isThumbZone(clientY, screenHeight = window?.innerHeight || 800) {
  if (typeof clientY !== 'number' || typeof screenHeight !== 'number' || screenHeight <= 0) {
    return false;
  }
  // Нижняя половина экрана (от 50% до 90% высоты, за вычетом системного навбара)
  const ratio = clientY / screenHeight;
  return ratio >= 0.45 && ratio <= 0.95;
}

/**
 * Старт пользовательского сценария (например, 'create_property', 'client_matching')
 * @param {string} name 
 * @param {Object} metadata 
 * @returns {Object}
 */
export function startScenario(name, metadata = {}) {
  const now = Date.now();
  
  // Если предыдущий сценарий не был завершен, фиксируем его как брошенный (drop-off)
  if (activeScenario && !activeScenario.finishedAt) {
    cancelScenario('new_scenario_started');
  }

  activeScenario = {
    id: `ux_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    metadata: { ...metadata },
    startedAt: now,
    finishedAt: null,
    status: 'in_progress', // 'in_progress' | 'completed' | 'abandoned'
    steps: [{ name: 'init', timestamp: now }],
    clickCount: 0,
    errors: [],
    rageClicksCount: 0,
    thumbZoneClicksCount: 0,
  };

  return { ...activeScenario };
}

/**
 * Переход на следующий шаг сценария
 * @param {string} stepName 
 * @returns {Object|null}
 */
export function recordStep(stepName) {
  if (!activeScenario || activeScenario.status !== 'in_progress') return null;
  const now = Date.now();
  const lastStep = activeScenario.steps[activeScenario.steps.length - 1];
  const stepDuration = lastStep ? now - lastStep.timestamp : 0;

  const stepObj = {
    name: stepName,
    timestamp: now,
    stepDurationMs: stepDuration,
  };

  activeScenario.steps.push(stepObj);
  return stepObj;
}

/**
 * Учет клика / тапа с детекцией быстрых повторных нажатий (Rage Click)
 * @param {string} targetSelector 
 * @param {number} clientX 
 * @param {number} clientY 
 * @returns {Object} { isRageClick: boolean, inThumbZone: boolean }
 */
export function recordClick(targetSelector = '', clientX = 0, clientY = 0) {
  const now = Date.now();
  const safeSelector = sanitizeSelector(targetSelector);
  const inThumbZone = isThumbZone(clientY);

  if (activeScenario && activeScenario.status === 'in_progress') {
    activeScenario.clickCount += 1;
    if (inThumbZone) {
      activeScenario.thumbZoneClicksCount += 1;
    }
  }

  // Очистка старых кликов
  clickHistory = clickHistory.filter((c) => now - c.timestamp <= RAGE_CLICK_INTERVAL_MS);

  // Проверка на повторный клик по тому же элементу или рядом
  const recentNearbyClicks = clickHistory.filter((c) => {
    const dist = Math.hypot(c.x - clientX, c.y - clientY);
    return dist <= RAGE_CLICK_DISTANCE_PX || (safeSelector && c.selector === safeSelector);
  });

  let isRageClick = false;
  if (recentNearbyClicks.length + 1 >= RAGE_CLICK_THRESHOLD) {
    isRageClick = true;
    const rageEvent = {
      timestamp: now,
      selector: safeSelector,
      clicksCount: recentNearbyClicks.length + 1,
      scenario: activeScenario?.name || 'global',
    };
    rageClickEvents.push(rageEvent);

    if (activeScenario && activeScenario.status === 'in_progress') {
      activeScenario.rageClicksCount += 1;
    }
  }

  clickHistory.push({
    timestamp: now,
    selector: safeSelector,
    x: clientX,
    y: clientY,
  });

  return { isRageClick, inThumbZone };
}

/**
 * Фиксация ошибки ввода или сбоя во время сценария
 * @param {string} fieldName 
 * @param {string} errorMessage 
 * @returns {Object|null}
 */
export function recordError(fieldName = '', errorMessage = '') {
  if (!activeScenario || activeScenario.status !== 'in_progress') return null;

  const errorObj = {
    timestamp: Date.now(),
    field: fieldName,
    message: String(errorMessage).slice(0, 150),
  };

  activeScenario.errors.push(errorObj);
  return errorObj;
}

/**
 * Успешное завершение сценария
 * @returns {Object|null}
 */
export function finishScenario() {
  if (!activeScenario || activeScenario.status !== 'in_progress') return null;

  const now = Date.now();
  activeScenario.finishedAt = now;
  activeScenario.status = 'completed';
  activeScenario.totalDurationMs = now - activeScenario.startedAt;

  const report = { ...activeScenario };
  completedScenarios.push(report);
  activeScenario = null;

  return report;
}

/**
 * Отмена или прерывание сценария (отвал / Drop-off)
 * @param {string} reason 
 * @returns {Object|null}
 */
export function cancelScenario(reason = 'abandoned_by_user') {
  if (!activeScenario || activeScenario.status !== 'in_progress') return null;

  const now = Date.now();
  activeScenario.finishedAt = now;
  activeScenario.status = 'abandoned';
  activeScenario.abandonReason = reason;
  activeScenario.totalDurationMs = now - activeScenario.startedAt;

  const report = { ...activeScenario };
  completedScenarios.push(report);
  activeScenario = null;

  return report;
}

/**
 * Сохранение субъективной оценки пользователя (CES / CSAT / SUS)
 * @param {string} scenarioName 
 * @param {Object} options 
 * @returns {Object}
 */
export function recordFeedback(scenarioName, { score = 5, metricType = 'CES', comment = '' } = {}) {
  const feedbackItem = {
    id: `fb_${Date.now()}`,
    scenario: scenarioName,
    metricType, // 'CES' (1-7), 'CSAT' (1-5), 'SUS' (0-100)
    score: Number(score),
    comment: String(comment).slice(0, 300),
    timestamp: Date.now(),
  };

  feedbackStore.push(feedbackItem);
  return feedbackItem;
}

/**
 * Получить сводные UX-метрики за сессию
 * @returns {Object}
 */
export function getMetricsSummary() {
  const total = completedScenarios.length;
  const completed = completedScenarios.filter((s) => s.status === 'completed');
  const abandoned = completedScenarios.filter((s) => s.status === 'abandoned');

  const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
  const dropOffRate = total > 0 ? (abandoned.length / total) * 100 : 0;

  const avgDurationMs =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + s.totalDurationMs, 0) / completed.length
      : 0;

  const avgClicks =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + s.clickCount, 0) / completed.length
      : 0;

  const totalErrors = completedScenarios.reduce((sum, s) => sum + s.errors.length, 0);
  const totalRageClicks = rageClickEvents.length;

  const cesFeedbacks = feedbackStore.filter((f) => f.metricType === 'CES');
  const avgCES =
    cesFeedbacks.length > 0
      ? cesFeedbacks.reduce((sum, f) => sum + f.score, 0) / cesFeedbacks.length
      : null;

  return {
    totalScenarios: total,
    completedScenarios: completed.length,
    abandonedScenarios: abandoned.length,
    completionRate: Number(completionRate.toFixed(1)),
    dropOffRate: Number(dropOffRate.toFixed(1)),
    avgDurationSec: Number((avgDurationMs / 1000).toFixed(1)),
    avgClicksPerTask: Number(avgClicks.toFixed(1)),
    totalErrors,
    totalRageClicks,
    avgCES: avgCES !== null ? Number(avgCES.toFixed(2)) : null,
    totalFeedbacksCount: feedbackStore.length,
  };
}

/**
 * Сброс состояния (для тестов и смены сессии)
 */
export function resetTracker() {
  activeScenario = null;
  completedScenarios.length = 0;
  feedbackStore.length = 0;
  rageClickEvents.length = 0;
  clickHistory.length = 0;
}
