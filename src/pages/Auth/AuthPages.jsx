import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'yelchugin@gmail.com';

export function LoginPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (state.currentUser && state.currentUser.status === 'approved') {
            navigate('/');
        }
    }, [state.currentUser, navigate]);

    async function handleGoogleLogin() {
        setLoading(true);
        setError('');
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (err) {
                setError(err.message);
                setLoading(false);
            }
        } catch (e) {
            setError('Ошибка инициализации Google Auth: ' + e.message);
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', margin: '0 auto 8px', textAlign: 'center' }}>REM</div>
            </div>
            <div className="auth-card">
                <h2>Вход в систему</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                    Используйте ваш Google-аккаунт для входа или регистрации
                </p>

                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>{error}</div>}

                <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        padding: '14px',
                        fontSize: 16,
                        fontWeight: 600
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#fff" /><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#fff" opacity="0.8" /><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#fff" opacity="0.8" /><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#fff" opacity="0.8" /></svg>
                    Войти через Google
                </button>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    При первом входе будет автоматически создан <br /> запрос на регистрацию риэлтора.
                </div>
            </div>
        </div>
    );
}

export function RegisterPage() {
    const navigate = useNavigate();
    React.useEffect(() => { navigate('/login'); }, [navigate]);
    return null;
}
