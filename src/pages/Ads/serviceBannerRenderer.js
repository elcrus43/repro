/* Service Banner Canvas Renderer
 * 2-Part Split Layout:
 *   Top: User's picture / background texture in clean natural colors.
 *   Transition: Smooth 0% to 100% transparency gradient into dark or light bottom.
 *   Bottom: Hero slogan, key benefits, CTA near phone line, and contact phone.
 * Typography: Medeo Sans from Thin (100) to Black (900).
 */

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

  return lines;
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const hRatio = w / iw;
  const vRatio = h / ih;
  const ratio = Math.max(hRatio, vRatio);
  const shiftX = x + (w - iw * ratio) / 2;
  const shiftY = y + (h - ih * ratio) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, 0, 0, iw, ih, shiftX, shiftY, iw * ratio, ih * ratio);
  ctx.restore();
}

export function renderServiceBanner(canvas, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    format = { w: 1080, h: 1920, id: 'story' },
    bottomTone = 'dark',      // 'dark' | 'light'
    badgeText = 'ВЫГОДНО И БЫСТРО',
    slogan = 'Продам вашу квартиру дороже и быстрее, чем вы ожидаете',
    bullets = [],
    ctaText = 'Получить бесплатную консультацию',
    agentPhone = '8 (909) 130-40-90',
    accentColor = '#0052FF',
    layoutMode = 'expert',
    bgImage = null,
    agentPhoto = null,
    photoPlacement = 'side',
    sloganWeight = 900,
    sloganScale = 100,
    bulletScale = 100,
    sloganColor = '',
    bulletColor = '',
    phoneColor = '',
    textBackdrop = 'none',
    showBullets = true,
    showBadge = true
  } = options;

  const W = format.w;
  const H = format.h;
  const isStory = format.id === 'story' || H >= W * 1.5;
  const isHorizontal = W > H;
  const isCompactSquare = W === H;

  canvas.width = W;
  canvas.height = H;

  const isLightBottom = bottomTone === 'light';
  const toneBg = isLightBottom ? '#FFFFFF' : '#0B0F19';
  const toneRgb = isLightBottom ? '255, 255, 255' : '11, 15, 25';
  const textColor = isLightBottom ? '#0F172A' : '#FFFFFF';
  const subTextColor = isLightBottom ? '#334155' : '#CBD5E1';
  const cardBg = isLightBottom ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.08)';
  const cardBorder = isLightBottom ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.15)';
  const ctaBg = accentColor || '#0052FF';
  const ctaColor = (accentColor || '').toUpperCase() === '#FACC15' ? '#0F172A' : '#FFFFFF';

  const hasBgImg = bgImage && bgImage.complete && bgImage.naturalWidth > 0;
  const hasAgentPhoto = agentPhoto && agentPhoto.complete && agentPhoto.naturalWidth > 0 && photoPlacement !== 'none';
  const topPhotoImg = hasBgImg ? bgImage : (hasAgentPhoto ? agentPhoto : null);

  // 1. Measure Layout & Typography
  const paddingX = isHorizontal ? 80 : 64;
  const contentWidth = W - paddingX * 2;
  const topPad = isStory ? 84 : isCompactSquare ? 48 : 64;
  const bottomPad = isStory ? 84 : isCompactSquare ? 48 : 60;

  const badgeFontSize = isStory ? 30 : isCompactSquare ? 22 : 26;
  const badgeH = (showBadge && badgeText) ? (isStory ? 64 : isCompactSquare ? 50 : 56) : 0;

  const weight = sloganWeight || 900;
  const sScale = Math.max(0.5, Math.min(2.0, (sloganScale || 100) / 100));
  const sloganFontSize = Math.round((isStory ? 80 : isHorizontal ? 58 : isCompactSquare ? 50 : 68) * sScale);
  const sloganLineHeight = sloganFontSize * 1.20;
  ctx.font = `${weight} ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  const sloganLines = wrapText(ctx, slogan, contentWidth);
  const sloganTotalH = sloganLines.length * sloganLineHeight;

  const bScale = Math.max(0.5, Math.min(2.0, (bulletScale || 100) / 100));
  const bulletFontSize = Math.round((isStory ? 32 : isHorizontal ? 24 : isCompactSquare ? 22 : 26) * bScale);
  const bulletLineHeight = bulletFontSize * 1.32;
  const visibleBullets = isCompactSquare ? bullets.slice(0, 2) : bullets.slice(0, 4);
  const hasVisibleBullets = showBullets && visibleBullets.length > 0;
  let bulletsTotalH = 0;

  if (hasVisibleBullets) {
    visibleBullets.forEach((b) => {
      ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
      const bLines = wrapText(ctx, b, contentWidth - 90);
      const cardPad = layoutMode === 'cards' ? (isStory ? 34 : 24) : 0;
      bulletsTotalH += bLines.length * bulletLineHeight + cardPad + (isStory ? 16 : 10);
    });
  }

  const phoneFontSize = isStory ? 36 : isHorizontal ? 30 : isCompactSquare ? 26 : 30;
  const ctaFontSize = isStory ? 32 : isHorizontal ? 26 : isCompactSquare ? 24 : 28;
  const ctaH = ctaText ? (isStory ? 84 : isHorizontal ? 66 : isCompactSquare ? 62 : 74) : 0;
  const ctaPhoneGap = isStory ? 30 : isHorizontal ? 20 : isCompactSquare ? 18 : 24;
  const phoneY = H - bottomPad;
  const anchoredCtaY = ctaText ? (phoneY - phoneFontSize - ctaPhoneGap - ctaH) : (phoneY - phoneFontSize);

  const sloganToBulletsGap = isStory ? 34 : isCompactSquare ? 18 : 26;
  const bulletsToCtaGap = isStory ? 44 : isCompactSquare ? 24 : 32;
  const textBlockH = sloganTotalH + (hasVisibleBullets ? sloganToBulletsGap + bulletsTotalH : 0);

  const minUpperLimit = topPad + (badgeH > 0 ? badgeH + (isStory ? 40 : 24) : 0);
  const idealSloganStartY = anchoredCtaY - bulletsToCtaGap - textBlockH;
  const sloganStartY = Math.max(minUpperLimit, idealSloganStartY);

  // 2. Render 2-Part Split Background:
  //    Top part = User's photo / texture (100% crisp, no dark overlay)
  //    Smooth 0% -> 100% transparency gradient into dark or light bottom background
  ctx.save();
  ctx.fillStyle = toneBg;
  ctx.fillRect(0, 0, W, H);

  const topPhotoZoneH = Math.min(H, Math.max(H * 0.45, sloganStartY + (isStory ? 110 : 70)));

  if (topPhotoImg) {
    drawCoverImage(ctx, topPhotoImg, 0, 0, W, topPhotoZoneH);
  } else {
    // Rich ambient gradient if no image or texture is selected
    const topGrad = ctx.createLinearGradient(0, 0, W, topPhotoZoneH);
    topGrad.addColorStop(0, isLightBottom ? '#E2E8F0' : '#0F172A');
    topGrad.addColorStop(0.55, hexToRgba(accentColor, isLightBottom ? 0.25 : 0.45));
    topGrad.addColorStop(1, isLightBottom ? '#CBD5E1' : '#1E293B');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, topPhotoZoneH);
  }

  // Smooth 0% -> 100% vertical transparency gradient into bottom tone
  const fadeHeight = isStory ? 280 : isCompactSquare ? 160 : 200;
  const fadeStartY = Math.max(0, sloganStartY - fadeHeight);
  const fadeEndY = Math.min(H, sloganStartY + (isStory ? 40 : 20));

  const fadeGrad = ctx.createLinearGradient(0, fadeStartY, 0, fadeEndY);
  fadeGrad.addColorStop(0.0, `rgba(${toneRgb}, 0)`);
  fadeGrad.addColorStop(0.28, `rgba(${toneRgb}, 0.24)`);
  fadeGrad.addColorStop(0.58, `rgba(${toneRgb}, 0.65)`);
  fadeGrad.addColorStop(0.84, `rgba(${toneRgb}, 0.92)`);
  fadeGrad.addColorStop(1.0, `rgba(${toneRgb}, 1)`);

  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, fadeStartY, W, fadeEndY - fadeStartY);

  // Solid 100% bottom zone
  ctx.fillStyle = toneBg;
  ctx.fillRect(0, fadeEndY, W, H - fadeEndY);
  ctx.restore();

  // 3. Render Enlarged Top Badge in Upper Photo Zone
  if (showBadge && badgeText) {
    ctx.save();
    ctx.font = `900 ${badgeFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const badgeMetrics = ctx.measureText(badgeText.toUpperCase());
    const badgeW = badgeMetrics.width + 56;

    safeRoundRect(ctx, paddingX, topPad, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = ctaBg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = ctaColor;
    ctx.fillText(badgeText.toUpperCase(), paddingX + 28, topPad + badgeH / 2 + badgeFontSize * 0.35);
    ctx.restore();
  }

  // 4. Optional Translucent Text Backdrop behind Slogan + Bullets
  let cursorY = sloganStartY;
  if (textBackdrop && textBackdrop !== 'none') {
    ctx.save();
    const padX = isStory ? 28 : 20;
    const padY = isStory ? 22 : 14;
    const backdropX = Math.max(24, paddingX - padX);
    const backdropY = cursorY - padY;
    const backdropW = Math.min(W - backdropX - 24, contentWidth + padX * 2);
    const backdropH = textBlockH + padY * 2;

    safeRoundRect(ctx, backdropX, backdropY, backdropW, backdropH, isStory ? 26 : 18);
    if (textBackdrop === 'light_glass') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
    } else if (textBackdrop === 'accent_tint') {
      ctx.fillStyle = hexToRgba(accentColor, 0.25);
      ctx.strokeStyle = hexToRgba(accentColor, 0.55);
    } else {
      ctx.fillStyle = 'rgba(10, 15, 28, 0.68)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    }
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // 5. Render Hero Slogan (Medeo Sans)
  ctx.save();
  ctx.font = `${weight} ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = sloganColor || textColor;

  sloganLines.forEach((line) => {
    ctx.fillText(line, paddingX, cursorY + sloganFontSize * 0.85);
    cursorY += sloganLineHeight;
  });
  cursorY += hasVisibleBullets ? sloganToBulletsGap : 0;
  ctx.restore();

  // 6. Render Benefits / Bullets
  if (hasVisibleBullets) {
    if (layoutMode === 'cards') {
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 100);
        const cardH = bulletLines.length * bulletLineHeight + (isStory ? 34 : 24);

        safeRoundRect(ctx, paddingX, cursorY, contentWidth, cardH, 16);
        ctx.fillStyle = cardBg;
        ctx.fill();
        ctx.strokeStyle = cardBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const circleRadius = isStory ? 18 : 14;
        const circleX = paddingX + circleRadius + 16;
        const circleY = cursorY + cardH / 2;

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.strokeStyle = ctaColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(circleX - 6, circleY);
        ctx.lineTo(circleX - 1, circleY + 5);
        ctx.lineTo(circleX + 7, circleY - 5);
        ctx.stroke();

        ctx.fillStyle = bulletColor || textColor;
        let bTextY = cursorY + (isStory ? 30 : 22);
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, circleX + circleRadius + 18, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += cardH + (isStory ? 14 : 10);
        ctx.restore();
      });
    } else {
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `400 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 60);

        const dotRadius = isStory ? 8 : 6;
        ctx.beginPath();
        ctx.arc(paddingX + dotRadius + 4, cursorY + bulletFontSize * 0.45, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.fillStyle = bulletColor || subTextColor;
        let bTextY = cursorY + bulletFontSize * 0.75;
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, paddingX + dotRadius * 2 + 20, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += bulletLines.length * bulletLineHeight + (isStory ? 16 : 10);
        ctx.restore();
      });
    }
  }

  // 7. Render CTA Button (Anchored close to contact phone line)
  if (ctaText) {
    const finalCtaY = Math.max(anchoredCtaY, cursorY + (isStory ? 20 : 12));
    ctx.save();
    ctx.font = `900 ${ctaFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const ctaMetrics = ctx.measureText(ctaText);
    const ctaW = Math.min(contentWidth, ctaMetrics.width + (isStory ? 100 : 80));

    ctx.shadowColor = hexToRgba(accentColor, 0.45);
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    safeRoundRect(ctx, paddingX, finalCtaY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = ctaBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.fillStyle = ctaColor;
    ctx.fillText(ctaText, paddingX + 36, finalCtaY + ctaH / 2 + ctaFontSize * 0.32);

    const arrowX = paddingX + ctaW - 42;
    const arrowY = finalCtaY + ctaH / 2;
    ctx.strokeStyle = ctaColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(arrowX - 12, arrowY);
    ctx.lineTo(arrowX + 4, arrowY);
    ctx.lineTo(arrowX - 2, arrowY - 7);
    ctx.moveTo(arrowX + 4, arrowY);
    ctx.lineTo(arrowX - 2, arrowY + 7);
    ctx.stroke();

    ctx.restore();
  }

  // 8. Contact Phone Line (UNIFIED font, size, weight: Medeo Sans 800)
  if (agentPhone) {
    ctx.save();

    const iconR = isStory ? 20 : 16;
    const iconX = paddingX + iconR;

    ctx.beginPath();
    ctx.arc(iconX, phoneY - iconR / 2, iconR, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = ctaColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const px = iconX;
    const py = phoneY - iconR / 2;
    ctx.arc(px, py - 2, iconR * 0.35, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();
    ctx.restore();

    const textStartX = iconX + iconR + 18;

    ctx.font = `800 ${phoneFontSize}px "Medeo Sans", system-ui, sans-serif`;
    ctx.fillStyle = phoneColor || textColor;

    const phoneStr = agentPhone.startsWith('+') ? agentPhone : (agentPhone.startsWith('8') ? agentPhone.replace(/^8/, '+7') : `+7 ${agentPhone}`);
    const fullContactLine = `Тел. для связи: ${phoneStr}`;
    ctx.fillText(fullContactLine, textStartX, phoneY);

    ctx.restore();
  }
}
