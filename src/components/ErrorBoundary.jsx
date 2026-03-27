import React from 'react';

/**
 * ErrorBoundary — перехватывает ошибки рендера любого дочернего компонента.
 * Без него любая ошибка в дереве уронит всё приложение.
 *
 * Использование:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 *   или с кастомным fallback:
 *   <ErrorBoundary fallback={<MyErrorPage />}>
 *     <SomeRiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Здесь можно отправить ошибку в Sentry / LogRocket / etc.
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg, #f8fafc)',
          color: 'var(--text, #1e293b)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '56px',
            marginBottom: '16px',
          }}>⚠️</div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            Что-то пошло не так
          </h1>

          <p style={{ color: '#64748b', maxWidth: '420px', marginBottom: '24px', lineHeight: 1.6 }}>
            Произошла неожиданная ошибка в интерфейсе. Попробуйте обновить страницу или
            сбросить состояние компонента.
          </p>

          {/* Детали ошибки — только в режиме разработки */}
          {import.meta.env.DEV && this.state.error && (
            <details style={{
              marginBottom: '24px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px 16px',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
                Техническая информация
              </summary>
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#7f1d1d' }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Попробовать снова
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
