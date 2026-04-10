import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Страница обрабатывает редирект от Supabase после:
 *  - сброса пароля (type=recovery)
 *  - подтверждения email (type=signup)
 *  - magic link (type=magiclink)
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [debug, setDebug] = useState('');

    useEffect(() => {
        let navigated = false;

        // Определяем тип по URL hash - делаем это ПЕРВЫМ
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const type = hashParams.get('type');
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        console.log('[AuthCallback] URL params:', { type, error: errorParam, hash: window.location.hash });

        if (errorParam) {
            setDebug(`Ошибка: ${errorDescription || errorParam}`);
            return;
        }

        // 1. Слушаем событие PASSWORD_RECOVERY
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (navigated) return;

            console.log('[AuthCallback] Auth event:', event, session);

            if (event === 'PASSWORD_RECOVERY' && session?.user) {
                navigated = true;
                console.log('[AuthCallback] Navigating to /update-password');
                navigate('/update-password');
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                navigated = true;
                navigate('/', { replace: true });
            }
        });

        // 2. Проверяем, есть ли уже сессия
        supabase.auth.getSession().then(({ data: { session }, error: err }) => {
            if (navigated) return;

            console.log('[AuthCallback] Session check:', { session, error: err });

            if (err) {
                setDebug('Ошибка: ' + err.message);
                return;
            }

            if (!session) {
                // Сессия ещё не создана - ждём событие
                setDebug('Ожидание сессии...');
                // Авто-переход на recovery если type=recovery
                if (type === 'recovery') {
                    setDebug('Обнаружен тип recovery, перенаправляю...');
                    navigated = true;
                    setTimeout(() => navigate('/update-password'), 500);
                }
                return;
            }

            navigated = true;
            if (type === 'recovery') {
                navigate('/update-password');
            } else {
                navigate('/', { replace: true });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Обработка...</h2>
                {debug && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, background: 'var(--bg)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                        {debug}
                    </div>
                )}
                {error ? (
                    <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                        {error}
                        <div style={{ marginTop: 12 }}>
                            <button
                                className="btn btn-primary btn-full"
                                onClick={() => navigate('/login')}
                            >
                                На страницу входа
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Проверяем ссылку...</p>
                )}
            </div>
        </div>
    );
}
