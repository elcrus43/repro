/**
 * useCallLogSync.js
 *
 * Хук для автоматической синхронизации звонков Android с CRM.
 * Без внешних зависимостей типа @capacitor/app — используется document.visibilitychange
 * и window.Capacitor.Plugins.App (если есть).
 *
 * Логика:
 *  1. При старте (и при каждом возвращении в приложение) читает звонки через CallLogPlugin
 *  2. Фильтрует звонки, которые уже были импортированы
 *  3. Сопоставляет номер телефона с базой клиентов state.clients
 *  4. Создает задачи типа 'Звонок' в CRM
 *  5. Запоминает timestamp последней синхронизации
 */

import { useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { callLogPlugin } from '../lib/callLogPlugin';
import { nanoid } from '../utils/nanoid';

const LAST_SYNC_KEY = 'rm_calllog_last_sync';
const IMPORTED_IDS_KEY = 'rm_calllog_imported';

/** Нормализуем номер телефона для сравнения (только цифры, без ведущей 7/8) */
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    return digits.slice(1);
  }
  return digits;
}

/** Уникальный идентификатор записи звонка */
function callUniqueId(call) {
  return `${call.number}_${call.date}_${call.type}`;
}

function getImportedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(IMPORTED_IDS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveImportedIds(set) {
  try {
    const arr = [...set].slice(-2000);
    localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

function callTypeLabel(type) {
  if (type === 'incoming') return 'Входящий звонок';
  if (type === 'outgoing') return 'Исходящий звонок';
  if (type === 'missed')   return 'Пропущенный звонок';
  return 'Звонок';
}

export function useCallLogSync() {
  const { state, dispatch } = useApp();
  const syncingRef = useRef(false);

  const syncCallLog = useCallback(async () => {
    if (syncingRef.current) return;
    if (!callLogPlugin.isSupported()) return;
    if (!state.currentUser?.id) return;

    syncingRef.current = true;
    try {
      const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10);
      // Если синхронизация впервые — берём звонки за последние 14 дней
      const sinceTimestamp = lastSync > 0
        ? lastSync
        : Date.now() - 14 * 24 * 60 * 60 * 1000;

      const calls = await callLogPlugin.getCallLog({ sinceTimestamp, limit: 150 });
      if (!calls || !calls.length) return;

      const importedIds = getImportedIds();
      const newTasks = [];
      const now = new Date().toISOString();

      // Индексируем клиентов по номерам телефонов
      const phoneIndex = new Map();
      for (const client of (state.clients || [])) {
        const phones = [
          client.phone,
          ...(client.phones || []),
        ];
        for (const ph of phones) {
          const norm = normalizePhone(ph);
          if (norm) phoneIndex.set(norm, client);
        }
      }

      for (const call of calls) {
        const uid = callUniqueId(call);
        if (importedIds.has(uid)) continue;

        importedIds.add(uid);

        const normNumber = normalizePhone(call.number);
        const client = normNumber ? phoneIndex.get(normNumber) : null;

        const callDate = new Date(call.date).toISOString();
        const durationMin = call.duration > 0
          ? `${Math.floor(call.duration / 60)} мин ${call.duration % 60} сек`
          : null;

        const task = {
          id:          nanoid(),
          realtor_id:  state.currentUser.id,
          client_id:   client?.id || null,
          property_id: null,
          title:       `${callTypeLabel(call.type)} — ${client?.full_name || call.name || call.number}`,
          description: [
            `Номер: ${call.number}`,
            durationMin ? `Длительность: ${durationMin}` : (call.type === 'missed' ? 'Пропущен без ответа' : null),
            call.name && !client ? `Имя из книги: ${call.name}` : null,
            `📱 Автоматически зафиксировано со смартфона Android`,
          ].filter(Boolean).join('\n'),
          due_date:    callDate,
          status:      call.type === 'missed' ? 'pending' : 'done',
          priority:    call.type === 'missed' ? 'high' : 'low',
          task_type:   'Позвонить',
          call_type:   call.type,
          call_number: call.number,
          call_duration: call.duration,
          imported_from: 'android_calllog',
          created_at:  now,
          updated_at:  now,
        };

        newTasks.push(task);
      }

      if (newTasks.length > 0) {
        for (const task of newTasks) {
          await dispatch({ type: 'ADD_TASK', task });
        }
        console.log(`[CallLogSync] Успешно зафиксировано ${newTasks.length} звонков`);
      }

      saveImportedIds(importedIds);
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

    } catch (err) {
      console.warn('[CallLogSync] Ошибка синхронизации:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [state.currentUser?.id, state.clients, dispatch]);

  useEffect(() => {
    if (!callLogPlugin.isSupported()) return;
    if (!state.currentUser?.id) return;

    // Запрашиваем разрешение при старте и синхронизируем
    (async () => {
      const granted = await callLogPlugin.requestPermission();
      if (granted) {
        await syncCallLog();
      }
    })();

    // Слушатель возврата во вкладку / приложение
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncCallLog();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Слушатель через нативный Capacitor App (если доступен в window.Capacitor.Plugins)
    const nativeApp = window?.Capacitor?.Plugins?.App;
    let listener = null;
    if (nativeApp?.addListener) {
      nativeApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) syncCallLog();
      }).then(l => { listener = l; }).catch(() => {});
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      listener?.remove?.();
    };
  }, [state.currentUser?.id, syncCallLog]);

  return { syncCallLog };
}
