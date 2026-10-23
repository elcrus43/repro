/**
 * callLogPlugin.js
 *
 * JS-обёртка над нативным Android Capacitor-плагином CallLogPlugin.
 * Использует window.Capacitor.Plugins напрямую (без npm @capacitor/core),
 * что соответствует принятому в проекте паттерну.
 *
 * На веб/iOS возвращает пустые заглушки — приложение не падает.
 *
 * Типы звонков (CallLog.Calls.TYPE):
 *   1 = INCOMING   — входящий
 *   2 = OUTGOING   — исходящий
 *   3 = MISSED     — пропущенный
 */

const CALL_TYPES = {
  1: 'incoming',
  2: 'outgoing',
  3: 'missed',
};

/** Проверяет, работает ли приложение в Android Capacitor */
function isAndroid() {
  if (typeof window === 'undefined') return false;
  return (
    Boolean(window.Capacitor) &&
    (window.Capacitor.getPlatform?.() === 'android' ||
     window.Capacitor.platform === 'android')
  );
}

/** Получает ссылку на нативный плагин из Capacitor Bridge */
function getNativePlugin() {
  return window?.Capacitor?.Plugins?.CallLogPlugin ?? null;
}

export const callLogPlugin = {
  /**
   * Проверяет, поддерживается ли плагин на текущей платформе.
   */
  isSupported() {
    return isAndroid() && Boolean(getNativePlugin());
  },

  /**
   * Запрашивает разрешение READ_CALL_LOG у пользователя.
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    if (!this.isSupported()) return false;
    try {
      const plugin = getNativePlugin();
      const { granted } = await plugin.requestPermission();
      return !!granted;
    } catch (err) {
      console.warn('[CallLogPlugin] requestPermission error:', err);
      return false;
    }
  },

  /**
   * Читает историю звонков с устройства.
   *
   * @param {object}  options
   * @param {number}  [options.sinceTimestamp=0] — читать только звонки после этого timestamp (ms)
   * @param {number}  [options.limit=200]         — максимальное кол-во записей
   *
   * @returns {Promise<Array<{number,type,date,duration,name}>>}
   */
  async getCallLog({ sinceTimestamp = 0, limit = 200 } = {}) {
    if (!this.isSupported()) return [];
    try {
      const plugin = getNativePlugin();
      const { calls } = await plugin.getCallLog({ sinceTimestamp, limit });
      return (calls || []).map(c => ({
        number:   c.number   || '',
        type:     CALL_TYPES[c.type] || 'unknown',
        date:     c.date     || 0,   // ms timestamp
        duration: c.duration || 0,   // seconds
        name:     c.name     || '',
      }));
    } catch (err) {
      console.warn('[CallLogPlugin] getCallLog error:', err);
      return [];
    }
  },
};
