import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function useMatchNotifications() {
    const { state } = useApp();
    const user = state.currentUser;
    // Keep track of the matches we have already notified about in this session
    const notifiedMatchesRef = useRef(new Set());
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (!user) return;

        // Request permission on mount
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, [user]);

    useEffect(() => {
        if (!user || !state.matches || state.matches.length === 0) return;

        // Skip firing notifications on the very first load or refresh to avoid spamming the user
        // with old matches that they simply haven't viewed yet.
        if (isFirstRender.current) {
            state.matches.forEach(m => notifiedMatchesRef.current.add(m.id));
            isFirstRender.current = false;
            return;
        }

        // Check for new matches belonging to the current user
        const newMatches = state.matches.filter(m =>
            m.realtor_id === user.id &&
            m.status === 'new' &&
            !notifiedMatchesRef.current.has(m.id)
        );

        if (newMatches.length > 0) {
            if ('Notification' in window && Notification.permission === 'granted') {
                newMatches.forEach(match => {
                    const req = state.requests.find(r => r.id === match.request_id);
                    const prop = state.properties.find(p => p.id === match.property_id);

                    let body = `Обнаружено совпадение! (${match.score}%)`;
                    if (req && prop) {
                        body = `Запрос клиента и объект по адресу ${prop.address} совпали на ${match.score}%.`;
                    }

                    const n = new Notification('Realtor Match', {
                        body: body,
                        icon: '/vite.svg', // Assuming standard Vite icon or you can place a logo in public/
                    });

                    n.onclick = () => {
                        window.focus();
                        // We would ideally navigate inside the app, but window focus is a good start from a system push.
                        n.close();
                    };

                    notifiedMatchesRef.current.add(match.id);
                });
            } else {
                // Fallback silent tracking even if permission denied
                newMatches.forEach(m => notifiedMatchesRef.current.add(m.id));
            }
        }

    }, [state.matches, user, state.requests, state.properties]);
}
