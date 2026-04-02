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
  error:   '✕',
  success: '✓',
  warn:    '⚠',
  info:    'ℹ',
};

const COLORS = {
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '#dc2626' },
  success: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '#16a34a' },
  warn:    { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', icon: '#d97706' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', icon: '#2563eb' },
};

/* ─── Single Toast ─────────────────────────────────────────────────────────── */

function Toast({ id, message, type, dismiss }) {
  const c = COLORS[type] || COLORS.info;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        background: c.bg,
        border: `1px solid ${c.border}`,
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
        background: c.icon,
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
        color: '#1e293b',
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
          color: '#94a3b8',
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
