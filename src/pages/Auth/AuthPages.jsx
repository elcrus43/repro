import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { DEMO_USER, DEMO_CLIENTS, DEMO_PROPERTIES, DEMO_TASKS, DEMO_SHOWINGS } from '../../data/seed';

export function LoginPage() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const context = useContext(AppContext);

    async function handleDemoLogin() {
        setLoading(true);
        setError('');
        try {
            // Demo mode - load seed data
            const demoUser = { ...DEMO_USER, status: 'approved' };
            context.dispatch({ type: 'SET_USER', user: demoUser });
            context.dispatch({
                type: 'SET_ALL',
                data: {
                    clients: DEMO_CLIENTS,
                    properties: DEMO_PROPERTIES,
                    requests: [],
                    tasks: DEMO_TASKS,
                    showings: DEMO_SHOWINGS,
                    matches: []
                }
            });
            navigate('/');
        } catch (e) {
            setError('Ошибка демо-входа: ' + e.message);
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
                    Демо-режим для локальной разработки
                </p>

                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>{error}</div>}

                <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '14px',
                        fontSize: 16,
                        fontWeight: 600
                    }}
                >
                    Войти как демо-риэлтор
                </button>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Будут загружены тестовые данные:<br />
                    5 клиентов, 2 объекта, 2 задачи, 1 показ
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
