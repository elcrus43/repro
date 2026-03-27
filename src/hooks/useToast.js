import { useState, useCallback, useRef } from 'react';

/**
 * useToast — замена нативного alert() для ошибок Supabase и Calendar.
 *
 * Возвращает:
 *   toasts   — массив активных уведомлений
 *   toast    — функции показа: toast.error(), toast.success(), toast.warn(), toast.info()
 *   dismiss  — убрать конкретный toast по id
 *
 * Использование:
 *   const { toasts, toast, dismiss } = useToast();
 *   toast.error('Ошибка сохранения: ...');
 *   toast.success('Запись сохранена!');
 *
 *   <ToastContainer toasts={toasts} dismiss={dismiss} />
 */
export function useToast(defaultDuration = 5000) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const add = useCallback((message, type = 'info', duration = defaultDuration) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, [defaultDuration]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    error:   (msg, dur) => add(msg, 'error',   dur),
    success: (msg, dur) => add(msg, 'success', dur),
    warn:    (msg, dur) => add(msg, 'warn',    dur),
    info:    (msg, dur) => add(msg, 'info',    dur),
  };

  return { toasts, toast, dismiss };
}
