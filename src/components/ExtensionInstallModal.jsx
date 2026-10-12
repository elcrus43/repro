import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Puzzle, Chrome, ShieldAlert, Sparkles } from 'lucide-react';

export function ExtensionInstallModal({ isOpen, onClose }) {
    const [copiedPath, setCopiedPath] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    if (!isOpen) return null;

    const extensionPath = 'D:\\CODING\\realtor-match\\extension';

    const handleCopyPath = () => {
        navigator.clipboard.writeText(extensionPath);
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2500);
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText('chrome://extensions/');
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
                backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #1e293b)',
                    borderRadius: '20px',
                    padding: '28px',
                    maxWidth: '560px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
                    position: 'relative',
                    border: '1px solid var(--border-light, #e2e8f0)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: 38, 
                            height: 38, 
                            borderRadius: '12px', 
                            background: 'rgba(37, 99, 235, 0.1)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--primary, #2563eb)'
                        }}>
                            <Puzzle size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                                Расширение Chrome для импорта
                            </h3>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                Автоматический сбор данных с Авито и ЦИАН
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--text-secondary, #64748b)',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Notice why extension is needed */}
                <div
                    style={{
                        background: 'rgba(37, 99, 235, 0.05)',
                        border: '1px solid rgba(37, 99, 235, 0.15)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'var(--text, #1e293b)',
                    }}
                >
                    <strong>Почему нужен импорт через расширение:</strong> Сайты Авито и ЦИАН защищены от автоматических сетевых запросов (CORS, антибот-защита). Расширение работает внутри вашей вкладки браузера и считывает параметры в один клик.
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13.5px' }}>
                    
                    {/* Step 1 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            1
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                Откройте страницу расширений в Chrome
                            </div>
                            <div style={{ color: 'var(--text-secondary, #64748b)', marginBottom: 6 }}>
                                Вставьте в адресную строку браузера:
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <code style={{ 
                                    background: 'var(--bg-light, #f1f5f9)', 
                                    padding: '5px 10px', 
                                    borderRadius: 6, 
                                    fontSize: 12, 
                                    fontFamily: 'monospace' 
                                }}>
                                    chrome://extensions/
                                </code>
                                <button
                                    type="button"
                                    onClick={handleCopyUrl}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border-light, #cbd5e1)',
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                >
                                    {copiedUrl ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                    {copiedUrl ? 'Скопировано' : 'Копировать'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            2
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                Включите «Режим разработчика»
                            </div>
                            <div style={{ color: 'var(--text-secondary, #64748b)' }}>
                                Переключатель <strong>«Режим разработчика»</strong> находится в верхнем правом углу страницы <code>chrome://extensions/</code>.
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            3
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                Загрузите папку расширения
                            </div>
                            <div style={{ color: 'var(--text-secondary, #64748b)', marginBottom: 6 }}>
                                Нажмите кнопку <strong>«Загрузить распакованное расширение»</strong> (Load unpacked) в верхнем левом углу и укажите путь:
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                gap: 6, 
                                alignItems: 'center', 
                                background: 'var(--bg-light, #f8fafc)', 
                                border: '1px solid var(--border-light, #e2e8f0)',
                                borderRadius: 8,
                                padding: '6px 10px'
                            }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, flex: 1, wordBreak: 'break-all' }}>
                                    {extensionPath}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyPath}
                                    style={{
                                        background: copiedPath ? '#16a34a' : 'var(--primary, #2563eb)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '5px 10px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        flexShrink: 0
                                    }}
                                >
                                    {copiedPath ? <Check size={13} /> : <Copy size={13} />}
                                    {copiedPath ? 'Скопировано!' : 'Скопировать'}
                                </button>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                                * Если расширение уже было установлено ранее, но отключилось — просто включите его тумблер или нажмите значок обновления 🔄.
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            4
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                Закрепите иконку расширения в панели Chrome
                            </div>
                            <div style={{ color: 'var(--text-secondary, #64748b)' }}>
                                Нажмите на значок пазла 🧩 в правом верхнем углу Chrome, найдите <strong>Realtor-Match Importer</strong> и нажмите значок булавки 📌.
                            </div>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#16a34a',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            ✓
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2, color: '#16a34a' }}>
                                Готово! Как импортировать:
                            </div>
                            <div style={{ color: 'var(--text-secondary, #64748b)' }}>
                                Откройте объявление на <strong>Авито</strong> или <strong>ЦИАН</strong> → Нажмите иконку расширения → Нажмите <strong>«Импортировать в Объекты»</strong>. Форма откроется с уже заполненными данными и фотографиями!
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Понятно, закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
