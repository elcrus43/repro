import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatPhone, stripPhone } from '../../utils/format';
import { Pencil, Trash, Search, Plus, MapPin, Phone, User, Trash2 } from 'lucide-react';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const itemsByClient = useMemo(() => {
        const items = state.selectionItems || [];
        const filtered = items.filter(item => {
            if (!search) return true;
            const client = state.clients.find(c => c.id === item.client_id);
            return (item.address || '').toLowerCase().includes(search.toLowerCase()) ||
                (client?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
                (item.contact_name || '').toLowerCase().includes(search.toLowerCase());
        });

        // Group by client_id
        const groups = {};
        filtered.forEach(item => {
            const cId = item.client_id || 'unassigned';
            if (!groups[cId]) {
                const client = state.clients.find(c => c.id === cId);
                groups[cId] = {
                    clientName: client?.full_name || 'Без клиента',
                    items: []
                };
            }
            groups[cId].items.push(item);
        });

        return Object.entries(groups).map(([clientId, group]) => ({
            clientId,
            ...group
        }));
    }, [state.selectionItems, state.clients, search]);

    const handleDelete = (id) => {
        if (window.confirm('Вы действительно хотите удалить этот объект из подбора?')) {
            dispatch({ type: 'DELETE_SELECTION_ITEM', id });
        }
    };

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(20px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 300 }}>Подбор объектов</span>
                    <button className="card-clickable" onClick={() => navigate('/selection/new')} style={{ 
                        width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0, 82, 255, 0.2)'
                    }}>
                        <Plus size={24} />
                    </button>
                </div>

                <div className="search-bar" style={{ 
                    background: 'var(--bg-light)', borderRadius: 16, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12, border: 'none' 
                }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                        className="form-input" 
                        placeholder="Поиск по адресу, клиенту, контакту..." 
                        style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 300 }}
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {itemsByClient.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 0' }}>
                        <div style={{ width: 80, height: 80, background: 'var(--bg-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                            <Search size={32} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 300, marginBottom: 8 }}>Нет подобранных объектов</div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Создайте новый подбор или импортируйте через расширение</div>
                        <button className="btn btn-primary" onClick={() => navigate('/selection/new')}>Создать подбор</button>
                    </div>
                ) : (
                    itemsByClient.map(group => (
                        <div key={group.clientId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={16} /> {group.clientName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {group.items.map(item => (
                                    <div key={item.id} className="card" style={{ 
                                        padding: 20, borderRadius: 24, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'var(--surface)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                <MapPin size={18} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{item.address}</div>
                                                    {item.notes && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{item.notes}</div>}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 300, color: 'var(--primary)', fontFamily: "'Oswald', sans-serif" }}>
                                                {item.price ? formatNumber(item.price) + ' ₽' : '—'}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                {item.contact_name && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        Контакт: <span style={{ color: 'var(--text)', fontWeight: 450 }}>{item.contact_name}</span>
                                                    </div>
                                                )}
                                                {item.contact_phone && (
                                                    <a href={`tel:+${stripPhone(item.contact_phone)}`} style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary)', textDecoration: 'none' 
                                                    }}>
                                                        <Phone size={12} /> {formatPhone(item.contact_phone)}
                                                    </a>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="icon-btn-edit" onClick={() => navigate(`/selection/${item.id}/edit`)} title="Редактировать">
                                                    <Pencil size={15} />
                                                </button>
                                                <button className="icon-btn-delete" onClick={() => handleDelete(item.id)} title="Удалить" style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
