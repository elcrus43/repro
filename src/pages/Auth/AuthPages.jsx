import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'yelchugin@gmail.com';

export function LoginPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    React.useEffect(() => {
        if (state.currentUser && state.currentUser.status === 'approved') {
            navigate('/');
        }
    }, [state.currentUser, navigate]);

    async function handleEmailAuth() {
        setLoading(true);
        setError('');

        async function tryAuth() {
            if (mode === 'login') {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
            } else {
                const { error: err } = await supabase.auth.signUp({ email, password });
                if (err) throw err;
                setLoading(false);
                alert('Регистрация успешна! Проверьте email для подтверждения или войдите.');
                setMode('login');
            }
        }

        try {
            await tryAuth();
        } catch (e) {
            const isNetwork = e.message === 'Failed to fetch' || e.message?.includes('fetch') || e.message?.includes('network');
            if (isNetwork) {
                // Один автоматический повтор через 1.5 сек при сетевой ошибке
                try {
                    await new Promise(r => setTimeout(r, 1500));
                    await tryAuth();
                } catch (e2) {
                    const isNetwork2 = e2.message === 'Failed to fetch' || e2.message?.includes('fetch') || e2.message?.includes('network');
                    setError(isNetwork2
                        ? 'Нет соединения с сервером. Проверьте подключение к интернету и попробуйте снова.'
                        : e2.message === 'Invalid login credentials'
                            ? 'Неверный email или пароль'
                            : e2.message
                    );
                }
            } else {
                setError(e.message === 'Invalid login credentials'
                    ? 'Неверный email или пароль'
                    : e.message
                );
            }
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: 'var(--primary)', margin: '0 auto 8px', textAlign: 'center' }}>
                    <Building2 size={40} style={{ margin: '0 auto' }} />
                </div>
            </div>
            <div className="auth-card">
                <h2>{mode === 'login' ? 'Вход в систему' : 'Регистрация'}</h2>

                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>{error}</div>}

                {/* Email/Password form */}
                <div style={{ marginBottom: 20 }}>
                    <input
                        className="form-input"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ marginBottom: 12 }}
                    />
                    <input
                        className="form-input"
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ marginBottom: 12 }}
                        onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                    />
                    <button
                        className="btn btn-primary btn-full"
                        onClick={handleEmailAuth}
                        disabled={loading || !email || !password}
                    >
                        {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        {mode === 'login' ? (
                            <>
                                <button
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}
                                    onClick={() => { setMode('register'); setError(''); }}
                                >
                                    Нет аккаунта? Регистрация
                                </button>
                                <div style={{ marginTop: 6 }}>
                                    <button
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                                        onClick={async () => {
                                            if (!email) { setError('Введите email для сброса пароля'); return; }
                                            setLoading(true);
                                            const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                                                redirectTo: `${window.location.origin}/auth/callback`,
                                            });
                                            setLoading(false);
                                            if (err) setError(err.message);
                                            else alert('Ссылка для сброса пароля отправлена на ' + email);
                                        }}
                                    >
                                        Забыли пароль?
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}
                                onClick={() => { setMode('login'); setError(''); }}
                            >
                                Уже есть аккаунт? Войти
                            </button>
                        )}
                    </div>
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
