import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatNumber } from '../../utils/format';
import { isDealTypeCompatible } from '../../utils/matching';
import { 
    Pencil, Trash, Sparkles, Building2, MapPin,
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader, ChevronLeft,
    TrendingDown, Star, User, Handshake, Copy, ExternalLink, Check, Zap, Store, DoorOpen
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

import { 
    BUILDING_TYPES, PROPERTY_TYPES, RENOVATION_LABELS,
    HOUSE_MATERIALS, HOUSE_CONDITIONS, LAND_CATEGORIES, ROAD_ACCESS,
    FENCE_TYPES, WATER_TYPES, GAS_TYPES, SEWAGE_TYPES,
    COMMERCIAL_TYPES, ENTRANCE_TYPES, COMMERCIAL_LAYOUTS, LOCATION_LINES, VENTILATION_TYPES
} from '../../data/constants';

import { PortfolioSection } from '../../components/PortfolioSection';
import { BannerGenerator } from '../../components/BannerGenerator';
import { AdGenerator } from '../../components/AdGenerator';
import { CmaReport } from '../../components/CmaReport';
import { EgrnScanModal } from '../../components/EgrnScanModal';


/* ─── NewBuildsSelection ─────────────────────────────────────────────────── */
function NewBuildsSelection({ currentProp, allProperties, onNavigate }) {
    const isNewBuild = useCallback((p) => {
        return !!p.residential_complex || !!p.developer || (p.build_year && p.build_year >= 2020) || (p.year_built && p.year_built >= 2020);
    }, []);

    const [avitoAnalogs, setAvitoAnalogs] = useState([]);
    const [loadingAvito, setLoadingAvito] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'crm' | 'avito'

    // Fetch Avito parser analogs on mount/prop change
    React.useEffect(() => {
        let isMounted = true;
        const fetchAvitoAnalogs = async () => {
            if (!currentProp) return;
            setLoadingAvito(true);
            try {
                const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.href.startsWith('file:') || window.location.hostname === '');
                const proxyUrl = isCapacitor ? `https://reacrm.ru/api/ai-proxy` : `/api/ai-proxy`;
                
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'getNewBuildAnalogs',
                        property: currentProp
                    })
                });

                if (res.ok) {
                    const json = await res.json();
                    if (isMounted && Array.isArray(json)) {
                        setAvitoAnalogs(json);
                    }
                }
            } catch (err) {
                console.error('[NewBuildsSelection] Error fetching Avito analogs:', err);
            } finally {
                if (isMounted) setLoadingAvito(false);
            }
        };

        fetchAvitoAnalogs();
        return () => { isMounted = false; };
    }, [currentProp]);

    // Local CRM new builds
    const crmNewBuilds = React.useMemo(() => {
        if (!currentProp) return [];
        const complex = currentProp.residential_complex?.trim().toLowerCase();
        const city = currentProp.city?.trim().toLowerCase();

        return allProperties.filter(p => {
            if (p.id === currentProp.id) return false;
            const pComplex = p.residential_complex?.trim().toLowerCase();
            const pCity = p.city?.trim().toLowerCase();
            
            if (complex && pComplex === complex) return true;
            if (city && pCity === city && isNewBuild(p)) return true;
            return isNewBuild(p);
        }).slice(0, 4).map(p => ({
            ...p,
            source: 'CRM',
            price_per_sqm: p.area_total ? Math.round(Number(p.price) / parseFloat(p.area_total)) : null
        }));
    }, [currentProp, allProperties, isNewBuild]);

    const combinedItems = React.useMemo(() => {
        if (activeTab === 'crm') return crmNewBuilds;
        if (activeTab === 'avito') return avitoAnalogs;

        const crmIds = new Set(crmNewBuilds.map(i => i.id));
        const filteredAvito = avitoAnalogs.filter(a => !crmIds.has(a.id));
        return [...crmNewBuilds, ...filteredAvito];
    }, [activeTab, crmNewBuilds, avitoAnalogs]);

    const avitoCatalogUrl = React.useMemo(() => {
        const cityLower = (currentProp?.city || '').toLowerCase().trim();
        let citySlug = 'kirovskaya_oblast_kirov';
        if (cityLower.includes('москв')) citySlug = 'moskva';
        else if (cityLower.includes('петербург') || cityLower.includes('спб')) citySlug = 'sankt-peterburg';
        else if (cityLower.includes('казан')) citySlug = 'kazan';
        else if (cityLower.includes('краснодар')) citySlug = 'krasnodar';
        else if (cityLower.includes('сочи')) citySlug = 'sochi';
        else if (cityLower.includes('екатеринбург')) citySlug = 'ekaterinburg';
        else if (cityLower.includes('новосибирск')) citySlug = 'novosibirsk';
        else if (cityLower.includes('нижн')) citySlug = 'nizhniy_novgorod';
        else if (cityLower.includes('киров')) citySlug = 'kirovskaya_oblast_kirov';

        return `https://www.avito.ru/${citySlug}/kvartiry/catalog/novostroyki-ASgBAgICA0SSA8YQ5geOUvLFDvCTmgI?cd=0&spaFlow=true&verticalCategoryId=1&rootCategoryId=4`;
    }, [currentProp?.city]);

    const totalCount = crmNewBuilds.length + avitoAnalogs.length;
    if (totalCount === 0 && !loadingAvito) return null;

    const title = currentProp.residential_complex 
        ? `Новостройки в ЖК «${currentProp.residential_complex}» и аналоги`
        : 'Похожие новостройки';

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
                    <div>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                            {title} ({totalCount})
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Внутренние объекты CRM и новостройки из каталога Avito Parser
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a
                        href={avitoCatalogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Открыть каталог новостроек на Avito"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 16,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(123, 161, 25, 0.12)',
                            color: '#5d7d0d',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>Каталог Avito</span>
                        <ExternalLink size={12} />
                    </a>
                    {loadingAvito && <Loader size={16} className="spin" style={{ color: 'var(--primary)' }} />}
                    <div style={{ color: 'var(--primary)' }}>
                        {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </div>
                </div>
            </div>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                    {/* Tabs / Filter Chips */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveTab('all'); }}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 16,
                                fontSize: 12,
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                background: activeTab === 'all' ? 'var(--primary)' : 'var(--bg-light)',
                                color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Все ({totalCount})
                        </button>
                        {crmNewBuilds.length > 0 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActiveTab('crm'); }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 16,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'crm' ? 'var(--primary)' : 'var(--bg-light)',
                                    color: activeTab === 'crm' ? '#fff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                В CRM ({crmNewBuilds.length})
                            </button>
                        )}
                        {avitoAnalogs.length > 0 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActiveTab('avito'); }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 16,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'avito' ? '#7ba119' : 'var(--bg-light)',
                                    color: activeTab === 'avito' ? '#fff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Avito Parser ({avitoAnalogs.length})
                            </button>
                        )}
                    </div>

                    {/* Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {combinedItems.map(item => {
                            const isAvito = item.source === 'AVITO';
                            const handleCardClick = () => {
                                if (isAvito && item.source_url) {
                                    window.open(item.source_url, '_blank', 'noopener,noreferrer');
                                } else if (!isAvito) {
                                    onNavigate(`/properties/${item.id}`);
                                }
                            };

                            return (
                                <div 
                                    key={item.id}
                                    className="card-clickable"
                                    onClick={handleCardClick}
                                    style={{
                                        display: 'flex',
                                        gap: 14,
                                        padding: '14px',
                                        background: 'var(--bg-light)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(0,0,0,0.03)',
                                        cursor: 'pointer',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'var(--border-light)', position: 'relative' }}>
                                        <img 
                                            src={item.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=150&q=80'} 
                                            alt="" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                <span className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                                                    {formatNumber(item.price)} ₽
                                                </span>
                                                {item.price_per_sqm && (
                                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                        {formatNumber(item.price_per_sqm)} ₽/м²
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    background: isAvito ? 'rgba(123, 161, 25, 0.15)' : 'rgba(40, 100, 240, 0.12)',
                                                    color: isAvito ? '#5d7d0d' : 'var(--primary)'
                                                }}>
                                                    {isAvito ? 'Avito' : 'CRM'}
                                                </span>
                                                {isAvito && item.source_url && (
                                                    <ExternalLink size={14} style={{ color: 'var(--text-secondary)' }} />
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {item.rooms === 0 ? 'Студия' : `${item.rooms}к`} · {item.total_area || item.area_total} м²
                                            {(item.floor || item.floors_total) && ` · ${item.floor || '?'}/${item.floors_total || item.total_floors || '?'} эт.`}
                                        </div>

                                        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.residential_complex ? `ЖК «${item.residential_complex}»` : (item.address || item.city || item.title || '—')}
                                        </div>

                                        {item.developer && (
                                            <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 400 }}>
                                                Застройщик: {item.developer}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── DetailsPage ────────────────────────────────────────────────────────────── */

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const [showBannerGen, setShowBannerGen] = useState(false);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [showAdGen, setShowAdGen] = useState(false);
    const [showCma, setShowCma] = useState(false);
    const [showEgrn, setShowEgrn] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [coverSet, setCoverSet] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    const copyToClipboard = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        if (toast?.success) toast.success('Скопировано в буфер');
        setTimeout(() => setCopiedField(null), 2000);
    };

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
    const matches = state.matches.filter(m => {
        if (m.property_id !== id) return false;
        const req = state.requests.find(r => r.id === m.request_id);
        return req && req.status === 'active' && isDealTypeCompatible(prop, req);
    });
    const showings = state.showings.filter(s => s.property_id === id);
    const priceHistory = (state.priceHistory || []).filter(h => h.property_id === id).sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    // Unified history from showings with event_type
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча',
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

    function handleCreateDocument() {
        let propClientIds = prop?.client_ids || [];
        if (typeof propClientIds === 'string') {
            propClientIds = propClientIds.replace(/{|}/g, '').split(',').filter(Boolean);
        }
        const sellers = propClientIds.length > 0 ? propClientIds : (prop?.client_id ? [prop.client_id] : []);
        const isRent = prop?.deal_type === 'rent';

        navigate('/documents', {
            state: {
                docPrefill: {
                    propertyId: prop.id,
                    sellerId: sellers[0] || '',
                    template: isRent ? 'rent' : 'sale'
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
                    <button className="icon-btn-calendar" onClick={handleCreateDocument} title="Создать договор / документ" style={{ color: 'var(--primary)' }}>
                        <FileText size={18} />
                    </button>
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
                <div className="details-dashboard-grid">
                    {/* ── ОСНОВНАЯ КОЛОНКА (Слева на лаптопе) ── */}
                    <div className="details-col-main">
                {/* Header Card — Modern Redesign */}
                <div className="card" style={{ 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 20, 
                    border: 'none', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.03)', 
                    borderRadius: 32, 
                    background: 'var(--surface)' 
                }}>
                    {/* Top Row: Photo + Main Info */}
                    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                        {/* Photo Thumbnail */}
                        <div 
                            className="card-clickable" 
                            style={{ 
                                width: 115, 
                                height: 115, 
                                borderRadius: 20, 
                                overflow: 'hidden', 
                                flexShrink: 0, 
                                boxShadow: '0 8px 20px rgba(0,0,0,0.08)', 
                                border: '1px solid rgba(0,0,0,0.04)',
                                position: 'relative'
                            }} 
                            onClick={() => setShowGallery(true)}
                            title="Открыть галерею фото"
                        >
                            <img 
                                src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=240&q=80'} 
                                alt="Object" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            {prop.images && prop.images.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 6,
                                    right: 6,
                                    background: 'rgba(0,0,0,0.65)',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    backdropFilter: 'blur(4px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3
                                }}>
                                    <ImageIcon size={10} /> {prop.images.length}
                                </div>
                            )}
                        </div>

                        {/* Price & Address Details */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Price */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                <InlinePriceEditor
                                    prop={prop}
                                    onSave={(propId, newPrice) =>
                                        dispatch({ type: 'PATCH_PROPERTY', patch: { id: propId, price: newPrice } })
                                    }
                                />
                                {prop.area_total > 0 && (
                                    <span style={{ 
                                        fontSize: 12, 
                                        color: 'var(--text-secondary)', 
                                        fontWeight: 400,
                                        background: 'var(--bg-light)',
                                        padding: '2px 8px',
                                        borderRadius: 8
                                    }}>
                                        {formatNumber(Math.round(prop.price / prop.area_total))} ₽/м²
                                    </span>
                                )}
                            </div>

                            {/* Address */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <div className="font-oswald" style={{ 
                                    fontSize: 16, 
                                    fontWeight: 400, 
                                    color: 'var(--text)', 
                                    lineHeight: 1.25,
                                    wordBreak: 'break-word'
                                }}>
                                    {prop.address || prop.city || '—'}
                                </div>
                                {prop.address && (
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(prop.address, 'address')}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            color: copiedField === 'address' ? 'var(--success)' : 'var(--text-muted)', 
                                            padding: 2, 
                                            flexShrink: 0 
                                        }}
                                        title="Скопировать адрес"
                                    >
                                        {copiedField === 'address' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>

                            {/* Subtitle location / complex */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                                {prop.city && <span>{prop.city}</span>}
                                {prop.district && <span>· {prop.district.startsWith('р-н') ? prop.district : `р-н ${prop.district}`}</span>}
                                {prop.microdistrict && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        background: 'rgba(0,82,255,0.08)',
                                        color: 'var(--primary)',
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontWeight: 500
                                    }}>
                                        <MapPin size={11} /> мкр. {prop.microdistrict}
                                    </span>
                                )}
                                {prop.residential_complex && <span>· ЖК «{prop.residential_complex}»</span>}
                                {prop.address && (
                                    <a
                                        href={`https://yandex.ru/maps/?text=${encodeURIComponent((prop.city || '') + ' ' + prop.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            color: 'var(--primary)',
                                            textDecoration: 'none',
                                            fontWeight: 500,
                                            marginLeft: 'auto'
                                        }}
                                        title="Открыть в Яндекс Картах"
                                    >
                                        <MapPin size={12} />
                                        <span>На карте</span>
                                        <ExternalLink size={10} />
                                    </a>
                                )}
                            </div>

                            {/* Quick specs chips */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                {(() => {
                                    const type = prop.property_type;
                                    const specs = [];
                                    if (type === 'apartment') {
                                        specs.push(prop.rooms === 0 ? 'Студия' : `${prop.rooms}-комн.`);
                                    } else if (type === 'room') {
                                        specs.push('Комната');
                                    } else if (type === 'house') {
                                        specs.push(prop.rooms > 0 ? `${prop.rooms}-комн. дом` : 'Дом');
                                        if (prop.land_area) specs.push(`${prop.land_area} сот.`);
                                        if (prop.land_category) specs.push(LAND_CATEGORIES[prop.land_category] || prop.land_category);
                                    } else if (type === 'commercial') {
                                        if (prop.commercial_type) specs.push(COMMERCIAL_TYPES[prop.commercial_type] || prop.commercial_type);
                                        if (prop.location_line) specs.push(LOCATION_LINES[prop.location_line] || prop.location_line);
                                        if (prop.has_tenant) specs.push('ГАБ / Арендатор');
                                    } else if (type === 'garden') {
                                        if (prop.land_area) specs.push(`${prop.land_area} сот.`);
                                        if (prop.snt_name) specs.push(`СНТ ${prop.snt_name}`);
                                        if (prop.snt_number) specs.push(`уч. №${prop.snt_number}`);
                                        if (prop.land_category) specs.push(LAND_CATEGORIES[prop.land_category] || prop.land_category);
                                        if (prop.distance_to_city) specs.push(`${prop.distance_to_city} км от города`);
                                        if (prop.has_house && prop.house_area) specs.push(`Дом ${prop.house_area} м²`);
                                    }
                                    if (type !== 'garden' && (prop.area_total || prop.house_area)) specs.push(`${prop.area_total || prop.house_area} м²`);
                                    if (prop.microdistrict) specs.push(`мкр. ${prop.microdistrict}`);
                                    if (['apartment', 'room', 'commercial'].includes(type) && prop.floor) {
                                        specs.push(`${prop.floor}/${prop.floors_total || '—'} эт.`);
                                    } else if (type === 'house' && (prop.floors_total || prop.house_floors)) {
                                        specs.push(`${prop.floors_total || prop.house_floors} эт.`);
                                    }
                                    if (PROPERTY_TYPES[type] && type !== 'house' && type !== 'commercial') specs.push(PROPERTY_TYPES[type]);

                                    return specs.map((spec, i) => (
                                        <span key={i} style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: 'var(--text-secondary)',
                                            background: 'var(--bg-light)',
                                            padding: '2px 8px',
                                            borderRadius: 8
                                         }}>
                                             {spec}
                                         </span>
                                     ));
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stage Switcher — sleek modern segmented pills */}
                    {(() => {
                        const STAGES = [
                            { id: 'meeting',     label: 'Встреча',    color: '#3b82f6' },
                            { id: 'agreement',   label: 'АД',         color: '#f59e0b' },
                            { id: 'advertising', label: 'Реклама',   color: '#8b5cf6' },
                            { id: 'deposit',     label: 'Задаток',   color: '#10b981' },
                            { id: 'deal',        label: 'Сделка',     color: '#22c55e' },
                        ];
                        const cur = prop.status;
                        return (
                            <div style={{ 
                                display: 'flex', 
                                gap: 6, 
                                overflowX: 'auto', 
                                scrollbarWidth: 'none',
                                padding: '2px 0',
                                alignItems: 'center'
                            }}>
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
                                                padding: '4px 12px',
                                                borderRadius: 12,
                                                border: isActive ? `1.5px solid ${s.color}` : '1px solid var(--border)',
                                                fontSize: 12,
                                                fontFamily: "'Oswald', sans-serif",
                                                fontWeight: isActive ? 500 : 300,
                                                background: isActive ? `${s.color}18` : isPast ? `${s.color}08` : 'var(--surface)',
                                                color: isActive ? s.color : 'var(--text-secondary)',
                                                boxShadow: isActive ? `0 2px 8px ${s.color}25` : 'none',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Action Controls: Modern & Refined */}
                    <div className="prop-action-controls">
                        <button
                            className="prop-deal-btn card-clickable"
                            onClick={handleCreateDeal}
                        >
                            <Handshake size={17} />
                            <span>Создать сделку</span>
                        </button>

                        {/* Marketing & Presentation Tools */}
                        <div className="prop-tools-grid">
                            <button
                                className="prop-tool-btn card-clickable"
                                onClick={() => setShowAdGen(true)}
                                title="Генератор текста объявления"
                            >
                                <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                                <span>Объявление</span>
                            </button>

                            <button
                                className="prop-tool-btn card-clickable"
                                onClick={() => setShowBannerGen(true)}
                                title="Создать баннер для соцсетей"
                            >
                                <ImageIcon size={14} style={{ color: '#f59e0b' }} />
                                <span>Баннер</span>
                            </button>

                            <button
                                className="prop-tool-btn card-clickable"
                                onClick={() => setShowPortfolio(true)}
                                title="Портфолио и презентация объекта"
                            >
                                <Briefcase size={14} style={{ color: '#8b5cf6' }} />
                                <span>Портфолио</span>
                            </button>

                            <button
                                className="prop-tool-btn card-clickable"
                                onClick={() => setShowCma(true)}
                                title="Сравнительный маркетинговый анализ (СМА)"
                            >
                                <TrendingDown size={14} style={{ color: '#10b981' }} />
                                <span>СМА</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── ХАРАКТЕРИСТИКИ ОБЪЕКТА (КОМПАКТНЫЙ ЕДИНЫЙ БЛОК) ── */}
                {/* ── ХАРАКТЕРИСТИКИ ДОМА (для домов) ── */}
                {prop.property_type === 'house' && (
                    <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                    <Home size={22} />
                                </div>
                                <div className="font-oswald" style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                    Характеристики дома
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {(prop.area_total || prop.house_area) && (
                                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text)' }}>
                                        {prop.area_total || prop.house_area} м²
                                    </span>
                                )}
                                {prop.land_area && (
                                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text)' }}>
                                        {prop.land_area} сот.
                                    </span>
                                )}
                                {(prop.floors_total || prop.house_floors) && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {prop.floors_total || prop.house_floors} эт.
                                    </span>
                                )}
                                {(prop.build_year || prop.house_build_year) && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {prop.build_year || prop.house_build_year} г.
                                    </span>
                                )}
                                {prop.land_category && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {LAND_CATEGORIES[prop.land_category] || prop.land_category}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Главные показатели (плитки) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 14 }}>
                            {(prop.area_total || prop.house_area) ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Дом</div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: "'Oswald', sans-serif", marginTop: 2 }}>{prop.area_total || prop.house_area}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>м²{(prop.floors_total || prop.house_floors) ? ` · ${prop.floors_total || prop.house_floors} эт.` : ''}</div>
                                </div>
                            ) : null}

                            {prop.land_area ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Участок</div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: "'Oswald', sans-serif", marginTop: 2 }}>{prop.land_area}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>соток</div>
                                </div>
                            ) : null}

                            {prop.rooms !== undefined && prop.rooms !== null && (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Комнат</div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: "'Oswald', sans-serif", marginTop: 2 }}>{prop.rooms > 0 ? prop.rooms : '—'}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{prop.rooms > 0 ? 'комнаты' : 'свободная'}</div>
                                </div>
                            )}

                            {prop.road_access ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Подъезд</div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>
                                        {ROAD_ACCESS[prop.road_access] || prop.road_access}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                            {/* Подблок 1: Дом и конструкция */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Home size={13} />
                                    Параметры дома
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Площадь дома</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_total || prop.house_area} м²</div>
                                    </div>
                                    {prop.area_living > 0 && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Жилая</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_living} м²</div>
                                        </div>
                                    )}
                                    {prop.area_kitchen > 0 && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Кухня</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_kitchen} м²</div>
                                        </div>
                                    )}
                                    {(prop.floors_total || prop.house_floors) && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Этажей в доме</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.floors_total || prop.house_floors}</div>
                                        </div>
                                    )}
                                    {(prop.house_material || prop.building_type) && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Материал стен</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {HOUSE_MATERIALS[prop.house_material] || BUILDING_TYPES[prop.building_type] || prop.house_material || prop.building_type}
                                            </div>
                                        </div>
                                    )}
                                    {(prop.house_condition || prop.renovation) && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Состояние</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {HOUSE_CONDITIONS[prop.house_condition] || RENOVATION_LABELS[prop.renovation] || prop.house_condition || prop.renovation}
                                            </div>
                                        </div>
                                    )}
                                    {prop.bathroom && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Санузел</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {{ combined: 'В доме (совмещённый)', separate: 'В доме (раздельный)', two: '2 и более', outside: 'На улице' }[prop.bathroom] || prop.bathroom}
                                            </div>
                                        </div>
                                    )}
                                    {prop.ceiling_height && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Потолки</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.ceiling_height} м</div>
                                        </div>
                                    )}
                                    {(prop.build_year || prop.house_build_year) && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Год постройки</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.build_year || prop.house_build_year} г.</div>
                                        </div>
                                    )}
                                    {prop.furniture && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Мебель</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Остаётся</div>
                                        </div>
                                    )}
                                    {prop.house_has_cadastre !== undefined && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Кадастровый учёт дома</div>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: prop.house_has_cadastre ? 'var(--success)' : 'var(--text-secondary)' }}>
                                                {prop.house_has_cadastre ? `Стоит на учёте${prop.house_cadastral_number ? `: ${prop.house_cadastral_number}` : ''}` : 'Не оформлен'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Подблок 2: Участок и подъезд */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={13} />
                                    Участок и подъезд
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
                                    {prop.land_area && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Площадь участка</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.land_area} соток</div>
                                        </div>
                                    )}
                                    {prop.land_category && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Категория земли</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{LAND_CATEGORIES[prop.land_category] || prop.land_category}</div>
                                        </div>
                                    )}
                                    {prop.road_access && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Подъезд</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{ROAD_ACCESS[prop.road_access] || prop.road_access}</div>
                                        </div>
                                    )}
                                    {prop.distance_to_city && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>До города</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.distance_to_city} км</div>
                                        </div>
                                    )}
                                    {prop.fence_type && prop.fence_type !== 'none' && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Забор</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{FENCE_TYPES[prop.fence_type] || prop.fence_type}</div>
                                        </div>
                                    )}
                                    {prop.residential_complex && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Коттеджный посёлок</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.residential_complex}</div>
                                        </div>
                                    )}
                                    {prop.district && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Район</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.district}</div>
                                        </div>
                                    )}
                                    {prop.microdistrict && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Микрорайон</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.microdistrict}</div>
                                        </div>
                                    )}
                                    {prop.cadastral_number && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Кадастровый номер участка</div>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{prop.cadastral_number}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Коммуникации */}
                        {(prop.has_electricity || prop.has_water || prop.has_gas || prop.has_sewage) && (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                    Коммуникации
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {prop.has_electricity && (
                                        <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                                            Электричество{prop.electricity_kw ? ` (${prop.electricity_kw} кВт)` : ''}
                                        </span>
                                    )}
                                    {prop.has_water && (
                                        <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}>
                                            {(() => {
                                                const types = Array.isArray(prop.water_types) && prop.water_types.length > 0 
                                                    ? prop.water_types 
                                                    : (prop.water_type ? [prop.water_type] : []);
                                                if (types.length === 0) return 'Водоснабжение';
                                                return `Вода (${types.map(t => WATER_TYPES[t] || t).join(', ')})`;
                                            })()}
                                        </span>
                                    )}
                                    {prop.has_gas && (
                                        <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#b91c1c' }}>
                                            Газ{prop.gas_type ? ` (${GAS_TYPES[prop.gas_type] || prop.gas_type})` : ''}
                                        </span>
                                    )}
                                    {prop.has_sewage && (
                                        <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(16,185,129,0.08)', color: '#047857' }}>
                                            Канализация{prop.sewage_type ? ` (${SEWAGE_TYPES[prop.sewage_type] || prop.sewage_type})` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Постройки и удобства */}
                        {(prop.has_bathhouse || prop.has_garage || prop.has_gazebo || prop.has_greenhouse || prop.has_well || prop.has_summer_kitchen || prop.has_pond) && (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                    Постройки и удобства
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {prop.has_bathhouse && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Баня / Сауна</span>}
                                    {prop.has_garage && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Гараж{prop.garage_area ? ` (${prop.garage_area} м²)` : ''}</span>}
                                    {prop.has_gazebo && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Беседка</span>}
                                    {prop.has_greenhouse && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Теплица</span>}
                                    {prop.has_well && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Скважина / Колодец</span>}
                                    {prop.has_summer_kitchen && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Летняя кухня</span>}
                                    {prop.has_pond && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Водоём / Бассейн</span>}
                                </div>
                            </div>
                        )}

                        {/* Заметки по дому и участку */}
                        {prop.garden_notes && (
                            <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-light)', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {prop.garden_notes}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ХАРАКТЕРИСТИКИ КОММЕРЧЕСКОГО ОБЪЕКТА ── */}
                {prop.property_type === 'commercial' && (
                    <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                    <Briefcase size={22} />
                                </div>
                                <div className="font-oswald" style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                    Характеристики помещения
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {prop.area_total && (
                                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text)' }}>
                                        {prop.area_total} м²
                                    </span>
                                )}
                                {prop.floor && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {prop.floor}{prop.floors_total ? `/${prop.floors_total}` : ''} эт.
                                    </span>
                                )}
                                {prop.electricity_kw && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'rgba(234, 179, 8, 0.1)', color: '#b45309', padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Zap size={12} /> {prop.electricity_kw} кВт
                                    </span>
                                )}
                                {prop.has_tenant && (
                                    <span style={{ fontSize: 12, fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Check size={12} strokeWidth={3} /> ГАБ
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2-column or 3-column sub-blocks */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                            {/* Блок 1: Назначение и доступ */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Store size={13} /> Назначение и доступ
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 14px' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Назначение</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {COMMERCIAL_TYPES[prop.commercial_type] || prop.commercial_type || 'Свободное (ПСН)'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Линия домов</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {LOCATION_LINES[prop.location_line] || prop.location_line || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Вход</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {ENTRANCE_TYPES[prop.entrance_type] || prop.entrance_type || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Планировка</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {COMMERCIAL_LAYOUTS[prop.commercial_layout] || prop.commercial_layout || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Badges for shop windows, 24/7, loading, furniture */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                                    {prop.has_shop_windows && (
                                        <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text)', fontWeight: 400 }}>
                                            🪟 Витринные окна
                                        </span>
                                    )}
                                    {prop.access_24_7 && (
                                        <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text)', fontWeight: 400 }}>
                                            🕒 Доступ 24/7
                                        </span>
                                    )}
                                    {prop.has_loading_zone && (
                                        <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text)', fontWeight: 400 }}>
                                            📦 Зона разгрузки
                                        </span>
                                    )}
                                    {prop.furniture && (
                                        <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text)', fontWeight: 400 }}>
                                            🛋 Оборудование / мебель
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Блок 2: Инженерия и параметры */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Zap size={13} /> Инженерия и метрики
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 14px' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Общая площадь</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_total ? `${prop.area_total} м²` : '—'}</div>
                                    </div>
                                    {prop.area_living > 0 && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Полезная / торг.</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_living} м²</div>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Эл. мощность</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: prop.electricity_kw ? 'var(--primary)' : 'var(--text)' }}>
                                            {prop.electricity_kw ? `${prop.electricity_kw} кВт` : '—'}
                                        </div>
                                    </div>
                                    {prop.ceiling_height && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Высота потолков</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.ceiling_height} м</div>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Вентиляция</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {VENTILATION_TYPES[prop.ventilation_type] || prop.ventilation_type || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Мокрые точки</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                            {prop.wet_points !== undefined && prop.wet_points !== null ? `${prop.wet_points} шт.` : (prop.has_water ? 'Есть' : '—')}
                                        </div>
                                    </div>
                                    {prop.renovation && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Отделка / ремонт</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {RENOVATION_LABELS[prop.renovation] || prop.renovation}
                                            </div>
                                        </div>
                                    )}
                                    {prop.parking && prop.parking !== 'none' && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Парковка</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {{ ground: 'Наземная', barrier: 'Под шлагбаумом', underground: 'Подземный паркинг' }[prop.parking] || prop.parking}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Блок 3: Готовый арендный бизнес (ГАБ) — если указано */}
                        {prop.has_tenant && (
                            <div style={{ 
                                marginTop: 14, background: 'rgba(16, 185, 129, 0.05)', 
                                border: '1px solid rgba(16, 185, 129, 0.2)', 
                                borderRadius: 18, padding: '14px 18px',
                                display: 'flex', flexDirection: 'column', gap: 10
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={15} /> Готовый арендный бизнес (ГАБ)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300 }}>Статус</div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Арендатор сидит</div>
                                    </div>
                                    {prop.rental_income > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300 }}>Арендная плата</div>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>
                                                {formatNumber(prop.rental_income)} ₽ / мес.
                                            </div>
                                        </div>
                                    )}
                                    {prop.rental_income > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300 }}>Годовой арендный поток</div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                                                {formatNumber(Number(prop.rental_income) * 12)} ₽ / год
                                            </div>
                                        </div>
                                    )}
                                    {prop.price > 0 && prop.rental_income > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300 }}>Доходность / Окупаемость</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                                                {((Number(prop.rental_income) * 12 / Number(prop.price)) * 100).toFixed(1)}% годовых (~{(Number(prop.price) / (Number(prop.rental_income) * 12)).toFixed(1)} л.)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Блок 4: Заметки по коммерции */}
                        {prop.commercial_notes && (
                            <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 14, fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Особенности коммерческого помещения:
                                </span>
                                {prop.commercial_notes}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ХАРАКТЕРИСТИКИ ОБЪЕКТА (для квартир, комнат) ── */}
                {prop.property_type !== 'garden' && prop.property_type !== 'house' && prop.property_type !== 'commercial' && (
                    <div className="card" style={{ padding: '16px 20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: 24, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                    <Building2 size={20} />
                                </div>
                                <div className="font-oswald" style={{ fontWeight: 400, fontSize: 17, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                    Характеристики объекта
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {prop.area_total && (
                                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text)' }}>
                                        {prop.area_total} м²
                                    </span>
                                )}
                                {prop.floor && ['apartment', 'room', 'commercial'].includes(prop.property_type) && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {prop.floor}{prop.floors_total ? `/${prop.floors_total}` : ''} эт.
                                    </span>
                                )}
                                {prop.build_year && (
                                    <span style={{ fontSize: 12, fontWeight: 500, background: 'var(--bg-light)', padding: '3px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                                        {prop.build_year} г.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                            {/* Подблок 1: Квартира / Помещение */}
                            <div style={{ background: 'var(--bg-light)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Home size={13} />
                                    {prop.property_type === 'commercial' ? 'Параметры помещения' : prop.property_type === 'land' ? 'Параметры участка' : prop.property_type === 'room' ? 'Параметры комнаты' : 'Параметры квартиры'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Общая площадь</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_total} м²</div>
                                    </div>
                                    {['apartment', 'room'].includes(prop.property_type) && prop.area_living > 0 && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Жилая</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_living} м²</div>
                                        </div>
                                    )}
                                    {['apartment', 'room'].includes(prop.property_type) && prop.area_kitchen > 0 && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Кухня</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.area_kitchen} м²</div>
                                        </div>
                                    )}
                                    {['apartment', 'room', 'commercial'].includes(prop.property_type) && prop.floor && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Этаж</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.floor} из {prop.floors_total || '—'}</div>
                                        </div>
                                    )}
                                    {['apartment', 'room', 'commercial'].includes(prop.property_type) && prop.renovation && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Ремонт</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {{ none: 'Без ремонта', cosmetic: 'Косметический', euro: 'Евро', designer: 'Дизайнерский' }[prop.renovation] || prop.renovation}
                                            </div>
                                        </div>
                                    )}
                                    {['apartment', 'room'].includes(prop.property_type) && prop.bathroom && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Санузел</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                {{ combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' }[prop.bathroom] || prop.bathroom}
                                            </div>
                                        </div>
                                    )}
                                    {prop.ceiling_height && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Потолки</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.ceiling_height} м</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Подблок 2: О доме / здании */}
                            {['apartment', 'room', 'commercial'].includes(prop.property_type) && (
                                <div style={{ background: 'var(--bg-light)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Building2 size={13} />
                                        {prop.property_type === 'commercial' ? 'О здании' : 'О доме'}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
                                        {prop.build_year && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Год постройки</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.build_year}</div>
                                            </div>
                                        )}
                                        {prop.floors_total && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Этажность</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.floors_total}</div>
                                            </div>
                                        )}
                                        {prop.building_type && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Тип здания</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{BUILDING_TYPES[prop.building_type] || prop.building_type}</div>
                                            </div>
                                        )}
                                        {prop.elevator_type && prop.elevator_type !== 'none' && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Лифт</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                    {{ passenger: 'Пассажирский', cargo: 'Грузовой', both: 'Пасс. + Груз.' }[prop.elevator_type] || prop.elevator_type}
                                                </div>
                                            </div>
                                        )}
                                        {prop.district && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Район</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.district}</div>
                                            </div>
                                        )}
                                        {prop.microdistrict && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>Микрорайон</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.microdistrict}</div>
                                            </div>
                                        )}
                                        {prop.management_company && (
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300 }}>УК</div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{prop.management_company}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── О САДЕ / ДАЧЕ — Характеристики объекта ── */}
                {prop.property_type === 'garden' && (() => {
                    const hasGardenData = Boolean(
                        prop.land_area || 
                        prop.has_house || 
                        prop.road_access || 
                        prop.has_electricity || 
                        prop.has_water || 
                        prop.has_gas || 
                        prop.has_sewage || 
                        prop.has_bathhouse || 
                        prop.has_garage || 
                        prop.has_gazebo || 
                        prop.has_greenhouse || 
                        prop.has_well || 
                        prop.has_summer_kitchen || 
                        prop.has_pond || 
                        (prop.fence_type && prop.fence_type !== 'none') || 
                        prop.garden_notes
                    );

                    if (!hasGardenData) return null;

                    return (
                        <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>

                        {/* Главные показатели (плитки) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: 8, marginBottom: 14 }}>
                            {prop.land_area ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Участок</div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: "'Oswald', sans-serif", marginTop: 2 }}>{prop.land_area}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>соток</div>
                                </div>
                            ) : null}

                            {prop.has_house ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Дом</div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: "'Oswald', sans-serif", marginTop: 2 }}>{prop.house_area || '—'}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>м²{prop.house_floors ? ` · ${prop.house_floors} эт.` : ''}</div>
                                </div>
                            ) : null}

                            {prop.road_access ? (
                                <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Подъезд</div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>
                                        {{ asphalt: 'Асфальт', gravel: 'Гравий', dirt: 'Грунт', none: 'Нет' }[prop.road_access] || prop.road_access}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Подъезд */}
                        {prop.road_access ? (
                            <div style={{ padding: '8px 12px', background: 'var(--bg-light)', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Подъездная дорога</span>
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                    {{ asphalt: 'Асфальт', gravel: 'Гравий/щебень', dirt: 'Грунтовка', none: 'Нет дороги' }[prop.road_access] || prop.road_access}
                                </span>
                            </div>
                        ) : null}

                        {/* Дом детали (если есть) */}
                        {prop.has_house && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'var(--bg-light)', borderRadius: 14, marginBottom: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                                    {prop.house_material && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Материал стен</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
                                                {{ wood: 'Дерево', timber: 'Брус', brick: 'Кирпич', frame: 'Каркас', block: 'Блок' }[prop.house_material] || prop.house_material}
                                            </div>
                                        </div>
                                    )}
                                    {prop.house_condition && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Состояние</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
                                                {{ new: 'Новый', good: 'Хорошее', normal: 'Среднее', renovation: 'Требует ремонта' }[prop.house_condition] || prop.house_condition}
                                            </div>
                                        </div>
                                    )}
                                    {prop.house_build_year && (
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Год постройки</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>{prop.house_build_year} г.</div>
                                        </div>
                                    )}
                                </div>

                                {/* Кадастровый статус дома */}
                                {prop.house_has_cadastre !== undefined && (
                                    <div style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Кадастровый учёт дома:</span>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: prop.house_has_cadastre ? 'var(--success)' : 'var(--text-secondary)' }}>
                                            {prop.house_has_cadastre ? `Стоит на учёте${prop.house_cadastral_number ? `: ${prop.house_cadastral_number}` : ''}` : 'Не оформлен'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Коммуникации (компактные бейджи без смайликов) */}
                        {(prop.has_electricity || prop.has_water || prop.has_gas || prop.has_sewage) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                {prop.has_electricity && (
                                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                                        Электричество{prop.electricity_kw ? ` (${prop.electricity_kw} кВт)` : ''}
                                    </span>
                                )}
                                {prop.has_water && (
                                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}>
                                        {(() => {
                                            const types = Array.isArray(prop.water_types) && prop.water_types.length > 0 
                                                ? prop.water_types 
                                                : (prop.water_type ? [prop.water_type] : []);
                                            const labels = { central: 'центральное', well: 'скважина', pit: 'колодец', summer: 'летний водопровод' };
                                            if (types.length === 0) return 'Водоснабжение';
                                            return `Вода (${types.map(t => labels[t] || t).join(', ')})`;
                                        })()}
                                    </span>
                                )}
                                {prop.has_gas && (
                                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#b91c1c' }}>
                                        Газ{prop.gas_type ? ` (${prop.gas_type === 'main' ? 'магистральный' : 'баллон'})` : ''}
                                    </span>
                                )}
                                {prop.has_sewage && (
                                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(16,185,129,0.08)', color: '#047857' }}>
                                        Канализация{prop.sewage_type ? ` (${{ central: 'центральная', septic: 'септик', pit: 'выгребная яма' }[prop.sewage_type] || prop.sewage_type})` : ''}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Постройки и забор */}
                        {(prop.has_bathhouse || prop.has_garage || prop.has_gazebo || prop.has_greenhouse || prop.has_well || prop.has_summer_kitchen || prop.has_pond || (prop.fence_type && prop.fence_type !== 'none')) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: prop.garden_notes ? 12 : 0 }}>
                                {prop.has_bathhouse && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Баня</span>}
                                {prop.has_garage && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Гараж{prop.garage_area ? ` ${prop.garage_area}м²` : ''}</span>}
                                {prop.has_gazebo && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Беседка</span>}
                                {prop.has_greenhouse && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Теплица</span>}
                                {prop.has_well && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Скважина/Колодец</span>}
                                {prop.has_summer_kitchen && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Летняя кухня</span>}
                                {prop.has_pond && <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>Водоём</span>}
                                {prop.fence_type && prop.fence_type !== 'none' && (
                                    <span style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--bg-light)', fontSize: 12, color: 'var(--text)' }}>
                                        Забор: {{ partial: 'частичный', full_metal: 'металл', full_wood: 'дерево', full_brick: 'кирпич', full_proflist: 'профлист' }[prop.fence_type] || prop.fence_type}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Заметки риэлтора по саду */}
                        {prop.garden_notes && (
                            <div style={{ padding: '10px 12px', background: 'var(--bg-light)', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {prop.garden_notes}
                            </div>
                        )}
                        </div>
                    );
                })()}



                {prop.notes && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 16 }}>Описание</div>
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{prop.notes}</div>
                    </div>
                )}
                
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


                    </div>

                    {/* ── БОКОВАЯ КОЛОНКА (Справа на лаптопе) ── */}
                    <div className="details-col-sidebar">
                {/* ── ДОКУМЕНТЫ И СКАНЕР ЕГРН (ОТДЕЛЬНЫЙ БЛОК) ── */}
                <div className="card" style={{ 
                    padding: '20px 24px', 
                    border: '1px solid rgba(99, 102, 241, 0.15)', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.03)', 
                    borderRadius: 28, 
                    background: 'linear-gradient(135deg, var(--surface) 0%, rgba(99, 102, 241, 0.04) 100%)' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                                width: 40, height: 40, borderRadius: 12, 
                                background: 'rgba(99, 102, 241, 0.12)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#6366f1' 
                            }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className="font-oswald" style={{ fontWeight: 400, fontSize: 17, letterSpacing: '0.01em', color: 'var(--text)' }}>
                                    Выписка ЕГРН и кадастр
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    Распознавание параметров и сверка собственников
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowEgrn(true)}
                            className="card-clickable"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 16px',
                                borderRadius: 12,
                                border: 'none',
                                background: '#6366f1',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Sparkles size={14} />
                            <span>Сканер ЕГРН</span>
                        </button>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                        gap: 10, 
                        padding: '12px 14px', 
                        background: 'var(--bg-light)', 
                        borderRadius: 16 
                    }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Кадастровый номер</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: prop.cadastral_number ? 'var(--text)' : 'var(--text-muted)' }}>
                                    {prop.cadastral_number || 'Не указан'}
                                </span>
                                {prop.cadastral_number && (
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(prop.cadastral_number, 'cadastral')}
                                        style={{ 
                                            border: 'none', 
                                            background: 'transparent', 
                                            cursor: 'pointer', 
                                            color: copiedField === 'cadastral' ? 'var(--success)' : 'var(--primary)', 
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Скопировать кадастровый номер"
                                    >
                                        {copiedField === 'cadastral' ? <Check size={14} /> : <Copy size={13} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Статус проверки</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: prop.cadastral_number ? '#10b981' : '#f59e0b' }}>
                                {prop.cadastral_number ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                <span>{prop.cadastral_number ? 'Кадастр подтвержден' : 'Требуется скан выписки'}</span>
                            </div>
                        </div>
                    </div>
                </div>

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

                {/* New Construction Collection (Temporarily removed per user request) */}
                {/* <NewBuildsSelection currentProp={prop} allProperties={state.properties} onNavigate={navigate} /> */}

                    </div>
                </div>

                {/* ── ИСТОРИЯ ПОКАЗОВ И СОБЫТИЙ (В САМОМ НИЗУ СТРАНИЦЫ) ── */}
                <div className="card" style={{ padding: '24px 28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)', marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                <Calendar size={20} />
                            </div>
                            <div className="font-oswald" style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                История событий и показов ({events.length})
                            </div>
                        </div>
                        <button className="card-clickable" onClick={() => navigate(`/history/new?property_id=${id}`)} style={{ height: 38, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,82,255,0.05)', cursor: 'pointer' }}>
                            <Calendar size={16} />
                            <span>Добавить событие</span>
                        </button>
                    </div>
                    {events.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '28px 0', opacity: 0.7, background: 'var(--bg-light)', borderRadius: 18 }}>Пока нет событий по объекту</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {events.map(ev => {
                                const dateStr = ev.dateObj ? ev.dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
                                const timeStr = ev.dateObj ? ev.dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                const editRoute = `/history/new?id=${ev.id}`;
                                const feedbackText = [ev.feedback, ev.feedback_comment].filter(Boolean).join(' · ');
                                
                                return (
                                    <div key={ev.id} className="card-clickable" style={{ padding: '16px 18px', background: 'var(--bg-light)', borderRadius: 18, border: '1px solid rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => navigate(editRoute)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--primary)', letterSpacing: '0.01em', fontFamily: 'Oswald' }}>{ev.typeLabel}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr} {timeStr}</span>
                                                </div>
                                                {ev.buyer && (
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                                                        {ev.buyer.full_name}
                                                    </div>
                                                )}
                                                {feedbackText && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic', opacity: 0.85 }}>
                                                        «{feedbackText}»
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--primary)', opacity: 0.4, marginLeft: 8 }}>
                                                <Pencil size={15} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

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
                        agent={agent}
                        onClose={() => setShowBannerGen(false)} 
                    />
                )}
                {showAdGen && (
                    <AdGenerator 
                        property={prop}
                        currentUser={state.currentUser}
                        agent={agent}
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
                {showEgrn && (
                    <EgrnScanModal
                        isOpen={showEgrn}
                        onClose={() => setShowEgrn(false)}
                        onApplyProperty={(fields) => {
                            const updates = {};
                            if (fields.address) updates.address = fields.address;
                            if (fields.cadastral_number) updates.cadastral_number = fields.cadastral_number;
                            if (fields.area_total) updates.area_total = fields.area_total;
                            if (fields.property_type) updates.property_type = fields.property_type;
                            if (fields.floor) updates.floor = fields.floor;
                            if (fields.floors_total) updates.floors_total = fields.floors_total;
                            if (fields.egrnNotes && !prop.notes) updates.notes = fields.egrnNotes;
                            dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, ...updates } });
                        }}
                        onApplyOwner={(ownerData) => {
                            // Navigate to new client form with pre-filled data
                            navigate('/clients/new', {
                                state: {
                                    prefill: {
                                        full_name: ownerData.full_name,
                                        inn: ownerData.inn,
                                        passport_details: ownerData.passport_details,
                                        client_types: ['seller'],
                                        source_note: ownerData.source_note,
                                    }
                                }
                            });
                        }}
                    />
                )}
                </div>
            </div>
        );
}

