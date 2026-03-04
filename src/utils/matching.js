// Matching algorithm per TZ §4.1

const RENOVATION_RANK = { none: 0, cosmetic: 1, euro: 2, designer: 3 };

export function calculateMatch(property, request) {
  // === MANDATORY (exclusive) params ===
  // 1. Property type must be in request's property_types
  if (!request.property_types || !request.property_types.includes(property.property_type)) {
    return null;
  }
  // 2. Cities must match
  if (property.city?.toLowerCase() !== request.city?.toLowerCase()) {
    return null;
  }
  // 3. Rooms must be in request's rooms list
  if (request.rooms && request.rooms.length > 0) {
    if (!request.rooms.includes(property.rooms)) {
      return null;
    }
  }

  let score = 0;
  const matched = [];
  const mismatched = [];

  // === DISTRICT (20 pts) ===
  if (!request.districts || request.districts.length === 0) {
    score += 20;
    matched.push('Район: любой');
  } else if (request.districts.some(d => d.toLowerCase() === property.district?.toLowerCase())) {
    score += 20;
    matched.push(`Район: ${property.district}`);
  } else {
    mismatched.push(`Район: объект в ${property.district}, запрос в [${request.districts.join(', ')}]`);
  }

  // === PRICE (25 pts) ===
  const price = property.price;
  const priceMin = property.price_min || property.price;
  const budgetMax = request.budget_max;
  const budgetMin = request.budget_min || 0;

  if (price <= budgetMax && price >= budgetMin) {
    score += 25;
    matched.push(`Цена: ${fmt(price)} ₽ в диапазоне бюджета`);
  } else if (priceMin <= budgetMax && price > budgetMax) {
    score += 15;
    matched.push(`Цена с торгом: ${fmt(priceMin)} ₽ ≤ бюджету ${fmt(budgetMax)} ₽`);
  } else if (price > budgetMax && price <= budgetMax * 1.1) {
    score += 5;
    mismatched.push(`Цена: ${fmt(price)} ₽ чуть выше бюджета ${fmt(budgetMax)} ₽`);
  } else {
    mismatched.push(`Цена: ${fmt(price)} ₽ выше бюджета ${fmt(budgetMax)} ₽`);
  }

  // === AREA (10 pts) ===
  if (request.area_min || request.area_max) {
    const aMin = request.area_min || 0;
    const aMax = request.area_max || 9999;
    if (property.area_total >= aMin && property.area_total <= aMax) {
      score += 10;
      matched.push(`Площадь: ${property.area_total} м² ∈ [${aMin}–${aMax}]`);
    } else if (property.area_total >= aMin || property.area_total <= aMax) {
      score += 5;
      matched.push(`Площадь: ${property.area_total} м² (частично)`);
    } else {
      mismatched.push(`Площадь: ${property.area_total} м² не в диапазоне [${aMin}–${aMax}]`);
    }
  } else {
    score += 10;
    matched.push('Площадь: не указана в запросе');
  }

  // === KITCHEN (5 pts) ===
  if (request.kitchen_area_min && property.area_kitchen) {
    if (property.area_kitchen >= request.kitchen_area_min) {
      score += 5;
      matched.push(`Кухня: ${property.area_kitchen} м² ≥ ${request.kitchen_area_min} м²`);
    } else {
      mismatched.push(`Кухня: ${property.area_kitchen} м² < ${request.kitchen_area_min} м²`);
    }
  } else {
    score += 5;
  }

  // === FLOOR (10 pts) ===
  let floorScore = 0;
  if (request.floor_min || request.floor_max) {
    const fMin = request.floor_min || 1;
    const fMax = request.floor_max || 99;
    if (property.floor >= fMin && property.floor <= fMax) {
      floorScore += 5;
      matched.push(`Этаж: ${property.floor} ∈ [${fMin}–${fMax}]`);
    } else {
      mismatched.push(`Этаж: ${property.floor} не в диапазоне [${fMin}–${fMax}]`);
    }
  } else {
    floorScore += 5;
  }
  if (request.not_first_floor && property.floor > 1) {
    floorScore += 2.5;
    matched.push('Не первый этаж');
  } else if (request.not_first_floor && property.floor === 1) {
    mismatched.push('Первый этаж (запрос: не первый)');
    floorScore -= 2.5;
  }
  if (request.not_last_floor && property.floors_total && property.floor < property.floors_total) {
    floorScore += 2.5;
    matched.push('Не последний этаж');
  } else if (request.not_last_floor && property.floors_total && property.floor === property.floors_total) {
    mismatched.push('Последний этаж (запрос: не последний)');
    floorScore -= 2.5;
  }
  score += Math.max(0, floorScore);

  // === BUILDING TYPE (5 pts) ===
  if (request.building_types && request.building_types.length > 0 && property.building_type) {
    if (request.building_types.includes(property.building_type)) {
      score += 5;
      matched.push(`Тип дома: ${property.building_type}`);
    } else {
      mismatched.push(`Тип дома: ${property.building_type} не в запросе`);
    }
  } else {
    score += 5;
  }

  // === MARKET TYPE (5 pts) ===
  if (request.market_types && request.market_types.length > 0) {
    if (request.market_types.includes(property.market_type)) {
      score += 5;
      matched.push(`Рынок: ${property.market_type}`);
    } else {
      mismatched.push(`Рынок: объект ${property.market_type}, запрос [${request.market_types.join(',')}]`);
    }
  } else {
    score += 5;
  }

  // === RENOVATION (5 pts) ===
  if (request.renovation_min && property.renovation) {
    const propRank = RENOVATION_RANK[property.renovation] ?? 0;
    const reqRank = RENOVATION_RANK[request.renovation_min] ?? 0;
    if (propRank >= reqRank) {
      score += 5;
      matched.push(`Ремонт: ${property.renovation} ≥ ${request.renovation_min}`);
    } else {
      mismatched.push(`Ремонт: ${property.renovation} < ${request.renovation_min}`);
    }
  } else {
    score += 5;
  }

  // === BALCONY (3 pts) ===
  if (request.balcony_required) {
    if (property.balcony && property.balcony !== 'none') {
      score += 3;
      matched.push('Балкон: есть');
    } else {
      mismatched.push('Балкон: нет (требуется)');
    }
  } else {
    score += 3;
  }

  // === PARKING (2 pts) ===
  if (request.parking_required) {
    if (property.parking && property.parking !== 'none') {
      score += 2;
      matched.push('Парковка: есть');
    } else {
      mismatched.push('Парковка: нет (требуется)');
    }
  } else {
    score += 2;
  }

  // === PAYMENT (10 pts) ===
  const pTypes = request.payment_types || ['mortgage'];
  let paymentMatched = false;
  let paymentDetails = [];

  if (pTypes.includes('cash')) {
    paymentMatched = true;
    paymentDetails.push('Наличные (всегда подходит)');
  }
  if (pTypes.includes('mortgage') && property.mortgage_available) {
    paymentMatched = true;
    paymentDetails.push('Ипотека');
  }
  if (pTypes.includes('matcapital') && property.matcapital_available) {
    paymentMatched = true;
    paymentDetails.push('Маткапитал');
  }
  if (pTypes.includes('certificate') && property.certificate_available) {
    paymentMatched = true;
    paymentDetails.push('Сертификат');
  }
  if (pTypes.includes('mixed')) {
    paymentMatched = true;
    paymentDetails.push('Смешанная (договорная)');
  }

  if (paymentMatched) {
    score += 10;
    matched.push(`Оплата: подходит (${paymentDetails.join(', ')})`);
  } else {
    mismatched.push(`Оплата: объект не подходит под запрошенные способы [${pTypes.join(', ')}]`);
  }

  const finalScore = Math.min(100, Math.round(score));
  if (finalScore < 50) return null;

  let match_level = 'possible';
  if (finalScore >= 85) match_level = 'perfect';
  else if (finalScore >= 65) match_level = 'good';

  return {
    score: finalScore,
    match_level,
    matched_params: matched,
    mismatched_params: mismatched,
  };
}

function fmt(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' тыс.';
  return String(n);
}

export function runMatchingForProperty(property, requests) {
  const results = [];
  for (const req of requests) {
    if (req.status !== 'active') continue;
    if (req.realtor_id !== property.realtor_id) continue;
    const result = calculateMatch(property, req);
    if (result) {
      results.push({ request_id: req.id, property_id: property.id, ...result });
    }
  }
  return results;
}

export function runMatchingForRequest(request, properties) {
  const results = [];
  for (const prop of properties) {
    if (prop.status !== 'active') continue;
    if (prop.realtor_id !== request.realtor_id) continue;
    const result = calculateMatch(prop, request);
    if (result) {
      results.push({ property_id: prop.id, request_id: request.id, ...result });
    }
  }
  return results;
}

export function getLevelLabel(level) {
  switch (level) {
    case 'perfect': return { label: 'Отличное', cls: 'perfect' };
    case 'good': return { label: 'Хорошее', cls: 'good' };
    case 'possible': return { label: 'Возможное', cls: 'possible' };
    default: return { label: '—', cls: '' };
  }
}

export function formatPrice(n) {
  if (!n && n !== 0) return '—';
  if (n >= 10_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн ₽';
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

export function cleanPrice(val) {
  if (!val) return null;
  const clean = String(val).replace(/[^0-9]/g, '');
  return clean ? Number(clean) : null;
}

export function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
