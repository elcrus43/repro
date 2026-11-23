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
  ChevronRight
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
  MEDEO_FONT_WEIGHTS
} from './serviceBannerData';
import { renderServiceBanner } from './serviceBannerRenderer';

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
  const [serviceTitle, setServiceTitle] = useState(activeService.title);
  const [badgeText, setBadgeText] = useState(activeService.badge);
  const [slogan, setSlogan] = useState(activeService.defaultSlogan);
  const [bullets, setBullets] = useState(activeService.bullets);
  const [ctaText, setCtaText] = useState(activeService.ctas[0] || 'Получить консультацию');

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
    setServiceTitle(service.title);
    setBadgeText(service.badge);
    setSlogan(service.defaultSlogan);
    setBullets([...service.bullets]);
    setCtaText(service.ctas[0] || 'Получить консультацию');
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
      serviceTitle,
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
      showBullets,
      showBadge
    });
  }, [
    activeFormat,
    activeTheme,
    serviceTitle,
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
    return `${slogan}\n\n${serviceTitle.toUpperCase()}\n${bulletText}\n\n👉 ${ctaText}\n\nКонтакты для связи:\n👤 ${agentName}\n📞 ${agentPhone}\n\n${tags}`;
  }, [slogan, serviceTitle, bullets, ctaText, agentName, agentPhone, activeService]);

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
              title: serviceTitle,
              text: postText,
              files: [file]
            });
          } else {
            await navigator.share({
              title: serviceTitle,
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
    <div className="ads-generator-page" style={{ padding: '24px 20px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(0, 82, 255, 0.1)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <Megaphone size={14} />
            <span>МАРКЕТИНГ И ПРОДВИЖЕНИЕ</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Генератор рекламных баннеров услуг
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            Создавайте яркие рекламные баннеры для соцсетей, Stories и мессенджеров. Выберите услугу, настройте слоган, оформление и CTA.
          </p>
        </div>

        {/* Quick action buttons on top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleCopyPostText}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{isCopied ? 'Скопировано!' : 'Копировать пост'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 82, 255, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={16} />
            <span>{isDownloading ? 'Сохранение...' : 'Скачать PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Controls on Left, Live Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(320px, 0.85fr)', gap: 24, alignItems: 'start' }} className="ads-studio-layout">
        
        {/* Left Column: Generator Studio Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Navigation Tabs for settings */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: 'var(--surface)',
            padding: 6,
            borderRadius: 14,
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
                    minWidth: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Service Selection */}
          {activeTab === 'service' && (
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                    Выберите услугу для рекламы
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    При выборе услуги автоматически загружаются подходящие слоганы, выгоды и CTA
                  </p>
                </div>
              </div>

              {/* Service Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {SERVICE_CATEGORIES.map(service => {
                  const Icon = ICON_MAP[service.iconName] || Building2;
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceSelect(service)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(0, 82, 255, 0.06)' : 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 8,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0, 82, 255, 0.15)' : 'none'
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isSelected ? 'var(--primary)' : 'var(--surface)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                          {service.shortTitle}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>
                          {service.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Service Title Input */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Название услуги на баннере
                </label>
                <input
                  type="text"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Например: Продажа недвижимости"
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

              {/* Forward Button */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('slogan')}
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
                  <span>Далее: Слоган & Текст</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Slogan & Bullets */}
          {activeTab === 'slogan' && (
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                    Выбор слогана и ключевых выгод
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
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
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Shuffle size={14} />
                  <span>Случайный слоган</span>
                </button>
              </div>

              {/* Curated Slogan Chips */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Рекомендованные слоганы для выбранной услуги:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeService.slogans.map((slog, index) => {
                    const isSelected = slogan === slog;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSlogan(slog)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.06)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />}
                        </div>
                        <span style={{ flex: 1, lineHeight: 1.4 }}>{slog}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Slogan Textarea */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Свой текст слогана
                </label>
                <textarea
                  rows={2}
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Введите привлекающий внимание слоган..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Medeo Font Weight Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Начертание шрифта Medeo Sans (от Thin 100 до Black 900):
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MEDEO_FONT_WEIGHTS.map(f => {
                    const isSelected = sloganWeight === f.weight;
                    return (
                      <button
                        key={f.weight}
                        type="button"
                        onClick={() => setSloganWeight(f.weight)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(0, 82, 255, 0.08)' : 'var(--bg)',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontSize: 12,
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
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Ключевые преимущества (3 буллета)
                  </label>
                  <button
                    type="button"
                    onClick={() => setBullets([...activeService.bullets])}
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
                    <span>Сбросить к исходным</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bullets.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0, 82, 255, 0.1)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
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
                          setBullets(updated);
                        }}
                        style={{
                          flex: 1,
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
                  ))}
                </div>
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
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
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
              <div style={{ marginBottom: 20 }}>
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
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    Верхний стикер / бейдж
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showBadge}
                      onChange={(e) => setShowBadge(e.target.checked)}
                    />
                    <span>Показывать бейдж</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {QUICK_BADGES.map(badge => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setBadgeText(badge)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 16,
                        border: `1px solid ${badgeText === badge ? 'var(--primary)' : 'var(--border)'}`,
                        background: badgeText === badge ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg)',
                        color: badgeText === badge ? 'var(--primary)' : 'var(--text)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {badge}
                    </button>
                  ))}
                </div>

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
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              {/* Photo Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                  Своё фото на баннере
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
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

        {/* Right Column: Live Interactive Canvas Preview & Export */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 18,
            border: '1px solid var(--border)',
            padding: 20,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Preview Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={16} color="var(--primary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  Предпросмотр баннера
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {Object.values(BANNER_FORMATS).map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormatId(fmt.id)}
                    style={{
                      padding: '4px 8px',
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
            <div style={{
              background: '#0B0F19',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              minHeight: 440
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '62vh',
                  height: 'auto',
                  borderRadius: 10,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Export Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 82, 255, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Download size={16} />
                <span>{isDownloading ? 'Сохраняем...' : 'Скачать PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Share2 size={16} />
                <span>Поделиться</span>
              </button>
            </div>

            {/* Ready to Publish Social Post Copy Snippet */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                  Готовый текст для публикации
                </span>
                <button
                  type="button"
                  onClick={handleCopyPostText}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isCopied ? '#10b981' : 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              <div style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                maxHeight: 120,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
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
