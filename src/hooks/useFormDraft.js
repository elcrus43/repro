import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useFormDraft - хук автосохранения и восстановления черновиков форм в REA CRM.
 * Предотвращает потерю введенных данных при случайном закрытии страницы, звонке клиенту или сбое сети.
 * 
 * @param {string} storageKey - уникальный ключ (например, 'draft_property_new')
 * @param {Object} currentData - текущие данные формы
 * @param {Object} [options]
 * @param {number} [options.debounceMs=800] - задержка сохранения в мс
 * @param {boolean} [options.enabled=true] - включено ли автосохранение
 */
export function useFormDraft(storageKey, currentData, options = {}) {
  const { debounceMs = 800, enabled = true } = options;
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const isInitialMount = useRef(true);
  const timeoutRef = useRef(null);

  // Проверка наличия сохраненного черновика при монтировании
  useEffect(() => {
    if (!enabled || !storageKey || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setDraftData(parsed.data || parsed);
          setHasDraft(true);
        }
      }
    } catch {
      // Игнорируем ошибки парсинга или недоступности хранилища
    }
  }, [storageKey, enabled]);

  // Автоматическое сохранение при изменении данных
  useEffect(() => {
    if (!enabled || !storageKey || typeof window === 'undefined') return;

    // Пропускаем самый первый рендер, чтобы не перезаписать существующий черновик пустыми полями
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        if (currentData && Object.keys(currentData).length > 0) {
          const payload = {
            savedAt: Date.now(),
            data: currentData,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(payload));
        }
      } catch {
        // Защита от превышения квоты Storage
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [storageKey, currentData, debounceMs, enabled]);

  // Ручное сохранение
  const saveDraft = useCallback(
    (dataToSave) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        const payload = {
          savedAt: Date.now(),
          data: dataToSave,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // quota exceeded
      }
    },
    [storageKey]
  );

  // Восстановление черновика
  const restoreDraft = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const restored = parsed.data || parsed;
        setHasDraft(false);
        return restored;
      }
    } catch {
      return null;
    }
    return null;
  }, [storageKey]);

  // Очистка черновика (после успешного сохранения на бэкенд)
  const clearDraft = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftData(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return {
    hasDraft,
    draftData,
    restoreDraft,
    clearDraft,
    saveDraft,
  };
}
