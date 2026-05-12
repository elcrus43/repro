import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { 
    Pencil, Trash, Sparkles, Building2, Calculator, ExternalLink, 
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader
} from 'lucide-react';


import { PROPERTY_TYPES, BUILDING_TYPES } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { estimateOffline } from '../../utils/estimation';
import { AdGenerator } from '../../components/AdGenerator';



/* ─── Inline Estimation Widget (offline, no backend needed) ─────────────────── */
function EstimationWidget({ prop }) {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [params, setParams] = useState({
        city: prop?.city || 'Киров',
        district: prop?.district || prop?.microdistrict || '',
        rooms: prop?.rooms ?? 1,
        total_area: prop?.area_total || 0,
        deal_type: prop?.deal_type === 'rent' ? 'RENT' : 'SALE',
    });

    // Get all districts + microdistricts for current city
    const districtOptions = params.city === 'Киров'
        ? KIROV_DISTRICTS.flatMap(d => [d.name, ...d.microdistricts])
        : [];

    const calculate = () => {
        const res = estimateOffline(params);
        setResult(res);
    };

    const avgPerM2 = result?.price_per_m2;

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
                onClick={() => setOpen(o => !o)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'var(--primary-light)', padding: 8, borderRadius: 8, color: 'var(--primary)' }}>
                        <Calculator size={18} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Оценка по аналогам</div>
                        {result ? (
                            <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>
                                {result.estimated_avg.toLocaleString()} ₽
                                {params.deal_type === 'RENT' ? '/мес' : ''}
                                &nbsp;·&nbsp;{avgPerM2?.toLocaleString()} ₽/м²
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нажмите для расчёта</div>
                        )}
                    </div>
                </div>
                {open ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>

            {open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-light)' }}>
                    {/* Compact 3-field form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                        {/* City */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Город</label>
                            <select
                                className="form-select"
                                value={params.city}
                                onChange={e => setParams({ ...params, city: e.target.value, district: '' })}
                            >
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* District / Location */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Район / Локация</label>
                            {districtOptions.length > 0 ? (
                                <select
                                    className="form-select"
                                    value={params.district}
                                    onChange={e => setParams({ ...params, district: e.target.value })}
                                >
                                    <option value="">— Выбрать район —</option>
                                    {KIROV_DISTRICTS.map(d => (
                                        <optgroup key={d.name} label={d.name}>
                                            <option value={d.name}>{d.name} (весь район)</option>
                                            {d.microdistricts.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className="form-input"
                                    value={params.district}
                                    onChange={e => setParams({ ...params, district: e.target.value })}
                                    placeholder="Район (необязательно)"
                                />
                            )}
                        </div>

                        {/* Rooms */}
                        <div className="form-group">
                            <label className="form-label">Комнат</label>
                            <select
                                className="form-select"
                                value={params.rooms}
                                onChange={e => setParams({ ...params, rooms: parseInt(e.target.value) })}
                            >
                                <option value={0}>Студия</option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4+</option>
                            </select>
                        </div>

                        {/* Area — optional, use typical if blank */}
                        <div className="form-group">
                            <label className="form-label">Площадь м² <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)' }}>(необ.)</span></label>
                            <input
                                className="form-input"
                                type="number"
                                value={params.total_area || ''}
                                onChange={e => setParams({ ...params, total_area: parseFloat(e.target.value) || 0 })}
                                placeholder="Авто"
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 12 }}
                        onClick={calculate}
                    >
                        <Calculator size={16} /> Рассчитать стоимость
                    </button>

                    {result && (
                        <div style={{ marginTop: 16 }} className="fade-in">
                            {/* Result block */}
                            <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '16px', textAlign: 'center', marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                    Оценочная стоимость {params.deal_type === 'RENT' ? '(аренда/мес)' : '(продажа)'}
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', letterSpacing: -1 }}>
                                    {result.estimated_avg.toLocaleString()} ₽
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <span>от {result.estimated_min.toLocaleString()}</span>
                                    <span>до {result.estimated_max.toLocaleString()}</span>
                                </div>
                                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span className={`badge badge-${result.confidence === 'HIGH' ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>
                                        {result.confidence === 'HIGH' ? '✓ Высокая точность' : '~ Средняя точность'}
                                    </span>
                                    <span className="badge badge-muted" style={{ fontSize: 11 }}>
                                        {result.price_per_m2.toLocaleString()} ₽/м²
                                    </span>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                    Расчёт на основе средних цен {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                </div>
                            </div>

                            {/* Avito search link */}
                            <a
                                href={result.avito_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, textDecoration: 'none' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    window.open(result.avito_url, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <ExternalLink size={16} />
                                Смотреть объявления на Авито
                            </a>

                            {/* Analogs list */}
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                Поиск аналогов на Авито
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {result.analogs.map(a => (
                                    <div
                                        key={a.id}
                                        className="list-row"
                                        onClick={() => window.open(a.source_url, '_blank', 'noopener,noreferrer')}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span className="badge badge-subtle" style={{ fontSize: 11 }}>{a.label}</span>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                                                    {a.price.toLocaleString()} ₽
                                                    {params.deal_type === 'RENT' ? '/мес' : ''}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {typeof a.rooms === 'number' ? `${a.rooms}к` : a.rooms} · {a.total_area} м² · {a.district}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)' }}>
                                            {a.source} <ExternalLink size={10} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                                * Оценка носит справочный характер. Ссылки ведут на поиск Авито по аналогичным параметрам.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── BannerGenerator (Inlined to avoid module issues) ─────────────────────── */
function BannerGenerator({ property, currentUser, onClose }) {
    const canvasRef = React.useRef(null);
    const [format, setFormat] = React.useState('story'); // 'story' (9:16) | 'post' (1:1)
    const [theme, setTheme] = React.useState('light'); // 'light' | 'dark'
    const [design, setDesign] = React.useState('minimal'); // 'classic' | 'minimal' | 'stripe' | 'split'
    const [accentColor, setAccentColor] = React.useState('#0052FF');
    const [stickers, setStickers] = React.useState([]);
    const [customSticker, setCustomSticker] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [imageOffset, setImageOffset] = React.useState(0);

    const STICKER_OPTIONS = ['Срочно', 'Чистая продажа', 'Эксклюзив', 'Торг уместен'];
    const COLOR_OPTIONS = [
        { name: 'Синий', value: '#0052FF' },
        { name: 'Золотой', value: '#D4AF37' },
        { name: 'Зеленый', value: '#2E7D32' },
        { name: 'Красный', value: '#C62828' },
        { name: 'Черный', value: '#1A1A1A' }
    ];

    const formats = {
        story: { width: 1080, height: 1920, label: 'Story (9:16)' },
        post: { width: 1080, height: 1080, label: 'Post (1:1)' }
    };

    React.useEffect(() => {
        renderBanner();
    }, [format, theme, design, property, imageOffset, accentColor, stickers, customSticker]);

    const renderBanner = async () => {
        setLoading(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const config = formats[format];
        canvas.width = config.width;
        canvas.height = config.height;

        // 1. Load Images
        const imageUrls = (property.images && property.images.length > 0) 
            ? property.images 
            : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'];
        
        const loadedImages = [];
        const numImages = imageUrls.length;
        for (let i = 0; i < Math.min(numImages, 3); i++) {
            const index = (i + imageOffset) % numImages;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrls[index];
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            if (img.width > 0) loadedImages.push(img);
        }

        if (loadedImages.length === 0) {
            setLoading(false);
            return;
        }

        const isDark = theme === 'dark';
        ctx.fillStyle = isDark ? '#111111' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawCover = (img, x, y, w, h) => {
            const imgRatio = img.width / img.height;
            const canvasRatio = w / h;
            let drawW, drawH, drawX, drawY;

            if (imgRatio > canvasRatio) {
                drawH = h;
                drawW = h * imgRatio;
                drawX = x - (drawW - w) / 2;
                drawY = y;
            } else {
                drawW = w;
                drawH = w / imgRatio;
                drawX = x;
                drawY = y - (drawH - h) / 2;
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
        };

        if (design === 'classic') {
            if (loadedImages.length >= 3) {
                const topH = canvas.height * 0.6;
                const bottomH = canvas.height * 0.4;
                drawCover(loadedImages[0], 0, 0, canvas.width, topH);
                drawCover(loadedImages[1], 0, topH, canvas.width / 2, bottomH);
                drawCover(loadedImages[2], canvas.width / 2, topH, canvas.width / 2, bottomH);
                
                ctx.strokeStyle = isDark ? '#111' : '#fff';
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, topH); ctx.lineTo(canvas.width, topH);
                ctx.moveTo(canvas.width / 2, topH); ctx.lineTo(canvas.width / 2, canvas.height);
                ctx.stroke();
            } else if (loadedImages.length === 2) {
                drawCover(loadedImages[0], 0, 0, canvas.width, canvas.height / 2);
                drawCover(loadedImages[1], 0, canvas.height / 2, canvas.width, canvas.height / 2);
                
                ctx.strokeStyle = isDark ? '#111' : '#fff';
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            } else {
                drawCover(loadedImages[0], 0, 0, canvas.width, canvas.height);
            }

            if (format === 'story') {
                renderClassicStoryOverlay(ctx, canvas);
            } else {
                renderClassicPostOverlay(ctx, canvas);
            }
        } else if (design === 'minimal') {
            const padding = format === 'story' ? 50 : 40;
            const textSpace = format === 'story' ? 460 : 320;
            const photoAreaH = canvas.height - textSpace - padding;

            if (loadedImages.length >= 3) {
                const mainH = photoAreaH * 0.65;
                const subH = photoAreaH * 0.35 - (padding/2);
                drawCover(loadedImages[0], padding, padding, canvas.width - padding*2, mainH);
                drawCover(loadedImages[1], padding, padding + mainH + (padding/2), canvas.width/2 - padding*1.25, subH);
                drawCover(loadedImages[2], canvas.width/2 + (padding*0.25), padding + mainH + (padding/2), canvas.width/2 - padding*1.25, subH);
            } else if (loadedImages.length === 2) {
                drawCover(loadedImages[0], padding, padding, canvas.width - padding*2, photoAreaH/2 - (padding/2));
                drawCover(loadedImages[1], padding, padding + photoAreaH/2 + (padding/2), canvas.width - padding*2, photoAreaH/2 - (padding/2));
            } else {
                drawCover(loadedImages[0], padding, padding, canvas.width - padding*2, photoAreaH);
            }

            renderMinimalText(ctx, canvas, textSpace);
        } else if (design === 'stripe') {
            // STRIPE: collage photos (main + thumbnails) + accent stripe at bottom
            renderStripeOverlay(ctx, canvas, loadedImages, drawCover);
        } else if (design === 'split') {
            // SPLIT: left = photo(s) + gradient, right = dark/light panel with accent text
            const splitX = Math.round(canvas.width * 0.55);
            renderSplitOverlay(ctx, canvas, splitX, loadedImages, drawCover);
        }

        // Draw Stickers
        if (stickers.length > 0) {
            renderStickers(ctx, canvas);
        }

        setLoading(false);
    };

    const renderStickers = (ctx, canvas) => {
        const padding = format === 'story' ? 60 : 45; // Increased padding from edge
        const stickerH = format === 'story' ? 70 : 50;
        const fontSize = format === 'story' ? 32 : 24;
        let stickerY = padding + 20;

        const allStickers = [...stickers];
        if (customSticker.trim()) allStickers.push(customSticker.trim());

        allStickers.forEach(text => {
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            const textW = ctx.measureText(text.toUpperCase()).width;
            const boxW = textW + 40;

            ctx.fillStyle = accentColor;
            // Draw pill shape with shadow
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
            ctx.beginPath();
            ctx.roundRect(canvas.width - padding - boxW, stickerY, boxW, stickerH, 12);
            ctx.fill();
            ctx.shadowColor = 'transparent';

            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(text.toUpperCase(), canvas.width - padding - (boxW/2), stickerY + (stickerH/2) + (fontSize/3));
            stickerY += stickerH + 15;
        });
        ctx.textAlign = 'left'; // Reset
    };

    const getCleanAddress = () => {
        let addr = property.address || property.city || 'Объект недвижимости';
        addr = addr.replace(/,\s*кв\.?\s*\d+/i, '').replace(/\s*кв\.?\s*\d+/i, '').trim();
        return addr;
    };

    const translateRenovation = (r) => {
        const mapping = {
            'cosmetic': 'Косметический ремонт',
            'designer': 'Дизайнерский ремонт',
            'euro': 'Евроремонт',
            'needs_repair': 'Требует ремонта',
            'good': 'Хорошее состояние'
        };
        return mapping[r] || r;
    };

    const renderMinimalText = (ctx, canvas, textSpace) => {
        const w = canvas.width;
        const h = canvas.height;
        const isDark = theme === 'dark';
        const textColor1 = isDark ? '#FFFFFF' : '#1A1A1A';
        const textColor2 = isDark ? '#AAAAAA' : '#666666';
        const brandColor = accentColor;
        
        const padding = format === 'story' ? 50 : 40;
        const gap = format === 'story' ? 60 : 40;
        let currentY = h - textSpace + gap; 
        
        // Price
        ctx.fillStyle = brandColor;
        let priceSize = format === 'story' ? 90 : 70;
        ctx.font = `900 ${priceSize}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceWidth = ctx.measureText(priceText).width;
        
        // Shrink price font if it's too long to fit with m2 price
        const maxPriceWidth = w - padding * 2 - 250;
        if (priceWidth > maxPriceWidth) {
            priceSize = priceSize * (maxPriceWidth / priceWidth);
            ctx.font = `900 ${priceSize}px Oswald, Inter, sans-serif`;
            priceWidth = ctx.measureText(priceText).width;
        }

        currentY += priceSize;
        ctx.fillText(priceText, padding, currentY);
        
        // Price per m2 (always to the right)
        if (property.price && property.area_total) {
            const m2Price = Math.round(property.price / property.area_total);
            ctx.fillStyle = brandColor;
            const m2Size = priceSize / 2.2;
            ctx.font = `600 ${m2Size}px Oswald, Inter, sans-serif`;
            // If main price is too long, put m2 price on next line
            if (padding + priceWidth + 250 > w) {
                currentY += m2Size + 10;
                ctx.fillText(`${formatNumber(m2Price)} ₽/м²`, padding, currentY);
            } else {
                ctx.fillText(`— ${formatNumber(m2Price)} ₽/м²`, padding + priceWidth + 20, currentY - 5);
            }
        }

        // Address
        const addressGap = format === 'story' ? 30 : 20;
        const addressSize = format === 'story' ? 50 : 36;
        currentY += addressGap + addressSize;
        ctx.fillStyle = textColor1;
        ctx.font = `800 ${addressSize}px Oswald, Inter, sans-serif`;
        const address = getCleanAddress();
        ctx.fillText(address.slice(0, 45) + (address.length > 45 ? '...' : ''), padding, currentY);

        // Details grid
        const detailsGap = format === 'story' ? 30 : 20;
        const detailsSize = format === 'story' ? 32 : 22;
        currentY += detailsGap + detailsSize;
        
        const details = [];
        if (property.rooms !== undefined) details.push(`${property.rooms === 0 ? 'Студия' : property.rooms + '-комн.'}`);
        if (property.area_total) details.push(`${property.area_total} м²`);
        if (property.floor) details.push(`${property.floor}/${property.floors_total || '?'} эт.`);
        if (property.renovation) details.push(`${translateRenovation(property.renovation)}`);
        
        let detX = padding;
        details.forEach((txt) => {
            const textW = ctx.measureText(txt).width;
            // Wrap to next line if details are too long
            if (detX + textW + 40 > w - padding) {
                detX = padding;
                currentY += detailsSize + 10;
            }
            
            ctx.fillStyle = brandColor;
            ctx.beginPath(); ctx.arc(detX + 8, currentY - (detailsSize/3), 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = textColor1;
            ctx.font = `600 ${detailsSize}px Oswald, Inter, sans-serif`;
            ctx.fillText(txt, detX + 25, currentY);
            detX += textW + 60;
        });

        // CTA
        const ctaGap = format === 'story' ? 60 : 40;
        const ctaSize = format === 'story' ? 28 : 20;
        const phoneSize = format === 'story' ? 46 : 32;
        currentY += ctaGap + phoneSize;

        ctx.fillStyle = textColor2;
        ctx.font = `500 ${ctaSize}px Oswald, Inter, sans-serif`;
        ctx.fillText('СВЯЗАТЬСЯ:', padding, currentY);
        const ctaWidth = ctx.measureText('СВЯЗАТЬСЯ: ').width;

        ctx.fillStyle = brandColor;
        ctx.font = `900 ${phoneSize}px Oswald, Inter, sans-serif`;
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        ctx.fillText(phone, padding + ctaWidth + 10, currentY);

        if (currentUser?.full_name) {
            ctx.fillStyle = textColor1;
            ctx.font = `700 ${ctaSize}px Oswald, Inter, sans-serif`;
            ctx.fillText(currentUser.full_name, padding, currentY + (ctaSize * 1.5));
        }
    };

    const renderClassicStoryOverlay = (ctx, canvas) => {
        const w = canvas.width;
        const h = canvas.height;
        const isDark = theme === 'dark';
        const gradColor = isDark ? '0,0,0' : '255,255,255';
        const textColor1 = isDark ? '#FFFFFF' : '#1A1A1A';
        const textColor2 = isDark ? '#CCCCCC' : '#333333';
        const brandColor = accentColor;

        const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        topGrad.addColorStop(0, `rgba(${gradColor},0.95)`);
        topGrad.addColorStop(0.7, `rgba(${gradColor},0.7)`);
        topGrad.addColorStop(1, `rgba(${gradColor},0)`);
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, h * 0.4);

        let currentY = 140;
        ctx.fillStyle = brandColor;
        let priceF = 110;
        ctx.font = `900 ${priceF}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;

        // Shrink if needed
        if (priceW > w - 160 - 300) {
            priceF = priceF * ((w - 160 - 300) / priceW);
            ctx.font = `900 ${priceF}px Oswald, Inter, sans-serif`;
            priceW = ctx.measureText(priceText).width;
        }
        
        ctx.fillText(priceText, 80, currentY);

        if (property.price && property.area_total) {
            const m2Price = Math.round(property.price / property.area_total);
            ctx.fillStyle = brandColor;
            ctx.font = `600 ${priceF * 0.4}px Oswald, Inter, sans-serif`;
            ctx.fillText(`${formatNumber(m2Price)} ₽/м²`, 80 + priceW + 30, currentY - (priceF * 0.1));
        }

        currentY += 90;
        ctx.fillStyle = textColor1;
        ctx.font = '800 65px Oswald, Inter, sans-serif';
        const address = getCleanAddress();
        ctx.fillText(address.slice(0, 30) + (address.length > 30 ? '...' : ''), 80, currentY);

        currentY += 50;
        ctx.fillStyle = brandColor;
        ctx.fillRect(80, currentY, 120, 8);

        ctx.fillStyle = textColor2;
        ctx.font = '600 38px Oswald, Inter, sans-serif';
        
        let startY = currentY + 80;
        const details = [];
        if (property.rooms !== undefined) details.push(`Формат: ${property.rooms === 0 ? 'Студия' : property.rooms + '-комнатная'}`);
        if (property.area_total) details.push(`Общая площадь: ${property.area_total} м²`);
        if (property.floor) details.push(`Этаж: ${property.floor} из ${property.floors_total || '?'}`);
        if (property.renovation) details.push(`Ремонт: ${translateRenovation(property.renovation)}`);

        details.forEach((txt, i) => {
            ctx.fillStyle = brandColor;
            ctx.beginPath(); ctx.arc(95, startY + (i * 55) - 12, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = textColor1;
            ctx.fillText(txt, 130, startY + (i * 55));
        });

        const bottomGrad = ctx.createLinearGradient(0, h - 350, 0, h);
        bottomGrad.addColorStop(0, `rgba(${gradColor},0)`);
        bottomGrad.addColorStop(0.4, `rgba(${gradColor},0.85)`);
        bottomGrad.addColorStop(1, `rgba(${gradColor},1)`);
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, h - 350, w, 350);

        ctx.fillStyle = textColor2;
        ctx.font = '500 28px Oswald, Inter, sans-serif';
        ctx.fillText('УЗНАТЬ ПОДРОБНЕЕ:', 80, h - 210);

        ctx.fillStyle = brandColor;
        ctx.font = '900 48px Oswald, Inter, sans-serif';
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        ctx.fillText(phone, 80, h - 150);

        if (currentUser?.full_name) {
            ctx.fillStyle = textColor1;
            ctx.font = '700 32px Oswald, Inter, sans-serif';
            ctx.fillText(currentUser.full_name, 80, h - 110);
        }
    };

    const renderClassicPostOverlay = (ctx, canvas) => {
        const w = canvas.width;
        const h = canvas.height;
        const isDark = theme === 'dark';
        const gradColor = isDark ? '0,0,0' : '255,255,255';
        const textColor1 = isDark ? '#FFFFFF' : '#1A1A1A';
        const textColor2 = isDark ? '#CCCCCC' : '#333333';
        const brandColor = accentColor;

        const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        topGrad.addColorStop(0, `rgba(${gradColor},0.95)`);
        topGrad.addColorStop(0.7, `rgba(${gradColor},0.7)`);
        topGrad.addColorStop(1, `rgba(${gradColor},0)`);
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, h * 0.5);

        let currentY = 100;
        ctx.fillStyle = brandColor;
        let priceF = 80;
        ctx.font = `900 ${priceF}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;

        // Shrink if needed
        if (priceW > w - 120 - 250) {
            priceF = priceF * ((w - 120 - 250) / priceW);
            ctx.font = `900 ${priceF}px Oswald, Inter, sans-serif`;
            priceW = ctx.measureText(priceText).width;
        }

        ctx.fillText(priceText, 60, currentY);

        if (property.price && property.area_total) {
            const m2Price = Math.round(property.price / property.area_total);
            ctx.fillStyle = brandColor;
            ctx.font = `600 ${priceF * 0.4}px Oswald, Inter, sans-serif`;
            ctx.fillText(`${formatNumber(m2Price)} ₽/м²`, 60 + priceW + 20, currentY - (priceF * 0.1));
        }

        currentY += 60;
        ctx.fillStyle = textColor1;
        ctx.font = '800 45px Oswald, Inter, sans-serif';
        const address = getCleanAddress();
        ctx.fillText(address.slice(0, 35) + (address.length > 35 ? '...' : ''), 60, currentY);

        currentY += 40;
        ctx.fillStyle = brandColor;
        ctx.fillRect(60, currentY, 100, 6);

        ctx.fillStyle = textColor2;
        ctx.font = '600 28px Oswald, Inter, sans-serif';
        
        let startY = currentY + 60;
        const details = [];
        if (property.rooms !== undefined) details.push(`${property.rooms === 0 ? 'Студия' : property.rooms + '-комн.'}`);
        if (property.area_total) details.push(`${property.area_total} м²`);
        if (property.floor) details.push(`${property.floor}/${property.floors_total || '?'} эт.`);
        if (property.renovation) details.push(`${translateRenovation(property.renovation)}`);
        
        details.forEach((txt, i) => {
            ctx.fillStyle = brandColor;
            ctx.beginPath(); ctx.arc(75, startY + (i * 40) - 8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = textColor1;
            ctx.fillText(txt, 100, startY + (i * 40));
        });

        const bottomGrad = ctx.createLinearGradient(0, h - 250, 0, h);
        bottomGrad.addColorStop(0, `rgba(${gradColor},0)`);
        bottomGrad.addColorStop(0.4, `rgba(${gradColor},0.85)`);
        bottomGrad.addColorStop(1, `rgba(${gradColor},1)`);
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, h - 250, w, 250);

        ctx.fillStyle = textColor2;
        ctx.font = '500 20px Oswald, Inter, sans-serif';
        ctx.fillText('УЗНАТЬ ПОДРОБНЕЕ:', 60, h - 100);

        ctx.fillStyle = brandColor;
        ctx.font = '900 34px Oswald, Inter, sans-serif';
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        ctx.fillText(phone, 60, h - 55);
    };

    const renderStripeOverlay = (ctx, canvas, imgs, drawCover) => {
        const w = canvas.width;
        const h = canvas.height;
        const pad = format === 'story' ? 16 : 12;

        // ── Photo area layout ──────────────────────────────────────────────
        // Bottom stripe height
        const stripeH = format === 'story' ? 520 : 380;
        const photoH = h - stripeH;

        if (imgs.length >= 3) {
            // Main photo left, 2 thumbnails stacked right
            const mainW = Math.round(w * 0.66);
            const thumbW = w - mainW - pad;
            const thumbH = Math.round((photoH - pad) / 2);
            drawCover(imgs[0], 0, 0, mainW - pad / 2, photoH);
            drawCover(imgs[1], mainW + pad / 2, 0, thumbW, thumbH);
            drawCover(imgs[2], mainW + pad / 2, thumbH + pad, thumbW, thumbH);
        } else if (imgs.length === 2) {
            const halfW = Math.round((w - pad) / 2);
            drawCover(imgs[0], 0, 0, halfW, photoH);
            drawCover(imgs[1], halfW + pad, 0, halfW, photoH);
        } else {
            drawCover(imgs[0], 0, 0, w, photoH);
        }

        // ── Accent stripe separator ────────────────────────────────────────
        const accentBarH = format === 'story' ? 12 : 8;
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, photoH, w, accentBarH);

        // ── Bottom text panel ──────────────────────────────────────────────
        const isDark = theme === 'dark';
        const panelBg = isDark ? '#111111' : '#FFFFFF';
        ctx.fillStyle = panelBg;
        ctx.fillRect(0, photoH + accentBarH, w, stripeH - accentBarH);

        const textColor1 = isDark ? '#FFFFFF' : '#1A1A1A';
        const textColor2 = isDark ? '#888888' : '#666666';
        const px = format === 'story' ? 70 : 50;

        let y = photoH + accentBarH + (format === 'story' ? 100 : 70);

        // Price
        const priceSize = format === 'story' ? 108 : 78;
        ctx.font = `900 ${priceSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;
        if (priceW > w - px * 2 - 260) {
            const s = (w - px * 2 - 260) / priceW;
            ctx.font = `900 ${priceSize * s}px Oswald, Inter, sans-serif`;
            priceW = ctx.measureText(priceText).width;
        }
        ctx.fillText(priceText, px, y);

        // m² price inline
        if (property.price && property.area_total) {
            const m2Price = Math.round(property.price / property.area_total);
            const m2Size = format === 'story' ? 34 : 24;
            ctx.font = `600 ${m2Size}px Oswald, Inter, sans-serif`;
            ctx.fillStyle = textColor2;
            ctx.fillText(`${formatNumber(m2Price)} ₽/м²`, px + priceW + 20, y - 8);
        }

        y += format === 'story' ? 22 : 16;

        // Divider
        ctx.fillStyle = accentColor;
        ctx.fillRect(px, y, format === 'story' ? 100 : 70, format === 'story' ? 6 : 4);
        y += format === 'story' ? 56 : 38;

        // Address
        const addrSize = format === 'story' ? 52 : 36;
        ctx.font = `700 ${addrSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor1;
        const address = getCleanAddress();
        ctx.fillText(address.slice(0, 40) + (address.length > 40 ? '...' : ''), px, y);
        y += format === 'story' ? 56 : 40;

        // Details row
        const detSize = format === 'story' ? 36 : 26;
        ctx.font = `500 ${detSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor2;
        const parts = [];
        if (property.rooms !== undefined) parts.push(property.rooms === 0 ? 'Студия' : `${property.rooms}-комн.`);
        if (property.area_total) parts.push(`${property.area_total} м²`);
        if (property.floor) parts.push(`${property.floor}/${property.floors_total || '?'} эт.`);
        if (property.renovation) parts.push(translateRenovation(property.renovation));
        ctx.fillText(parts.join('  ·  '), px, y);
        y += format === 'story' ? 70 : 50;

        // Phone
        const phoneSize = format === 'story' ? 52 : 36;
        ctx.font = `500 ${phoneSize * 0.55}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor2;
        ctx.fillText('СВЯЗАТЬСЯ:', px, y);
        y += format === 'story' ? 58 : 42;
        ctx.font = `900 ${phoneSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText(currentUser?.phone || '+7 (999) 000-00-00', px, y);
        if (currentUser?.full_name) {
            y += format === 'story' ? 48 : 36;
            ctx.font = `600 ${phoneSize * 0.55}px Oswald, Inter, sans-serif`;
            ctx.fillStyle = textColor2;
            ctx.fillText(currentUser.full_name, px, y);
        }
    };


    const renderSplitOverlay = (ctx, canvas, splitX, imgs, drawCover) => {
        const w = canvas.width;
        const h = canvas.height;
        const isDark = theme === 'dark';
        const pad = format === 'story' ? 16 : 12;

        // ── Left: photos with gradient overlay ────────────────────────────
        if (imgs.length >= 3) {
            const mainH = Math.round(h * 0.62);
            const thumbH = h - mainH - pad;
            const thumbW = Math.round((splitX - pad) / 2);
            drawCover(imgs[0], 0, 0, splitX, mainH);
            drawCover(imgs[1], 0, mainH + pad, thumbW, thumbH);
            drawCover(imgs[2], thumbW + pad, mainH + pad, thumbW, thumbH);
        } else if (imgs.length === 2) {
            const halfH = Math.round((h - pad) / 2);
            drawCover(imgs[0], 0, 0, splitX, halfH);
            drawCover(imgs[1], 0, halfH + pad, splitX, halfH);
        } else {
            drawCover(imgs[0], 0, 0, splitX, h);
        }

        // Gradient over left panel: right-to-left fade to hide hard edge
        const fadeGrad = ctx.createLinearGradient(splitX * 0.5, 0, splitX, 0);
        fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        fadeGrad.addColorStop(1, isDark ? 'rgba(17,17,17,0.55)' : 'rgba(255,255,255,0.45)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, 0, splitX, h);

        // Bottom-up gradient on left (for any bottom text/overlap)
        const bottomFade = ctx.createLinearGradient(0, h * 0.7, 0, h);
        bottomFade.addColorStop(0, 'rgba(0,0,0,0)');
        bottomFade.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = bottomFade;
        ctx.fillRect(0, 0, splitX, h);

        // ── Right: panel with accent color ────────────────────────────────
        // Background: dark or light depending on theme
        const panelBg = isDark ? '#111111' : '#FFFFFF';
        ctx.fillStyle = panelBg;
        ctx.fillRect(splitX, 0, w - splitX, h);

        // Thin accent border on left edge of panel
        ctx.fillStyle = accentColor;
        ctx.fillRect(splitX, 0, format === 'story' ? 8 : 6, h);

        // ── Text in right panel ───────────────────────────────────────────
        const textColor1 = isDark ? '#FFFFFF' : '#1A1A1A';
        const textColor2 = isDark ? '#888888' : '#666666';
        const px = splitX + (format === 'story' ? 56 : 40);
        const panelW = w - splitX;
        const availW = panelW - (format === 'story' ? 80 : 60);

        let y = format === 'story' ? 200 : 160;

        // Price
        const priceSize = format === 'story' ? 90 : 64;
        ctx.font = `900 ${priceSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;
        if (priceW > availW) {
            const s = availW / priceW;
            ctx.font = `900 ${priceSize * s}px Oswald, Inter, sans-serif`;
            priceW = ctx.measureText(priceText).width;
        }
        ctx.fillText(priceText, px, y);
        y += format === 'story' ? 16 : 12;

        // m² price
        if (property.price && property.area_total) {
            const m2Price = Math.round(property.price / property.area_total);
            const m2Size = format === 'story' ? 32 : 22;
            ctx.font = `600 ${m2Size}px Oswald, Inter, sans-serif`;
            ctx.fillStyle = textColor2;
            y += m2Size + (format === 'story' ? 6 : 4);
            ctx.fillText(`${formatNumber(m2Price)} ₽/м²`, px, y);
        }

        // Accent underline
        y += format === 'story' ? 28 : 20;
        ctx.fillStyle = accentColor;
        ctx.fillRect(px, y, format === 'story' ? 80 : 60, format === 'story' ? 6 : 4);
        y += format === 'story' ? 50 : 36;

        // Address with word-wrap
        const addrSize = format === 'story' ? 44 : 30;
        ctx.font = `700 ${addrSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor1;
        const words = getCleanAddress().split(' ');
        let line = '';
        words.forEach(word => {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > availW && line) {
                ctx.fillText(line, px, y); y += addrSize + (format === 'story' ? 10 : 6); line = word;
            } else { line = test; }
        });
        if (line) { ctx.fillText(line, px, y); y += addrSize + (format === 'story' ? 10 : 6); }

        // Details — each on own line with accent bullet
        y += format === 'story' ? 20 : 14;
        const detSize = format === 'story' ? 34 : 24;
        ctx.font = `500 ${detSize}px Oswald, Inter, sans-serif`;
        const detParts = [];
        if (property.rooms !== undefined) detParts.push(property.rooms === 0 ? 'Студия' : `${property.rooms}-комн.`);
        if (property.area_total) detParts.push(`${property.area_total} м²`);
        if (property.floor) detParts.push(`${property.floor}/${property.floors_total || '?'} эт.`);
        if (property.renovation) detParts.push(translateRenovation(property.renovation));
        detParts.forEach(p => {
            // Accent dot
            ctx.fillStyle = accentColor;
            ctx.beginPath(); ctx.arc(px + 7, y - detSize * 0.28, format === 'story' ? 7 : 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = textColor1;
            ctx.fillText(p, px + (format === 'story' ? 26 : 20), y);
            y += detSize + (format === 'story' ? 14 : 10);
        });

        // Phone block at bottom
        const phoneSize = format === 'story' ? 48 : 34;
        const phoneY = h - (format === 'story' ? 200 : 150);
        ctx.font = `500 ${phoneSize * 0.5}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor2;
        ctx.fillText('СВЯЗАТЬСЯ:', px, phoneY - (format === 'story' ? 16 : 10));
        ctx.font = `900 ${phoneSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText(currentUser?.phone || '+7 (999) 000-00-00', px, phoneY + phoneSize * 0.85);
        if (currentUser?.full_name) {
            ctx.font = `600 ${phoneSize * 0.52}px Oswald, Inter, sans-serif`;
            ctx.fillStyle = textColor2;
            ctx.fillText(currentUser.full_name, px, phoneY + phoneSize * 1.6);
        }
    };


    const download = () => {
        const link = document.createElement('a');
        link.download = `banner-${property.id}-${format}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, 
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(25px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, color: 'white'
        }}>
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 12 }}>
                <button className="icon-btn" onClick={onClose} style={{ background: 'white', color: 'black', width: 44, height: 44 }}><X size={24} /></button>
            </div>

            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                gap: 20, width: '100%', maxWidth: 1200, 
                height: window.innerWidth < 768 ? 'auto' : '85vh', 
                alignItems: 'flex-start',
                overflowY: window.innerWidth < 768 ? 'auto' : 'visible'
            }}>
                {/* Left Panel: Controls */}
                <div style={{ 
                    flex: window.innerWidth < 768 ? 'none' : '0 0 350px', 
                    width: window.innerWidth < 768 ? '100%' : 'auto',
                    background: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, 
                    overflowY: 'auto', maxHeight: window.innerWidth < 768 ? 'none' : '100%' 
                }}>
                    <h3 style={{ marginBottom: 20, fontFamily: 'Oswald', letterSpacing: 1 }}>НАСТРОЙКИ БАННЕРА</h3>
                    
                    {/* Format & Design */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Формат</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <button className={`btn ${format === 'story' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setFormat('story')}>Story (9:16)</button>
                            <button className={`btn ${format === 'post' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setFormat('post')}>Post (1:1)</button>
                        </div>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Стиль дизайна</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <button className={`btn ${design === 'classic' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setDesign('classic')}>🖼 Классика</button>
                            <button className={`btn ${design === 'minimal' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setDesign('minimal')}>📋 Паспарту</button>
                            <button className={`btn ${design === 'stripe' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setDesign('stripe')}>⚡ Полоса</button>
                            <button className={`btn ${design === 'split' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '8px' }} onClick={() => setDesign('split')}>◧ Сплит</button>
                        </div>
                    </div>

                    {/* Accent Color */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Акцентный цвет</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {COLOR_OPTIONS.map(c => (
                                <button 
                                    key={c.value}
                                    onClick={() => setAccentColor(c.value)}
                                    style={{ 
                                        width: 40, height: 40, borderRadius: '50%', background: c.value, border: accentColor === c.value ? '3px solid white' : 'none', cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Stickers */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Стикеры преимуществ</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {STICKER_OPTIONS.map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setStickers(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                    style={{ 
                                        padding: '6px 10px', borderRadius: 8, fontSize: 10, border: 'none', cursor: 'pointer',
                                        background: stickers.includes(s) ? accentColor : 'rgba(255,255,255,0.1)',
                                        color: 'white', fontWeight: 600
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Свой текст на стикер..." 
                            value={customSticker}
                            onChange={(e) => setCustomSticker(e.target.value)}
                            style={{ 
                                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 12, outline: 'none'
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 40 }}>
                        <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setImageOffset(o => o + 1)}>Другие фото</button>
                        <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Темная тема' : 'Светлая тема'}</button>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div style={{ 
                    flex: 1, height: window.innerWidth < 768 ? '500px' : '100%', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    marginTop: window.innerWidth < 768 ? 20 : 0,
                    width: '100%'
                }}>
                    <div style={{ 
                        position: 'relative', 
                        height: '100%', 
                        aspectRatio: formats[format].width / formats[format].height,
                        boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
                        borderRadius: 0, overflow: 'hidden',
                        background: '#111', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                                <Loader size={30} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        )}
                    </div>
                    
                    <button className="btn btn-primary" onClick={download} style={{ marginTop: 32, padding: '18px 60px', borderRadius: 20, fontSize: 18, fontWeight: 900, boxShadow: `0 10px 30px -10px ${accentColor}` }}>
                        СКАЧАТЬ БАННЕР
                    </button>
                </div>
            </div>
        </div>
    );
}

import { PortfolioSection } from '../../components/PortfolioSection';

/* ─── DetailsPage ────────────────────────────────────────────────────────────── */

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const [showBannerGen, setShowBannerGen] = useState(false);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [showGallery, setShowGallery] = useState(false);


    const navigate = useNavigate();
    const prop = state.properties.find(p => p.id === id);
    const agent = state.profiles.find(p => p.id === prop?.realtor_id);
    const clients = state.clients.filter(c => (prop?.client_ids || [prop?.client_id]).includes(c.id));
    const matches = state.matches.filter(m => m.property_id === id);
    const showings = state.showings.filter(s => s.property_id === id);

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
        <div className="page">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Объект не найден</span>
            </div>
        </div>
    );

    const statusLabels = { active: 'В продаже', paused: 'Пауза', deal_closed: 'Продано', refused: 'Снято' };
    const statusColors = { active: 'lime', paused: 'blue', deal_closed: 'green', refused: 'red' };
    const status = prop.status || 'active';

    function handleDelete() {
        if (window.confirm('Удалить этот объект?')) {
            dispatch({ type: 'DELETE_PROPERTY', id });
            navigate('/properties');
        }
    }

    // Initials helper
    const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Карточка объекта</span>
                <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => setShowBannerGen(true)} title="Создать баннер" style={{ padding: '6px 12px', height: 36, borderRadius: 10, fontSize: 13, textTransform: 'none' }}>
                        <ImageIcon size={18} />
                        <span style={{ marginLeft: 6, fontWeight: 700 }}>Баннер</span>
                    </button>
                    <button className="icon-btn" onClick={() => navigate(`/properties/${id}/edit`)}><Pencil size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash size={18} /></button>
                </div>

            </div>

            <div className="page-content">
                {/* Header Card — Redesigned with Square Image */}
                <div className="card" style={{ padding: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 100, height: 100, borderRadius: 16, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <img 
                            src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80'} 
                            alt="Object" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', letterSpacing: -0.5 }}>{formatNumber(prop.price)} ₽</div>
                            <span className={`badge badge-${statusColors[status]}`} style={{ fontSize: 10, padding: '2px 8px' }}>{statusLabels[status]}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(prop.address || prop.city || '—').split(', кв.')[0].split(' кв.')[0]}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                            {prop.rooms === 0 ? 'Студия' : `${prop.rooms}-к`} · {prop.area_total} м² · {prop.floor}/{prop.floors_total} эт
                        </div>

                        {agent && (
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, 
                                padding: '4px 8px', background: 'var(--bg-light)', borderRadius: 6,
                                width: 'fit-content'
                            }}>
                                <div style={{ 
                                    width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)',
                                    color: 'white', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800
                                }}>
                                    {initials(agent.full_name)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Агент: <span style={{ color: 'var(--text)' }}>{agent.full_name}</span>
                                </div>
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                style={{ 
                                    padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none',
                                    background: 'var(--primary)', color: 'white', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                                }}
                                onClick={() => navigate(`/matches?property_id=${id}`)}
                            >
                                <Sparkles size={14} /> Совпадения ({matches.length})
                            </button>
                            <button
                                style={{ 
                                    padding: '6px 12px', fontSize: 12, borderRadius: 8, border: '1px solid var(--primary)',
                                    background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                                }}
                                onClick={() => setShowPortfolio(true)}
                            >
                                <Briefcase size={14} /> Портфолио
                            </button>
                        </div>
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
                                    <div key={index} style={{ width: 'calc(50% - 4px)', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                        <img src={url} alt={`Фото ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} />
                                    </div>
                                ))}
                            </div>
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
                                        background: 'var(--border)', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5,
                                    }}>
                                        {initials(c.full_name)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{c.full_name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* ── О ДОМЕ ────────────────────────────────────────── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ background: 'var(--primary-light)', padding: 6, borderRadius: 6, color: 'var(--primary)' }}>
                            <Building2 size={16} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>О доме</div>
                    </div>
                    
                    <div className="info-grid" style={{ padding: '8px 16px' }}>
                        {prop.build_year && (
                            <div className="info-row">
                                <span className="info-key"><Calendar size={14} style={{ marginRight: 6 }} /> Год постройки</span>
                                <span className="info-val">{prop.build_year}</span>
                            </div>
                        )}
                        {prop.building_type && (
                            <div className="info-row">
                                <span className="info-key"><Layers size={14} style={{ marginRight: 6 }} /> Тип дома</span>
                                <span className="info-val">{BUILDING_TYPES[prop.building_type] || prop.building_type}</span>
                            </div>
                        )}
                        {prop.floors_total && (
                            <div className="info-row">
                                <span className="info-key"><ArrowUpCircle size={14} style={{ marginRight: 6 }} /> Этажей</span>
                                <span className="info-val">{prop.floors_total}</span>
                            </div>
                        )}
                        {prop.apartments_count && (
                            <div className="info-row">
                                <span className="info-key"><Home size={14} style={{ marginRight: 6 }} /> Квартир</span>
                                <span className="info-val">{prop.apartments_count}</span>
                            </div>
                        )}
                        {prop.house_series && (
                            <div className="info-row">
                                <span className="info-key"><FileText size={14} style={{ marginRight: 6 }} /> Серия</span>
                                <span className="info-val">{prop.house_series}</span>
                            </div>
                        )}
                        {prop.elevator_type && prop.elevator_type !== 'none' && (
                            <div className="info-row">
                                <span className="info-key"><Layers size={14} style={{ marginRight: 6 }} /> Лифт</span>
                                <span className="info-val" style={{ fontWeight: 700 }}>
                                    {{ passenger: 'Пассажирский', cargo: 'Грузовой', both: 'Пасс. + Грузовой' }[prop.elevator_type] || prop.elevator_type}
                                </span>
                            </div>
                        )}
                        {prop.ceiling_height && (
                            <div className="info-row">
                                <span className="info-key"><Maximize2 size={14} style={{ marginRight: 6 }} /> Потолки</span>
                                <span className="info-val">{prop.ceiling_height} м</span>
                            </div>
                        )}
                        {prop.management_company && (
                            <div className="info-row">
                                <span className="info-key"><Briefcase size={14} style={{ marginRight: 6 }} /> УК</span>
                                <span className="info-val">{prop.management_company}</span>
                            </div>
                        )}
                        {prop.developer && (
                            <div className="info-row">
                                <span className="info-key"><Construction size={14} style={{ marginRight: 6 }} /> Застройщик</span>
                                <span className="info-val">{prop.developer}</span>
                            </div>
                        )}
                        {prop.cadastral_number && (
                            <div className="info-row" style={{ borderBottom: 'none' }}>
                                <span className="info-key"><FileText size={14} style={{ marginRight: 6 }} /> Кадастр</span>
                                <span className="info-val" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prop.cadastral_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── О КВАРТИРЕ ─────────────────────────────────────── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ background: 'var(--success-light, #ecfdf5)', padding: 6, borderRadius: 6, color: 'var(--success, #10b981)' }}>
                            <Home size={16} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>О квартире</div>
                    </div>

                    <div className="info-grid" style={{ padding: '8px 16px' }}>
                        <div className="info-row">
                            <span className="info-key"><Layers size={14} style={{ marginRight: 6 }} /> Тип</span>
                            <span className="info-val">{PROPERTY_TYPES[prop.property_type]}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key"><Maximize2 size={14} style={{ marginRight: 6 }} /> Комнат</span>
                            <span className="info-val" style={{ fontWeight: 800 }}>{prop.rooms === 0 ? 'Студия' : prop.rooms || '—'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key"><Layers size={14} style={{ marginRight: 6 }} /> Этаж</span>
                            <span className="info-val">{prop.floor} из {prop.floors_total || '—'}</span>
                        </div>
                        {prop.area_total > 0 && (
                            <div className="info-row">
                                <span className="info-key"><Maximize2 size={14} style={{ marginRight: 6 }} /> Площади</span>
                                <span className="info-val" style={{ fontSize: 13 }}>
                                    <b>{prop.area_total}</b>{prop.area_living ? ` / ${prop.area_living}` : ''}{prop.area_kitchen ? ` / ${prop.area_kitchen}` : ''} м²
                                </span>
                            </div>
                        )}
                        {prop.renovation && (
                            <div className="info-row">
                                <span className="info-key"><Sparkles size={14} style={{ marginRight: 6 }} /> Ремонт</span>
                                <span className="info-val" style={{ fontWeight: 700 }}>
                                    {{ none: 'Без ремонта', cosmetic: 'Косметический', euro: 'Евро', designer: 'Дизайнерский' }[prop.renovation] || prop.renovation}
                                </span>
                            </div>
                        )}
                        {prop.balcony && prop.balcony !== 'none' && (
                            <div className="info-row">
                                <span className="info-key"><Wind size={14} style={{ marginRight: 6 }} /> Балкон</span>
                                <span className="info-val">{{ balcony: 'Балкон', loggia: 'Лоджия', both: 'Балкон + Лоджия' }[prop.balcony] || prop.balcony}</span>
                            </div>
                        )}
                        {prop.bathroom && (
                            <div className="info-row">
                                <span className="info-key"><Droplets size={14} style={{ marginRight: 6 }} /> Санузел</span>
                                <span className="info-val">{{ combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' }[prop.bathroom] || prop.bathroom}</span>
                            </div>
                        )}
                        {prop.parking && prop.parking !== 'none' && (
                            <div className="info-row">
                                <span className="info-key"><ParkingCircle size={14} style={{ marginRight: 6 }} /> Парковка</span>
                                <span className="info-val">{{ open: 'Открытая', garage: 'Гараж', underground: 'Подземная' }[prop.parking] || prop.parking}</span>
                            </div>
                        )}
                        {prop.furniture !== undefined && (
                            <div className="info-row" style={{ borderBottom: 'none' }}>
                                <span className="info-key"><Sofa size={14} style={{ marginRight: 6 }} /> Мебель</span>
                                <span className="info-val">{prop.furniture ? 'Остаётся' : 'Нет'}</span>
                            </div>
                        )}
                    </div>

                    {/* Условия сделки */}
                    {(prop.mortgage_available || prop.matcapital_available || prop.certificate_available ||
                      prop.encumbrance || prop.minor_owners || prop.docs_ready || prop.seeking_alternative) && (
                        <div style={{ marginTop: 12, padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={12} /> Условия сделки
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {prop.mortgage_available && <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> Ипотека</span>}
                                {prop.matcapital_available && <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> Маткапитал</span>}
                                {prop.certificate_available && <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> Сертификат</span>}
                                {prop.seeking_alternative && <span className="badge badge-warning" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={12}/> Альтернатива</span>}
                                {prop.encumbrance && <span className="badge badge-danger" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12}/> Обременение</span>}
                                {prop.minor_owners && <span className="badge badge-warning" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12}/> Несоверш. собств.</span>}
                                {prop.docs_ready && <span className="badge badge-subtle" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> Документы готовы</span>}
                            </div>
                        </div>
                    )}


                    {/* Тип и комиссия */}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {prop.deal_type === 'sale' ? 'Продажа' : 'Аренда'} · {prop.market_type === 'new_building' ? 'Новостройка' : 'Вторичка'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                            Комиссия: {formatNumber(prop.commission)} ₽
                        </span>
                    </div>
                </div>

                {/* Estimation Widget */}
                <EstimationWidget prop={prop} />

                {/* AI Ad Generator */}
                <AdGenerator prop={prop} realtorName={state.currentUser?.full_name} />

                {/* ИСТОРИЯ — все события по объекту */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>История ({events.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/showings/new?property_id=${id}`)} style={{ color: 'var(--primary)', fontSize: 20 }}>+</button>
                    </div>
                    {events.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Пока нет событий</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {events.map(ev => {
                                const dateStr = ev.dateObj ? ev.dateObj.toLocaleDateString('ru-RU') : '—';
                                const timeStr = ev.dateObj ? ev.dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                const editRoute = `/showings/new?id=${ev.id}`;

                                const feedbackLabels = {
                                    interested: 'Заинтересован',
                                    other_options: 'Ищет другие варианты',
                                    price_high: 'Дорого',
                                    layout_bad: 'Не нравится планировка',
                                    location_bad: 'Не нравится расположение',
                                    condition_bad: 'Плохое состояние',
                                    ready: 'Готов к сделке',
                                };
                                const feedback = ev.client_feedback ? feedbackLabels[ev.client_feedback] || ev.client_feedback : '';

                                return (
                                    <div key={ev.id} style={{ padding: '12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                                        {/* Заголовок + дата/время + иконка редактирования */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.typeLabel}: {ev.buyer?.full_name || 'Покупатель'}</div>
                                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{dateStr}</div>
                                                {timeStr && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeStr}</div>}
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}
                                                    onClick={() => navigate(editRoute)}
                                                    title="Редактировать"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Отзыв / Комментарий — единая строка */}
                                        {(feedback || ev.feedback_comment) && (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {[feedback, ev.feedback_comment].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {prop.notes && (
                    <div className="card">
                        <div className="section-title">Описание</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: 8 }}>{prop.notes}</div>
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
