import React from 'react';
import {
    X, Download, Share2, Settings, ChevronDown, ChevronUp,
    Shuffle, Sparkles, Layers, Image as ImageIcon, Phone, Tag, Check, Palette
} from 'lucide-react';
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
    { key: 'sell', label: 'Продажа' },
    { key: 'rent', label: 'Аренда' },
    { key: 'daily', label: 'Посуточно' },
    { key: 'exchange', label: 'Обмен' },
];

const BANNER_FORMATS = {
    story:    { w: 1080, h: 1920, label: 'Stories', hint: '9:16' },
    portrait: { w: 1080, h: 1350, label: 'Пост',    hint: '4:5'  },
    post:     { w: 1080, h: 1080, label: 'Квадрат', hint: '1:1'  },
};

const DESIGN_THEMES = [
    { key: 'dark',  label: 'Тёмная'  },
    { key: 'light', label: 'Светлая' },
    { key: 'brand', label: 'Цветная' },
    { key: 'glass', label: 'Стекло'  },
];

const STICKER_CATEGORIES = [
    {
        id: 'status',
        title: 'Статус сделки',
        items: [
            'Срочно',
            'Свободная продажа',
            'Торг уместен',
            'Встречный вариант',
            'Ипотека любого банка',
            'Ключи в день сделки',
            'Без комиссии',
        ],
    },
    {
        id: 'comms',
        title: 'Коммуникации',
        items: [
            'Газ подведён',
            'Индивидуальное отопление',
            'Центральные коммуникации',
            'Скважина',
            'Септик',
            'Электричество 15 кВт',
            'Высокоскоростной интернет',
        ],
    },
    {
        id: 'amenities',
        title: 'Удобства и отделка',
        items: [
            'Дизайнерский ремонт',
            'Евроремонт',
            'Чистовая отделка',
            'С мебелью и техникой',
            'Кондиционер',
            'Тёплый пол',
            'Панорамные окна',
            'Гардеробная',
            'Паркинг / Гараж',
            'Закрытая территория',
            'Вид на парк',
            'Свой текст',
        ],
    },
];

const AVAILABLE_STICKERS = STICKER_CATEGORIES.flatMap(c => c.items);

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

/* Auto-crop empty whitespace margins around floorplan drawings */
function cropFloorplanWhitespace(img) {
    if (!img || !img.width || !img.height) return img;
    const maxDim = 1200;
    let sw = img.width, sh = img.height;
    if (sw > maxDim || sh > maxDim) {
        if (sw > sh) { sh = Math.round(sh * maxDim / sw); sw = maxDim; }
        else { sw = Math.round(sw * maxDim / sh); sw = maxDim; }
    }
    const off = document.createElement('canvas');
    off.width = sw;
    off.height = sh;
    const octx = off.getContext('2d', { willReadFrequently: true });
    if (!octx) return img;
    octx.drawImage(img, 0, 0, sw, sh);

    let data;
    try {
        data = octx.getImageData(0, 0, sw, sh).data;
    } catch {
        return img;
    }

    const corners = [
        0,
        (sw - 1) * 4,
        ((sh - 1) * sw) * 4,
        ((sh - 1) * sw + (sw - 1)) * 4,
    ];
    let avgBgLum = 0;
    corners.forEach(idx => {
        avgBgLum += (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    });
    avgBgLum = avgBgLum / 4;

    let minX = sw, minY = sh, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const idx = (y * sw + x) * 4;
            const a = data[idx + 3];
            if (a < 30) continue;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (Math.abs(lum - avgBgLum) > 20 || lum < 210) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!found || maxX <= minX || maxY <= minY) return img;

    minX = Math.max(0, minX - 12);
    minY = Math.max(0, minY - 12);
    maxX = Math.min(sw - 1, maxX + 12);
    maxY = Math.min(sh - 1, maxY + 12);

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    const cropped = document.createElement('canvas');
    cropped.width = cw;
    cropped.height = ch;
    const cctx = cropped.getContext('2d');
    if (!cctx) return img;
    cctx.drawImage(off, minX, minY, cw, ch, 0, 0, cw, ch);
    return cropped;
}

function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 82, b: 255 };
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    if (Number.isNaN(num)) return { r: 0, g: 82, b: 255 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Адаптивный расчет сетки: пропорции каждой ячейки вычисляются по пропорциям
 * оригинальных фотографий, исключая нежелательную обрезку важных деталей.
 */
function computeAdaptivePhotoGrid(imgs, w, h, IS, isPortrait, gridMode = 'adaptive') {
    const photoCount = imgs.length;
    const rects = [];
    if (photoCount <= 1) {
        return [{ x: 0, y: 0, w, h }];
    }

    if (gridMode === 'classic') {
        if (photoCount === 2) {
            if (IS || isPortrait) {
                const h1 = Math.round(h * 0.50);
                rects.push({ x: 0, y: 0, w, h: h1 });
                rects.push({ x: 0, y: h1, w, h: h - h1 });
            } else {
                const w1 = Math.round(w * 0.5);
                rects.push({ x: 0, y: 0, w: w1, h });
                rects.push({ x: w1, y: 0, w: w - w1, h });
            }
        } else if (photoCount === 3) {
            if (IS || isPortrait) {
                const hTop = Math.round(h * 0.50);
                const wHalf = Math.round(w * 0.5);
                rects.push({ x: 0, y: 0, w, h: hTop });
                rects.push({ x: 0, y: hTop, w: wHalf, h: h - hTop });
                rects.push({ x: wHalf, y: hTop, w: w - wHalf, h: h - hTop });
            } else {
                const wLeft = Math.round(w * 0.50);
                const hHalf = Math.round(h * 0.5);
                rects.push({ x: 0, y: 0, w: wLeft, h: hHalf });
                rects.push({ x: wLeft, y: 0, w: w - wLeft, h: hHalf });
                rects.push({ x: 0, y: hHalf, w, h: h - hHalf });
            }
        } else if (photoCount === 4) {
            const wHalf = Math.round(w * 0.5);
            const hHalf = Math.round(h * 0.5);
            rects.push({ x: 0, y: 0, w: wHalf, h: hHalf });
            rects.push({ x: wHalf, y: 0, w: w - wHalf, h: hHalf });
            rects.push({ x: 0, y: hHalf, w: wHalf, h: h - hHalf });
            rects.push({ x: wHalf, y: hHalf, w: w - wHalf, h: h - hHalf });
        } else {
            const cols = Math.ceil(Math.sqrt(photoCount));
            const rows = Math.ceil(photoCount / cols);
            const cw = w / cols;
            const rh = h / rows;
            for (let i = 0; i < photoCount; i++) {
                const ri = Math.floor(i / cols), ci = i % cols;
                rects.push({ x: Math.round(ci * cw), y: Math.round(ri * rh), w: Math.round(cw), h: Math.round(rh) });
            }
        }
        return rects;
    }

    // Режим "Адаптивная" - подстройка под реальные пропорции фото
    const ratios = imgs.map(img => {
        const iw = img.naturalWidth || img.width || 1;
        const ih = img.naturalHeight || img.height || 1;
        return iw / ih;
    });

    if (photoCount === 2) {
        const [r0, r1] = ratios;
        if (IS || isPortrait) {
            const h0Weight = 1 / r0;
            const h1Weight = 1 / r1;
            const split = Math.min(0.68, Math.max(0.32, h0Weight / (h0Weight + h1Weight)));
            const h0 = Math.round(h * split);
            rects.push({ x: 0, y: 0, w, h: h0 });
            rects.push({ x: 0, y: h0, w, h: h - h0 });
        } else {
            if (r0 < 0.95 && r1 < 0.95) {
                const w0 = Math.round(w * Math.min(0.68, Math.max(0.32, r0 / (r0 + r1))));
                rects.push({ x: 0, y: 0, w: w0, h });
                rects.push({ x: w0, y: 0, w: w - w0, h });
            } else {
                const h0Weight = 1 / r0;
                const h1Weight = 1 / r1;
                const split = Math.min(0.68, Math.max(0.32, h0Weight / (h0Weight + h1Weight)));
                const h0 = Math.round(h * split);
                rects.push({ x: 0, y: 0, w, h: h0 });
                rects.push({ x: 0, y: h0, w, h: h - h0 });
            }
        }
    } else if (photoCount === 3) {
        const [r0, r1, r2] = ratios;
        if (IS || isPortrait) {
            const topWeight = 1 / r0;
            const btmWeight = 1 / (r1 + r2);
            const splitY = Math.min(0.65, Math.max(0.35, topWeight / (topWeight + btmWeight)));
            const hTop = Math.round(h * splitY);
            const hBottom = h - hTop;

            const splitX = Math.min(0.70, Math.max(0.30, r1 / (r1 + r2)));
            const w1 = Math.round(w * splitX);
            const w2 = w - w1;

            rects.push({ x: 0, y: 0, w, h: hTop });
            rects.push({ x: 0, y: hTop, w: w1, h: hBottom });
            rects.push({ x: w1, y: hTop, w: w2, h: hBottom });
        } else {
            if (r0 < 0.95) {
                const leftWeight = r0;
                const rightWeight = 1 / ((1 / r1) + (1 / r2));
                const splitX = Math.min(0.65, Math.max(0.35, leftWeight / (leftWeight + rightWeight)));
                const wLeft = Math.round(w * splitX);
                const wRight = w - wLeft;

                const splitY = Math.min(0.70, Math.max(0.30, (1 / r1) / ((1 / r1) + (1 / r2))));
                const h1 = Math.round(h * splitY);
                const h2 = h - h1;

                rects.push({ x: 0, y: 0, w: wLeft, h });
                rects.push({ x: wLeft, y: 0, w: wRight, h: h1 });
                rects.push({ x: wLeft, y: h1, w: wRight, h: h2 });
            } else {
                const topWeight = 1 / r0;
                const btmWeight = 1 / (r1 + r2);
                const splitY = Math.min(0.65, Math.max(0.35, topWeight / (topWeight + btmWeight)));
                const hTop = Math.round(h * splitY);
                const hBottom = h - hTop;

                const splitX = Math.min(0.70, Math.max(0.30, r1 / (r1 + r2)));
                const w1 = Math.round(w * splitX);
                const w2 = w - w1;

                rects.push({ x: 0, y: 0, w, h: hTop });
                rects.push({ x: 0, y: hTop, w: w1, h: hBottom });
                rects.push({ x: w1, y: hTop, w: w2, h: hBottom });
            }
        }
    } else if (photoCount === 4) {
        const [r0, r1, r2, r3] = ratios;
        const topWeight = 1 / (r0 + r1);
        const btmWeight = 1 / (r2 + r3);
        const splitY = Math.min(0.65, Math.max(0.35, topWeight / (topWeight + btmWeight)));
        const hTop = Math.round(h * splitY);
        const hBottom = h - hTop;

        const splitTop = Math.min(0.70, Math.max(0.30, r0 / (r0 + r1)));
        const w0 = Math.round(w * splitTop);
        const w1 = w - w0;

        const splitBtm = Math.min(0.70, Math.max(0.30, r2 / (r2 + r3)));
        const w2 = Math.round(w * splitBtm);
        const w3 = w - w2;

        rects.push({ x: 0, y: 0, w: w0, h: hTop });
        rects.push({ x: w0, y: 0, w: w1, h: hTop });
        rects.push({ x: 0, y: hTop, w: w2, h: hBottom });
        rects.push({ x: w2, y: hTop, w: w3, h: hBottom });
    } else {
        const cols = Math.ceil(Math.sqrt(photoCount));
        const rows = Math.ceil(photoCount / cols);
        const cw = w / cols;
        const rh = h / rows;
        for (let i = 0; i < photoCount; i++) {
            const ri = Math.floor(i / cols), ci = i % cols;
            rects.push({ x: Math.round(ci * cw), y: Math.round(ri * rh), w: Math.round(cw), h: Math.round(rh) });
        }
    }

    return rects;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function BannerGenerator({ property = {}, currentUser, agent: propAgent, onClose, onOpenProfile }) {
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

    const canvasRef = React.useRef(null);
    const isMountedRef = React.useRef(true);
    const imageCacheRef = React.useRef(new Map());
    const floorplanCacheRef = React.useRef(new Map());

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
        const name = assignedAgent?.full_name || currentUser?.full_name || '';
        const clean = name.trim();
        if (!clean || clean.length <= 1 || clean.toLowerCase() === 'я' || clean.toLowerCase() === 'admin') {
            return '';
        }
        return clean.split(' ').slice(0, 2).join(' ');
    }, [assignedAgent, currentUser]);

    /* ---- state ---- */
    const [phone, setPhone]           = React.useState(defaultPhone);
    const [locationText, setLocation]  = React.useState(defaultLocation);
    const [agentName, setAgentName]    = React.useState(defaultAgentName);

    const [format, setFormat]           = React.useState('story');
    const [designTheme, setDesignTheme] = React.useState('dark');
    const [fitMode, setFitMode]         = React.useState('cover');
    const [gridMode, setGridMode]       = React.useState('adaptive');
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
        layout: true, stickers: false, colors: true,
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

    /* ---- image loading (CORS enabled for all) ---- */
    const loadImageSafe = React.useCallback((src) => {
        if (!src) return Promise.resolve(null);
        if (imageCacheRef.current.has(src)) return Promise.resolve(imageCacheRef.current.get(src));
        return new Promise(resolve => {
            const img = new Image();
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
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
        const isLight = designTheme === 'light';
        const isGlass = designTheme === 'glass';
        const isBrand = designTheme === 'brand';

        try {
            const hasUncached = selectedImages.some(
                idx => !imageCacheRef.current.has(propertyImages[idx % propertyImages.length])
            );
            if (hasUncached) setLoading(true);

            const promises = selectedImages.map(idx => {
                const src = propertyImages[idx % propertyImages.length];
                return loadImageSafe(src).then(img => ({ img, idx }));
            });
            if (layoutImage) {
                promises.push(loadImageSafe(layoutImage).then(img => ({ img, idx: -1 })));
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
            if (!imgs.length && !loadedLayoutImg) return;

            const U = w / 1080;

            /* ---- 1. GRID IS FILLED WITH PHOTOS (ADAPTIVE OR CLASSIC) ---- */
            const photoCount = imgs.length;
            const rects = computeAdaptivePhotoGrid(imgs, w, h, IS, isPortrait, gridMode);

            /* ---- DRAW PHOTO CELL ---- */
            const drawPhotoCell = (img, cx, cy, cw, ch) => {
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
                    let bgDw, bgDh, bgDx, bgDy;
                    if (ir > cr) { bgDh = ch; bgDw = ch * ir; bgDx = cx - (bgDw - cw) / 2; bgDy = cy; }
                    else { bgDw = cw; bgDh = cw / ir; bgDx = cx; bgDy = cy - (bgDh - ch) / 2; }
                    ctx.globalAlpha = 0.22;
                    ctx.drawImage(img, bgDx, bgDy, bgDw, bgDh);
                    ctx.fillStyle = isLight ? 'rgba(248,250,252,0.85)' : 'rgba(10,15,26,0.82)';
                    ctx.fillRect(cx, cy, cw, ch);
                    ctx.globalAlpha = 1;

                    let dw, dh, dx, dy;
                    if (ir > cr) { dw = cw; dh = cw / ir; dx = cx; dy = cy + (ch - dh) / 2; }
                    else { dh = ch; dw = ch * ir; dx = cx + (cw - dw) / 2; dy = cy; }
                    ctx.drawImage(img, dx, dy, dw, dh);
                }
                ctx.restore();
            };

            // Draw all photos in the grid
            imgs.forEach((img, idx) => {
                const r = rects[idx % rects.length];
                drawPhotoCell(img, r.x, r.y, r.w, r.h);
            });

            // Draw dividers between photo cells
            if (photoCount > 1) {
                ctx.save();
                ctx.strokeStyle = isLight
                    ? 'rgba(255, 255, 255, 0.95)'
                    : (isGlass ? 'rgba(255, 255, 255, 0.35)' : 'rgba(10, 15, 26, 0.85)');
                ctx.lineWidth = Math.round(IS ? 8 : 6);
                rects.forEach(r => ctx.strokeRect(r.x, r.y, r.w, r.h));
                ctx.restore();
            }

            /* ---- 2. TOP GRADIENT (for badges) ---- */
            const topGradH = Math.round((IS ? 320 : 260) * U);
            const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH);
            topGrad.addColorStop(0, isGlass ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.60)');
            topGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
            topGrad.addColorStop(1, 'rgba(0, 0, 0, 0.00)');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, w, topGradH);

            /* ---- 3. BOTTOM INFORMATION GRADIENT ---- */
            const gradH = Math.round(h * (IS ? 0.46 : (isPortrait ? 0.42 : 0.40)));
            const gradY = h - gradH;
            const btmGrad = ctx.createLinearGradient(0, gradY, 0, h);

            if (isLight) {
                btmGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.00)');
                btmGrad.addColorStop(0.20, 'rgba(255, 255, 255, 0.70)');
                btmGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.92)');
                btmGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.98)');
                btmGrad.addColorStop(1.00, 'rgba(255, 255, 255, 1.00)');
            } else if (isBrand) {
                const rgb = hexToRgb(accentColor || '#0052FF');
                btmGrad.addColorStop(0.00, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.00)`);
                btmGrad.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`);
                btmGrad.addColorStop(0.60, 'rgba(8, 12, 24, 0.88)');
                btmGrad.addColorStop(1.00, 'rgba(8, 12, 24, 0.96)');
            } else if (isGlass) {
                // In glass theme, bottom photos remain visible through soft translucent shading
                btmGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0.00)');
                btmGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.16)');
                btmGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.35)');
                btmGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0.48)');
            } else {
                btmGrad.addColorStop(0.00, 'rgba(8, 12, 22, 0.00)');
                btmGrad.addColorStop(0.18, 'rgba(8, 12, 22, 0.58)');
                btmGrad.addColorStop(0.42, 'rgba(8, 12, 22, 0.88)');
                btmGrad.addColorStop(0.70, 'rgba(8, 12, 22, 0.97)');
                btmGrad.addColorStop(1.00, 'rgba(8, 12, 22, 1.00)');
            }

            ctx.fillStyle = btmGrad;
            ctx.fillRect(0, gradY, w, gradH);

            /* ---- 4. FLOORPLAN OVER PHOTOS IN BOTTOM-RIGHT CORNER ---- */
            const PAD = Math.round((IS ? 56 : (isPortrait ? 46 : 38)) * U);
            const bottomPad = Math.round((IS ? 60 : (isPortrait ? 48 : 38)) * U);

            let boxSize = 0;
            let boxX = w;

            let processedFloorplan = null;
            if (loadedLayoutImg) {
                processedFloorplan = floorplanCacheRef.current.get(layoutImage);
                if (!processedFloorplan) {
                    processedFloorplan = cropFloorplanWhitespace(loadedLayoutImg);
                    if (processedFloorplan) floorplanCacheRef.current.set(layoutImage, processedFloorplan);
                }
            }

            if (loadedLayoutImg) {
                boxSize = Math.round((IS ? 430 : (isPortrait ? 360 : 310)) * U);
                boxX = w - PAD - boxSize;
                const boxY = h - bottomPad - boxSize;

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                ctx.shadowBlur = Math.round(24 * U);
                ctx.shadowOffsetY = Math.round(6 * U);

                // Clean white card background for 100% black CAD lines contrast
                ctx.fillStyle = isGlass ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF';
                ctx.beginPath();
                safeRoundRect(ctx, boxX, boxY, boxSize, boxSize, Math.round(18 * U));
                ctx.fill();

                if (isGlass) {
                    ctx.lineWidth = Math.round(1.5 * U) || 1;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.stroke();
                }
                ctx.restore();

                const innerPad = Math.round(16 * U);
                const innerW = boxSize - innerPad * 2;
                const innerH = boxSize - innerPad * 2;

                ctx.save();
                ctx.beginPath();
                safeRoundRect(ctx, boxX + innerPad, boxY + innerPad, innerW, innerH, Math.round(12 * U));
                ctx.clip();

                const itemCanvas = processedFloorplan || loadedLayoutImg;
                const fw = itemCanvas.width || 1, fh = itemCanvas.height || 1;
                const fr = fw / fh;
                const cr = innerW / innerH;
                let dw, dh, dx, dy;
                if (fr > cr) {
                    dw = innerW; dh = innerW / fr;
                    dx = boxX + innerPad; dy = boxY + innerPad + (innerH - dh) / 2;
                } else {
                    dh = innerH; dw = innerH * fr;
                    dx = boxX + innerPad + (innerW - dw) / 2; dy = boxY + innerPad;
                }
                ctx.drawImage(itemCanvas, dx, dy, dw, dh);
                ctx.restore();
            }

            /* ---- 5. TEXT ON THE LEFT SIDE (NEVER OVERLAPS FLOORPLAN) ---- */
            // Left column width is constrained so text stops safely before the floorplan
            const maxTW = loadedLayoutImg ? (boxX - PAD - Math.round(24 * U)) : (w - PAD * 2);

            const fsCat     = Math.round((IS ? 26 : (isPortrait ? 23 : 20)) * U);
            const fsPrice   = Math.round((IS ? 84 : (isPortrait ? 74 : 66)) * U);
            const fsSqm     = Math.round((IS ? 36 : (isPortrait ? 32 : 28)) * U);
            const fsAddr    = Math.round((IS ? 46 : (isPortrait ? 40 : 36)) * U);
            const fsDetails = Math.round((IS ? 32 : (isPortrait ? 28 : 25)) * U);
            const fsPhone   = Math.round((IS ? 42 : (isPortrait ? 36 : 32)) * U);

            const catText = getCategoryText(property?.property_type, property?.rooms);
            const priceText = formatNumber(property?.price) + ' ₽';
            const m2 = property?.price && property?.area_total ? Math.round(property.price / property.area_total) : null;
            const sqmText = m2 ? `${formatNumber(m2)} ₽/м²` : '';

            const rawAddr = (property?.address || property?.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
            const loc = (locationText || '').trim();
            const addr = loc
                ? (rawAddr && !rawAddr.toLowerCase().includes(loc.toLowerCase()) ? `${loc}, ${rawAddr}` : (rawAddr || loc))
                : rawAddr;

            ctx.font = `700 ${fsAddr}px 'Medeo Sans', system-ui, sans-serif`;
            const addrLines = getWrappedLines(ctx, addr, maxTW);

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
            if (property?.area_total) parts.push(`${property.area_total} м²`);
            if (['apartment', 'room', 'commercial'].includes(type) && property?.floor) {
                parts.push(`${property.floor}/${property.floors_total || '?'} эт.`);
            } else if (type === 'house' && property?.floors_total) {
                parts.push(`${property.floors_total} эт.`);
            }

            const activePhone = phone?.trim() ? (formatPhone(phone) || phone) : '+7 (999) 000-00-00';
            const cleanAgent = (agentName || '').trim();
            const showAgent = cleanAgent.length > 2 && cleanAgent.toLowerCase() !== 'я';
            const contactText = showAgent ? `${cleanAgent}  ·  ${activePhone}` : activePhone;

            /* Vertical layout calculation */
            const hCat = Math.round(fsCat * 1.25);
            const gapAfterCat = Math.round(12 * U);
            const hPrice = Math.round(fsPrice * 0.95);
            const gapAfterPrice = Math.round(14 * U);
            const hAddr = addrLines.length * Math.round(fsAddr * 1.25);
            const gapAfterAddr = Math.round(12 * U);
            const hDetails = parts.length ? Math.round(fsDetails * 1.25) : 0;
            const gapAfterDetails = parts.length ? Math.round(16 * U) : Math.round(8 * U);
            const hPhone = Math.round(fsPhone * 1.25);

            const totalTextH = hCat + gapAfterCat + hPrice + gapAfterPrice + hAddr + gapAfterAddr + hDetails + gapAfterDetails + hPhone;

            let curY = h - bottomPad - totalTextH;
            const minSafeY = gradY + Math.round(gradH * 0.22);
            if (curY < minSafeY) curY = minSafeY;

            /* FROSTED GLASS PLATE (WHEN THEME IS GLASS) */
            if (isGlass) {
                const gPadX = Math.round(20 * U);
                const gPadY = Math.round(18 * U);
                const glassX = PAD - gPadX;
                const glassY = curY - gPadY;
                const glassW = maxTW + gPadX * 2;
                const glassH = totalTextH + gPadY * 2;
                const glassR = Math.round(20 * U);

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                ctx.shadowBlur = Math.round(24 * U);
                ctx.shadowOffsetY = Math.round(6 * U);

                // Frosted glass background
                ctx.fillStyle = 'rgba(12, 18, 32, 0.72)';
                ctx.beginPath();
                safeRoundRect(ctx, glassX, glassY, glassW, glassH, glassR);
                ctx.fill();

                // Specular border
                ctx.lineWidth = Math.round(1.5 * U) || 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
                ctx.stroke();

                // Top gloss highlight
                const glossH = Math.round(28 * U);
                const glassGloss = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glossH);
                glassGloss.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
                glassGloss.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
                ctx.fillStyle = glassGloss;
                ctx.beginPath();
                safeRoundRect(ctx, glassX, glassY, glassW, glossH, [glassR, glassR, 0, 0]);
                ctx.fill();

                ctx.restore();
            }

            /* Category */
            ctx.font = `700 ${fsCat}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = isLight ? '#64748B' : '#94A3B8';
            ctx.fillText(catText, PAD, curY + fsCat * 0.85);
            curY += hCat + gapAfterCat;

            /* PRICE (IN ACCENT COLOR) & SQM */
            ctx.font = `800 ${fsPrice}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = accentColor; // Selected accent color
            ctx.fillText(priceText, PAD, curY + fsPrice * 0.85);
            const pw = ctx.measureText(priceText).width;

            if (sqmText) {
                ctx.font = `400 ${fsSqm}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = isLight ? '#64748B' : '#94A3B8';
                if (!loadedLayoutImg || (pw + ctx.measureText(`(${sqmText})`).width + Math.round(16 * U) <= maxTW)) {
                    ctx.fillText(`(${sqmText})`, PAD + pw + Math.round(16 * U), curY + fsPrice * 0.85);
                }
            }
            curY += hPrice + gapAfterPrice;

            /* Address */
            ctx.font = `700 ${fsAddr}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = isLight ? '#1E293B' : '#F8FAFC';
            for (const line of addrLines) {
                ctx.fillText(line, PAD, curY + fsAddr * 0.85);
                curY += Math.round(fsAddr * 1.25);
            }
            curY += gapAfterAddr;

            /* Specifications */
            if (parts.length) {
                ctx.font = `500 ${fsDetails}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.fillStyle = isLight ? '#475569' : '#CBD5E1';
                ctx.fillText(parts.join('  ·  '), PAD, curY + fsDetails * 0.85);
                curY += hDetails + gapAfterDetails;
            }

            /* Contact Phone (NO "Я") */
            ctx.font = `700 ${fsPhone}px 'Medeo Sans', system-ui, sans-serif`;
            ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
            ctx.fillText(contactText, PAD, curY + fsPhone * 0.85);

            /* ---- 6. TOP BADGES (DEAL GOAL & STICKERS) IN TOP-RIGHT (+50% ENLARGED) ---- */
            const badgePad = Math.round((IS ? 56 : (isPortrait ? 46 : 38)) * U);
            let badgeBottom = badgePad;

            if (showDealGoal) {
                const goalStr = (dealGoal === 'custom' ? customGoalText.trim() : dealGoal) || 'Продажа';
                const badgeText = goalStr.toUpperCase();
                const badgeH = Math.round((IS ? 96 : (isPortrait ? 84 : 72)) * U);
                const bFont = Math.round((IS ? 39 : (isPortrait ? 35 : 30)) * U);
                ctx.font = `800 ${bFont}px 'Medeo Sans', system-ui, sans-serif`;
                const tw = ctx.measureText(badgeText).width;
                const bPadX = Math.round((IS ? 42 : 33) * U);
                const badgeW = tw + bPadX * 2;
                const badgeX = w - badgePad - badgeW;
                const badgeY = badgePad;

                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.38)';
                ctx.shadowBlur = Math.round(20 * U);
                ctx.shadowOffsetY = Math.round(5 * U);

                const goalColor = goalStr === 'Аренда' ? '#10b981'
                    : goalStr === 'Посуточно' ? '#f97316'
                    : goalStr === 'Обмен' ? '#8b5cf6'
                    : accentColor;

                ctx.beginPath();
                safeRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(18 * U));
                ctx.fillStyle = goalColor;
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = '#ffffff';
                ctx.font = `800 ${bFont}px 'Medeo Sans', system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + bFont * 0.35);
                ctx.textAlign = 'left';

                badgeBottom = badgeY + badgeH + Math.round(16 * U);
            }

            if (stickers.length) {
                const sh = Math.round((IS ? 87 : (isPortrait ? 75 : 66)) * U);
                const sf = Math.round((IS ? 36 : (isPortrait ? 32 : 27)) * U);
                let sy = showDealGoal ? badgeBottom : badgePad;

                stickers.forEach(s => {
                    const txt = s === 'Свой текст' ? (customStickerText.trim() || 'Свой текст') : s;
                    ctx.font = `700 ${sf}px 'Medeo Sans', system-ui, sans-serif`;
                    const tw = ctx.measureText(txt.toUpperCase()).width + Math.round(60 * U);
                    const sx = w - badgePad - tw;

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.38)';
                    ctx.shadowBlur = Math.round(18 * U);
                    ctx.shadowOffsetY = Math.round(4 * U);
                    ctx.fillStyle = s === 'Срочно' ? '#EF4444' : 'rgba(15, 23, 42, 0.80)';
                    ctx.beginPath();
                    safeRoundRect(ctx, sx, sy, tw, sh, Math.round(15 * U));
                    ctx.fill();

                    if (s !== 'Срочно') {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
                        ctx.lineWidth = Math.round(2 * U);
                        ctx.stroke();
                    }
                    ctx.restore();

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = `700 ${sf}px 'Medeo Sans', system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(txt.toUpperCase(), sx + tw / 2, sy + sh / 2 + sf * 0.35);
                    ctx.textAlign = 'left';
                    sy += sh + Math.round(14 * U);
                });
            }

            if (isMountedRef.current && hasUncached) setLoading(false);

        } catch (err) {
            console.error('[BannerGenerator] draw error:', err);
            if (isMountedRef.current) setLoading(false);
        }
    }, [
        format, designTheme, fitMode, gridMode, accentColor,
        dealGoal, showDealGoal, customGoalText,
        selectedImages, stickers, customStickerText,
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
            <button
                type="button"
                onClick={e => { e.stopPropagation(); if (typeof onClose === 'function') onClose(); }}
                style={S.closeBtn}
                title="Закрыть (Esc)"
            >
                <X size={20} />
            </button>

            <div style={{ ...S.root, flexDirection: isMobile ? 'column' : 'row' }}>

                {/* ======== LEFT PANEL (STUDIO CONTROLS) ======== */}
                <div style={S.panel}>
                    {/* Header */}
                    <div style={S.panelHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={S.brandIconWrap}>
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <div style={S.panelTitle}>Генератор баннера</div>
                                <div style={S.panelSubtitle}>
                                    {property?.price ? `${formatNumber(property.price)} ₽ · ` : ''}
                                    {property?.address || property?.city || 'Объект'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick navigation anchor pills */}
                    <div style={S.quickNav}>
                        {[
                            { id: 'sec-format', label: 'Формат' },
                            { id: 'sec-theme', label: 'Стиль' },
                            { id: 'sec-photo', label: 'Фото' },
                            { id: 'sec-goal', label: 'Плашки' },
                            { id: 'sec-contacts', label: 'Контакты' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById(tab.id);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                style={S.quickNavBtn}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={S.panelBody}>

                        {/* FORMAT */}
                        <Collapsible
                            id="sec-format"
                            label="Формат"
                            icon={Layers}
                            badge={BANNER_FORMATS[format]?.label}
                            open={openSections.format}
                            onToggle={() => toggleSection('format')}
                        >
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

                        {/* THEME & GRID */}
                        <Collapsible
                            id="sec-theme"
                            label="Стиль и цвет"
                            icon={Palette}
                            badge={DESIGN_THEMES.find(t => t.key === designTheme)?.label}
                            open={openSections.theme}
                            onToggle={() => toggleSection('theme')}
                        >
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {DESIGN_THEMES.map(t => (
                                    <PillBtn
                                        key={t.key}
                                        active={designTheme === t.key}
                                        color={AC}
                                        onClick={() => setDesignTheme(t.key)}
                                    >
                                        <span style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: t.key === 'dark' ? '#0f172a'
                                                : t.key === 'light' ? '#f8fafc'
                                                : t.key === 'glass' ? 'rgba(0,180,255,0.7)'
                                                : accentColor,
                                            border: t.key === 'light' ? '1px solid #cbd5e1' : 'none',
                                            display: 'inline-block',
                                        }} />
                                        {t.label}
                                    </PillBtn>
                                ))}
                            </div>

                            <div style={S.settingRow}>
                                <span style={S.subLabel}>Сетка:</span>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                    {[
                                        ['adaptive', 'Адаптивная'],
                                        ['classic', 'Симметричная']
                                    ].map(([m, l]) => (
                                        <PillBtn key={m} active={gridMode === m} color={AC} onClick={() => setGridMode(m)}>
                                            {l}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>

                            <div style={S.settingRow}>
                                <span style={S.subLabel}>Фото:</span>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                    {[['cover', 'Заполнить'], ['contain', 'Целиком']].map(([m, l]) => (
                                        <PillBtn key={m} active={fitMode === m} color={AC} onClick={() => setFitMode(m)}>
                                            {l}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light, rgba(0,0,0,0.05))' }}>
                                <div style={{ ...S.subLabel, marginBottom: 6 }}>Акцентный цвет цены:</div>
                                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                                    {TRENDING_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setAccentColor(c)}
                                            title={c}
                                            style={{
                                                width: 24, height: 24, borderRadius: '50%', background: c,
                                                border: accentColor === c ? '2.5px solid var(--text)' : '2px solid transparent',
                                                cursor: 'pointer',
                                                boxShadow: accentColor === c ? `0 0 0 2px ${c}55, 0 2px 6px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.12)',
                                                transform: accentColor === c ? 'scale(1.15)' : 'scale(1)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </Collapsible>

                        {/* PHOTOS */}
                        <Collapsible
                            id="sec-photo"
                            label="Фотографии (в сетку)"
                            icon={ImageIcon}
                            badge={`${selectedImages.length} фото`}
                            open={openSections.photo}
                            onToggle={() => toggleSection('photo')}
                        >
                            {propertyImages.length > 1 && (
                                <div style={S.photoGrid}>
                                    {propertyImages.map((url, idx) => {
                                        const sel = selectedImages.includes(idx);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedImages(prev => {
                                                    if (prev.includes(idx)) return prev.length === 1 ? prev : prev.filter(i => i !== idx);
                                                    return prev.length >= 8 ? prev : [...prev, idx];
                                                })}
                                                style={{
                                                    ...S.thumb,
                                                    border: `2px solid ${sel ? AC : 'transparent'}`,
                                                    opacity: sel ? 1 : 0.45,
                                                    boxShadow: sel ? `0 2px 6px ${AC}33` : 'none',
                                                }}
                                            >
                                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                {sel && (
                                                    <div style={S.thumbCheck}>
                                                        <Check size={9} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div style={S.photoFooterRow}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Выбрано {selectedImages.length} фото (100% кадра)
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedImages.length === 1) {
                                            setSelectedImages([(selectedImages[0] + 1) % propertyImages.length]);
                                        } else {
                                            setSelectedImages(prev => [...prev.slice(1), prev[0]]);
                                        }
                                    }}
                                    style={S.btnShuffle}
                                    title="Сдвинуть порядок фото в сетке"
                                >
                                    <Shuffle size={12} />
                                    <span>Сдвиг фото</span>
                                </button>
                            </div>
                        </Collapsible>

                        {/* LAYOUT / FLOORPLAN */}
                        <Collapsible
                            label="Планировка (поверх в углу)"
                            icon={Layers}
                            badge={layoutImage ? 'Включена' : 'Без плана'}
                            open={openSections.layout}
                            onToggle={() => toggleSection('layout')}
                        >
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setLayoutImage(null)}
                                    style={{
                                        ...S.thumb,
                                        border: `2px solid ${layoutImage === null ? AC : 'var(--border)'}`,
                                        color: layoutImage === null ? AC : 'var(--text-muted)',
                                        fontSize: 10, fontWeight: 700,
                                        background: layoutImage === null ? 'var(--primary-light, rgba(0,82,255,0.08))' : 'var(--surface)',
                                    }}
                                >
                                    БЕЗ
                                </button>
                                {availableLayouts.map((url, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setLayoutImage(url)}
                                        style={{
                                            ...S.thumb,
                                            border: `2px solid ${layoutImage === url ? AC : 'transparent'}`,
                                            opacity: layoutImage === url ? 1 : 0.5,
                                            boxShadow: layoutImage === url ? `0 2px 6px ${AC}33` : 'none',
                                        }}
                                    >
                                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                                <label style={{
                                    ...S.thumb,
                                    border: '1.5px dashed var(--border)',
                                    fontSize: 18, color: 'var(--text-muted)',
                                    background: 'var(--surface)',
                                }}>
                                    +
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLayoutUpload} />
                                </label>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.35 }}>
                                Размещается поверх фото в правом нижнем углу. Текст автоматически выровнен слева без перекрытия.
                            </div>
                        </Collapsible>

                        {/* DEAL GOAL */}
                        <Collapsible
                            id="sec-goal"
                            label="Цель сделки"
                            icon={Tag}
                            badge={showDealGoal ? (dealGoal === 'custom' ? customGoalText || 'Свой' : dealGoal) : 'Скрыта'}
                            open={openSections.goal}
                            onToggle={() => toggleSection('goal')}
                        >
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

                        {/* CONTACTS */}
                        <Collapsible
                            id="sec-contacts"
                            label="Контакты"
                            icon={Phone}
                            badge={phone ? 'Заданы' : 'Нет'}
                            open={openSections.agent}
                            onToggle={() => toggleSection('agent')}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                                    <div style={S.subLabel}>Имя агента (необязательно)</div>
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

                        {/* STICKERS / BADGES */}
                        <Collapsible
                            label="Бейджи и стикеры"
                            icon={Tag}
                            badge={stickers.length ? `${stickers.length} шт.` : null}
                            open={openSections.stickers}
                            onToggle={() => toggleSection('stickers')}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {STICKER_CATEGORIES.map(cat => (
                                    <div key={cat.id}>
                                        <div style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            marginBottom: 6,
                                        }}>
                                            {cat.title}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {cat.items.map(s => {
                                                const on = stickers.includes(s);
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setStickers(p => on ? p.filter(x => x !== s) : [...p, s])}
                                                        style={{
                                                            padding: '6px 11px',
                                                            borderRadius: 16,
                                                            fontSize: 12,
                                                            fontWeight: on ? 600 : 400,
                                                            border: on ? `1px solid ${AC}` : '1px solid var(--border)',
                                                            background: on ? 'var(--primary-light, rgba(0,82,255,0.09))' : 'var(--surface-secondary, rgba(0,0,0,0.02))',
                                                            color: on ? AC : 'var(--text)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            lineHeight: 1.2,
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: on ? AC : 'transparent',
                                                            border: on ? `1px solid ${AC}` : '1px solid var(--text-tertiary, #94a3b8)',
                                                            flexShrink: 0,
                                                        }} />
                                                        {s}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {stickers.includes('Свой текст') && (
                                    <div style={{ marginTop: 2 }}>
                                        <div style={S.subLabel}>Свой текст стикера</div>
                                        <input
                                            type="text"
                                            value={customStickerText}
                                            onChange={e => setCustomSticker(e.target.value)}
                                            placeholder="Введите свой текст..."
                                            style={S.input}
                                        />
                                    </div>
                                )}
                            </div>
                        </Collapsible>

                    </div>

                    {/* ---- Actions footer ---- */}
                    <div style={S.panelFooter}>
                        <button
                            type="button"
                            onClick={handleDownload}
                            style={{ ...S.btnPrimary, background: AC }}
                        >
                            <Download size={16} style={{ flexShrink: 0 }} />
                            <span>Скачать баннер</span>
                        </button>
                    </div>

                    {/* Share to socials */}
                    <div style={S.shareWrap}>
                        <button
                            type="button"
                            onClick={() => { setShowSocialPanel(p => !p); setShareFeedback(null); }}
                            style={{
                                ...S.shareToggle,
                                borderColor: showSocialPanel ? AC : 'var(--border)',
                                color: showSocialPanel ? AC : 'var(--text-secondary)',
                                background: showSocialPanel ? 'var(--primary-light, rgba(0,82,255,0.08))' : 'var(--surface)',
                            }}
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
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    root: {
        display: 'flex', gap: 16,
        width: '100%', maxWidth: 1240,
        height: '92vh',
        alignItems: 'flex-start',
    },
    panel: {
        flex: '0 0 350px',
        width: 350,
        maxWidth: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        height: '100%',
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
    },
    panelHeader: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--surface)',
    },
    brandIconWrap: {
        width: 30, height: 30, borderRadius: 9,
        background: 'var(--primary-light, rgba(0,82,255,0.1))',
        color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    panelTitle: {
        fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
        color: 'var(--text)',
        fontFamily: 'Medeo Sans',
        lineHeight: 1.2,
    },
    panelSubtitle: {
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'Medeo Sans', marginTop: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 240,
    },
    quickNav: {
        display: 'flex', gap: 6,
        padding: '8px 14px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
        scrollbarWidth: 'none',
    },
    quickNavBtn: {
        padding: '4px 10px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-secondary)',
        fontSize: 11,
        fontFamily: 'Medeo Sans',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
    },
    panelBody: {
        flex: 1, overflowY: 'auto', padding: '12px 14px',
    },
    panelFooter: {
        padding: '12px 14px 8px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8,
        flexShrink: 0,
        background: 'var(--surface)',
    },
    formatGrid: {
        display: 'flex', gap: 8,
    },
    settingRow: {
        display: 'flex', gap: 6,
        marginTop: 10, flexWrap: 'wrap',
        alignItems: 'center',
    },
    photoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
        gap: 6,
        marginBottom: 8,
    },
    photoFooterRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    btnShuffle: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 11,
        fontFamily: 'Medeo Sans',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    input: {
        width: '100%', padding: '8px 11px',
        borderRadius: 9,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 13, fontFamily: 'Medeo Sans',
        outline: 'none', boxSizing: 'border-box',
        marginTop: 4,
        transition: 'border-color 0.15s ease',
    },
    subLabel: {
        fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em',
        fontFamily: 'Medeo Sans', textTransform: 'uppercase', marginBottom: 2,
    },
    thumb: {
        width: 46, height: 46, borderRadius: 10,
        overflow: 'hidden', cursor: 'pointer',
        boxSizing: 'border-box', position: 'relative',
        transition: 'all 0.15s ease', flexShrink: 0,
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
        padding: '6px 8px',
        borderRadius: 8,
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 13, fontFamily: 'Medeo Sans',
        textAlign: 'left', transition: 'all 0.15s ease',
    },
    stickerDot: {
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
    },
    btnPrimary: {
        width: '100%', padding: '12px 18px',
        borderRadius: 12, border: 'none',
        color: '#fff', cursor: 'pointer',
        fontSize: 13, fontWeight: 700, fontFamily: 'Medeo Sans',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.18s ease', letterSpacing: '0.02em',
        boxShadow: '0 4px 14px rgba(0,82,255,0.25)',
    },
    btnSecondary: {
        padding: '9px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer', fontSize: 12,
        fontFamily: 'Medeo Sans',
        transition: 'all 0.15s ease',
    },
    shareWrap: {
        padding: '6px 14px 14px',
        flexShrink: 0,
        background: 'var(--surface)',
    },
    shareToggle: {
        width: '100%', padding: '10px 14px',
        borderRadius: 11,
        border: '1px solid',
        background: 'var(--bg)',
        cursor: 'pointer',
        fontSize: 12, fontWeight: 600, fontFamily: 'Medeo Sans',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        transition: 'all 0.15s ease',
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
        textAlign: 'left', transition: 'opacity 0.15s ease',
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
        gap: 10, minWidth: 0,
    },
    previewCard: {
        position: 'relative',
        maxHeight: '92%', maxWidth: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        borderRadius: 20, overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        transition: 'aspect-ratio 0.2s ease',
    },
    previewHint: {
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'Medeo Sans', letterSpacing: '0.05em',
        background: 'var(--surface)',
        padding: '4px 12px',
        borderRadius: 16,
        border: '1px solid var(--border)',
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

function Collapsible({ id, label, icon: Icon, badge, open, onToggle, children }) {
    return (
        <div
            id={id}
            style={{
                marginBottom: 8,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'Medeo Sans',
                    letterSpacing: '0.02em',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {Icon && <Icon size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                    <span>{label}</span>
                    {badge && (
                        <span style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 8,
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            fontWeight: 500,
                        }}>
                            {badge}
                        </span>
                    )}
                </div>
                <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                }}>
                    {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
            </button>
            {open && (
                <div style={{ padding: '2px 12px 12px', borderTop: '1px solid var(--border-light, rgba(0,0,0,0.04))' }}>
                    {children}
                </div>
            )}
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
                borderRadius: 18,
                border: `1px solid ${active ? color : 'var(--border)'}`,
                background: active ? (color === 'var(--primary)' ? 'var(--primary-light, rgba(0,82,255,0.1))' : color + '18') : 'var(--surface)',
                color: active ? color : 'var(--text)',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Medeo Sans',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: active ? `0 1px 4px ${color}20` : 'none',
            }}
        >
            {children}
        </button>
    );
}

function FormatCard({ active, label, hint, ratio, color, onClick }) {
    const h = ratio >= 1 ? 34 : ratio < 0.7 ? 50 : 40;
    const w = Math.round(h * ratio);
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                padding: '9px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                borderRadius: 12,
                border: `1.5px solid ${active ? color : 'var(--border)'}`,
                background: active ? (color === 'var(--primary)' ? 'var(--primary-light, rgba(0,82,255,0.08))' : color + '15') : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: active ? `0 2px 8px ${color}22` : 'none',
            }}
        >
            <div style={{
                width: w,
                height: h,
                borderRadius: 4,
                border: `2px solid ${active ? color : 'var(--border)'}`,
                background: active ? color + '22' : 'transparent',
                transition: 'all 0.15s ease',
            }} />
            <div style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? color : 'var(--text)',
                fontFamily: 'Medeo Sans',
                letterSpacing: '0.02em',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 9,
                fontWeight: 600,
                color: active ? color : 'var(--text-muted)',
                fontFamily: 'Medeo Sans',
            }}>
                {hint}
            </div>
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
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
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
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
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
