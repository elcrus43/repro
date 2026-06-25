import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Страница заглушка для обратного вызова авторизации.
 * Перенаправляет пользователя на главную страницу, так как Supabase удален.
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/', { replace: true });
    }, [navigate]);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Перенаправление...</h2>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Пожалуйста, подождите...</p>
            </div>
        </div>
    );
}
