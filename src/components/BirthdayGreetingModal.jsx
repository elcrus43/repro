import React, { useState, useEffect } from 'react';
import {
    X,
    Sparkles,
    Copy,
    Check,
    RotateCw,
    Cake,
    Phone,
    Calendar,
    Share2,
    Send,
    Edit2
} from 'lucide-react';
import { useToastContext } from './Toast';
import { formatPhone, stripPhone } from '../utils/format';
import {
    GREETING_TONES,
    getBirthdayInfo,
    generateBirthdayGreeting,
    buildFallbackBirthdayGreeting
} from '../utils/birthdayGreetingGenerator';

export function BirthdayGreetingModal({
    isOpen,
    onClose,
    client,
    currentUser,
    onUpdateClient
}) {
    const { toast } = useToastContext();

    const initialAgentName = currentUser?.name || currentUser?.full_name || 'Ваш риелтор';
    const initialAgentPhone = currentUser?.phone || '';

    const [tone, setTone] = useState('warm');
    const [agentName, setAgentName] = useState(initialAgentName);
    const [agentPhone, setAgentPhone] = useState(initialAgentPhone);
    const [greetingText, setGreetingText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [source, setSource] = useState('template');
    const [copied, setCopied] = useState(false);

    // Быстрое редактирование/добавление даты рождения
    const rawBirthDate = client?.birth_date || client?.passport_details?.birth_date || '';
    const [inputBirthDate, setInputBirthDate] = useState(rawBirthDate);
    const [isEditingDate, setIsEditingDate] = useState(!rawBirthDate);

    const bInfo = getBirthdayInfo(client?.birth_date || client?.passport_details?.birth_date || inputBirthDate);

    // Синхронизация при открытии
    useEffect(() => {
        if (isOpen && client) {
            const currentBd = client.birth_date || client.passport_details?.birth_date || '';
            setInputBirthDate(currentBd);
            setIsEditingDate(!currentBd);

            const cName = currentUser?.name || currentUser?.full_name || 'Ваш риелтор';
            const cPhone = currentUser?.phone || '';
            setAgentName(cName);
            setAgentPhone(cPhone);

            // Начальная генерация
            const initialFallback = buildFallbackBirthdayGreeting({
                client,
                agentName: cName,
                agentPhone: cPhone,
                tone,
                companyName: 'Самолет Плюс Киров'
            });
            setGreetingText(initialFallback);
            setSource('template');
        }
    }, [isOpen, client?.id]);

    if (!isOpen || !client) return null;

    const handleGenerate = async (selectedTone = tone) => {
        setIsGenerating(true);
        try {
            const result = await generateBirthdayGreeting({
                client: {
                    ...client,
                    birth_date: inputBirthDate || client.birth_date
                },
                agentName,
                agentPhone,
                tone: selectedTone,
                companyName: 'Самолет Плюс Киров'
            });
            setGreetingText(result.text);
            setSource(result.source);
            if (result.source === 'ai') {
                toast.success('Поздравление создано с помощью ИИ');
            } else {
                toast.info('Сгенерирован шаблон Самолет Плюс');
            }
        } catch {
            const fallback = buildFallbackBirthdayGreeting({
                client: {
                    ...client,
                    birth_date: inputBirthDate || client.birth_date
                },
                agentName,
                agentPhone,
                tone: selectedTone,
                companyName: 'Самолет Плюс Киров'
            });
            setGreetingText(fallback);
            setSource('template');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleToneChange = (newTone) => {
        setTone(newTone);
        handleGenerate(newTone);
    };

    const handleCopy = async () => {
        if (!greetingText) return;
        try {
            await navigator.clipboard.writeText(greetingText);
            setCopied(true);
            toast.success('Текст поздравления скопирован');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Не удалось скопировать текст');
        }
    };

    const handleSendWhatsApp = () => {
        if (!client.phone) {
            toast.error('У клиента не указан номер телефона');
            return;
        }
        const clean = stripPhone(client.phone);
        const url = `https://wa.me/${clean}?text=${encodeURIComponent(greetingText)}`;
        window.open(url, '_blank');
        toast.success('Открываем WhatsApp с текстом поздравления');
    };

    const handleSendTelegram = () => {
        if (!client.phone) {
            toast.error('У клиента не указан номер телефона');
            return;
        }
        // Копируем текст для удобства пользователя и открываем диалог в Telegram
        navigator.clipboard?.writeText(greetingText);
        const clean = stripPhone(client.phone);
        const url = `https://t.me/+${clean}`;
        window.open(url, '_blank');
        toast.info('Текст скопирован! Открываем Telegram');
    };

    const handleSendSms = () => {
        if (!client.phone) {
            toast.error('У клиента не указан номер телефона');
            return;
        }
        const clean = stripPhone(client.phone);
        window.location.href = `sms:+${clean}?body=${encodeURIComponent(greetingText)}`;
    };

    const handleSaveDate = () => {
        if (!inputBirthDate) {
            toast.error('Выберите дату рождения');
            return;
        }
        if (onUpdateClient) {
            const updated = {
                ...client,
                birth_date: inputBirthDate,
                passport_details: {
                    ...(client.passport_details || {}),
                    birth_date: inputBirthDate
                }
            };
            onUpdateClient(updated);
            setIsEditingDate(false);
            toast.success('Дата рождения сохранена в профиле');
            // Перегенерируем текст с учетом новой даты
            handleGenerate(tone);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
        }}>
            <div
                className="card scale-in"
                style={{
                    background: 'var(--surface)',
                    borderRadius: 22,
                    maxWidth: 580,
                    width: '100%',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-light)',
                    overflow: 'hidden'
                }}
            >
                {/* ── Шапка модального окна ── */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(0, 82, 255, 0.04) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: '#fef3c7',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            flexShrink: 0,
                            border: '1px solid #fde68a'
                        }}>
                            🎂
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                                Поздравление с днем рождения
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                Самолет Плюс Киров &bull; {client.full_name || 'Клиент'}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="card-clickable"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: '1px solid var(--border-light)',
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Содержимое с прокруткой ── */}
                <div style={{
                    padding: '16px 20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    flex: 1
                }}>
                    {/* Плашка информации о клиенте и дате рождения */}
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: bInfo?.isToday
                            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                            : 'var(--bg-light)',
                        border: bInfo?.isToday ? '1.5px solid #f59e0b' : '1px solid var(--border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: bInfo?.isToday ? '#92400e' : 'var(--text)' }}>
                                    {client.full_name}
                                </span>
                                {client.phone && (
                                    <span style={{ fontSize: 11.5, color: bInfo?.isToday ? '#b45309' : 'var(--text-muted)' }}>
                                        {formatPhone(client.phone)}
                                    </span>
                                )}
                            </div>

                            {bInfo && (
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                    background: bInfo.isToday ? '#f59e0b' : (bInfo.isSoon ? '#fef3c7' : 'rgba(0, 82, 255, 0.08)'),
                                    color: bInfo.isToday ? '#fff' : (bInfo.isSoon ? '#d97706' : 'var(--primary)')
                                }}>
                                    {bInfo.isToday ? `🎉 Сегодня ${bInfo.ageFormatted}!` : (bInfo.isSoon ? `через ${bInfo.daysLeft} дн. (${bInfo.ageFormatted})` : `${bInfo.ageFormatted || ''}`)}
                                </span>
                            )}
                        </div>

                        {/* Дата рождения */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                            <Calendar size={13} color={bInfo?.isToday ? '#b45309' : 'var(--text-muted)'} />
                            {isEditingDate ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <input
                                        type="date"
                                        value={inputBirthDate}
                                        onChange={(e) => setInputBirthDate(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-light)',
                                            background: 'var(--surface)',
                                            fontSize: 12,
                                            color: 'var(--text)'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveDate}
                                        className="card-clickable"
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 8,
                                            background: 'var(--primary)',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Сохранить
                                    </button>
                                    {rawBirthDate && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingDate(false)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: 8,
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                border: 'none',
                                                fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Отмена
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: bInfo?.isToday ? '#92400e' : 'var(--text-secondary)' }}>
                                        {bInfo?.formattedDate || 'Не указана'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingDate(true)}
                                        title="Изменить дату рождения"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: bInfo?.isToday ? '#b45309' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: 2,
                                            display: 'inline-flex'
                                        }}
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Отправитель (Самолет Плюс Киров + Агент) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10
                    }}>
                        <div>
                            <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Компания
                            </label>
                            <input
                                type="text"
                                readOnly
                                value="Самолет Плюс Киров"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '7px 10px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--bg-light)',
                                    color: 'var(--text)',
                                    fontSize: 12.5,
                                    fontWeight: 600
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Агент (я)
                            </label>
                            <input
                                type="text"
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                placeholder="Имя риелтора"
                                style={{
                                    width: '100%',
                                    marginTop: 4,
                                    padding: '7px 10px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    fontSize: 12.5
                                }}
                            />
                        </div>
                    </div>

                    {/* Выбор стиля поздравления */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            Стиль поздравления:
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                            gap: 6
                        }}>
                            {GREETING_TONES.map(t => {
                                const isActive = tone === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleToneChange(t.id)}
                                        className="card-clickable"
                                        title={t.desc}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 12,
                                            border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                                            background: isActive ? 'rgba(0, 82, 255, 0.08)' : 'var(--surface)',
                                            color: isActive ? 'var(--primary)' : 'var(--text)',
                                            fontSize: 12,
                                            fontWeight: isActive ? 700 : 500,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Текстовое поле поздравления */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>
                                    Текст поздравления
                                </span>
                                <span style={{
                                    fontSize: 9.5,
                                    padding: '1px 6px',
                                    borderRadius: 6,
                                    background: source === 'ai' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-light)',
                                    color: source === 'ai' ? '#059669' : 'var(--text-muted)',
                                    fontWeight: 600
                                }}>
                                    {source === 'ai' ? 'ИИ генерация' : 'Шаблон Самолет Плюс'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleGenerate(tone)}
                                disabled={isGenerating}
                                className="card-clickable"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--primary)',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: isGenerating ? 'wait' : 'pointer'
                                }}
                            >
                                <Sparkles size={13} />
                                {isGenerating ? 'Генерируем...' : 'Сгенерировать с ИИ'}
                            </button>
                        </div>

                        <textarea
                            value={greetingText}
                            onChange={(e) => setGreetingText(e.target.value)}
                            rows={7}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: 14,
                                border: '1px solid var(--border-light)',
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                fontSize: 13,
                                lineHeight: 1.55,
                                resize: 'vertical',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            placeholder="Текст поздравления..."
                        />
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: 3 }}>
                            {greetingText.length} симв.
                        </div>
                    </div>
                </div>

                {/* ── Нижняя панель действий ── */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--border-light)',
                    background: 'var(--bg-light)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* Скопировать */}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="card-clickable"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                border: '1px solid var(--border-light)',
                                background: copied ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
                                color: copied ? '#059669' : 'var(--text)',
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Скопировано!' : 'Скопировать'}
                        </button>

                        {/* WhatsApp */}
                        <button
                            type="button"
                            onClick={handleSendWhatsApp}
                            className="card-clickable"
                            title="Открыть чат в WhatsApp с предзаполненным поздравлением"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                background: 'rgba(34, 197, 94, 0.12)',
                                color: '#15803d',
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            WhatsApp
                        </button>

                        {/* Telegram */}
                        <button
                            type="button"
                            onClick={handleSendTelegram}
                            className="card-clickable"
                            title="Скопировать текст и открыть Telegram"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 12,
                                border: '1px solid rgba(2, 132, 199, 0.3)',
                                background: 'rgba(2, 132, 199, 0.10)',
                                color: '#0284c7',
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
                            </svg>
                            Telegram
                        </button>

                        {/* SMS */}
                        <button
                            type="button"
                            onClick={handleSendSms}
                            className="card-clickable"
                            title="Отправить SMS"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '8px 12px',
                                borderRadius: 12,
                                border: '1px solid var(--border-light)',
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Phone size={13} />
                            SMS
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="card-clickable"
                        style={{
                            padding: '8px 16px',
                            borderRadius: 12,
                            border: '1px solid var(--border-light)',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            fontSize: 12.5,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
