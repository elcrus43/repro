import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { 
    Pencil, Trash, Sparkles, Building2, 
    ChevronDown, ChevronUp, Home, Calendar, Layers, Maximize2, 
    Wind, Droplets, ParkingCircle, Sofa, CheckCircle2, AlertCircle, 
    Construction, Briefcase, FileText, ArrowUpCircle, Image as ImageIcon, X, RefreshCw, Loader, ChevronLeft,
    Wand2
} from 'lucide-react';

import { AdGenerator } from '../../components/AdGenerator';




/* ─── BannerGenerator (Inlined to avoid module issues) ─────────────────────── */
function BannerGenerator({ property, currentUser, onClose }) {
    const canvasRef = React.useRef(null);
    const [format, setFormat] = React.useState('story');
    const [theme, setTheme] = React.useState('light');
    const [design, setDesign] = React.useState('minimal');
    const [accentColor, setAccentColor] = React.useState('#0052FF');
    const [accentColor2, setAccentColor2] = React.useState('#7C3AED');
    const [borderWidth, setBorderWidth] = React.useState(8);
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
        { name: 'Черный', value: '#1A1A1A' },
        { name: 'Оранжевый', value: '#f47b20' },
        { name: 'Розовый', value: '#e31b6d' },
        { name: 'Фиолетовый', value: '#7C3AED' },
        { name: 'Бирюза', value: '#0891B2' },
    ];
    const GRADIENT_PRESETS = [
        { name: 'Океан', a: '#0052FF', b: '#00C6FF' },
        { name: 'Закат', a: '#F7971E', b: '#FFD200' },
        { name: 'Малахит', a: '#11998e', b: '#38ef7d' },
        { name: 'Аметист', a: '#7C3AED', b: '#EC4899' },
        { name: 'Уголь', a: '#1A1A1A', b: '#434343' },
        { name: 'Рубин', a: '#C62828', b: '#E91E63' },
    ];

    const formats = {
        story: { width: 1080, height: 1920, label: 'Story (9:16)' },
        post: { width: 1080, height: 1080, label: 'Post (1:1)' }
    };

    React.useEffect(() => {
        renderBanner();
    }, [format, theme, design, property, imageOffset, accentColor, accentColor2, borderWidth, stickers, customSticker]);

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
            renderStripeOverlay(ctx, canvas, loadedImages, drawCover);
        } else if (design === 'split') {
            const splitX = Math.round(canvas.width * 0.55);
            renderSplitOverlay(ctx, canvas, splitX, loadedImages, drawCover);
        } else if (design === 'gradient') {
            renderGradientOverlay(ctx, canvas, loadedImages, drawCover);
        } else if (design === 'luxury') {
            renderLuxuryOverlay(ctx, canvas, loadedImages, drawCover);
        }

        // Draw border frame (for non-luxury/gradient designs)
        if (borderWidth > 0 && design !== 'luxury' && design !== 'gradient') {
            const bw = borderWidth * 3;
            const gradB = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradB.addColorStop(0, accentColor);
            gradB.addColorStop(1, accentColor2);
            ctx.strokeStyle = gradB;
            ctx.lineWidth = bw;
            const m = bw / 2;
            ctx.strokeRect(m, m, canvas.width - bw, canvas.height - bw);
        }

        // Draw Stickers
        if (stickers.length > 0) {
            renderStickers(ctx, canvas);
        }

        setLoading(false);
    };

    const renderStickers = (ctx, canvas) => {
        const padding = format === 'story' ? 60 : 45;
        const stickerH = format === 'story' ? 70 : 50;
        const fontSize = format === 'story' ? 32 : 24;
        let stickerY = padding + 20;

        const allStickers = [...stickers];
        if (customSticker.trim()) allStickers.push(customSticker.trim());

        // В дизайне "Сплит" стикеры рисуем на левой (фото) зоне,
        // чтобы не перекрывать текстовую панель справа
        const rightEdge = design === 'split'
            ? Math.round(canvas.width * 0.55) - padding
            : canvas.width - padding;

        allStickers.forEach(text => {
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            const textW = ctx.measureText(text.toUpperCase()).width;
            const boxW = textW + 40;

            ctx.fillStyle = accentColor;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
            ctx.beginPath();
            ctx.roundRect(rightEdge - boxW, stickerY, boxW, stickerH, 12);
            ctx.fill();
            ctx.shadowColor = 'transparent';

            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(text.toUpperCase(), rightEdge - (boxW / 2), stickerY + (stickerH / 2) + (fontSize / 3));
            stickerY += stickerH + 15;
        });
        ctx.textAlign = 'left';
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
        ctx.font = `600 ${priceSize}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceWidth = ctx.measureText(priceText).width;
        
        // Shrink price font if it's too long to fit with m2 price
        const maxPriceWidth = w - padding * 2 - 250;
        if (priceWidth > maxPriceWidth) {
            priceSize = priceSize * (maxPriceWidth / priceWidth);
            ctx.font = `600 ${priceSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `600 ${addressSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `200 ${ctaSize}px Oswald, Inter, sans-serif`;
        ctx.fillText('СВЯЗАТЬСЯ:', padding, currentY);
        const ctaWidth = ctx.measureText('СВЯЗАТЬСЯ: ').width;

        ctx.fillStyle = brandColor;
        ctx.font = `600 ${phoneSize}px Oswald, Inter, sans-serif`;
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        ctx.fillText(phone, padding + ctaWidth + 10, currentY);

        if (currentUser?.full_name) {
            ctx.fillStyle = textColor1;
            ctx.font = `600 ${ctaSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `600 ${priceF}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;

        // Shrink if needed
        if (priceW > w - 160 - 300) {
            priceF = priceF * ((w - 160 - 300) / priceW);
            ctx.font = `600 ${priceF}px Oswald, Inter, sans-serif`;
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
        ctx.font = '600 65px Oswald, Inter, sans-serif';
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
        ctx.font = '200 28px Oswald, Inter, sans-serif';
        ctx.fillText('УЗНАТЬ ПОДРОБНЕЕ:', 80, h - 210);

        ctx.fillStyle = brandColor;
        ctx.font = '600 48px Oswald, Inter, sans-serif';
        const phone = currentUser?.phone || '+7 (999) 000-00-00';
        ctx.fillText(phone, 80, h - 150);

        if (currentUser?.full_name) {
            ctx.fillStyle = textColor1;
            ctx.font = '600 32px Oswald, Inter, sans-serif';
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
        ctx.font = `600 ${priceF}px Oswald, Inter, sans-serif`;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;

        // Shrink if needed
        if (priceW > w - 120 - 250) {
            priceF = priceF * ((w - 120 - 250) / priceW);
            ctx.font = `600 ${priceF}px Oswald, Inter, sans-serif`;
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
        ctx.font = '600 45px Oswald, Inter, sans-serif';
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
        ctx.font = '200 20px Oswald, Inter, sans-serif';
        ctx.fillText('УЗНАТЬ ПОДРОБНЕЕ:', 60, h - 100);

        ctx.fillStyle = brandColor;
        ctx.font = '600 34px Oswald, Inter, sans-serif';
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
        ctx.font = `600 ${priceSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;
        if (priceW > w - px * 2 - 260) {
            const s = (w - px * 2 - 260) / priceW;
            ctx.font = `600 ${priceSize * s}px Oswald, Inter, sans-serif`;
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
        ctx.font = `600 ${addrSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor1;
        const address = getCleanAddress();
        ctx.fillText(address.slice(0, 40) + (address.length > 40 ? '...' : ''), px, y);
        y += format === 'story' ? 56 : 40;

        // Details row
        const detSize = format === 'story' ? 36 : 26;
        ctx.font = `200 ${detSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `200 ${phoneSize * 0.55}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor2;
        ctx.fillText('СВЯЗАТЬСЯ:', px, y);
        y += format === 'story' ? 58 : 42;
        ctx.font = `600 ${phoneSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `600 ${priceSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        const priceText = formatNumber(property.price) + ' ₽';
        let priceW = ctx.measureText(priceText).width;
        if (priceW > availW) {
            const s = availW / priceW;
            ctx.font = `600 ${priceSize * s}px Oswald, Inter, sans-serif`;
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
        ctx.font = `600 ${addrSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `200 ${detSize}px Oswald, Inter, sans-serif`;
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
        ctx.font = `200 ${phoneSize * 0.5}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = textColor2;
        ctx.fillText('СВЯЗАТЬСЯ:', px, phoneY - (format === 'story' ? 16 : 10));
        ctx.font = `600 ${phoneSize}px Oswald, Inter, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText(currentUser?.phone || '+7 (999) 000-00-00', px, phoneY + phoneSize * 0.85);
        if (currentUser?.full_name) {
            ctx.font = `600 ${phoneSize * 0.52}px Oswald, Inter, sans-serif`;
            ctx.fillStyle = textColor2;
            ctx.fillText(currentUser.full_name, px, phoneY + phoneSize * 1.6);
        }
    };


    // ── GRADIENT design: full-bleed photo + diagonal gradient overlay ──────
    const renderGradientOverlay = (ctx, canvas, imgs, drawCover) => {
        const w = canvas.width; const h = canvas.height;
        drawCover(imgs[0], 0, 0, w, h);
        // Diagonal gradient
        const grad = ctx.createLinearGradient(0, h * 0.3, w, h);
        grad.addColorStop(0, accentColor + 'CC');
        grad.addColorStop(1, accentColor2 + 'EE');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Border frame
        if (borderWidth > 0) {
            ctx.strokeStyle = accentColor2;
            ctx.lineWidth = borderWidth * 3;
            const m = borderWidth * 5;
            ctx.strokeRect(m, m, w - m * 2, h - m * 2);
        }
        // Text block
        const isDark = true;
        const px = format === 'story' ? 90 : 70;
        let y = format === 'story' ? h * 0.52 : h * 0.48;
        const priceSize = format === 'story' ? 130 : 100;
        ctx.font = `700 ${priceSize}px Oswald, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
        ctx.fillText(formatNumber(property.price) + ' ₽', px, y);
        ctx.shadowBlur = 0;
        y += format === 'story' ? 70 : 55;
        ctx.font = `300 ${format === 'story' ? 55 : 40}px Oswald, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(getCleanAddress().slice(0, 38), px, y);
        y += format === 'story' ? 55 : 42;
        const parts = [];
        if (property.rooms !== undefined) parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
        if (property.area_total) parts.push(property.area_total + ' м²');
        if (property.floor) parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
        ctx.font = `200 ${format === 'story' ? 38 : 28}px Oswald, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(parts.join('  ·  '), px, y);
        // Phone at bottom
        const phoneY = h - (format === 'story' ? 160 : 120);
        ctx.font = `600 ${format === 'story' ? 52 : 38}px Oswald, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(currentUser?.phone || '+7 (999) 000-00-00', px, phoneY);
        if (currentUser?.full_name) {
            ctx.font = `300 ${format === 'story' ? 34 : 24}px Oswald, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(currentUser.full_name, px, phoneY + (format === 'story' ? 48 : 36));
        }
    };

    // ── LUXURY design: dark bg + gold gradient border + centered photo ──────
    const renderLuxuryOverlay = (ctx, canvas, imgs, drawCover) => {
        const w = canvas.width; const h = canvas.height;
        const isDark = theme === 'dark';
        // Dark or light background
        const bg = isDark ? '#0A0A0A' : '#FAFAFA';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // Gradient border frame
        const bw = borderWidth * 6;
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(0.5, accentColor2);
        grad.addColorStop(1, accentColor);
        ctx.strokeStyle = grad;
        ctx.lineWidth = bw;
        ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
        // Inner photo with padding
        const pad = bw + (format === 'story' ? 30 : 22);
        const photoH = format === 'story' ? h * 0.62 : h * 0.58;
        drawCover(imgs[0], pad, pad, w - pad * 2, photoH - pad);
        // Gradient accent line under photo
        ctx.fillStyle = grad;
        ctx.fillRect(pad, photoH + 4, w - pad * 2, format === 'story' ? 6 : 4);
        // Text block
        const textColor = isDark ? '#FFFFFF' : '#0A0A0A';
        const px = pad + (format === 'story' ? 20 : 15);
        let y = photoH + (format === 'story' ? 90 : 70);
        ctx.font = `600 ${format === 'story' ? 110 : 80}px Oswald, sans-serif`;
        ctx.fillStyle = grad;
        ctx.fillText(formatNumber(property.price) + ' ₽', px, y);
        y += format === 'story' ? 65 : 48;
        ctx.font = `300 ${format === 'story' ? 48 : 34}px Oswald, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(getCleanAddress().slice(0, 34), px, y);
        y += format === 'story' ? 50 : 38;
        const parts = [];
        if (property.rooms !== undefined) parts.push(property.rooms === 0 ? 'Студия' : property.rooms + '-комн.');
        if (property.area_total) parts.push(property.area_total + ' м²');
        if (property.floor) parts.push(property.floor + '/' + (property.floors_total || '?') + ' эт.');
        ctx.font = `200 ${format === 'story' ? 34 : 24}px Oswald, sans-serif`;
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
        ctx.fillText(parts.join('  ·  '), px, y);
        // Phone
        const phoneY = h - (format === 'story' ? 170 : 130) - bw;
        ctx.font = `600 ${format === 'story' ? 50 : 36}px Oswald, sans-serif`;
        ctx.fillStyle = grad;
        ctx.fillText(currentUser?.phone || '+7 (999) 000-00-00', px, phoneY);
        if (currentUser?.full_name) {
            ctx.font = `300 ${format === 'story' ? 32 : 22}px Oswald, sans-serif`;
            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
            ctx.fillText(currentUser.full_name, px, phoneY + (format === 'story' ? 44 : 32));
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
                    <h3 style={{ marginBottom: 20, fontFamily: 'Oswald', fontWeight: 600, letterSpacing: 1, color: '#000' }}>Настройки баннера</h3>
                    
                    {/* Format & Design */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Формат</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <button className={`btn ${format === 'story' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '8px' }} onClick={() => setFormat('story')}>Story (9:16)</button>
                            <button className={`btn ${format === 'post' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '8px' }} onClick={() => setFormat('post')}>Post (1:1)</button>
                        </div>
                        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Стиль дизайна</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[['classic','Классика'],['minimal','Паспарту'],['stripe','Полоса'],['split','Сплит'],['gradient','Градиент'],['luxury','Люкс']].map(([d,l]) => (
                                <button key={d} className={`btn ${design === d ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '8px' }} onClick={() => setDesign(d)}>{l}</button>
                            ))}
                        </div>
                    </div>

                    {/* Accent Colors */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Цвет 1 (акцент)</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {COLOR_OPTIONS.map(c => (
                                <button key={c.value} onClick={() => setAccentColor(c.value)}
                                    style={{ width: 36, height: 36, borderRadius: '50%', background: c.value, border: accentColor === c.value ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }}
                                    title={c.name} />
                            ))}
                            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
                        </div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Цвет 2 (градиент)</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {COLOR_OPTIONS.map(c => (
                                <button key={c.value} onClick={() => setAccentColor2(c.value)}
                                    style={{ width: 36, height: 36, borderRadius: '50%', background: c.value, border: accentColor2 === c.value ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }}
                                    title={c.name} />
                            ))}
                            <input type="color" value={accentColor2} onChange={e => setAccentColor2(e.target.value)}
                                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
                        </div>
                    </div>

                    {/* Gradient Presets */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Готовые градиенты</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {GRADIENT_PRESETS.map(g => (
                                <button key={g.name} onClick={() => { setAccentColor(g.a); setAccentColor2(g.b); }}
                                    title={g.name}
                                    style={{ width: 36, height: 36, borderRadius: 10, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)',
                                        background: `linear-gradient(135deg, ${g.a}, ${g.b})` }} />
                            ))}
                        </div>
                    </div>

                    {/* Border Width */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Рамка: {borderWidth > 0 ? borderWidth : 'нет'}</label>
                        <input type="range" min={0} max={20} value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))}
                            style={{ width: '100%', accentColor: accentColor }} />
                    </div>

                    {/* Stickers */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Стикеры</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {STICKER_OPTIONS.map(s => (
                                <button key={s} onClick={() => setStickers(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12, border: 'none', cursor: 'pointer',
                                        background: stickers.includes(s) ? accentColor : 'rgba(255,255,255,0.1)', color: 'white' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <input type="text" placeholder="Свой текст на стикер..." value={customSticker}
                            onChange={(e) => setCustomSticker(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 12, outline: 'none' }} />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                        <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setImageOffset(o => o + 1)}>Другие фото</button>
                        <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}</button>
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
                    
                    <button className="btn btn-primary" onClick={download} style={{ marginTop: 32, padding: '18px 60px', borderRadius: 16, fontSize: 18, fontWeight: 500, boxShadow: `0 10px 30px -10px ${accentColor}` }}>
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
    const [showAdGen, setShowAdGen] = useState(false);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [showGallery, setShowGallery] = useState(false);


    const navigate = useNavigate();
    const prop = state.properties.find(p => p.id === id);
    const agent = state.profiles.find(p => p.id === prop?.realtor_id);
    
    // Normalize client_ids to always be an array
    let propClientIds = prop?.client_ids || [];
    if (typeof propClientIds === 'string') {
        // Handle Postgres array literal format "{id1,id2}"
        propClientIds = propClientIds.replace(/{|}/g, '').split(',').filter(Boolean);
    }
    const clientIds = propClientIds.length > 0 ? propClientIds : (prop?.client_id ? [prop.client_id] : []);
    
    const clients = state.clients.filter(c => clientIds.includes(c.id));
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
        <div className="page" style={{ background: 'var(--bg)' }}>
            <div className="topbar" style={{ padding: '24px 20px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="card-clickable" onClick={() => navigate('/properties')} style={{ 
                    width: 40, height: 40, borderRadius: 12, border: 'none', background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    color: 'var(--text)'
                }}>
                    <ChevronLeft size={20} />
                </button>
                <span className="topbar-title font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.01em' }}>Объект не найден</span>
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
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button onClick={() => navigate('/properties')} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 17, fontWeight: 300, letterSpacing: '0.01em', color: 'var(--text)' }}>
                        Объект
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 200, letterSpacing: '0.03em', opacity: 0.6 }}>Карточка объекта</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="card-clickable" onClick={() => navigate(`/properties/${id}/edit`)} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                        <Pencil size={20} />
                    </button>
                    <button className="card-clickable" onClick={handleDelete} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash size={20} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '24px 20px 120px' }}>
                {/* Header Card — Premium Open Design */}
                <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.04)', borderRadius: 36, background: 'white' }}>
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
                                    <div className="font-oswald" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>
                                        {formatNumber(prop.price)} <span style={{ fontSize: 16, opacity: 0.6 }}>₽</span>
                                    </div>
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
                                {prop.rooms === 0 ? 'Студия' : `${prop.rooms}-к. кв.`} · {prop.area_total} м² · {prop.floor}/{prop.floors_total} эт.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1px solid var(--border-light)',
                                background: 'white', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => navigate(`/matches?property_id=${id}`)}
                        >
                            <Sparkles size={16} /> Совпадения ({matches.length})
                        </button>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1px solid var(--border-light)',
                                background: 'white', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowAdGen(prev => !prev)}
                        >
                            <Wand2 size={16} /> Объявление
                        </button>
                        <button
                            className="card-clickable"
                            style={{ 
                                height: 48, borderRadius: 14, border: '1px solid var(--border-light)',
                                background: 'white', color: 'var(--text)', fontWeight: 400, fontSize: 15,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                fontFamily: "'Oswald', sans-serif"
                            }}
                            onClick={() => setShowBannerGen(true)}
                        >
                            <ImageIcon size={18} /> Баннер
                        </button>
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
                                        background: 'var(--bg-light)', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 300, flexShrink: 0, letterSpacing: 0.5,
                                    }}>
                                        {initials(c.full_name)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 400 }}>{c.full_name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── О ДОМЕ — Premium Section ── */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={22} />
                        </div>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em' }}>О доме</div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
                        {prop.build_year && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Год постройки</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.build_year}</span>
                            </div>
                        )}
                        {prop.building_type && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Тип дома</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{BUILDING_TYPES[prop.building_type] || prop.building_type}</span>
                            </div>
                        )}
                        {prop.floors_total && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этажность</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floors_total}</span>
                            </div>
                        )}
                        {prop.elevator_type && prop.elevator_type !== 'none' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em' }}>Лифт</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                                    {{ passenger: 'Пассажирский', cargo: 'Грузовой', both: 'Пасс. + Груз.' }[prop.elevator_type] || prop.elevator_type}
                                </span>
                            </div>
                        )}
                        {prop.ceiling_height && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em' }}>Потолки</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{prop.ceiling_height} м</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── О КВАРТИРЕ — Premium Section ── */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Home size={22} />
                        </div>
                        <div className="font-oswald" style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.02em' }}>О квартире</div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Этаж</span>
                            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.floor} из {prop.floors_total || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Общая площадь</span>
                            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_total} м²</span>
                        </div>
                        {prop.area_living > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Жилая</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_living} м²</span>
                            </div>
                        )}
                        {prop.area_kitchen > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Кухня</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{prop.area_kitchen} м²</span>
                            </div>
                        )}
                        {prop.renovation && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Ремонт</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ none: 'Без ремонта', cosmetic: 'Косметический', euro: 'Евро', designer: 'Дизайнерский' }[prop.renovation] || prop.renovation}
                                </span>
                            </div>
                        )}
                        {prop.bathroom && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, letterSpacing: '0.02em' }}>Санузел</span>
                                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>
                                    {{ combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' }[prop.bathroom] || prop.bathroom}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Ad Generator */}
                {showAdGen && <AdGenerator prop={prop} realtorName={state.currentUser?.full_name} initiallyOpen={true} autoGenerate={true} />}

                {/* ИСТОРИЯ — Timeline Style */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
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
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
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
                </div>
            </div>
        );
}

