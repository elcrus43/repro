import React from 'react';
import { X, Loader } from 'lucide-react';
import { formatNumber } from '../utils/format';

const DESIGNS = [
    ['light', 'Светлая тема'],
    ['dark',  'Тёмная тема'],
    ['photo', 'Фото-дизайн'],
];

const TRENDING_COLORS = [
    '#0052FF', // Samolet Blue
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#d946ef', // Fuchsia
    '#8b5cf6', // Violet
    '#6366f1', // Indigo
    '#14b8a6'  // Tiffany / Teal
];

function getWrappedLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    let line = '';
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
    return lines;
}

export function BannerGenerator({ property, currentUser, onClose }) {
    const canvasRef = React.useRef(null);
    const [format,   setFormat]   = React.useState('story');
    const [design,   setDesign]   = React.useState(() => 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    const [stickers, setStickers] = React.useState([]);
    const [customStickerText, setCustomStickerText] = React.useState('Свой текст');
    const [loading,  setLoading]  = React.useState(true);
    const [accentColor, setAccentColor] = React.useState('#0052FF');

    const propertyImages = React.useMemo(() => {
        return (property.images && property.images.length > 0)
            ? property.images
            : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1080&q=80'];
    }, [property.images]);

    const [selectedImages, setSelectedImages] = React.useState(() => {
        if (property.images && property.images.length > 1) {
            return property.images.slice(0, Math.min(property.images.length, 4)).map((_, i) => i);
        }
        return [0];
    });
    const [gridLayout, setGridLayout] = React.useState('grid');

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

        // Load all selected images
        const loadedImgs = [];
        await Promise.all(selectedImages.map(idx => {
            return new Promise(r => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = propertyImages[idx % propertyImages.length];
                img.onload = () => { loadedImgs.push({ img, idx }); r(); };
                img.onerror = () => r();
            });
        }));
        // Sort to preserve selection order
        loadedImgs.sort((a, b) => selectedImages.indexOf(a.idx) - selectedImages.indexOf(b.idx));
        const imgs = loadedImgs.map(item => item.img);

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
        const isLight = design === 'light';
        const isPhoto = design === 'photo';

        const px0 = IS ? 80 : 60;
        const addr  = (property.address || property.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
        const addrSize = IS ? 60 : 48;
        const maxWidth = w - 2 * px0;

        // Pre-calculate address lines to prevent overlap with the phone number at the bottom
        ctx.font = `700 ${addrSize}px Oswald,sans-serif`;
        const addrLines = getWrappedLines(ctx, addr, maxWidth);

        // Split line or starting reference point for text elements
        const photoH = IS ? Math.round(h * 0.55) : Math.round(h * 0.50);
        let textStartY = isPhoto 
            ? (IS ? Math.round(h * 0.62) : Math.round(h * 0.56)) 
            : photoH;

        // Prevent overlap by adjusting textStartY if the text block is too tall
        const catOffset = IS ? 110 : 80;
        const priceOffset = IS ? 110 : 80;
        const addrOffset = IS ? 100 : 75;
        const lineHeight = addrSize * 1.25;
        const detailsOffset = IS ? 20 : 15;
        const detailsSize = IS ? 40 : 32;

        const totalTextHeight = catOffset + priceOffset + addrOffset + (addrLines.length * lineHeight) + detailsOffset + (detailsSize * 0.2);
        
        const phy = h - (IS ? 140 : 100);
        const phoneSize = IS ? 52 : 40;
        const targetBottom = phy - phoneSize - 20; // 20px safety margin above the phone number

        if (isPhoto && textStartY + totalTextHeight > targetBottom) {
            textStartY = Math.max(Math.round(h * 0.40), targetBottom - totalTextHeight);
        }

        let bx = 0, by = 0, bw = w, bh = h;
        if (!isPhoto) {
            // 1. Draw solid background
            ctx.fillStyle = isLight ? '#ffffff' : '#0F172A';
            ctx.fillRect(0, 0, w, h);

            // Photo boundary is only the top half
            by = 0; bh = photoH;
        }

        // Bounding box for photos is defined by (bx, by, bw, bh)
        // Partition it into rects depending on gridLayout and selection length
        const rects = [];
        const N = imgs.length;
        if (N <= 1) {
            rects.push({ x: bx, y: by, w: bw, h: bh });
        } else {
            if (gridLayout === 'vertical') {
                const w_col = bw / N;
                for (let i = 0; i < N; i++) {
                    rects.push({ x: bx + i * w_col, y: by, w: w_col, h: bh });
                }
            } else if (gridLayout === 'horizontal') {
                const h_row = bh / N;
                for (let i = 0; i < N; i++) {
                    rects.push({ x: bx, y: by + i * h_row, w: bw, h: h_row });
                }
            } else if (gridLayout === 'main-stack') {
                const split = 0.6;
                if (format === 'story') {
                    // Top-Bottom
                    rects.push({ x: bx, y: by, w: bw, h: bh * split });
                    const sub_w = bw / (N - 1);
                    const sub_h = bh * (1 - split);
                    const sub_y = by + bh * split;
                    for (let j = 0; j < N - 1; j++) {
                        rects.push({ x: bx + j * sub_w, y: sub_y, w: sub_w, h: sub_h });
                    }
                } else {
                    // Left-Right
                    rects.push({ x: bx, y: by, w: bw * split, h: bh });
                    const sub_w = bw * (1 - split);
                    const sub_h = bh / (N - 1);
                    const sub_x = bx + bw * split;
                    for (let j = 0; j < N - 1; j++) {
                        rects.push({ x: sub_x, y: by + j * sub_h, w: sub_w, h: sub_h });
                    }
                }
            } else {
                // standard grid
                const cols = Math.ceil(Math.sqrt(N));
                const rows = Math.ceil(N / cols);
                for (let i = 0; i < N; i++) {
                    const r_idx = Math.floor(i / cols);
                    const c_idx = i % cols;
                    const w_cell = bw / cols;
                    const h_cell = bh / rows;
                    rects.push({ x: bx + c_idx * w_cell, y: by + r_idx * h_cell, w: w_cell, h: h_cell });
                }
            }
        }

        // Draw each image inside its designated rectangle
        rects.forEach((r, idx) => {
            cov(imgs[idx % imgs.length], r.x, r.y, r.w, r.h);
        });

        // Draw separating lines between images in multi-photo mode
        if (N > 1) {
            ctx.save();
            ctx.strokeStyle = isLight ? '#ffffff' : (isPhoto ? '#0F172A' : '#0F172A');
            ctx.lineWidth = IS ? 12 : 8;
            rects.forEach(r => {
                ctx.strokeRect(r.x, r.y, r.w, r.h);
            });
            ctx.restore();
        }

        if (isPhoto) {
            // Draw black gradient with transparency from 100% (at the bottom) to 0% (at h * 0.5)
            const grad = ctx.createLinearGradient(0, h, 0, h * 0.5);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            grad.addColorStop(0.2, 'rgba(0, 0, 0, 0.95)');
            grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, h * 0.5, w, h * 0.5);
        }

        // 3. Draw text info in the bottom section
        const parts = [];
        const type = property.property_type;
        
        if (type === 'apartment') {
            parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
        } else if (type === 'room') {
            parts.push('Комната');
        } else if (type === 'house') {
            if (property.rooms > 0) {
                parts.push(property.rooms + '-комн.');
            }
        } else if (!type) {
            if (property.rooms !== undefined) {
                parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
            }
        }
        
        if (property.area_total) {
            parts.push(property.area_total + ' м²');
        }
        
        if (['apartment', 'room', 'commercial'].includes(type) && property.floor) {
            parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
        } else if (type === 'house' && property.floors_total) {
            parts.push(property.floors_total + ' эт.');
        } else if (!type && property.floor) {
            parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
        }

        const phone = currentUser?.phone || '+7 (999) 000-00-00';

        // Category label (spaced out)
        const roomsCount = property.rooms;
        let categoryText = 'ОБЪЕКТ НЕДВИЖИМОСТИ';
        
        if (type === 'land') {
            categoryText = 'ЗЕМЕЛЬНЫЙ УЧАСТОК';
        } else if (type === 'garden') {
            categoryText = 'САД';
        } else if (type === 'commercial') {
            categoryText = 'КОММЕРЧЕСКАЯ НЕДВИЖИМОСТЬ';
        } else if (type === 'room') {
            categoryText = 'КОМНАТА';
        } else if (type === 'house') {
            categoryText = roomsCount > 0 ? `${roomsCount}-КОМНАТНЫЙ ДОМ` : 'ДОМ';
        } else if (type === 'apartment') {
            categoryText = roomsCount === 0 ? 'СТУДИЯ' : `${roomsCount}-КОМНАТНАЯ КВАРТИРА`;
        } else {
            if (roomsCount !== undefined) {
                categoryText = roomsCount === 0 ? 'СТУДИЯ' : `${roomsCount}-КОМНАТНАЯ КВАРТИРА`;
            }
        }
        const spacedCategory = categoryText.split('').join(' ');
        
        ctx.fillStyle = isLight ? '#9CA3AF' : (isPhoto ? '#E2E8F0' : '#64748B');
        const catSize = IS ? 30 : 22;
        ctx.font = `400 ${catSize}px Oswald,sans-serif`;
        const catY = textStartY + (IS ? 110 : 80);
        ctx.fillText(spacedCategory, px0, catY);

        // Price and Price per Sqm (placed on the same line to the right of the price)
        const priceText = formatNumber(property.price) + ' ₽';
        const priceSize = IS ? 96 : 80;
        ctx.font = `700 ${priceSize}px Oswald,sans-serif`;
        ctx.fillStyle = accentColor;
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

        // Address drawing
        ctx.font = `700 ${addrSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
        const addrY = priceY + (IS ? 100 : 75);
        
        let currentY = addrY;
        for (let i = 0; i < addrLines.length; i++) {
            ctx.fillText(addrLines[i], px0, currentY);
            currentY += lineHeight;
        }
        const currentYAfterAddr = currentY;

        // Property details (rooms, area, floor)
        ctx.font = `300 ${detailsSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#4B5563' : '#94A3B8';
        const detailsY = currentYAfterAddr + (IS ? 20 : 15);
        ctx.fillText(parts.join('  ·  '), px0, detailsY);

        // Realtor Contact info with CTA
        const ctaText = 'подробнее по тел. ';

        // 1. Draw CTA text in light weight
        ctx.font = `300 ${phoneSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#4B5563' : (isPhoto ? '#E2E8F0' : '#94A3B8');
        ctx.fillText(ctaText, px0, phy);

        const ctaWidth = ctx.measureText(ctaText).width;

        // 2. Draw actual phone number in bold
        ctx.font = `700 ${phoneSize}px Oswald,sans-serif`;
        ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
        ctx.fillText(phone, px0 + ctaWidth, phy);

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
                    ctx.fillStyle = accentColor;
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
    }, [format, design, selectedImages, gridLayout, stickers, customStickerText, property, currentUser, fmts, propertyImages]);

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
                <div style={{ flex: isMobile ? 'none' : '0 0 280px', width: isMobile ? '100%' : 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, overflowY: 'auto', maxHeight: isMobile ? 'none' : '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 11, fontWeight: 300, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Баннер</div>

                    {/* Format */}
                    <Section label="ФОРМАТ">
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {[['story', 'Story 9:16'], ['post', 'Post 1:1']].map(([f, l]) => (
                                <Chip key={f} active={format === f} color={activeColor} onClick={() => setFormat(f)}>{l}</Chip>
                            ))}
                        </div>
                    </Section>

                    {/* Design */}
                    <Section label="ДИЗАЙН">
                        <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap' }}>
                            {DESIGNS.map(([d, l]) => (
                                <Chip key={d} active={design === d} color={activeColor} onClick={() => setDesign(d)}>{l}</Chip>
                            ))}
                        </div>
                    </Section>

                    {/* Photo selection thumbnails */}
                    {propertyImages.length > 1 && (
                        <Section label="ФОТОГРАФИИ (1-9)">
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                {propertyImages.map((url, idx) => {
                                    const isSel = selectedImages.includes(idx);
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => {
                                                setSelectedImages(prev => {
                                                    if (prev.includes(idx)) {
                                                        if (prev.length === 1) return prev;
                                                        return prev.filter(i => i !== idx);
                                                    } else {
                                                        if (prev.length >= 9) return prev;
                                                        return [...prev, idx];
                                                    }
                                                });
                                            }}
                                            style={{ 
                                                width: 44, 
                                                height: 44, 
                                                borderRadius: 8, 
                                                overflow: 'hidden', 
                                                cursor: 'pointer', 
                                                border: `2px solid ${isSel ? activeColor : 'transparent'}`,
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                opacity: isSel ? 1 : 0.5,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {isSel && (
                                                <div style={{
                                                    position: 'absolute', top: 2, right: 2, width: 14, height: 14, 
                                                    borderRadius: '50%', background: activeColor, color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 'bold'
                                                }}>
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Collage grid layouts selector */}
                    {selectedImages.length >= 2 && (
                        <Section label="СЕТКА КОЛЛАЖА">
                            <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap' }}>
                                {[
                                    ['grid', 'Сетка'],
                                    ['main-stack', 'Главное + Коллаж'],
                                    ['vertical', 'Колонки'],
                                    ['horizontal', 'Строки']
                                ].map(([layout, label]) => (
                                    <Chip 
                                        key={layout} 
                                        active={gridLayout === layout} 
                                        color={activeColor} 
                                        onClick={() => setGridLayout(layout)}
                                    >
                                        {label}
                                    </Chip>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Accent Color Palette */}
                    <Section label="АКЦЕНТНЫЙ ЦВЕТ">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                            {TRENDING_COLORS.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setAccentColor(c)}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: c,
                                        border: accentColor === c ? '2px solid var(--text)' : '1px solid rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s',
                                        transform: accentColor === c ? 'scale(1.15)' : 'none',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                />
                            ))}
                        </div>
                    </Section>

                    {/* Stickers */}
                    <Section label="СТИКЕРЫ">
                        <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap', marginBottom: stickers.includes('Свой текст') ? 8 : 0 }}>
                            {AVAILABLE_STICKERS.map(s => {
                                const isActive = stickers.includes(s);
                                return (
                                    <button 
                                        key={s} 
                                        onClick={() => setStickers(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                                        style={{ 
                                            padding: '4px 0', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            fontSize: 13, 
                                            fontFamily: 'Oswald', 
                                            fontWeight: isActive ? '700' : '400', 
                                            color: isActive ? activeColor : 'var(--text-muted)', 
                                            transition: 'color 0.15s',
                                            textAlign: 'left'
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
                                    padding: '6px 10px', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)', 
                                    background: 'var(--bg)', 
                                    color: 'var(--text)', 
                                    fontSize: 13, 
                                    fontFamily: 'Oswald',
                                    outline: 'none',
                                    marginTop: 6
                                }}
                            />
                        )}
                    </Section>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                        <button onClick={() => {
                            if (selectedImages.length === 1) {
                                setSelectedImages([ (selectedImages[0] + 1) % propertyImages.length ]);
                            } else {
                                setSelectedImages(prev => [...prev.slice(1), prev[0]]);
                            }
                        }}
                            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald', transition: 'all 0.15s' }}>
                            ↻ Сдвиг
                        </button>
                        <button onClick={dl}
                            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: activeColor, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'Oswald', fontWeight: 700, letterSpacing: '0.06em', transition: 'all 0.15s' }}>
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
        <div style={{ marginBottom: 12 }}>
            {label && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.1em' }}>{label}</div>}
            {children}
        </div>
    );
}
function Chip({ active, color, onClick, children }) {
    return (
        <button 
            onClick={onClick} 
            style={{ 
                padding: '4px 0', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: 13, 
                fontFamily: 'Oswald', 
                letterSpacing: '0.05em', 
                fontWeight: active ? '700' : '400', 
                color: active ? color : 'var(--text-muted)', 
                transition: 'color 0.15s',
                textAlign: 'left'
            }}
        >
            {children}
        </button>
    );
}
