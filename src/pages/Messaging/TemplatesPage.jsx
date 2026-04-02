import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Plus, Trash2, Loader2, WifiOff } from 'lucide-react';
import { API_BASE as API_ROOT } from '../../config';

const API_BASE = `${API_ROOT}/api/v1/messaging`;
const LS_KEY = 'rem_message_templates';

/* ─── localStorage fallback helpers ─────────────────────────────────────────── */
function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSave(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function TemplatesPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [offline, setOffline] = useState(false);
    const [newTpl, setNewTpl] = useState({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/templates`, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            // Merge: server templates + any local-only ones
            const local = lsLoad().filter(t => t._local);
            setTemplates([...data, ...local]);
            setOffline(false);
        } catch (_e) {
            // Backend недоступен — используем localStorage
            setTemplates(lsLoad());
            setOffline(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleCreate = async () => {
        if (!newTpl.name.trim() || !newTpl.body.trim()) {
            alert('Заполните название и текст шаблона');
            return;
        }

        if (!offline) {
            try {
                const res = await fetch(`${API_BASE}/templates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTpl),
                    signal: AbortSignal.timeout(4000),
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                setShowNew(false);
                setNewTpl({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });
                fetchTemplates();
                return;
            } catch (_e) {
                setOffline(true);
            }
        }

        // Сохраняем локально
        const local = lsLoad();
        const newEntry = { ...newTpl, id: `local_${Date.now()}`, _local: true };
        lsSave([...local, newEntry]);
        setTemplates(prev => [...prev, newEntry]);
        setShowNew(false);
        setNewTpl({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });
    };

    const handleDelete = async (tpl) => {
        if (!window.confirm('Удалить шаблон?')) return;

        if (tpl._local || offline) {
            const updated = lsLoad().filter(t => t.id !== tpl.id);
            lsSave(updated);
            setTemplates(prev => prev.filter(t => t.id !== tpl.id));
            return;
        }

        try {
            await fetch(`${API_BASE}/templates/${tpl.id}`, { method: 'DELETE' });
            fetchTemplates();
        } catch (_e) {
            alert('Ошибка при удалении');
        }
    };

    const categoryLabel = { Common: 'Общее', Viewing: 'Показ', Offer: 'Предложение', Deal: 'Сделка' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">Шаблоны сообщений</span>
                <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={() => setShowNew(true)}>
                    <Plus size={22} />
                </button>
            </div>

            <div className="page-content">
                {/* Offline banner */}
                {offline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--warning-light)', borderRadius: 10, border: '1px solid #fcd34d', fontSize: 13 }}>
                        <WifiOff size={16} color="#92400E" />
                        <span style={{ color: '#92400E' }}>Сервер недоступен — данные сохраняются локально</span>
                    </div>
                )}

                {/* New template form */}
                {showNew && (
                    <div className="card" style={{ border: '1px solid var(--primary)' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Новый шаблон</div>
                        <div className="form-group">
                            <label className="form-label">Название</label>
                            <input
                                className="form-input"
                                type="text"
                                value={newTpl.name}
                                onChange={e => setNewTpl({ ...newTpl, name: e.target.value })}
                                placeholder="Например: Приглашение на показ"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Категория</label>
                            <select className="form-select" value={newTpl.category} onChange={e => setNewTpl({ ...newTpl, category: e.target.value })}>
                                <option value="Common">Общее</option>
                                <option value="Viewing">Показ</option>
                                <option value="Offer">Предложение</option>
                                <option value="Deal">Сделка</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Текст сообщения</label>
                            <textarea
                                className="form-textarea"
                                rows="5"
                                value={newTpl.body}
                                onChange={e => setNewTpl({ ...newTpl, body: e.target.value })}
                                placeholder={`Здравствуйте, {{client_name}}!\n\nПриглашаем вас на просмотр квартиры по адресу {{property_address}}.\n\nС уважением, {{agent_name}}`}
                            />
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                Переменные: {'{{client_name}}'}, {'{{property_address}}'}, {'{{property_price}}'}, {'{{agent_name}}'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate}>Создать</button>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowNew(false); setNewTpl({ name: '', category: 'Common', body: '', channels: ['whatsapp'] }); }}>Отмена</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {templates.length === 0 && !showNew && (
                            <div className="empty-state">
                                <div className="empty-icon"><MessageSquare size={48} style={{ opacity: 0.2 }} /></div>
                                <div className="empty-title">Нет шаблонов</div>
                                <div className="empty-desc">Создайте шаблоны для быстрой отправки сообщений клиентам</div>
                                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowNew(true)}>
                                    <Plus size={16} /> Создать первый шаблон
                                </button>
                            </div>
                        )}
                        {templates.map(t => (
                            <div key={t.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                            <span className="badge badge-primary" style={{ fontSize: 11 }}>{categoryLabel[t.category] || t.category}</span>
                                            {t._local && <span className="badge badge-warning" style={{ fontSize: 11 }}>Локальный</span>}
                                        </div>
                                    </div>
                                    <button
                                        className="icon-btn"
                                        style={{ color: 'var(--text-muted)' }}
                                        onClick={() => handleDelete(t)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg)',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace',
                                }}>
                                    {t.body}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export for lazy loading
export { TemplatesPage as default };
