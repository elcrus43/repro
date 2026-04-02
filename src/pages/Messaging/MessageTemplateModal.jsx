import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Loader2, ExternalLink } from 'lucide-react';
import { API_BASE as API_ROOT } from '../../config';

const API_BASE = `${API_ROOT}/api/v1/messaging`;

export function MessageTemplateModal({ isOpen, onClose, context }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState('');
    const [rendered, setRendered] = useState(null);
    const [rendering, setRendering] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    async function fetchTemplates() {
        try {
            const res = await fetch(`${API_BASE}/templates`);
            const data = await res.json();
            setTemplates(data);
            if (data.length > 0) setSelectedId(data[0].id);
        } catch (e) {
            console.error('Ошибка загрузки шаблонов', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleRender() {
        if (!selectedId) return;
        setRendering(true);
        try {
            const res = await fetch(`${API_BASE}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: selectedId,
                    context: context
                })
            });
            const data = await res.json();
            setRendered(data);
        } catch (_e) {
            alert('Ошибка при генерации сообщения');
        } finally {
            setRendering(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
            <div className="modal-content fade-up" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Отправить сообщение</h2>
                    <button onClick={onClose} className="btn-icon-only"><X /></button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" /></div>
                ) : (
                    <>
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
