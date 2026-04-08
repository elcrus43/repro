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

    useEffect(() => {
        let navigated = false;

        // 1. Слушаем событие PASSWORD_RECOVERY — Supabase сигнализирует,
        //    что пользователь пришёл по ссылке сброса пароля
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (navigated) return;

            if (event === 'PASSWORD_RECOVERY' && session?.user) {
                navigated = true;
                navigate('/update-password');
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                // Обычный вход (например, OAuth)
                navigated = true;
                navigate('/', { replace: true });
            }
        });

        // 2. Проверяем, есть ли уже сессия (хэш уже обработан)
        supabase.auth.getSession().then(({ data: { session }, error: err }) => {
            if (navigated) return;

            if (err) {
                setError('Ошибка: ' + err.message);
                return;
            }

            if (!session) {
                setError('Сессия не найдена. Ссылка может быть устаревшей.');
                return;
            }

            // Определяем тип по URL hash
            const hashParams = new URLSearchParams(window.location.hash.slice(1));
            const type = hashParams.get('type');

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
