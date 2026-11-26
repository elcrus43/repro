import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Share2,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Palette,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone } from '../../utils/format';
import { apiFetch } from '../../lib/apiConfig';
import { getToken } from '../../lib/neon';
import {
  getConnectedSocialNetworks,
  shareBannerToSocial,
} from '../../lib/socialShare';
import {
  renderNewsStory,
  STORY_THEMES,
  STORY_ACCENT_COLORS,
} from './newsStoryRenderer';

export function NewsStoryModal({ item, onClose }) {
  const { state } = useApp();
  const { showToast } = useToastContext();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const user = state.currentUser;
  const preset = item?.storyPreset || {};

  const [theme, setTheme] = useState(item?.category === 'memes' ? 'meme' : 'dark');
  const [accentColor, setAccentColor] = useState('#0052FF');
  const [badge, setBadge] = useState(preset.badge || 'НОВОСТИ РЫНКА');
  const [headline, setHeadline] = useState(preset.headline || item?.title || '');
  const [summary, setSummary] = useState(preset.summary || item?.summary || '');
  const [bulletsText, setBulletsText] = useState(
    Array.isArray(preset.bullets) ? preset.bullets.join('\n') : ''
  );
  const [cta, setCta] = useState(preset.cta || 'Напишите - разберём вашу ситуацию');
  const [agentName, setAgentName] = useState(user?.full_name || 'Ваш риелтор');
  const [agentPhone, setAgentPhone] = useState(
    user?.phone ? formatPhone(user.phone) : ''
  );
  const [bgImage, setBgImage] = useState(null);
  const [isAiAdapting, setIsAiAdapting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingNet, setSharingNet] = useState('');

  const connectedNetworks = useMemo(() => getConnectedSocialNetworks(user), [user]);

  const bullets = useMemo(
    () => bulletsText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3),
    [bulletsText]
  );

  const sourceText = useMemo(() => {
    const src = item?.source || 'Недвижимость';
    if (!item?.publishedAt) return src;
    try {
      const d = new Date(item.publishedAt);
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      return `${src} • ${dateStr}`;
    } catch {
      return src;
    }
  }, [item]);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled || !canvasRef.current) return;
      renderNewsStory(canvasRef.current, {
        theme,
        accentColor,
        badge,
        sourceText,
        headline,
        summary,
        bullets,
        cta,
        agentName,
        agentPhone,
        bgImage,
      });
    };

    draw();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(draw);
    }
    return () => { cancelled = true; };
  }, [theme, accentColor, badge, sourceText, headline, summary, bullets, cta, agentName, agentPhone, bgImage]);

  useEffect(() => {
    if (!item?.imageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setBgImage(img);
    };
    img.onerror = () => {
      // Если сервер источника запретил CORS для canvas, оставляем градиентный фон
    };
    img.src = item.imageUrl;
    return () => { cancelled = true; };
  }, [item?.imageUrl]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleAiAdapt = async () => {
    setIsAiAdapting(true);
    try {
      const token = getToken();
      const res = await apiFetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'adaptNewsForStory',
          item: {
            title: headline || item?.title,
            summary: summary || item?.summary,
            category: item?.category || 'official',
            source: item?.source || '',
          },
        }),
      });
      if (!res.ok) throw new Error('Не удалось адаптировать через AI');
      const data = await res.json();
      if (data.badge) setBadge(data.badge);
      if (data.headline) setHeadline(data.headline);
      if (data.summary) setSummary(data.summary);
      if (Array.isArray(data.bullets)) setBulletsText(data.bullets.join('\n'));
      if (data.cta) setCta(data.cta);
      showToast('Текст адаптирован под сторис', 'success');
    } catch (err) {
      showToast(err.message || 'Ошибка адаптации', 'error');
    } finally {
      setIsAiAdapting(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `story-news-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('Сторис сохранена в PNG', 'success');
  };

  const buildPostCaption = () => {
    const parts = [headline, summary];
    if (bullets.length > 0) {
      parts.push(bullets.map(b => `- ${b}`).join('\n'));
    }
    if (cta) parts.push(cta);
    if (agentPhone) parts.push(`Телефон: ${agentPhone}`);
    if (item?.source || item?.url) {
      const srcLabel = item.source || 'Первоисточник';
      parts.push(item.url ? `Источник: ${srcLabel} (${item.url})` : `Источник: ${srcLabel}`);
    }
    parts.push('#недвижимость #новостинедвижимости #риелтор');
    return parts.filter(Boolean).join('\n\n');
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(buildPostCaption());
      setCopied(true);
      showToast('Текст для поста скопирован', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Не удалось скопировать текст', 'error');
    }
  };

  const handleShareSocial = async (netId) => {
    if (!canvasRef.current) return;
    setSharingNet(netId);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const res = await shareBannerToSocial({
        networkId: netId,
        dataUrl,
        caption: buildPostCaption(),
        user,
      });
      showToast(res?.message || 'Готово к публикации в сторис', 'success');
    } catch (err) {
      showToast(err.message || 'Ошибка отправки в сторис', 'error');
    } finally {
      setSharingNet('');
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Оформление новости в сторис"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 980,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Оформление в Сторис (9:16)
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Настройте текст и стиль - скачайте PNG или отправьте в соцсети
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть конструктор сторис"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            padding: 20,
            overflowY: 'auto',
          }}
        >
          {/* Preview */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 310,
                aspectRatio: '9 / 16',
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: '#090d16',
                boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={16} /> Скачать PNG
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyCaption}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано' : 'Текст поста'}
              </button>
            </div>

            {connectedNetworks.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {connectedNetworks.map(net => (
                  <button
                    key={net.id}
                    type="button"
                    disabled={Boolean(sharingNet)}
                    onClick={() => handleShareSocial(net.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      border: `1px solid ${net.color}`,
                      background: net.bgLight,
                      color: net.color,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Share2 size={13} />
                    {sharingNet === net.id ? 'Отправка...' : net.storyLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={handleAiAdapt}
                disabled={isAiAdapting}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--primary)',
                  background: 'rgba(0, 82, 255, 0.08)',
                  color: 'var(--primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isAiAdapting ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                {isAiAdapting ? 'Улучшаем...' : 'Улучшить текст через AI'}
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 12, padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <ImageIcon size={14} /> Фон-фото
                </button>
                {bgImage && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBgImage(null)}
                    title="Убрать фото"
                    style={{ fontSize: 12, padding: '7px 10px' }}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Theme & Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STORY_THEMES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: theme === t.id ? 'var(--primary)' : 'var(--bg)',
                      color: theme === t.id ? '#fff' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={14} color="var(--text-muted)" />
                {STORY_ACCENT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Цвет акцента ${color}`}
                    onClick={() => setAccentColor(color)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: color,
                      border: accentColor === color ? '2.5px solid var(--text)' : '1px solid rgba(148,163,184,0.4)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Бейдж рубрики
              </label>
              <input
                type="text"
                className="form-input"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                maxLength={28}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Заголовок сторис
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Суть новости / панчлайн
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Ключевые тезисы (по одному в строке, до 3)
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={bulletsText}
                onChange={(e) => setBulletsText(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Призыв к действию (CTA)
              </label>
              <input
                type="text"
                className="form-input"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Имя риелтора
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Телефон
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
