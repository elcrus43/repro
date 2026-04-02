import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Plus, Send, Trash2, Loader2 } from 'lucide-react';
import { API_BASE as API_ROOT } from '../../config';

const API_BASE = `${API_ROOT}/api/v1/messaging`;

export function TemplatesPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newTpl, setNewTpl] = useState({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_BASE}/templates`);
            const data = await res.json();
            setTemplates(data);
        } catch (e) {
            console.error('Error fetching templates', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newTpl.name || !newTpl.body) return;
        try {
            await fetch(`${API_BASE}/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTpl)
            });
            setShowNew(false);
            setNewTpl({ name: '', category: 'Common', body: '', channels: ['whatsapp'] });
            fetchTemplates();
        } catch (_e) {
            alert('Ошибка при создании шаблона');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить шаблон?')) return;
        try {
            await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
            fetchTemplates();
        } catch (_e) {
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="page fade-in">
            <div className="header-nav">
                <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft /></button>
                <div className="header-title">Шаблоны сообщений</div>
                <button className="btn-icon" onClick={() => setShowNew(true)}><Plus /></button>
            </div>

            <div className="page-content">
                {showNew && (
                    <div className="card" style={{ marginBottom: 24, border: '1px solid var(--primary)' }}>
                        <h3>Новый шаблон</h3>
                        <div className="form-group">
                            <label>Название</label>
                            <input type="text" value={newTpl.name} onChange={e => setNewTpl({...newTpl, name: e.target.value})} placeholder="Название для списка" />
                        </div>
                        <div className="form-group">
                            <label>Категория</label>
                            <select value={newTpl.category} onChange={e => setNewTpl({...newTpl, category: e.target.value})}>
                                <option value="Common">Общее</option>
                                <option value="Viewing">Показ</option>
                                <option value="Offer">Предложение</option>
                                <option value="Deal">Сделка</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Текст сообщения</label>
                            <textarea rows="4" value={newTpl.body} onChange={e => setNewTpl({...newTpl, body: e.target.value})} placeholder="Здравствуйте, {{client_name}}..." />
                            <small style={{ color: 'var(--text-secondary)' }}>Используйте {'{{variable}}'} для подстановки данных</small>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate}>Создать</button>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNew(false)}>Отмена</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {templates.length === 0 && !showNew && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <div>Шаблонов не найдено</div>
                            </div>
                        )}
                        {templates.map(t => (
                            <div key={t.id} className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div className="badge badge-subtle" style={{ marginBottom: 6 }}>{t.category}</div>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-icon-only text-danger" onClick={() => handleDelete(t.id)}><Trash2 size={18} /></button>
                                        <button className="btn btn-icon-only"><Send size={18} /></button>
                                    </div>
                                </div>
                                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {t.body}
                                </p>
                                {t.variables?.length > 0 && (
                                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {t.variables.map(v => (
                                            <span key={v} style={{ fontSize: 10, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
