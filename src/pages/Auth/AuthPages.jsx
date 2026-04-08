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
        try {
            if (mode === 'login') {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
            } else {
                const { error: err } = await supabase.auth.signUp({ email, password });
                if (err) throw err;
                setError('');
                setLoading(false);
                alert('Регистрация успешна! Проверьте email для подтверждения или войдите.');
                setMode('login');
                return;
            }
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', margin: '0 auto 8px', textAlign: 'center' }}>REM</div>
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
