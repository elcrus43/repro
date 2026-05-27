import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

/**
 * useTaskNotifications
 *
 * Проверяет задачи и показы каждые 60 секунд.
 * Отправляет browser-уведомление если:
 *  - задача просрочена (due_date < now, status === 'pending')
 *  - показ начинается через ≤ 30 минут (status === 'planned')
 *
 * Каждое уведомление отправляется только один раз за сессию.
 */
export function useTaskNotifications() {
    const { state } = useApp();
    const user = state.currentUser;
    const notifiedRef = useRef(new Set());
    const permissionRef = useRef(false);

    // Запрашиваем разрешение один раз при появлении пользователя
    useEffect(() => {
        if (!user) return;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            permissionRef.current = true;
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                permissionRef.current = p === 'granted';
            });
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        function check() {
            if (!permissionRef.current) return;

            const now = Date.now();
            const SOON_MS = 30 * 60 * 1000; // 30 минут

            // --- Задачи ---
            (state.tasks || [])
                .filter(t =>
                    (t.realtor_id === user.id || user.role === 'admin') &&
                    t.status === 'pending' &&
                    t.due_date
                )
                .forEach(t => {
                    const due = new Date(t.due_date).getTime();
                    if (isNaN(due)) return;

                    const isOverdue = due < now;
                    const isSoon = !isOverdue && (due - now) <= SOON_MS;

                    const key = `task-${t.id}-${isOverdue ? 'overdue' : 'soon'}`;
                    if ((isOverdue || isSoon) && !notifiedRef.current.has(key)) {
                        notifiedRef.current.add(key);
                        const label = isOverdue ? '⚠️ Просрочена' : '⏰ Через 30 минут';
                        const n = new Notification(`${label}: ${t.title || 'Задача'}`, {
                            body: t.description || (isOverdue
                                ? 'Задача требует внимания'
                                : 'Не забудьте выполнить задачу'),
                            icon: '/icons/icon-192.png',
                            tag: key,
                        });
                        n.onclick = () => { window.focus(); n.close(); };
                    }
                });

            // --- Показы / события ---
            (state.showings || [])
                .filter(s =>
                    (s.realtor_id === user.id || user.role === 'admin') &&
                    s.status === 'planned' &&
                    s.showing_date
                )
                .forEach(s => {
                    const start = new Date(s.showing_date).getTime();
                    if (isNaN(start)) return;

                    const isSoon = (start - now) > 0 && (start - now) <= SOON_MS;
                    const key = `showing-${s.id}-soon`;

                    if (isSoon && !notifiedRef.current.has(key)) {
                        notifiedRef.current.add(key);
                        const prop = (state.properties || []).find(p => p.id === s.property_id);
                        const timeStr = new Date(s.showing_date).toLocaleTimeString('ru-RU', {
                            hour: '2-digit', minute: '2-digit'
                        });
                        const eventLabels = {
                            showing: 'Показ', meeting: 'Встреча', viewing: 'Просмотр',
                            deposit: 'Задаток', deal: 'Сделка', call: 'Звонок'
                        };
                        const label = eventLabels[s.event_type] || 'Событие';
                        const n = new Notification(`⏰ ${label} в ${timeStr}`, {
                            body: prop?.address || 'Проверьте детали в приложении',
                            icon: '/icons/icon-192.png',
                            tag: key,
                        });
                        n.onclick = () => { window.focus(); n.close(); };
                    }
                });
        }

        // Проверяем сразу и каждые 60 секунд
        check();
        const interval = setInterval(check, 60_000);
        return () => clearInterval(interval);

    }, [user, state.tasks, state.showings, state.properties]);
}
