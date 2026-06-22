import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatPhone, stripPhone } from '../../utils/format';
import { Pencil, Trash, Search, Plus, MapPin, Phone, User, Trash2, Building2, Calendar, Download } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { useToastContext } from '../../components/Toast';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const { toast } = useToastContext();
    const [search, setSearch] = useState('');

    const handleImportToProperties = async (item) => {
        if (!window.confirm('Импортировать этот объект подбора в активные объекты?')) return;
        
        try {
            const notes = [item.notes, item.link ? `Ссылка: ${item.link}` : null]
                .filter(Boolean).join('\n');

            const newProperty = {
                realtor_id: user?.id,
                client_id: item.client_id || null,
                client_ids: item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : []),
                status: 'meeting',
                address: item.address || '',
                price: item.price || 0,
                rooms: item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null,
                area_total: item.area_total !== undefined && item.area_total !== null ? Number(item.area_total) : null,
                floor: item.floor !== undefined && item.floor !== null ? Number(item.floor) : null,
                floors_total: item.floors_total !== undefined && item.floors_total !== null ? Number(item.floors_total) : null,
                property_type: item.property_type || null,
                city: item.city || '',
                images: item.images || [],
                notes: notes,
                description: `Импортировано из подбора. ${item.notes || ''}`,
                contact_name: item.contact_name || null,
                contact_phone: item.contact_phone || null,
            };

            await dispatch({ type: 'ADD_PROPERTY', property: newProperty });
            await dispatch({ type: 'DELETE_SELECTION_ITEM', id: item.id });
            
            toast.success('Объект успешно импортирован в активные!');
        } catch (err) {
            console.error('[Import Error]', err);
            toast.error('Не удалось импортировать объект: ' + err.message);
        }
    };

    const itemsByClient = useMemo(() => {
        const items = state.selectionItems || [];
        const filtered = items.filter(item => {
            if (!search) return true;
            const itemClientIds = item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : []);
            const matchingClients = state.clients.filter(c => itemClientIds.includes(c.id));
            const clientMatch = matchingClients.some(c => (c.full_name || '').toLowerCase().includes(search.toLowerCase()));
            return (item.address || '').toLowerCase().includes(search.toLowerCase()) ||
                clientMatch ||
                (item.contact_name || '').toLowerCase().includes(search.toLowerCase());
        });

        // Group by client_id
        const groups = {};
        filtered.forEach(item => {
            const itemClientIds = item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : ['unassigned']);
            itemClientIds.forEach(cId => {
                if (!groups[cId]) {
                    const client = state.clients.find(c => c.id === cId);
                    groups[cId] = {
                        clientName: client?.full_name || 'Без клиента',
                        items: []
                    };
                }
                if (!groups[cId].items.some(x => x.id === item.id)) {
                    groups[cId].items.push(item);
                }
            });
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
                                        display: 'flex', gap: 16, padding: '16px 60px 16px 16px', alignItems: 'center', 
                                        border: '1.5px solid rgba(59,130,246,0.12)', 
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                                        background: 'var(--surface)', borderRadius: 24,
                                        position: 'relative'
                                    }}>
                                        {/* ACTION BUTTONS (Absolutely Positioned Column on the right) */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            alignItems: 'flex-end',
                                            zIndex: 10
                                        }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button 
                                                    type="button"
                                                    className="icon-btn-import" 
                                                    onClick={() => handleImportToProperties(item)} 
                                                    title="Импортировать в мои объекты"
                                                >
                                                    <Download size={13} />
                                                </button>
                                                <button 
                                                    className="icon-btn-delete" 
                                                    onClick={() => handleDelete(item.id)} 
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            <button 
                                                className="icon-btn-edit" 
                                                onClick={() => navigate(`/selection/${item.id}/edit`)} 
                                                title="Редактировать"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button 
                                                type="button"
                                                className="icon-btn-calendar" 
                                                onClick={() => navigate(`/history/new?event_type=viewing&property_id=${item.id}&client_ids=${(item.client_ids || []).join(',')}`)} 
                                                title="Создать событие в календарь"
                                            >
                                                <Calendar size={13} />
                                            </button>
                                        </div>

                                        {/* CONTENT WRAPPER */}
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {/* Price and Price per sqm */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                                <span className="font-oswald" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
                                                    {item.price ? formatNumber(item.price) + ' ₽' : '—'}
                                                </span>
                                                {item.price && item.area_total ? (
                                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                        {formatNumber(Math.round(item.price / item.area_total))} ₽/м²
                                                    </span>
                                                ) : null}
                                            </div>

                                            {/* Address with MapPin */}
                                            <div style={{ 
                                                fontSize: 13, color: 'var(--text)',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                fontWeight: 450
                                            }}>
                                                <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                    {item.city ? (item.address ? `${item.city}, ${item.address}` : item.city) : (item.address || '—')}
                                                </span>
                                                {item.link && (
                                                    <a 
                                                        href={item.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        style={{ 
                                                            display: 'inline-flex', alignItems: 'center', gap: 4, 
                                                            fontSize: 11, color: 'var(--primary)', textDecoration: 'none',
                                                            background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10,
                                                            fontWeight: 500, flexShrink: 0
                                                        }}
                                                    >
                                                        Ссылка
                                                    </a>
                                                )}
                                            </div>

                                            {/* Tech details line */}
                                            {(() => {
                                                const parts = [];
                                                if (item.rooms !== undefined && item.rooms !== null) {
                                                    parts.push(item.rooms === 0 ? 'Студия' : `${item.rooms}к`);
                                                }
                                                if (item.area_total) {
                                                    parts.push(`${item.area_total} м²`);
                                                }
                                                if (item.floor || item.floors_total) {
                                                    if (item.floor && item.floors_total) {
                                                        parts.push(`${item.floor}/${item.floors_total} эт.`);
                                                    } else if (item.floor) {
                                                        parts.push(`${item.floor} эт.`);
                                                    } else {
                                                        parts.push(`/${item.floors_total} эт.`);
                                                    }
                                                }
                                                if (item.property_type) {
                                                    parts.push(PROPERTY_TYPES[item.property_type] || item.property_type);
                                                }
                                                if (parts.length === 0) return null;
                                                return (
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.85 }}>
                                                        {parts.join(' · ')}
                                                    </div>
                                                );
                                            })()}

                                            {/* Contact Info / Bottom row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    {item.contact_name && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            Контакт: <span style={{ color: 'var(--text)', fontWeight: 450 }}>{item.contact_name}</span>
                                                        </div>
                                                    )}
                                                    {item.contact_phone && (
                                                        <a href={`tel:+${stripPhone(item.contact_phone)}`} style={{ 
                                                            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' 
                                                        }}>
                                                            <Phone size={10} /> {formatPhone(item.contact_phone)}
                                                        </a>
                                                    )}
                                                </div>
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
