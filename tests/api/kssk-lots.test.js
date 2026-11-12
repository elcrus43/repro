import { describe, it, expect } from 'vitest';
import {
  KSSK_PROJECTS,
  parseKsskSections,
  parseKsskHouseHtml,
} from './kssk-lots.js';

describe('KSSK_PROJECTS catalog mapping', () => {
  it('maps all 6 KSSK residential complexes to house paths', () => {
    expect(Object.keys(KSSK_PROJECTS)).toEqual([
      'zhk-skandinaviya',
      'zhk-metro',
      'zhk-sloboda',
      'zhk-x2',
      'zhk-dom-u-reki',
      'zhk-pushkina',
    ]);
    for (const spec of Object.values(KSSK_PROJECTS)) {
      expect(spec.projectName).toBeTruthy();
      expect(spec.houses.length).toBeGreaterThan(0);
    }
  });
});

describe('parseKsskSections', () => {
  it('extracts section ids, labels and active state', () => {
    const html = `
      <div class="sections-list">
        <a class="sectionpicker active" data-id="2453">1 секция</a>
        <a class="sectionpicker " data-id="2454"> 2 секция </a>
      </div>
    `;
    expect(parseKsskSections(html)).toEqual([
      { id: '2453', label: '1 секция', active: true },
      { id: '2454', label: '2 секция', active: false },
    ]);
  });
});

describe('parseKsskHouseHtml', () => {
  it('parses active chessboard cells, floor numbers, rooms, area, price, plan image and morerooms finishing', () => {
    const html = `
      <div class="sections">
        <a class="sectionpicker active" data-id="2598">1 секция</a>
      </div>
      <table class="table__plan-rooms">
        <tbody>
          <tr data-for-floor="svg-hover-2598_14">
            <td data-floor="14" data-sec="2598">14</td>
            <td class="active ">
              <div class="item__plan-div " data-id="424215">
                <span>2</span>
              </div>
              <div class="info__card-room__wrapper" style="display: none;">
                <div class="info__card-room">
                  <img class="lazyload" data-src="/upload/iblock/abc/plan2k.jpg">
                  <span>2к 47.7 м²</span>
                  <p>6&nbsp;630&nbsp;300 ₽</p>
                </div>
              </div>
            </td>
            <td class="sold">
              <div class="item__plan-div " data-id="999999">
                <span>1</span>
              </div>
            </td>
          </tr>
          <tr data-for-floor="svg-hover-2598_5">
            <td data-floor="5" data-sec="2598">5</td>
            <td class="active">
              <div class="item__plan-div" data-id="511002">
                <span>С</span>
              </div>
              <div class="info__card-room__wrapper" style="display: none;">
                <div class="info__card-room">
                  <img class="lazyload" data-src="/upload/iblock/def/studio.jpg">
                  <span>Студия 27,9 м&sup2;</span>
                  <p>4 400 000 ₽</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div id="morerooms">
        <a href="#" class="block-object-shadow appartbycard" data-id="424215">
          <div class="text-block-house">
            <div class="block__card-text"><p>2</p><p>47.7 м²</p><p>14 этаж</p></div>
            <p>6 630 300 ₽</p>
            <span>Под отделку</span>
          </div>
        </a>
      </div>
    `;

    const lots = parseKsskHouseHtml(html, {
      projectSlug: 'zhk-metro',
      housePath: '/objects/ul-moskovskaya-d-209a/',
      houseAddress: 'г. Киров, ул. Московская, 209А',
    });

    expect(lots).toHaveLength(2);
    expect(lots[0]).toEqual({
      id: '424215',
      project_slug: 'zhk-metro',
      project_name: 'ЖК Метро',
      title: '2-комнатная, 47.7 м², 14 эт.',
      rooms_label: '2-комнатная',
      rooms_type: '2k',
      area: 47.7,
      floor: 14,
      flat_number: null,
      address: 'г. Киров, ул. Московская, 209А (1 секция)',
      finishing: 'Под отделку',
      price: 6630300,
      price_sqm: Math.round(6630300 / 47.7),
      plan_image: 'https://kvartiry.kssk.ru/upload/iblock/abc/plan2k.jpg',
      lot_url: 'https://kvartiry.kssk.ru/objects/ul-moskovskaya-d-209a/?appartModal=424215',
      is_available: true,
    });

    expect(lots[1]).toMatchObject({
      id: '511002',
      rooms_label: 'Студия',
      rooms_type: 'studio',
      area: 27.9,
      floor: 5,
      finishing: 'Под отделку',
      price: 4400000,
    });
  });

  it('returns empty array when HTML has no active chessboard rows', () => {
    expect(parseKsskHouseHtml('<div>Пусто</div>', { projectSlug: 'zhk-x2' })).toEqual([]);
    expect(parseKsskHouseHtml('', { projectSlug: 'zhk-x2' })).toEqual([]);
  });
});
