import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../../components/Toast';
import { ChevronLeft, MessageSquare, Plus, Trash, Loader2, WifiOff, Layout, Tag, FileText } from 'lucide-react';
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
    const { toast } = useToastContext();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [offline, setOffline] = useState(false);
    const [newTpl, setNewTpl] = useState({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
            const res = await fetch(`${API_BASE}/templates`, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            // Merge: server templates + any local-only ones
            const local = lsLoad().filter(t => t._local);
            setTemplates([...data, ...local]);
            setOffline(false);
        } catch (_e) {
            clearTimeout(timer);
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
            toast.error('Заполните название и текст шаблона');
            return;
        }

        if (!offline) {
            const ctrl = new AbortController();
            const t2 = setTimeout(() => ctrl.abort(), 4000);
            try {
                const res = await fetch(`${API_BASE}/templates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTpl),
                    signal: ctrl.signal,
                });
                clearTimeout(t2);
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
            toast.error('Ошибка при удалении');
        }
    };

    const categoryLabel = { Common: 'Общее', Viewing: 'Показ', Offer: 'Предложение', Deal: 'Сделка' };

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid var(--border-light)', zIndex: 1000,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate(-1)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        Шаблоны сообщений
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Мессенджеры</span>
                </div>
                <button onClick={() => setShowNew(true)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)' }}>
                    <Plus size={24} />
                </button>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px' }}>
                {offline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 20 }}>
                        <WifiOff size={16} />
                        <span>Сервер недоступен — данные сохраняются локально</span>
                    </div>
                )}

                {showNew && (
                    <div className="card fade-in" style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 12px 48px rgba(0,82,255,0.08)', background: 'var(--surface)', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Layout size={20} />
                            </div>
                            <div className="font-oswald" style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: 'var(--text)' }}>Новый шаблон</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Название</label>
                                <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--surface)', border: '1.5px solid rgba(0,0,0,0.05)' }} value={newTpl.name} onChange={e => setNewTpl({ ...newTpl, name: e.target.value })} placeholder="Например: Приглашение на показ" autoFocus />
                            </div>

                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Категория</label>
                                <select className="form-select" style={{ height: 50, borderRadius: 14, background: 'var(--surface)', border: '1.5px solid rgba(0,0,0,0.05)' }} value={newTpl.category} onChange={e => setNewTpl({ ...newTpl, category: e.target.value })}>
                                    <option value="Common">Общее</option>
                                    <option value="Viewing">Показ</option>
                                    <option value="Offer">Предложение</option>
                                    <option value="Deal">Сделка</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Текст сообщения</label>
                                <textarea className="form-textarea" style={{ borderRadius: 16, background: 'var(--surface)', border: '1.5px solid rgba(0,0,0,0.05)', padding: 16 }} rows="5" value={newTpl.body} onChange={e => setNewTpl({ ...newTpl, body: e.target.value })} placeholder={`Здравствуйте, {{client_name}}!`} />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 600, opacity: 0.6 }}>
                                    Переменные: {'{{client_name}}'}, {'{{property_address}}'}, {'{{agent_name}}'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                <button className="card-clickable" style={{ flex: 1, height: 52, borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }} onClick={handleCreate}>Создать</button>
                                <button className="card-clickable" style={{ flex: 1, height: 52, borderRadius: 16, border: 'none', background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 14 }} onClick={() => { setShowNew(false); setNewTpl({ name: '', category: 'Common', body: '', channels: ['whatsapp'] }); }}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="spin" color="var(--primary)" /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {templates.length === 0 && !showNew && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                                <div style={{ width: 80, height: 80, borderRadius: 32, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.2, boxShadow: '0 8px 24px rgba(0,0,0,0.03)' }}>
                                    <MessageSquare size={40} />
                                </div>
                                <div>
                                    <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8 }}>Нет шаблонов</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 240, margin: '0 auto', fontWeight: 600, lineHeight: 1.5 }}>Создайте шаблоны для быстрой отправки сообщений клиентам</div>
                                </div>
                                <button className="card-clickable" style={{ height: 52, padding: '0 32px', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }} onClick={() => setShowNew(true)}>
                                    Создать первый шаблон
                                </button>
                            </div>
                        )}
                        {templates.map(t => (
                            <div key={t.id} className="card fade-in" style={{ padding: 24, borderRadius: 28, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.03)', background: 'var(--surface)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="font-oswald" style={{ fontWeight: 800, fontSize: 18, textTransform: 'uppercase', color: 'var(--text)' }}>{t.name}</div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                <Tag size={12} />
                                                {categoryLabel[t.category] || t.category}
                                            </div>
                                            {t._local && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                    <WifiOff size={12} />
                                                    Локальный
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button className="card-clickable" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleDelete(t)}>
                                        <Trash size={18} />
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-light)',
                                    padding: '16px',
                                    borderRadius: 16,
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace',
                                    border: '1px solid var(--border-light)',
                                    fontWeight: 500
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

