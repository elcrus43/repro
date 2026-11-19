import { describe, it, expect } from 'vitest';
import {
  buildAvitoSearchUrl,
  buildCianSearchUrl,
  buildDomclickSearchUrl,
  buildPortalSearchLinks,
} from './portalUrls';

describe('portalUrls', () => {
  const sampleRequest = {
    city: 'Киров',
    rooms: [1, 2],
    budget_min: 3000000,
    budget_max: 5500000,
    area_min: 35,
    area_max: 65,
    deal_type: 'SALE',
    districts: ['Юго-Запад'],
  };

  it('buildAvitoSearchUrl генерирует корректную ссылку для Авито', () => {
    const url = buildAvitoSearchUrl(sampleRequest);
    expect(url).toContain('https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry/prodam');
    expect(url).toContain('roomsCount=1%2C2');
    expect(url).toContain('price=3000000-5500000');
    expect(url).toContain('area=35-65');
  });

  it('buildAvitoSearchUrl обрабатывает студию (комната 0)', () => {
    const url = buildAvitoSearchUrl({ city: 'Киров', rooms: [0], deal_type: 'SALE' });
    expect(url).toContain('roomsCount=studio');
  });

  it('buildCianSearchUrl генерирует корректную ссылку для ЦИАН', () => {
    const url = buildCianSearchUrl(sampleRequest);
    expect(url).toContain('https://kirov.cian.ru/cat.php');
    expect(url).toContain('deal_type=sale');
    expect(url).toContain('offer_type=flat');
    expect(url).toContain('room1=1');
    expect(url).toContain('room2=1');
    expect(url).toContain('minprice=3000000');
    expect(url).toContain('maxprice=5500000');
    expect(url).toContain('mintotal_area=35');
    expect(url).toContain('maxtotal_area=65');
  });

  it('buildDomclickSearchUrl генерирует корректную ссылку для ДомКлик', () => {
    const url = buildDomclickSearchUrl(sampleRequest);
    expect(url).toContain('https://kirov.domclick.ru/search');
    expect(url).toContain('deal_type=sale');
    expect(url).toContain('category=living');
    expect(url).toContain('rooms=1');
    expect(url).toContain('rooms=2');
    expect(url).toContain('price_from=3000000');
    expect(url).toContain('price_to=5500000');
    expect(url).toContain('square_from=35');
    expect(url).toContain('square_to=65');
  });

  it('buildPortalSearchLinks возвращает ссылки для всех трёх порталов', () => {
    const links = buildPortalSearchLinks(sampleRequest);
    expect(links).toHaveLength(3);
    const portals = links.map(l => l.portal);
    expect(portals).toContain('avito');
    expect(portals).toContain('cian');
    expect(portals).toContain('domclick');
  });

  it('возвращает пустой массив при отсутствии запроса', () => {
    expect(buildPortalSearchLinks(null)).toEqual([]);
  });
});
