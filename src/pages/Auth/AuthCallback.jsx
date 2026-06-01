import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authService } from '../../lib/auth';

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
    const [status, setStatus] = useState('Проверяем ссылку...');

    useEffect(() => {
        let cancelled = false;

        async function handleCallback() {
            const isFirebase = import.meta.env.VITE_BACKEND === 'firebase';
            if (isFirebase) {
                navigate('/', { replace: true });
                return;
            }

            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');
            const type = searchParams.get('type');
            // PKCE flow uses "code" param
            const code = searchParams.get('code');

            console.log('[AuthCallback] Params:', { type, code: !!code, error: errorParam });

            if (errorParam) {
                if (!cancelled) setError(`Ошибка: ${errorDescription || errorParam}`);
                return;
            }

            // PKCE / code-based flow (Supabase v2 default)
            if (code) {
                setStatus('Обмениваем код на сессию...');
                const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
                if (cancelled) return;
                if (exchangeErr) {
                    setError('Ошибка обмена кода: ' + exchangeErr.message);
                    return;
                }
                if (data?.session?.user) {
                    // Supabase помечает recovery сессии
                    const isRecovery = type === 'recovery';
                    if (isRecovery) {
                        navigate('/update-password', { replace: true });
                    } else {
                        navigate('/', { replace: true });
                    }
                }
                return;
            }

            // Legacy hash-based flow — ждём сессию через onAuthStateChange
            setStatus('Ожидаем сессию...');

            const { data: { session } } = await supabase.auth.getSession();
            if (cancelled) return;

            if (session) {
                if (type === 'recovery') {
                    navigate('/update-password', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
                return;
            }

            // Ждём событие от Supabase (hash flow)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
                if (cancelled) return;
                console.log('[AuthCallback] Auth event:', event);
                if (event === 'PASSWORD_RECOVERY') {
                    subscription.unsubscribe();
                    navigate('/update-password', { replace: true });
                } else if (sess) {
                    subscription.unsubscribe();
                    navigate('/', { replace: true });
                }
            });

            // Таймаут — если за 8 секунд сессия не появилась
            setTimeout(() => {
                if (cancelled) return;
                subscription.unsubscribe();
                setError('Ссылка устарела или уже использована. Запросите сброс пароля заново.');
            }, 8000);
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
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{status}</p>
                )}
            </div>
        </div>
    );
}
