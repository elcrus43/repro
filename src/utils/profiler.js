/**
 * profiler.js — утилиты для замера производительности компонентов.
 *
 * Использование:
 *   1. В React DevTools (браузерное расширение) включи "Highlight updates"
 *   2. Используй <Profiler> из react для замера в коде
 *   3. Этот файл даёт удобные обёртки и логирование
 *
 * Пример:
 *   import { withProfiler } from '../utils/profiler';
 *   const ClientsPage = withProfiler(ClientsPageInner, 'ClientsPage');
 */

import { Profiler } from 'react';

const isDev = import.meta.env.DEV;

/**
 * Callback для Profiler который логирует в консоль (только в dev).
 *
 * @param {string} id - идентификатор профиля
 * @param {'mount'|'update'} phase
 * @param {number} actualDuration - реальное время рендера
 */
function onRenderCallback(id, phase, actualDuration) {
  if (!isDev) return;

  const color = actualDuration > 50 ? '🔴' : actualDuration > 20 ? '🟡' : '🟢';
  console.log(
    `%c${color} [Profiler] ${id}`,
    `color: ${actualDuration > 50 ? 'red' : actualDuration > 20 ? 'orange' : 'green'}`,
    `| ${phase} | ${actualDuration.toFixed(1)}ms`
  );
}

/**
 * Оборачивает компонент в Profiler для замера.
 *
 * @param {React.ComponentType} Component
 * @param {string} name
 * @returns {React.ComponentType}
 */
export function withProfiler(Component, name) {
  return function ProfiledComponent(props) {
    return (
      <Profiler id={name} onRender={onRenderCallback}>
        <Component {...props} />
      </Profiler>
    );
  };
}

/**
 * HOC для замера нескольких компонентов в дереве.
 *
 * @param {React.ReactNode} children
 * @param {string} id
 * @returns {JSX.Element}
 */
export function ProfileRegion({ children, id }) {
  if (!isDev) return children;

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

/**
 * Hook для ручного замера времени выполнения функции.
 *
 * @param {string} label
 * @returns {{ measure: (fn) => any }}
 */
export function usePerformanceMeter(label) {
  return {
    measure(fn) {
      if (!isDev) return fn();
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      console.log(`%c⏱️  [Meter] ${label}`, 'color: cyan', `${(end - start).toFixed(2)}ms`);
      return result;
    },
  };
}
