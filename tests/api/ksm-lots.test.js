import { describe, it, expect } from 'vitest';
import {
  KSM_PROJECTS,
  normalizeRoomsType,
  parseTotalCount,
  parseApartmentsPageHtml,
} from './ksm-lots.js';

describe('KSM_PROJECTS whitelist', () => {
  it('contains all 6 KSM project slugs', () => {
    expect(Object.keys(KSM_PROJECTS)).toEqual([
      'siti-park',
      'vidnyy',
      'life',
      'zhk-river-park',
      'mkr-ozerki',
      'zhr-chistye-prudy',
    ]);
  });
});

describe('parseTotalCount', () => {
  it('extracts total count from pagination button text', () => {
    const html = '<button class="btn">Показать еще 9 из 48</button>';
    expect(parseTotalCount(html)).toBe(48);
  });

  it('handles ё and extra whitespace', () => {
    const html = '<a href="#">Показать  ещё   18  из  127</a>';
    expect(parseTotalCount(html)).toBe(127);
  });

  it('returns null when pagination text is absent', () => {
    expect(parseTotalCount('<div>Нет кнопки</div>')).toBeNull();
    expect(parseTotalCount('')).toBeNull();
  });
});

describe('normalizeRoomsType', () => {
  it('normalizes studio and numbered room labels', () => {
    expect(normalizeRoomsType('Студия')).toBe('studio');
    expect(normalizeRoomsType('Квартира-студия 24.5 м²')).toBe('studio');
    expect(normalizeRoomsType('1-комн')).toBe('1k');
    expect(normalizeRoomsType('1-к. квартира')).toBe('1k');
    expect(normalizeRoomsType('Евро 2-комн')).toBe('2k');
    expect(normalizeRoomsType('Евро 2-комнатная')).toBe('2k');
    expect(normalizeRoomsType('2-комн')).toBe('2k');
    expect(normalizeRoomsType('3-комн')).toBe('3k');
    expect(normalizeRoomsType('4-комнатная')).toBe('4k');
    expect(normalizeRoomsType('5-к')).toBe('4k');
  });

  it('returns null for empty or unknown strings', () => {
    expect(normalizeRoomsType('')).toBeNull();
    expect(normalizeRoomsType('Парковочное место')).toBeNull();
  });
});

describe('parseApartmentsPageHtml', () => {
  it('parses multiple cards including euro-2k, studio, NBSP prices, and relative URLs', () => {
    const sampleHtml = `
      <ul class="catalog-grid">
        <li class="layout-card catalog-grid__item">
          <div class="layout-card__inner">
            <a class="layout-card__image-wrap" href="/seller/project/apartment/12345" title="Евро 2-комнатная 41.8 м²">
              <picture class="layout-card__picture">
                <source srcset="/upload/plan1.webp 1x, /upload/plan1_2x.webp 2x" type="image/webp">
                <img src="/upload/plan1.png" alt="Планировка">
              </picture>
            </a>
            <a href="/seller/project/apartment/12345" class="layout-card__title">
              <span class="layout-card__title-text">Евро 2-комнатная 41.8 м²</span>
            </a>
            <ul class="layout-card__info">
              <li class="layout-card__info-item">
                <span class="layout-card__info-label">Проект</span>
                <span class="layout-card__info-value">Озерки</span>
              </li>
              <li class="layout-card__info-item">
                <span class="layout-card__info-label">Отделка</span>
                <span class="layout-card__info-value">Предчистовая</span>
              </li>
              <li class="layout-card__info-item">
                <span class="layout-card__info-label">Адрес</span>
                <span class="layout-card__info-value">ул. Торфяная, д. 16</span>
              </li>
              <li class="layout-card__info-item">
                <span class="layout-card__info-label">Этаж</span>
                <span class="layout-card__info-value">7</span>
              </li>
              <li class="layout-card__info-item">
                <span class="layout-card__info-label">Номер</span>
                <span class="layout-card__info-value">84</span>
              </li>
            </ul>
            <div class="layout-card__price">4&nbsp;350&nbsp;000 ₽</div>
            <a href="/seller/favorites/add/12345" class="layout-card__fav">В избранное</a>
          </div>
        </li>
        <li class="layout-card catalog-grid__item">
          <div class="layout-card__inner">
            <a href="/seller/project/apartment/67890" class="layout-card__image-wrap">
              <picture class="layout-card__picture">
                <source srcset="/upload/studio.webp 1x, /upload/studio2x.webp 2x" type="image/webp">
              </picture>
            </a>
            <div class="layout-card__title">
              <span class="layout-card__title-text">  Студия,   24,5 м&sup2; </span>
            </div>
            <ul class="layout-card__info">
              <li class="layout-card__info-item"><span>Этаж:</span><span>3 из 17</span></li>
              <li class="layout-card__info-item"><span>Номер:</span><span>12А</span></li>
            </ul>
            <div class="layout-card__price">2\u00a0890\u00a0000 ₽</div>
            <a href="/seller/booking/create_with_apartment/67890">Бронь</a>
          </div>
        </li>
      </ul>
    `;

    const lots = parseApartmentsPageHtml(sampleHtml, 'mkr-ozerki');
    expect(lots).toHaveLength(2);

    expect(lots[0]).toEqual({
      id: '12345',
      project_slug: 'mkr-ozerki',
      project_name: 'Озерки',
      title: 'Евро 2-комнатная 41.8 м²',
      rooms_label: 'Евро 2-комнатная',
      rooms_type: '2k',
      area: 41.8,
      floor: 7,
      flat_number: '84',
      address: 'ул. Торфяная, д. 16',
      finishing: 'Предчистовая',
      price: 4350000,
      price_sqm: Math.round(4350000 / 41.8),
      plan_image: 'https://ksm-kirov.ru/upload/plan1.png',
      lot_url: 'https://ksm-kirov.ru/seller/project/apartment/12345',
      is_available: true,
    });

    expect(lots[1]).toEqual({
      id: '67890',
      project_slug: 'mkr-ozerki',
      project_name: 'Озерки',
      title: 'Студия, 24,5 м²',
      rooms_label: 'Студия',
      rooms_type: 'studio',
      area: 24.5,
      floor: 3,
      flat_number: '12А',
      address: null,
      finishing: null,
      price: 2890000,
      price_sqm: Math.round(2890000 / 24.5),
      plan_image: 'https://ksm-kirov.ru/upload/studio.webp',
      lot_url: 'https://ksm-kirov.ru/seller/project/apartment/67890',
      is_available: true,
    });
  });

  it('handles missing optional fields and cards without ID safely', () => {
    const html = `
      <ul class="catalog-grid">
        <li class="layout-card catalog-grid__item">
          <div class="layout-card__title-text">1-комнатная 33 м²</div>
          <a href="/seller/favorites/add/999">fav</a>
        </li>
        <li class="layout-card catalog-grid__item">
          <div class="layout-card__title-text">Без ID</div>
        </li>
      </ul>
    `;
    const lots = parseApartmentsPageHtml(html, 'siti-park');
    expect(lots).toHaveLength(1);
    expect(lots[0]).toEqual({
      id: '999',
      project_slug: 'siti-park',
      project_name: 'Сити Парк',
      title: '1-комнатная 33 м²',
      rooms_label: '1-комнатная',
      rooms_type: '1k',
      area: 33,
      floor: null,
      flat_number: null,
      address: null,
      finishing: null,
      price: null,
      price_sqm: null,
      plan_image: null,
      lot_url: null,
      is_available: true,
    });
  });
});
