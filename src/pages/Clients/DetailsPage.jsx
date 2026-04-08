import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, stripPhone, formatNumber } from '../../utils/format';
import { Edit2, Trash2 } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';

export function DetailsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const client = state.clients.find(c => c.id === id);

    if (!client) return (
        <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/clients')}>←</button><span className="topbar-title">Клиент не найден</span></div></div>
    );

    const myProperties = state.properties.filter(p => p.client_id === id);
    const myPropertyIds = myProperties.map(p => p.id);
    const myRequests = state.requests.filter(r => r.client_id === id);
    const propMatches = state.matches.filter(m => state.properties.find(p => p.id === m.property_id && p.client_id === id));
    const reqMatches = state.matches.filter(m => state.requests.find(r => r.id === m.request_id && r.client_id === id));
    const allMatches = [...new Map([...propMatches, ...reqMatches].map(m => [m.id, m])).values()];
    const myShowings = state.showings.filter(s => s.client_id === id || myPropertyIds.includes(s.property_id));
    const myTasks = state.tasks.filter(t => t.client_id === id);
    const totalCommission = [...myProperties, ...myRequests].reduce((sum, item) => sum + (item.commission || 0), 0);

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', landlord: 'Арендодатель', tenant: 'Арендатор' };

    function handleDelete() {
        if (window.confirm(`Удалить клиента ${client.full_name}?`)) {
            dispatch({ type: 'DELETE_CLIENT', id });
            navigate('/clients');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/clients')}>←</button>
                <span className="topbar-title">Клиент</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/clients/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Header */}
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{client.full_name}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        {client.client_types?.map(t => (
                            <span key={t} className="badge badge-primary">{typeLabels[t]}</span>
                        ))}
                        <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>{statusLabels[client.status]}</span>
                    </div>
                </div>

                {/* Finance Stats */}
                <div className="card" style={{ background: 'var(--success-light)', borderColor: 'var(--success-light)' }}>
                    <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Финансовые показатели</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{formatNumber(totalCommission)} ₽</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Общий потенциал комиссии</div>
                        </div>
                    </div>
                    {totalCommission > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {myProperties.filter(p => p.commission > 0).map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Объект: {p.address || p.city}</span>
                                    <span style={{ fontWeight: 600 }}>{formatNumber(p.commission)} ₽</span>
                                </div>
                            ))}
                            {myRequests.filter(r => r.commission > 0).map(r => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Покупка: {r.property_types?.map(t => PROPERTY_TYPES[t] || t).join('/')}</span>
                                    <span style={{ fontWeight: 600 }}>{formatNumber(r.commission)} ₽</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contacts */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>Контакты</div>
                    {(client.phones || [client.phone]).filter(Boolean).map((p, idx) => (
                        <div key={idx} className="info-row">
                            <span className="info-key">{idx === 0 ? 'Телефон' : `Телефон ${idx + 1}`}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <a href={`tel:${p}`} className="info-val" style={{ color: '#2563EB', fontWeight: 700 }}>{formatPhone(p)}</a>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <a href={`https://wa.me/${stripPhone(p)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#25D366', padding: 4 }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </a>
                                    <a href={`https://t.me/+${stripPhone(p)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#0088cc', padding: 4 }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                    {client.email && (
                        <div className="info-row">
                            <span className="info-key">Email</span>
                            <span className="info-val">{client.email}</span>
                        </div>
                    )}

                    {client.additional_contacts?.map((contact, idx) => (
                        <React.Fragment key={idx}>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Доп. контакт</div>
                                <div style={{ fontWeight: 600 }}>{contact.name || 'Без имени'}</div>
                            </div>
                            {contact.phone && (
                                <div className="info-row">
                                    <span className="info-key">Телефон</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <a href={`tel:${contact.phone}`} className="info-val" style={{ color: '#2563EB', fontWeight: 600 }}>{formatPhone(contact.phone)}</a>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <a href={`https://wa.me/${stripPhone(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#25D366', padding: 4 }}>
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                            </a>
                                            <a href={`https://t.me/+${stripPhone(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#0088cc', padding: 4 }}>
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {contact.email && (
                                <div className="info-row">
                                    <span className="info-key">Email</span>
                                    <span className="info-val">{contact.email}</span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                    <div className="info-row">
                        <span className="info-key">Источник</span>
                        <span className="info-val">{client.source || '—'}</span>
                    </div>
                    <div className="info-row" style={{ borderBottom: 'none' }}>
                        <span className="info-key">Добавлен</span>
                        <span className="info-val">{new Date(client.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>

                {/* Finance Stats (Duplicate in original, removed duplication) */}

                {/* Requests */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Покупки ({myRequests.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/requests/new?client=${id}`)} style={{ color: 'var(--primary)', padding: '2px 8px', fontSize: 20 }}>+</button>
                    </div>
                    {myRequests.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Запросов еще не было</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {myRequests.map(r => (
                                <div key={r.id} onClick={() => navigate(`/requests/${r.id}`)} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{r.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ')}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{formatNumber(r.budget_max)} ₽</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Районы: {r.districts?.join(', ') || '—'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Properties */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Объекты ({myProperties.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/properties/new?client=${id}`)} style={{ color: 'var(--primary)', padding: '2px 8px', fontSize: 20 }}>+</button>
                    </div>
                    {myProperties.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Объектов еще не было</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {myProperties.map(p => (
                                <div key={p.id} onClick={() => navigate(`/properties/${p.id}`)} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{PROPERTY_TYPES[p.property_type] || p.property_type}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{formatNumber(p.price)} ₽</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.address || p.city || '—'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Matches */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Совпадения ({allMatches.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/matches?client=${id}`)} style={{ color: 'var(--primary)', padding: '2px 8px', fontSize: 20 }}>+</button>
                    </div>
                    {allMatches.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Совпадений пока нет</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {allMatches.slice(0, 3).map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                return (
                                    <div key={m.id} onClick={() => navigate(`/matches/${m.id}`)} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{prop?.address || 'Объект'}</span>
                                            <span className="badge badge-primary" style={{ fontSize: 10 }}>{Math.round(m.score * 100)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {allMatches.length > 3 && (
                                <button className="btn btn-link btn-sm" onClick={() => navigate(`/matches?client=${id}`)} style={{ marginTop: 8 }}>Смотреть все ({allMatches.length})</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Notes */}
                {client.notes && (
                    <div className="card" style={{ padding: '16px' }}>
                        <div className="section-title" style={{ marginBottom: 6 }}>Заметки</div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{client.notes}</p>
                    </div>
                )}

                {/* Passport Details */}
                {client.passport_details && (client.passport_details.series || client.passport_details.number) && (
                    <div className="card" style={{ marginTop: 12 }}>
                        <div className="section-title" style={{ marginBottom: 8 }}>Паспортные данные</div>
                        <div className="info-grid">
                            {client.passport_details.birth_date && (
                                <div className="info-row">
                                    <span className="info-key">Дата рождения</span>
                                    <span className="info-val">{new Date(client.passport_details.birth_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                            )}
                            {client.passport_details.snils && (
                                <div className="info-row">
                                    <span className="info-key">СНИЛС</span>
                                    <span className="info-val">{client.passport_details.snils}</span>
                                </div>
                            )}
                            {client.passport_details.series && (
                                <div className="info-row">
                                    <span className="info-key">Серия и номер</span>
                                    <span className="info-val" style={{ fontFamily: 'monospace' }}>{client.passport_details.series} {client.passport_details.number}</span>
                                </div>
                            )}
                            {client.passport_details.unit_code && (
                                <div className="info-row">
                                    <span className="info-key">Код подразделения</span>
                                    <span className="info-val">{client.passport_details.unit_code}</span>
                                </div>
                            )}
                            {client.passport_details.issued_by && (
                                <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                    <span className="info-key">Кем выдан</span>
                                    <span className="info-val" style={{ textAlign: 'left' }}>{client.passport_details.issued_by}</span>
                                </div>
                            )}
                            {client.passport_details.issue_date && (
                                <div className="info-row">
                                    <span className="info-key">Дата выдачи</span>
                                    <span className="info-val">{new Date(client.passport_details.issue_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                            )}
                            {client.passport_details.registration_address && (
                                <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, borderBottom: 'none' }}>
                                    <span className="info-key">Адрес регистрации</span>
                                    <span className="info-val" style={{ textAlign: 'left' }}>{client.passport_details.registration_address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
