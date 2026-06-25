import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { 
    Pencil, Trash, Sparkles, Building2, MapPin,
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader, ChevronLeft,
    TrendingDown, Star, Store, GraduationCap, Bus, User, Handshake, Copy, SlidersHorizontal
} from 'lucide-react';

/* ─── InlinePriceEditor ──────────────────────────────────────────────────── */
function InlinePriceEditor({ prop, onSave }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(String(prop.price || ''));
    const inputRef = useRef();

    const open = useCallback((e) => {
        e.stopPropagation();
        setValue(String(prop.price || ''));
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 30);
    }, [prop.price]);

    const commit = useCallback((e) => {
        e?.stopPropagation?.();
        const parsed = Number(value.replace(/\D/g, ''));
        if (!isNaN(parsed) && parsed !== prop.price) {
            onSave(prop.id, parsed);
        }
        setEditing(false);
    }, [value, prop.id, prop.price, onSave]);

    const handleKey = useCallback((e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit(e);
        if (e.key === 'Escape') setEditing(false);
    }, [commit]);

    if (editing) {
        return (
            <div
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={e => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={value.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}
                    onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
                    onBlur={commit}
                    onKeyDown={handleKey}
                    style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: 26, fontWeight: 400,
                        color: 'var(--primary)',
                        background: 'rgba(0,82,255,0.06)',
                        border: '1.5px solid var(--primary)',
                        borderRadius: 12,
                        padding: '2px 12px',
                        width: 180,
                        outline: 'none',
                        lineHeight: 1,
                    }}
                />
                <span style={{ fontSize: 16, opacity: 0.6 }}>₽</span>
            </div>
        );
    }

    return (
        <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={open}
            title="Нажмите для изменения цены"
        >
            <span className="font-oswald" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>
                {formatNumber(prop.price)} <span style={{ fontSize: 16, opacity: 0.6 }}>₽</span>
            </span>
            <span style={{
                display: 'inline-flex', alignItems: 'center',
                opacity: 0,
                transition: 'opacity 0.15s',
            }} className="details-price-edit-icon">
                <Pencil size={14} style={{ color: 'var(--primary)' }} />
            </span>
            <style>{`.details-price-edit-icon { opacity: 0 } div:hover > .details-price-edit-icon { opacity: 0.5 }`}</style>
        </div>
    );
}

import { BUILDING_TYPES, PROPERTY_TYPES } from '../../data/constants';

import { PortfolioSection } from '../../components/PortfolioSection';
import { BannerGenerator } from '../../components/BannerGenerator';
import { AdGenerator } from '../../components/AdGenerator';
import { CmaReport } from '../../components/CmaReport';

/* ─── MortgageCalculator ─────────────────────────────────────────────────── */
function MortgageCalculator({ propertyPrice }) {
    const [price, setPrice] = useState(propertyPrice || 0);
    const [downPaymentPct, setDownPaymentPct] = useState(20); // default 20%
    const [interestRate, setInterestRate] = useState(18); // default 18%
    const [termYears, setTermYears] = useState(20); // default 20 years

    React.useEffect(() => {
        setPrice(propertyPrice || 0);
    }, [propertyPrice]);

    const downPayment = Math.round((price * downPaymentPct) / 100);
    const loanAmount = Math.max(0, price - downPayment);
    
    const r = (interestRate / 100) / 12;
    const n = termYears * 12;
    
    const monthlyPayment = React.useMemo(() => {
        if (loanAmount <= 0) return 0;
        if (interestRate <= 0) return Math.round(loanAmount / n);
        return Math.round(
            loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        );
    }, [loanAmount, r, n, interestRate]);

    const totalRepayment = monthlyPayment * n;
    const overpayment = Math.max(0, totalRepayment - loanAmount);
    const requiredIncome = monthlyPayment * 2;

    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
            <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                        <SlidersHorizontal size={22} />
                    </div>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                        Ипотечный калькулятор
                    </div>
                </div>
                <div style={{ color: 'var(--primary)' }}>
                    {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Стоимость недвижимости</span>
                                <span style={{ fontWeight: 600 }}>{formatNumber(price)} ₽</span>
                            </div>
                            <input 
                                type="range" 
                                min={Math.max(100000, Math.round(propertyPrice * 0.5))} 
                                max={Math.round(propertyPrice * 2)} 
                                step={100000}
                                value={price} 
                                onChange={e => setPrice(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Первоначальный взнос ({downPaymentPct}%)</span>
                                <span style={{ fontWeight: 600 }}>{formatNumber(downPayment)} ₽</span>
                            </div>
                            <input 
                                type="range" 
                                min={5} 
                                max={90} 
                                step={5}
                                value={downPaymentPct} 
                                onChange={e => setDownPaymentPct(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {[10, 15, 20, 30, 50].map(pct => (
                                    <button
                                        key={pct}
                                        onClick={() => setDownPaymentPct(pct)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8, border: 'none',
                                            background: downPaymentPct === pct ? 'var(--primary-light)' : 'var(--bg-light)',
                                            color: downPaymentPct === pct ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontSize: 11, cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Процентная ставка</span>
                                <span style={{ fontWeight: 600 }}>{interestRate}%</span>
                            </div>
                            <input 
                                type="range" 
                                min={1} 
                                max={30} 
                                step={0.5}
                                value={interestRate} 
                                onChange={e => setInterestRate(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[8, 12, 16, 18, 20].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => setInterestRate(rate)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8, border: 'none',
                                            background: interestRate === rate ? 'var(--primary-light)' : 'var(--bg-light)',
                                            color: interestRate === rate ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontSize: 11, cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        {rate}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Срок кредита</span>
                                <span style={{ fontWeight: 600 }}>{termYears} лет</span>
                            </div>
                            <input 
                                type="range" 
                                min={5} 
                                max={30} 
                                step={5}
                                value={termYears} 
                                onChange={e => setTermYears(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[10, 15, 20, 25, 30].map(years => (
                                    <button
                                        key={years}
                                        onClick={() => setTermYears(years)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8, border: 'none',
                                            background: termYears === years ? 'var(--primary-light)' : 'var(--bg-light)',
                                            color: termYears === years ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontSize: 11, cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        {years} л.
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ 
                        background: 'var(--bg-light)', 
                        padding: '20px', 
                        borderRadius: '24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 16,
                        border: '1px solid rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ежемесячный платёж</span>
                            <span className="font-oswald" style={{ fontSize: 24, fontWeight: 600, color: 'var(--primary)' }}>
                                {formatNumber(monthlyPayment)} ₽
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '1px', background: 'rgba(0,0,0,0.04)' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Сумма кредита</span>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{formatNumber(loanAmount)} ₽</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Необходимый доход</span>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{formatNumber(requiredIncome)} ₽/мес</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Переплата по %</span>
                                <span style={{ fontWeight: 500, color: '#ef4444' }}>{formatNumber(overpayment)} ₽</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Всего выплат</span>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{formatNumber(totalRepayment)} ₽</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── NewBuildsSelection ─────────────────────────────────────────────────── */
function NewBuildsSelection({ currentProp, allProperties, onNavigate }) {
    const isNewBuild = useCallback((p) => {
        return !!p.residential_complex || !!p.developer || (p.build_year && p.build_year >= 2020) || (p.year_built && p.year_built >= 2020);
    }, []);

    const selection = React.useMemo(() => {
        const complex = currentProp.residential_complex?.trim();
        if (complex) {
            const sameComplex = allProperties.filter(p => 
                p.id !== currentProp.id && 
                p.residential_complex?.toLowerCase().trim() === complex.toLowerCase()
            );
            if (sameComplex.length > 0) return { title: `Объекты в ЖК «${complex}»`, items: sameComplex };
        }

        const city = currentProp.city?.trim();
        const newBuilds = allProperties.filter(p => 
            p.id !== currentProp.id && 
            isNewBuild(p) &&
            (!city || p.city?.toLowerCase().trim() === city.toLowerCase())
        );

        if (newBuilds.length > 0) {
            return { title: 'Похожие новостройки', items: newBuilds.slice(0, 4) };
        }

        const generalNewBuilds = allProperties.filter(p => p.id !== currentProp.id && isNewBuild(p));
        if (generalNewBuilds.length > 0) {
            return { title: 'Новостройки в CRM', items: generalNewBuilds.slice(0, 4) };
        }

        return null;
    }, [currentProp, allProperties, isNewBuild]);

    const [collapsed, setCollapsed] = useState(true);

    if (!selection) return null;

    return (
        <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
            <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                        <Building2 size={22} />
                    </div>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {selection.title} ({selection.items.length})
                    </div>
                </div>
                <div style={{ color: 'var(--primary)' }}>
                    {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                    {selection.items.map(item => (
                        <div 
                            key={item.id}
                            className="card-clickable"
                            onClick={() => onNavigate(`/properties/${item.id}`)}
                            style={{
                                display: 'flex',
                                gap: 14,
                                padding: '12px',
                                background: 'var(--bg-light)',
                                borderRadius: '20px',
                                border: '1px solid rgba(0,0,0,0.02)',
                                cursor: 'pointer',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-light)' }}>
                                <img 
                                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=100&q=80'} 
                                    alt="" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span className="font-oswald" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                                        {formatNumber(item.price)} ₽
                                    </span>
                                    {item.area_total && (
                                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                            {item.rooms === 0 ? 'Студия' : `${item.rooms}к`} · {item.area_total} м²
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.residential_complex ? `ЖК «${item.residential_complex}»` : (item.address || item.city || '—')}
                                </div>
                                {item.developer && (
                                    <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 400 }}>
                                        Застройщик: {item.developer}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── DetailsPage ────────────────────────────────────────────────────────────── */

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const [showBannerGen, setShowBannerGen] = useState(false);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [showAdGen, setShowAdGen] = useState(false);
    const [showCma, setShowCma] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [mapFilter, setMapFilter] = useState('address');
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
    const agent = prop?.agent_id ? state.clients.find(c => c.id === prop.agent_id) : null;
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

    function handleCreateDeal() {
        let propClientIds = prop?.client_ids || [];
        if (typeof propClientIds === 'string') {
            propClientIds = propClientIds.replace(/{|}/g, '').split(',').filter(Boolean);
        }
        const sellers = propClientIds.length > 0 ? propClientIds : (prop?.client_id ? [prop.client_id] : []);

        navigate('/tasks', {
            state: {
                prefillDeal: {
                    title: `Сделка: ${prop.address || prop.city || 'Объект'}`,
                    property_id: prop.id,
                    price: prop.price ? prop.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
                    commission: prop.commission ? prop.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
                    seller_ids: sellers,
                    buyer_ids: [],
                    seller_agent_id: prop.agent_id || '',
                    buyer_agent_id: ''
                }
            }
        });
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
                    <button className="icon-btn-calendar" onClick={() => navigate(`/history/new?property_id=${id}`)} title="Создать новое событие">
                        <Calendar size={18} />
                    </button>
                    <button className="icon-btn-edit" onClick={() => navigate(`/properties/${id}/edit`)} title="Редактировать">
                        <Pencil size={18} />
                    </button>
                    <button className="icon-btn-delete" onClick={handleDelete} title="Удалить">
                        <Trash size={18} />
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
                                    <InlinePriceEditor
                                        prop={prop}
                                        onSave={(propId, newPrice) =>
                                            dispatch({ type: 'PATCH_PROPERTY', patch: { id: propId, price: newPrice } })
                                        }
                                    />
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
                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                                {STAGES.map((s, idx) => {
                                    const isActive = cur === s.id;
                                    const isPast = STAGES.findIndex(x => x.id === cur) > idx;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => dispatch({ 
                                                type: 'UPDATE_PROPERTY', 
                                                property: { ...prop, status: s.id }
                                            })}
                                            style={{
                                                padding: '2px 14px', borderRadius: 20,
                                                border: '1px solid #000000',
                                                fontSize: 12,
                                                fontFamily: "'Oswald', sans-serif", fontWeight: isActive ? 600 : 300,
                                                background: isActive ? `${s.color}44` : isPast ? `${s.color}15` : 'var(--bg-light)',
                                                color: '#000000',
                                                boxShadow: isActive ? `0 4px 12px ${s.color}22` : 'none',
                                                opacity: isActive ? 1 : 0.75,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <button
                        className="card-clickable"
                        style={{ 
                            height: 48, borderRadius: 14, border: '1.5px solid #000000',
                            background: 'var(--primary)', color: 'white', fontWeight: 500, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '0 16px',
                            width: '100%',
                            maxWidth: 360,
                            fontFamily: "'Oswald', sans-serif"
                        }}
                        onClick={handleCreateDeal}
                    >
                        <Handshake size={18} /> Создать сделку
                    </button>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px 12px',
                        justifyContent: 'start',
                        width: '100%',
                        maxWidth: 360
                    }}>
                        <button
                            className="card-clickable bordered-action-button"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1.5px solid #000000',
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
                            className="card-clickable bordered-action-button"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1.5px solid #000000',
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
                        <button
                            className="card-clickable bordered-action-button"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1.5px solid #000000',
                                background: 'var(--surface)', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowAdGen(true)}
                        >
                            <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Объявление
                        </button>
                        <button
                            className="card-clickable bordered-action-button"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1.5px solid #000000',
                                background: 'var(--surface)', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowCma(true)}
                        >
                            <TrendingDown size={16} style={{ color: '#10b981' }} /> СМА
                        </button>
                    </div>
                </div>

                {/* Mortgage Calculator */}
                <MortgageCalculator propertyPrice={prop.price} />

                {/* New Construction Collection */}
                <NewBuildsSelection currentProp={prop} allProperties={state.properties} onNavigate={navigate} />

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

                {/* ПЛАНИРОВКА */}
                {prop.floorplan_images && prop.floorplan_images.length > 0 && (
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: 12 }}>
                            Планировка ({prop.floorplan_images.length})
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {prop.floorplan_images.map((url, index) => (
                                <div key={index} style={{
                                    width: 'calc(50% - 4px)', aspectRatio: '1',
                                    borderRadius: 8, border: '1px solid var(--border-light)',
                                    background: 'var(--bg-light)', overflow: 'hidden'
                                }}>
                                    <img
                                        src={url}
                                        alt={`Планировка ${index + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                    />
                                </div>
                            ))}
                        </div>
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
                                        <div style={{ fontWeight: 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{c.full_name}</span>
                                            {prop.client_shares?.[c.id] && (
                                                <span style={{ fontSize: 12, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Доля: {prop.client_shares[c.id]}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agent */}
                {agent && (
                    <div className="card">
                        <div className="section-title">Агент объекта</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            <div onClick={() => navigate(`/clients/${agent.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'var(--primary-light)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 15, fontWeight: 600, flexShrink: 0, letterSpacing: 0.5,
                                }}>
                                    {initials(agent.full_name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 400 }}>{agent.full_name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{agent.phone}</div>
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Контактное лицо */}
                {(prop.contact_name || prop.contact_phone) && (
                    <div className="card">
                        <div className="section-title">Контактное лицо</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'var(--bg-light)', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <User size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                {prop.contact_name && (
                                    <div style={{ fontWeight: 400 }}>{prop.contact_name}</div>
                                )}
                                {prop.contact_phone && (
                                    <a
                                        href={`tel:+${prop.contact_phone.replace(/\D/g, '')}`}
                                        style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}
                                    >
                                        {prop.contact_phone}
                                    </a>
                                )}
                            </div>
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
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                            {prop.build_year && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Год постройки</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.build_year}</span>
                                </div>
                            )}
                            {prop.building_type && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Тип здания</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{BUILDING_TYPES[prop.building_type] || prop.building_type}</span>
                                </div>
                            )}
                            {prop.floors_total && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этажность</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floors_total}</span>
                                </div>
                            )}
                            {prop.elevator_type && prop.elevator_type !== 'none' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Лифт</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                        {{ passenger: 'Пассажирский', cargo: 'Грузовой', both: 'Пасс. + Груз.' }[prop.elevator_type] || prop.elevator_type}
                                    </span>
                                </div>
                            )}
                            {prop.management_company && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Управляющая компания</span>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.management_company}</span>
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                        {['apartment', 'room', 'commercial'].includes(prop.property_type) && prop.floor && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этаж</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floor} из {prop.floors_total || '—'}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Общая площадь</span>
                            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_total} м²</span>
                        </div>
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.area_living > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Жилая</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_living} м²</span>
                            </div>
                        )}
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.area_kitchen > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Кухня</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_kitchen} м²</span>
                            </div>
                        )}
                        {['apartment', 'room', 'house', 'commercial'].includes(prop.property_type) && prop.renovation && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Ремонт</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ none: 'Без ремонта', cosmetic: 'Косметический', euro: 'Евро', designer: 'Дизайнерский' }[prop.renovation] || prop.renovation}
                                </span>
                            </div>
                        )}
                        {['apartment', 'room', 'house'].includes(prop.property_type) && prop.bathroom && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Санузел</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' }[prop.bathroom] || prop.bathroom}
                                </span>
                            </div>
                        )}
                        {prop.ceiling_height && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Потолки</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.ceiling_height} м</span>
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

                        {/* Map Category Filters */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                            {[
                                { id: 'address', label: 'Адрес', icon: <MapPin size={14} /> },
                                { id: 'shops', label: 'Магазины', icon: <Store size={14} /> },
                                { id: 'schools', label: 'Школы', icon: <GraduationCap size={14} /> },
                                { id: 'transport', label: 'Транспорт', icon: <Bus size={14} /> }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setMapFilter(btn.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: '16px',
                                        border: '1px solid ' + (mapFilter === btn.id ? 'var(--primary)' : 'var(--border-light)'),
                                        background: mapFilter === btn.id ? 'var(--primary)' : 'var(--surface)',
                                        color: mapFilter === btn.id ? '#fff' : 'var(--text)',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                        boxShadow: mapFilter === btn.id ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                                    }}
                                >
                                    {btn.icon}
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', border: '1px solid var(--border-light)' }}>
                            <iframe 
                                src={(() => {
                                    const cleanAddress = (prop.city || '') + ', ' + (prop.address || '').split(/,\s*(?:кв|кв\.|квартира|оф|оф\.|офис|пом|пом\.|помещение|каб|каб\.|кабинет)\s*\d+/i)[0].trim();
                                    if (mapFilter === 'address') {
                                        return (prop.latitude && prop.longitude)
                                            ? `https://yandex.ru/map-widget/v1/?ll=${prop.longitude},${prop.latitude}&z=16&pt=${prop.longitude},${prop.latitude},pm2rdm`
                                            : `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent(cleanAddress)}&z=16`;
                                    } else if (mapFilter === 'shops') {
                                        return `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent('Магазины рядом с ' + cleanAddress)}&z=15`;
                                    } else if (mapFilter === 'schools') {
                                        return `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent('Школы и детские сады рядом с ' + cleanAddress)}&z=15`;
                                    } else if (mapFilter === 'transport') {
                                        return `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent('Остановки транспорта рядом с ' + cleanAddress)}&z=15`;
                                    }
                                })()} 
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
                {showAdGen && (
                    <AdGenerator 
                        property={prop}
                        currentUser={state.currentUser}
                        onClose={() => setShowAdGen(false)} 
                    />
                )}
                {showCma && (
                    <CmaReport 
                        property={prop}
                        onClose={() => setShowCma(false)} 
                        onApplyPrice={(newPrice) => {
                            dispatch({ 
                                type: 'PATCH_PROPERTY', 
                                patch: { id: prop.id, price: newPrice } 
                            });
                        }}
                    />
                )}
                </div>
            </div>
        );
}

