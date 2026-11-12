import React from 'react';
import { Share2, Check, Loader, KeyRound, Trash2, ExternalLink } from 'lucide-react';
import {
    SOCIAL_NETWORKS,
    normalizeSocialAccounts,
    getSocialTokenStatus,
    saveVkToken,
    disconnectVkToken,
    saveTelegramBot,
    disconnectTelegramBot,
} from '../lib/socialShare';

function getShortBadge(id) {
    switch (id) {
        case 'vk': return 'VK';
        case 'ok': return 'OK';
        case 'tg': return 'TG';
        case 'instagram': return 'IG';
        case 'whatsapp': return 'WA';
        default: return id.toUpperCase();
    }
}

export function SocialAccountsCard({ user, dispatch, toast }) {
    const [accounts, setAccounts] = React.useState(() => normalizeSocialAccounts(user));
    const [saving, setSaving] = React.useState(false);
    const [tokenStatus, setTokenStatus] = React.useState({
        vk: { hasToken: false, label: '' },
        tg: { hasToken: false, chatId: '', label: '' },
    });
    const [tokenLoading, setTokenLoading] = React.useState(false);

    // Поля ввода для API-подключений (никогда не предзаполняются секретами с сервера)
    const [vkTokenInput, setVkTokenInput] = React.useState('');
    const [tgBotTokenInput, setTgBotTokenInput] = React.useState('');
    const [tgChatIdInput, setTgChatIdInput] = React.useState('');
    const [apiBusy, setApiBusy] = React.useState('');

    React.useEffect(() => {
        setAccounts(normalizeSocialAccounts(user));
    }, [user]);

    React.useEffect(() => {
        let active = true;
        setTokenLoading(true);
        getSocialTokenStatus()
            .then(status => {
                if (!active || !status) return;
                setTokenStatus(status);
                if (status?.tg?.chatId) {
                    setTgChatIdInput(prev => prev || status.tg.chatId);
                }
            })
            .catch(() => {
                // Игнорируем в оффлайне или при отсутствии токена
            })
            .finally(() => {
                if (active) setTokenLoading(false);
            });
        return () => { active = false; };
    }, [user?.id]);

    const connectedCount = SOCIAL_NETWORKS.filter(n => accounts[n.id]?.enabled).length;

    const persistAccounts = async (nextAccounts, silent = false) => {
        setSaving(true);
        try {
            const updatedPassport = {
                ...(user?.passport_details || {}),
                tax_status: user?.tax_status || user?.passport_details?.tax_status || 'Самозанятый',
                social_accounts: nextAccounts,
            };
            const ok = await dispatch({
                type: 'UPDATE_PROFILE',
                profile: {
                    ...user,
                    id: user.id,
                    passport_details: updatedPassport,
                },
            });
            if (ok !== false && !silent) {
                toast?.success('Настройки соцсетей сохранены');
            }
        } catch {
            toast?.error('Не удалось сохранить настройки соцсетей');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (networkId) => {
        const next = {
            ...accounts,
            [networkId]: {
                ...accounts[networkId],
                enabled: !accounts[networkId]?.enabled,
            },
        };
        setAccounts(next);
        persistAccounts(next, true);
    };

    const handleFieldChange = (networkId, field, value) => {
        setAccounts(prev => ({
            ...prev,
            [networkId]: {
                ...prev[networkId],
                [field]: value,
            },
        }));
    };

    const handleModeChange = (networkId, mode) => {
        const next = {
            ...accounts,
            [networkId]: {
                ...accounts[networkId],
                publishMode: mode,
            },
        };
        setAccounts(next);
        persistAccounts(next, true);
    };

    const handleSaveVkToken = async () => {
        if (!vkTokenInput.trim()) {
            toast?.error('Вставьте токен доступа VK');
            return;
        }
        setApiBusy('vk');
        try {
            const res = await saveVkToken(vkTokenInput.trim());
            setTokenStatus(prev => ({
                ...prev,
                vk: { hasToken: true, label: res?.label || 'VK аккаунт' },
            }));
            setVkTokenInput('');
            handleModeChange('vk', 'api');
            toast?.success(`VK подключён (${res?.label || 'OK'})`);
        } catch (err) {
            toast?.error(err.message || 'Ошибка подключения VK');
        } finally {
            setApiBusy('');
        }
    };

    const handleDisconnectVk = async () => {
        setApiBusy('vk');
        try {
            await disconnectVkToken();
            setTokenStatus(prev => ({ ...prev, vk: { hasToken: false, label: '' } }));
            handleModeChange('vk', 'share');
            toast?.success('Токен VK отключён');
        } catch (err) {
            toast?.error(err.message || 'Ошибка отключения VK');
        } finally {
            setApiBusy('');
        }
    };

    const handleSaveTgBot = async () => {
        if (!tgBotTokenInput.trim() || !tgChatIdInput.trim()) {
            toast?.error('Укажите токен бота и Chat ID / @канал');
            return;
        }
        setApiBusy('tg');
        try {
            const res = await saveTelegramBot(tgBotTokenInput.trim(), tgChatIdInput.trim());
            setTokenStatus(prev => ({
                ...prev,
                tg: { hasToken: true, chatId: res?.chatId || tgChatIdInput.trim(), label: res?.label || 'Telegram бот' },
            }));
            setTgBotTokenInput('');
            handleModeChange('tg', 'api');
            toast?.success(`Telegram-бот подключён (${res?.label || 'OK'})`);
        } catch (err) {
            toast?.error(err.message || 'Ошибка подключения Telegram-бота');
        } finally {
            setApiBusy('');
        }
    };

    const handleDisconnectTg = async () => {
        setApiBusy('tg');
        try {
            await disconnectTelegramBot();
            setTokenStatus(prev => ({ ...prev, tg: { hasToken: false, chatId: '', label: '' } }));
            handleModeChange('tg', 'share');
            toast?.success('Telegram-бот отключён');
        } catch (err) {
            toast?.error(err.message || 'Ошибка отключения Telegram');
        } finally {
            setApiBusy('');
        }
    };

    const vkAppId = import.meta.env?.VITE_VK_APP_ID;
    const vkOAuthUrl = vkAppId
        ? `https://oauth.vk.com/authorize?client_id=${encodeURIComponent(vkAppId)}&display=popup&redirect_uri=https://oauth.vk.com/blank.html&scope=stories,photos,offline&response_type=token&v=5.199`
        : '';

    return (
        <div
            className="card"
            style={{
                padding: '24px',
                borderRadius: 28,
                border: 'none',
                boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'var(--bg-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Share2 size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <div className="font-oswald" style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                        Мои соцсети (для Сторис)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.75, fontWeight: 300 }}>
                        Подключённые площадки появятся в генераторе баннеров
                    </div>
                </div>
                <span
                    style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: connectedCount > 0 ? 'var(--success-light)' : 'var(--bg-light)',
                        color: connectedCount > 0 ? 'var(--success-hover)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {connectedCount} из {SOCIAL_NETWORKS.length}
                </span>
            </div>

            {/* Social list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SOCIAL_NETWORKS.map(net => {
                    const acc = accounts[net.id] || { enabled: false, handle: '', publishMode: 'share' };
                    const isVkApi = net.id === 'vk' && acc.publishMode === 'api';
                    const isTgApi = net.id === 'tg' && acc.publishMode === 'api';
                    const isTokenConnected =
                        (net.id === 'vk' && tokenStatus.vk?.hasToken) ||
                        (net.id === 'tg' && tokenStatus.tg?.hasToken);

                    return (
                        <div
                            key={net.id}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 16,
                                background: 'var(--bg-light)',
                                border: acc.enabled ? `1px solid ${net.color}33` : '1px solid transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                transition: 'all 0.15s',
                            }}
                        >
                            {/* Top row: badge + title + switch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 10,
                                        background: acc.enabled ? net.color : 'var(--surface)',
                                        color: acc.enabled ? '#ffffff' : net.color,
                                        border: acc.enabled ? 'none' : '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    {getShortBadge(net.id)}
                                </span>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                            {net.name}
                                        </span>
                                        {acc.enabled && isTokenConnected && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    padding: '2px 6px',
                                                    borderRadius: 6,
                                                    background: 'var(--success-light)',
                                                    color: 'var(--success-hover)',
                                                }}
                                            >
                                                API активен
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.8 }}>
                                        {net.storyLabel}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={acc.enabled}
                                    aria-label={`Подключить ${net.name}`}
                                    onClick={() => handleToggle(net.id)}
                                    style={{
                                        width: 44,
                                        height: 24,
                                        borderRadius: 999,
                                        border: 'none',
                                        padding: 2,
                                        cursor: 'pointer',
                                        background: acc.enabled ? net.color : 'var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: acc.enabled ? 'flex-end' : 'flex-start',
                                        transition: 'background 0.2s',
                                        flexShrink: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: '#ffffff',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }}
                                    />
                                </button>
                            </div>

                            {/* Expanded settings when enabled */}
                            {acc.enabled && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={acc.handle}
                                        onChange={e => handleFieldChange(net.id, 'handle', e.target.value)}
                                        placeholder={net.placeholder}
                                        style={{
                                            borderRadius: 10,
                                            height: 36,
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            fontSize: 12,
                                            padding: '0 10px',
                                        }}
                                    />

                                    {/* Mode selector for networks supporting server API */}
                                    {net.supportsApi && (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleModeChange(net.id, 'share')}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 8,
                                                    border: `1px solid ${acc.publishMode === 'share' ? net.color : 'var(--border)'}`,
                                                    background: acc.publishMode === 'share' ? net.bgLight : 'var(--surface)',
                                                    color: acc.publishMode === 'share' ? net.color : 'var(--text-secondary)',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Через приложение / Share
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleModeChange(net.id, 'api')}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 8,
                                                    border: `1px solid ${acc.publishMode === 'api' ? net.color : 'var(--border)'}`,
                                                    background: acc.publishMode === 'api' ? net.bgLight : 'var(--surface)',
                                                    color: acc.publishMode === 'api' ? net.color : 'var(--text-secondary)',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {net.id === 'vk' ? 'Автопостинг VK API' : 'Через Telegram-бота'}
                                            </button>
                                        </div>
                                    )}

                                    {/* VK API Token config */}
                                    {isVkApi && (
                                        <div
                                            style={{
                                                padding: 10,
                                                borderRadius: 12,
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                            }}
                                        >
                                            {tokenLoading ? (
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Проверка токена...</div>
                                            ) : tokenStatus.vk?.hasToken ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success-hover)' }}>
                                                        ✓ Подключено: {tokenStatus.vk.label || 'VK аккаунт'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleDisconnectVk}
                                                        disabled={apiBusy === 'vk'}
                                                        style={{
                                                            border: 'none',
                                                            background: 'var(--danger-light)',
                                                            color: 'var(--danger)',
                                                            borderRadius: 8,
                                                            padding: '4px 8px',
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Trash2 size={12} /> Отключить
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                        Вставьте токен VK с правами <code>stories</code> и <code>photos</code> для публикации прямо в Сторис.
                                                    </div>
                                                    {vkOAuthUrl && (
                                                        <a
                                                            href={vkOAuthUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                fontSize: 11,
                                                                color: net.color,
                                                                fontWeight: 600,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                textDecoration: 'none',
                                                            }}
                                                        >
                                                            <ExternalLink size={12} /> Получить токен через VK OAuth
                                                        </a>
                                                    )}
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <input
                                                            type="password"
                                                            className="form-input"
                                                            value={vkTokenInput}
                                                            onChange={e => setVkTokenInput(e.target.value)}
                                                            placeholder="vk1.a. ..."
                                                            style={{
                                                                flex: 1,
                                                                height: 34,
                                                                borderRadius: 8,
                                                                fontSize: 12,
                                                                padding: '0 8px',
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveVkToken}
                                                            disabled={apiBusy === 'vk'}
                                                            className="btn btn-primary"
                                                            style={{
                                                                height: 34,
                                                                borderRadius: 8,
                                                                padding: '0 12px',
                                                                fontSize: 11,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}
                                                        >
                                                            {apiBusy === 'vk' ? <Loader size={12} className="spin" /> : <KeyRound size={12} />}
                                                            Сохранить
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Telegram Bot API config */}
                                    {isTgApi && (
                                        <div
                                            style={{
                                                padding: 10,
                                                borderRadius: 12,
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                            }}
                                        >
                                            {tokenLoading ? (
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Проверка бота...</div>
                                            ) : tokenStatus.tg?.hasToken ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success-hover)' }}>
                                                        ✓ Бот {tokenStatus.tg.label} - {tokenStatus.tg.chatId}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleDisconnectTg}
                                                        disabled={apiBusy === 'tg'}
                                                        style={{
                                                            border: 'none',
                                                            background: 'var(--danger-light)',
                                                            color: 'var(--danger)',
                                                            borderRadius: 8,
                                                            padding: '4px 8px',
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Trash2 size={12} /> Отключить
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                        Укажите токен бота из @BotFather и Chat ID или @канал (бот отправит баннер в чат, откуда его можно выложить в Сторис).
                                                    </div>
                                                    <input
                                                        type="password"
                                                        className="form-input"
                                                        value={tgBotTokenInput}
                                                        onChange={e => setTgBotTokenInput(e.target.value)}
                                                        placeholder="Токен бота: 123456:ABC..."
                                                        style={{ height: 34, borderRadius: 8, fontSize: 12, padding: '0 8px' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={tgChatIdInput}
                                                            onChange={e => setTgChatIdInput(e.target.value)}
                                                            placeholder="Chat ID или @my_channel"
                                                            style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 12, padding: '0 8px' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveTgBot}
                                                            disabled={apiBusy === 'tg'}
                                                            className="btn btn-primary"
                                                            style={{
                                                                height: 34,
                                                                borderRadius: 8,
                                                                padding: '0 12px',
                                                                fontSize: 11,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}
                                                        >
                                                            {apiBusy === 'tg' ? <Loader size={12} className="spin" /> : <KeyRound size={12} />}
                                                            Сохранить
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save social handles button */}
            <button
                type="button"
                className="btn btn-primary btn-full card-clickable"
                disabled={saving}
                onClick={() => persistAccounts(accounts, false)}
                style={{
                    borderRadius: 14,
                    height: 44,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                }}
            >
                {saving ? <Loader size={14} className="spin" /> : <Check size={15} />}
                {saving ? 'Сохранение...' : 'Сохранить соцсети'}
            </button>
        </div>
    );
}
