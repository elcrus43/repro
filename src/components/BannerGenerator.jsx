import React from 'react';
import { X, Loader } from 'lucide-react';
import { formatNumber } from '../utils/format';

const DESIGNS = [
    ['anthracite', 'Антрацит'],
    ['cinematic',  'Кино'],
    ['editorial',  'Editorial'],
    ['blueprint',  'Чертёж'],
    ['frame',      'Рамка'],
];

const GRADIENTS = [
    { n: 'Золото',    a: '#C9A84C', b: '#F5D98E' },
    { n: 'Океан',     a: '#0052FF', b: '#00C6FF' },
    { n: 'Закат',     a: '#F7971E', b: '#FFD200' },
    { n: 'Аметист',   a: '#7C3AED', b: '#EC4899' },
    { n: 'Рубин',     a: '#C62828', b: '#FF6B6B' },
    { n: 'Малахит',   a: '#11998e', b: '#38ef7d' },
];

export function BannerGenerator({ property, currentUser, onClose }) {
    const canvasRef = React.useRef(null);
    const [format,   setFormat]   = React.useState('story');
    const [design,   setDesign]   = React.useState('anthracite');
    const [c1,       setC1]       = React.useState('#C9A84C');
    const [c2,       setC2]       = React.useState('#F5D98E');
    const [bw,       setBw]       = React.useState(6);
    const [imgOff,   setImgOff]   = React.useState(0);
    const [stickers, setStickers] = React.useState([]);
    const [loading,  setLoading]  = React.useState(true);

    const fmts = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1080 } };
    const addr  = (property.address || property.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
    const parts = [];
    if (property.rooms !== undefined) parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
    if (property.area_total) parts.push(property.area_total + ' м²');
    if (property.floor) parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
    const phone = currentUser?.phone || '+7 (999) 000-00-00';
    const name  = currentUser?.full_name || '';
    const isMobile = window.innerWidth < 768;

    React.useEffect(() => { draw(); }, [format, design, c1, c2, bw, imgOff, stickers, property]);

    const draw = async () => {
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
        for (let i = 0; i < Math.min(3, urls.length); i++) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = urls[(i + imgOff) % urls.length];
            await new Promise(r => { img.onload = r; img.onerror = r; });
            if (img.width > 0) imgs.push(img);
        }
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

        const mkGrad = () => {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
        };
        const lineW = bw > 0 ? bw * 2 : 4;
        const IS = format === 'story';
        const px0 = IS ? 80 : 60;

        /* ── ANTHRACITE ─────────────────────────────────────────────── */
        if (design === 'anthracite') {
            ctx.fillStyle = '#1C1F26'; ctx.fillRect(0, 0, w, h);
            const photoH = IS ? h * 0.55 : h * 0.5;
            cov(imgs[0], 0, 0, w, photoH);
            // fade photo → bg
            const fade = ctx.createLinearGradient(0, photoH * 0.55, 0, photoH + 2);
            fade.addColorStop(0, 'rgba(28,31,38,0)');
            fade.addColorStop(1, 'rgba(28,31,38,1)');
            ctx.fillStyle = fade; ctx.fillRect(0, 0, w, photoH + 2);
            // accent line
            ctx.fillStyle = mkGrad(); ctx.fillRect(0, photoH, w, lineW);
            // subtle grid
            ctx.globalAlpha = 0.04; ctx.strokeStyle = c1; ctx.lineWidth = 1;
            for (let gx = 0; gx < w; gx += 60) {
                ctx.beginPath(); ctx.moveTo(gx, photoH); ctx.lineTo(gx, h); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            let y = photoH + (IS ? 90 : 66);
            const ps = IS ? 112 : 82;
            ctx.font = `700 ${ps}px Oswald,sans-serif`;
            ctx.fillStyle = mkGrad();
            ctx.fillText(formatNumber(property.price) + ' ₽', px0, y);
            if (property.price && property.area_total) {
                const m2 = Math.round(property.price / property.area_total);
                ctx.font = `300 ${IS ? 32 : 22}px Oswald,sans-serif`;
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillText(formatNumber(m2) + ' ₽/м²', px0, y + (IS ? 46 : 34));
            }
            ctx.font = `300 ${IS ? 46 : 32}px Oswald,sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText(addr.slice(0, 36), px0, y + (IS ? 110 : 80));
            ctx.font = `200 ${IS ? 30 : 20}px Oswald,sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(parts.join('  ·  '), px0, y + (IS ? 162 : 118));
            const phy = h - (IS ? 150 : 110);
            ctx.font = `600 ${IS ? 48 : 34}px Oswald,sans-serif`;
            ctx.fillStyle = mkGrad(); ctx.fillText(phone, px0, phy);
            if (name) { ctx.font = `300 ${IS ? 28 : 19}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fillText(name, px0, phy + (IS ? 42 : 30)); }

        /* ── CINEMATIC ──────────────────────────────────────────────── */
        } else if (design === 'cinematic') {
            cov(imgs[0], 0, 0, w, h);
            // full overlay + bottom panel
            const ov = ctx.createLinearGradient(0, h * 0.35, 0, h);
            ov.addColorStop(0, 'rgba(0,0,0,0)'); ov.addColorStop(0.65, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = ov; ctx.fillRect(0, 0, w, h);
            const barH = IS ? 480 : 340;
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, h - barH, w, barH);
            ctx.fillStyle = mkGrad(); ctx.fillRect(0, h - barH, w, lineW);
            let y = h - barH + (IS ? 100 : 70);
            const ps = IS ? 112 : 80;
            ctx.font = `700 ${ps}px Oswald,sans-serif`;
            ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 24;
            ctx.fillText(formatNumber(property.price) + ' ₽', px0, y); ctx.shadowBlur = 0;
            ctx.font = `300 ${IS ? 46 : 32}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.78)';
            ctx.fillText(addr.slice(0, 36), px0, y + (IS ? 70 : 50));
            ctx.font = `200 ${IS ? 30 : 20}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.46)';
            ctx.fillText(parts.join('  ·  '), px0, y + (IS ? 118 : 84));
            const phy = h - (IS ? 88 : 62);
            ctx.font = `600 ${IS ? 44 : 30}px Oswald,sans-serif`; ctx.fillStyle = c1; ctx.fillText(phone, px0, phy);
            if (name) { ctx.font = `300 ${IS ? 26 : 18}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fillText(name, px0, phy + (IS ? 36 : 26)); }

        /* ── EDITORIAL ──────────────────────────────────────────────── */
        } else if (design === 'editorial') {
            ctx.fillStyle = '#0F0F0F'; ctx.fillRect(0, 0, w, h);
            const photoH = IS ? Math.round(h * 0.56) : h;
            const photoW = IS ? w : Math.round(w * 0.52);
            cov(imgs[0], 0, 0, photoW, photoH);
            // accent divider
            ctx.fillStyle = mkGrad();
            if (IS) ctx.fillRect(0, photoH, w, lineW);
            else    ctx.fillRect(photoW, 0, lineW, h);
            const tx = IS ? px0 : photoW + lineW + (IS ? 50 : 40);
            let ty = IS ? photoH + (IS ? 80 : 60) : (IS ? 160 : 130);
            ctx.font = `200 ${IS ? 22 : 15}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText('НЕДВИЖИМОСТЬ', tx, ty);
            const ps = IS ? 100 : 68;
            ty += IS ? ps + 22 : ps + 16;
            ctx.font = `700 ${ps}px Oswald,sans-serif`; ctx.fillStyle = mkGrad();
            ctx.fillText(formatNumber(property.price) + ' ₽', tx, ty);
            ctx.font = `300 ${IS ? 42 : 28}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.78)';
            ctx.fillText(addr.slice(0, IS ? 36 : 22), tx, ty + (IS ? 70 : 50));
            ctx.font = `200 ${IS ? 28 : 18}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.38)';
            ctx.fillText(parts.join(' · '), tx, ty + (IS ? 120 : 84));
            const phy = h - (IS ? 160 : 100);
            ctx.font = `600 ${IS ? 44 : 28}px Oswald,sans-serif`; ctx.fillStyle = mkGrad(); ctx.fillText(phone, tx, phy);
            if (name) { ctx.font = `300 ${IS ? 26 : 17}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(name, tx, phy + (IS ? 38 : 26)); }

        /* ── BLUEPRINT ──────────────────────────────────────────────── */
        } else if (design === 'blueprint') {
            cov(imgs[0], 0, 0, w, h);
            ctx.fillStyle = 'rgba(8,14,32,0.76)'; ctx.fillRect(0, 0, w, h);
            // grid
            ctx.globalAlpha = 0.12; ctx.strokeStyle = c1; ctx.lineWidth = 1;
            for (let gx = 0; gx < w; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
            for (let gy = 0; gy < h; gy += 80) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
            ctx.globalAlpha = 1;
            // bracket rect
            const cx0 = IS ? 80 : 60, cy0 = IS ? h * 0.34 : h * 0.28;
            ctx.strokeStyle = mkGrad(); ctx.lineWidth = bw > 0 ? bw * 2 : 4;
            ctx.strokeRect(cx0 - 20, cy0 - 20, w - (cx0 - 20) * 2, h * (IS ? 0.44 : 0.48));
            const ps = IS ? 118 : 86;
            ctx.font = `700 ${ps}px Oswald,sans-serif`; ctx.fillStyle = '#fff';
            ctx.fillText(formatNumber(property.price) + ' ₽', cx0, cy0 + (IS ? ps : ps * 0.9));
            ctx.font = `300 ${IS ? 46 : 32}px Oswald,sans-serif`; ctx.fillStyle = mkGrad();
            ctx.fillText(addr.slice(0, 36), cx0, cy0 + (IS ? ps + 72 : ps + 52));
            ctx.font = `200 ${IS ? 30 : 20}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(parts.join('  ·  '), cx0, cy0 + (IS ? ps + 122 : ps + 88));
            const phy = h - (IS ? 130 : 95);
            ctx.font = `600 ${IS ? 46 : 32}px Oswald,sans-serif`; ctx.fillStyle = mkGrad(); ctx.fillText(phone, cx0, phy);
            if (name) { ctx.font = `300 ${IS ? 28 : 19}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText(name, cx0, phy + (IS ? 40 : 28)); }

        /* ── FRAME ──────────────────────────────────────────────────── */
        } else if (design === 'frame') {
            ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0, 0, w, h);
            const pad = bw > 0 ? bw * 8 : 48;
            // outer border
            ctx.strokeStyle = mkGrad(); ctx.lineWidth = bw > 0 ? bw * 2 : 6;
            ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
            // photo inside border
            const photoH = IS ? h * 0.58 - pad : h * 0.52 - pad;
            cov(imgs[0], pad + 10, pad + 10, w - pad * 2 - 20, photoH);
            // accent line
            ctx.fillStyle = mkGrad(); ctx.fillRect(pad + 10, photoH + pad + 10, w - pad * 2 - 20, lineW);
            const tx = pad + 30;
            let ty = IS ? h * 0.62 : h * 0.56;
            const ps = IS ? 108 : 76;
            ctx.font = `700 ${ps}px Oswald,sans-serif`; ctx.fillStyle = mkGrad();
            ctx.fillText(formatNumber(property.price) + ' ₽', tx, ty);
            ctx.font = `400 ${IS ? 46 : 32}px Oswald,sans-serif`; ctx.fillStyle = '#1C1C1E';
            ctx.fillText(addr.slice(0, 34), tx, ty + (IS ? 70 : 50));
            ctx.font = `300 ${IS ? 28 : 19}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(0,0,0,0.38)';
            ctx.fillText(parts.join('  ·  '), tx, ty + (IS ? 114 : 82));
            const phy = h - pad - (IS ? 60 : 45);
            ctx.font = `600 ${IS ? 44 : 30}px Oswald,sans-serif`; ctx.fillStyle = mkGrad(); ctx.fillText(phone, tx, phy);
            if (name) { ctx.font = `300 ${IS ? 26 : 18}px Oswald,sans-serif`; ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillText(name, tx, phy + (IS ? 38 : 26)); }
        }

        /* ── STICKERS ───────────────────────────────────────────────── */
        if (stickers.length) {
            const sp = IS ? 70 : 50, sh = IS ? 66 : 48, sf = IS ? 30 : 22;
            let sy = sp + 20;
            ctx.textAlign = 'center';
            stickers.forEach(txt => {
                ctx.font = `700 ${sf}px Oswald,sans-serif`;
                const tw = ctx.measureText(txt.toUpperCase()).width + 48;
                const sx = w - sp - tw;
                ctx.fillStyle = mkGrad();
                ctx.beginPath(); ctx.roundRect(sx, sy, tw, sh, 10); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText(txt.toUpperCase(), sx + tw / 2, sy + sh / 2 + sf / 3);
                sy += sh + 14;
            });
            ctx.textAlign = 'left';
        }

        setLoading(false);
    };

    const dl = () => {
        const a = document.createElement('a');
        a.download = `banner-${property.id}-${format}.png`;
        a.href = canvasRef.current.toDataURL('image/png');
        a.click();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,8,12,0.96)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'white' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} />
            </button>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, width: '100%', maxWidth: 1160, height: isMobile ? 'auto' : '85vh', alignItems: 'flex-start', overflowY: isMobile ? 'auto' : 'visible' }}>

                {/* Controls */}
                <div style={{ flex: isMobile ? 'none' : '0 0 310px', width: isMobile ? '100%' : 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, overflowY: 'auto', maxHeight: isMobile ? 'none' : '100%' }}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 11, fontWeight: 300, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', marginBottom: 18, textTransform: 'uppercase' }}>Баннер</div>

                    {/* Format */}
                    <Section label="ФОРМАТ">
                        <Grid2>
                            {[['story', 'Story 9:16'], ['post', 'Post 1:1']].map(([f, l]) => (
                                <Chip key={f} active={format === f} color={c1} onClick={() => setFormat(f)}>{l}</Chip>
                            ))}
                        </Grid2>
                    </Section>

                    {/* Design */}
                    <Section label="ДИЗАЙН">
                        <Grid2>
                            {DESIGNS.map(([d, l]) => (
                                <Chip key={d} active={design === d} color={c1} onClick={() => setDesign(d)}>{l}</Chip>
                            ))}
                        </Grid2>
                    </Section>

                    {/* Gradient presets */}
                    <Section label="ГРАДИЕНТЫ">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {GRADIENTS.map(g => (
                                <button key={g.n} title={g.n} onClick={() => { setC1(g.a); setC2(g.b); }}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.12)', cursor: 'pointer', background: `linear-gradient(135deg,${g.a},${g.b})` }} />
                            ))}
                        </div>
                    </Section>

                    {/* Dual color pickers */}
                    <Section label="">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[['ЦВЕТ 1', c1, setC1], ['ЦВЕТ 2', c2, setC2]].map(([lbl, val, setter]) => (
                                <div key={lbl}>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>{lbl}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: val, border: '1px solid rgba(255,255,255,0.15)' }} />
                                        <input type="color" value={val} onChange={e => setter(e.target.value)}
                                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Border */}
                    <Section label={`РАМКА / АКЦЕНТ: ${bw}`}>
                        <input type="range" min={0} max={20} value={bw} onChange={e => setBw(Number(e.target.value))}
                            style={{ width: '100%', accentColor: c1 }} />
                    </Section>

                    {/* Stickers */}
                    <Section label="СТИКЕРЫ">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {['Срочно', 'Эксклюзив', 'Торг', 'Ипотека'].map(s => (
                                <button key={s} onClick={() => setStickers(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald', background: stickers.includes(s) ? c1 : 'rgba(255,255,255,0.07)', color: stickers.includes(s) ? '#000' : 'rgba(255,255,255,0.6)' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                        <button onClick={() => setImgOff(o => o + 1)}
                            style={{ padding: '11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald' }}>
                            ↻ Фото
                        </button>
                        <button onClick={dl}
                            style={{ padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${c1},${c2})`, color: '#000', cursor: 'pointer', fontSize: 13, fontFamily: 'Oswald', fontWeight: 700, letterSpacing: '0.06em' }}>
                            ↓ СКАЧАТЬ
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div style={{ flex: 1, height: isMobile ? '500px' : '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ position: 'relative', height: '100%', aspectRatio: `${fmts[format].w}/${fmts[format].h}`, boxShadow: '0 40px 100px rgba(0,0,0,0.9)', borderRadius: 4, overflow: 'hidden', background: '#111' }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                                <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: c1 }} />
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
            {label && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 8, letterSpacing: '0.1em' }}>{label}</div>}
            {children}
        </div>
    );
}
function Grid2({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{children}</div>;
}
function Chip({ active, color, onClick, children }) {
    return (
        <button onClick={onClick} style={{ padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Oswald', letterSpacing: '0.05em', background: active ? color : 'rgba(255,255,255,0.07)', color: active ? '#000' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}>
            {children}
        </button>
    );
}
