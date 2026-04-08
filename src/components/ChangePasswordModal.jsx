import React, { useState } from 'react';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Модальное окно для смены пароля.
 * Заменяет небезопасный window.prompt() на форму с <input type="password">.
 */
export function ChangePasswordModal({ isOpen, onClose, userEmail, onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Сброс состояния при открытии/закрытии
    React.useEffect(() => {
        if (isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswords(false);
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Валидация
        if (!currentPassword) {
            setError('Введите текущий пароль');
            return;
        }

        if (newPassword.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setLoading(true);

        try {
            // Supabase требует re-authentication перед сменой пароля
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            });

            if (signInErr) {
                setError('Неверный текущий пароль');
                setLoading(false);
                return;
            }

            const { error: updateErr } = await supabase.auth.updatePassword(newPassword);

            if (updateErr) {
                setError('Ошибка: ' + updateErr.message);
                setLoading(false);
                return;
            }

            onSuccess();
        } catch (err) {
            setError('Произошла непредвиденная ошибка');
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
        >
            <div
                style={{
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Смена пароля</h3>
                    </div>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        disabled={loading}
                        style={{ position: 'static' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px',
                            color: '#dc2626',
                            fontSize: '14px',
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                            Текущий пароль
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 40px 10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light, #e2e8f0)',
                                    fontSize: '14px',
                                }}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                            Новый пароль (мин. 6 символов)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 40px 10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light, #e2e8f0)',
                                    fontSize: '14px',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                            Подтвердите новый пароль
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-light, #e2e8f0)',
                                fontSize: '14px',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-light, #e2e8f0)',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: loading ? '#94a3b8' : 'var(--primary, #3b82f6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                            }}
                        >
                            {loading ? 'Сохранение...' : 'Изменить пароль'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
