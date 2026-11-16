import React from 'react';
import { X, Loader, Share2, Settings } from 'lucide-react';
import { formatNumber, formatPhone } from '../utils/format';
import { useApp } from '../context/AppContext';
import {
    getConnectedSocialNetworks,
    buildBannerCaption,
    getSocialTokenStatus,
    shareBannerToSocial,
} from '../lib/socialShare';

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

const DEAL_GOAL_OPTIONS = ['Продажа', 'Аренда', 'Посуточно', 'Обмен'];
const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1080&q=80';

const BANNER_FORMATS = { 
    story: { w: 1080, h: 1920 },
    portrait: { w: 1080, h: 1350 },
    post: { w: 1080, h: 1080 } 
};

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

export function BannerGenerator({ property = {}, currentUser, agent: propAgent, onClose, onOpenProfile }) {
    let appContext = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        appContext = useApp();
    } catch {
        // Safe fallback
    }
    const state = appContext?.state;
    const effectiveUser = currentUser || state?.currentUser;
    const assignedAgent = propAgent || (property?.agent_id && state?.clients ? state.clients.find(c => c.id === property.agent_id) : null);

    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Закрытие по Escape
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && typeof onClose === 'function') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const defaultPhone = React.useMemo(() => {
        const raw = assignedAgent?.phone || 
                    assignedAgent?.phone_2 || 
                    property?.contact_phone || 
                    currentUser?.phone || 
                    currentUser?.phone_number || 
                    property?.realtor_phone || 
                    '';
        return raw ? (formatPhone(raw) || raw) : '';
    }, [assignedAgent, property, currentUser]);

    const [phone, setPhone] = React.useState(defaultPhone);

    const defaultLocation = React.useMemo(() => {
        if (property?.microdistrict) {
            return `мкр. ${property.microdistrict}`;
        }
        if (property?.district) {
            return property.district;
        }
        if (property?.residential_complex) {
            return `ЖК «${property.residential_complex}»`;
        }
        return '';
    }, [property?.microdistrict, property?.district, property?.residential_complex]);

    const [locationText, setLocationText] = React.useState(defaultLocation);

    const canvasRef = React.useRef(null);
    const [format, setFormat] = React.useState('story'); // 'story' (9:16) | 'portrait' (4:5) | 'post' (1:1)
    const [designTheme, setDesignTheme] = React.useState('photo'); // 'photo' | 'light' | 'brand' | 'card'
    const [fitMode, setFitMode] = React.useState('contain'); // 'contain' (без обрезки) | 'cover' (с обрезкой)

    // Цель сделки
    const initialDealGoal = React.useMemo(() => {
        const dt = property?.deal_type;
        if (dt === 'rent' || dt === 'rent_long') return 'Аренда';
        if (dt === 'rent_daily') return 'Посуточно';
        if (dt === 'exchange') return 'Обмен';
        return 'Продажа';
    }, [property?.deal_type]);

    const [dealGoal, setDealGoal] = React.useState(initialDealGoal);
    const [showDealGoal, setShowDealGoal] = React.useState(true);
    const [customGoalText, setCustomGoalText] = React.useState('');

    const [stickers, setStickers] = React.useState([]);
    const [customStickerText, setCustomStickerText] = React.useState('Свой текст');
    const [loading, setLoading] = React.useState(false);
    const [accentColor, setAccentColor] = React.useState('#0052FF');

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

    const [availableLayouts, setAvailableLayouts] = React.useState(() => {
        return property?.floorplan_images || [];
    });
    const [layoutImage, setLayoutImage] = React.useState(() => {
        return (property?.floorplan_images && property.floorplan_images.length > 0)
            ? property.floorplan_images[0]
            : null;
    });

    const handleLayoutUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const urls = files.map(file => URL.createObjectURL(file));
        setAvailableLayouts(prev => [...prev, ...urls]);
        setLayoutImage(urls[0]);
    };

    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    // Кеш картинок во избежание повторной загрузки
    const imageCacheRef = React.useRef(new Map());

    const loadImageSafe = React.useCallback((src, isFloorplan = false) => {
        if (!src) return Promise.resolve(null);
        if (imageCacheRef.current.has(src)) {
            return Promise.resolve(imageCacheRef.current.get(src));
        }
        return new Promise(resolve => {
            const img = new Image();
            if (!isFloorplan && !src.startsWith('data:') && !src.startsWith('blob:')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                imageCacheRef.current.set(src, img);
                resolve(img);
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }, []);

    const draw = React.useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !isMountedRef.current) return;

        const currentFmt = BANNER_FORMATS[format] || BANNER_FORMATS.story;
        const { w, h } = currentFmt;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            const hasUncached = selectedImages.some(idx => !imageCacheRef.current.has(propertyImages[idx % propertyImages.length]));
            if (hasUncached) setLoading(true);

            // Загружаем только выбранные фото
            const promises = selectedImages.map(idx => {
                const src = propertyImages[idx % propertyImages.length];
                return loadImageSafe(src, false).then(img => ({ img, idx }));
            });

            if (layoutImage) {
                promises.push(loadImageSafe(layoutImage, true).then(img => ({ img, idx: -1 })));
            }

            const results = await Promise.all(promises);
            if (!isMountedRef.current) return;

            const loadedImgs = [];
            let loadedLayoutImg = null;

            results.forEach(res => {
                if (!res || !res.img) return;
                if (res.idx === -1) {
                    loadedLayoutImg = res.img;
                } else {
                    loadedImgs.push(res);
                }
            });

            loadedImgs.sort((a, b) => selectedImages.indexOf(a.idx) - selectedImages.indexOf(b.idx));
            const imgs = loadedImgs.map(item => item.img).filter(Boolean);

            if (!imgs.length) return;

            const IS = format === 'story';
            const isPortrait = format === 'portrait';

            const isLight = designTheme === 'light';
            const isPhoto = designTheme === 'photo';
            const isBrand = designTheme === 'brand';
            const isCard = designTheme === 'card';

            const drawCell = (img, x, y, iw, ih) => {
                if (!img || !img.width || !img.height || !iw || !ih) return;
                const ir = img.width / img.height;
                const cr = iw / ih;

                if (fitMode === 'cover') {
                    let dw, dh, dx, dy;
                    if (ir > cr) {
                        dh = ih; dw = ih * ir; dx = x - (dw - iw) / 2; dy = y;
                    } else {
                        dw = iw; dh = iw / ir; dx = x; dy = y - (dh - ih) / 2;
                    }
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, iw, ih);
                    ctx.clip();
                    ctx.drawImage(img, dx, dy, dw, dh);
                    ctx.restore();
                    return;
                }

                // fitMode === 'contain' (без обрезки)
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, iw, ih);
                ctx.clip();

                // Мягкая фоновая подложка ячейки
                let bgDw, bgDh, bgDx, bgDy;
                if (ir > cr) {
                    bgDh = ih; bgDw = ih * ir; bgDx = x - (bgDw - iw) / 2; bgDy = y;
                } else {
                    bgDw = iw; bgDh = iw / ir; bgDx = x; bgDy = y - (bgDh - ih) / 2;
                }
                ctx.globalAlpha = 0.22;
                ctx.drawImage(img, bgDx, bgDy, bgDw, bgDh);
                ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
                ctx.fillRect(x, y, iw, ih);
                ctx.globalAlpha = 1.0;

                // Фото целиком без обрезки с пропорциями
                let dw, dh, dx, dy;
                if (ir > cr) {
                    dw = iw;
                    dh = iw / ir;
                    dx = x;
                    dy = y + (ih - dh) / 2;
                } else {
                    dh = ih;
                    dw = ih * ir;
                    dx = x + (iw - dw) / 2;
                    dy = y;
                }
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
            };

            const px0 = IS ? 80 : (isPortrait ? 70 : 60);
            const rawAddr = (property?.address || property?.city || '').replace(/,?\s*кв\.?\s*\d+/i, '').trim();
            const loc = (locationText || '').trim();
            const addr = loc 
                ? (rawAddr && !rawAddr.toLowerCase().includes(loc.toLowerCase()) ? `${loc} · ${rawAddr}` : (rawAddr || loc))
                : rawAddr;
            const addrSize = IS ? 60 : (isPortrait ? 52 : 48);
            const maxWidth = w - 2 * px0;

            ctx.font = `700 ${addrSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            const addrLines = getWrappedLines(ctx, addr, maxWidth);

            const N = imgs.length;
            let photoH;
            if (fitMode === 'contain' && N === 1 && imgs[0] && imgs[0].width && imgs[0].height) {
                const imgRatio = imgs[0].width / imgs[0].height;
                if (Number.isFinite(imgRatio) && imgRatio > 0) {
                    const maxPhotoRatio = IS ? 0.62 : (isPortrait ? 0.54 : 0.50);
                    const minPhotoRatio = 0.38;
                    const naturalH = Math.round(w / imgRatio);
                    photoH = Math.min(Math.round(h * maxPhotoRatio), Math.max(Math.round(h * minPhotoRatio), naturalH));
                } else {
                    photoH = IS ? Math.round(h * 0.55) : (isPortrait ? Math.round(h * 0.51) : Math.round(h * 0.48));
                }
            } else {
                photoH = IS ? Math.round(h * 0.55) : (isPortrait ? Math.round(h * 0.51) : Math.round(h * 0.48));
            }

            let textStartY = isPhoto 
                ? (IS ? Math.round(h * 0.62) : (isPortrait ? Math.round(h * 0.58) : Math.round(h * 0.54)))
                : photoH;

            const catOffset = IS ? 110 : (isPortrait ? 90 : 80);
            const priceOffset = IS ? 110 : (isPortrait ? 92 : 80);
            const addrOffset = IS ? 100 : (isPortrait ? 85 : 75);
            const lineHeight = addrSize * 1.25;
            const detailsOffset = IS ? 20 : 15;
            const detailsSize = IS ? 40 : (isPortrait ? 35 : 32);

            const totalTextHeight = catOffset + priceOffset + addrOffset + (addrLines.length * lineHeight) + detailsOffset + (detailsSize * 0.2);
            
            const phy = h - (IS ? 140 : (isPortrait ? 115 : 100));
            const phoneSize = IS ? 52 : (isPortrait ? 44 : 40);
            const targetBottom = phy - phoneSize - 20;

            if (isPhoto && textStartY + totalTextHeight > targetBottom) {
                textStartY = Math.max(Math.round(h * 0.38), targetBottom - totalTextHeight);
            }

            // Фоновая подложка баннера
            if (isLight) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
            } else if (isBrand) {
                ctx.fillStyle = '#0F172A';
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = accentColor;
                ctx.fillRect(0, photoH, w, h - photoH);
            } else if (isCard) {
                ctx.fillStyle = '#0b1120';
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.fillStyle = '#0F172A';
                ctx.fillRect(0, 0, w, h);
            }

            // Границы фото-зоны
            let bx = 0, by = 0, bw = w, bh = photoH;
            if (isPhoto) {
                bh = h;
            } else if (isCard) {
                const cardMargin = IS ? 40 : 30;
                bx = cardMargin;
                by = cardMargin;
                bw = w - cardMargin * 2;
                bh = photoH - cardMargin;
            }

            const rects = [];
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
                        rects.push({ x: bx, y: by, w: bw, h: bh * split });
                        const sub_w = bw / (N - 1);
                        const sub_h = bh * (1 - split);
                        const sub_y = by + bh * split;
                        for (let j = 0; j < N - 1; j++) {
                            rects.push({ x: bx + j * sub_w, y: sub_y, w: sub_w, h: sub_h });
                        }
                    } else {
                        rects.push({ x: bx, y: by, w: bw * split, h: bh });
                        const sub_w = bw * (1 - split);
                        const sub_h = bh / (N - 1);
                        const sub_x = bx + bw * split;
                        for (let j = 0; j < N - 1; j++) {
                            rects.push({ x: sub_x, y: by + j * sub_h, w: sub_w, h: sub_h });
                        }
                    }
                } else {
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

            if (isCard) {
                ctx.save();
                ctx.beginPath();
                safeRoundRect(ctx, bx, by, bw, bh, 24);
                ctx.clip();
            }

            rects.forEach((r, idx) => {
                drawCell(imgs[idx % imgs.length], r.x, r.y, r.w, r.h);
            });

            if (N > 1) {
                ctx.save();
                ctx.strokeStyle = isLight ? '#ffffff' : '#0F172A';
                ctx.lineWidth = IS ? 12 : 8;
                rects.forEach(r => {
                    ctx.strokeRect(r.x, r.y, r.w, r.h);
                });
                ctx.restore();
            }

            if (isCard) {
                ctx.restore();
            }

            if (isPhoto) {
                const grad = ctx.createLinearGradient(0, h, 0, h * 0.45);
                grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
                grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.95)');
                grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.82)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, h * 0.45, w, h * 0.55);
            }

            // Данные объекта
            const parts = [];
            const type = property?.property_type;
            
            if (type === 'apartment') {
                parts.push(property?.rooms === 0 ? 'Студия' : property?.rooms + '-комн.');
            } else if (type === 'room') {
                parts.push('Комната');
            } else if (type === 'house') {
                if (property?.rooms > 0) {
                    parts.push(property?.rooms + '-комн.');
                }
            } else if (!type) {
                if (property?.rooms !== undefined) {
                    parts.push(property?.rooms === 0 ? 'Студия' : property?.rooms + '-комн.');
                }
            }
            
            if (property?.area_total) {
                parts.push(property?.area_total + ' м²');
            }
            
            if (['apartment', 'room', 'commercial'].includes(type) && property?.floor) {
                parts.push(property?.floor + '/' + (property?.floors_total || '?') + ' эт.');
            } else if (type === 'house' && property?.floors_total) {
                parts.push(property?.floors_total + ' эт.');
            } else if (!type && property?.floor) {
                parts.push(property?.floor + '/' + (property?.floors_total || '?') + ' эт.');
            }

            const activePhone = phone?.trim() ? (formatPhone(phone) || phone) : '+7 (999) 000-00-00';

            const roomsCount = property?.rooms;
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
            
            ctx.fillStyle = isLight ? '#9CA3AF' : (isBrand ? 'rgba(255, 255, 255, 0.85)' : '#E2E8F0');
            const catSize = IS ? 30 : (isPortrait ? 25 : 22);
            ctx.font = `400 ${catSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            const catY = textStartY + catOffset;
            ctx.fillText(spacedCategory, px0, catY);

            // Цена
            const priceText = formatNumber(property?.price) + ' ₽';
            const priceSize = IS ? 96 : (isPortrait ? 86 : 80);
            ctx.font = `700 ${priceSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            ctx.fillStyle = isBrand ? '#ffffff' : accentColor;
            const priceY = catY + priceOffset;
            ctx.fillText(priceText, px0, priceY);

            const priceWidth = ctx.measureText(priceText).width;

            if (property?.price && property?.area_total) {
                const m2 = Math.round(property.price / property.area_total);
                const sqmText = `(${formatNumber(m2)} ₽/м²)`;
                const sqmSize = IS ? 44 : (isPortrait ? 38 : 36);
                ctx.font = `300 ${sqmSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
                ctx.fillStyle = isLight ? '#4B5563' : (isBrand ? 'rgba(255, 255, 255, 0.78)' : '#94A3B8');
                ctx.fillText(sqmText, px0 + priceWidth + (IS ? 36 : 24), priceY);
            }

            // Адрес
            ctx.font = `700 ${addrSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
            const addrY = priceY + addrOffset;
            
            let currentY = addrY;
            for (let i = 0; i < addrLines.length; i++) {
                ctx.fillText(addrLines[i], px0, currentY);
                currentY += lineHeight;
            }
            const currentYAfterAddr = currentY;

            // Характеристики
            ctx.font = `300 ${detailsSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            ctx.fillStyle = isLight ? '#4B5563' : (isBrand ? 'rgba(255, 255, 255, 0.85)' : '#94A3B8');
            const detailsY = currentYAfterAddr + detailsOffset;
            ctx.fillText(parts.join('  ·  '), px0, detailsY);

            // Телефон риелтора
            const ctaText = 'подробнее по тел. ';

            ctx.font = `300 ${phoneSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            ctx.fillStyle = isLight ? '#4B5563' : (isBrand ? 'rgba(255, 255, 255, 0.85)' : '#E2E8F0');
            ctx.fillText(ctaText, px0, phy);

            const ctaWidth = ctx.measureText(ctaText).width;

            ctx.font = `700 ${phoneSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
            ctx.fillStyle = isLight ? '#111827' : '#FFFFFF';
            ctx.fillText(activePhone, px0 + ctaWidth, phy);

            /* ── ПЛАНИРОВКА (УВЕЛИЧЕНА НА 30%) ───────────────────────────── */
            if (loadedLayoutImg) {
                const boxSize = IS ? 500 : (isPortrait ? 416 : 364);
                const boxX = w - px0 - boxSize;
                const boxY = Math.max(photoH - boxSize - (IS ? 40 : 20), (IS ? 70 : 50) + 20);

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 6;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                safeRoundRect(ctx, boxX, boxY, boxSize, boxSize, 20);
                ctx.fill();
                ctx.restore();

                const pad = IS ? 20 : 16;
                const innerW = boxSize - pad * 2;
                const innerH = boxSize - pad * 2;
                const innerX = boxX + pad;
                const innerY = boxY + pad;

                ctx.save();
                ctx.beginPath();
                safeRoundRect(ctx, innerX, innerY, innerW, innerH, 12);
                ctx.clip();

                const imgW = loadedLayoutImg.width;
                const imgH = loadedLayoutImg.height;
                const imgRatio = (imgW && imgH) ? (imgW / imgH) : 1;
                
                let dw, dh, dx, dy;
                if (imgRatio > innerW / innerH) {
                    dw = innerW;
                    dh = innerW / imgRatio;
                    dx = innerX;
                    dy = innerY + (innerH - dh) / 2;
                } else {
                    dh = innerH;
                    dw = innerH * imgRatio;
                    dx = innerX + (innerW - dw) / 2;
                    dy = innerY;
                }
                
                ctx.drawImage(loadedLayoutImg, dx, dy, dw, dh);
                ctx.restore();
            }

            /* ── ПЛАШКА ЦЕЛИ СДЕЛКИ (ПРАВЫЙ ВЕРХНИЙ УГОЛ) ─────────────────── */
            const sp = IS ? 70 : (isPortrait ? 60 : 50);
            let dealBadgeBottom = sp + 20;

            if (showDealGoal) {
                const goalStr = (dealGoal === 'Свой вариант' ? customGoalText.trim() : dealGoal) || 'Продажа';
                const badgeText = goalStr.toUpperCase();
                const badgeH = IS ? 64 : (isPortrait ? 56 : 48);
                const badgeFontSize = IS ? 28 : (isPortrait ? 24 : 20);
                ctx.font = `700 ${badgeFontSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
                const textMetrics = ctx.measureText(badgeText);
                const padX = IS ? 28 : 22;
                const badgeW = textMetrics.width + padX * 2;
                const badgeX = w - sp - badgeW;
                const badgeY = sp + 20;

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 18;
                ctx.shadowOffsetY = 4;

                ctx.beginPath();
                safeRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
                ctx.fillStyle = isLight ? accentColor : '#ffffff';
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = isLight ? '#ffffff' : '#0F172A';
                ctx.font = `700 ${badgeFontSize}px 'Medeo Sans', ui-sans-serif, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + badgeFontSize * 0.35);
                ctx.textAlign = 'left';

                dealBadgeBottom = badgeY + badgeH + (IS ? 18 : 12);
            }

            /* ── СТИКЕРЫ ─────────────────────────────────────────────────── */
            if (stickers.length) {
                const sh = IS ? 66 : (isPortrait ? 56 : 48);
                const sf = IS ? 30 : (isPortrait ? 26 : 22);
                let sy = showDealGoal ? dealBadgeBottom : (sp + 20);
                ctx.textAlign = 'center';
                stickers.forEach(s => {
                    const txt = s === 'Свой текст' ? (customStickerText.trim() || 'Свой текст') : s;
                    ctx.font = `700 ${sf}px 'Medeo Sans', ui-sans-serif, sans-serif`;
                    const tw = ctx.measureText(txt.toUpperCase()).width + 48;
                    const sx = w - sp - tw;
                    
                    if (s === 'Срочно') {
                        ctx.fillStyle = '#EF4444';
                    } else {
                        ctx.fillStyle = accentColor;
                    }
                    
                    ctx.beginPath(); 
                    safeRoundRect(ctx, sx, sy, tw, sh, 10); 
                    ctx.fill();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(txt.toUpperCase(), sx + tw / 2, sy + sh / 2 + sf / 3);
                    sy += sh + 14;
                });
                ctx.textAlign = 'left';
            }

            if (isMountedRef.current && hasUncached) {
                setLoading(false);
            }
        } catch (err) {
            console.error('[BannerGenerator] draw error:', err);
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [
        format, 
        designTheme, 
        fitMode,
        dealGoal,
        showDealGoal,
        customGoalText,
        selectedImages, 
        gridLayout, 
        stickers, 
        customStickerText, 
        property?.address,
        property?.city,
        property?.property_type,
        property?.rooms,
        property?.area_total,
        property?.price,
        property?.floor,
        property?.floors_total,
        propertyImages, 
        accentColor, 
        layoutImage, 
        phone, 
        locationText,
        loadImageSafe
    ]);

    React.useEffect(() => {
        draw();
    }, [draw]);

    const dl = () => {
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

    const [showSocialPanel, setShowSocialPanel] = React.useState(false);
    const [sharingNetworkId, setSharingNetworkId] = React.useState(null);
    const [shareFeedback, setShareFeedback] = React.useState(null);
    const [tokenStatus, setTokenStatus] = React.useState(null);

    const connectedSocials = React.useMemo(
        () => getConnectedSocialNetworks(effectiveUser),
        [effectiveUser]
    );

    React.useEffect(() => {
        if (!showSocialPanel || tokenStatus !== null) return;
        const needsApiStatus = connectedSocials.some(
            n => n.supportsApi && n.account?.publishMode === 'api'
        );
        if (!needsApiStatus) return;

        let active = true;
        getSocialTokenStatus()
            .then(status => {
                if (active && status) setTokenStatus(status);
            })
            .catch(() => {
                if (active) setTokenStatus({ vk: { hasToken: false }, tg: { hasToken: false } });
            });
        return () => { active = false; };
    }, [showSocialPanel, tokenStatus, connectedSocials]);

    const handleOpenProfile = () => {
        if (typeof onClose === 'function') onClose();
        if (typeof onOpenProfile === 'function') {
            onOpenProfile();
        } else if (typeof window !== 'undefined') {
            window.location.hash = '#/profile';
        }
    };

    const handleShareSocial = async (net) => {
        if (!canvasRef.current || sharingNetworkId) return;
        setSharingNetworkId(net.id);
        setShareFeedback(null);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const caption = buildBannerCaption(property, phone, locationText);
            const linkUrl =
                typeof window !== 'undefined' && property?.id
                    ? `${window.location.origin}/#/p/${property.id}`
                    : '';

            let currentTokenStatus = tokenStatus;
            if (net.supportsApi && net.account?.publishMode === 'api' && currentTokenStatus === null) {
                try {
                    currentTokenStatus = await getSocialTokenStatus();
                    setTokenStatus(currentTokenStatus);
                } catch {
                    currentTokenStatus = { vk: { hasToken: false }, tg: { hasToken: false } };
                }
            }

            const result = await shareBannerToSocial({
                networkId: net.id,
                dataUrl,
                fileName: `banner-${property?.id || 'object'}-${format}.png`,
                caption,
                linkUrl,
                account: net.account,
                tokenStatus: currentTokenStatus,
            });

            if (result?.ok) {
                setShareFeedback({ type: 'success', text: result.message });
            } else if (result?.cancelled) {
                setShareFeedback({ type: 'info', text: result.message });
            }
        } catch (err) {
            setShareFeedback({
                type: 'error',
                text: err?.message || `Не удалось отправить баннер в ${net.storyLabel}`,
            });
        } finally {
            setSharingNetworkId(null);
        }
    };

    const activeColor = 'var(--primary)';
    const AVAILABLE_STICKERS = ['Свободная продажа', 'Ищем встречный вариант', 'Срочно', 'Свой текст'];

    return (
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget && typeof onClose === 'function') {
                    onClose();
                }
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--modal-bg)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--text)' }}
        >
            <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (typeof onClose === 'function') onClose();
                }} 
                style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--border-light)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', zIndex: 10001 }}
                title="Закрыть (Esc)"
            >
                <X size={22} />
            </button>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, width: '100%', maxWidth: 1160, height: isMobile ? 'auto' : '85vh', alignItems: 'flex-start', overflowY: isMobile ? 'auto' : 'visible' }}>

                {/* Controls */}
                <div style={{ flex: isMobile ? 'none' : '0 0 280px', width: isMobile ? '100%' : 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, overflowY: 'auto', maxHeight: isMobile ? 'none' : '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontFamily: 'Medeo Sans', fontSize: 11, fontWeight: 300, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Баннер</div>

                    {/* Format */}
                    <Section label="ФОРМАТ">
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            {[
                                ['story', 'Story 9:16'],
                                ['portrait', 'Пост 4:5'],
                                ['post', 'Квадрат 1:1']
                            ].map(([f, l]) => (
                                <Chip key={f} active={format === f} color={activeColor} onClick={() => setFormat(f)}>{l}</Chip>
                            ))}
                        </div>
                    </Section>

                    {/* Theme */}
                    <Section label="ТЕМА ОФОРМЛЕНИЯ">
                        <div style={{ display: 'flex', gap: '6px 14px', flexWrap: 'wrap' }}>
                            {[
                                ['photo', 'Тёмная'],
                                ['light', 'Светлая'],
                                ['brand', 'Цветная'],
                                ['card', 'Карточка']
                            ].map(([t, l]) => (
                                <Chip key={t} active={designTheme === t} color={activeColor} onClick={() => setDesignTheme(t)}>{l}</Chip>
                            ))}
                        </div>
                    </Section>

                    {/* Photo fit mode */}
                    <Section label="ПОДГОНКА ФОТО">
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            {[
                                ['contain', 'Без обрезки'],
                                ['cover', 'С обрезкой']
                            ].map(([m, l]) => (
                                <Chip key={m} active={fitMode === m} color={activeColor} onClick={() => setFitMode(m)}>{l}</Chip>
                            ))}
                        </div>
                    </Section>

                    {/* Deal Goal Badge */}
                    <Section label="ЦЕЛЬ СДЕЛКИ (ПЛАШКА СВЕРХУ)">
                        <div style={{ display: 'flex', gap: '6px 12px', flexWrap: 'wrap', marginBottom: 6 }}>
                            {DEAL_GOAL_OPTIONS.map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => {
                                        setDealGoal(g);
                                        setShowDealGoal(true);
                                    }}
                                    style={{
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        border: `1px solid ${showDealGoal && dealGoal === g ? activeColor : 'var(--border)'}`,
                                        background: showDealGoal && dealGoal === g ? 'var(--primary-light, rgba(0, 82, 255, 0.1))' : 'transparent',
                                        color: showDealGoal && dealGoal === g ? activeColor : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontFamily: 'Medeo Sans',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowDealGoal(prev => !prev)}
                                style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    border: '1px dashed var(--border)',
                                    background: 'transparent',
                                    color: !showDealGoal ? activeColor : 'var(--text-muted)',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {showDealGoal ? '✕ Скрыть' : '✓ Показать'}
                            </button>
                        </div>
                        {showDealGoal && (
                            <input
                                type="text"
                                value={dealGoal === 'Свой вариант' ? customGoalText : (DEAL_GOAL_OPTIONS.includes(dealGoal) ? '' : dealGoal)}
                                onChange={e => {
                                    setDealGoal('Свой вариант');
                                    setCustomGoalText(e.target.value);
                                }}
                                placeholder="Свой текст плашки..."
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    color: 'var(--text)',
                                    fontSize: 12,
                                    fontFamily: 'Medeo Sans',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        )}
                    </Section>

                    {/* Phone Number */}
                    <Section label="НОМЕР ТЕЛЕФОНА">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input 
                                type="tel" 
                                inputMode="tel"
                                value={phone} 
                                onChange={e => setPhone(formatPhone(e.target.value, true))} 
                                placeholder="+7 (___) ___-__-__"
                                style={{ 
                                    width: '100%', 
                                    padding: '7px 10px', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)', 
                                    background: 'var(--bg)', 
                                    color: 'var(--text)', 
                                    fontSize: 13, 
                                    fontFamily: 'Medeo Sans', 
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {(() => {
                                const options = [];
                                if (assignedAgent?.phone) {
                                    options.push({
                                        label: `Агент: ${assignedAgent.full_name ? assignedAgent.full_name.split(' ')[0] : 'Агент'}`,
                                        val: formatPhone(assignedAgent.phone) || assignedAgent.phone
                                    });
                                }
                                if (currentUser?.phone) {
                                    const myFormatted = formatPhone(currentUser.phone) || currentUser.phone;
                                    if (!options.some(o => o.val === myFormatted)) {
                                        options.push({ label: 'Мой телефон', val: myFormatted });
                                    }
                                }
                                if (property?.contact_phone) {
                                    const contactFormatted = formatPhone(property.contact_phone) || property.contact_phone;
                                    if (!options.some(o => o.val === contactFormatted)) {
                                        options.push({ label: 'Контакт объекта', val: contactFormatted });
                                    }
                                }
                                if (options.length > 1) {
                                    return (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                            {options.map((opt, idx) => {
                                                const isActive = phone === opt.val;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setPhone(opt.val)}
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: 6,
                                                            border: `1px solid ${isActive ? activeColor : 'var(--border)'}`,
                                                            background: isActive ? 'var(--primary-light, rgba(0, 82, 255, 0.1))' : 'transparent',
                                                            color: isActive ? activeColor : 'var(--text-muted)',
                                                            fontSize: 11,
                                                            fontFamily: 'Medeo Sans',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </Section>

                    {/* Location */}
                    <Section label="ЛОКАЦИЯ НА БАННЕРЕ">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input 
                                type="text" 
                                value={locationText} 
                                onChange={e => setLocationText(e.target.value)} 
                                placeholder="Микрорайон, район или ЖК"
                                style={{ 
                                    width: '100%', 
                                    padding: '7px 10px', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)', 
                                    background: 'var(--bg)', 
                                    color: 'var(--text)', 
                                    fontSize: 13, 
                                    fontFamily: 'Medeo Sans', 
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {(() => {
                                const quickLocs = [];
                                if (property?.microdistrict) {
                                    quickLocs.push({ label: `мкр. ${property.microdistrict}`, val: `мкр. ${property.microdistrict}` });
                                }
                                if (property?.district) {
                                    quickLocs.push({ label: property.district, val: property.district });
                                }
                                if (property?.residential_complex) {
                                    quickLocs.push({ label: `ЖК «${property.residential_complex}»`, val: `ЖК «${property.residential_complex}»` });
                                }
                                if (quickLocs.length > 0) {
                                    return (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                            {quickLocs.map((loc, idx) => {
                                                const isActive = locationText === loc.val;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setLocationText(loc.val)}
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: 6,
                                                            border: `1px solid ${isActive ? activeColor : 'var(--border)'}`,
                                                            background: isActive ? 'var(--primary-light, rgba(0, 82, 255, 0.1))' : 'transparent',
                                                            color: isActive ? activeColor : 'var(--text-muted)',
                                                            fontSize: 11,
                                                            fontFamily: 'Medeo Sans',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {loc.label}
                                                    </button>
                                                );
                                            })}
                                            {locationText && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLocationText('')}
                                                    style={{
                                                        padding: '2px 6px',
                                                        borderRadius: 6,
                                                        border: '1px dashed var(--border)',
                                                        background: 'transparent',
                                                        color: 'var(--text-muted)',
                                                        fontSize: 10,
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Убрать локацию с баннера"
                                                >
                                                    ✕ без
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
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

                    {/* Layout selection */}
                    <Section label="ПЛАНИРОВКА НА БАННЕРЕ">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            <button 
                                type="button"
                                onClick={() => setLayoutImage(null)}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    border: `2px solid ${layoutImage === null ? activeColor : 'var(--border)'}`,
                                    background: 'var(--bg)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                }}
                            >
                                БЕЗ
                            </button>

                            {availableLayouts.map((url, idx) => {
                                const isSel = layoutImage === url;
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setLayoutImage(url)}
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
                                    </div>
                                );
                            })}

                            <label
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    border: '2px dashed var(--border)',
                                    background: 'var(--bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    boxSizing: 'border-box',
                                    fontSize: 18,
                                    fontWeight: 'bold'
                                }}
                            >
                                +
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={handleLayoutUpload} 
                                />
                            </label>
                        </div>
                    </Section>

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
                                    type="button"
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
                                        type="button"
                                        onClick={() => setStickers(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                                        style={{ 
                                            padding: '4px 0', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            fontSize: 13, 
                                            fontFamily: 'Medeo Sans', 
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
                                    fontFamily: 'Medeo Sans',
                                    outline: 'none',
                                    marginTop: 6
                                }}
                            />
                        )}
                    </Section>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                        <button 
                            type="button"
                            onClick={() => {
                                if (selectedImages.length === 1) {
                                    setSelectedImages([ (selectedImages[0] + 1) % propertyImages.length ]);
                                } else {
                                    setSelectedImages(prev => [...prev.slice(1), prev[0]]);
                                }
                            }}
                            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Medeo Sans', transition: 'all 0.15s' }}
                        >
                            ↻ Сдвиг
                        </button>
                        <button 
                            type="button"
                            onClick={dl}
                            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: activeColor, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'Medeo Sans', fontWeight: 700, letterSpacing: '0.06em', transition: 'all 0.15s' }}
                        >
                            ↓ СКАЧАТЬ
                        </button>
                    </div>

                    {/* Share to My Socials */}
                    <div style={{ marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowSocialPanel(prev => !prev);
                                setShareFeedback(null);
                            }}
                            style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 10,
                                border: `1px solid ${showSocialPanel ? activeColor : 'var(--border)'}`,
                                background: showSocialPanel ? 'var(--primary-light, rgba(0, 82, 255, 0.08))' : 'var(--bg)',
                                color: showSocialPanel ? activeColor : 'var(--text)',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontFamily: 'Medeo Sans',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.15s',
                            }}
                        >
                            <Share2 size={14} />
                            <span>
                                В мои соцсети{connectedSocials.length > 0 ? ` (${connectedSocials.length})` : ''}
                            </span>
                        </button>

                        {showSocialPanel && (
                            <div
                                style={{
                                    marginTop: 8,
                                    padding: 10,
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                {connectedSocials.length > 0 ? (
                                    <>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            Отправить фото баннера
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {connectedSocials.map(net => {
                                                const isBusy = sharingNetworkId === net.id;
                                                const isApiMode = net.supportsApi && net.account?.publishMode === 'api';
                                                return (
                                                    <button
                                                        key={net.id}
                                                        type="button"
                                                        disabled={Boolean(sharingNetworkId)}
                                                        onClick={() => handleShareSocial(net)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 8,
                                                            width: '100%',
                                                            padding: '8px 10px',
                                                            borderRadius: 9,
                                                            border: `1px solid ${net.color}33`,
                                                            background: 'var(--surface)',
                                                            color: 'var(--text)',
                                                            cursor: sharingNetworkId ? 'wait' : 'pointer',
                                                            fontSize: 12,
                                                            fontFamily: 'Medeo Sans',
                                                            fontWeight: 600,
                                                            textAlign: 'left',
                                                            opacity: sharingNetworkId && !isBusy ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span
                                                                style={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: '50%',
                                                                    background: net.color,
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <span>{net.storyLabel}</span>
                                                        </span>
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                                                            {isBusy ? 'Отправка...' : isApiMode ? 'API' : 'Share'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleOpenProfile}
                                            style={{
                                                marginTop: 2,
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                fontSize: 11,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '2px 0',
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            <Settings size={11} /> Настроить соцсети в профиле
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center', padding: '4px 2px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            Подключите соцсети (VK, OK, ТГ, Instagram, WhatsApp) в профиле для отправки в сторис.
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleOpenProfile}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: 'none',
                                                background: activeColor,
                                                color: '#ffffff',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <Settings size={13} /> Подключить в профиле
                                        </button>
                                    </div>
                                )}

                                {shareFeedback && (
                                    <div
                                        role="status"
                                        style={{
                                            padding: '7px 9px',
                                            borderRadius: 8,
                                            fontSize: 11,
                                            lineHeight: 1.35,
                                            background:
                                                shareFeedback.type === 'error'
                                                    ? 'var(--danger-light, #fef2f2)'
                                                    : shareFeedback.type === 'success'
                                                    ? 'var(--success-light, #ecfdf5)'
                                                    : 'var(--bg-light)',
                                            color:
                                                shareFeedback.type === 'error'
                                                    ? 'var(--danger, #dc2626)'
                                                    : shareFeedback.type === 'success'
                                                    ? 'var(--success-hover, #059669)'
                                                    : 'var(--text-secondary)',
                                        }}
                                    >
                                        {shareFeedback.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview */}
                <div style={{ flex: 1, height: isMobile ? '500px' : '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ position: 'relative', height: '100%', aspectRatio: `${BANNER_FORMATS[format].w}/${BANNER_FORMATS[format].h}`, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', borderRadius: 24, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
            type="button"
            onClick={onClick} 
            style={{ 
                padding: '4px 0', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: 13, 
                fontFamily: 'Medeo Sans', 
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
