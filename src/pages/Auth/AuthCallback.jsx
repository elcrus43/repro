import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Страница обрабатывает редирект от Supabase после:
 *  - сброса пароля (type=recovery)
 *  - подтверждения email (type=signup)
 *  - magic link (type=magiclink)
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function handleCallback() {
            // Проверяем URL параметры сначала
            const type = searchParams.get('type');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            console.log('[AuthCallback] URL params:', { type, error: errorParam });

            if (errorParam) {
                if (cancelled) return;
                setError(`Ошибка: ${errorDescription || errorParam}`);
                return;
            }

            // Для recovery — сразу перенаправляем, не дожидаясь сессии
            if (type === 'recovery') {
                console.log('[AuthCallback] Recovery flow, navigating to /update-password');
                if (!cancelled) {
                    navigate('/update-password');
                }
                return;
            }

            // Для остальных типов — ждём сессию
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (cancelled) return;

            if (sessionError) {
                setError('Ошибка: ' + sessionError.message);
                return;
            }

            if (session?.user) {
                navigate('/', { replace: true });
            } else {
                setError('Сессия не найдена. Ссылка может быть устаревшей.');
            }
        }

        handleCallback();

        return () => {
            cancelled = true;
        };
    }, [navigate, searchParams]);

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
