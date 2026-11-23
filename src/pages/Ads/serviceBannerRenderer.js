/* Service Banner Canvas Renderer
 * Renders bold, impactful high-resolution 2D banners for social media and advertising.
 * Large hero typography filling the banner, clean bottom phone contact, no bulky headers/footers.
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
    showBullets = true,
    showBadge = true
  } = options;

  const W = format.w;
  const H = format.h;
  const isStory = format.id === 'story' || H >= W * 1.5;
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

  // Radial ambient glow for depth
  const glowX = isHorizontal ? W * 0.75 : W * 0.82;
  const glowY = isHorizontal ? H * 0.35 : H * 0.28;
  const glowRad = ctx.createRadialGradient(glowX, glowY, 40, glowX, glowY, W * 0.65);
  glowRad.addColorStop(0, theme.glowColor || 'rgba(0, 82, 255, 0.35)');
  glowRad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowRad;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative geometric lines
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

  // Layout Boundaries: Text takes the full banner space
  const paddingX = isHorizontal ? 80 : 64;
  const contentWidth = isHorizontal ? W * 0.62 : W - paddingX * 2;
  let cursorY = isStory ? 90 : isCompactSquare ? 56 : 70;

  // 2. Top Badge (e.g. "ВЫГОДНО И БЫСТРО")
  if (showBadge && badgeText) {
    ctx.save();
    const badgeFontSize = isStory ? 22 : 18;
    ctx.font = `800 ${badgeFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const badgeMetrics = ctx.measureText(badgeText.toUpperCase());
    const badgeW = badgeMetrics.width + 40;
    const badgeH = isStory ? 48 : 42;

    safeRoundRect(ctx, paddingX, cursorY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.badgeBorder || 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.fillText(badgeText.toUpperCase(), paddingX + 20, cursorY + badgeH / 2 + badgeFontSize * 0.35);
    ctx.restore();

    cursorY += badgeH + (isStory ? 40 : 24);
  }

  // 3. Service Category Title (e.g. "ПРОДАЖА НЕДВИЖИМОСТИ")
  ctx.save();
  const serviceFontSize = isStory ? 48 : isHorizontal ? 38 : isCompactSquare ? 34 : 42;
  ctx.font = `700 ${serviceFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.letterSpacing = '1.5px';
  ctx.fillText(serviceTitle.toUpperCase(), paddingX, cursorY + serviceFontSize * 0.8);
  cursorY += serviceFontSize + (isStory ? 32 : 20);
  ctx.restore();

  // 4. Large Hero Slogan (Taking up the banner)
  ctx.save();
  const sloganFontSize = isStory ? 76 : isHorizontal ? 56 : isCompactSquare ? 50 : 66;
  const sloganLineHeight = sloganFontSize * 1.22;
  ctx.font = `900 ${sloganFontSize}px "Medeo Sans", system-ui, sans-serif`;
  ctx.fillStyle = textColor;

  const sloganLines = wrapText(ctx, slogan, contentWidth);
  const maxLines = isCompactSquare ? 3 : 4;
  sloganLines.slice(0, maxLines).forEach((line) => {
    ctx.fillText(line, paddingX, cursorY + sloganFontSize * 0.85);
    cursorY += sloganLineHeight;
  });
  cursorY += isStory ? 44 : 26;
  ctx.restore();

  // 5. Key Benefits / Bullets
  if (showBullets && bullets && bullets.length > 0) {
    const bulletFontSize = isStory ? 32 : isHorizontal ? 24 : isCompactSquare ? 22 : 26;
    const bulletLineHeight = bulletFontSize * 1.35;
    const visibleBullets = isCompactSquare ? bullets.slice(0, 2) : bullets.slice(0, 3);

    if (layoutMode === 'cards') {
      // Modern Glass Card Style
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `600 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 100);
        const cardH = bulletLines.length * bulletLineHeight + (isStory ? 38 : 28);

        safeRoundRect(ctx, paddingX, cursorY, contentWidth, cardH, 18);
        ctx.fillStyle = cardBg;
        ctx.fill();
        ctx.strokeStyle = cardBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon check circle
        const circleRadius = isStory ? 18 : 14;
        const circleX = paddingX + circleRadius + 16;
        const circleY = cursorY + cardH / 2;

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Checkmark tick
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

        cursorY += cardH + (isStory ? 18 : 12);
        ctx.restore();
      });
      cursorY += isStory ? 32 : 18;
    } else {
      // Bold List Style
      visibleBullets.forEach((bullet) => {
        ctx.save();
        ctx.font = `600 ${bulletFontSize}px "Medeo Sans", system-ui, sans-serif`;
        const bulletLines = wrapText(ctx, bullet, contentWidth - 60);

        // Bullet indicator dot
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

        cursorY += bulletLines.length * bulletLineHeight + (isStory ? 20 : 12);
        ctx.restore();
      });
      cursorY += isStory ? 36 : 20;
    }
  }

  // 6. Call To Action (CTA) Button
  if (ctaText) {
    ctx.save();
    const ctaFontSize = isStory ? 32 : isHorizontal ? 26 : isCompactSquare ? 24 : 28;
    ctx.font = `800 ${ctaFontSize}px "Medeo Sans", system-ui, sans-serif`;
    const ctaMetrics = ctx.measureText(ctaText);
    const ctaW = Math.min(contentWidth, ctaMetrics.width + (isStory ? 100 : 80));
    const ctaH = isStory ? 88 : isHorizontal ? 68 : isCompactSquare ? 64 : 76;

    // Glowing shadow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;

    safeRoundRect(ctx, paddingX, cursorY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = ctaBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // CTA Text
    ctx.fillStyle = ctaColor;
    ctx.fillText(ctaText, paddingX + 36, cursorY + ctaH / 2 + ctaFontSize * 0.32);

    // Arrow icon ->
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
    cursorY += ctaH + (isStory ? 48 : 28);
  }

  // 7. Clean Contact Phone (Replaces footer)
  if (agentPhone) {
    ctx.save();
    const phoneY = H - (isStory ? 90 : isCompactSquare ? 60 : 70);
    const phoneFontSize = isStory ? 38 : isHorizontal ? 32 : isCompactSquare ? 28 : 34;
    const labelFontSize = isStory ? 24 : isHorizontal ? 20 : isCompactSquare ? 18 : 22;

    // Draw stylish contact line with phone icon
    const iconR = isStory ? 20 : 16;
    const iconX = paddingX + iconR;

    // Circular icon background
    ctx.beginPath();
    ctx.arc(iconX, phoneY - iconR / 2, iconR, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    // Phone handset silhouette inside icon
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const px = iconX;
    const py = phoneY - iconR / 2;
    ctx.arc(px, py - 2, iconR * 0.35, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();
    ctx.restore();

    const textStartX = iconX + iconR + 16;

    // "Тел. для связи:" label
    ctx.font = `600 ${labelFontSize}px "Medeo Sans", system-ui, sans-serif`;
    ctx.fillStyle = subTextColor;
    const labelText = 'Тел. для связи: ';
    ctx.fillText(labelText, textStartX, phoneY);

    const labelWidth = ctx.measureText(labelText).width;

    // Phone number in bold
    ctx.font = `800 ${phoneFontSize}px "Medeo Sans", system-ui, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(agentPhone, textStartX + labelWidth, phoneY);

    // Optional Agent Name alongside phone if space permits
    if (agentName && !isCompactSquare) {
      const phoneWidth = ctx.measureText(agentPhone).width;
      const agentStartX = textStartX + labelWidth + phoneWidth + 24;
      if (agentStartX + 200 < W - paddingX) {
        ctx.font = `500 ${labelFontSize}px "Medeo Sans", system-ui, sans-serif`;
        ctx.fillStyle = subTextColor;
        ctx.fillText(`• ${agentName}`, agentStartX, phoneY);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}
