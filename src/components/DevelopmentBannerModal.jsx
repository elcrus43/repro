import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Home,
  Building2,
  Percent,
  ShieldCheck,
  Phone,
  User,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatNumber, formatPhone } from '../utils/format';
import { useApp } from '../context/AppContext';
import { buildApiUrl } from '../lib/apiConfig';
import {
  getConnectedSocialNetworks,
  getSocialTokenStatus,
  shareBannerToSocial,
  triggerDownload,
  dataUrlToFile,
  buildDevelopmentBannerCaption,
} from '../lib/socialShare';

/* ================================================================
   CONSTANTS & PRESETS
   ================================================================ */

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

const COMPOSITION_MODES = [
  { key: 'grid_hero',   label: 'Сетка + План', hint: 'Сетка из фото ЖК + карточка планировки поверх' },
  { key: 'plan_hero',   label: 'План + Фасад', hint: 'Фокус на планировке + мини-фото ЖК' },
  { key: 'facade_hero', label: 'Фасад + План', hint: 'Фото ЖК на фоне + карточка плана' },
  { key: 'plan_only',   label: 'Только план',  hint: 'Максимум чертежа планировки' },
];

const ACCENT_COLORS = [
  '#0052FF', // Samolet Blue
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald
  '#f97316', // Coral Orange
  '#8b5cf6', // Violet
  '#eab308', // Gold
  '#ef4444', // Red
  '#14b8a6', // Teal
];

const DEFAULT_ADVANTAGES = [
  '0% комиссия для покупателя',
  'Семейная ипотека от 6%',
  'Двор-парк без машин',
  'Подземный паркинг',
  'Закрытая территория 24/7',
  'Школа и детсад рядом',
  'Панорамное остекление',
  'Большая кухня-гостиная',
  'Видовой этаж',
  'Индивидуальное отопление',
  'Trade-in / Обмен старой на новую',
];

/* ================================================================
   HELPERS & MATH
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

function drawImageCover(ctx, img, cx, cy, cw, ch, r = 0) {
  if (!img || !img.width || !img.height || cw <= 0 || ch <= 0) return;
  const ir = img.width / img.height;
  const cr = cw / ch;
  let dw, dh, dx, dy;
  if (ir > cr) {
    dh = ch;
    dw = ch * ir;
    dx = cx + (cw - dw) / 2;
    dy = cy;
  } else {
    dw = cw;
    dh = cw / ir;
    dx = cx;
    dy = cy + (ch - dh) / 2;
  }
  ctx.save();
  ctx.beginPath();
  safeRoundRect(ctx, cx, cy, cw, ch, r);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);

  // Subtle contrast scrim so floating card and text pop out cleanly
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.fillRect(cx, cy, cw, ch);
  ctx.restore();
}

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 82, b: 255 };
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  if (Number.isNaN(num)) return { r: 0, g: 82, b: 255 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Расчет ежемесячного платежа по аннуитетной ипотеке:
 * Базово: Семейная ипотека 6%, первоначальный взнос 20.1%, срок 30 лет.
 */
function calculateMortgagePayment(price, annualRate = 6, downPaymentPercent = 20, years = 30) {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  const loan = p * (1 - downPaymentPercent / 100);
  const monthlyRate = (annualRate / 100) / 12;
  const months = years * 12;
  const factor = (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(loan * factor);
}

/**
 * Авто-обрезка пустых белых полей вокруг чертежа планировки
 */
function cropFloorplanWhitespace(img) {
  if (!img || !img.width || !img.height) return img;
  const maxDim = 1200;
  let sw = img.width;
  let sh = img.height;
  if (sw > maxDim || sh > maxDim) {
    if (sw > sh) {
      sh = Math.round((sh * maxDim) / sw);
      sw = maxDim;
    } else {
      sw = Math.round((sw * maxDim) / sh);
      sh = maxDim;
    }
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

  const corners = [0, (sw - 1) * 4, (sh - 1) * sw * 4, ((sh - 1) * sw + (sw - 1)) * 4];
  let avgBgLum = 0;
  corners.forEach((idx) => {
    avgBgLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  });
  avgBgLum /= 4;

  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
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

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function DevelopmentBannerModal({
  development = {},
  layout = {},
  currentUser,
  onClose,
  onOpenProfile,
}) {
  let appContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    appContext = useApp();
  } catch {
    // fallback
  }
  const state = appContext?.state;
  const effectiveUser = currentUser || state?.currentUser;

  const canvasRef = useRef(null);
  const isMountedRef = useRef(true);
  const imageCacheRef = useRef(new Map());
  const floorplanCacheRef = useRef(new Map());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* ---- Derived initial values ---- */
  const complexName = useMemo(() => {
    return development.name || layout.devName || 'Жилой комплекс';
  }, [development.name, layout.devName]);

  const defaultRoomTitle = useMemo(() => {
    return (
      layout.roomsLabel ||
      layout.name ||
      layout.title ||
      (layout.rooms ? `${layout.rooms}-комнатная квартира` : 'Квартира в новостройке')
    );
  }, [layout]);

  const defaultArea = useMemo(() => {
    return layout.area ? String(layout.area) : '';
  }, [layout.area]);

  const defaultPrice = useMemo(() => {
    return layout.minPrice || layout.price_from || layout.price || 0;
  }, [layout]);

  const defaultPriceSqm = useMemo(() => {
    if (layout.minPriceSqm || layout.price_sqm) {
      return layout.minPriceSqm || layout.price_sqm;
    }
    if (defaultPrice && defaultArea && parseFloat(defaultArea) > 0) {
      return Math.round(defaultPrice / parseFloat(defaultArea));
    }
    return 0;
  }, [layout, defaultPrice, defaultArea]);

  const defaultLocation = useMemo(() => {
    if (development.district && development.address) {
      return `${development.district}, ${development.address}`;
    }
    return development.district || development.address || layout.address || '';
  }, [development, layout.address]);

  const defaultPhone = useMemo(() => {
    const raw =
      effectiveUser?.phone ||
      effectiveUser?.phone_number ||
      state?.currentUser?.phone ||
      '';
    return raw ? formatPhone(raw) || raw : '';
  }, [effectiveUser, state]);

  const defaultAgentName = useMemo(() => {
    const name = effectiveUser?.full_name || state?.currentUser?.full_name || '';
    const clean = name.trim();
    if (!clean || clean.length <= 1 || clean.toLowerCase() === 'admin' || clean.toLowerCase() === 'я') {
      return '';
    }
    return clean.split(' ').slice(0, 2).join(' ');
  }, [effectiveUser, state]);

  const defaultPlanImageUrl = useMemo(() => {
    const candidate =
      layout.planImage ||
      layout.plan_image ||
      layout.planUrl ||
      layout.plan_url ||
      layout.image ||
      layout.imageUrl ||
      layout.image_url ||
      layout.plan ||
      layout.layout_image ||
      layout.schema_image ||
      layout.representativeLot?.plan_image ||
      layout.representativeLot?.planImage ||
      layout.representativeLot?.image ||
      null;

    if (!candidate) return null;
    const trimmed = String(candidate).trim();
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/') && !trimmed.startsWith('/api/')) {
      const devDomain =
        development.builder_url ||
        (development.developer?.toLowerCase().includes('ксм') ? 'https://ksm-kirov.ru' : null);
      if (devDomain) {
        return `${devDomain.replace(/\/$/, '')}${trimmed}`;
      }
    }
    return trimmed;
  }, [layout, development]);

  const [customPlanUrl, setCustomPlanUrl]     = React.useState(null);
  const planImageUrl                          = customPlanUrl || defaultPlanImageUrl;
  const planFileInputRef                      = useRef(null);

  const handlePlanUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomPlanUrl(url);
    if (planFileInputRef.current) {
      planFileInputRef.current.value = '';
    }
  };

  const handleResetPlan = () => {
    setCustomPlanUrl(null);
  };

  const allDevImages = useMemo(() => {
    const list = [];
    if (Array.isArray(development.images)) {
      development.images.forEach((img) => {
        if (img && !list.includes(img)) list.push(img);
      });
    } else if (development.image) {
      list.push(development.image);
    }
    if (Array.isArray(layout.dev?.images)) {
      layout.dev.images.forEach((img) => {
        if (img && !list.includes(img)) list.push(img);
      });
    } else if (layout.dev?.image && !list.includes(layout.dev.image)) {
      list.push(layout.dev.image);
    }
    return list;
  }, [development, layout.dev]);

  const [customDevImages, setCustomDevImages]       = React.useState([]);
  const combinedDevImages = useMemo(() => {
    return Array.from(new Set([...customDevImages, ...allDevImages]));
  }, [customDevImages, allDevImages]);

  const [selectedGridImages, setSelectedGridImages] = React.useState(() => {
    return allDevImages.slice(0, 4);
  });

  useEffect(() => {
    if (selectedGridImages.length === 0 && combinedDevImages.length > 0) {
      setSelectedGridImages(combinedDevImages.slice(0, 4));
    }
  }, [combinedDevImages, selectedGridImages.length]);

  const toggleGridImage = (imgUrl) => {
    setSelectedGridImages((prev) => {
      if (prev.includes(imgUrl)) {
        if (prev.length <= 1) return prev;
        return prev.filter((u) => u !== imgUrl);
      }
      if (prev.length >= 4) {
        return [...prev.slice(0, 3), imgUrl];
      }
      return [...prev, imgUrl];
    });
  };

  const devImageFileInputRef = useRef(null);

  const handleDevImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setCustomDevImages((prev) => [...newUrls, ...prev]);
    setSelectedGridImages((prev) => {
      const merged = Array.from(new Set([...newUrls, ...prev]));
      return merged.slice(0, 4);
    });
    if (devImageFileInputRef.current) {
      devImageFileInputRef.current.value = '';
    }
  };

  const facadeImageUrl = useMemo(() => {
    return selectedGridImages[0] || combinedDevImages[0] || null;
  }, [selectedGridImages, combinedDevImages]);

  /* ---- State ---- */
  const [format, setFormat]                   = React.useState('story');
  const [designTheme, setDesignTheme]         = React.useState('dark');
  const [composition, setComposition]         = React.useState('grid_hero');
  const [accentColor, setAccentColor]         = React.useState('#0052FF');

  const [devTitle, setDevTitle]               = React.useState(complexName);
  const [roomTitle, setRoomTitle]             = React.useState(defaultRoomTitle);
  const [areaText, setAreaText]               = React.useState(defaultArea);
  const [priceVal, setPriceVal]               = React.useState(defaultPrice);
  const [priceSqmVal, setPriceSqmVal]         = React.useState(defaultPriceSqm);
  const [locationText, setLocationText]       = React.useState(defaultLocation);
  const [phone, setPhone]                     = React.useState(defaultPhone);
  const [agentName, setAgentName]             = React.useState(defaultAgentName);
  const [agencySubtitle, setAgencySubtitle]   = React.useState('Эксперт по новостройкам');

  const [showAddress, setShowAddress]         = React.useState(true);

  const initialShowPriceFrom = useMemo(() => {
    if (layout.flat_number || layout.flatNumber) return false;
    if (layout.count === 1) return false;
    if (layout.id && !layout.count && !layout.minPrice) return false;
    return true;
  }, [layout]);
  const [showPriceFrom, setShowPriceFrom]     = React.useState(initialShowPriceFrom);

  const [showMortgage, setShowMortgage]       = React.useState(true);
  const [mortgageRate, setMortgageRate]       = React.useState(6);
  const [mortgagePayment, setMortgagePayment] = React.useState(() =>
    calculateMortgagePayment(defaultPrice, 6)
  );

  // Recalculate mortgage payment on price/rate changes
  React.useEffect(() => {
    setMortgagePayment(calculateMortgagePayment(priceVal, mortgageRate));
  }, [priceVal, mortgageRate]);

  // Initial advantages badges
  const [selectedAdvantages, setSelectedAdvantages] = React.useState(() => {
    const list = ['0% комиссия для покупателя', 'Семейная ипотека от 6%'];
    if (development.completion_date) {
      list.push(`Срок сдачи: ${development.completion_date}`);
    }
    if (layout.finishing || development.finishing) {
      list.push(layout.finishing || development.finishing);
    }
    return list;
  });

  const [customAdvantageText, setCustomAdvantageText] = React.useState('');
  const [copyFeedback, setCopyFeedback]               = React.useState(false);
  const [copyPostFeedback, setCopyPostFeedback]       = React.useState(false);
  const [isGenerating, setIsGenerating]               = React.useState(false);

  // Collapsible control sections
  const [openSections, setOpenSections] = React.useState({
    format: true,
    theme: true,
    composition: true,
    plan: true,
    photos: true,
    data: true,
    mortgage: true,
    advantages: true,
    agent: true,
    share: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---- Image Loader with CORS Safe Handling & Proxy Fallback ---- */
  const loadImageSafe = React.useCallback(async (src) => {
    if (!src) return null;
    if (imageCacheRef.current.has(src)) return imageCacheRef.current.get(src);

    const loadDirect = (url, withCors = true) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        if (withCors && !url.startsWith('data:') && !url.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
      });
    };

    // 1. Direct load with crossOrigin='anonymous'
    try {
      const img = await loadDirect(src, true);
      imageCacheRef.current.set(src, img);
      return img;
    } catch {
      // Direct anonymous CORS load failed
    }

    // 2. Proxied load via /api/image-proxy for external http/https
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const proxyUrl = buildApiUrl(`/api/image-proxy?url=${encodeURIComponent(src)}`);
        const img = await loadDirect(proxyUrl, true);
        imageCacheRef.current.set(src, img);
        return img;
      } catch {
        // Proxy failed
      }
    }

    // 3. Fallback direct without crossOrigin so it still draws on canvas
    try {
      const img = await loadDirect(src, false);
      imageCacheRef.current.set(src, img);
      return img;
    } catch {
      return null;
    }
  }, []);

  /* ================================================================
     CANVAS DRAWING ENGINE
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
    const U = w / 1080;

    setIsGenerating(true);

    try {
      const [loadedPlan, loadedFacade, ...loadedGrid] = await Promise.all([
        planImageUrl ? loadImageSafe(planImageUrl) : Promise.resolve(null),
        facadeImageUrl ? loadImageSafe(facadeImageUrl) : Promise.resolve(null),
        ...selectedGridImages.map((src) => (src ? loadImageSafe(src) : Promise.resolve(null))),
      ]);
      const validGridImages = loadedGrid.filter(Boolean);

      if (!isMountedRef.current) return;

      // Crop whitespace from CAD floorplan
      let cleanPlan = null;
      if (loadedPlan) {
        cleanPlan = floorplanCacheRef.current.get(planImageUrl);
        if (!cleanPlan) {
          cleanPlan = cropFloorplanWhitespace(loadedPlan);
          if (cleanPlan) floorplanCacheRef.current.set(planImageUrl, cleanPlan);
        }
      }

      /* -------------------------------------------------------------
         1. BACKGROUND FILL
         ------------------------------------------------------------- */
      if (composition === 'facade_hero' && loadedFacade) {
        // Full bleed facade image with overlay
        const fr = loadedFacade.width / loadedFacade.height;
        const cr = w / h;
        let dw, dh, dx, dy;
        if (fr > cr) {
          dh = h;
          dw = h * fr;
          dx = (w - dw) / 2;
          dy = 0;
        } else {
          dw = w;
          dh = w / fr;
          dx = 0;
          dy = (h - dh) / 2;
        }
        ctx.drawImage(loadedFacade, dx, dy, dw, dh);

        // Soft dark or light scrim for readability
        ctx.fillStyle = isLight ? 'rgba(248, 250, 252, 0.40)' : 'rgba(10, 15, 26, 0.50)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Luxurious background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        if (isLight) {
          bgGrad.addColorStop(0, '#FFFFFF');
          bgGrad.addColorStop(0.5, '#F1F5F9');
          bgGrad.addColorStop(1, '#E2E8F0');
        } else if (isBrand) {
          const rgb = hexToRgb(accentColor);
          bgGrad.addColorStop(0, `rgb(${Math.round(rgb.r * 0.2)}, ${Math.round(rgb.g * 0.2)}, ${Math.round(rgb.b * 0.3)})`);
          bgGrad.addColorStop(0.6, '#0B1120');
          bgGrad.addColorStop(1, '#050811');
        } else if (isGlass) {
          bgGrad.addColorStop(0, '#1E293B');
          bgGrad.addColorStop(0.5, '#0F172A');
          bgGrad.addColorStop(1, '#020617');
        } else {
          // Dark Luxury Slate
          bgGrad.addColorStop(0, '#0F172A');
          bgGrad.addColorStop(0.4, '#0B1120');
          bgGrad.addColorStop(1, '#030712');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Subtle geometric ambient glow
        ctx.save();
        const rgb = hexToRgb(accentColor);
        const glowGrad = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, w * 0.7);
        glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLight ? 0.12 : 0.25})`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      /* -------------------------------------------------------------
         2. TOP HEADER: COMPLEX NAME & BADGES
         ------------------------------------------------------------- */
      const PAD = Math.round((IS ? 52 : (isPortrait ? 44 : 36)) * U);
      let curY = PAD;

      // Complex Name / Brand header
      ctx.save();
      const topBadgeH = Math.round((IS ? 48 : 42) * U);
      const topBadgeText = 'НОВОСТРОЙКА · ПРЯМЫЕ ЦЕНЫ';
      ctx.font = `600 ${Math.round((IS ? 20 : 18) * U)}px system-ui, -apple-system, sans-serif`;
      const tbw = ctx.measureText(topBadgeText).width + Math.round(32 * U);

      ctx.fillStyle = isLight ? 'rgba(0, 82, 255, 0.12)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      safeRoundRect(ctx, PAD, curY, tbw, topBadgeH, topBadgeH / 2);
      ctx.fill();

      ctx.fillStyle = isLight ? accentColor : '#60A5FA';
      ctx.textBaseline = 'middle';
      ctx.fillText(topBadgeText, PAD + Math.round(16 * U), curY + topBadgeH / 2);
      ctx.restore();

      curY += topBadgeH + Math.round(16 * U);

      // Residential Complex Title (NO DEVELOPER!)
      ctx.save();
      ctx.font = `800 ${Math.round((IS ? 56 : (isPortrait ? 48 : 42)) * U)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
      ctx.textBaseline = 'top';
      ctx.shadowColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(8 * U);
      ctx.fillText(devTitle, PAD, curY);
      ctx.restore();

      curY += Math.round((IS ? 62 : 52) * U);

      // Location / Address line (Only if showAddress is enabled)
      if (showAddress && locationText) {
        ctx.save();
        ctx.font = `500 ${Math.round((IS ? 28 : 24) * U)}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isLight ? '#475569' : '#94A3B8';
        ctx.textBaseline = 'top';
        ctx.fillText(locationText, PAD, curY);
        ctx.restore();
        curY += Math.round((IS ? 38 : 32) * U);
      }

      /* -------------------------------------------------------------
         3. HERO VISUAL AREA (FLOOR PLAN & FACADE)
         ------------------------------------------------------------- */
      const bottomAreaH = Math.round((IS ? 700 : (isPortrait ? 580 : 490)) * U);
      const visualAreaTop = curY + Math.round(16 * U);
      const visualAreaH = h - bottomAreaH - visualAreaTop;
      const visualAreaW = w - PAD * 2;

      if (composition === 'grid_hero') {
        // Grid Hero: Collage / Grid of complex photos + floating CAD layout card on top
        const gap = Math.round(10 * U);
        const gridRadius = Math.round(20 * U);
        const k = validGridImages.length;

        if (k > 0) {
          if (k === 1) {
            drawImageCover(ctx, validGridImages[0], PAD, visualAreaTop, visualAreaW, visualAreaH, gridRadius);
          } else if (k === 2) {
            if (IS) {
              const cellH = Math.round((visualAreaH - gap) / 2);
              drawImageCover(ctx, validGridImages[0], PAD, visualAreaTop, visualAreaW, cellH, gridRadius);
              drawImageCover(ctx, validGridImages[1], PAD, visualAreaTop + cellH + gap, visualAreaW, cellH, gridRadius);
            } else {
              const cellW = Math.round((visualAreaW - gap) / 2);
              drawImageCover(ctx, validGridImages[0], PAD, visualAreaTop, cellW, visualAreaH, gridRadius);
              drawImageCover(ctx, validGridImages[1], PAD + cellW + gap, visualAreaTop, cellW, visualAreaH, gridRadius);
            }
          } else if (k === 3) {
            const topH = Math.round(visualAreaH * 0.52);
            const btmH = visualAreaH - topH - gap;
            const btmW = Math.round((visualAreaW - gap) / 2);
            drawImageCover(ctx, validGridImages[0], PAD, visualAreaTop, visualAreaW, topH, gridRadius);
            drawImageCover(ctx, validGridImages[1], PAD, visualAreaTop + topH + gap, btmW, btmH, gridRadius);
            drawImageCover(ctx, validGridImages[2], PAD + btmW + gap, visualAreaTop + topH + gap, btmW, btmH, gridRadius);
          } else {
            const cellW = Math.round((visualAreaW - gap) / 2);
            const cellH = Math.round((visualAreaH - gap) / 2);
            drawImageCover(ctx, validGridImages[0], PAD, visualAreaTop, cellW, cellH, gridRadius);
            drawImageCover(ctx, validGridImages[1], PAD + cellW + gap, visualAreaTop, cellW, cellH, gridRadius);
            drawImageCover(ctx, validGridImages[2], PAD, visualAreaTop + cellH + gap, cellW, cellH, gridRadius);
            drawImageCover(ctx, validGridImages[3], PAD + cellW + gap, visualAreaTop + cellH + gap, cellW, cellH, gridRadius);
          }
        }

        // --- FLOATING FLOOR PLAN CARD ON TOP ---
        const cardW = Math.round(IS ? visualAreaW * 0.88 : visualAreaW * 0.74);
        const cardH = Math.round(IS ? visualAreaH * 0.62 : visualAreaH * 0.76);
        const cardX = PAD + Math.round((visualAreaW - cardW) / 2);
        const cardY = visualAreaTop + Math.round((visualAreaH - cardH) / 2);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
        ctx.shadowBlur = Math.round(34 * U);
        ctx.shadowOffsetY = Math.round(12 * U);

        ctx.fillStyle = isGlass ? 'rgba(255, 255, 255, 0.96)' : '#FFFFFF';
        ctx.beginPath();
        safeRoundRect(ctx, cardX, cardY, cardW, cardH, Math.round(22 * U));
        ctx.fill();

        ctx.strokeStyle = isGlass ? 'rgba(255, 255, 255, 0.95)' : 'rgba(226, 232, 240, 0.9)';
        ctx.lineWidth = Math.round(2 * U);
        ctx.stroke();
        ctx.restore();

        // Top Chip on Floorplan Card
        const chipText = 'ПЛАНИРОВКА КВАРТИРЫ';
        ctx.save();
        ctx.font = `700 ${Math.round(14 * U)}px system-ui, sans-serif`;
        const ctw = ctx.measureText(chipText).width + Math.round(24 * U);
        const chipH = Math.round(28 * U);
        const chipX = cardX + Math.round(14 * U);
        const chipY = cardY + Math.round(14 * U);

        ctx.fillStyle = isLight ? 'rgba(0, 82, 255, 0.12)' : 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        safeRoundRect(ctx, chipX, chipY, ctw, chipH, chipH / 2);
        ctx.fill();

        ctx.fillStyle = isLight ? accentColor : '#60A5FA';
        ctx.textBaseline = 'middle';
        ctx.fillText(chipText, chipX + Math.round(12 * U), chipY + chipH / 2);
        ctx.restore();

        // Draw CAD Floorplan inside card
        if (cleanPlan) {
          const innerPad = Math.round(18 * U);
          const innerTop = chipY + chipH + Math.round(8 * U);
          const innerX = cardX + innerPad;
          const innerY = innerTop;
          const innerW = cardW - innerPad * 2;
          const innerH = cardY + cardH - innerTop - innerPad;

          const pr = (cleanPlan.width || 1) / (cleanPlan.height || 1);
          const cr = innerW / innerH;
          let dw, dh, dx, dy;
          if (pr > cr) {
            dw = innerW;
            dh = innerW / pr;
            dx = innerX;
            dy = innerY + (innerH - dh) / 2;
          } else {
            dh = innerH;
            dw = innerH * pr;
            dx = innerX + (innerW - dw) / 2;
            dy = innerY;
          }

          ctx.save();
          ctx.beginPath();
          safeRoundRect(ctx, innerX, innerY, innerW, innerH, Math.round(14 * U));
          ctx.clip();
          ctx.drawImage(cleanPlan, dx, dy, dw, dh);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = '#64748B';
          ctx.font = `500 ${Math.round(26 * U)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Планировка квартиры', cardX + cardW / 2, cardY + cardH / 2);
          ctx.restore();
        }
      } else if (composition === 'plan_hero' || composition === 'plan_only') {
        // Plan Hero: Big white contrast card with the CAD floorplan
        const planCardPad = Math.round(20 * U);
        const planCardX = PAD;
        const planCardY = visualAreaTop;
        const planCardW = visualAreaW;
        const planCardH = visualAreaH;

        // Card shadow & background
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = Math.round(28 * U);
        ctx.shadowOffsetY = Math.round(10 * U);

        // Always pure white or frosted white background for CAD lines readability
        ctx.fillStyle = isGlass ? 'rgba(255, 255, 255, 0.96)' : '#FFFFFF';
        ctx.beginPath();
        safeRoundRect(ctx, planCardX, planCardY, planCardW, planCardH, Math.round(24 * U));
        ctx.fill();

        if (isGlass) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = Math.round(2 * U);
          ctx.stroke();
        }
        ctx.restore();

        // Draw CAD Floorplan inside card with clean margins
        if (cleanPlan) {
          const innerX = planCardX + planCardPad;
          const innerY = planCardY + planCardPad;
          const innerW = planCardW - planCardPad * 2;
          const innerH = planCardH - planCardPad * 2;

          const pr = (cleanPlan.width || 1) / (cleanPlan.height || 1);
          const cr = innerW / innerH;
          let dw, dh, dx, dy;
          if (pr > cr) {
            dw = innerW;
            dh = innerW / pr;
            dx = innerX;
            dy = innerY + (innerH - dh) / 2;
          } else {
            dh = innerH;
            dw = innerH * pr;
            dx = innerX + (innerW - dw) / 2;
            dy = innerY;
          }

          ctx.save();
          ctx.beginPath();
          safeRoundRect(ctx, innerX, innerY, innerW, innerH, Math.round(16 * U));
          ctx.clip();
          ctx.drawImage(cleanPlan, dx, dy, dw, dh);
          ctx.restore();
        } else {
          // Placeholder icon if plan is missing
          ctx.save();
          ctx.fillStyle = '#64748B';
          ctx.font = `500 ${Math.round(28 * U)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Планировка квартиры', planCardX + planCardW / 2, planCardY + planCardH / 2);
          ctx.restore();
        }

        // Mini Facade chip in the top right corner if plan_hero and facade image exists
        if (composition === 'plan_hero' && loadedFacade) {
          const chipW = Math.round((IS ? 280 : 230) * U);
          const chipH = Math.round((IS ? 180 : 150) * U);
          const chipX = planCardX + planCardW - chipW - Math.round(16 * U);
          const chipY = planCardY + Math.round(16 * U);

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = Math.round(16 * U);
          ctx.shadowOffsetY = Math.round(6 * U);

          ctx.beginPath();
          safeRoundRect(ctx, chipX, chipY, chipW, chipH, Math.round(16 * U));
          ctx.clip();

          // Draw facade
          const fr = loadedFacade.width / loadedFacade.height;
          const cr = chipW / chipH;
          let fdw, fdh, fdx, fdy;
          if (fr > cr) {
            fdh = chipH;
            fdw = chipH * fr;
            fdx = chipX + (chipW - fdw) / 2;
            fdy = chipY;
          } else {
            fdw = chipW;
            fdh = chipW / fr;
            fdx = chipX;
            fdy = chipY + (chipH - fdh) / 2;
          }
          ctx.drawImage(loadedFacade, fdx, fdy, fdw, fdh);

          // Subtle label over facade chip
          ctx.fillStyle = 'rgba(15, 23, 42, 0.70)';
          ctx.fillRect(chipX, chipY + chipH - Math.round(32 * U), chipW, Math.round(32 * U));
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `600 ${Math.round(16 * U)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Архитектура ЖК', chipX + chipW / 2, chipY + chipH - Math.round(16 * U));
          ctx.restore();
        }
      } else if (composition === 'facade_hero') {
        // Facade Hero: Plan is displayed in a floating white card on the right
        const cardSize = Math.round((IS ? 440 : 380) * U);
        const cardX = w - PAD - cardSize;
        const cardY = visualAreaTop + Math.round(30 * U);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
        ctx.shadowBlur = Math.round(24 * U);
        ctx.shadowOffsetY = Math.round(8 * U);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        safeRoundRect(ctx, cardX, cardY, cardSize, cardSize, Math.round(20 * U));
        ctx.fill();
        ctx.restore();

        if (cleanPlan) {
          const pad = Math.round(16 * U);
          const pr = (cleanPlan.width || 1) / (cleanPlan.height || 1);
          const inner = cardSize - pad * 2;
          let dw, dh, dx, dy;
          if (pr > 1) {
            dw = inner;
            dh = inner / pr;
            dx = cardX + pad;
            dy = cardY + pad + (inner - dh) / 2;
          } else {
            dh = inner;
            dw = inner * pr;
            dx = cardX + pad + (inner - dw) / 2;
            dy = cardY + pad;
          }
          ctx.save();
          ctx.beginPath();
          safeRoundRect(ctx, cardX + pad, cardY + pad, inner, inner, Math.round(14 * U));
          ctx.clip();
          ctx.drawImage(cleanPlan, dx, dy, dw, dh);
          ctx.restore();
        }
      }

      /* -------------------------------------------------------------
         4. BOTTOM SECTION: SPECS, PRICING, MORTGAGE & ADVANTAGES
         ------------------------------------------------------------- */
      const btmY = h - bottomAreaH;

      // Bottom Gradient Scrim
      ctx.save();
      const btmGrad = ctx.createLinearGradient(0, btmY - Math.round(60 * U), 0, h);
      if (isLight) {
        btmGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        btmGrad.addColorStop(0.2, 'rgba(241, 245, 249, 0.85)');
        btmGrad.addColorStop(0.5, 'rgba(241, 245, 249, 0.98)');
        btmGrad.addColorStop(1, '#F1F5F9');
      } else {
        btmGrad.addColorStop(0, 'rgba(11, 17, 32, 0)');
        btmGrad.addColorStop(0.2, 'rgba(11, 17, 32, 0.88)');
        btmGrad.addColorStop(0.5, 'rgba(11, 17, 32, 0.98)');
        btmGrad.addColorStop(1, '#0B1120');
      }
      ctx.fillStyle = btmGrad;
      ctx.fillRect(0, btmY - Math.round(60 * U), w, bottomAreaH + Math.round(60 * U));
      ctx.restore();

      let infoY = btmY + Math.round(10 * U);

      // Room Title + Area badge
      ctx.save();
      const titleText = `${roomTitle}${areaText ? ` · ${areaText} м²` : ''}`;
      ctx.font = `800 ${Math.round((IS ? 44 : (isPortrait ? 38 : 34)) * U)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
      ctx.textBaseline = 'top';
      ctx.fillText(titleText, PAD, infoY);
      ctx.restore();

      infoY += Math.round((IS ? 52 : 44) * U);

      // Price from / Price exact + Price per sqm
      ctx.save();
      const pricePrefix = showPriceFrom ? 'от ' : '';
      const priceText = priceVal ? `${pricePrefix}${formatNumber(priceVal)} ₽` : 'Цена по запросу';
      ctx.font = `900 ${Math.round((IS ? 72 : (isPortrait ? 60 : 52)) * U)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isLight ? '#0052FF' : '#38BDF8';
      ctx.textBaseline = 'top';
      ctx.fillText(priceText, PAD, infoY);

      if (priceSqmVal) {
        const pw = ctx.measureText(priceText).width;
        ctx.font = `600 ${Math.round((IS ? 32 : (isPortrait ? 26 : 24)) * U)}px system-ui, sans-serif`;
        ctx.fillStyle = isLight ? '#64748B' : '#94A3B8';
        ctx.fillText(` ${pricePrefix}${formatNumber(priceSqmVal)} ₽/м²`, PAD + pw + Math.round(24 * U), infoY + Math.round((IS ? 34 : 24) * U));
      }
      ctx.restore();

      infoY += Math.round((IS ? 86 : 72) * U);

      // Mortgage Badge: Family mortgage / monthly payment
      if (showMortgage && mortgagePayment > 0) {
        ctx.save();
        const mortH = Math.round((IS ? 64 : 54) * U);
        const mortText = `Семейная ипотека ${mortgageRate}% - платеж ${showPriceFrom ? 'от ' : ''}${formatNumber(mortgagePayment)} ₽/мес`;
        ctx.font = `700 ${Math.round((IS ? 26 : 22) * U)}px system-ui, -apple-system, sans-serif`;
        const mw = ctx.measureText(mortText).width + Math.round(48 * U);

        // Gradient badge background
        const mortGrad = ctx.createLinearGradient(PAD, infoY, PAD + mw, infoY + mortH);
        mortGrad.addColorStop(0, '#10B981');
        mortGrad.addColorStop(1, '#059669');
        ctx.fillStyle = mortGrad;

        ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
        ctx.shadowBlur = Math.round(14 * U);
        ctx.shadowOffsetY = Math.round(4 * U);

        ctx.beginPath();
        safeRoundRect(ctx, PAD, infoY, Math.min(mw, w - PAD * 2), mortH, Math.round(14 * U));
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(mortText, PAD + Math.round(24 * U), infoY + mortH / 2);
        ctx.restore();

        infoY += mortH + Math.round(20 * U);
      }

      // Feature / Advantage Badges (Pills)
      if (selectedAdvantages.length > 0) {
        ctx.save();
        let pillX = PAD;
        const pillH = Math.round((IS ? 44 : 36) * U);
        const maxPillY = infoY + pillH * 2 + Math.round(16 * U);

        ctx.font = `600 ${Math.round((IS ? 20 : 17) * U)}px system-ui, sans-serif`;

        for (const adv of selectedAdvantages.slice(0, 4)) {
          const tw = ctx.measureText(adv).width;
          const pw = tw + Math.round(28 * U);

          if (pillX + pw > w - PAD) {
            pillX = PAD;
            infoY += pillH + Math.round(12 * U);
            if (infoY > maxPillY) break;
          }

          ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.10)';
          ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = Math.round(1.5 * U);

          ctx.beginPath();
          safeRoundRect(ctx, pillX, infoY, pw, pillH, pillH / 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isLight ? '#1E293B' : '#F1F5F9';
          ctx.textBaseline = 'middle';
          ctx.fillText(adv, pillX + Math.round(14 * U), infoY + pillH / 2);

          pillX += pw + Math.round(12 * U);
        }
        ctx.restore();
      }

      /* -------------------------------------------------------------
         5. REALTOR CONTACT FOOTER BAR (NO DEVELOPER SIGNATURE!)
         ------------------------------------------------------------- */
      const footerH = Math.round((IS ? 110 : 96) * U);
      const footerY = h - footerH - Math.round(24 * U);

      ctx.save();
      // Frosted card container
      ctx.fillStyle = isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.88)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = Math.round(20 * U);
      ctx.shadowOffsetY = Math.round(4 * U);

      ctx.beginPath();
      safeRoundRect(ctx, PAD, footerY, w - PAD * 2, footerH, Math.round(18 * U));
      ctx.fill();

      ctx.strokeStyle = isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = Math.round(1.5 * U);
      ctx.stroke();
      ctx.restore();

      // Agent Info Left Side
      ctx.save();
      ctx.textBaseline = 'middle';

      const agentTitle = agentName || 'Ваш риелтор';
      ctx.font = `800 ${Math.round((IS ? 32 : 26) * U)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
      ctx.fillText(agentTitle, PAD + Math.round(28 * U), footerY + Math.round(34 * U));

      ctx.font = `500 ${Math.round((IS ? 22 : 18) * U)}px system-ui, sans-serif`;
      ctx.fillStyle = isLight ? '#64748B' : '#94A3B8';
      ctx.fillText(agencySubtitle || 'Эксперт по новостройкам', PAD + Math.round(28 * U), footerY + Math.round(72 * U));
      ctx.restore();

      // Phone Right Side
      if (phone) {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${Math.round((IS ? 34 : 28) * U)}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isLight ? '#0052FF' : '#38BDF8';
        ctx.fillText(phone, w - PAD - Math.round(28 * U), footerY + Math.round(36 * U));

        ctx.font = `600 ${Math.round((IS ? 20 : 16) * U)}px system-ui, sans-serif`;
        ctx.fillStyle = '#10B981';
        ctx.fillText('0% комиссия · Звоните', w - PAD - Math.round(28 * U), footerY + Math.round(72 * U));
        ctx.restore();
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [
    format,
    designTheme,
    composition,
    accentColor,
    devTitle,
    roomTitle,
    areaText,
    priceVal,
    priceSqmVal,
    locationText,
    showAddress,
    showPriceFrom,
    phone,
    agentName,
    agencySubtitle,
    showMortgage,
    mortgageRate,
    mortgagePayment,
    selectedAdvantages,
    planImageUrl,
    facadeImageUrl,
    selectedGridImages,
    loadImageSafe,
  ]);

  // Trigger draw on configuration changes
  React.useEffect(() => {
    draw();
  }, [draw]);

  /* ================================================================
     EXPORT & SHARE ACTIONS
     ================================================================ */
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      const safeTitle = (devTitle || 'novostroyka').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
      triggerDownload(url, `banner_${safeTitle}_${format}.png`);
    } catch (err) {
      console.warn('Canvas export tainted or failed:', err);
      alert('Не удалось экспортировать изображение из-за ограничений безопасности браузера на внешний файл. Загрузите файл планировки с вашего устройства через кнопку «Загрузить свой чертеж».');
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2000);
          return;
        }
      }
      handleDownload();
    } catch {
      handleDownload();
    }
  };

  const handleCopyPostText = () => {
    const caption = buildDevelopmentBannerCaption({
      dev: {
        name: devTitle,
        address: locationText,
        completion_date: development.completion_date,
        finishing: development.finishing,
      },
      layout: {
        roomsLabel: roomTitle,
        area: areaText,
        minPrice: priceVal,
        minPriceSqm: priceSqmVal,
        finishing: layout.finishing,
      },
      phone,
      agentName,
      stickers: selectedAdvantages,
      showPriceFrom,
      showAddress,
    });
    navigator.clipboard.writeText(caption);
    setCopyPostFeedback(true);
    setTimeout(() => setCopyPostFeedback(false), 2000);
  };

  const handleShareSocial = async (networkId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const file = dataUrlToFile(dataUrl, `banner_${devTitle}_${format}.png`);
      const caption = buildDevelopmentBannerCaption({
        dev: {
          name: devTitle,
          address: locationText,
          completion_date: development.completion_date,
          finishing: development.finishing,
        },
        layout: {
          roomsLabel: roomTitle,
          area: areaText,
          minPrice: priceVal,
          minPriceSqm: priceSqmVal,
          finishing: layout.finishing,
        },
        phone,
        agentName,
        stickers: selectedAdvantages,
        showPriceFrom,
        showAddress,
      });

      const netObj = { id: networkId, account: { publishMode: 'share' } };
      await shareBannerToSocial({
        network: netObj,
        canvasDataUrl: dataUrl,
        file,
        caption,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const toggleAdvantage = (adv) => {
    setSelectedAdvantages((prev) =>
      prev.includes(adv) ? prev.filter((a) => a !== adv) : [...prev, adv]
    );
  };

  const handleAddCustomAdvantage = (e) => {
    e.preventDefault();
    const clean = customAdvantageText.trim();
    if (!clean) return;
    if (!selectedAdvantages.includes(clean)) {
      setSelectedAdvantages((prev) => [...prev, clean]);
    }
    setCustomAdvantageText('');
  };

  return (
    <div className="dev-banner-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dev-banner-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="dev-banner-header">
          <div className="dev-banner-header-info">
            <div className="dev-banner-badge">
              <Sparkles size={14} />
              <span>Генератор баннера новостройки</span>
            </div>
            <h2 className="dev-banner-title">
              {devTitle} · {roomTitle}
            </h2>
            <p className="dev-banner-subtitle">
              Рекламный баннер конкретной планировки для соцсетей, Сторис и мессенджеров (без упоминания застройщика)
            </p>
          </div>
          <button
            type="button"
            className="dev-banner-close-btn"
            onClick={onClose}
            aria-label="Закрыть генератор"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Left Canvas, Right Controls */}
        <div className="dev-banner-body">
          {/* Canvas Preview Column */}
          <div className="dev-banner-preview-pane">
            <div className={`dev-banner-canvas-wrap aspect-${format}`}>
              <canvas ref={canvasRef} className="dev-banner-canvas" />
              {isGenerating && (
                <div className="dev-banner-generating-loader">
                  <div className="dev-banner-spinner" />
                  <span>Формирование баннера...</span>
                </div>
              )}
            </div>

            {/* Quick Actions under canvas */}
            <div className="dev-banner-quick-actions">
              <button
                type="button"
                className="btn-banner-action primary"
                onClick={handleDownload}
                title="Скачать изображение PNG в высоком разрешении 1080px"
              >
                <Download size={16} />
                <span>Скачать PNG</span>
              </button>

              <button
                type="button"
                className={`btn-banner-action secondary ${copyFeedback ? 'success' : ''}`}
                onClick={handleCopyImage}
                title="Скопировать картинку в буфер обмена"
              >
                {copyFeedback ? <Check size={16} /> : <Copy size={16} />}
                <span>{copyFeedback ? 'Скопировано!' : 'Копировать'}</span>
              </button>

              <button
                type="button"
                className={`btn-banner-action secondary ${copyPostFeedback ? 'success' : ''}`}
                onClick={handleCopyPostText}
                title="Скопировать готовый продающий текст поста для соцсетей"
              >
                {copyPostFeedback ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copyPostFeedback ? 'Текст скопирован!' : 'Текст поста'}</span>
              </button>
            </div>

            {/* Direct Social Share Buttons */}
            <div className="dev-banner-social-row">
              <span className="dev-banner-social-label">Поделиться:</span>
              <button
                type="button"
                className="btn-social-chip tg"
                onClick={() => handleShareSocial('tg')}
                title="Отправить в Telegram"
              >
                Telegram
              </button>
              <button
                type="button"
                className="btn-social-chip wa"
                onClick={() => handleShareSocial('whatsapp')}
                title="Отправить в WhatsApp"
              >
                WhatsApp
              </button>
              <button
                type="button"
                className="btn-social-chip vk"
                onClick={() => handleShareSocial('vk')}
                title="Опубликовать во ВКонтакте"
              >
                ВКонтакте
              </button>
            </div>
          </div>

          {/* Controls Sidebar Column */}
          <div className="dev-banner-sidebar">
            {/* Format Selector */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('format')}
              >
                <span className="dev-banner-sec-title">Формат баннера</span>
                {openSections.format ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.format && (
                <div className="dev-banner-format-tabs">
                  {Object.entries(BANNER_FORMATS).map(([key, f]) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn-format-tab ${format === key ? 'active' : ''}`}
                      onClick={() => setFormat(key)}
                    >
                      <strong>{f.label}</strong>
                      <span className="format-hint">{f.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Design Theme & Composition */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('theme')}
              >
                <span className="dev-banner-sec-title">Тема и композиция</span>
                {openSections.theme ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.theme && (
                <div className="dev-banner-sec-content">
                  <div className="dev-theme-tabs">
                    {DESIGN_THEMES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={`btn-theme-tab ${designTheme === t.key ? 'active' : ''}`}
                        onClick={() => setDesignTheme(t.key)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="dev-composition-tabs">
                    {COMPOSITION_MODES.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className={`btn-comp-tab ${composition === c.key ? 'active' : ''}`}
                        onClick={() => setComposition(c.key)}
                        title={c.hint}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Accent Color Palette */}
                  <div className="dev-color-row">
                    <span className="dev-color-label">Акцент:</span>
                    <div className="dev-color-dots">
                      {ACCENT_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className={`btn-color-dot ${accentColor === hex ? 'active' : ''}`}
                          style={{ backgroundColor: hex }}
                          onClick={() => setAccentColor(hex)}
                          aria-label={`Цвет ${hex}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floorplan CAD Image Section */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('plan')}
              >
                <span className="dev-banner-sec-title">Чертеж планировки</span>
                {openSections.plan ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.plan && (
                <div className="dev-banner-sec-content">
                  <div className="dev-plan-status-row">
                    <div className="dev-plan-thumb-wrap">
                      {planImageUrl ? (
                        <img
                          src={planImageUrl}
                          alt="Чертеж"
                          className="dev-plan-thumb-img"
                        />
                      ) : (
                        <div className="dev-plan-thumb-placeholder">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="dev-plan-status-info">
                      <strong className="dev-plan-status-title">
                        {planImageUrl ? 'Чертеж прикреплен' : 'Чертеж не загружен'}
                      </strong>
                      <span className="dev-plan-status-sub">
                        {customPlanUrl
                          ? 'Загружен локальный файл'
                          : planImageUrl
                          ? 'Взят из каталога новостройки'
                          : 'Отображается плейсхолдер'}
                      </span>
                    </div>
                  </div>

                  <div className="dev-plan-actions-row">
                    <button
                      type="button"
                      className="btn-plan-action primary"
                      onClick={() => planFileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>{planImageUrl ? 'Заменить чертеж' : 'Загрузить чертеж'}</span>
                    </button>
                    {customPlanUrl && (
                      <button
                        type="button"
                        className="btn-plan-action secondary"
                        onClick={handleResetPlan}
                        title="Вернуть исходную планировку из каталога"
                      >
                        <RotateCcw size={13} />
                        <span>Сбросить</span>
                      </button>
                    )}
                    <input
                      ref={planFileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePlanUpload}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Development Photos Grid Section */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('photos')}
              >
                <div className="dev-banner-sec-title-wrap">
                  <span className="dev-banner-sec-title">Фотографии ЖК (сетка)</span>
                  <span className="dev-photo-count-pill">{selectedGridImages.length} из 4</span>
                </div>
                {openSections.photos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.photos && (
                <div className="dev-banner-sec-content">
                  <p className="dev-sec-hint">
                    Выберите от 1 до 4 фото для формирования сетки ЖК на баннере (нажмите на фото для выбора):
                  </p>

                  <div className="dev-photos-picker-grid">
                    {combinedDevImages.map((imgUrl, idx) => {
                      const isSel = selectedGridImages.includes(imgUrl);
                      const selOrder = selectedGridImages.indexOf(imgUrl) + 1;
                      return (
                        <div
                          key={imgUrl + idx}
                          className={`dev-photo-card ${isSel ? 'selected' : ''}`}
                          onClick={() => toggleGridImage(imgUrl)}
                          title={isSel ? 'Нажмите, чтобы исключить из сетки' : 'Нажмите, чтобы добавить в сетку'}
                        >
                          <img src={imgUrl} alt={`Фото ЖК ${idx + 1}`} className="dev-photo-card-img" />
                          <div className={`dev-photo-order-badge ${isSel ? 'active' : ''}`}>
                            {isSel ? selOrder : '+'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="dev-photo-actions-row">
                    <button
                      type="button"
                      className="btn-plan-action primary"
                      onClick={() => devImageFileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>+ Добавить еще фото ЖК</span>
                    </button>
                    <input
                      ref={devImageFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleDevImageUpload}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Layout Specs & Pricing */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('data')}
              >
                <span className="dev-banner-sec-title">Параметры и стоимость</span>
                {openSections.data ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.data && (
                <div className="dev-banner-sec-content">
                  <div className="dev-field-grid">
                    <label className="dev-field-label">
                      <span>Название ЖК</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={devTitle}
                        onChange={(e) => setDevTitle(e.target.value)}
                        placeholder="Например, ЖК Булычев"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Тип планировки</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={roomTitle}
                        onChange={(e) => setRoomTitle(e.target.value)}
                        placeholder="1-комнатная квартира"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Площадь (м²)</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={areaText}
                        onChange={(e) => setAreaText(e.target.value)}
                        placeholder="38.4"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Цена (₽)</span>
                      <input
                        type="number"
                        className="dev-input"
                        value={priceVal || ''}
                        onChange={(e) => setPriceVal(Number(e.target.value) || 0)}
                        placeholder="4500000"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Цена за м² (₽)</span>
                      <input
                        type="number"
                        className="dev-input"
                        value={priceSqmVal || ''}
                        onChange={(e) => setPriceSqmVal(Number(e.target.value) || 0)}
                        placeholder="115000"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Локация / Район</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        placeholder="ЮЗР, ул. Воровского"
                      />
                    </label>
                  </div>

                  {/* Toggle checkboxes for price 'от' and address */}
                  <div className="dev-toggles-box">
                    <label className="dev-checkbox-row">
                      <input
                        type="checkbox"
                        checked={showPriceFrom}
                        onChange={(e) => setShowPriceFrom(e.target.checked)}
                      />
                      <span>Приставка «от» к стоимости (для групп квартир)</span>
                    </label>

                    <label className="dev-checkbox-row">
                      <input
                        type="checkbox"
                        checked={showAddress}
                        onChange={(e) => setShowAddress(e.target.checked)}
                      />
                      <span>Показать адрес на баннере</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Mortgage Calculator Badge */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('mortgage')}
              >
                <span className="dev-banner-sec-title">Ипотечный расчет</span>
                {openSections.mortgage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.mortgage && (
                <div className="dev-banner-sec-content">
                  <label className="dev-checkbox-row">
                    <input
                      type="checkbox"
                      checked={showMortgage}
                      onChange={(e) => setShowMortgage(e.target.checked)}
                    />
                    <span>Показывать блок ипотечного платежа</span>
                  </label>

                  {showMortgage && (
                    <div className="dev-mortgage-controls">
                      <div className="dev-mortgage-rate-tabs">
                        {[
                          { rate: 6, label: 'Семейная 6%' },
                          { rate: 8, label: 'IT 6-8%' },
                          { rate: 18, label: 'Базовая 18%' },
                        ].map((m) => (
                          <button
                            key={m.rate}
                            type="button"
                            className={`btn-rate-tab ${mortgageRate === m.rate ? 'active' : ''}`}
                            onClick={() => setMortgageRate(m.rate)}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div className="dev-mortgage-result-box">
                        <span className="result-label">Ежемесячный платеж:</span>
                        <strong className="result-val">
                          от {formatNumber(mortgagePayment)} ₽/мес
                        </strong>
                        <span className="result-sub">ПВ 20% · срок 30 лет</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advantages and Features Stickers */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('advantages')}
              >
                <span className="dev-banner-sec-title">Преимущества и особенности</span>
                {openSections.advantages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.advantages && (
                <div className="dev-banner-sec-content">
                  <p className="dev-sec-hint">
                    Выберите до 4 ключевых преимуществ для размещения на баннере:
                  </p>
                  <div className="dev-adv-chips-list">
                    {Array.from(new Set([...DEFAULT_ADVANTAGES, ...selectedAdvantages])).map((adv) => {
                      const isSel = selectedAdvantages.includes(adv);
                      return (
                        <button
                          key={adv}
                          type="button"
                          className={`btn-adv-chip ${isSel ? 'selected' : ''}`}
                          onClick={() => toggleAdvantage(adv)}
                        >
                          {isSel ? <CheckSquare size={13} /> : <Square size={13} />}
                          <span>{adv}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Advantage Form */}
                  <form
                    onSubmit={handleAddCustomAdvantage}
                    className="dev-custom-adv-form"
                  >
                    <input
                      type="text"
                      className="dev-input"
                      placeholder="Добавить свою особенность..."
                      value={customAdvantageText}
                      onChange={(e) => setCustomAdvantageText(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn-add-adv"
                      onClick={handleAddCustomAdvantage}
                    >
                      + Добавить
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Realtor Contact Block */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('agent')}
              >
                <span className="dev-banner-sec-title">Контакты риелтора</span>
                {openSections.agent ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.agent && (
                <div className="dev-banner-sec-content">
                  <div className="dev-field-grid">
                    <label className="dev-field-label">
                      <span>Имя риелтора</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Александр Ельчугин"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Телефон для звонков</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+7 (909) 130-40-90"
                      />
                    </label>

                    <label className="dev-field-label">
                      <span>Подпись / Статус</span>
                      <input
                        type="text"
                        className="dev-input"
                        value={agencySubtitle}
                        onChange={(e) => setAgencySubtitle(e.target.value)}
                        placeholder="Эксперт по новостройкам"
                      />
                    </label>
                  </div>

                  <div className="dev-banner-note-box">
                    <ShieldCheck size={16} className="text-emerald" />
                    <span>
                      Имя застройщика на баннере <strong>не указывается</strong>. Все звонки и заявки клиентов поступают напрямую вам.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dev-banner-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 15, 26, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .dev-banner-modal-window {
          background: #ffffff;
          width: 100%;
          max-width: 1220px;
          height: 94vh;
          max-height: 900px;
          border-radius: 20px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dark .dev-banner-modal-window {
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Header */
        .dev-banner-header {
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          background: #f8fafc;
        }

        .dark .dev-banner-header {
          background: #1e293b;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .dev-banner-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0052ff;
          background: rgba(0, 82, 255, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 4px;
        }

        .dark .dev-banner-badge {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
        }

        .dev-banner-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .dark .dev-banner-title {
          color: #ffffff;
        }

        .dev-banner-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 0;
        }

        .dark .dev-banner-subtitle {
          color: #94a3b8;
        }

        .dev-banner-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s;
        }

        .dark .dev-banner-close-btn {
          background: #334155;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .dev-banner-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Body Grid */
        .dev-banner-body {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(360px, 480px) 1fr;
          overflow: hidden;
        }

        @media (max-width: 900px) {
          .dev-banner-body {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
        }

        /* Preview Pane */
        .dev-banner-preview-pane {
          background: #0b1120;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
        }

        .dev-banner-canvas-wrap {
          position: relative;
          width: 100%;
          max-width: 380px;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
          background: #030712;
        }

        .dev-banner-canvas-wrap.aspect-story {
          aspect-ratio: 9 / 16;
        }

        .dev-banner-canvas-wrap.aspect-portrait {
          aspect-ratio: 4 / 5;
        }

        .dev-banner-canvas-wrap.aspect-post {
          aspect-ratio: 1 / 1;
        }

        .dev-banner-canvas {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .dev-banner-generating-loader {
          position: absolute;
          inset: 0;
          background: rgba(11, 15, 26, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 13px;
          gap: 10px;
        }

        .dev-banner-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: devBannerSpin 0.7s linear infinite;
        }

        @keyframes devBannerSpin {
          to { transform: rotate(360deg); }
        }

        .dev-banner-quick-actions {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 380px;
          margin-top: 14px;
        }

        .btn-banner-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .btn-banner-action.primary {
          background: #0052ff;
          color: #ffffff;
        }

        .btn-banner-action.primary:hover {
          background: #0045d8;
        }

        .btn-banner-action.secondary {
          background: rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
        }

        .btn-banner-action.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-banner-action.secondary.success {
          background: #10b981;
          color: #ffffff;
        }

        .dev-banner-social-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 380px;
          margin-top: 10px;
        }

        .dev-banner-social-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 700;
        }

        .btn-social-chip {
          flex: 1;
          padding: 6px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .btn-social-chip:hover {
          opacity: 0.88;
        }

        .btn-social-chip.tg { background: #229ed9; }
        .btn-social-chip.wa { background: #25d366; }
        .btn-social-chip.vk { background: #0077ff; }

        /* Sidebar Controls */
        .dev-banner-sidebar {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dev-banner-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .dark .dev-banner-section {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dev-banner-sec-head {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
        }

        .dark .dev-banner-sec-head {
          color: #f1f5f9;
        }

        .dev-banner-sec-content {
          padding: 0 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dev-sec-hint {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .dark .dev-sec-hint {
          color: #94a3b8;
        }

        /* Format Tabs */
        .dev-banner-format-tabs {
          padding: 0 16px 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .btn-format-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s;
        }

        .dark .btn-format-tab {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .btn-format-tab.active {
          border-color: #0052ff;
          background: rgba(0, 82, 255, 0.08);
          color: #0052ff;
        }

        .dark .btn-format-tab.active {
          border-color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        .format-hint {
          font-size: 11px;
          color: #64748b;
        }

        .dark .format-hint {
          color: #94a3b8;
        }

        /* Theme & Composition */
        .dev-theme-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .dev-composition-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        @media (max-width: 600px) {
          .dev-composition-tabs {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .btn-theme-tab, .btn-comp-tab {
          padding: 7px 8px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-theme-tab, .dark .btn-comp-tab {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .btn-theme-tab.active, .btn-comp-tab.active {
          border-color: #0052ff;
          background: rgba(0, 82, 255, 0.08);
          color: #0052ff;
        }

        .dark .btn-theme-tab.active, .dark .btn-comp-tab.active {
          border-color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        /* Color Palette */
        .dev-color-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dev-color-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .dev-color-dots {
          display: flex;
          gap: 6px;
        }

        .btn-color-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .btn-color-dot.active {
          transform: scale(1.2);
          border-color: #ffffff;
          box-shadow: 0 0 0 2px #0052ff;
        }

        /* Form Inputs */
        .dev-field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .dev-field-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .dark .dev-field-label {
          color: #94a3b8;
        }

        .dev-input {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
        }

        .dark .dev-input {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
        }

        .dev-input:focus {
          border-color: #0052ff;
        }

        /* Mortgage */
        .dev-checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .dev-mortgage-rate-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 8px;
        }

        .btn-rate-tab {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .dark .btn-rate-tab {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .btn-rate-tab.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .dev-mortgage-result-box {
          margin-top: 10px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .result-label {
          font-size: 12px;
          color: #065f46;
          font-weight: 600;
        }

        .dark .result-label {
          color: #6ee7b7;
        }

        .result-val {
          font-size: 16px;
          font-weight: 800;
          color: #059669;
        }

        .dark .result-val {
          color: #34d399;
        }

        .result-sub {
          font-size: 11px;
          color: #64748b;
        }

        /* Advantages chips */
        .dev-adv-chips-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .btn-adv-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-adv-chip {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }

        .btn-adv-chip.selected {
          border-color: #0052ff;
          background: rgba(0, 82, 255, 0.08);
          color: #0052ff;
        }

        .dark .btn-adv-chip.selected {
          border-color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        .dev-custom-adv-form {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }

        .btn-add-adv {
          padding: 8px 12px;
          border-radius: 8px;
          background: #0052ff;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        /* Note Box */
        /* Plan upload and status styles */
        .dev-plan-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .dark .dev-plan-status-row {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .dev-plan-thumb-wrap {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .dark .dev-plan-thumb-wrap {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .dev-plan-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #ffffff;
        }

        .dev-plan-thumb-placeholder {
          color: #94a3b8;
        }

        .dev-plan-status-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .dev-plan-status-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .dark .dev-plan-status-title {
          color: #f1f5f9;
        }

        .dev-plan-status-sub {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dark .dev-plan-status-sub {
          color: #94a3b8;
        }

        .dev-plan-actions-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-plan-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .btn-plan-action.primary {
          background: #0052ff;
          color: #ffffff;
          flex: 1;
        }

        .btn-plan-action.primary:hover {
          background: #0045d8;
        }

        .btn-plan-action.secondary {
          background: #e2e8f0;
          color: #334155;
        }

        .dark .btn-plan-action.secondary {
          background: #334155;
          color: #f1f5f9;
        }

        .btn-plan-action.secondary:hover {
          background: #cbd5e1;
        }

        /* Photos Section & Grid Picker */
        .dev-banner-sec-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dev-photo-count-pill {
          font-size: 11px;
          font-weight: 700;
          color: #0052ff;
          background: rgba(0, 82, 255, 0.1);
          padding: 2px 7px;
          border-radius: 999px;
        }

        .dark .dev-photo-count-pill {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
        }

        .dev-photos-picker-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .dev-photo-card {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          background: #0f172a;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }

        .dev-photo-card:hover {
          transform: translateY(-2px);
        }

        .dev-photo-card.selected {
          border-color: #0052ff;
          box-shadow: 0 0 0 2px rgba(0, 82, 255, 0.25);
        }

        .dark .dev-photo-card.selected {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.35);
        }

        .dev-photo-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .dev-photo-order-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.7);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          transition: all 0.15s;
        }

        .dev-photo-order-badge.active {
          background: #0052ff;
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 82, 255, 0.4);
        }

        .dev-photo-actions-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        /* Toggles Box */
        .dev-toggles-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          margin-top: 4px;
        }

        .dark .dev-toggles-box {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dev-banner-note-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 12px;
          color: #065f46;
          line-height: 1.4;
        }

        .dark .dev-banner-note-box {
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.12);
        }

        .text-emerald {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
