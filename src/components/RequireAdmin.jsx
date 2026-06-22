import React from 'react';
import { Building2 } from 'lucide-react';
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
    return null;
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
      return null;
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
