import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatNumber } from '../../utils/format';
import { 
    Pencil, Trash, Sparkles, Building2, MapPin,
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader, ChevronLeft,
    TrendingDown, Star, User, Handshake, Copy, SlidersHorizontal, ExternalLink, Check
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
import { EgrnScanModal } from '../../components/EgrnScanModal';

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Первоначальный взнос</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input 
                                        type="text"
                                        value={formatNumber(downPayment)}
                                        onChange={e => {
                                            const val = Number(e.target.value.replace(/\D/g, ''));
                                            if (price > 0) {
                                                setDownPaymentPct(Math.min(100, Math.max(0, (val / price) * 100)));
                                            }
                                        }}
                                        style={{ 
                                            width: 90, 
                                            padding: '2px 4px', 
                                            borderRadius: 6, 
                                            border: '1px solid var(--border)', 
                                            textAlign: 'right', 
                                            fontSize: 12,
                                            fontWeight: 600,
                                            background: 'var(--surface)',
                                            color: 'var(--text)'
                                        }}
                                    />
                                    <span>₽</span>
                                    <input 
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        value={Number(downPaymentPct.toFixed(2))}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            if (val >= 0 && val <= 100) setDownPaymentPct(val);
                                        }}
                                        style={{ 
                                            width: 50, 
                                            padding: '2px 4px', 
                                            borderRadius: 6, 
                                            border: '1px solid var(--border)', 
                                            textAlign: 'right', 
                                            fontSize: 12,
                                            fontWeight: 600,
                                            background: 'var(--surface)',
                                            color: 'var(--text)',
                                            marginLeft: 4
                                        }}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                            <input 
                                type="range" 
                                min={5} 
                                max={90} 
                                step={1}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Процентная ставка</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        max={30} 
                                        step={0.01} 
                                        value={interestRate} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            if (val >= 0 && val <= 100) setInterestRate(val);
                                        }} 
                                        style={{ 
                                            width: 60, 
                                            padding: '2px 4px', 
                                            borderRadius: 6, 
                                            border: '1px solid var(--border)', 
                                            textAlign: 'right', 
                                            fontSize: 12,
                                            fontWeight: 600,
                                            background: 'var(--surface)',
                                            color: 'var(--text)'
                                        }}
                                    />
                                    <span>%</span>
                                </div>
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
                const proxyUrl = isCapacitor ? `https://realtor-match.vercel.app/api/ai-proxy` : `/api/ai-proxy`;
                
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
    const matches = state.matches.filter(m => m.property_id === id);
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
                                {prop.district && <span>· р-н {prop.district}</span>}
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
                                    } else if (type === 'garden') {
                                        if (prop.land_area) specs.push(`${prop.land_area} сот.`);
                                        if (prop.snt_name) specs.push(`СНТ ${prop.snt_name}`);
                                        if (prop.has_house && prop.house_area) specs.push(`Дом ${prop.house_area} м²`);
                                    }
                                    if (type !== 'garden' && prop.area_total) specs.push(`${prop.area_total} м²`);
                                    if (['apartment', 'room', 'commercial'].includes(type) && prop.floor) {
                                        specs.push(`${prop.floor}/${prop.floors_total || '—'} эт.`);
                                    } else if (type === 'house' && prop.floors_total) {
                                        specs.push(`${prop.floors_total} эт.`);
                                    }
                                    if (PROPERTY_TYPES[type]) specs.push(PROPERTY_TYPES[type]);

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 42, 
                                borderRadius: 12, 
                                border: 'none',
                                background: 'var(--primary)', 
                                color: '#ffffff', 
                                fontWeight: 500, 
                                fontSize: 14,
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 8,
                                padding: '0 20px',
                                width: '100%',
                                boxShadow: '0 4px 14px rgba(0, 82, 255, 0.25)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                fontFamily: "'Oswald', sans-serif",
                                letterSpacing: '0.02em'
                            }}
                            onClick={handleCreateDeal}
                        >
                            <Handshake size={17} />
                            <span>Создать сделку</span>
                        </button>

                        {/* Marketing & Presentation Tools */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                            width: '100%'
                        }}>
                            <button
                                className="card-clickable"
                                style={{ 
                                    height: 38, 
                                    borderRadius: 10, 
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)', 
                                    color: 'var(--text)', 
                                    fontWeight: 400, 
                                    fontSize: 12,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 6,
                                    padding: '0 8px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onClick={() => setShowAdGen(true)}
                                title="Генератор текста объявления"
                            >
                                <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                                <span>Объявление</span>
                            </button>

                            <button
                                className="card-clickable"
                                style={{ 
                                    height: 38, 
                                    borderRadius: 10, 
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)', 
                                    color: 'var(--text)', 
                                    fontWeight: 400, 
                                    fontSize: 12,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 6,
                                    padding: '0 8px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onClick={() => setShowBannerGen(true)}
                                title="Создать баннер для соцсетей"
                            >
                                <ImageIcon size={14} style={{ color: '#f59e0b' }} />
                                <span>Баннер</span>
                            </button>

                            <button
                                className="card-clickable"
                                style={{ 
                                    height: 38, 
                                    borderRadius: 10, 
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)', 
                                    color: 'var(--text)', 
                                    fontWeight: 400, 
                                    fontSize: 12,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 6,
                                    padding: '0 8px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onClick={() => setShowPortfolio(true)}
                                title="Портфолио и презентация объекта"
                            >
                                <Briefcase size={14} style={{ color: '#8b5cf6' }} />
                                <span>Портфолио</span>
                            </button>

                            <button
                                className="card-clickable"
                                style={{ 
                                    height: 38, 
                                    borderRadius: 10, 
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)', 
                                    color: 'var(--text)', 
                                    fontWeight: 400, 
                                    fontSize: 12,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 6,
                                    padding: '0 8px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onClick={() => setShowCma(true)}
                                title="Сравнительный маркетинговый анализ (СМА)"
                            >
                                <TrendingDown size={14} style={{ color: '#10b981' }} />
                                <span>СМА</span>
                            </button>
                        </div>
                    </div>
                </div>

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
                {prop.property_type !== 'garden' && (
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
                )}

                {/* ── О САДЕ / ДАЧЕ — Компактная карточка объекта ── */}
                {prop.property_type === 'garden' && (
                    <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                                    <Home size={18} />
                                </div>
                                <div>
                                    <div className="font-oswald" style={{ fontWeight: 400, fontSize: 17, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                        {prop.snt_name ? `СНТ «${prop.snt_name}»` : 'Садовый участок'}
                                        {prop.snt_number && <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontWeight: 300 }}>уч. №{prop.snt_number}</span>}
                                    </div>
                                    {(prop.land_category || prop.distance_to_city) && (
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {prop.land_category && ({ snt: 'СНТ', dnt: 'ДНТ', izhs: 'ИЖС', lph: 'ЛПХ', other: 'Другое' }[prop.land_category] || prop.land_category)}
                                            {prop.distance_to_city ? ` · ${prop.distance_to_city} км от города` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                )}



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

                {/* Mortgage Calculator */}
                <MortgageCalculator propertyPrice={prop.price} />

                {/* New Construction Collection (Temporarily removed per user request) */}
                {/* <NewBuildsSelection currentProp={prop} allProperties={state.properties} onNavigate={navigate} /> */}

                    </div>
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

