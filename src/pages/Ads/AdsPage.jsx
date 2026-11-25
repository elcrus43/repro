import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Megaphone,
  Sparkles,
  Download,
  Copy,
  Share2,
  Check,
  Shuffle,
  Image as ImageIcon,
  Phone,
  User,
  Layers,
  Palette,
  Eye,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Home,
  Key,
  FileText,
  Building2,
  BadgePercent,
  Coins,
  Trees,
  CheckCircle2,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  Plus,
  Pencil
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone } from '../../utils/format';
import {
  SERVICE_CATEGORIES,
  BANNER_FORMATS,
  DESIGN_THEMES,
  LAYOUT_MODES,
  ACCENT_PALETTE,
  CURATED_BACKGROUND_PRESETS,
  QUICK_BADGES,
  POPULAR_CTAS,
  PHOTO_PLACEMENTS,
  MEDEO_FONT_WEIGHTS,
  TEXT_COLOR_OPTIONS,
  TEXT_BACKDROPS
} from './serviceBannerData';
import { renderServiceBanner } from './serviceBannerRenderer';

function ColorSwatches({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
        {label}:
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => onChange('')}
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            border: `1px solid ${!value ? 'var(--primary)' : 'var(--border)'}`,
            background: !value ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg)',
            color: !value ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer'
          }}
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
              onClick={() => onChange(opt.color)}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: opt.color,
                border: isSelected ? '2.5px solid var(--primary)' : '1.5px solid rgba(148, 163, 184, 0.5)',
                boxShadow: isSelected ? '0 0 0 2px rgba(0, 82, 255, 0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                padding: 0
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const ICON_MAP = {
  Building2,
  Home,
  Landmark: Building2,
  BadgePercent,
  Coins,
  Trees,
  ShieldCheck,
  Key,
  TrendingUp,
  Sparkles
};

const LS_BADGES_KEY = 'rem_ads_badges';
const LS_BULLETS_PREFIX = 'rem_ads_bullets_';

function loadSavedBadges() {
  try {
    const raw = localStorage.getItem(LS_BADGES_KEY);
    return raw ? JSON.parse(raw) : QUICK_BADGES;
  } catch {
    return QUICK_BADGES;
  }
}

function saveBadgesToStorage(badges) {
  try {
    localStorage.setItem(LS_BADGES_KEY, JSON.stringify(badges));
  } catch (e) {
    console.warn('[Ads] Failed to save badges:', e);
  }
}

function loadSavedBullets(serviceId, defaultBullets) {
  try {
    const raw = localStorage.getItem(LS_BULLETS_PREFIX + serviceId);
    return raw ? JSON.parse(raw) : defaultBullets;
  } catch {
    return defaultBullets;
  }
}

function saveBulletsToStorage(serviceId, bullets) {
  try {
    localStorage.setItem(LS_BULLETS_PREFIX + serviceId, JSON.stringify(bullets));
  } catch (e) {
    console.warn('[Ads] Failed to save bullets:', e);
  }
}

export function AdsPage() {
  const { state } = useApp();
  const { toast } = useToastContext();
  const currentUser = state.currentUser;

  // Selected Service
  const [selectedServiceId, setSelectedServiceId] = useState('sell');
  const activeService = useMemo(() => {
    return SERVICE_CATEGORIES.find(s => s.id === selectedServiceId) || SERVICE_CATEGORIES[0];
  }, [selectedServiceId]);

  // Customizable Banner Fields
  const [badgeText, setBadgeText] = useState(activeService.badge);
  const [slogan, setSlogan] = useState(activeService.defaultSlogan);
  const [ctaText, setCtaText] = useState(activeService.ctas[0] || 'Получить консультацию');

  // Badges list with persistence
  const [badgesList, setBadgesList] = useState(loadSavedBadges);
  const [editingBadgeIndex, setEditingBadgeIndex] = useState(null);
  const [editingBadgeText, setEditingBadgeText] = useState('');
  const [newBadgeText, setNewBadgeText] = useState('');
  const [showAddBadge, setShowAddBadge] = useState(false);

  // Bullets with persistence per service
  const [bullets, setBullets] = useState(() => loadSavedBullets('sell', SERVICE_CATEGORIES[0].bullets));

  // Design & Format Settings
  const [formatId, setFormatId] = useState('story');
  const [themeId, setThemeId] = useState('neo_dark');
  const [layoutMode, setLayoutMode] = useState('expert');
  const [accentColor, setAccentColor] = useState(DESIGN_THEMES[0].accentColor);
  const [bgPresetId, setBgPresetId] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [agencyName, setAgencyName] = useState('REA CRM');

  // Agent Settings
  const defaultAgentName = useMemo(() => {
    return currentUser?.full_name?.trim() || 'Александр Ельчугин';
  }, [currentUser]);

  const defaultAgentPhone = useMemo(() => {
    const raw = currentUser?.phone || currentUser?.phone_number || '89091304090';
    return formatPhone(raw) || '8 (909) 130-40-90';
  }, [currentUser]);

  const [agentName, setAgentName] = useState(defaultAgentName);
  const [agentPhone, setAgentPhone] = useState(defaultAgentPhone);
  const [agentRole, setAgentRole] = useState('Эксперт по недвижимости');
  const [agentPhotoUrl, setAgentPhotoUrl] = useState(null);
  const [photoPlacement, setPhotoPlacement] = useState('side'); // 'side' | 'background' | 'circle' | 'none'
  const [noDarkOverlay, setNoDarkOverlay] = useState(true); // Clean photo without dark underlay
  const [sloganWeight, setSloganWeight] = useState(900); // Medeo Sans weight (100 to 900)
  const [sloganScale, setSloganScale] = useState(100); // Slogan font size percentage (60 to 150%)
  const [bulletScale, setBulletScale] = useState(100); // Bullets font size percentage (65 to 145%)
  const [sloganColor, setSloganColor] = useState(''); // '' = theme default
  const [bulletColor, setBulletColor] = useState(''); // '' = theme default
  const [phoneColor, setPhoneColor] = useState(''); // '' = theme default
  const [textBackdrop, setTextBackdrop] = useState('none'); // 'none' | 'dark_glass' | 'light_glass' | 'accent_tint'

  // Toggles
  const [showAgent, setShowAgent] = useState(true);
  const [showBullets, setShowBullets] = useState(true);
  const [showBadge, setShowBadge] = useState(true);

  // UI States
  const [activeTab, setActiveTab] = useState('service'); // 'service' | 'slogan' | 'design' | 'agent' | 'cta'
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Canvas Refs & Loaded Image Elements
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const agentPhotoRef = useRef(null);
  const fileInputBgRef = useRef(null);
  const fileInputPhotoRef = useRef(null);

  const activeTheme = useMemo(() => {
    return DESIGN_THEMES.find(t => t.id === themeId) || DESIGN_THEMES[0];
  }, [themeId]);

  const activeFormat = useMemo(() => {
    return BANNER_FORMATS[formatId] || BANNER_FORMATS.story;
  }, [formatId]);

  // When user switches service category, update defaults if not customized
  const handleServiceSelect = (service) => {
    setSelectedServiceId(service.id);
    setBadgeText(service.badge);
    setSlogan(service.defaultSlogan);
    const savedBullets = loadSavedBullets(service.id, service.bullets);
    setBullets(savedBullets);
    setCtaText(service.ctas[0] || 'Получить консультацию');
  };

  const handleUpdateBullets = (newBullets) => {
    setBullets(newBullets);
    saveBulletsToStorage(selectedServiceId, newBullets);
  };

  const handleAddBullet = () => {
    const newBullets = [...bullets, 'Новое преимущество'];
    handleUpdateBullets(newBullets);
    toast.success('Преимущество добавлено и сохранено в базе');
  };

  const handleDeleteBullet = (idx) => {
    if (bullets.length <= 1) {
      toast.error('Должно остаться хотя бы одно преимущество');
      return;
    }
    const newBullets = bullets.filter((_, i) => i !== idx);
    handleUpdateBullets(newBullets);
    toast.success('Преимущество удалено');
  };

  const handleResetBullets = () => {
    handleUpdateBullets([...activeService.bullets]);
    toast.success('Преимущества сброшены к стандартным');
  };

  const handleSaveEditedBadge = (idx) => {
    if (!editingBadgeText.trim()) return;
    const updated = [...badgesList];
    updated[idx] = editingBadgeText.trim();
    setBadgesList(updated);
    saveBadgesToStorage(updated);
    setBadgeText(editingBadgeText.trim());
    setEditingBadgeIndex(null);
    toast.success('Стикер сохранен в базе');
  };

  const handleAddNewBadge = () => {
    if (!newBadgeText.trim()) return;
    const updated = [...badgesList, newBadgeText.trim()];
    setBadgesList(updated);
    saveBadgesToStorage(updated);
    setBadgeText(newBadgeText.trim());
    setNewBadgeText('');
    setShowAddBadge(false);
    toast.success('Новый стикер сохранен в базе');
  };

  const handleDeleteBadge = (idx, e) => {
    e.stopPropagation();
    if (badgesList.length <= 1) {
      toast.error('Должен остаться хотя бы один стикер');
      return;
    }
    const updated = badgesList.filter((_, i) => i !== idx);
    setBadgesList(updated);
    saveBadgesToStorage(updated);
    if (badgeText === badgesList[idx]) {
      setBadgeText(updated[0] || '');
    }
    toast.success('Стикер удален');
  };

  const handleResetBadges = () => {
    setBadgesList(QUICK_BADGES);
    saveBadgesToStorage(QUICK_BADGES);
    toast.success('Стикеры сброшены к исходным');
  };

  // Shuffle slogan from current service or global catalog
  const handleShuffleSlogan = () => {
    const list = activeService.slogans || [];
    if (list.length === 0) return;
    const currentIndex = list.indexOf(slogan);
    const nextList = list.filter((_, idx) => idx !== currentIndex);
    const randomSlogan = nextList[Math.floor(Math.random() * nextList.length)] || list[0];
    setSlogan(randomSlogan);
  };

  // Handle Background Image Loading
  useEffect(() => {
    let active = true;
    let imgSource = null;

    if (customBgUrl) {
      imgSource = customBgUrl;
    } else if (bgPresetId !== 'none') {
      const preset = CURATED_BACKGROUND_PRESETS.find(p => p.id === bgPresetId);
      if (preset && preset.url) {
        imgSource = preset.url;
      }
    }

    if (imgSource) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (active) {
          bgImageRef.current = img;
          drawBanner();
        }
      };
      img.onerror = () => {
        if (active) {
          bgImageRef.current = null;
          drawBanner();
        }
      };
      img.src = imgSource;
    } else {
      bgImageRef.current = null;
      drawBanner();
    }

    return () => {
      active = false;
    };
  }, [bgPresetId, customBgUrl]);

  // Handle Agent Photo Loading
  useEffect(() => {
    let active = true;
    if (agentPhotoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (active) {
          agentPhotoRef.current = img;
          drawBanner();
        }
      };
      img.onerror = () => {
        if (active) {
          agentPhotoRef.current = null;
          drawBanner();
        }
      };
      img.src = agentPhotoUrl;
    } else {
      agentPhotoRef.current = null;
      drawBanner();
    }

    return () => {
      active = false;
    };
  }, [agentPhotoUrl]);

  // Main Canvas Draw Routine
  const drawBanner = useCallback(() => {
    if (!canvasRef.current) return;
    renderServiceBanner(canvasRef.current, {
      format: activeFormat,
      theme: activeTheme,
      badgeText,
      slogan,
      bullets,
      ctaText,
      agentName,
      agentPhone,
      accentColor,
      layoutMode,
      bgImage: bgImageRef.current,
      agentPhoto: agentPhotoRef.current,
      photoPlacement,
      noDarkOverlay,
      sloganWeight,
      sloganScale,
      bulletScale,
      sloganColor,
      bulletColor,
      phoneColor,
      textBackdrop,
      showBullets,
      showBadge
    });
  }, [
    activeFormat,
    activeTheme,
    badgeText,
    slogan,
    bullets,
    ctaText,
    agentName,
    agentPhone,
    accentColor,
    layoutMode,
    photoPlacement,
    noDarkOverlay,
    sloganWeight,
    sloganScale,
    bulletScale,
    sloganColor,
    bulletColor,
    phoneColor,
    textBackdrop,
    showBullets,
    showBadge
  ]);

  // Preload Medeo Sans weights and redraw
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      Promise.all(weights.map(w => document.fonts.load(`${w} 24px "Medeo Sans"`).catch(() => {})))
        .then(() => {
          drawBanner();
        });
    }
  }, [drawBanner]);

  // Redraw whenever parameters change
  useEffect(() => {
    drawBanner();
  }, [drawBanner]);

  // Image upload handlers
  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomBgUrl(event.target.result);
      setBgPresetId('custom');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAgentPhotoUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Download high-resolution PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanService = (activeService.shortTitle || 'usluga').toLowerCase().replace(/\s+/g, '-');
      link.download = `banner-${cleanService}-${formatId}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Баннер успешно сохранен в высоком разрешении');
    } catch (err) {
      console.error('[AdsPage] Download failed:', err);
      toast.error('Не удалось скачать изображение');
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate ready-to-post text copy
  const postText = useMemo(() => {
    const bulletText = bullets.map(b => `• ${b}`).join('\n');
    const tags = (activeService.hashtags || []).join(' ');
    const phoneStr = agentPhone.startsWith('+') ? agentPhone : (agentPhone.startsWith('8') ? agentPhone.replace(/^8/, '+7') : `+7 ${agentPhone}`);
    return `${slogan}\n\n${bulletText}\n\n👉 ${ctaText}\n\nТел. для связи: ${phoneStr}${agentName ? ` (${agentName})` : ''}\n\n${tags}`;
  }, [slogan, bullets, ctaText, agentPhone, agentName, activeService]);

  const handleCopyPostText = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setIsCopied(true);
      toast.success('Текст поста скопирован в буфер обмена');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('[AdsPage] Copy failed:', err);
      toast.error('Не удалось скопировать текст');
    }
  };

  const handleShare = async () => {
    if (navigator.share && canvasRef.current) {
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) {
            handleDownload();
            return;
          }
          const file = new File([blob], `banner-${selectedServiceId}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: activeService.title,
              text: postText,
              files: [file]
            });
          } else {
            await navigator.share({
              title: activeService.title,
              text: postText
            });
          }
        }, 'image/png');
      } catch (e) {
        if (e.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="ads-generator-page">
      {/* Page Header */}
      <div className="ads-page-header">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(0, 82, 255, 0.1)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            <Megaphone size={13} />
            <span>МАРКЕТИНГ</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Генератор рекламных баннеров услуг
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 640, lineHeight: 1.4 }}>
            Баннеры для соцсетей, Stories и мессенджеров. Выберите услугу, слоган и оформите баннер в 1 клик.
          </p>
        </div>

        {/* Quick action buttons on top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleCopyPostText}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{isCopied ? 'Скопировано!' : 'Копировать пост'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={14} />
            <span>{isDownloading ? 'Сохранение...' : 'Скачать PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Controls on Left, Live Preview on Right (on mobile preview comes first via order: -1) */}
      <div className="ads-studio-layout">
        
        {/* Left Column: Generator Studio Controls */}
        <div className="ads-controls-col">
          
          {/* Navigation Tabs for settings */}
          <div style={{
            display: 'flex',
            gap: 4,
            background: 'var(--surface)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--border)',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {[
              { id: 'service', label: '1. Услуга', icon: Layers },
              { id: 'slogan', label: '2. Слоган & Текст', icon: Sparkles },
              { id: 'design', label: '3. Оформление', icon: Palette },
              { id: 'cta', label: '4. CTA & Стикер', icon: Megaphone },
              { id: 'agent', label: '5. Контакты', icon: Phone }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    minWidth: 84,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '7px 8px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Service Selection */}
          {activeTab === 'service' && (
            <div className="ads-tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
                    Выберите услугу для рекламы
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    Автоматически загружаются подходящие слоганы, выгоды и CTA
                  </p>
                </div>
              </div>

              {/* Service Cards Grid - Compact & Responsive */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {SERVICE_CATEGORIES.map(service => {
                  const Icon = ICON_MAP[service.iconName] || Building2;
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceSelect(service)}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 10,
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(0, 82, 255, 0.06)' : 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 6,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0, 82, 255, 0.12)' : 'none'
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: isSelected ? 'var(--primary)' : 'var(--surface)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text)', lineHeight: 1.25 }}>
                          {service.shortTitle}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.2 }}>
                          {service.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Forward Button */}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('slogan')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Далее: Слоган & Текст</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Slogan & Bullets */}
          {activeTab === 'slogan' && (
            <div className="ads-tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
                    Выбор слогана и ключевых выгод
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    Сильный слоган привлекает внимание в ленте с первых секунд
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleShuffleSlogan}
                  title="Выбрать случайный слоган"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Shuffle size={13} />
                  <span>Случайный</span>
                </button>
              </div>

              {/* Curated Slogan Chips */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Рекомендованные слоганы для услуги:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {activeService.slogans.map((slog, index) => {
                    const isSelected = slogan === slog;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSlogan(slog)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.06)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
                        </div>
                        <span style={{ flex: 1, lineHeight: 1.35 }}>{slog}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Slogan Textarea */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  Свой текст слогана
                </label>
                <textarea
                  rows={2}
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Введите привлекающий внимание слоган..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 13,
                    lineHeight: 1.35,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Slogan Font Size Slider */}
              <div style={{ marginBottom: 12, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                    Размер шрифта слогана: {sloganScale}%
                  </label>
                  {sloganScale !== 100 && (
                    <button
                      type="button"
                      onClick={() => setSloganScale(100)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
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
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>Компактный (60%)</span>
                  <span>Стандарт (100%)</span>
                  <span>Крупный (150%)</span>
                </div>
              </div>

              {/* Slogan Color Swatches (5 colors) */}
              <ColorSwatches
                label="Цвет текста слогана"
                value={sloganColor}
                onChange={setSloganColor}
              />

              {/* Medeo Font Weight Selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Начертание шрифта Medeo Sans:
                </label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {MEDEO_FONT_WEIGHTS.map(f => {
                    const isSelected = sloganWeight === f.weight;
                    return (
                      <button
                        key={f.weight}
                        type="button"
                        onClick={() => setSloganWeight(f.weight)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 11,
                          fontWeight: f.weight,
                          fontFamily: 'Medeo Sans',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Benefits / Bullets */}
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block' }}>
                      Ключевые преимущества
                    </label>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Добавляйте или удаляйте пункты (сохраняются в базе)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetBullets}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>Сброс</span>
                  </button>
                </div>

                {/* Bullets Font Size Slider */}
                <div style={{ marginBottom: 10, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                      Размер шрифта преимуществ: {bulletScale}%
                    </label>
                    {bulletScale !== 100 && (
                      <button
                        type="button"
                        onClick={() => setBulletScale(100)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0
                        }}
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
                    style={{
                      width: '100%',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Компактный (65%)</span>
                    <span>Стандарт (100%)</span>
                    <span>Крупный (145%)</span>
                  </div>
                </div>

                {/* Bullets Color Swatches (5 colors) */}
                <ColorSwatches
                  label="Цвет текста преимуществ"
                  value={bulletColor}
                  onChange={setBulletColor}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {bullets.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(0, 82, 255, 0.1)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => {
                          const updated = [...bullets];
                          updated[idx] = e.target.value;
                          handleUpdateBullets(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 7,
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: 12,
                          fontFamily: 'inherit'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBullet(idx)}
                        title="Удалить преимущество"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--danger, #ef4444)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddBullet}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: '1px dashed var(--primary)',
                    background: 'rgba(0, 82, 255, 0.05)',
                    color: 'var(--primary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} />
                  <span>Добавить преимущество</span>
                </button>
              </div>

              {/* Forward Button */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('service')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('design')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Далее: Оформление</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Design & Styling */}
          {activeTab === 'design' && (
            <div className="ads-tab-panel">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
                Оформление и визуальный стиль
              </h3>

              {/* Banner Formats */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Формат баннера:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Object.values(BANNER_FORMATS).map(fmt => {
                    const isSelected = formatId === fmt.id;
                    const h = fmt.ratio >= 1 ? 30 : fmt.ratio < 0.7 ? 46 : 38;
                    const w = Math.round(h * fmt.ratio);
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormatId(fmt.id)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: w,
                          height: h,
                          borderRadius: 3,
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-muted)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.2)' : 'transparent'
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                          {fmt.label.split(' ')[0]}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                          {fmt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Design Themes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Тема оформления:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {DESIGN_THEMES.map(thm => {
                    const isSelected = themeId === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => {
                          setThemeId(thm.id);
                          setAccentColor(thm.accentColor);
                        }}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: 'var(--bg)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${thm.bgColors[0]} 0%, ${thm.accentColor} 100%)`,
                          border: '2px solid rgba(255,255,255,0.4)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          flexShrink: 0
                        }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {thm.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layout Mode */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Стиль макета:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {LAYOUT_MODES.map(mode => {
                    const isSelected = layoutMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setLayoutMode(mode.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{mode.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{mode.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Palette */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Цветовой акцент:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ACCENT_PALETTE.map(clr => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setAccentColor(clr)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: clr,
                        border: accentColor === clr ? '3px solid var(--text)' : '2px solid rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        transform: accentColor === clr ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Translucent Text Backdrop */}
              <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Полупрозрачный фон для текста:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 6 }}>
                  {TEXT_BACKDROPS.map(bp => {
                    const isSelected = textBackdrop === bp.id;
                    return (
                      <button
                        key={bp.id}
                        type="button"
                        onClick={() => setTextBackdrop(bp.id)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 11,
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {bp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Preset or Upload */}
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Фоновая текстура / фото:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {CURATED_BACKGROUND_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBgPresetId(preset.id);
                        setCustomBgUrl(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: `1px solid ${bgPresetId === preset.id && !customBgUrl ? 'var(--primary)' : 'var(--border)'}`,
                        background: bgPresetId === preset.id && !customBgUrl ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg)',
                        color: bgPresetId === preset.id && !customBgUrl ? 'var(--primary)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <input
                    type="file"
                    ref={fileInputBgRef}
                    onChange={handleBgUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputBgRef.current?.click()}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px dashed var(--border)',
                      background: customBgUrl ? 'rgba(0, 82, 255, 0.1)' : 'transparent',
                      color: customBgUrl ? 'var(--primary)' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Upload size={13} />
                    <span>{customBgUrl ? 'Своё фото (загружено)' : 'Загрузить фон'}</span>
                  </button>
                </div>
              </div>

              {/* Forward Button */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('slogan')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cta')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Далее: CTA & Стикер</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CTA & Stickers */}
          {activeTab === 'cta' && (
            <div className="ads-tab-panel">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
                Призыв к действию (CTA) и стикеры
              </h3>

              {/* CTA Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Популярные варианты CTA кнопки:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {POPULAR_CTAS.map((item, idx) => {
                    const isSelected = ctaText === item;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCtaText(item)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ArrowRight size={14} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom CTA Input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Свой текст на кнопке CTA
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Например: Записаться на просмотр"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Top Badge / Tag Settings */}
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block' }}>
                      Верхний стикер / бейдж
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Кликните для выбора, отредактируйте или добавьте свой (сохраняется в базе)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleResetBadges}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Сбросить стикеры</span>
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showBadge}
                        onChange={(e) => setShowBadge(e.target.checked)}
                      />
                      <span>Показывать бейдж</span>
                    </label>
                  </div>
                </div>

                {/* Badges List with inline edit, delete, and select */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {badgesList.map((badge, idx) => {
                    const isSelected = badgeText === badge;
                    const isEditing = editingBadgeIndex === idx;

                    if (isEditing) {
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 16,
                            border: '1.5px solid var(--primary)',
                            background: 'var(--bg)'
                          }}
                        >
                          <input
                            type="text"
                            value={editingBadgeText}
                            onChange={(e) => setEditingBadgeText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditedBadge(idx);
                              if (e.key === 'Escape') setEditingBadgeIndex(null);
                            }}
                            autoFocus
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text)',
                              fontSize: 12,
                              fontWeight: 700,
                              outline: 'none',
                              width: Math.max(90, editingBadgeText.length * 8 + 12)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditedBadge(idx)}
                            title="Сохранить стикер"
                            style={{
                              background: 'var(--primary)',
                              border: 'none',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBadgeIndex(null)}
                            title="Отмена"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 2,
                              fontSize: 12
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          borderRadius: 16,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setBadgeText(badge)}
                      >
                        <span>{badge}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBadgeIndex(idx);
                            setEditingBadgeText(badge);
                          }}
                          title="Редактировать стикер"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.7
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        {badgesList.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBadge(idx, e)}
                            title="Удалить стикер"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.7
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add new badge form */}
                {showAddBadge ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                    <input
                      type="text"
                      value={newBadgeText}
                      onChange={(e) => setNewBadgeText(e.target.value)}
                      placeholder="Название нового стикера..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewBadge();
                        if (e.key === 'Escape') setShowAddBadge(false);
                      }}
                      autoFocus
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: 12,
                        fontFamily: 'inherit'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewBadge}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddBadge(false)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBadge(true);
                      setNewBadgeText('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 14,
                      border: '1px dashed var(--primary)',
                      background: 'rgba(0, 82, 255, 0.04)',
                      color: 'var(--primary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: 12
                    }}
                  >
                    <Plus size={12} />
                    <span>Добавить свой стикер</span>
                  </button>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Текст выбранного стикера на баннере
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Текст стикера..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Forward Button */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('design')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agent')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Далее: Телефон для связи</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Photo & Contact Phone */}
          {activeTab === 'agent' && (
            <div className="ads-tab-panel">
              {/* Photo Section */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
                  Своё фото на баннере
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  Загрузите своё фото без темной подложки. Фото отображается в чистых естественных цветах.
                </p>

                {/* Upload Button & Preview */}
                <input
                  type="file"
                  ref={fileInputPhotoRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    background: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {agentPhotoUrl ? (
                      <img src={agentPhotoUrl} alt="Фото" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={28} color="var(--text-muted)" />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => fileInputPhotoRef.current?.click()}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Upload size={14} />
                        <span>{agentPhotoUrl ? 'Заменить фото' : 'Загрузить своё фото'}</span>
                      </button>

                      {agentPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setAgentPhotoUrl(null)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--danger, #ef4444)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Портрет по пояс, в рост или логотип (PNG или JPG)
                    </span>
                  </div>
                </div>

                {/* Photo Placement options */}
                {agentPhotoUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Размещение фото:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {PHOTO_PLACEMENTS.map(pl => {
                        const isSelected = photoPlacement === pl.id;
                        return (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => setPhotoPlacement(pl.id)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                              background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                              color: isSelected ? 'var(--primary)' : 'var(--text)',
                              fontSize: 12,
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div>{pl.label}</div>
                          </button>
                        );
                      })}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={noDarkOverlay}
                        onChange={(e) => setNoDarkOverlay(e.target.checked)}
                      />
                      <span>Без темной подложки (100% чистый и естественный цвет фото)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Phone for contact */}
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                    Телефон для связи
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Отображается внизу баннера крупной строкой: «Тел. для связи: {agentPhone}»
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Телефон для связи
                    </label>
                    <input
                      type="text"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder="8 (909) 130-40-90"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: 15,
                        fontWeight: 700,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Phone Color Swatches (5 colors) */}
                  <ColorSwatches
                    label="Цвет телефона"
                    value={phoneColor}
                    onChange={setPhoneColor}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Имя специалиста (опционально)
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Имя Фамилия"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: 14,
                        fontFamily: 'inherit'
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Отображается рядом с номером телефона, если позволяет ширина баннера
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Back */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('cta')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Назад к CTA
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Interactive Canvas Preview & Export (On mobile, placed on TOP via order: -1) */}
        <div className="ads-preview-col">
          <div className="ads-preview-card">
            {/* Preview Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={15} color="var(--primary)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                  Предпросмотр баннера
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.values(BANNER_FORMATS).map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormatId(fmt.id)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 6,
                      border: 'none',
                      background: formatId === fmt.id ? 'var(--primary)' : 'var(--bg)',
                      color: formatId === fmt.id ? '#ffffff' : 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {fmt.hint}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Stage */}
            <div className="ads-canvas-stage">
              <canvas
                ref={canvasRef}
                className="ads-canvas-element"
              />
            </div>

            {/* Export Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Download size={14} />
                <span>{isDownloading ? 'Сохраняем...' : 'Скачать PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Share2 size={14} />
                <span>Поделиться</span>
              </button>
            </div>

            {/* Ready to Publish Social Post Copy Snippet */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                  Готовый текст для публикации
                </span>
                <button
                  type="button"
                  onClick={handleCopyPostText}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isCopied ? '#10b981' : 'var(--primary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {isCopied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{isCopied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              <div style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                maxHeight: 90,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
                border: '1px solid var(--border)'
              }}>
                {postText}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default AdsPage;
