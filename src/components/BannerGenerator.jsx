import React from 'react';
import { X, Download, Share2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber, formatPhone } from '../utils/format';
import { useApp } from '../context/AppContext';
import {
    getConnectedSocialNetworks,
    buildBannerCaption,
    getSocialTokenStatus,
    shareBannerToSocial,
} from '../lib/socialShare';

/* ================================================================
   CONSTANTS
   ================================================================ */

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
    '#14b8a6', // Teal
    '#1d4ed8', // Deep Blue
    '#0f766e', // Dark Teal
];

const DEAL_GOAL_OPTIONS = [
    { key: 'sell', label: 'Продажа', emoji: '' },
    { key: 'rent', label: 'Аренда', emoji: '' },
    { key: 'daily', label: 'Посуточно', emoji: '' },
    { key: 'exchange', label: 'Обмен', emoji: '' },
];

const BANNER_FORMATS = {
    story:   { w: 1080, h: 1920, label: 'Stories', hint: '9:16' },
    portrait:{ w: 1080, h: 1350, label: 'Пост',    hint: '4:5'  },
    post:    { w: 1080, h: 1080, label: 'Квадрат', hint: '1:1'  },
};

const DESIGN_THEMES = [
    { key: 'dark',  label: 'Тёмная'  },
    { key: 'light', label: 'Светлая' },
    { key: 'brand', label: 'Цветная' },
    { key: 'glass', label: 'Стекло'  },
];

const AVAILABLE_STICKERS = ['Свободная продажа', 'Встречный вариант', 'Срочно', 'Торг уместен', 'Свой текст'];

const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1080&q=80';

/* ================================================================
   HELPERS
   ================================================================ */

function safeRoundRect(ctx, x, y, w, h, r = 0) {
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

function getWrappedLines(ctx, text, maxWidth) {
    const words = (text || '').split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    return lines.filter(Boolean);
}

function getDealGoalLabel(dealType) {
    if (dealType === 'rent' || dealType === 'rent_long') return 'Аренда';
    if (dealType === 'rent_daily') return 'Посуточно';
    if (dealType === 'exchange') return 'Обмен';
    return 'Продажа';
}

function getCategoryText(type, rooms) {
    if (type === 'land') return 'ЗЕМЕЛЬНЫЙ УЧАСТОК';
    if (type === 'garden') return 'САД / ДАЧА';
    if (type === 'commercial') return 'КОММЕРЧЕСКАЯ НЕДВИЖИМОСТЬ';
    if (type === 'room') return 'КОМНАТА';
    if (type === 'house') return rooms > 0 ? `${rooms}-КОМНАТНЫЙ ДОМ` : 'ДОМ';
    if (type === 'apartment' || !type) {
        return rooms === 0 ? 'СТУДИЯ' : `${rooms}-КОМНАТНАЯ КВАРТИРА`;
    }
    return 'ОБЪЕКТ НЕДВИЖИМОСТИ';
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function BannerGenerator({ property = {}, currentUser, agent: propAgent, onClose, onOpenProfile }) {
    // Safe context extraction (may be used outside AppProvider)
    let appContext = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        appContext = useApp();
    } catch {
        // fallback
    }
    const state = appContext?.state;
    const effectiveUser = currentUser || state?.currentUser;
    const assignedAgent = propAgent || (property?.agent_id && state?.clients
        ? state.clients.find(c => c.id === property.agent_id)
        : null);

    /* ---- refs ---- */
    const canvasRef = React.useRef(null);
    const isMountedRef = React.useRef(true);
    const imageCacheRef = React.useRef(new Map());

    React.useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Close on Escape
    React.useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && typeof onClose === 'function') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    /* ---- derived defaults ---- */
    const defaultPhone = React.useMemo(() => {
        const raw = assignedAgent?.phone
            || assignedAgent?.phone_2
            || property?.contact_phone
            || currentUser?.phone
            || currentUser?.phone_number
            || property?.realtor_phone
            || '';
        return raw ? (formatPhone(raw) || raw) : '';
    }, [assignedAgent, property, currentUser]);

    const defaultLocation = React.useMemo(() => {
        if (property?.microdistrict) return `мкр. ${property.microdistrict}`;
        if (property?.district) return property.district;
        if (property?.residential_complex) return `ЖК «${property.residential_complex}»`;
        return '';
    }, [property?.microdistrict, property?.district, property?.residential_complex]);

    const defaultAgentName = React.useMemo(() => {
        if (assignedAgent?.full_name) return assignedAgent.full_name.split(' ').slice(0, 2).join(' ');
        if (currentUser?.full_name) return currentUser.full_name.split(' ').slice(0, 2).join(' ');
        return '';
    }, [assignedAgent, currentUser]);

    /* ---- state ---- */
    const [phone, setPhone]           = React.useState(defaultPhone);
    const [locationText, setLocation]  = React.useState(defaultLocation);
    const [agentName, setAgentName]    = React.useState(defaultAgentName);

    const [format, setFormat]           = React.useState('story');
    const [designTheme, setDesignTheme] = React.useState('dark');
    const [fitMode, setFitMode]         = React.useState('contain');
    const [accentColor, setAccentColor] = React.useState('#0052FF');

    const initialGoal = React.useMemo(() => getDealGoalLabel(property?.deal_type), [property?.deal_type]);
    const [dealGoal, setDealGoal]         = React.useState(initialGoal);
    const [showDealGoal, setShowDealGoal] = React.useState(true);
    const [customGoalText, setCustomGoal] = React.useState('');

    const [stickers, setStickers]                 = React.useState([]);
    const [customStickerText, setCustomSticker]   = React.useState('');
    const [loading, setLoading]                   = React.useState(false);

    const propertyImages = React.useMemo(() => {
        return (Array.isArray(property?.images) && property.images.length > 0)
            ? property.images
            : [DEFAULT_BANNER_IMAGE];
    }, [property?.images]);

    const [selectedImages, setSelectedImages] = React.useState(() => {
        if (property?.images && property.images.length > 1) {
            return property.images.slice(0, Math.min(property.images.length, 4)).map((_, i) => i);
        }
        return [0];
    });
    const [gridLayout, setGridLayout] = React.useState('grid');

    const [availableLayouts, setAvailableLayouts] = React.useState(() => property?.floorplan_images || []);
    const [layoutImage, setLayoutImage] = React.useState(() =>
        (property?.floorplan_images && property.floorplan_images.length > 0)
            ? property.floorplan_images[0]
            : null
    );

    // Social share
    const [showSocialPanel, setShowSocialPanel] = React.useState(false);
    const [sharingNetworkId, setSharingNetworkId] = React.useState(null);
    const [shareFeedback, setShareFeedback]     = React.useState(null);
    const [tokenStatus, setTokenStatus]         = React.useState(null);

    // Collapsible sections
    const [openSections, setOpenSections] = React.useState({
        format: true, theme: true, goal: true, photo: true, agent: true,
        layout: false, stickers: false, colors: false,
    });
    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    /* ---- social networks ---- */
    const connectedSocials = React.useMemo(
        () => getConnectedSocialNetworks(effectiveUser),
        [effectiveUser]
    );

    React.useEffect(() => {
        if (!showSocialPanel || tokenStatus !== null) return;
        const needsApiStatus = connectedSocials.some(n => n.supportsApi && n.account?.publishMode === 'api');
        if (!needsApiStatus) return;
        let active = true;
        getSocialTokenStatus()
            .then(s => { if (active && s) setTokenStatus(s); })
            .catch(() => { if (active) setTokenStatus({ vk: { hasToken: false }, tg: { hasToken: false } }); });
        return () => { active = false; };
    }, [showSocialPanel, tokenStatus, connectedSocials]);

    /* ---- image loading ---- */
    const loadImageSafe = React.useCallback((src, isFloorplan = false) => {
        if (!src) return Promise.resolve(null);
        if (imageCacheRef.current.has(src)) return Promise.resolve(imageCacheRef.current.get(src));
        return new Promise(resolve => {
            const img = new Image();
            if (!isFloorplan && !src.startsWith('data:') && !src.startsWith('blob:')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => { imageCacheRef.current.set(src, img); resolve(img); };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }, []);

    const handleLayoutUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const urls = files.map(f => URL.createObjectURL(f));
        setAvailableLayouts(prev => [...prev, ...urls]);
        setLayoutImage(urls[0]);
    };

    /* ================================================================
       DRAW FUNCTION
       ================================================================ */
    const draw = React.useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !isMountedRef.current) return;

        const { w, h } = BANNER_FORMATS[format] || BANNER_FORMATS.story;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const IS = format === 'story';
        const isPortrait = format === 'portrait';

        // Theme helpers
        const isDark  = designTheme === 'dark';
        const isLight = designTheme === 'light';
        const isBrand = designTheme === 'brand';
        const isGlass = designTheme === 'glass';

        try {
            const hasUncached = selectedImages.some(
                idx => !imageCacheRef.current.has(propertyImages[idx % propertyImages.length])
            );
            if (hasUncached) setLoading(true);

            const promises = selectedImages.map(idx => {
                const src = propertyImages[idx % propertyImages.length];
                return loadImageSafe(src, false).then(img => ({ img, idx }));
            });
            if (layoutImage) {
                promises.push(loadImageSafe(layoutImage, true).then(img => ({ img, idx: -1 })));
            }

            const results = await Promise.all(promises);
            if (!isMountedRef.current) return;

            let loadedLayoutImg = null;
            const loadedImgs = [];
            results.forEach(res => {
                if (!res?.img) return;
                if (res.idx === -1) loadedLayoutImg = res.img;
                else loadedImgs.push(res);
            });
            loadedImgs.sort((a, b) => selectedImages.indexOf(a.idx) - selectedImages.indexOf(b.idx));
            const imgs = loadedImgs.map(r => r.img).filter(Boolean);
            if (!imgs.length) return;

            /* ---- SCALE UNITS ---- */
            const U = w / 1080; // 1.0 at 1080px width

            const PAD = Math.round(60 * U);
            const CORNER_R = Math.round(28 * U);

            /* ---- BACKGROUND ---- */
            if (isLight) {
                ctx.fillStyle = '#F8FAFC';
            } else if (isBrand) {
                // gradient background
                const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
                bgGrad.addColorStop(0, '#0F172A');
                bgGrad.addColorStop(1, accentColor + 'CC');
                ctx.fillStyle = bgGrad;
            } else {
                ctx.fillStyle = '#0D1117';
            }
            ctx.fillRect(0, 0, w, h);

            /* ---- PHOTO ZONE ---- */
            // For dark/glass: photo fills upper portion; for light/brand: also upper portion
            const photoRatio = IS ? 0.60 : (isPortrait ? 0.56 : 0.52);
            let photoH = Math.round(h * photoRatio);

            // Adapt height to single image ratio in contain mode
            if (fitMode === 'contain' && imgs.length === 1 && imgs[0]?.width && imgs[0]?.height) {
                const ir = imgs[0].width / imgs[0].height;
                if (Number.isFinite(ir) && ir > 0) {
                    const natural = Math.round(w / ir);
                    const maxH = Math.round(h * (IS ? 0.65 : (isPortrait ? 0.60 : 0.56)));
                    const minH = Math.round(h * 0.38);
                    photoH = Math.min(maxH, Math.max(minH, natural));
                }
            }

            // Photo area bounds (with optional card margin)
            const cardMargin = isLight ? Math.round(28 * U) : 0;
            const photoX = cardMargin;
            const photoY = cardMargin;
            const photoW = w - cardMargin * 2;
            const photoBH = photoH - cardMargin;

            /* ---- DRAW PHOTO CELLS ---- */
            const drawCell = (img, cx, cy, cw, ch) => {
                if (!img || !img.width || !img.height || !cw || !ch) return;
                const ir = img.width / img.height;
                const cr = cw / ch;
                ctx.save();
                ctx.beginPath();
                ctx.rect(cx, cy, cw, ch);
                ctx.clip();

                if (fitMode === 'cover') {
                    let dw, dh, dx, dy;
                    if (ir > cr) { dh = ch; dw = ch * ir; dx = cx - (dw - cw) / 2; dy = cy; }
                    else { dw = cw; dh = cw / ir; dx = cx; dy = cy - (dh - ch) / 2; }
                    ctx.drawImage(img, dx, dy, dw, dh);
                } else {
                    // Blurred background fill
                    let bgDw, bgDh, bgDx, bgDy;
                    if (ir > cr) { bgDh = ch; bgDw = ch * ir; bgDx = cx - (bgDw - cw) / 2; bgDy = cy; }
                    else { bgDw = cw; bgDh = cw / ir; bgDx = cx; bgDy = cy - (bgDh - ch) / 2; }
                    ctx.globalAlpha = 0.18;
                    ctx.drawImage(img, bgDx, bgDy, bgDw, bgDh);
                    ctx.fillStyle = isLight ? 'rgba(248,250,252,0.8)' : 'rgba(13,17,23,0.78)';
                    ctx.fillRect(cx, cy, cw, ch);
                    ctx.globalAlpha = 1;

                    let dw, dh, dx, dy;
                    if (ir > cr) { dw = cw; dh = cw / ir; dx = cx; dy = cy + (ch - dh) / 2; }
                    else { dh = ch; dw = ch * ir; dx = cx + (cw - dw) / 2; dy = cy; }
                    ctx.drawImage(img, dx, dy, dw, dh);
                }
                ctx.restore();
            };

            // Build grid rects
            const N = imgs.length;
            const rects = [];
            if (N <= 1) {
                rects.push({ x: photoX, y: photoY, w: photoW, h: photoBH });
            } else if (gridLayout === 'vertical') {
                const cw = photoW / N;
                for (let i = 0; i < N; i++) rects.push({ x: photoX + i * cw, y: photoY, w: cw, h: photoBH });
            } else if (gridLayout === 'horizontal') {
                const rh = photoBH / N;
                for (let i = 0; i < N; i++) rects.push({ x: photoX, y: photoY + i * rh, w: photoW, h: rh });
            } else if (gridLayout === 'main-stack') {
                const split = 0.62;
                if (IS || isPortrait) {
                    rects.push({ x: photoX, y: photoY, w: photoW, h: Math.round(photoBH * split) });
                    const sh = photoBH - Math.round(photoBH * split);
                    const sw = photoW / (N - 1);
                    for (let j = 0; j < N - 1; j++) {
                        rects.push({ x: photoX + j * sw, y: photoY + Math.round(photoBH * split), w: sw, h: sh });
                    }
                } else {
                    rects.push({ x: photoX, y: photoY, w: Math.round(photoW * split), h: photoBH });
                    const sw = photoW - Math.round(photoW * split);
                    const sh = photoBH / (N - 1);
                    for (let j = 0; j < N - 1; j++) {
                        rects.push({ x: photoX + Math.round(photoW * split), y: photoY + j * sh, w: sw, h: sh });
                    }
                }
            } else {
                // grid
                const cols = Math.ceil(Math.sqrt(N));
                const rows = Math.ceil(N / cols);
                const cw = photoW / cols;
                const rh = photoBH / rows;
                for (let i = 0; i < N; i++) {
                    const ri = Math.floor(i / cols), ci = i % cols;
                    rects.push({ x: photoX + ci * cw, y: photoY + ri * rh, w: cw, h: rh });
                }
            }

            // Clip & draw photo cells (card style: rounded corners)
            if (isLight) {
                ctx.save();
                ctx.beginPath();
                safeRoundRect(ctx, photoX, photoY, photoW, photoBH, CORNER_R);
                ctx.clip();
            }
            rects.forEach((r, i) => drawCell(imgs[i % imgs.length], r.x, r.y, r.w, r.h));

            // Cell dividers
            if (N > 1) {
                ctx.save();
                ctx.strokeStyle = isLight ? 'rgba(248,250,252,0.9)' : 'rgba(13,17,23,0.7)';
                ctx.lineWidth = Math.round(6 * U);
                rects.forEach(r => ctx.strokeRect(r.x, r.y, r.w, r.h));
                ctx.restore();
            }

            if (isLight) ctx.restore();

            /* ---- GRADIENT OVERLAY (dark themes) ---- */
            if (isDark || isBrand || isGlass) {
                const overlayStart = IS ? 0.44 : (isPortrait ? 0.40 : 0.36);
                const grad = ctx.createLinearGradient(0, h, 0, h * overlayStart);
                if (isGlass) {
                    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
                    grad.addColorStop(0.3, 'rgba(0,0,0,0.80)');
                    grad.addColorStop(0.6, 'rgba(0,0,0,0.40)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                } else {
                    grad.addColorStop(0, 'rgba(0,0,0,1.0)');
                    grad.addColorStop(0.22, 'rgba(0,0,0,0.96)');
                    grad.addColorStop(0.52, 'rgba(0,0,0,0.80)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, h * overlayStart, w, h * (1 - overlayStart));
            }

            /* ---- TEXT ZONE ---- */
            // For dark themes text sits over the gradient (bottom portion of canvas)
            // For light theme text sits below the photo card

            const textBgY = isDark || isBrand || isGlass ? Math.round(h * (IS ? 0.52 : (isPortrait ? 0.48 : 0.44))) : photoH + Math.round(16 * U);

            // Colors by theme
            const clrPrimary   = isLight ? '#0F172A' : '#FFFFFF';
            const clrSecondary = isLight ? '#475569' : 'rgba(226,232,240,0.85)';
            const clrMuted     = isLight ? '#94A3B8' : 'rgba(148,163,184,0.75)';
            const clrAccent    = isBrand ? '#FFFFFF' : accentColor;
            const clrCategory  = isLight ? '#94A3B8' : 'rgba(203,213,225,0.65)';

            // Font sizes (scaled to canvas)
            const fsCat     = Math.round(26 * U);
            const fsPrice   = Math.round(IS ? 92 : (isPortrait ? 84 : 76) * U);
            const fsSqm     = Math.round(IS ? 40 : (isPortrait ? 36 : 32) * U);
            const fsAddr    = Math.round(IS ? 56 : (isPortrait ? 50 : 46) * U);
            const fsDetails = Math.round(IS ? 36 : (isPortrait ? 32 : 28) * U);
            const fsPhone   = Math.round(IS ? 48 : (isPortrait ? 42 : 38) * U);
            const fsAgent   = Math.round(IS ? 32 : (isPortrait ? 28 : 24) * U);

            // Max text width
            const maxTW = w - PAD * 2;

            // ---- Category label ----
            const rawAddr = (property?.address || property?.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
            const loc = (locationText || '').trim();
            const addr = loc
                ? (rawAddr && !rawAddr.toLowerCase().includes(loc.toLowerCase()) ? `${loc}, ${rawAddr}` : (rawAddr || loc))
                : rawAddr;

            const catText = getCategoryText(property?.property_type, property?.rooms);

            let curY = textBgY;

            ctx.font = `400 ${fsCat}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = clrCategory;
            ctx.fillText(catText, PAD, curY);
            curY += Math.round(fsCat * 1.2);

            // ---- Price ----
            curY += Math.round(16 * U);
            const priceText = formatNumber(property?.price) + ' \u20BD';
            ctx.font = `700 ${fsPrice}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = clrAccent;
            ctx.fillText(priceText, PAD, curY);
            const priceW = ctx.measureText(priceText).width;

            if (property?.price && property?.area_total) {
                const m2 = Math.round(property.price / property.area_total);
                ctx.font = `300 ${fsSqm}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = clrMuted;
                ctx.fillText(`${formatNumber(m2)} \u20BD/\u043C\u00B2`, PAD + priceW + Math.round(28 * U), curY);
            }
            curY += Math.round(fsPrice * 0.22);

            // ---- Address ----
            curY += Math.round(18 * U);
            if (addr) {
                ctx.font = `700 ${fsAddr}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = clrPrimary;
                const addrLines = getWrappedLines(ctx, addr, maxTW);
                for (const line of addrLines) {
                    ctx.fillText(line, PAD, curY);
                    curY += Math.round(fsAddr * 1.22);
                }
            }

            // ---- Details (rooms, area, floor) ----
            const parts = [];
            const type = property?.property_type;
            const rooms = property?.rooms;
            if (type === 'apartment' || !type) {
                if (rooms !== undefined) parts.push(rooms === 0 ? 'Студия' : `${rooms}-комн.`);
            } else if (type === 'house' && rooms > 0) {
                parts.push(`${rooms}-комн.`);
            } else if (type === 'room') {
                parts.push('Комната');
            }
            if (property?.area_total) parts.push(`${property.area_total} \u043C\u00B2`);
            if (['apartment', 'room', 'commercial'].includes(type) && property?.floor) {
                parts.push(`${property.floor}/${property.floors_total || '?'} \u044D\u0442.`);
            } else if (type === 'house' && property?.floors_total) {
                parts.push(`${property.floors_total} \u044D\u0442.`);
            }

            if (parts.length) {
                curY += Math.round(8 * U);
                ctx.font = `300 ${fsDetails}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = clrSecondary;
                ctx.fillText(parts.join('  \u00B7  '), PAD, curY);
                curY += Math.round(fsDetails * 1.3);
            }

            // ---- Divider ----
            curY += Math.round(14 * U);
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = Math.round(1.5 * U);
            ctx.beginPath();
            ctx.moveTo(PAD, curY);
            ctx.lineTo(PAD + maxTW * 0.35, curY);
            ctx.stroke();
            ctx.restore();
            curY += Math.round(18 * U);

            // ---- Phone & Agent Name ----
            const activePhone = phone?.trim() ? (formatPhone(phone) || phone) : '+7 (999) 000-00-00';
            ctx.font = `700 ${fsPhone}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = clrPrimary;
            ctx.fillText(activePhone, PAD, curY);
            curY += Math.round(fsPhone * 1.3);

            if (agentName.trim()) {
                ctx.font = `300 ${fsAgent}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = clrMuted;
                ctx.fillText(agentName.trim(), PAD, curY);
            }

            /* ---- FLOORPLAN BADGE ---- */
            if (loadedLayoutImg) {
                const boxSize = Math.round((IS ? 480 : (isPortrait ? 400 : 350)) * U);
                // Position: bottom-right of photo zone, with padding
                const bPad = Math.round(32 * U);
                const boxX = w - bPad - boxSize;
                const boxY = photoH - boxSize - Math.round((IS ? 36 : 24) * U);

                // White card shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.30)';
                ctx.shadowBlur = Math.round(32 * U);
                ctx.shadowOffsetY = Math.round(8 * U);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                safeRoundRect(ctx, boxX, boxY, boxSize, boxSize, Math.round(20 * U));
                ctx.fill();
                ctx.restore();

                const p = Math.round(18 * U);
                ctx.save();
                ctx.beginPath();
                safeRoundRect(ctx, boxX + p, boxY + p, boxSize - p * 2, boxSize - p * 2, Math.round(12 * U));
                ctx.clip();
                const iw = loadedLayoutImg.width, ih = loadedLayoutImg.height;
                const ir = (iw && ih) ? iw / ih : 1;
                const inner = boxSize - p * 2;
                let dw, dh, dx, dy;
                if (ir > 1) { dw = inner; dh = inner / ir; dx = boxX + p; dy = boxY + p + (inner - dh) / 2; }
                else { dh = inner; dw = inner * ir; dx = boxX + p + (inner - dw) / 2; dy = boxY + p; }
                ctx.drawImage(loadedLayoutImg, dx, dy, dw, dh);
                ctx.restore();
            }

            /* ---- DEAL GOAL BADGE (top-right) ---- */
            const badgePad = Math.round((IS ? 64 : (isPortrait ? 54 : 48)) * U);
            let dealBadgeBottom = badgePad + Math.round(20 * U);

            if (showDealGoal) {
                const goalStr = (dealGoal === 'custom' ? customGoalText.trim() : dealGoal) || 'Продажа';
                const badgeText = goalStr.toUpperCase();
                const badgeH = Math.round((IS ? 68 : (isPortrait ? 58 : 52)) * U);
                const bFont = Math.round((IS ? 28 : (isPortrait ? 24 : 22)) * U);
                ctx.font = `800 ${bFont}px 'Medeo Sans', system-ui, sans-serif`;
                const tw = ctx.measureText(badgeText).width;
                const bPadX = Math.round((IS ? 32 : 26) * U);
                const badgeW = tw + bPadX * 2;
                const badgeX = w - badgePad - badgeW;
                const badgeY = badgePad;

                // Shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = Math.round(20 * U);
                ctx.shadowOffsetY = Math.round(4 * U);

                // Fill
                const goalColor = goalStr === 'Аренда' ? '#10b981'
                    : goalStr === 'Посуточно' ? '#f97316'
                    : goalStr === 'Обмен' ? '#8b5cf6'
                    : accentColor;

                ctx.beginPath();
                safeRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(14 * U));
                ctx.fillStyle = goalColor;
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = '#ffffff';
                ctx.font = `800 ${bFont}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + bFont * 0.36);
                ctx.textAlign = 'left';

                dealBadgeBottom = badgeY + badgeH + Math.round(12 * U);
            }

            /* ---- STICKERS ---- */
            if (stickers.length) {
                const sh = Math.round((IS ? 62 : (isPortrait ? 54 : 46)) * U);
                const sf = Math.round((IS ? 26 : (isPortrait ? 23 : 20)) * U);
                let sy = showDealGoal ? dealBadgeBottom : (badgePad + Math.round(20 * U));
                stickers.forEach(s => {
                    const txt = s === 'Свой текст' ? (customStickerText.trim() || 'Свой текст') : s;
                    ctx.font = `700 ${sf}px 'Medeo Sans', system-ui, sans-serif`;
                    const tw = ctx.measureText(txt.toUpperCase()).width + Math.round(44 * U);
                    const sx = w - badgePad - tw;

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = Math.round(14 * U);
                    ctx.shadowOffsetY = Math.round(3 * U);
                    ctx.fillStyle = s === 'Срочно' ? '#EF4444' : (isLight ? '#0F172A' : 'rgba(255,255,255,0.12)');
                    ctx.beginPath();
                    safeRoundRect(ctx, sx, sy, tw, sh, Math.round(10 * U));
                    ctx.fill();

                    // Outline for glass stickers
                    if (!isLight && s !== 'Срочно') {
                        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                        ctx.lineWidth = Math.round(1.5 * U);
                        ctx.stroke();
                    }
                    ctx.restore();

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = `700 ${sf}px 'Medeo Sans', system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(txt.toUpperCase(), sx + tw / 2, sy + sh / 2 + sf * 0.37);
                    ctx.textAlign = 'left';
                    sy += sh + Math.round(12 * U);
                });
            }

            if (isMountedRef.current && hasUncached) setLoading(false);

        } catch (err) {
            console.error('[BannerGenerator] draw error:', err);
            if (isMountedRef.current) setLoading(false);
        }
    }, [
        format, designTheme, fitMode, accentColor,
        dealGoal, showDealGoal, customGoalText,
        selectedImages, gridLayout,
        stickers, customStickerText,
        property?.address, property?.city, property?.property_type,
        property?.rooms, property?.area_total, property?.price,
        property?.floor, property?.floors_total,
        propertyImages, layoutImage, phone, agentName, locationText,
        loadImageSafe,
    ]);

    React.useEffect(() => { draw(); }, [draw]);

    /* ---- Actions ---- */
    const handleDownload = () => {
        if (!canvasRef.current) return;
        try {
            const a = document.createElement('a');
            a.download = `banner-${property?.id || 'object'}-${format}.png`;
            a.href = canvasRef.current.toDataURL('image/png');
            a.click();
        } catch (err) {
            console.error('[BannerGenerator] download error:', err);
        }
    };

    const handleOpenProfile = () => {
        if (typeof onClose === 'function') onClose();
        if (typeof onOpenProfile === 'function') onOpenProfile();
        else if (typeof window !== 'undefined') window.location.hash = '#/profile';
    };

    const handleShareSocial = async (net) => {
        if (!canvasRef.current || sharingNetworkId) return;
        setSharingNetworkId(net.id);
        setShareFeedback(null);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const caption = buildBannerCaption(property, phone, locationText);
            const linkUrl = typeof window !== 'undefined' && property?.id
                ? `${window.location.origin}/#/p/${property.id}` : '';

            let cur = tokenStatus;
            if (net.supportsApi && net.account?.publishMode === 'api' && cur === null) {
                try { cur = await getSocialTokenStatus(); setTokenStatus(cur); }
                catch { cur = { vk: { hasToken: false }, tg: { hasToken: false } }; }
            }

            const result = await shareBannerToSocial({
                networkId: net.id, dataUrl,
                fileName: `banner-${property?.id || 'object'}-${format}.png`,
                caption, linkUrl, account: net.account, tokenStatus: cur,
            });

            if (result?.ok) setShareFeedback({ type: 'success', text: result.message });
            else if (result?.cancelled) setShareFeedback({ type: 'info', text: result.message });
        } catch (err) {
            setShareFeedback({ type: 'error', text: err?.message || `Не удалось отправить в ${net.storyLabel}` });
        } finally {
            setSharingNetworkId(null);
        }
    };

    /* ================================================================
       RENDER
       ================================================================ */

    const AC = 'var(--primary)';

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget && typeof onClose === 'function') onClose(); }}
            style={S.overlay}
        >
            {/* Close button */}
            <button
                type="button"
                onClick={e => { e.stopPropagation(); if (typeof onClose === 'function') onClose(); }}
                style={S.closeBtn}
                title="Закрыть (Esc)"
            >
                <X size={20} />
            </button>

            <div style={{ ...S.root, flexDirection: isMobile ? 'column' : 'row' }}>

                {/* ======== LEFT PANEL ======== */}
                <div style={S.panel}>
                    {/* Header */}
                    <div style={S.panelHeader}>
                        <span style={S.panelTitle}>Создание баннера</span>
                    </div>

                    <div style={S.panelBody}>

                        {/* FORMAT */}
                        <Collapsible label="Формат" icon="F" open={openSections.format} onToggle={() => toggleSection('format')}>
                            <div style={S.formatGrid}>
                                {Object.entries(BANNER_FORMATS).map(([key, fmt]) => (
                                    <FormatCard
                                        key={key}
                                        active={format === key}
                                        label={fmt.label}
                                        hint={fmt.hint}
                                        ratio={fmt.w / fmt.h}
                                        color={AC}
                                        onClick={() => setFormat(key)}
                                    />
                                ))}
                            </div>
                        </Collapsible>

                        {/* THEME */}
                        <Collapsible label="Тема" icon="T" open={openSections.theme} onToggle={() => toggleSection('theme')}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {DESIGN_THEMES.map(t => (
                                    <PillBtn
                                        key={t.key}
                                        active={designTheme === t.key}
                                        color={AC}
                                        onClick={() => setDesignTheme(t.key)}
                                    >
                                        {t.label}
                                    </PillBtn>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                <span style={S.subLabel}>Фото:</span>
                                {[['contain', 'Целиком'], ['cover', 'Заполнить']].map(([m, l]) => (
                                    <PillBtn key={m} active={fitMode === m} color={AC} onClick={() => setFitMode(m)}>
                                        {l}
                                    </PillBtn>
                                ))}
                            </div>
                        </Collapsible>

                        {/* DEAL GOAL */}
                        <Collapsible label="Цель сделки" icon="C" open={openSections.goal} onToggle={() => toggleSection('goal')}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                {DEAL_GOAL_OPTIONS.map(g => (
                                    <PillBtn
                                        key={g.key}
                                        active={showDealGoal && dealGoal === g.label}
                                        color={AC}
                                        onClick={() => { setDealGoal(g.label); setShowDealGoal(true); }}
                                    >
                                        {g.label}
                                    </PillBtn>
                                ))}
                                <PillBtn active={!showDealGoal} color={AC} onClick={() => setShowDealGoal(p => !p)}>
                                    {showDealGoal ? 'Скрыть' : 'Показать'}
                                </PillBtn>
                            </div>
                            {showDealGoal && (
                                <input
                                    type="text"
                                    value={dealGoal === 'custom' ? customGoalText : ''}
                                    onChange={e => { setDealGoal('custom'); setCustomGoal(e.target.value); }}
                                    placeholder="Свой текст плашки..."
                                    style={S.input}
                                />
                            )}
                        </Collapsible>

                        {/* PHOTOS */}
                        <Collapsible label="Фотографии" icon="F" open={openSections.photo} onToggle={() => toggleSection('photo')}>
                            {propertyImages.length > 1 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                    {propertyImages.map((url, idx) => {
                                        const sel = selectedImages.includes(idx);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedImages(prev => {
                                                    if (prev.includes(idx)) return prev.length === 1 ? prev : prev.filter(i => i !== idx);
                                                    return prev.length >= 9 ? prev : [...prev, idx];
                                                })}
                                                style={{ ...S.thumb, border: `2px solid ${sel ? AC : 'transparent'}`, opacity: sel ? 1 : 0.4 }}
                                            >
                                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                {sel && <div style={S.thumbCheck}>✓</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedImages.length >= 2 && (
                                <>
                                    <div style={S.subLabel}>Сетка:</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        {[['grid', 'Сетка'], ['main-stack', 'Главное'], ['vertical', 'Колонки'], ['horizontal', 'Строки']].map(([l, t]) => (
                                            <PillBtn key={l} active={gridLayout === l} color={AC} onClick={() => setGridLayout(l)}>{t}</PillBtn>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Collapsible>

                        {/* AGENT */}
                        <Collapsible label="Агент" icon="A" open={openSections.agent} onToggle={() => toggleSection('agent')}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div>
                                    <div style={S.subLabel}>Телефон</div>
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        value={phone}
                                        onChange={e => setPhone(formatPhone(e.target.value, true))}
                                        placeholder="+7 (___) ___-__-__"
                                        style={S.input}
                                    />
                                    <PhoneQuickPick
                                        assignedAgent={assignedAgent}
                                        currentUser={currentUser}
                                        property={property}
                                        phone={phone}
                                        setPhone={setPhone}
                                        color={AC}
                                    />
                                </div>
                                <div>
                                    <div style={S.subLabel}>Имя агента</div>
                                    <input
                                        type="text"
                                        value={agentName}
                                        onChange={e => setAgentName(e.target.value)}
                                        placeholder="Иванов Иван"
                                        style={S.input}
                                    />
                                </div>
                                <div>
                                    <div style={S.subLabel}>Локация</div>
                                    <input
                                        type="text"
                                        value={locationText}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Микрорайон, район или ЖК"
                                        style={S.input}
                                    />
                                    <LocationQuickPick property={property} locationText={locationText} setLocation={setLocation} color={AC} />
                                </div>
                            </div>
                        </Collapsible>

                        {/* LAYOUT */}
                        <Collapsible label="Планировка" icon="P" open={openSections.layout} onToggle={() => toggleSection('layout')}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setLayoutImage(null)}
                                    style={{ ...S.thumb, border: `2px solid ${layoutImage === null ? AC : 'var(--border)'}`, color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}
                                >
                                    НЕТ
                                </button>
                                {availableLayouts.map((url, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setLayoutImage(url)}
                                        style={{ ...S.thumb, border: `2px solid ${layoutImage === url ? AC : 'transparent'}`, opacity: layoutImage === url ? 1 : 0.5 }}
                                    >
                                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                                <label style={{ ...S.thumb, border: '2px dashed var(--border)', fontSize: 20, color: 'var(--text-muted)' }}>
                                    +
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLayoutUpload} />
                                </label>
                            </div>
                        </Collapsible>

                        {/* STICKERS */}
                        <Collapsible label="Стикеры" icon="S" open={openSections.stickers} onToggle={() => toggleSection('stickers')}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {AVAILABLE_STICKERS.map(s => {
                                    const on = stickers.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setStickers(p => on ? p.filter(x => x !== s) : [...p, s])}
                                            style={{ ...S.stickerRow, fontWeight: on ? 600 : 400, color: on ? AC : 'var(--text-muted)' }}
                                        >
                                            <span style={{ ...S.stickerDot, background: on ? AC : 'var(--border)' }} />
                                            {s}
                                        </button>
                                    );
                                })}
                                {stickers.includes('Свой текст') && (
                                    <input
                                        type="text"
                                        value={customStickerText}
                                        onChange={e => setCustomSticker(e.target.value)}
                                        placeholder="Свой текст стикера..."
                                        style={{ ...S.input, marginTop: 6 }}
                                    />
                                )}
                            </div>
                        </Collapsible>

                        {/* COLORS */}
                        <Collapsible label="Акцент" icon="C" open={openSections.colors} onToggle={() => toggleSection('colors')}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {TRENDING_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setAccentColor(c)}
                                        title={c}
                                        style={{
                                            width: 26, height: 26, borderRadius: '50%', background: c,
                                            border: accentColor === c ? '3px solid var(--text)' : '2px solid transparent',
                                            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                                            transform: accentColor === c ? 'scale(1.18)' : 'scale(1)',
                                            transition: 'all 0.15s',
                                        }}
                                    />
                                ))}
                            </div>
                        </Collapsible>

                    </div>

                    {/* ---- Actions footer ---- */}
                    <div style={S.panelFooter}>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedImages.length === 1) {
                                    setSelectedImages([(selectedImages[0] + 1) % propertyImages.length]);
                                } else {
                                    setSelectedImages(prev => [...prev.slice(1), prev[0]]);
                                }
                            }}
                            style={S.btnSecondary}
                        >
                            Сдвиг фото
                        </button>
                        <button type="button" onClick={handleDownload} style={{ ...S.btnPrimary, background: AC }}>
                            <Download size={15} style={{ flexShrink: 0 }} />
                            Скачать
                        </button>
                    </div>

                    {/* Share to socials */}
                    <div style={S.shareWrap}>
                        <button
                            type="button"
                            onClick={() => { setShowSocialPanel(p => !p); setShareFeedback(null); }}
                            style={{ ...S.shareToggle, borderColor: showSocialPanel ? AC : 'var(--border)', color: showSocialPanel ? AC : 'var(--text-secondary)' }}
                        >
                            <Share2 size={14} />
                            <span>В мои соцсети{connectedSocials.length > 0 ? ` (${connectedSocials.length})` : ''}</span>
                        </button>

                        {showSocialPanel && (
                            <div style={S.socialPanel}>
                                {connectedSocials.length > 0 ? (
                                    <>
                                        <div style={S.socialHint}>Отправить фото баннера</div>
                                        {connectedSocials.map(net => {
                                            const busy = sharingNetworkId === net.id;
                                            return (
                                                <button
                                                    key={net.id}
                                                    type="button"
                                                    disabled={Boolean(sharingNetworkId)}
                                                    onClick={() => handleShareSocial(net)}
                                                    style={{
                                                        ...S.socialNetBtn,
                                                        borderColor: net.color + '44',
                                                        opacity: sharingNetworkId && !busy ? 0.5 : 1,
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: net.color, flexShrink: 0 }} />
                                                        {net.storyLabel}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                        {busy ? 'Отправка...' : (net.supportsApi && net.account?.publishMode === 'api' ? 'API' : 'Share')}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <button type="button" onClick={handleOpenProfile} style={S.settingsLink}>
                                            <Settings size={11} /> Настроить в профиле
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
                                            Подключите VK, OK, Telegram, Instagram или WhatsApp
                                        </p>
                                        <button type="button" onClick={handleOpenProfile} style={{ ...S.btnPrimary, background: AC, justifyContent: 'center' }}>
                                            <Settings size={13} /> Подключить в профиле
                                        </button>
                                    </div>
                                )}
                                {shareFeedback && (
                                    <div style={{
                                        ...S.feedbackBadge,
                                        background: shareFeedback.type === 'error' ? 'var(--danger-light,#fef2f2)' : shareFeedback.type === 'success' ? 'var(--success-light,#ecfdf5)' : 'var(--bg)',
                                        color: shareFeedback.type === 'error' ? 'var(--danger,#dc2626)' : shareFeedback.type === 'success' ? '#059669' : 'var(--text-secondary)',
                                    }}>
                                        {shareFeedback.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ======== PREVIEW ======== */}
                <div style={S.previewWrap}>
                    <div style={{ ...S.previewCard, aspectRatio: `${BANNER_FORMATS[format].w}/${BANNER_FORMATS[format].h}` }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                        {loading && (
                            <div style={S.loadingOverlay}>
                                <div style={S.spinner} />
                            </div>
                        )}
                    </div>
                    <div style={S.previewHint}>
                        {BANNER_FORMATS[format].label} &nbsp;{BANNER_FORMATS[format].hint}
                        &nbsp;·&nbsp;{BANNER_FORMATS[format].w}&times;{BANNER_FORMATS[format].h}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   INLINE STYLE TOKENS
   ================================================================ */
const S = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, color: 'var(--text)',
    },
    closeBtn: {
        position: 'absolute', top: 16, right: 16, zIndex: 10001,
        width: 40, height: 40, borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
    },
    root: {
        display: 'flex', gap: 16,
        width: '100%', maxWidth: 1200,
        height: '90vh',
        alignItems: 'flex-start',
    },
    panel: {
        flex: '0 0 300px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        height: '100%',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
    },
    panelHeader: {
        padding: '16px 18px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
    },
    panelTitle: {
        fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
        color: 'var(--text)',
        fontFamily: 'Medeo Sans',
    },
    panelBody: {
        flex: 1, overflowY: 'auto', padding: '10px 14px',
    },
    panelFooter: {
        padding: '12px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8,
        flexShrink: 0,
    },
    formatGrid: {
        display: 'flex', gap: 8,
    },
    input: {
        width: '100%', padding: '7px 10px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontSize: 13, fontFamily: 'Medeo Sans',
        outline: 'none', boxSizing: 'border-box',
        marginTop: 4,
    },
    subLabel: {
        fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em',
        fontFamily: 'Medeo Sans', textTransform: 'uppercase', marginBottom: 2,
    },
    thumb: {
        width: 44, height: 44, borderRadius: 8,
        overflow: 'hidden', cursor: 'pointer',
        boxSizing: 'border-box', position: 'relative',
        transition: 'all 0.15s', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
    },
    thumbCheck: {
        position: 'absolute', top: 2, right: 2,
        width: 14, height: 14, borderRadius: '50%',
        background: 'var(--primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700,
    },
    stickerRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 0',
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 13, fontFamily: 'Medeo Sans',
        textAlign: 'left', transition: 'color 0.15s',
    },
    stickerDot: {
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
    },
    btnPrimary: {
        flex: 1, padding: '9px 14px',
        borderRadius: 10, border: 'none',
        color: '#fff', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'Medeo Sans',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s', letterSpacing: '0.03em',
    },
    btnSecondary: {
        flex: 1, padding: '9px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer', fontSize: 12,
        fontFamily: 'Medeo Sans',
        transition: 'all 0.15s',
    },
    shareWrap: {
        padding: '8px 14px 14px',
        flexShrink: 0,
    },
    shareToggle: {
        width: '100%', padding: '9px 12px',
        borderRadius: 10,
        border: '1px solid',
        background: 'var(--bg)',
        cursor: 'pointer',
        fontSize: 12, fontWeight: 600, fontFamily: 'Medeo Sans',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s',
    },
    socialPanel: {
        marginTop: 8, padding: '10px 10px',
        borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', gap: 6,
    },
    socialHint: {
        fontSize: 10, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 2,
    },
    socialNetBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '8px 10px',
        borderRadius: 9, border: '1px solid',
        background: 'var(--surface)',
        color: 'var(--text)',
        cursor: 'pointer', fontSize: 12,
        fontFamily: 'Medeo Sans', fontWeight: 600,
        textAlign: 'left', transition: 'opacity 0.15s',
    },
    settingsLink: {
        border: 'none', background: 'transparent',
        color: 'var(--text-muted)', fontSize: 11,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 0', alignSelf: 'flex-start',
        fontFamily: 'Medeo Sans',
    },
    feedbackBadge: {
        padding: '7px 9px', borderRadius: 8,
        fontSize: 11, lineHeight: 1.35,
        marginTop: 2,
    },
    previewWrap: {
        flex: 1, height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10,
    },
    previewCard: {
        position: 'relative',
        maxHeight: '95%', maxWidth: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
        borderRadius: 20, overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
    },
    previewHint: {
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'Medeo Sans', letterSpacing: '0.06em',
    },
    loadingOverlay: {
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
    },
    spinner: {
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
    },
};

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function Collapsible({ label, open, onToggle, children }) {
    return (
        <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))' }}>
            <button
                type="button"
                onClick={onToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 0', background: 'transparent', border: 'none',
                    cursor: 'pointer', color: 'var(--text)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'Medeo Sans', letterSpacing: '0.03em',
                }}
            >
                <span>{label}</span>
                {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
        </div>
    );
}

function PillBtn({ active, color, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '5px 11px',
                borderRadius: 20,
                border: `1px solid ${active ? color : 'var(--border)'}`,
                background: active ? (color === 'var(--primary)' ? 'var(--primary-light, rgba(0,82,255,0.1))' : color + '18') : 'transparent',
                color: active ? color : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12, fontFamily: 'Medeo Sans',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

function FormatCard({ active, label, hint, ratio, color, onClick }) {
    const h = ratio >= 1 ? 36 : ratio < 0.7 ? 56 : 44;
    const w = Math.round(h * ratio);
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1, padding: '8px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                borderRadius: 10,
                border: `1px solid ${active ? color : 'var(--border)'}`,
                background: active ? 'var(--primary-light, rgba(0,82,255,0.07))' : 'var(--bg)',
                cursor: 'pointer', transition: 'all 0.15s',
            }}
        >
            <div style={{
                width: w, height: h,
                borderRadius: 4,
                border: `2px solid ${active ? color : 'var(--border)'}`,
                background: active ? color + '22' : 'transparent',
                transition: 'all 0.15s',
            }} />
            <div style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? color : 'var(--text-muted)', fontFamily: 'Medeo Sans', letterSpacing: '0.03em' }}>
                {label}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'Medeo Sans' }}>{hint}</div>
        </button>
    );
}

function PhoneQuickPick({ assignedAgent, currentUser, property, phone, setPhone, color }) {
    const opts = [];
    if (assignedAgent?.phone) {
        const v = formatPhone(assignedAgent.phone) || assignedAgent.phone;
        opts.push({ label: assignedAgent.full_name?.split(' ')[0] || 'Агент', val: v });
    }
    if (currentUser?.phone) {
        const v = formatPhone(currentUser.phone) || currentUser.phone;
        if (!opts.some(o => o.val === v)) opts.push({ label: 'Мой', val: v });
    }
    if (property?.contact_phone) {
        const v = formatPhone(property.contact_phone) || property.contact_phone;
        if (!opts.some(o => o.val === v)) opts.push({ label: 'Контакт', val: v });
    }
    if (opts.length <= 1) return null;
    return (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
            {opts.map((o, i) => (
                <PillBtn key={i} active={phone === o.val} color={color} onClick={() => setPhone(o.val)}>
                    {o.label}
                </PillBtn>
            ))}
        </div>
    );
}

function LocationQuickPick({ property, locationText, setLocation, color }) {
    const opts = [];
    if (property?.microdistrict) opts.push({ label: `мкр. ${property.microdistrict}`, val: `мкр. ${property.microdistrict}` });
    if (property?.district) opts.push({ label: property.district, val: property.district });
    if (property?.residential_complex) {
        const v = `ЖК «${property.residential_complex}»`;
        opts.push({ label: v, val: v });
    }
    if (!opts.length) return null;
    return (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
            {opts.map((o, i) => (
                <PillBtn key={i} active={locationText === o.val} color={color} onClick={() => setLocation(o.val)}>
                    {o.label}
                </PillBtn>
            ))}
            {locationText && (
                <PillBtn active={false} color={color} onClick={() => setLocation('')}>Очистить</PillBtn>
            )}
        </div>
    );
}
