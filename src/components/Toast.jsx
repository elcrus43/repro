import React, { createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';

/* ─── Context ──────────────────────────────────────────────────────────────── */

const ToastContext = createContext(null);

/**
 * ToastProvider — оборачивает приложение и предоставляет toast-функции через контекст.
 *
 * В App.jsx:
 *   <ToastProvider>
 *     <AppProvider>
 *       ...
 *     </AppProvider>
 *   </ToastProvider>
 *
 * В любом компоненте:
 *   const { toast } = useToastContext();
 *   toast.error('Текст ошибки');
 */
export function ToastProvider({ children }) {
  const { toasts, toast, dismiss } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used inside <ToastProvider>');
  return ctx;
}

/* ─── Icons ────────────────────────────────────────────────────────────────── */

const ICONS = {
  error: '✕',
  success: '✓',
  warn: '⚠',
  info: 'ℹ',
};

const TYPE_CLASS = {
  error: 'toast-error',
  success: 'toast-success',
  warn: 'toast-warning',
  info: 'toast-info',
};

/* ─── Single Toast ─────────────────────────────────────────────────────────── */

function Toast({ id, message, type, dismiss }) {
  const toastClass = TYPE_CLASS[type] || TYPE_CLASS.info;

  return (
    <div
      role="alert"
      className={toastClass}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        border: '1px solid',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        minWidth: '280px',
        maxWidth: '420px',
        animation: 'toastIn 0.2s ease',
      }}
    >
      {/* Иконка типа */}
      <span style={{
        flexShrink: 0,
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'currentColor',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 900,
        marginTop: '1px',
      }}>
        {ICONS[type]}
      </span>

      {/* Текст */}
      <p style={{
        flex: 1,
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.5,
        color: 'currentColor',
        wordBreak: 'break-word',
      }}>
        {message}
      </p>

      {/* Закрыть */}
      <button
        onClick={() => dismiss(id)}
        aria-label="Закрыть уведомление"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'currentColor',
          opacity: 0.5,
          fontSize: '16px',
          lineHeight: 1,
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ─── Container ────────────────────────────────────────────────────────────── */

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;

  return (
    <>
      {/* CSS-анимация появления */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: '80px',   /* над BottomNav (BottomNav ≈ 64px) */
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast {...t} dismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
