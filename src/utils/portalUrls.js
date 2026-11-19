/**
 * src/utils/portalUrls.js
 *
 * Генератор прямых ссылок с предзаполненными фильтрами для ключевых
 * порталов недвижимости России: Авито, ЦИАН, ДомКлик.
 *
 * Формирует валидные ссылки для любого запроса на покупку/аренду
 * с учётом комнатности, бюджета, площади, города и района.
 */

// Сопоставление городов со слагами Авито
const AVITO_CITY_SLUGS = {
  'киров': 'kirovskaya_oblast_kirov',
  'москва': 'moskva',
  'санкт-петербург': 'sankt-peterburg',
  'спб': 'sankt-peterburg',
  'сочи': 'sochi',
  'казань': 'kazan',
  'екатеринбург': 'ekaterinburg',
  'новосибирск': 'novosibirsk',
  'нижний новгород': 'nizhniy_novgorod',
  'краснодар': 'krasnodar',
  'самара': 'samara',
  'уфа': 'ufa',
  'ростов-на-дону': 'rostov-na-donu',
  'пермь': 'perm',
  'воронеж': 'voronezh',
  'волгоград': 'volgograd',
  'тюмень': 'tyumen',
};

// Сопоставление городов с поддоменами ЦИАН
const CIAN_CITY_SUBDOMAINS = {
  'киров': 'kirov',
  'москва': 'www',
  'санкт-петербург': 'spb',
  'спб': 'spb',
  'сочи': 'sochi',
  'казань': 'kazan',
  'екатеринбург': 'ekb',
  'новосибирск': 'nsk',
  'нижний новгород': 'nn',
  'краснодар': 'krasnodar',
  'самара': 'samara',
  'уфа': 'ufa',
  'ростов-на-дону': 'rostov',
  'пермь': 'perm',
  'воронеж': 'voronezh',
  'тюмень': 'tyumen',
};

// Сопоставление городов с поддоменами ДомКлик
const DOMCLICK_CITY_SUBDOMAINS = {
  'киров': 'kirov',
  'москва': 'domclick',
  'санкт-петербург': 'spb',
  'спб': 'spb',
  'сочи': 'sochi',
  'казань': 'kazan',
  'екатеринбург': 'ekaterinburg',
  'новосибирск': 'novosibirsk',
  'нижний новгород': 'nizhniy-novgorod',
  'краснодар': 'krasnodar',
  'самара': 'samara',
  'уфа': 'ufa',
  'ростов-на-дону': 'rostov-na-donu',
  'пермь': 'perm',
  'воронеж': 'voronezh',
  'тюмень': 'tyumen',
};

/**
 * Нормализует название города
 * @param {string} city
 * @returns {string}
 */
function cleanCity(city) {
  if (!city || typeof city !== 'string') return 'киров';
  return city.trim().toLowerCase();
}

/**
 * Проверяет, является ли тип недвижимости домом / дачей
 * @param {string[]|string} propertyTypes
 */
function isSuburbanType(propertyTypes) {
  const types = Array.isArray(propertyTypes) ? propertyTypes : [propertyTypes];
  return types.some(t => ['house', 'dacha', 'cottage', 'townhouse'].includes(t));
}

/**
 * Формирует прямую поисковую ссылку на Авито
 * @param {object} params
 * @returns {string}
 */
export function buildAvitoSearchUrl(params = {}) {
  const city = cleanCity(params.city);
  const citySlug = AVITO_CITY_SLUGS[city] || 'kirovskaya_oblast_kirov';
  const dealType = (params.deal_type || 'SALE').toUpperCase();
  const isRent = dealType === 'RENT';
  const isHouse = isSuburbanType(params.property_types);

  let categoryPath = 'kvartiry/prodam';
  if (isHouse) {
    categoryPath = isRent ? 'doma_dachi_kottedzhi/sdam' : 'doma_dachi_kottedzhi/prodam';
  } else if (isRent) {
    categoryPath = 'kvartiry/sdam';
  }

  const queryParams = new URLSearchParams();

  // Комнатность
  if (Array.isArray(params.rooms) && params.rooms.length > 0) {
    const roomValues = params.rooms.map(r => {
      const num = Number(r);
      return num === 0 ? 'studio' : String(num);
    });
    queryParams.set('roomsCount', roomValues.join(','));
  } else if (params.rooms !== undefined && params.rooms !== null && params.rooms !== '') {
    const num = Number(params.rooms);
    queryParams.set('roomsCount', num === 0 ? 'studio' : String(num));
  }

  // Бюджет
  const minPrice = params.budget_min ? Math.round(Number(params.budget_min)) : null;
  const maxPrice = params.budget_max ? Math.round(Number(params.budget_max)) : null;
  if (minPrice && maxPrice) {
    queryParams.set('price', `${minPrice}-${maxPrice}`);
  } else if (minPrice) {
    queryParams.set('price', `${minPrice}-0`);
  } else if (maxPrice) {
    queryParams.set('price', `0-${maxPrice}`);
  }

  // Площадь
  const minArea = params.area_min ? Math.round(Number(params.area_min)) : null;
  const maxArea = params.area_max ? Math.round(Number(params.area_max)) : null;
  if (minArea && maxArea) {
    queryParams.set('area', `${minArea}-${maxArea}`);
  } else if (minArea) {
    queryParams.set('area', `${minArea}-0`);
  } else if (maxArea) {
    queryParams.set('area', `0-${maxArea}`);
  }

  // Район или текстовый поиск
  if (Array.isArray(params.districts) && params.districts.length > 0 && params.districts[0]) {
    queryParams.set('q', params.districts[0]);
  }

  const queryString = queryParams.toString();
  return `https://www.avito.ru/${citySlug}/${categoryPath}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Формирует прямую поисковую ссылку на ЦИАН
 * @param {object} params
 * @returns {string}
 */
export function buildCianSearchUrl(params = {}) {
  const city = cleanCity(params.city);
  const subdomain = CIAN_CITY_SUBDOMAINS[city] || 'kirov';
  const baseUrl = subdomain === 'www' ? 'https://www.cian.ru/cat.php' : `https://${subdomain}.cian.ru/cat.php`;

  const dealType = (params.deal_type || 'SALE').toUpperCase();
  const isRent = dealType === 'RENT';
  const isHouse = isSuburbanType(params.property_types);

  const queryParams = new URLSearchParams();
  queryParams.set('deal_type', isRent ? 'rent' : 'sale');
  queryParams.set('offer_type', isHouse ? 'suburban' : 'flat');

  // Комнатность на ЦИАН: room0=1 (студия), room1=1 (1-комн.), etc.
  const roomList = Array.isArray(params.rooms)
    ? params.rooms.map(Number).filter(n => !isNaN(n))
    : (params.rooms !== undefined && params.rooms !== null && params.rooms !== '' ? [Number(params.rooms)] : []);

  roomList.forEach(r => {
    if (r >= 0 && r <= 9) {
      queryParams.set(`room${r}`, '1');
    }
  });

  // Бюджет
  if (params.budget_min && Number(params.budget_min) > 0) {
    queryParams.set('minprice', String(Math.round(Number(params.budget_min))));
  }
  if (params.budget_max && Number(params.budget_max) > 0) {
    queryParams.set('maxprice', String(Math.round(Number(params.budget_max))));
  }

  // Площадь
  if (params.area_min && Number(params.area_min) > 0) {
    queryParams.set('mintotal_area', String(Math.round(Number(params.area_min))));
  }
  if (params.area_max && Number(params.area_max) > 0) {
    queryParams.set('maxtotal_area', String(Math.round(Number(params.area_max))));
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Формирует прямую поисковую ссылку на ДомКлик
 * @param {object} params
 * @returns {string}
 */
export function buildDomclickSearchUrl(params = {}) {
  const city = cleanCity(params.city);
  const subdomain = DOMCLICK_CITY_SUBDOMAINS[city] || 'kirov';
  const baseUrl = subdomain === 'domclick' ? 'https://domclick.ru/search' : `https://${subdomain}.domclick.ru/search`;

  const dealType = (params.deal_type || 'SALE').toUpperCase();
  const isRent = dealType === 'RENT';
  const isHouse = isSuburbanType(params.property_types);

  const queryParams = new URLSearchParams();
  queryParams.set('deal_type', isRent ? 'rent' : 'sale');
  queryParams.set('category', isHouse ? 'house' : 'living');

  // Комнатность
  const roomList = Array.isArray(params.rooms)
    ? params.rooms.map(Number).filter(n => !isNaN(n))
    : (params.rooms !== undefined && params.rooms !== null && params.rooms !== '' ? [Number(params.rooms)] : []);

  roomList.forEach(r => {
    queryParams.append('rooms', String(r));
  });

  // Бюджет
  if (params.budget_min && Number(params.budget_min) > 0) {
    queryParams.set('price_from', String(Math.round(Number(params.budget_min))));
  }
  if (params.budget_max && Number(params.budget_max) > 0) {
    queryParams.set('price_to', String(Math.round(Number(params.budget_max))));
  }

  // Площадь
  if (params.area_min && Number(params.area_min) > 0) {
    queryParams.set('square_from', String(Math.round(Number(params.area_min))));
  }
  if (params.area_max && Number(params.area_max) > 0) {
    queryParams.set('square_to', String(Math.round(Number(params.area_max))));
  }

  // Дополнительно можно передать район в адрес
  if (Array.isArray(params.districts) && params.districts.length > 0 && params.districts[0]) {
    queryParams.set('address', `${params.city || 'Киров'}, ${params.districts[0]}`);
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Формирует карточки-ссылки на все 3 портала для клиентского запроса
 * @param {object} request
 * @returns {Array<{ portal: string, name: string, url: string, color: string, bg: string, badge: string }>}
 */
export function buildPortalSearchLinks(request) {
  if (!request) return [];

  const avitoUrl = buildAvitoSearchUrl(request);
  const cianUrl = buildCianSearchUrl(request);
  const domclickUrl = buildDomclickSearchUrl(request);

  return [
    {
      portal: 'avito',
      name: 'Авито',
      badge: 'Avito',
      url: avitoUrl,
      color: '#00aaff',
      bg: 'rgba(0, 170, 255, 0.1)',
      border: 'rgba(0, 170, 255, 0.25)',
      description: 'Поиск вторички и новостроек на Авито с текущими фильтрами',
    },
    {
      portal: 'cian',
      name: 'ЦИАН',
      badge: 'CIAN',
      url: cianUrl,
      color: '#e34234',
      bg: 'rgba(227, 66, 52, 0.1)',
      border: 'rgba(227, 66, 52, 0.25)',
      description: 'Поиск актуальных вариантов на ЦИАН',
    },
    {
      portal: 'domclick',
      name: 'ДомКлик',
      badge: 'DomClick',
      url: domclickUrl,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.25)',
      description: 'Поиск объектов со скидкой 0.3% по ипотеке Сбера',
    },
  ];
}
