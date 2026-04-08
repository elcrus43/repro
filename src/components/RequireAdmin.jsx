import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * Guard для маршрутов, доступных только администраторам.
 * 
 * Проверяет роль пользователя из контекста AppContext.
 * Если пользователь не администратор, перенаправляет на главную.
 * 
 * Использование:
 *   <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
 */
export function RequireAdmin({ children }) {
  const { state } = useApp();

  if (state.loading) {
    return (
      <div className="loading-screen">
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, color: 'var(--primary)' }}>REM</div>
        <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 14 }}>Проверка прав...</p>
      </div>
    );
  }

  if (!state.currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (state.currentUser.role !== 'admin') {
    // Не администратор — на главную
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * HOC для защиты компонентов на уровне ролей.
 * 
 * Использование:
 *   export default withRoleGuard(MyComponent, 'admin');
 */
export function withRoleGuard(Component, requiredRole) {
  return function GuardedComponent(props) {
    const { state } = useApp();

    if (state.loading) {
      return (
        <div className="loading-screen">
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, color: 'var(--primary)' }}>REM</div>
          <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 14 }}>Проверка прав...</p>
        </div>
      );
    }

    if (!state.currentUser) {
      return <Navigate to="/login" replace />;
    }

    if (requiredRole && state.currentUser.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }

    return <Component {...props} />;
  };
}
