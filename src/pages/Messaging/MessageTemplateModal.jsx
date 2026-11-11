import React, { useState, useEffect } from 'react';
import { useToastContext } from '../../components/Toast';
import { X, Send, MessageSquare, Loader2, WifiOff } from 'lucide-react';
import {
    listMessageTemplates,
    renderMessageTemplate,
    renderMessageLocally,
    buildMessageLinks,
} from '../../lib/messaging';

const LS_KEY = 'rem_message_templates';

function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

export function MessageTemplateModal({ isOpen, onClose, context }) {
    const { toast } = useToastContext();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offline, setOffline] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [rendered, setRendered] = useState(null);
    const [rendering, setRendering] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    async function fetchTemplates() {
        setLoading(true);
        setRendered(null);
        try {
            const data = await listMessageTemplates();
            const local = lsLoad().filter(t => t._local);
            const list = [...data, ...local];
            setTemplates(list);
            setSelectedId(list[0]?.id || '');
            setOffline(false);
        } catch (e) {
            console.warn('[message-template] server unavailable, using local templates:', e.message);
            const local = lsLoad();
            setTemplates(local);
            setSelectedId(local[0]?.id || '');
            setOffline(true);
        } finally {
            setLoading(false);
        }
    }

    async function handleRender() {
        const template = templates.find(t => t.id === selectedId);
        if (!template) return;
        setRendering(true);
        try {
            if (template._local || offline) {
                const text = renderMessageLocally(template.body, context);
                setRendered(buildMessageLinks(text, context));
            } else {
                const data = await renderMessageTemplate(selectedId, context);
                setRendered(data);
            }
        } catch (e) {
            console.error('[message-template] render failed:', e);
            // Если сервер отвалился — пробуем локально по тексту шаблона
            if (template.body) {
                const text = renderMessageLocally(template.body, context);
                setRendered(buildMessageLinks(text, context));
            } else {
                toast.error('Ошибка при генерации сообщения');
            }
        } finally {
            setRendering(false);
        }
    }

    if (!isOpen) return null;

    const noTemplates = !loading && templates.length === 0;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', zIndex: 1000, padding: 16 }}>
            <div className="modal-content fade-up" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', borderRadius: 24, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Отправить сообщение</h2>
                    <button onClick={onClose} className="btn-icon-only"><X /></button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" /></div>
                ) : noTemplates ? (
                    <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                        <MessageSquare size={32} style={{ opacity: 0.25, marginBottom: 8 }} />
                        <div>Шаблоны сообщений не найдены.</div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                            Создайте шаблон в разделе «Шаблоны сообщений».
                        </div>
                    </div>
                ) : (
                    <>
                        {offline && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
                                <WifiOff size={14} />
                                Сервер недоступен — используется локальный шаблон
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Выберите шаблон</label>
                            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setRendered(null); }} className="form-input">
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {!rendered ? (
                            <button className="btn btn-primary btn-full shadow-primary" onClick={handleRender} disabled={rendering || !selectedId}>
                                {rendering ? <Loader2 className="spin" size={18} /> : 'Сгенерировать сообщение'}
                            </button>
                        ) : (
                            <div className="fade-in">
                                <div style={{ background: '#F3F4F6', padding: 12, borderRadius: 12, fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', marginBottom: 16, border: '1px solid #E5E7EB' }}>
                                    {rendered.text}
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <a href={rendered.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-full" style={{ background: '#25D366', color: 'white' }}>
                                        <MessageSquare size={18} style={{ marginRight: 8 }} /> WhatsApp
                                    </a>
                                    <a href={rendered.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-full" style={{ background: '#0088cc', color: 'white' }}>
                                        <Send size={18} style={{ marginRight: 8 }} /> Telegram
                                    </a>
                                </div>
                                <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={() => setRendered(null)}>Изменить шаблон</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
