import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { 
    Pencil, Trash, Sparkles, Building2, MapPin,
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader, ChevronLeft,
    TrendingDown, Star
} from 'lucide-react';

import { BUILDING_TYPES, PROPERTY_TYPES } from '../../data/constants';





import { PortfolioSection } from '../../components/PortfolioSection';
import { BannerGenerator } from '../../components/BannerGenerator';


/* ─── DetailsPage ────────────────────────────────────────────────────────────── */

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const [showBannerGen, setShowBannerGen] = useState(false);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [showGallery, setShowGallery] = useState(true);
    const [coverSet, setCoverSet] = useState(false);

    function handleSetCover(index) {
        if (index === 0) return;
        const imgs = [...(prop.images || [])];
        const [selected] = imgs.splice(index, 1);
        imgs.unshift(selected);
        dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, images: imgs } });
        setCoverSet(true);
        setTimeout(() => setCoverSet(false), 2000);
    }

    const navigate = useNavigate();
    const prop = state.properties.find(p => p.id === id);
    
    // Normalize client_ids to always be an array
    let propClientIds = prop?.client_ids || [];
    if (typeof propClientIds === 'string') {
        // Handle Postgres array literal format "{id1,id2}"
        propClientIds = propClientIds.replace(/{|}/g, '').split(',').filter(Boolean);
    }
    const clientIds = propClientIds.length > 0 ? propClientIds : (prop?.client_id ? [prop.client_id] : []);
    
    const clients = state.clients.filter(c => clientIds.includes(c.id));
    const matches = state.matches.filter(m => m.property_id === id);
    const showings = state.showings.filter(s => s.property_id === id);
    const priceHistory = (state.priceHistory || []).filter(h => h.property_id === id).sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    // Unified history from showings with event_type
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча с собственником',
        viewing: 'Просмотр',
        deposit: 'Задаток',
        deal: 'Сделка',
    };

    const events = showings
        .map(s => {
            const buyer = s.client_id ? state.clients.find(c => c.id === s.client_id) : null;
            return {
                ...s,
                buyer,
                dateObj: s.showing_date ? new Date(s.showing_date) : null,
                typeLabel: eventTypeLabels[s.event_type] || 'Показ',
            };
        })
        .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));

    if (!prop) return (
        <div className="page" style={{ background: 'var(--bg)' }}>
            <div className="topbar" style={{ padding: '24px 20px', background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="card-clickable" onClick={() => navigate('/properties')} style={{ 
                    width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    color: 'var(--text)'
                }}>
                    <ChevronLeft size={20} />
                </button>
                <span className="topbar-title font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.01em' }}>Объект не найден</span>
            </div>
        </div>
    );



    function handleDelete() {
        if (window.confirm('Удалить этот объект?')) {
            dispatch({ type: 'DELETE_PROPERTY', id });
            navigate('/properties');
        }
    }

    // Initials helper
    const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid var(--border-light)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button onClick={() => navigate('/properties')} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 17, fontWeight: 300, letterSpacing: '0.01em', color: 'var(--text)' }}>
                        Объект
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 200, letterSpacing: '0.03em', opacity: 0.6 }}>Карточка объекта</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="card-clickable" onClick={() => navigate(`/properties/${id}/edit`)} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                        <Pencil size={20} />
                    </button>
                    <button className="card-clickable" onClick={handleDelete} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash size={20} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '24px 20px 120px' }}>
                {/* Header Card — Premium Open Design */}
                <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.04)', borderRadius: 36, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div className="card-clickable" style={{ width: 130, height: 130, borderRadius: 28, overflow: 'hidden', flexShrink: 0, boxShadow: '0 15px 30px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.02)' }} onClick={() => setShowGallery(true)}>
                            <img 
                                src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80'} 
                                alt="Object" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className="font-oswald" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>
                                        {formatNumber(prop.price)} <span style={{ fontSize: 16, opacity: 0.6 }}>₽</span>
                                    </div>
                                    {prop.area_total > 0 && (
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 200, marginTop: 4, opacity: 0.6 }}>
                                            {formatNumber(Math.round(prop.price / prop.area_total))} ₽/м²
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="font-oswald" style={{ fontSize: 16, fontWeight: 400, marginTop: 12, color: 'var(--text)', lineHeight: 1.2 }}>
                                {(prop.address || prop.city || '—').split(', кв.')[0].split(' кв.')[0]}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 200, opacity: 0.7 }}>
                                {(() => {
                                    const type = prop.property_type;
                                    const parts = [];
                                    if (type === 'apartment') {
                                        parts.push(prop.rooms === 0 ? 'Студия' : `${prop.rooms}-к. кв.`);
                                    } else if (type === 'room') {
                                        parts.push('Комната');
                                    } else if (type === 'house') {
                                        parts.push(prop.rooms > 0 ? `${prop.rooms}-к. дом` : 'Дом');
                                    }
                                    
                                    if (prop.area_total) {
                                        parts.push(`${prop.area_total} м²`);
                                    }
                                    
                                    if (['apartment', 'room', 'commercial'].includes(type) && prop.floor) {
                                        parts.push(`${prop.floor}/${prop.floors_total || '—'} эт.`);
                                    } else if (type === 'house' && prop.floors_total) {
                                        parts.push(`${prop.floors_total} эт.`);
                                    }
                                    
                                    parts.push(PROPERTY_TYPES[type] || 'Объект');
                                    return parts.join(' · ');
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stage Switcher */}
                    {(() => {
                        const STAGES = [
                            { id: 'meeting',     label: '\u0412\u0441\u0442\u0440\u0435\u0447\u0430',    color: '#3b82f6' },
                            { id: 'agreement',   label: '\u0410\u0414',         color: '#f59e0b' },
                            { id: 'advertising', label: '\u0420\u0435\u043a\u043b\u0430\u043c\u0430',   color: '#8b5cf6' },
                            { id: 'deposit',     label: '\u0417\u0430\u0434\u0430\u0442\u043e\u043a',   color: '#10b981' },
                            { id: 'deal',        label: '\u0421\u0434\u0435\u043b\u043a\u0430',     color: '#22c55e' },
                        ];
                        const cur = prop.status;
                        return (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {STAGES.map((s, idx) => {
                                    const isActive = cur === s.id;
                                    const isPast = STAGES.findIndex(x => x.id === cur) > idx;
                                    return (
                                        <button
                                            key={s.id}
                                            className="card-clickable"
                                            onClick={() => dispatch({ 
                                                type: 'UPDATE_PROPERTY', 
                                                property: { ...prop, status: s.id }
                                            })}
                                            style={{
                                                padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12,
                                                fontFamily: "'Oswald', sans-serif", fontWeight: isActive ? 600 : 300,
                                                background: isActive ? s.color : isPast ? `${s.color}22` : 'var(--bg-light)',
                                                color: isActive ? 'white' : isPast ? s.color : 'var(--text-secondary)',
                                                boxShadow: isActive ? `0 4px 12px ${s.color}44` : 'none',
                                                transition: 'all 0.2s',
                                                opacity: isActive ? 1 : 0.75,
                                            }}
                                        >
                                            {isActive ? '● ' : isPast ? '✓ ' : ''}{s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1px solid var(--border-light)',
                                background: 'var(--surface)', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowBannerGen(true)}
                        >
                            <ImageIcon size={18} /> Баннер
                        </button>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1px solid var(--border-light)',
                                background: 'var(--surface)', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowPortfolio(true)}
                        >
                            <Briefcase size={16} /> Портфолио
                        </button>
                    </div>
                </div>

                {/* ГАЛЕРЕЯ ФОТО */}
                {prop.images && prop.images.length > 0 && (
                    <div className="card">
                        <div 
                            className="section-title" 
                            style={{ marginBottom: showGallery ? 12 : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setShowGallery(!showGallery)}
                        >
                            <span>Фотографии ({prop.images.length})</span>
                            <div style={{ color: 'var(--primary)' }}>
                                {showGallery ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>
                        {showGallery && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {prop.images.map((url, index) => (
                                    <div key={index} style={{ 
                                        width: 'calc(50% - 4px)', aspectRatio: '1', 
                                        borderRadius: 8,
                                        border: index === 0 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                        position: 'relative'
                                    }}>
                                        <img 
                                            src={url} 
                                            alt={`Фото ${index + 1}`} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', borderRadius: 6 }} 
                                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} 
                                        />
                                        {/* Обложка — иконка звезды */}
                                        {index === 0 ? (
                                            <div style={{
                                                position: 'absolute', top: 6, left: 6,
                                                background: 'var(--primary)', borderRadius: 6,
                                                padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 3,
                                                fontSize: 10, color: '#fff', fontWeight: 300, fontFamily: 'Oswald',
                                                pointerEvents: 'none'
                                            }}>
                                                <Star size={10} fill="#fff" /> Обложка
                                            </div>
                                        ) : (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleSetCover(index); }}
                                                style={{
                                                    position: 'absolute', top: 6, right: 6,
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: 'rgba(0,0,0,0.5)', border: 'none',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', cursor: 'pointer',
                                                    backdropFilter: 'blur(4px)',
                                                    zIndex: 2
                                                }}
                                                title="Сделать обложкой"
                                            >
                                                <Star size={15} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {coverSet && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', fontWeight: 300 }}>✓ Обложка обновлена</div>
                        )}
                    </div>
                )}

                {/* Clients */}
                {clients.length > 0 && (
                    <div className="card">
                        <div className="section-title">{clients.length > 1 ? 'Собственники' : 'Собственник'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            {clients.map(c => (
                                <div key={c.id} onClick={() => navigate(`/clients/${c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: 'var(--bg-light)', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 300, flexShrink: 0, letterSpacing: 0.5,
                                    }}>
                                        {initials(c.full_name)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 400 }}>{c.full_name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── О ДОМЕ / ЗДАНИИ — Premium Section ── */}
                {['apartment', 'room', 'house', 'commercial'].includes(prop.property_type) && (
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={22} />
                            </div>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em' }}>
                                {prop.property_type === 'commercial' ? 'О здании' : 'О доме'}
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
                            {prop.build_year && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Год постройки</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.build_year}</span>
                                </div>
                            )}
                            {prop.building_type && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Тип здания</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{BUILDING_TYPES[prop.building_type] || prop.building_type}</span>
                                </div>
                            )}
                            {prop.floors_total && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этажность</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floors_total}</span>
                                </div>
                            )}
                            {prop.elevator_type && prop.elevator_type !== 'none' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Лифт</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                        {{ passenger: 'Пассажирский', cargo: 'Грузовой', both: 'Пасс. + Груз.' }[prop.elevator_type] || prop.elevator_type}
                                    </span>
                                </div>
                            )}
                            {prop.ceiling_height && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Потолки</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.ceiling_height} м</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── О КВАРТИРЕ / УЧАСТКЕ / ПОМЕЩЕНИИ — Premium Section ── */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Home size={22} />
                        </div>
                        <div className="font-oswald" style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.02em' }}>
                            {prop.property_type === 'house' 
                                ? 'О доме' 
                                : prop.property_type === 'land' 
                                    ? 'О земельном участке' 
                                    : prop.property_type === 'garden' 
                                        ? 'О саде' 
                                        : prop.property_type === 'commercial' 
                                            ? 'О помещении' 
                                            : prop.property_type === 'room' 
                                                ? 'О комнате' 
                                                : 'О квартире'}
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
                        {['apartment', 'room', 'commercial'].includes(prop.property_type) && prop.floor && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этаж</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floor} из {prop.floors_total || '—'}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Общая площадь</span>
                            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_total} м²</span>
                        </div>
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.area_living > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Жилая</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_living} м²</span>
                            </div>
                        )}
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.area_kitchen > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Кухня</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_kitchen} м²</span>
                            </div>
                        )}
                        {['apartment', 'room', 'house', 'commercial'].includes(prop.property_type) && prop.renovation && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Ремонт</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ none: 'Без ремонта', cosmetic: 'Косметический', euro: 'Евро', designer: 'Дизайнерский' }[prop.renovation] || prop.renovation}
                                </span>
                            </div>
                        )}
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.bathroom && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Санузел</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' }[prop.bathroom] || prop.bathroom}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── РАСПОЛОЖЕНИЕ — Map Section ── */}
                {prop.address && (
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={22} />
                            </div>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em' }}>Расположение</div>
                        </div>
                        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', border: '1px solid var(--border-light)' }}>
                            <iframe 
                                src={(prop.latitude && prop.longitude)
                                    ? `https://yandex.ru/map-widget/v1/?ll=${prop.longitude},${prop.latitude}&z=16&pt=${prop.longitude},${prop.latitude},pm2rdm`
                                    : `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent((prop.city || '') + ', ' + (prop.address || '').split(/,\s*(?:кв|кв\.|квартира|оф|оф\.|офис|пом|пом\.|помещение|каб|каб\.|кабинет)\s*\d+/i)[0].trim())}&z=16`} 
                                width="100%" 
                                height="260" 
                                style={{ display: 'block', border: 'none' }}
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* ── ИСТОРИЯ ЦЕН ── */}
                {priceHistory.length > 0 && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                <TrendingDown size={22} />
                            </div>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, letterSpacing: '0.02em', color: 'var(--text)' }}>История цен</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {priceHistory.map((entry, i) => {
                                const went = entry.new_price > entry.old_price ? 'up' : 'down';
                                const diff = Math.abs(entry.new_price - entry.old_price);
                                const diffPct = entry.old_price > 0 ? Math.round((diff / entry.old_price) * 100) : 0;
                                return (
                                    <div key={entry.id || i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', background: 'var(--bg-light)',
                                        borderRadius: 20, border: '1px solid rgba(0,0,0,0.02)'
                                    }}>
                                        <div>
                                            <div className="font-oswald" style={{ fontWeight: 400, fontSize: 16, color: 'var(--text)' }}>
                                                {formatNumber(entry.new_price)} ₽
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {entry.old_price ? `было ${formatNumber(entry.old_price)} ₽` : 'первая цена'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: 400,
                                                color: went === 'up' ? '#ef4444' : '#10b981'
                                            }}>
                                                {went === 'up' ? '↑' : '↓'} {diffPct}%
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {new Date(entry.changed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ИСТОРИЯ — Timeline Style */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, letterSpacing: '0.02em', color: 'var(--text)' }}>История ({events.length})</div>
                        <button className="card-clickable" onClick={() => navigate(`/history/new?property_id=${id}`)} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,82,255,0.05)' }}>
                            <Calendar size={20} />
                        </button>
                    </div>
                    {events.length === 0 ? (
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0', opacity: 0.6, background: 'var(--bg-light)', borderRadius: 20 }}>Пока нет событий</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {events.map(ev => {
                                const dateStr = ev.dateObj ? ev.dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
                                const timeStr = ev.dateObj ? ev.dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                const editRoute = `/history/new?id=${ev.id}`;
                                const feedbackText = [ev.feedback, ev.feedback_comment].filter(Boolean).join(' · ');
                                
                                return (
                                    <div key={ev.id} className="card-clickable" style={{ padding: '20px', background: 'var(--bg-light)', borderRadius: 24, border: '1px solid rgba(0,0,0,0.02)' }} onClick={() => navigate(editRoute)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--primary)', letterSpacing: '0.01em', fontFamily: 'Oswald' }}>{ev.typeLabel}</span>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateStr} {timeStr}</span>
                                                </div>
                                                {ev.buyer && (
                                                    <div style={{ fontSize: 14, fontWeight: 300, color: 'var(--text)' }}>
                                                        {ev.buyer.full_name}
                                                    </div>
                                                )}
                                                {feedbackText && (
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic', opacity: 0.8 }}>
                                                        «{feedbackText}»
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--primary)', opacity: 0.4 }}>
                                                <Pencil size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {prop.notes && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 16 }}>Описание</div>
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{prop.notes}</div>
                    </div>
                )}
                
                {showPortfolio && (
                    <PortfolioSection 
                        property={prop}
                        currentUser={state.currentUser}
                        onClose={() => setShowPortfolio(false)} 
                        onUpdate={(updates) => {
                            dispatch({ 
                                type: 'UPDATE_PROPERTY', 
                                property: { ...prop, ...updates } 
                            });
                        }}
                    />
                )}
                {showBannerGen && (
                    <BannerGenerator 
                        property={prop}
                        currentUser={state.currentUser}
                        onClose={() => setShowBannerGen(false)} 
                    />
                )}
                </div>
            </div>
        );
}

