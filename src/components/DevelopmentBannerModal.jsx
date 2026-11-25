import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
} from 'lucide-react';
import { formatNumber, formatPhone } from '../utils/format';
import { useApp } from '../context/AppContext';
import { buildApiUrl } from '../lib/apiConfig';
import {
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
  { key: 'grid_hero',   label: 'Сетка + План', hint: 'Сетка из фото ЖК + карточка планировки' },
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

const BADGE_PRESETS = [
  '⚡ СЕМЕЙНАЯ ИПОТЕКА 6%',
  '🔥 СТАРТ ПРОДАЖ',
  'ПРЯМЫЕ ЦЕНЫ ЗАСТРОЙЩИКА',
  'АКЦИЯ МЕСЯЦА',
  'КВАРТИРА ОТ ЗАСТРОЙЩИКА',
  'ВЫГОДНОЕ ПРЕДЛОЖЕНИЕ',
  '🔑 КЛЮЧИ В ЭТОМ ГОДУ',
];

const CTA_PRESETS = [
  'Забронировать по цене застройщика',
  'Получить расчет ипотеки',
  'Узнать подробнее и планировки',
  'Записаться на просмотр',
];

const SLOGAN_PRESETS = [
  'По ценам застройщика без переплат',
  'Своя квартира дешевле аренды',
  'Семейная ипотека от 6% любого банка',
  'Просторная планировка с кухней-гостиной',
  'Успейте забронировать до повышения цен',
];

const DEFAULT_ADVANTAGES = [
  'Прямые цены застройщика',
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

const TEXT_COLOR_OPTIONS = [
  { id: 'white', label: 'Белый', color: '#FFFFFF' },
  { id: 'dark', label: 'Графит', color: '#0F172A' },
  { id: 'gold', label: 'Золотой', color: '#FACC15' },
  { id: 'sky', label: 'Голубой', color: '#38BDF8' },
  { id: 'emerald', label: 'Изумруд', color: '#34D399' },
];

function TextColorSwatches({ label, value, onChange }) {
  return (
    <div className="dev-text-color-row">
      <span className="dev-text-color-label">{label}:</span>
      <div className="dev-text-color-dots">
        <button
          type="button"
          className={`btn-theme-color-reset ${!value ? 'active' : ''}`}
          onClick={() => onChange('')}
        >
          По теме
        </button>
        {TEXT_COLOR_OPTIONS.map((opt) => {
          const isSelected = value === opt.color;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              aria-label={`${label}: ${opt.label}`}
              className={`btn-text-swatch ${isSelected ? 'active' : ''}`}
              style={{ backgroundColor: opt.color }}
              onClick={() => onChange(opt.color)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   HELPERS & MATH
   ================================================================ */

function safeRoundRect(ctx, x, y, w, h, r = 0) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.filter(Boolean);
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
  safeRoundRect(ctx, cx, cy, cw, ch, r);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(0, 82, 255, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(0, 82, 255, ${alpha})`;
}

/**
 * Расчет ежемесячного платежа по аннуитетной ипотеке
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

  const [customPlanUrl, setCustomPlanUrl] = useState(null);
  const planImageUrl = customPlanUrl || defaultPlanImageUrl;
  const planFileInputRef = useRef(null);

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

  const [customDevImages, setCustomDevImages] = useState([]);
  const combinedDevImages = useMemo(() => {
    return Array.from(new Set([...customDevImages, ...allDevImages]));
  }, [customDevImages, allDevImages]);

  const [selectedGridImages, setSelectedGridImages] = useState(() => {
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

  /* ---- Advertising State ---- */
  const [format, setFormat]                   = useState('story');
  const [designTheme, setDesignTheme]         = useState('dark');
  const [composition, setComposition]         = useState('grid_hero');
  const [accentColor, setAccentColor]         = useState('#0052FF');

  const [badgeText, setBadgeText]             = useState('⚡ СЕМЕЙНАЯ ИПОТЕКА 6%');
  const [showBadge, setShowBadge]             = useState(true);

  const [devTitle, setDevTitle]               = useState(complexName);
  const [roomTitle, setRoomTitle]             = useState(defaultRoomTitle);
  const [areaText, setAreaText]               = useState(defaultArea);
  const [priceVal, setPriceVal]               = useState(defaultPrice);
  const [priceSqmVal, setPriceSqmVal]         = useState(defaultPriceSqm);
  const [locationText, setLocationText]       = useState(defaultLocation);
  const [phone, setPhone]                     = useState(defaultPhone);
  const [agentName, setAgentName]             = useState(defaultAgentName);
  const [agencySubtitle, setAgencySubtitle]   = useState('Эксперт по новостройкам');

  const [sloganText, setSloganText]           = useState(() => {
    return `${defaultRoomTitle}${defaultArea ? ` · ${defaultArea} м²` : ''} в ${complexName}`;
  });

  const [ctaText, setCtaText]                 = useState('Забронировать по цене застройщика');
  const [showCta, setShowCta]                 = useState(true);

  const [showAddress, setShowAddress]         = useState(true);

  const initialShowPriceFrom = useMemo(() => {
    if (layout.flat_number || layout.flatNumber) return false;
    if (layout.count === 1) return false;
    if (layout.id && !layout.count && !layout.minPrice) return false;
    return true;
  }, [layout]);
  const [showPriceFrom, setShowPriceFrom]     = useState(initialShowPriceFrom);

  const [showMortgage, setShowMortgage]       = useState(true);
  const [mortgageRate, setMortgageRate]       = useState(6);
  const [mortgagePayment, setMortgagePayment] = useState(() =>
    calculateMortgagePayment(defaultPrice, 6)
  );

  useEffect(() => {
    setMortgagePayment(calculateMortgagePayment(priceVal, mortgageRate));
  }, [priceVal, mortgageRate]);

  // Initial advantages
  const [selectedAdvantages, setSelectedAdvantages] = useState(() => {
    const list = ['Семейная ипотека от 6%'];
    if (development.completion_date) {
      list.push(`Срок сдачи: ${development.completion_date}`);
    }
    if (layout.finishing || development.finishing) {
      list.push(layout.finishing || development.finishing);
    }
    return list;
  });

  const [customAdvantageText, setCustomAdvantageText] = useState('');
  const [sloganScale, setSloganScale]                 = useState(100);
  const [sloganColor, setSloganColor]                 = useState('');
  const [bulletScale, setBulletScale]                 = useState(100);
  const [bulletColor, setBulletColor]                 = useState('');
  const [priceColor, setPriceColor]                   = useState('');
  const [copyFeedback, setCopyFeedback]               = useState(false);
  const [copyPostFeedback, setCopyPostFeedback]       = useState(false);
  const [isGenerating, setIsGenerating]               = useState(false);

  // Mobile detection & active view tab
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [mobileTab, setMobileTab] = useState('preview'); // 'preview' | 'editor'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapsible control sections (4 consolidated groups)
  const [openSections, setOpenSections] = useState({
    style: true,
    offer: true,
    visuals: true,
    details: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---- Safe Image Loader with Proxy Fallback ---- */
  const loadImageSafe = useCallback(async (src) => {
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

    // 1. Direct anonymous load
    try {
      const img = await loadDirect(src, true);
      imageCacheRef.current.set(src, img);
      return img;
    } catch {
      // ignore
    }

    // 2. Proxied load for remote images
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const proxyUrl = buildApiUrl(`/api/image-proxy?url=${encodeURIComponent(src)}`);
        const img = await loadDirect(proxyUrl, true);
        imageCacheRef.current.set(src, img);
        return img;
      } catch {
        // ignore
      }
    }

    // 3. Fallback direct without crossOrigin
    try {
      const img = await loadDirect(src, false);
      imageCacheRef.current.set(src, img);
      return img;
    } catch {
      return null;
    }
  }, []);

  /* ================================================================
     CANVAS ADVERTISING BANNER RENDERER
     ================================================================ */
  const draw = useCallback(async () => {
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
    const isBrand = designTheme === 'brand';
    const U = w / 1080;

    const toneBg = isLight ? '#FFFFFF' : (isBrand ? '#070D1E' : '#0B0F19');
    const toneRgb = isLight ? '255, 255, 255' : (isBrand ? '7, 13, 30' : '11, 15, 25');
    const textColor = isLight ? '#0F172A' : '#FFFFFF';
    const subTextColor = isLight ? '#475569' : '#CBD5E1';
    const PAD = Math.round((IS ? 52 : (isPortrait ? 42 : 36)) * U);
    const contentWidth = w - PAD * 2;

    setIsGenerating(true);

    try {
      const [loadedPlan, loadedFacade, ...loadedGrid] = await Promise.all([
        planImageUrl ? loadImageSafe(planImageUrl) : Promise.resolve(null),
        facadeImageUrl ? loadImageSafe(facadeImageUrl) : Promise.resolve(null),
        ...selectedGridImages.map((src) => (src ? loadImageSafe(src) : Promise.resolve(null))),
      ]);
      const validGridImages = loadedGrid.filter(Boolean);

      if (!isMountedRef.current) return;

      let cleanPlan = null;
      if (loadedPlan) {
        cleanPlan = floorplanCacheRef.current.get(planImageUrl);
        if (!cleanPlan) {
          cleanPlan = cropFloorplanWhitespace(loadedPlan);
          if (cleanPlan) floorplanCacheRef.current.set(planImageUrl, cleanPlan);
        }
      }

      /* -------------------------------------------------------------
         1. BASE BACKGROUND & TOP VISUAL ZONE
         ------------------------------------------------------------- */
      ctx.fillStyle = toneBg;
      ctx.fillRect(0, 0, w, h);

      const topPhotoH = Math.round((IS ? 0.50 : (isPortrait ? 0.44 : 0.41)) * h);

      // Render photo(s) in top zone
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, topPhotoH);
      ctx.clip();

      const heroImgs = composition === 'facade_hero'
        ? (loadedFacade ? [loadedFacade] : validGridImages.slice(0, 1))
        : validGridImages;
      const count = heroImgs.length;

      if (composition === 'plan_only') {
        ctx.fillStyle = isLight ? '#F1F5F9' : '#1E293B';
        ctx.fillRect(0, 0, w, topPhotoH);
      } else if (count === 1) {
        drawImageCover(ctx, heroImgs[0], 0, 0, w, topPhotoH);
      } else if (count === 2) {
        const halfW = Math.round((w - 4 * U) / 2);
        drawImageCover(ctx, heroImgs[0], 0, 0, halfW, topPhotoH);
        drawImageCover(ctx, heroImgs[1], halfW + Math.round(4 * U), 0, w - halfW - Math.round(4 * U), topPhotoH);
      } else if (count >= 3) {
        const mainW = Math.round(w * 0.58);
        const rightW = w - mainW - Math.round(4 * U);
        const rightH = Math.round((topPhotoH - 4 * U) / 2);
        drawImageCover(ctx, heroImgs[0], 0, 0, mainW, topPhotoH);
        drawImageCover(ctx, heroImgs[1], mainW + Math.round(4 * U), 0, rightW, rightH);
        drawImageCover(ctx, heroImgs[2] || heroImgs[0], mainW + Math.round(4 * U), rightH + Math.round(4 * U), rightW, topPhotoH - rightH - Math.round(4 * U));
      } else if (loadedFacade) {
        drawImageCover(ctx, loadedFacade, 0, 0, w, topPhotoH);
      } else {
        const topGrad = ctx.createLinearGradient(0, 0, w, topPhotoH);
        topGrad.addColorStop(0, isLight ? '#E2E8F0' : '#0F172A');
        topGrad.addColorStop(1, isLight ? '#CBD5E1' : '#1E293B');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, topPhotoH);
      }
      ctx.restore();

      /* -------------------------------------------------------------
         2. INSET CAD FLOORPLAN CARD
         ------------------------------------------------------------- */
      if (composition === 'plan_only' || composition === 'plan_hero') {
        // Full width plan card
        const cardPad = Math.round(18 * U);
        const cardX = PAD;
        const cardY = PAD;
        const cardW = contentWidth;
        const cardH = topPhotoH - PAD;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = Math.round(20 * U);
        ctx.fillStyle = '#FFFFFF';
        safeRoundRect(ctx, cardX, cardY, cardW, cardH, Math.round(18 * U));
        ctx.fill();
        ctx.restore();

        if (cleanPlan) {
          const innerX = cardX + cardPad;
          const innerY = cardY + cardPad;
          const innerW = cardW - cardPad * 2;
          const innerH = cardH - cardPad * 2;
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
          safeRoundRect(ctx, innerX, innerY, innerW, innerH, Math.round(12 * U));
          ctx.clip();
          ctx.drawImage(cleanPlan, dx, dy, dw, dh);
          ctx.restore();
        }
      } else {
        // Inset CAD card floating on the right
        const cardW = Math.round((IS ? 420 : (isPortrait ? 380 : 360)) * U);
        const cardH = Math.round((IS ? 360 : (isPortrait ? 320 : 300)) * U);
        const cardX = w - PAD - cardW;
        const cardY = topPhotoH - cardH - Math.round(16 * U);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
        ctx.shadowBlur = Math.round(24 * U);
        ctx.shadowOffsetY = Math.round(8 * U);
        ctx.fillStyle = '#FFFFFF';
        safeRoundRect(ctx, cardX, cardY, cardW, cardH, Math.round(16 * U));
        ctx.fill();

        ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
        ctx.lineWidth = Math.round(2 * U);
        ctx.stroke();
        ctx.restore();

        // Top Chip on Floorplan Card
        const chipText = `ПЛАНИРОВКА${areaText ? ` · ${areaText} м²` : ''}`;
        ctx.save();
        ctx.font = `700 ${Math.round(12 * U)}px "Medeo Sans", system-ui, sans-serif`;
        const ctw = ctx.measureText(chipText).width + Math.round(18 * U);
        const chipH = Math.round(24 * U);
        const chipX = cardX + Math.round(12 * U);
        const chipY = cardY + Math.round(10 * U);

        ctx.fillStyle = isLight ? 'rgba(0, 82, 255, 0.10)' : 'rgba(15, 23, 42, 0.85)';
        safeRoundRect(ctx, chipX, chipY, ctw, chipH, chipH / 2);
        ctx.fill();

        ctx.fillStyle = isLight ? accentColor : '#60A5FA';
        ctx.textBaseline = 'middle';
        ctx.fillText(chipText, chipX + Math.round(9 * U), chipY + chipH / 2);
        ctx.restore();

        if (cleanPlan) {
          const innerPad = Math.round(14 * U);
          const innerTop = chipY + chipH + Math.round(6 * U);
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
          safeRoundRect(ctx, innerX, innerY, innerW, innerH, Math.round(10 * U));
          ctx.clip();
          ctx.drawImage(cleanPlan, dx, dy, dw, dh);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = '#64748B';
          ctx.font = `500 ${Math.round(18 * U)}px "Medeo Sans", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Планировка помещения', cardX + cardW / 2, cardY + cardH / 2);
          ctx.restore();
        }
      }

      /* -------------------------------------------------------------
         3. SMOOTH 0% -> 100% TRANSPARENCY GRADIENT TRANSITION
         ------------------------------------------------------------- */
      const fadeHeight = Math.round((IS ? 260 : (isPortrait ? 180 : 140)) * U);
      const fadeStartY = Math.max(0, topPhotoH - fadeHeight);
      const fadeEndY = topPhotoH + Math.round((IS ? 30 : 20) * U);

      ctx.save();
      const fadeGrad = ctx.createLinearGradient(0, fadeStartY, 0, fadeEndY);
      fadeGrad.addColorStop(0.0, `rgba(${toneRgb}, 0)`);
      fadeGrad.addColorStop(0.30, `rgba(${toneRgb}, 0.35)`);
      fadeGrad.addColorStop(0.65, `rgba(${toneRgb}, 0.85)`);
      fadeGrad.addColorStop(1.0, `rgba(${toneRgb}, 1)`);

      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, fadeStartY, w, fadeEndY - fadeStartY);

      ctx.fillStyle = toneBg;
      ctx.fillRect(0, fadeEndY, w, h - fadeEndY);
      ctx.restore();

      /* -------------------------------------------------------------
         4. TOP ENLARGED ADVERTISING BADGE
         ------------------------------------------------------------- */
      if (showBadge && badgeText) {
        ctx.save();
        const badgeFontSize = Math.round((IS ? 24 : (isPortrait ? 20 : 17)) * U);
        const badgeH = Math.round((IS ? 52 : (isPortrait ? 44 : 38)) * U);
        ctx.font = `900 ${badgeFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const badgeW = ctx.measureText(badgeText.toUpperCase()).width + Math.round(44 * U);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
        ctx.shadowBlur = Math.round(16 * U);
        ctx.shadowOffsetY = Math.round(4 * U);

        safeRoundRect(ctx, PAD, PAD, badgeW, badgeH, badgeH / 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = Math.round(2 * U);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText.toUpperCase(), PAD + Math.round(22 * U), PAD + badgeH / 2);
        ctx.restore();

        // Address pill under badge
        if (showAddress && locationText) {
          ctx.save();
          const addrFont = Math.round((IS ? 18 : 15) * U);
          ctx.font = `600 ${addrFont}px "Medeo Sans", system-ui, sans-serif`;
          const addrText = `📍 ${locationText}`;
          const aw = ctx.measureText(addrText).width + Math.round(28 * U);
          const ah = Math.round((IS ? 36 : 30) * U);
          const ay = PAD + badgeH + Math.round(10 * U);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          safeRoundRect(ctx, PAD, ay, aw, ah, ah / 2);
          ctx.fill();

          ctx.fillStyle = '#F8FAFC';
          ctx.textBaseline = 'middle';
          ctx.fillText(addrText, PAD + Math.round(14 * U), ay + ah / 2);
          ctx.restore();
        }
      }

      /* -------------------------------------------------------------
         5. BOTTOM ADVERTISING OFFER & SPECIFICATIONS
         ------------------------------------------------------------- */
      // Calculate bottom anchors
      const phoneFontSize = Math.round((IS ? 34 : (isPortrait ? 28 : 24)) * U);
      const phoneY = h - PAD;

      const ctaFontSize = Math.round((IS ? 28 : (isPortrait ? 24 : 20)) * U);
      const ctaH = showCta && ctaText ? Math.round((IS ? 76 : (isPortrait ? 64 : 54)) * U) : 0;
      const ctaPhoneGap = Math.round((IS ? 24 : 18) * U);
      const ctaY = phoneY - phoneFontSize - ctaPhoneGap - ctaH;

      // Pre-measure offer & advantages block to anchor it right above CTA
      const sloganFontSize = Math.round((IS ? 52 : (isPortrait ? 40 : 32)) * U * (sloganScale / 100));
      const sloganLineHeight = sloganFontSize * 1.18;
      ctx.font = `900 ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
      const finalSlogan = (sloganText || `${roomTitle}${areaText ? ` · ${areaText} м²` : ''} в ${devTitle}`).trim();
      const usedSloganLines = wrapText(ctx, finalSlogan, contentWidth).slice(0, 2);
      const sloganGap = Math.round((IS ? 16 : 10) * U);

      const priceFontSize = Math.round((IS ? 70 : (isPortrait ? 54 : 44)) * U);
      const priceGap = Math.round((IS ? 16 : 10) * U);

      const mortH = Math.round((IS ? 54 : (isPortrait ? 44 : 38)) * U);
      const mortGap = Math.round((IS ? 16 : 10) * U);
      const hasMortgage = showMortgage && mortgagePayment > 0;

      const bulletLimit = IS ? 4 : (isPortrait ? 3 : 2);
      const bulletFontSize = Math.round((IS ? 24 : (isPortrait ? 20 : 16)) * U * (bulletScale / 100));
      const bulletLineHeight = bulletFontSize * 1.3;
      const bulletStepGap = Math.round((IS ? 10 : 6) * U);
      const visibleBullets = selectedAdvantages.slice(0, bulletLimit);

      const totalOfferH =
        usedSloganLines.length * sloganLineHeight +
        sloganGap +
        priceFontSize +
        priceGap +
        (hasMortgage ? mortH + mortGap : 0) +
        visibleBullets.length * (bulletLineHeight + bulletStepGap);

      const offerToCtaGap = Math.round((IS ? 28 : 18) * U);
      const minOfferY = topPhotoH - Math.round((IS ? 12 : 6) * U);
      let curY = Math.max(minOfferY, ctaY - offerToCtaGap - totalOfferH);

      // A. Slogan / Marketing Headline (Medeo Sans 900)
      ctx.save();
      ctx.font = `900 ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
      ctx.fillStyle = sloganColor || textColor;
      ctx.textBaseline = 'top';

      usedSloganLines.forEach((line) => {
        ctx.fillText(line, PAD, curY);
        curY += sloganLineHeight;
      });
      ctx.restore();

      curY += sloganGap;

      // B. Price & Sqm Block (Huge vibrant numbers)
      ctx.save();
      const pricePrefix = showPriceFrom ? 'от ' : '';
      const priceText = priceVal ? `${pricePrefix}${formatNumber(priceVal)} ₽` : 'Цена по запросу';
      ctx.font = `900 ${priceFontSize}px "Medeo Sans", system-ui, sans-serif`;
      ctx.fillStyle = priceColor || (isLight ? accentColor : '#38BDF8');
      ctx.textBaseline = 'top';
      ctx.fillText(priceText, PAD, curY);

      if (priceSqmVal) {
        const pw = ctx.measureText(priceText).width;
        const sqmFontSize = Math.round((IS ? 28 : (isPortrait ? 24 : 20)) * U);
        ctx.font = `600 ${sqmFontSize}px "Medeo Sans", system-ui, sans-serif`;
        ctx.fillStyle = subTextColor;
        ctx.fillText(
          ` ${pricePrefix}${formatNumber(priceSqmVal)} ₽/м²`,
          PAD + pw + Math.round(18 * U),
          curY + priceFontSize - sqmFontSize - Math.round(4 * U)
        );
      }
      ctx.restore();

      curY += priceFontSize + priceGap;

      // C. Mortgage Banner Pill (Семейная ипотека 6%)
      if (hasMortgage) {
        ctx.save();
        const mortFontSize = Math.round((IS ? 24 : (isPortrait ? 20 : 16)) * U);
        const mortText = `Семейная ипотека ${mortgageRate}% · платеж ${showPriceFrom ? 'от ' : ''}${formatNumber(mortgagePayment)} ₽/мес`;
        ctx.font = `700 ${mortFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const mw = Math.min(contentWidth, ctx.measureText(mortText).width + Math.round(44 * U));

        const mortGrad = ctx.createLinearGradient(PAD, curY, PAD + mw, curY + mortH);
        mortGrad.addColorStop(0, '#10B981');
        mortGrad.addColorStop(1, '#059669');
        ctx.fillStyle = mortGrad;

        ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
        ctx.shadowBlur = Math.round(12 * U);
        ctx.shadowOffsetY = Math.round(4 * U);

        safeRoundRect(ctx, PAD, curY, mw, mortH, Math.round(12 * U));
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(mortText, PAD + Math.round(20 * U), curY + mortH / 2);
        ctx.restore();

        curY += mortH + mortGap;
      }

      // D. Key Advantages Bullets (with white checkmarks in accent circles)
      if (visibleBullets.length > 0) {
        const circleR = Math.round((IS ? 14 : (isPortrait ? 12 : 10)) * U * Math.min(1.25, Math.max(0.8, bulletScale / 100)));

        visibleBullets.forEach((adv) => {
          if (curY + bulletLineHeight > ctaY - Math.round(8 * U)) return;

          ctx.save();
          // Circle with checkmark
          const cx = PAD + circleR;
          const cy = curY + bulletFontSize * 0.6;
          ctx.beginPath();
          ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.fill();

          // White checkmark
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.round(2.5 * U);
          ctx.beginPath();
          ctx.moveTo(cx - Math.round(5 * U), cy);
          ctx.lineTo(cx - Math.round(1 * U), cy + Math.round(4 * U));
          ctx.lineTo(cx + Math.round(5 * U), cy - Math.round(4 * U));
          ctx.stroke();

          // Text
          ctx.font = `600 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
          ctx.fillStyle = bulletColor || textColor;
          ctx.textBaseline = 'top';
          ctx.fillText(adv, cx + circleR + Math.round(14 * U), curY);

          curY += bulletLineHeight + bulletStepGap;
          ctx.restore();
        });
      }

      /* -------------------------------------------------------------
         6. CALL-TO-ACTION BUTTON (ANCHORED)
         ------------------------------------------------------------- */
      if (showCta && ctaText) {
        ctx.save();
        ctx.font = `800 ${ctaFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const ctaMetrics = ctx.measureText(ctaText);
        const ctaW = Math.min(contentWidth, ctaMetrics.width + Math.round((IS ? 100 : 80) * U));

        ctx.shadowColor = hexToRgba(accentColor, 0.45);
        ctx.shadowBlur = Math.round(20 * U);
        ctx.shadowOffsetY = Math.round(6 * U);

        safeRoundRect(ctx, PAD, ctaY, ctaW, ctaH, ctaH / 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(ctaText, PAD + Math.round(30 * U), ctaY + ctaH / 2);

        // Arrow ->
        const arrowX = PAD + ctaW - Math.round(36 * U);
        const arrowY = ctaY + ctaH / 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.round(3 * U);
        ctx.beginPath();
        ctx.moveTo(arrowX - Math.round(10 * U), arrowY);
        ctx.lineTo(arrowX + Math.round(4 * U), arrowY);
        ctx.lineTo(arrowX - Math.round(2 * U), arrowY - Math.round(6 * U));
        ctx.moveTo(arrowX + Math.round(4 * U), arrowY);
        ctx.lineTo(arrowX - Math.round(2 * U), arrowY + Math.round(6 * U));
        ctx.stroke();
        ctx.restore();
      }

      /* -------------------------------------------------------------
         7. UNIFIED PHONE CONTACT LINE (ADVERTISING STANDARD)
         ------------------------------------------------------------- */
      if (phone) {
        ctx.save();
        const iconR = Math.round((IS ? 18 : (isPortrait ? 15 : 13)) * U);
        const iconX = PAD + iconR;
        const iconY = phoneY - iconR / 2;

        ctx.beginPath();
        ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.round(2.5 * U);
        ctx.beginPath();
        ctx.arc(iconX, iconY - Math.round(2 * U), iconR * 0.4, Math.PI * 0.2, Math.PI * 0.8, false);
        ctx.stroke();

        const textStartX = iconX + iconR + Math.round(16 * U);
        ctx.font = `800 ${phoneFontSize}px "Medeo Sans", system-ui, sans-serif`;
        ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
        ctx.textBaseline = 'middle';

        const phoneStr = phone.startsWith('+') ? phone : (phone.startsWith('8') ? phone.replace(/^8/, '+7') : `+7 ${phone}`);
        ctx.fillText(`Тел. для связи: ${phoneStr}`, textStartX, iconY);

        if (agentName) {
          ctx.font = `600 ${Math.round(phoneFontSize * 0.72)}px "Medeo Sans", system-ui, sans-serif`;
          ctx.fillStyle = subTextColor;
          ctx.textAlign = 'right';
          ctx.fillText(agentName, w - PAD, iconY);
        }
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
    badgeText,
    showBadge,
    sloganText,
    ctaText,
    showCta,
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
    showMortgage,
    mortgageRate,
    mortgagePayment,
    selectedAdvantages,
    sloganScale,
    sloganColor,
    bulletScale,
    bulletColor,
    priceColor,
    planImageUrl,
    facadeImageUrl,
    selectedGridImages,
    loadImageSafe,
  ]);

  useEffect(() => {
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
              <span>Рекламный баннер новостройки</span>
            </div>
            <h2 className="dev-banner-title">
              {devTitle} · {roomTitle}
            </h2>
            <p className="dev-banner-subtitle">
              Рекламный креатив конкретной планировки для соцсетей, Сторис и мессенджеров (без упоминания застройщика)
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

        {/* Mobile Navigation Switcher */}
        {isMobile && (
          <div className="dev-banner-mobile-nav">
            <button
              type="button"
              className={`btn-mobile-nav ${mobileTab === 'preview' ? 'active' : ''}`}
              onClick={() => setMobileTab('preview')}
            >
              <span>👁️ Готовый баннер</span>
            </button>
            <button
              type="button"
              className={`btn-mobile-nav ${mobileTab === 'editor' ? 'active' : ''}`}
              onClick={() => setMobileTab('editor')}
            >
              <span>⚙️ Настройки</span>
            </button>
          </div>
        )}

        {/* Modal Body: Left Canvas, Right Controls */}
        <div className={`dev-banner-body ${isMobile ? `mobile-tab-${mobileTab}` : ''}`}>
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

              {isMobile ? (
                <button
                  type="button"
                  className="btn-banner-action secondary"
                  onClick={() => setMobileTab('editor')}
                  title="Перейти к настройкам баннера"
                >
                  <Sparkles size={16} />
                  <span>Настройки</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn-banner-action secondary ${copyPostFeedback ? 'success' : ''}`}
                  onClick={handleCopyPostText}
                  title="Скопировать готовый продающий текст поста для соцсетей"
                >
                  {copyPostFeedback ? <Check size={16} /> : <Share2 size={16} />}
                  <span>{copyPostFeedback ? 'Текст скопирован!' : 'Текст поста'}</span>
                </button>
              )}
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

          {/* Controls Sidebar Column: 4 Consolidated Intuitive Groups */}
          <div className="dev-banner-sidebar">
            {/* GROUP 1: Style & Theme */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('style')}
              >
                <span className="dev-banner-sec-title">🎨 Оформление и стиль</span>
                {openSections.style ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.style && (
                <div className="dev-banner-sec-content">
                  {/* Format Selector */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Формат баннера</span>
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
                  </div>

                  {/* Theme, Composition & Accent */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Тема и композиция</span>
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
                </div>
              )}
            </div>

            {/* GROUP 2: Marketing Offer & CTA */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('offer')}
              >
                <span className="dev-banner-sec-title">📢 Рекламный оффер и призыв</span>
                {openSections.offer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.offer && (
                <div className="dev-banner-sec-content">
                  {/* Badge / Sticker */}
                  <div className="dev-subcard">
                    <div className="dev-subcard-head">
                      <span className="dev-subcard-title">Рекламный бейдж / Стикер</span>
                      <label className="dev-checkbox-row subcard-toggle">
                        <input
                          type="checkbox"
                          checked={showBadge}
                          onChange={(e) => setShowBadge(e.target.checked)}
                        />
                        <span>Показать</span>
                      </label>
                    </div>

                    {showBadge && (
                      <>
                        <input
                          type="text"
                          className="dev-input"
                          value={badgeText}
                          onChange={(e) => setBadgeText(e.target.value)}
                          placeholder="Текст стикера..."
                        />
                        <div className="dev-preset-chips">
                          {BADGE_PRESETS.map((bp) => (
                            <button
                              key={bp}
                              type="button"
                              className={`btn-preset-chip ${badgeText === bp ? 'active' : ''}`}
                              onClick={() => setBadgeText(bp)}
                            >
                              {bp}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Slogan / Main Offer */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Рекламный оффер / Слоган</span>
                    <input
                      type="text"
                      className="dev-input"
                      value={sloganText}
                      onChange={(e) => setSloganText(e.target.value)}
                      placeholder="Главный продающий заголовок..."
                    />
                    <div className="dev-preset-chips">
                      {SLOGAN_PRESETS.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          className={`btn-preset-chip ${sloganText === sp ? 'active' : ''}`}
                          onClick={() => setSloganText(sp)}
                        >
                          {sp}
                        </button>
                      ))}
                    </div>

                    {/* Slogan Size Slider */}
                    <div className="dev-range-box">
                      <div className="dev-range-head">
                        <span className="dev-range-label">Размер текста слогана: {sloganScale}%</span>
                        {sloganScale !== 100 && (
                          <button
                            type="button"
                            className="btn-range-reset"
                            onClick={() => setSloganScale(100)}
                          >
                            Сброс (100%)
                          </button>
                        )}
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        step="5"
                        value={sloganScale}
                        onChange={(e) => setSloganScale(Number(e.target.value))}
                        className="dev-range-input"
                      />
                      <div className="dev-range-hints">
                        <span>Компактный (60%)</span>
                        <span>Стандарт (100%)</span>
                        <span>Крупный (150%)</span>
                      </div>
                    </div>

                    {/* Slogan Color Swatches */}
                    <TextColorSwatches
                      label="Цвет текста слогана"
                      value={sloganColor}
                      onChange={setSloganColor}
                    />
                  </div>

                  {/* Call To Action Button (CTA) */}
                  <div className="dev-subcard">
                    <div className="dev-subcard-head">
                      <span className="dev-subcard-title">Кнопка призыва (CTA)</span>
                      <label className="dev-checkbox-row subcard-toggle">
                        <input
                          type="checkbox"
                          checked={showCta}
                          onChange={(e) => setShowCta(e.target.checked)}
                        />
                        <span>Показать</span>
                      </label>
                    </div>

                    {showCta && (
                      <>
                        <input
                          type="text"
                          className="dev-input"
                          value={ctaText}
                          onChange={(e) => setCtaText(e.target.value)}
                          placeholder="Текст на кнопке..."
                        />
                        <div className="dev-preset-chips">
                          {CTA_PRESETS.map((cp) => (
                            <button
                              key={cp}
                              type="button"
                              className={`btn-preset-chip ${ctaText === cp ? 'active' : ''}`}
                              onClick={() => setCtaText(cp)}
                            >
                              {cp}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GROUP 3: Visuals (Photos & Plan) */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('visuals')}
              >
                <span className="dev-banner-sec-title">📸 Фотографии ЖК и чертеж</span>
                {openSections.visuals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.visuals && (
                <div className="dev-banner-sec-content">
                  {/* Development Photos Grid */}
                  <div className="dev-subcard">
                    <div className="dev-subcard-head">
                      <span className="dev-subcard-title">Фотографии ЖК (сетка)</span>
                      <span className="dev-photo-count-pill">{selectedGridImages.length} из 4</span>
                    </div>
                    <p className="dev-sec-hint">
                      Выберите от 1 до 4 фото для формирования сетки ЖК на баннере:
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

                  {/* Floorplan CAD Image */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Чертеж планировки</span>
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
                </div>
              )}
            </div>

            {/* GROUP 4: Parameters, Pricing & Contacts */}
            <div className="dev-banner-section">
              <div
                className="dev-banner-sec-head"
                onClick={() => toggleSection('details')}
              >
                <span className="dev-banner-sec-title">💰 Стоимость, расчет и контакты</span>
                {openSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {openSections.details && (
                <div className="dev-banner-sec-content">
                  {/* Layout Specs & Pricing */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Параметры и стоимость</span>
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

                    <TextColorSwatches
                      label="Цвет цены"
                      value={priceColor}
                      onChange={setPriceColor}
                    />
                  </div>

                  {/* Mortgage Calculator Badge */}
                  <div className="dev-subcard">
                    <div className="dev-subcard-head">
                      <span className="dev-subcard-title">Ипотечный расчет</span>
                      <label className="dev-checkbox-row subcard-toggle">
                        <input
                          type="checkbox"
                          checked={showMortgage}
                          onChange={(e) => setShowMortgage(e.target.checked)}
                        />
                        <span>Показать</span>
                      </label>
                    </div>

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

                  {/* Advantages and Features Stickers */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Преимущества и особенности</span>
                    <p className="dev-sec-hint">
                      Выберите до 4 ключевых преимуществ для размещения на баннере:
                    </p>

                    {/* Bullets Font Size Slider */}
                    <div className="dev-range-box">
                      <div className="dev-range-head">
                        <span className="dev-range-label">Размер шрифта преимуществ: {bulletScale}%</span>
                        {bulletScale !== 100 && (
                          <button
                            type="button"
                            className="btn-range-reset"
                            onClick={() => setBulletScale(100)}
                          >
                            Сброс (100%)
                          </button>
                        )}
                      </div>
                      <input
                        type="range"
                        min="65"
                        max="145"
                        step="5"
                        value={bulletScale}
                        onChange={(e) => setBulletScale(Number(e.target.value))}
                        className="dev-range-input"
                      />
                      <div className="dev-range-hints">
                        <span>Компактный (65%)</span>
                        <span>Стандарт (100%)</span>
                        <span>Крупный (145%)</span>
                      </div>
                    </div>

                    {/* Bullets Color Swatches */}
                    <TextColorSwatches
                      label="Цвет текста преимуществ"
                      value={bulletColor}
                      onChange={setBulletColor}
                    />

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

                  {/* Realtor Contact Block */}
                  <div className="dev-subcard">
                    <span className="dev-subcard-title">Контакты риелтора</span>
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Mobile Bottom Dock */}
        {isMobile && mobileTab === 'editor' && (
          <div className="dev-banner-mobile-dock">
            <button
              type="button"
              className="btn-mobile-dock-btn primary"
              onClick={() => setMobileTab('preview')}
              title="Посмотреть готовый баннер"
            >
              <Sparkles size={15} />
              <span>👁️ Посмотреть баннер</span>
            </button>
            <button
              type="button"
              className="btn-mobile-dock-btn secondary"
              onClick={handleDownload}
              title="Скачать PNG"
            >
              <Download size={15} />
              <span>Скачать PNG</span>
            </button>
            <button
              type="button"
              className={`btn-mobile-dock-btn secondary ${copyPostFeedback ? 'success' : ''}`}
              onClick={handleCopyPostText}
              title="Скопировать текст"
            >
              {copyPostFeedback ? <Check size={15} /> : <Share2 size={15} />}
              <span>Текст поста</span>
            </button>
          </div>
        )}
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
          padding: 12px 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dev-banner-section {
          flex-shrink: 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .dark .dev-banner-section {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dev-banner-sec-head {
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          font-weight: 700;
          font-size: 12px;
          color: #0f172a;
          min-height: 34px;
        }

        .dark .dev-banner-sec-head {
          color: #f1f5f9;
        }

        .dev-banner-sec-content {
          padding: 0 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Subcards inside consolidated sections */
        .dev-subcard {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .dark .dev-subcard {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dev-subcard-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .dev-subcard-title {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .dark .dev-subcard-title {
          color: #cbd5e1;
        }

        .subcard-toggle {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 0;
        }

        .dev-sec-hint {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }

        .dark .dev-sec-hint {
          color: #94a3b8;
        }

        /* Format Tabs */
        .dev-banner-format-tabs {
          padding: 0 10px 8px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .btn-format-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          font-size: 11px;
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
          gap: 5px;
        }

        .dev-composition-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
        }

        @media (max-width: 600px) {
          .dev-composition-tabs {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .btn-theme-tab, .btn-comp-tab {
          padding: 5px 6px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 11px;
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
          gap: 8px;
        }

        .dev-color-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        .dev-color-dots {
          display: flex;
          gap: 5px;
        }

        .btn-color-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .btn-color-dot.active {
          transform: scale(1.15);
          border-color: #ffffff;
          box-shadow: 0 0 0 2px #0052ff;
        }

        /* Preset Chips */
        .dev-preset-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .btn-preset-chip {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-preset-chip {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }

        .btn-preset-chip.active, .btn-preset-chip:hover {
          border-color: #0052ff;
          background: rgba(0, 82, 255, 0.08);
          color: #0052ff;
        }

        .dark .btn-preset-chip.active, .dark .btn-preset-chip:hover {
          border-color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        /* Text Size Sliders & Color Swatches */
        .dev-range-box {
          padding: 8px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dark .dev-range-box {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dev-range-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .dev-range-label {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
        }

        .dark .dev-range-label {
          color: #f1f5f9;
        }

        .btn-range-reset {
          background: none;
          border: none;
          color: #0052ff;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .dark .btn-range-reset {
          color: #60a5fa;
        }

        .dev-range-input {
          width: 100%;
          accent-color: #0052ff;
          cursor: pointer;
          margin: 2px 0;
        }

        .dev-range-hints {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }

        .dark .dev-range-hints {
          color: #94a3b8;
        }

        .dev-text-color-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 2px;
        }

        .dev-text-color-label {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
        }

        .dark .dev-text-color-label {
          color: #94a3b8;
        }

        .dev-text-color-dots {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-theme-color-reset {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-theme-color-reset {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.12);
          color: #94a3b8;
        }

        .btn-theme-color-reset.active {
          border-color: #0052ff;
          background: rgba(0, 82, 255, 0.1);
          color: #0052ff;
        }

        .dark .btn-theme-color-reset.active {
          border-color: #60a5fa;
          background: rgba(96, 165, 250, 0.18);
          color: #60a5fa;
        }

        .btn-text-swatch {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid rgba(148, 163, 184, 0.55);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-text-swatch.active {
          border: 2.5px solid #0052ff;
          box-shadow: 0 0 0 2px rgba(0, 82, 255, 0.25);
          transform: scale(1.1);
        }

        /* Form Inputs */
        .dev-field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .dev-field-label {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }

        .dark .dev-field-label {
          color: #94a3b8;
        }

        .dev-input {
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 12px;
          height: 32px;
          box-sizing: border-box;
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

        /* ================================================================
           MOBILE & SMALL SCREENS RESPONSIVE DESIGN (<= 768px)
           ================================================================ */
        @media (max-width: 768px) {
          .dev-banner-modal-overlay {
            padding: 0;
            background: rgba(11, 15, 26, 0.98);
          }

          .dev-banner-modal-window {
            width: 100%;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
            border: none;
            box-shadow: none;
          }

          .dev-banner-header {
            padding: 8px 12px;
          }

          .dev-banner-badge {
            font-size: 10px;
            padding: 2px 7px;
            margin-bottom: 2px;
          }

          .dev-banner-title {
            font-size: 14px;
            max-width: calc(100vw - 70px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .dev-banner-subtitle {
            display: none;
          }

          .dev-banner-close-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
          }

          /* Mobile Navigation Switcher */
          .dev-banner-mobile-nav {
            display: flex;
            gap: 6px;
            padding: 6px 10px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
          }

          .dark .dev-banner-mobile-nav {
            background: #1e293b;
            border-bottom-color: rgba(255, 255, 255, 0.08);
          }

          .btn-mobile-nav {
            flex: 1;
            height: 34px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: transparent;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
          }

          .dark .btn-mobile-nav {
            color: #94a3b8;
          }

          .btn-mobile-nav.active {
            background: #ffffff;
            color: #0052ff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .dark .btn-mobile-nav.active {
            background: #0f172a;
            color: #60a5fa;
            border-color: rgba(255, 255, 255, 0.1);
          }

          .dev-banner-body {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: calc(100dvh - 90px);
          }

          /* Editor Mode on Mobile: preview pane is hidden so editing has 100% viewport */
          .mobile-tab-editor .dev-banner-preview-pane {
            display: none !important;
          }

          .mobile-tab-editor .dev-banner-sidebar {
            display: flex !important;
            flex: 1;
            overflow-y: auto;
            padding: 10px 10px calc(76px + env(safe-area-inset-bottom, 0px));
          }

          /* Full Preview Mode on Mobile: sidebar is hidden, large centered banner */
          .mobile-tab-preview .dev-banner-sidebar {
            display: none !important;
          }

          .mobile-tab-preview .dev-banner-preview-pane {
            display: flex !important;
            flex: 1;
            overflow-y: auto;
            padding: 12px 10px calc(24px + env(safe-area-inset-bottom, 0px));
            border-right: none;
            justify-content: flex-start;
            align-items: center;
          }

          .mobile-tab-preview .dev-banner-canvas-wrap {
            max-height: 64vh;
            max-width: 92vw;
            width: auto;
            height: auto;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          }

          .mobile-tab-preview .dev-banner-canvas {
            max-height: 64vh;
            max-width: 92vw;
            width: auto;
            height: auto;
            object-fit: contain;
          }

          .mobile-tab-preview .dev-banner-quick-actions {
            display: flex;
            width: 100%;
            max-width: 380px;
            margin-top: 12px;
            gap: 6px;
          }

          .mobile-tab-preview .dev-banner-social-row {
            display: flex;
            width: 100%;
            max-width: 380px;
            margin-top: 8px;
          }

          /* Floating Mobile Dock Bar */
          .dev-banner-mobile-dock {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            display: flex;
            gap: 6px;
            z-index: 10001;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.35);
          }

          .btn-mobile-dock-btn {
            flex: 1;
            height: 38px;
            border-radius: 8px;
            border: none;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-mobile-dock-btn.primary {
            background: #0052ff;
            color: #ffffff;
          }

          .btn-mobile-dock-btn.secondary {
            background: rgba(255, 255, 255, 0.12);
            color: #f1f5f9;
          }

          .btn-mobile-dock-btn.secondary.success {
            background: #10b981;
            color: #ffffff;
          }

          @media (max-width: 480px) {
            .dev-field-grid {
              grid-template-columns: 1fr;
              gap: 6px;
            }

            .dev-photos-picker-grid {
              grid-template-columns: repeat(4, 1fr);
              gap: 5px;
            }

            .dev-banner-format-tabs {
              grid-template-columns: repeat(3, 1fr);
              gap: 4px;
            }

            .dev-theme-tabs, .dev-composition-tabs {
              grid-template-columns: repeat(2, 1fr);
              gap: 4px;
            }
          }
        }
      `}</style>
    </div>
  );
}
