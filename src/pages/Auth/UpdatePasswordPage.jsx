import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Страница установки нового пароля после сброса.
 * Пользователь попадает сюда по ссылке из письма (через AuthCallback).
 */
export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Проверяем что сессия активна
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                setError('Сессия истекла. Запросите сброс пароля заново.');
                return;
            }

            // updateUser({ password }) — стандартный способ смены пароля
            const { error: err } = await supabase.auth.updateUser({ password });

            if (err) {
                setLoading(false);
                setError('Ошибка: ' + err.message);
                return;
            }

            setLoading(false);
            alert('Пароль успешно обновлён!');
            navigate('/login', { replace: true });
        } catch (e) {
            setLoading(false);
            setError('Неизвестная ошибка: ' + e.message);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', margin: '0 auto 8px', textAlign: 'center' }}>REM</div>
            </div>
            <div className="auth-card">
                <h2>Новый пароль</h2>

                {error && (
                    <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                        {error}
                    </div>
                )}

                <input
                    className="form-input"
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ marginBottom: 12 }}
                />
                <input
                    className="form-input"
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ marginBottom: 12 }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />

                <button
                    className="btn btn-primary btn-full"
                    onClick={handleSubmit}
                    disabled={loading || !password || !confirmPassword}
                >
                    {loading ? 'Сохранение...' : 'Сохранить пароль'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                        onClick={() => navigate('/login')}
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}
