/* Service Banner Canvas Renderer
 * Renders bold, impactful high-resolution 2D banners for social media and advertising.
 * Typography: Medeo Sans from Thin (100) to Black (900).
 * Dynamic vertical space distribution: automatically fills the banner with balanced spacing.
 * Clean custom photo placement without dark backing / overlay.
 */

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

export function renderServiceBanner(canvas, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    format = { w: 1080, h: 1920, id: 'story' },
    theme = {},
    serviceTitle = 'Продажа недвижимости',
    badgeText = 'ВЫГОДНО И БЫСТРО',
    slogan = 'Продам вашу квартиру дороже и быстрее, чем вы ожидаете',
    bullets = [],
    ctaText = 'Получить бесплатную консультацию',
    agentName = 'Александр Ельчугин',
    agentPhone = '8 (909) 130-40-90',
    accentColor = '#0052FF',
    layoutMode = 'expert',
    bgImage = null,
    agentPhoto = null,
    photoPlacement = 'side',   // 'side' | 'background' | 'circle' | 'none'
    noDarkOverlay = true,     // Clean natural photo without dark underlay
    sloganWeight = 900,       // Medeo Sans weight (100 to 900)
    showBullets = true,
    showBadge = true
  } = options;

  const W = format.w;
  const H = format.h;
  const isStory = format.id === 'story' || H >= W * 1.5;
  const isHorizontal = W > H;
  const isCompactSquare = W === H;

  // Set internal canvas resolution
  canvas.width = W;
  canvas.height = H;

  const colors = theme.bgColors || ['#0B0F19', '#111827', '#1E293B'];
  const textColor = theme.textColor || '#FFFFFF';
  const subTextColor = theme.subTextColor || '#94A3B8';
  const cardBg = theme.cardBg || 'rgba(255, 255, 255, 0.08)';
  const cardBorder = theme.cardBorder || 'rgba(255, 255, 255, 0.14)';
  const badgeColor = theme.badgeColor || '#60A5FA';
  const badgeBg = theme.badgeBg || 'rgba(0, 82, 255, 0.25)';
  const ctaBg = theme.ctaBg || accentColor || '#0052FF';
  const ctaColor = theme.ctaColor || '#FFFFFF';

  const hasSidePhoto = agentPhoto && agentPhoto.complete && agentPhoto.naturalWidth > 0 && photoPlacement === 'side';
  const hasBgPhoto = (agentPhoto && photoPlacement === 'background') || (bgImage && bgImage.complete && bgImage.naturalWidth > 0);
  const activeBgImg = (photoPlacement === 'background' && agentPhoto) ? agentPhoto : bgImage;

  // 1. Background rendering
  ctx.save();
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, colors[0]);
  if (colors.length > 2) {
    bgGrad.addColorStop(0.5, colors[1]);
    bgGrad.addColorStop(1, colors[2]);
  } else {
    bgGrad.addColorStop(1, colors[1] || colors[0]);
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Background Image overlay
  if (hasBgPhoto && activeBgImg && activeBgImg.complete && activeBgImg.naturalWidth > 0) {
    ctx.save();
    // When noDarkOverlay is true, photo displays in clean natural colors without dark underlay
    ctx.globalAlpha = noDarkOverlay ? 0.95 : 0.28;

    const hRatio = W / activeBgImg.naturalWidth;
    const vRatio = H / activeBgImg.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (W - activeBgImg.naturalWidth * ratio) / 2;
    const centerShiftY = (H - activeBgImg.naturalHeight * ratio) / 2;
    ctx.drawImage(
      activeBgImg,
      0, 0, activeBgImg.naturalWidth, activeBgImg.naturalHeight,
      centerShiftX, centerShiftY, activeBgImg.naturalWidth * ratio, activeBgImg.naturalHeight * ratio
    );
    ctx.restore();

    // Only apply tint if user turned off noDarkOverlay
    if (!noDarkOverlay) {
      const tintGrad = ctx.createLinearGradient(0, 0, 0, H);
      tintGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      tintGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
      tintGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = tintGrad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Radial ambient glow for depth
  const glowX = isHorizontal ? W * 0.75 : W * 0.82;
  const glowY = isHorizontal ? H * 0.35 : H * 0.28;
  const glowRad = ctx.createRadialGradient(glowX, glowY, 40, glowX, glowY, W * 0.65);
  glowRad.addColorStop(0, theme.glowColor || 'rgba(0, 82, 255, 0.35)');
  glowRad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowRad;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // Draw Side Custom Photo without any dark backing
  if (hasSidePhoto) {
    ctx.save();
    // 100% natural photo without dark backing
    const maxPhotoW = isHorizontal ? W * 0.38 : isStory ? W * 0.45 : W * 0.38;
    const photoRatio = agentPhoto.naturalWidth / agentPhoto.naturalHeight;
    let photoW = maxPhotoW;
    let photoH = photoW / photoRatio;

    const maxPhotoH = isStory ? H * 0.72 : H * 0.78;
    if (photoH > maxPhotoH) {
      photoH = maxPhotoH;
      photoW = photoH * photoRatio;
    }

    const photoX = W - photoW - (isHorizontal ? 36 : 16);
    const photoY = H - photoH - (isStory ? 70 : 40);

    // Natural subtle drop shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;

    ctx.drawImage(agentPhoto, 0, 0, agentPhoto.naturalWidth, agentPhoto.naturalHeight, photoX, photoY, photoW, photoH);
    ctx.restore();
  }

  // Draw Circle Photo if circle mode is selected
  if (photoPlacement === 'circle' && agentPhoto && agentPhoto.complete && agentPhoto.naturalWidth > 0) {
    ctx.save();
    const circleR = isStory ? 76 : 58;
    const circleX = W - (isHorizontal ? 80 : 64) - circleR;
    const circleY = isStory ? 120 : 88;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(agentPhoto, circleX - circleR, circleY - circleR, circleR * 2, circleR * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Dynamic Vertical Layout & Space Distribution
  const paddingX = isHorizontal ? 80 : 64;
  const contentWidth = hasSidePhoto
    ? W - paddingX - (W * 0.43)
    : isHorizontal
      ? W * 0.68
      : W - paddingX * 2;

  const topPad = isStory ? 100 : isCompactSquare ? 52 : 68;
  const bottomPad = isStory ? 90 : isCompactSquare ? 52 : 64;
  const phoneH = isStory ? 52 : 40;
  const availableContentH = H - topPad - bottomPad - phoneH - 30;

  // Measure Elements with Medeo Sans
  let badgeH = 0;
  const badgeFontSize = isStory ? 22 : 18;
  if (showBadge && badgeText) {
    badgeH = isStory ? 48 : 42;
  }

  // Service Title: SemiBold (600) / Bold (700)
  const serviceFontSize = isStory ? 48 : isHorizontal ? 38 : isCompactSquare ? 34 : 42;
  const titleH = serviceFontSize;

  // Slogan: user chosen weight or Black (900)
  const weight = sloganWeight || 900;
  let sloganFontSize = isStory ? 82 : isHorizontal ? 58 : isCompactSquare ? 52 : 68;
  ctx.font = `${weight} ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  let sloganLines = wrapText(ctx, slogan, contentWidth);

  // Bullets: Medium (500) / Regular (400)
  const bulletFontSize = isStory ? 32 : isHorizontal ? 24 : isCompactSquare ? 22 : 26;
  const bulletLineHeight = bulletFontSize * 1.35;
  const visibleBullets = isCompactSquare ? bullets.slice(0, 2) : bullets.slice(0, 3);
  let bulletsTotalH = 0;

  if (showBullets && visibleBullets.length > 0) {
    visibleBullets.forEach(b => {
      ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
      const bLines = wrapText(ctx, b, contentWidth - 80);
      const cardPad = layoutMode === 'cards' ? (isStory ? 38 : 28) : 0;
      bulletsTotalH += bLines.length * bulletLineHeight + cardPad + (isStory ? 18 : 12);
    });
  }

  // CTA button: Black (900)
  let ctaH = 0;
  const ctaFontSize = isStory ? 32 : isHorizontal ? 26 : isCompactSquare ? 24 : 28;
  if (ctaText) {
    ctaH = isStory ? 88 : isHorizontal ? 68 : isCompactSquare ? 64 : 76;
  }

  // Calculate Base Content Height and Remaining Extra Space
  let sloganLineHeight = sloganFontSize * 1.22;
  let sloganTotalH = sloganLines.length * sloganLineHeight;
  let totalContentH = badgeH + titleH + sloganTotalH + bulletsTotalH + ctaH;
  let remainingSpace = availableContentH - totalContentH;

  // If ample extra space on banner, dynamically expand typography and spacing
  if (remainingSpace > 160 && isStory) {
    sloganFontSize = Math.min(94, sloganFontSize + Math.floor(remainingSpace * 0.04));
    sloganLineHeight = sloganFontSize * 1.22;
    ctx.font = `${weight} ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
    sloganLines = wrapText(ctx, slogan, contentWidth);
    sloganTotalH = sloganLines.length * sloganLineHeight;
    totalContentH = badgeH + titleH + sloganTotalH + bulletsTotalH + ctaH;
    remainingSpace = availableContentH - totalContentH;
  }

  // Dynamically calculate gaps between sections so banner is completely filled
  const gapsCount = (showBadge ? 1 : 0) + 1 + 1 + (showBullets ? 1 : 0) + 1; // 4 to 5 gaps
  const dynamicGap = Math.max(isStory ? 32 : 16, Math.min(isStory ? 92 : 46, Math.floor(remainingSpace / gapsCount)));

  let cursorY = topPad;

  // 3. Render Top Badge (Medeo Sans ExtraBold 800)
  if (showBadge && badgeText) {
    ctx.save();
    ctx.font = `800 ${badgeFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const badgeMetrics = ctx.measureText(badgeText.toUpperCase());
    const badgeW = badgeMetrics.width + 42;

    safeRoundRect(ctx, paddingX, cursorY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.badgeBorder || 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.fillText(badgeText.toUpperCase(), paddingX + 21, cursorY + badgeH / 2 + badgeFontSize * 0.35);
    ctx.restore();

    cursorY += badgeH + dynamicGap;
  }

  // 4. Render Service Title (Medeo Sans SemiBold 600 / Bold 700)
  ctx.save();
  ctx.font = `700 ${serviceFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.letterSpacing = '1.5px';
  ctx.fillText(serviceTitle.toUpperCase(), paddingX, cursorY + serviceFontSize * 0.8);
  cursorY += titleH + dynamicGap;
  ctx.restore();

  // 5. Render Large Hero Slogan (Medeo Sans Black 900)
  ctx.save();
  ctx.font = `${weight} ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = textColor;

  sloganLines.forEach((line) => {
    ctx.fillText(line, paddingX, cursorY + sloganFontSize * 0.85);
    cursorY += sloganLineHeight;
  });
  cursorY += dynamicGap;
  ctx.restore();

  // 6. Render Benefits / Bullets (Medeo Sans Medium 500 / Regular 400)
  if (showBullets && visibleBullets.length > 0) {
    if (layoutMode === 'cards') {
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 100);
        const cardH = bulletLines.length * bulletLineHeight + (isStory ? 38 : 28);

        safeRoundRect(ctx, paddingX, cursorY, contentWidth, cardH, 18);
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

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(circleX - 6, circleY);
        ctx.lineTo(circleX - 1, circleY + 5);
        ctx.lineTo(circleX + 7, circleY - 5);
        ctx.stroke();

        ctx.fillStyle = textColor;
        let bTextY = cursorY + (isStory ? 32 : 24);
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, circleX + circleRadius + 18, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += cardH + (isStory ? 16 : 10);
        ctx.restore();
      });
      cursorY += dynamicGap;
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

        ctx.fillStyle = subTextColor;
        let bTextY = cursorY + bulletFontSize * 0.75;
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, paddingX + dotRadius * 2 + 20, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += bulletLines.length * bulletLineHeight + (isStory ? 18 : 10);
        ctx.restore();
      });
      cursorY += dynamicGap;
    }
  }

  // 7. Render CTA Button (Medeo Sans Black 900)
  if (ctaText) {
    ctx.save();
    ctx.font = `900 ${ctaFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const ctaMetrics = ctx.measureText(ctaText);
    const ctaW = Math.min(contentWidth, ctaMetrics.width + (isStory ? 100 : 80));

    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;

    safeRoundRect(ctx, paddingX, cursorY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = ctaBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.fillStyle = ctaColor;
    ctx.fillText(ctaText, paddingX + 36, cursorY + ctaH / 2 + ctaFontSize * 0.32);

    const arrowX = paddingX + ctaW - 42;
    const arrowY = cursorY + ctaH / 2;
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

  // 8. Contact Phone Line (Medeo Sans Thin 200 label + Black 900 phone)
  if (agentPhone) {
    ctx.save();
    const phoneY = H - bottomPad;
    const phoneFontSize = isStory ? 40 : isHorizontal ? 32 : isCompactSquare ? 28 : 34;
    const labelFontSize = isStory ? 24 : isHorizontal ? 20 : isCompactSquare ? 18 : 22;

    const iconR = isStory ? 20 : 16;
    const iconX = paddingX + iconR;

    ctx.beginPath();
    ctx.arc(iconX, phoneY - iconR / 2, iconR, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const px = iconX;
    const py = phoneY - iconR / 2;
    ctx.arc(px, py - 2, iconR * 0.35, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();
    ctx.restore();

    const textStartX = iconX + iconR + 16;

    // Medeo Sans ExtraLight (200) label
    ctx.font = `200 ${labelFontSize}px "Medeo Sans", system-ui, sans-serif`;
    ctx.fillStyle = subTextColor;
    const labelText = 'Тел. для связи: ';
    ctx.fillText(labelText, textStartX, phoneY);

    const labelWidth = ctx.measureText(labelText).width;

    // Medeo Sans Black (900) phone number
    ctx.font = `900 ${phoneFontSize}px "Medeo Sans", system-ui, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(agentPhone, textStartX + labelWidth, phoneY);

    // Optional Agent Name alongside phone (Medeo Sans Regular 400)
    if (agentName && !isCompactSquare && !hasSidePhoto) {
      const phoneWidth = ctx.measureText(agentPhone).width;
      const agentStartX = textStartX + labelWidth + phoneWidth + 24;
      if (agentStartX + 200 < W - paddingX) {
        ctx.font = `400 ${labelFontSize}px "Medeo Sans", system-ui, sans-serif`;
        ctx.fillStyle = subTextColor;
        ctx.fillText(`• ${agentName}`, agentStartX, phoneY);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}
