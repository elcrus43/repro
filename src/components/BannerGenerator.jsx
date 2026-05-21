import React from 'react';
import { X, Loader } from 'lucide-react';
import { formatNumber } from '../utils/format';

const DESIGNS = [
    ['light', 'Светлая тема'],
    ['dark',  'Тёмная тема'],
];

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, currentY);
        currentY += lineHeight;
    }
    return currentY;
}

export function BannerGenerator({ property, currentUser, onClose }) {
    const canvasRef = React.useRef(null);
    const [format,   setFormat]   = React.useState('story');
    const [design,   setDesign]   = React.useState(() => 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    const [imgOff,   setImgOff]   = React.useState(0);
    const [stickers, setStickers] = React.useState([]);
    const [customStickerText, setCustomStickerText] = React.useState('Свой текст');
    const [loading,  setLoading]  = React.useState(true);

    const fmts = React.useMemo(() => ({ 
        story: { w: 1080, h: 1920 }, 
        post: { w: 1080, h: 1080 } 
    }), []);
    const isMobile = window.innerWidth < 768;

    const draw = React.useCallback(async () => {
        setLoading(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { w, h } = fmts[format];
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');

        const urls = (property.images && property.images.length > 0)
            ? property.images
            : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1080&q=80'];

        const imgs = [];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = urls[imgOff % urls.length];
        await new Promise(r => { img.onload = r; img.onerror = r; });
        if (img.width > 0) imgs.push(img);
        if (!imgs.length) { setLoading(false); return; }

        // cover-fit helper
        const cov = (img, x, y, iw, ih) => {
            const ir = img.width / img.height, cr = iw / ih;
            let dw, dh, dx, dy;
            if (ir > cr) { dh = ih; dw = ih * ir; dx = x - (dw - iw) / 2; dy = y; }
            else          { dw = iw; dh = iw / ir; dx = x; dy = y - (dh - ih) / 2; }
            ctx.save(); ctx.beginPath(); ctx.rect(x, y, iw, ih); ctx.clip();
            ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
        };

        const IS = format === 'story';
        const photoH = IS ? Math.round(h * 0.55) : Math.round(h * 0.50);
        const isLight = design === 'light';

        // 1. Draw solid background
        ctx.fillStyle = isLight ? '#ffffff' : '#0F172A';
        ctx.fillRect(0, 0, w, h);

        // 2. Draw photo at the top
        cov(imgs[0], 0, 0, w, photoH);

        // 3. Draw text info in the bottom section
        const px0 = IS ? 80 : 60;
        const addr  = (property.address || property.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
        const parts = [];
        if (property.rooms !== undefined) parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
        if (property.area_total) parts.push(property.area_total + ' м²');
        if (property.floor) parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        const name  = currentUser?.full_name || '';

        // Category label (spaced out)
        const roomsCount = property.rooms;
        let categoryText = 'ОБЪЕКТ НЕДВИЖИМОСТИ';
        if (roomsCount !== undefined) {
            categoryText = roomsCount === 0 ? 'СТУДИЯ' : `${roomsCount}-КОМНАТНАЯ КВАРТИРА`;
        }
        const spacedCategory = categoryText.split('').join(' ');
        
        ctx.fillStyle = isLight ? '#9CA3AF' : '#64748B';
        const catSize = IS ? 30 : 22;
        ctx.font = `400 ${catSize}px Oswald,sans-serif`;
        const catY = photoH + (IS ? 110 : 80);
        ctx.fillText(spacedCategory, px0, catY);

        // Price and Price per Sqm (placed on the same line to the right of the price)
        const priceText = formatNumber(property.price) + ' ₽';
        const priceSize = IS ? 96 : 80;
        ctx.font = `700 ${priceSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#0052FF' : '#3B82F6';
        const priceY = catY + (IS ? 110 : 80);
        ctx.fillText(priceText, px0, priceY);

        const priceWidth = ctx.measureText(priceText).width;

        if (property.price && property.area_total) {
            const m2 = Math.round(property.price / property.area_total);
            const sqmText = `(${formatNumber(m2)} ₽/м²)`;
            const sqmSize = IS ? 44 : 36;
            ctx.font = `300 ${sqmSize}px Oswald,sans-serif`;
            ctx.fillStyle = isLight ? '#4B5563' : '#94A3B8';
            ctx.fillText(sqmText, px0 + priceWidth + (IS ? 36 : 24), priceY);
        }

        // Address with wrapText
        const addrSize = IS ? 60 : 48;
        ctx.font = `700 ${addrSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
        const addrY = priceY + (IS ? 100 : 75);
        const maxWidth = w - 2 * px0;
        const lineHeight = addrSize * 1.25;
        const currentYAfterAddr = wrapText(ctx, addr, px0, addrY, maxWidth, lineHeight);

        // Property details (rooms, area, floor)
        const detailsSize = IS ? 40 : 32;
        ctx.font = `300 ${detailsSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#4B5563' : '#94A3B8';
        const detailsY = currentYAfterAddr + (IS ? 20 : 15);
        ctx.fillText(parts.join('  ·  '), px0, detailsY);

        // Realtor Contact info
        const phy = h - (IS ? 160 : 110);
        const phoneSize = IS ? 56 : 44;
        ctx.font = `700 ${phoneSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
        ctx.fillText(phone, px0, phy);

        if (name) {
            const nameSize = IS ? 36 : 28;
            ctx.font = `300 ${nameSize}px Oswald,sans-serif`;
            ctx.fillStyle = isLight ? '#9CA3AF' : '#64748B';
            ctx.fillText(name, px0, phy + (IS ? 48 : 34));
        }

        /* ── STICKERS ───────────────────────────────────────────────── */
        if (stickers.length) {
            const sp = IS ? 70 : 50, sh = IS ? 66 : 48, sf = IS ? 30 : 22;
            let sy = sp + 20;
            ctx.textAlign = 'center';
            stickers.forEach(s => {
                const txt = s === 'Свой текст' ? (customStickerText.trim() || 'Свой текст') : s;
                ctx.font = `700 ${sf}px Oswald,sans-serif`;
                const tw = ctx.measureText(txt.toUpperCase()).width + 48;
                const sx = w - sp - tw;
                
                if (s === 'Срочно') {
                    ctx.fillStyle = '#EF4444';
                } else {
                    ctx.fillStyle = isLight ? '#0052FF' : '#3B82F6';
                }
                
                ctx.beginPath(); 
                ctx.roundRect(sx, sy, tw, sh, 10); 
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.fillText(txt.toUpperCase(), sx + tw / 2, sy + sh / 2 + sf / 3);
                sy += sh + 14;
            });
            ctx.textAlign = 'left';
        }

        setLoading(false);
    }, [format, design, imgOff, stickers, customStickerText, property, currentUser, fmts]);

    React.useEffect(() => {
        draw();
    }, [draw]);

    const dl = () => {
        const a = document.createElement('a');
        a.download = `banner-${property.id}-${format}.png`;
        a.href = canvasRef.current.toDataURL('image/png');
        a.click();
    };

    const activeColor = 'var(--primary)';
    const AVAILABLE_STICKERS = ['Свободная продажа', 'Ищем встречный вариант', 'Срочно', 'Свой текст'];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--modal-bg)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--text)' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--border-light)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <X size={22} />
            </button>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, width: '100%', maxWidth: 1160, height: isMobile ? 'auto' : '85vh', alignItems: 'flex-start', overflowY: isMobile ? 'auto' : 'visible' }}>

                {/* Controls */}
                <div style={{ flex: isMobile ? 'none' : '0 0 310px', width: isMobile ? '100%' : 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, overflowY: 'auto', maxHeight: isMobile ? 'none' : '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 11, fontWeight: 300, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 18, textTransform: 'uppercase' }}>Баннер</div>

                    {/* Format */}
                    <Section label="ФОРМАТ">
                        <Grid2>
                            {[['story', 'Story 9:16'], ['post', 'Post 1:1']].map(([f, l]) => (
                                <Chip key={f} active={format === f} color={activeColor} onClick={() => setFormat(f)}>{l}</Chip>
                            ))}
                        </Grid2>
                    </Section>

                    {/* Design */}
                    <Section label="ДИЗАЙН">
                        <Grid2>
                            {DESIGNS.map(([d, l]) => (
                                <Chip key={d} active={design === d} color={activeColor} onClick={() => setDesign(d)}>{l}</Chip>
                            ))}
                        </Grid2>
                    </Section>

                    {/* Stickers */}
                    <Section label="СТИКЕРЫ">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: stickers.includes('Свой текст') ? 10 : 0 }}>
                            {AVAILABLE_STICKERS.map(s => {
                                const isActive = stickers.includes(s);
                                return (
                                    <button 
                                        key={s} 
                                        onClick={() => setStickers(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                                        style={{ 
                                            padding: '6px 12px', 
                                            borderRadius: 8, 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            fontSize: 12, 
                                            fontFamily: 'Oswald', 
                                            background: isActive ? activeColor : 'var(--bg-light)', 
                                            color: isActive ? '#fff' : 'var(--text-secondary)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                        {stickers.includes('Свой текст') && (
                            <input 
                                type="text" 
                                value={customStickerText} 
                                onChange={e => setCustomStickerText(e.target.value)} 
                                placeholder="Введите свой текст..."
                                style={{ 
                                    width: '100%', 
                                    padding: '8px 12px', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)', 
                                    background: 'var(--bg)', 
                                    color: 'var(--text)', 
                                    fontSize: 13, 
                                    fontFamily: 'Oswald',
                                    outline: 'none',
                                    marginTop: 10
                                }}
                            />
                        )}
                    </Section>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                        <button onClick={() => setImgOff(o => o + 1)}
                            style={{ padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald', transition: 'all 0.15s' }}>
                            ↻ Фото
                        </button>
                        <button onClick={dl}
                            style={{ padding: '11px', borderRadius: 10, border: 'none', background: activeColor, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'Oswald', fontWeight: 700, letterSpacing: '0.06em', transition: 'all 0.15s' }}>
                            ↓ СКАЧАТЬ
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div style={{ flex: 1, height: isMobile ? '500px' : '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ position: 'relative', height: '100%', aspectRatio: `${fmts[format].w}/${fmts[format].h}`, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', borderRadius: 24, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--modal-bg)', backdropFilter: 'blur(4px)' }}>
                                <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: activeColor }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* tiny layout helpers */
function Section({ label, children }) {
    return (
        <div style={{ marginBottom: 16 }}>
            {label && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>{label}</div>}
            {children}
        </div>
    );
}
function Grid2({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{children}</div>;
}
function Chip({ active, color, onClick, children }) {
    return (
        <button onClick={onClick} style={{ padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald', letterSpacing: '0.05em', background: active ? color : 'var(--bg-light)', color: active ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {children}
        </button>
    );
}
