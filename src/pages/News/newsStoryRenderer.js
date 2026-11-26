/**
 * src/pages/News/newsStoryRenderer.js
 *
 * Canvas-рендерер сторис (1080x1920, 9:16) для новостей, мемов и фактов о недвижимости.
 * Использует фирменный шрифт 'Medeo Sans' и дефис '-' вместо длинного тире.
 */

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export const STORY_THEMES = [
  { id: 'dark', label: 'Тёмная' },
  { id: 'brand', label: 'Бренд' },
  { id: 'light', label: 'Светлая' },
  { id: 'meme', label: 'Мем-стиль' },
];

export const STORY_ACCENT_COLORS = [
  '#0052FF',
  '#0ea5e9',
  '#10b981',
  '#f97316',
  '#ef4444',
  '#8b5cf6',
  '#eab308',
];

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

export function wrapCanvasText(ctx, text, maxWidth) {
  const clean = String(text || '').replace(/[—–]/g, '-').trim();
  if (!clean) return [];
  const paragraphs = clean.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const ratio = Math.max(w / iw, h / ih);
  const shiftX = x + (w - iw * ratio) / 2;
  const shiftY = y + (h - ih * ratio) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, 0, 0, iw, ih, shiftX, shiftY, iw * ratio, ih * ratio);
  ctx.restore();
}

export function renderNewsStory(canvas, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    theme = 'dark',
    accentColor = '#0052FF',
    badge = 'НОВОСТИ РЫНКА',
    sourceText = 'Недвижимость',
    headline = 'Главное событие рынка недвижимости',
    summary = 'Краткий разбор для покупателей и продавцов.',
    bullets = [],
    cta = 'Напишите - разберём вашу ситуацию',
    agentName = 'Ваш риелтор',
    agentPhone = '',
    bgImage = null,
  } = options;

  const W = STORY_WIDTH;
  const H = STORY_HEIGHT;
  canvas.width = W;
  canvas.height = H;

  const font = "'Medeo Sans', 'Inter', system-ui, sans-serif";
  const isLight = theme === 'light';
  const isBrand = theme === 'brand';
  const isMeme = theme === 'meme';

  // 1. Background
  if (isLight) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (isBrand) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (isMeme) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#18181b');
    grad.addColorStop(0.55, '#27272a');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0b1120');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Decorative glow blobs
  ctx.save();
  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.14, 20, W * 0.85, H * 0.14, 520);
  glow1.addColorStop(0, hexToRgba(accentColor, isLight ? 0.18 : 0.35));
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.15, H * 0.82, 20, W * 0.15, H * 0.82, 460);
  glow2.addColorStop(0, hexToRgba(accentColor, isLight ? 0.12 : 0.22));
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Optional background photo
  if (bgImage) {
    drawCoverImage(ctx, bgImage, 0, 0, W, H);
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    if (isLight) {
      overlay.addColorStop(0, 'rgba(248, 250, 252, 0.72)');
      overlay.addColorStop(0.5, 'rgba(248, 250, 252, 0.85)');
      overlay.addColorStop(1, 'rgba(241, 245, 249, 0.96)');
    } else {
      overlay.addColorStop(0, 'rgba(9, 13, 22, 0.62)');
      overlay.addColorStop(0.45, 'rgba(9, 13, 22, 0.78)');
      overlay.addColorStop(1, 'rgba(9, 13, 22, 0.95)');
    }
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
  }

  const padX = 76;
  const contentW = W - padX * 2;
  let cursorY = 170;

  // 2. Top row: Category Badge + Source
  const safeBadge = String(badge || 'НОВОСТИ').toUpperCase().replace(/[—–]/g, '-');
  ctx.font = `800 28px ${font}`;
  const badgeTextW = ctx.measureText(safeBadge).width;
  const badgeW = Math.min(contentW * 0.58, badgeTextW + 56);
  const badgeH = 60;

  ctx.save();
  safeRoundRect(ctx, padX, cursorY, badgeW, badgeH, 30);
  ctx.fillStyle = isMeme ? '#facc15' : accentColor;
  ctx.fill();
  ctx.fillStyle = isMeme ? '#09090b' : '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(safeBadge, padX + 28, cursorY + badgeH / 2 + 1, badgeW - 56);
  ctx.restore();

  if (sourceText) {
    ctx.save();
    ctx.font = `600 26px ${font}`;
    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.7)';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText(String(sourceText).replace(/[—–]/g, '-'), W - padX, cursorY + badgeH / 2 + 1, contentW - badgeW - 24);
    ctx.restore();
  }

  cursorY += badgeH + 64;

  // 3. Headline
  const headlineSize = headline.length > 75 ? 58 : headline.length > 50 ? 66 : 74;
  ctx.font = `900 ${headlineSize}px ${font}`;
  const headlineLines = wrapCanvasText(ctx, headline, contentW).slice(0, 5);
  const headlineLineH = Math.round(headlineSize * 1.16);

  ctx.save();
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.textBaseline = 'top';
  for (const line of headlineLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += headlineLineH;
  }
  ctx.restore();

  cursorY += 44;

  // 4. Summary Card
  ctx.font = `500 36px ${font}`;
  const summaryLines = wrapCanvasText(ctx, summary, contentW - 88).slice(0, 5);
  const summaryLineH = 50;
  const cleanBullets = Array.isArray(bullets)
    ? bullets.map(b => String(b || '').replace(/[—–]/g, '-').trim()).filter(Boolean).slice(0, 3)
    : [];

  ctx.font = `600 31px ${font}`;
  const wrappedBullets = cleanBullets.map(b => wrapCanvasText(ctx, b, contentW - 132).slice(0, 2));
  const bulletsHeight = wrappedBullets.reduce((acc, lines) => acc + lines.length * 42 + 22, 0);

  const cardPaddingY = 44;
  const cardInnerH = summaryLines.length * summaryLineH + (cleanBullets.length > 0 ? 36 + bulletsHeight : 0);
  const cardH = Math.max(180, cardPaddingY * 2 + cardInnerH);

  ctx.save();
  safeRoundRect(ctx, padX, cursorY, contentW, cardH, 34);
  ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.14)';
  ctx.stroke();

  // Accent bar on left of card
  safeRoundRect(ctx, padX, cursorY + 28, 10, cardH - 56, 5);
  ctx.fillStyle = isMeme ? '#facc15' : accentColor;
  ctx.fill();
  ctx.restore();

  let innerY = cursorY + cardPaddingY;
  ctx.save();
  ctx.font = `500 36px ${font}`;
  ctx.fillStyle = isLight ? '#1e293b' : 'rgba(255, 255, 255, 0.94)';
  ctx.textBaseline = 'top';
  for (const line of summaryLines) {
    ctx.fillText(line, padX + 48, innerY);
    innerY += summaryLineH;
  }

  if (wrappedBullets.length > 0) {
    innerY += 28;
    ctx.font = `600 31px ${font}`;
    for (const bLines of wrappedBullets) {
      // Bullet dot
      ctx.beginPath();
      ctx.arc(padX + 58, innerY + 18, 7, 0, Math.PI * 2);
      ctx.fillStyle = isMeme ? '#facc15' : accentColor;
      ctx.fill();

      ctx.fillStyle = isLight ? '#334155' : 'rgba(255, 255, 255, 0.86)';
      for (const bl of bLines) {
        ctx.fillText(bl, padX + 84, innerY);
        innerY += 42;
      }
      innerY += 20;
    }
  }
  ctx.restore();

  // 5. Bottom Footer (CTA + Agent Info)
  const footerY = H - 300;

  if (cta) {
    ctx.save();
    safeRoundRect(ctx, padX, footerY, contentW, 92, 24);
    ctx.fillStyle = isMeme ? '#facc15' : accentColor;
    ctx.fill();

    ctx.font = `700 30px ${font}`;
    ctx.fillStyle = isMeme ? '#09090b' : '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(String(cta).replace(/[—–]/g, '-'), W / 2, footerY + 46, contentW - 48);
    ctx.restore();
  }

  // Agent contact line
  const contactY = footerY + 132;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = `800 34px ${font}`;
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.fillText(String(agentName || 'Риелтор').replace(/[—–]/g, '-'), padX, contactY, contentW * 0.54);

  if (agentPhone) {
    ctx.font = `700 34px ${font}`;
    ctx.fillStyle = isLight ? accentColor : (isMeme ? '#facc15' : '#93c5fd');
    ctx.textAlign = 'right';
    ctx.fillText(String(agentPhone).replace(/[—–]/g, '-'), W - padX, contactY, contentW * 0.44);
  }
  ctx.restore();
}
