import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../components/Toast';

/**
 * Страница установки нового пароля после сброса.
 * Пользователь попадает сюда по ссылке из письма (через AuthCallback).
 */
export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionReady, setSessionReady] = useState(false);

    // Проверяем что сессия существует (recovery создаёт временную сессию)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session }, error: err }) => {
            if (err || !session) {
                setError('Сессия истекла. Запросите сброс пароля заново.');
            } else {
                setSessionReady(true);
            }
        });
    }, []);

    async function handleSubmit() {
        setLoading(true);
        setError('');

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        try {
            const { error: err } = await supabase.auth.updateUser({ password });

            if (err) {
                setError('Ошибка: ' + err.message);
                setLoading(false);
                return;
            }

            toast.success('Пароль успешно обновлён!');
            navigate('/login', { replace: true });
        } catch (e) {
            setError('Неизвестная ошибка: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', margin: '0 auto 8px', textAlign: 'center' }}>
                    <Building2 size={40} style={{ margin: '0 auto' }} />
                </div>
            </div>
            <div className="auth-card" style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 'var(--radius-lg)' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 24, marginBottom: 24 }}>Новый пароль</h2>

                {!sessionReady && !error ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Проверяем сессию...</p>
                ) : (
                    <>
                        {error && (
                            <div style={{ color: 'var(--danger)', fontSize: 13, background: 'var(--danger-light)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: 20, border: '1px solid var(--danger)' }}>
                                {error}
                                {error.includes('Сессия истекла') && (
                                    <div style={{ marginTop: 12 }}>
                                        <button className="btn btn-primary btn-full" style={{ height: 44, borderRadius: 'var(--radius)' }} onClick={() => navigate('/login')}>
                                            На страницу входа
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Новый пароль"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ height: 48, borderRadius: 'var(--radius)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Подтвердите пароль"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{ height: 48, borderRadius: 'var(--radius)' }}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            style={{ height: 52, borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700 }}
                            onClick={handleSubmit}
                            disabled={loading || !password || !confirmPassword || !sessionReady}
                        >
                            {loading ? 'Сохранение...' : 'Обновить пароль'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <button
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                                onClick={() => navigate('/login')}
                            >
                                Вернуться ко входу
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
