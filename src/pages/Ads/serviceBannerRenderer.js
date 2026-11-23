/* Service Banner Canvas Renderer
 * Renders pixel-perfect, high-resolution 2D banners for social media and advertising.
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
    agentRole = 'Эксперт по недвижимости',
    agencyName = 'REA CRM',
    accentColor = '#0052FF',
    layoutMode = 'expert',
    bgImage = null,
    agentPhoto = null,
    showAgent = true,
    showBullets = true,
    showBadge = true
  } = options;

  const W = format.w;
  const H = format.h;
  const isHorizontal = W > H;
  const isCompactSquare = W === H;

  // Set internal resolution
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

  // 1. Background drawing
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

  // Background Image overlay if provided
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    // Cover scale
    const hRatio = W / bgImage.naturalWidth;
    const vRatio = H / bgImage.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (W - bgImage.naturalWidth * ratio) / 2;
    const centerShiftY = (H - bgImage.naturalHeight * ratio) / 2;
    ctx.drawImage(
      bgImage,
      0, 0, bgImage.naturalWidth, bgImage.naturalHeight,
      centerShiftX, centerShiftY, bgImage.naturalWidth * ratio, bgImage.naturalHeight * ratio
    );
    ctx.restore();

    // Darkening tint gradient over image
    const tintGrad = ctx.createLinearGradient(0, 0, 0, H);
    tintGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    tintGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
    tintGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = tintGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Radial ambient glow
  const glowX = isHorizontal ? W * 0.75 : W * 0.85;
  const glowY = isHorizontal ? H * 0.35 : H * 0.25;
  const glowRad = ctx.createRadialGradient(glowX, glowY, 40, glowX, glowY, W * 0.6);
  glowRad.addColorStop(0, theme.glowColor || 'rgba(0, 82, 255, 0.35)');
  glowRad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowRad;
  ctx.fillRect(0, 0, W, H);

  // Decorative subtle architectural lines / grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
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

  // Layout boundaries
  const paddingX = isHorizontal ? 80 : 64;
  const contentWidth = isHorizontal ? W * 0.58 : W - paddingX * 2;
  let cursorY = isHorizontal ? 60 : 72;

  // 2. Top Header Brand Bar
  ctx.save();
  // Agency Brand Name
  ctx.font = '700 24px "Medeo Sans", system-ui, sans-serif';
  ctx.fillStyle = textColor;
  ctx.letterSpacing = '2px';
  ctx.fillText(agencyName.toUpperCase(), paddingX, cursorY + 16);

  // Decorative brand indicator dot
  ctx.beginPath();
  ctx.arc(paddingX + ctx.measureText(agencyName.toUpperCase()).width + 16, cursorY + 8, 4, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Agency sub-tag
  ctx.font = '500 16px "Medeo Sans", system-ui, sans-serif';
  ctx.fillStyle = subTextColor;
  ctx.letterSpacing = '1px';
  ctx.fillText('НЕДВИЖИМОСТЬ & ИПОТЕКА', paddingX + ctx.measureText(agencyName.toUpperCase()).width + 30, cursorY + 14);
  ctx.restore();

  cursorY += 56;

  // 3. Badge Pill
  if (showBadge && badgeText) {
    ctx.save();
    ctx.font = '700 18px "Medeo Sans", system-ui, sans-serif';
    const badgeMetrics = ctx.measureText(badgeText.toUpperCase());
    const badgeW = badgeMetrics.width + 36;
    const badgeH = 40;

    safeRoundRect(ctx, paddingX, cursorY, badgeW, badgeH, 20);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.badgeBorder || 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.fillText(badgeText.toUpperCase(), paddingX + 18, cursorY + 26);
    ctx.restore();

    cursorY += badgeH + 28;
  } else {
    cursorY += 12;
  }

  // 4. Service Category Title (e.g. "ПРОДАЖА КВАРТИРЫ")
  ctx.save();
  const serviceFontSize = isHorizontal ? 32 : isCompactSquare ? 30 : 36;
  ctx.font = `600 ${serviceFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.letterSpacing = '1.5px';
  ctx.fillText(serviceTitle.toUpperCase(), paddingX, cursorY + serviceFontSize * 0.8);
  cursorY += serviceFontSize + 20;
  ctx.restore();

  // 5. Main Power Slogan (Bold Hero Headline)
  ctx.save();
  const sloganFontSize = isHorizontal ? 48 : isCompactSquare ? 42 : 54;
  const sloganLineHeight = sloganFontSize * 1.22;
  ctx.font = `800 ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = textColor;

  const sloganLines = wrapText(ctx, slogan, contentWidth);
  const maxLines = isCompactSquare ? 3 : 4;
  sloganLines.slice(0, maxLines).forEach((line) => {
    ctx.fillText(line, paddingX, cursorY + sloganFontSize * 0.85);
    cursorY += sloganLineHeight;
  });
  cursorY += 24;
  ctx.restore();

  // 6. Benefits / Bullets
  if (showBullets && bullets && bullets.length > 0) {
    const bulletFontSize = isHorizontal ? 22 : isCompactSquare ? 20 : 24;
    const bulletLineHeight = bulletFontSize * 1.35;
    const visibleBullets = isCompactSquare ? bullets.slice(0, 2) : bullets.slice(0, 3);

    if (layoutMode === 'cards') {
      // Card style benefits
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 80);
        const cardH = bulletLines.length * bulletLineHeight + 28;

        safeRoundRect(ctx, paddingX, cursorY, contentWidth, cardH, 16);
        ctx.fillStyle = cardBg;
        ctx.fill();
        ctx.strokeStyle = cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon check circle
        ctx.beginPath();
        ctx.arc(paddingX + 28, cursorY + cardH / 2, 12, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Checkmark tick in white
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(paddingX + 23, cursorY + cardH / 2);
        ctx.lineTo(paddingX + 27, cursorY + cardH / 2 + 4);
        ctx.lineTo(paddingX + 34, cursorY + cardH / 2 - 4);
        ctx.stroke();

        ctx.fillStyle = textColor;
        let bTextY = cursorY + 24;
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, paddingX + 54, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += cardH + 14;
        ctx.restore();
      });
      cursorY += 16;
    } else {
      // Classic sleek bullet list
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `500 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 50);

        // Bullet indicator dot with glow
        ctx.beginPath();
        ctx.arc(paddingX + 12, cursorY + bulletFontSize * 0.5, 6, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.fillStyle = subTextColor;
        let bTextY = cursorY + bulletFontSize * 0.75;
        bulletLines.forEach((bLine) => {
          ctx.fillText(bLine, paddingX + 34, bTextY);
          bTextY += bulletLineHeight;
        });

        cursorY += bulletLines.length * bulletLineHeight + 12;
        ctx.restore();
      });
      cursorY += 16;
    }
  }

  // 7. Call To Action (CTA) Button
  if (ctaText) {
    ctx.save();
    const ctaFontSize = isHorizontal ? 24 : isCompactSquare ? 22 : 26;
    ctx.font = `700 ${ctaFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const ctaMetrics = ctx.measureText(ctaText);
    const ctaW = Math.min(contentWidth, ctaMetrics.width + 80);
    const ctaH = isHorizontal ? 64 : isCompactSquare ? 58 : 72;

    // Button Glow shadow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;

    safeRoundRect(ctx, paddingX, cursorY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = ctaBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // CTA Text
    ctx.fillStyle = ctaColor;
    ctx.fillText(ctaText, paddingX + 32, cursorY + ctaH / 2 + ctaFontSize * 0.32);

    // Arrow icon ->
    const arrowX = paddingX + ctaW - 36;
    const arrowY = cursorY + ctaH / 2;
    ctx.strokeStyle = ctaColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arrowX - 10, arrowY);
    ctx.lineTo(arrowX + 2, arrowY);
    ctx.lineTo(arrowX - 3, arrowY - 6);
    ctx.moveTo(arrowX + 2, arrowY);
    ctx.lineTo(arrowX - 3, arrowY + 6);
    ctx.stroke();

    ctx.restore();
    cursorY += ctaH + 32;
  }

  // 8. Agent / Realtor Card
  if (showAgent && (agentName || agentPhone)) {
    ctx.save();
    let cardX = paddingX;
    let cardY = H - (isHorizontal ? 130 : isCompactSquare ? 140 : 180);
    let cardW = isHorizontal ? W * 0.36 : W - paddingX * 2;
    let cardH = isHorizontal ? 100 : isCompactSquare ? 110 : 130;

    if (isHorizontal) {
      // Place in right bottom quadrant
      cardX = W - cardW - paddingX;
      cardY = H - cardH - 60;
    }

    // Glass Card Background
    safeRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fillStyle = cardBg;
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let textOffsetX = cardX + 28;

    // Avatar / Photo
    const avatarSize = cardH - 36;
    const avatarX = cardX + 20;
    const avatarY = cardY + 18;

    if (agentPhoto && agentPhoto.complete && agentPhoto.naturalWidth > 0) {
      // Draw circular photo
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(agentPhoto, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Circle border
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      textOffsetX = avatarX + avatarSize + 22;
    } else {
      // Initials Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();

      const initials = (agentName || 'R')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      ctx.font = `700 ${avatarSize * 0.42}px "Medeo Sans", system-ui, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 1);
      ctx.restore();

      textOffsetX = avatarX + avatarSize + 22;
    }

    // Agent Name
    ctx.font = '700 24px "Medeo Sans", system-ui, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(agentName || 'Специалист по недвижимости', textOffsetX, cardY + 36);

    // Agent Role
    ctx.font = '500 16px "Medeo Sans", system-ui, sans-serif';
    ctx.fillStyle = subTextColor;
    ctx.fillText(agentRole, textOffsetX, cardY + 60);

    // Phone with Icon
    if (agentPhone) {
      ctx.font = '700 20px "Medeo Sans", system-ui, sans-serif';
      ctx.fillStyle = accentColor;
      ctx.fillText(agentPhone, textOffsetX, cardY + 86);
    }

    ctx.restore();
  }

  ctx.restore();
}
