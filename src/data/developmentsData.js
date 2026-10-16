/**
 * developmentsData.js
 * База актуальных жилых комплексов г. Кирова
 * с координатами, ценами, застройщиками, планировками, ссылками на ЕИСЖС (наш.дом.рф) и Авито.
 */

export const KIROV_DEVELOPERS = [
  'Железно',
  'Кировспецмонтаж (КСМ)',
  'Кировский ССК',
  'Маяковская',
  'Монолит',
  'Стройсоюз',
  'Кировпроект',
  'Автобан',
  'Регион-Инвест'
];

export const FINISHING_OPTIONS = [
  { id: 'rough', label: 'Черновая' },
  { id: 'white_box', label: 'White box (предчистовая)' },
  { id: 'turnkey', label: 'Чистовая (под ключ)' }
];

export const HOUSING_CLASSES = ['Комфорт', 'Комфорт+', 'Бизнес', 'Премиум', 'Стандарт'];

export const ROOM_TYPES = [
  { id: 'studio', label: 'Студия' },
  { id: '1k', label: '1-комн.' },
  { id: '2k', label: '2-комн.' },
  { id: '3k', label: '3-комн.' },
  { id: '4k', label: '4-комн.+' }
];

export const DEFAULT_DEVELOPMENTS = [
  {
    id: 'zhk-znak',
    name: 'ЖК ZNAK (Знак)',
    developer: 'Железно',
    district: 'Ленинский район',
    microdistrict: 'Юго-Западный',
    address: 'г. Киров, ул. Дмитрия Козулева, 2',
    lat: 58.5912,
    lng: 49.5786,
    price_from: 3850000,
    price_to: 11950000,
    price_sqm_from: 104000,
    completion_date: '4 кв. 2026 (очереди сданы)',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт+',
    finishing: ['white_box', 'turnkey'],
    floors: '4–8 этажей',
    wall_material: 'Кирпич, монолит',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Европейский среднеэтажный квартал комфорт-класса на Юго-Западе Кирова. Собственная школа №26, детские сады, прогулочные бульвары, дворы без машин и мобильное приложение жителя «Мажордом».',
    features: ['Дворы без машин', 'Своя школа и садики', 'Система «Умный дом»', 'Безбарьерная среда', 'Дизайнерские холлы'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '26.4 – 29.1 м²', price_from: 3850000, price_sqm: 142000, count: 8 },
      { type: '1k', name: '1-комнатная', area: '34.8 – 42.5 м²', price_from: 4890000, price_sqm: 125000, count: 18 },
      { type: '2k', name: '2-комнатная (евро)', area: '51.0 – 64.2 м²', price_from: 6450000, price_sqm: 114000, count: 22 },
      { type: '3k', name: '3-комнатная', area: '72.0 – 86.5 м²', price_from: 8900000, price_sqm: 108000, count: 9 },
      { type: '4k', name: '4-комнатная', area: '94.0 – 112.0 м²', price_from: 11200000, price_sqm: 104000, count: 3 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/32954',
    avito_url: 'https://zhk-znak-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://zhk-znak.ru',
    contact_phone: '+7 (8332) 203-722'
  },
  {
    id: 'zhk-bulychev',
    name: 'Дом «Булычев»',
    developer: 'Железно',
    district: 'Первомайский район',
    microdistrict: 'Исторический центр',
    address: 'г. Киров, ул. МОПРа, 39 / Воровского',
    lat: 58.6014,
    lng: 49.6742,
    price_from: 14200000,
    price_to: 35000000,
    price_sqm_from: 195000,
    completion_date: 'Сдан (2025/2026)',
    completion_year: 2025,
    is_completed: true,
    housing_class: 'Премиум',
    finishing: ['white_box'],
    floors: '10 этажей',
    wall_material: 'Монолит-кирпич, керамогранит',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Первый дом премиум-класса с собственной премиальной экосистемой: фитнес-клуб с хаммамом только для жителей, лобби-бар, консьерж-сервис 24/7, очистка воды до питьевого уровня и подземный паркинг с автомойкой.',
    features: ['Премиальный консьерж 24/7', 'Частный спортзал и SPA для жителей', 'Подземный паркинг', 'Система очистки воздуха и воды', 'Панорамные террасы'],
    apartments: [
      { type: '2k', name: '2-комнатная', area: '68.5 – 76.0 м²', price_from: 14200000, price_sqm: 202000, count: 5 },
      { type: '3k', name: '3-комнатная', area: '92.4 – 118.0 м²', price_from: 19500000, price_sqm: 198000, count: 6 },
      { type: '4k', name: '4-комнатная / Пентхаус', area: '142.0 – 186.0 м²', price_from: 29000000, price_sqm: 195000, count: 2 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/41285',
    avito_url: 'https://zhk-dom-bulychev-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://bulychev.club',
    contact_phone: '+7 (8332) 203-722'
  },
  {
    id: 'zhk-river-park',
    name: 'ЖК River Park (Ривер Парк)',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Первомайский район',
    microdistrict: 'Вересники',
    address: 'г. Киров, ул. Пристанская, 1',
    lat: 58.6028,
    lng: 49.6955,
    price_from: 4350000,
    price_to: 14800000,
    price_sqm_from: 110000,
    completion_date: '3 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт+',
    finishing: ['rough', 'white_box'],
    floors: '10–18 этажей',
    wall_material: 'Монолит, кирпич',
    images: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Жилой квартал на благоустроенной набережной реки Вятка. Живописные виды на речные просторы, собственная набережная, развитая инфраструктура центра города в 5 минутах ходьбы.',
    features: ['Вид на реку Вятка', 'Собственная набережная', 'Двухуровневый паркинг', 'Витражное остекление', 'Кладовые помещения'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '27.5 – 31.0 м²', price_from: 4350000, price_sqm: 145000, count: 11 },
      { type: '1k', name: '1-комнатная', area: '38.0 – 46.2 м²', price_from: 5190000, price_sqm: 125000, count: 19 },
      { type: '2k', name: '2-комнатная', area: '56.0 – 68.0 м²', price_from: 7100000, price_sqm: 118000, count: 24 },
      { type: '3k', name: '3-комнатная', area: '78.0 – 95.0 м²', price_from: 9800000, price_sqm: 112000, count: 8 },
      { type: '4k', name: '4-комнатная', area: '105.0 – 128.0 м²', price_from: 14200000, price_sqm: 110000, count: 2 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/45610',
    avito_url: 'https://zhk-river-park-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://ksm-kirov.ru',
    contact_phone: '+7 (8332) 51-11-11'
  },
  {
    id: 'zhk-chistye-prudy',
    name: 'ЖК Чистые Пруды',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Ленинский район',
    microdistrict: 'Чистые Пруды',
    address: 'г. Киров, ул. Ивана Попова, 58',
    lat: 58.5624,
    lng: 49.6285,
    price_from: 3200000,
    price_to: 8400000,
    price_sqm_from: 92000,
    completion_date: 'Сдан / 2 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт',
    finishing: ['rough', 'turnkey'],
    floors: '16–18 этажей',
    wall_material: 'Панель, кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Крупнейший современный микрорайон Кирова с новой путепроводной развязкой, современными школами, несколькими детскими садами, парком и спортивными комплексами.',
    features: ['Новая школа №25', 'Парковая зона с прудами', 'Доступные цены', 'Готовые квартиры с ремонтом', 'Удобные парковки'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '24.0 – 28.0 м²', price_from: 3200000, price_sqm: 122000, count: 14 },
      { type: '1k', name: '1-комнатная', area: '33.0 – 41.0 м²', price_from: 4100000, price_sqm: 108000, count: 28 },
      { type: '2k', name: '2-комнатная', area: '49.0 – 62.0 м²', price_from: 5400000, price_sqm: 98000, count: 30 },
      { type: '3k', name: '3-комнатная', area: '68.0 – 78.0 м²', price_from: 6900000, price_sqm: 92000, count: 12 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/28140',
    avito_url: 'https://zhk-chistye-prudy-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://ksm-kirov.ru',
    contact_phone: '+7 (8332) 51-11-11'
  },
  {
    id: 'zhk-metrograd',
    name: 'ЖК Метроград',
    developer: 'Железно',
    district: 'Октябрьский район',
    microdistrict: 'Юго-Западный',
    address: 'г. Киров, ул. Садаковская, 10',
    lat: 58.6052,
    lng: 49.5621,
    price_from: 3990000,
    price_to: 9800000,
    price_sqm_from: 102000,
    completion_date: 'Сдан / 4 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт',
    finishing: ['white_box', 'turnkey'],
    floors: '5–9 этажей',
    wall_material: 'Кирпич, монолит',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Город за городом — комфортный жилой район с малой этажностью, чистым воздухом, лесопарком, зонами барбекю, детскими площадками датского типа и спортивными кортами.',
    features: ['Собственный парк и памп-трек', 'Зоны барбекю', 'Индивидуальные котлы поквартирного отопления', 'Закрытая охраняемая территория', 'Детский сад прямо в комплексе'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '25.0 – 28.5 м²', price_from: 3990000, price_sqm: 140000, count: 6 },
      { type: '1k', name: '1-комнатная', area: '35.0 – 43.0 м²', price_from: 4950000, price_sqm: 122000, count: 15 },
      { type: '2k', name: '2-комнатная', area: '52.0 – 65.0 м²', price_from: 6600000, price_sqm: 112000, count: 18 },
      { type: '3k', name: '3-комнатная', area: '71.0 – 85.0 м²', price_from: 8400000, price_sqm: 102000, count: 7 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/31200',
    avito_url: 'https://zhk-metrograd-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://zhk-metrograd.ru',
    contact_phone: '+7 (8332) 203-722'
  },
  {
    id: 'zhk-life',
    name: 'ЖК Life (Лайф)',
    developer: 'Кировский ССК',
    district: 'Ленинский район',
    microdistrict: 'Дружба',
    address: 'г. Киров, ул. Калинина, 40',
    lat: 58.5832,
    lng: 49.6384,
    price_from: 4650000,
    price_to: 11200000,
    price_sqm_from: 108000,
    completion_date: '2 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт',
    finishing: ['rough', 'white_box'],
    floors: '16–17 этажей',
    wall_material: 'Монолит-панель ССК нового поколения',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Стильный жилой комплекс в обжитом районе Дружба. В шаговой доступности парк им. 50-летия ВЛКСМ, дворец пионеров, торговые центры и отличная транспортная доступность в любую точку города.',
    features: ['Рядом парк Дворца Пионеров', 'Подземный паркинг', 'Скоростные бесшумные лифты', 'Колясочные и велосипедные комнаты'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '26.8 – 29.5 м²', price_from: 4650000, price_sqm: 148000, count: 5 },
      { type: '1k', name: '1-комнатная', area: '36.5 – 44.0 м²', price_from: 5450000, price_sqm: 126000, count: 14 },
      { type: '2k', name: '2-комнатная', area: '53.0 – 63.5 м²', price_from: 7200000, price_sqm: 118000, count: 16 },
      { type: '3k', name: '3-комнатная', area: '74.0 – 89.0 м²', price_from: 9400000, price_sqm: 108000, count: 8 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/46780',
    avito_url: 'https://zhk-life-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://kirovssk.ru',
    contact_phone: '+7 (8332) 71-44-44'
  },
  {
    id: 'zhk-fusion',
    name: 'ЖК Fusion (Фьюжн)',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Первомайский район',
    microdistrict: 'Центральный рынок',
    address: 'г. Киров, ул. Казанская, 93',
    lat: 58.5988,
    lng: 49.6834,
    price_from: 5170000,
    price_to: 17200000,
    price_sqm_from: 125000,
    completion_date: '3 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Бизнес',
    finishing: ['white_box'],
    floors: '12–16 этажей',
    wall_material: 'Монолит, керамический кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Архитектурный ансамбль бизнес-класса в исторической части города. Панорамные виды на старый город и реку, закрытая клубная территория, стильное лобби с камином и лаундж-зоной.',
    features: ['Исторический центр', 'Панорамные окна в пол', 'Закрытый клубный двор', 'Теплый подземный паркинг'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '27.0 – 30.5 м²', price_from: 5170000, price_sqm: 165000, count: 7 },
      { type: '1k', name: '1-комнатная', area: '41.0 – 48.0 м²', price_from: 6300000, price_sqm: 138000, count: 12 },
      { type: '2k', name: '2-комнатная', area: '58.0 – 72.0 м²', price_from: 8800000, price_sqm: 130000, count: 14 },
      { type: '3k', name: '3-комнатная', area: '82.0 – 105.0 м²', price_from: 12900000, price_sqm: 125000, count: 5 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/49100',
    avito_url: 'https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=%D0%96%D0%9A+Fusion',
    builder_url: 'https://ksm-kirov.ru',
    contact_phone: '+7 (8332) 51-11-11'
  },
  {
    id: 'zhk-novator',
    name: 'ЖК Новатор',
    developer: 'Железно',
    district: 'Ленинский район',
    microdistrict: 'Юго-Западный',
    address: 'г. Киров, ул. Анжелия Михеева, 18',
    lat: 58.5874,
    lng: 49.5823,
    price_from: 4890000,
    price_to: 13500000,
    price_sqm_from: 115000,
    completion_date: '1 кв. 2027',
    completion_year: 2027,
    is_completed: false,
    housing_class: 'Бизнес',
    finishing: ['white_box'],
    floors: '9–17 этажей',
    wall_material: 'Монолит-кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Технологичный жилой комплекс с инновационными инженерными решениями: биометрический доступ по Face ID, системы рекуперации воздуха, зарядки для электромобилей и коворкинг для резидентов на 1 этаже.',
    features: ['Вход по Face ID', 'Собственный коворкинг', 'Зарядки для электромобилей', 'Энергоэффективность А+', 'Закрытый двор-парк'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '28.0 – 32.0 м²', price_from: 4890000, price_sqm: 152000, count: 6 },
      { type: '1k', name: '1-комнатная', area: '39.0 – 45.0 м²', price_from: 5750000, price_sqm: 132000, count: 15 },
      { type: '2k', name: '2-комнатная', area: '55.0 – 69.0 м²', price_from: 7800000, price_sqm: 122000, count: 18 },
      { type: '3k', name: '3-комнатная', area: '78.0 – 96.0 м²', price_from: 10500000, price_sqm: 115000, count: 7 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/48900',
    avito_url: 'https://zhk-novator-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://zhk-novator.ru',
    contact_phone: '+7 (8332) 203-722'
  },
  {
    id: 'zhk-kislorod',
    name: 'ЖК Кислород',
    developer: 'Кировский ССК',
    district: 'Нововятский район',
    microdistrict: 'Нововятск',
    address: 'г. Киров, ул. Советская, 54',
    lat: 58.5085,
    lng: 49.7152,
    price_from: 2950000,
    price_to: 6900000,
    price_sqm_from: 88000,
    completion_date: '4 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт',
    finishing: ['rough', 'turnkey'],
    floors: '10–14 этажей',
    wall_material: 'Панель ССК, кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Уютный квартал в экологически чистом районе Нововятска, рядом с сосновым парком и рекой Вятка. Чистый воздух, отсутствие городского шума и доступные цены на квартиры.',
    features: ['Рядом сосновый бор', 'Свежий воздух', 'Доступная ипотека от 6%', 'Остановка в 2 минутах'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '25.2 – 28.0 м²', price_from: 2950000, price_sqm: 112000, count: 9 },
      { type: '1k', name: '1-комнатная', area: '34.0 – 40.5 м²', price_from: 3750000, price_sqm: 98000, count: 20 },
      { type: '2k', name: '2-комнатная', area: '50.0 – 58.0 м²', price_from: 4950000, price_sqm: 92000, count: 18 },
      { type: '3k', name: '3-комнатная', area: '66.0 – 75.0 м²', price_from: 6200000, price_sqm: 88000, count: 8 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/43210',
    avito_url: 'https://zhk-kislorod-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://kirovssk.ru',
    contact_phone: '+7 (8332) 71-44-44'
  },
  {
    id: 'zhk-ozerki',
    name: 'ЖК Озерки',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Первомайский район',
    microdistrict: 'Озерки',
    address: 'г. Киров, ул. Торфяная, 11',
    lat: 58.6482,
    lng: 49.7423,
    price_from: 2750000,
    price_to: 6500000,
    price_sqm_from: 86000,
    completion_date: 'Сдан / 3 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Стандарт',
    finishing: ['turnkey', 'rough'],
    floors: '10–16 этажей',
    wall_material: 'Панель',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Семейный спальный микрорайон в Коминтерне с живописным озером, новой школой, детсадами и развитым общественным транспортом. Самая доступная цена квадратного метра в черте города.',
    features: ['Живописное озеро и зона отдыха', 'Новая общеобразовательная школа', 'Квартиры с чистовой отделкой', 'Низкий порог входа'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '23.5 – 27.0 м²', price_from: 2750000, price_sqm: 110000, count: 12 },
      { type: '1k', name: '1-комнатная', area: '32.0 – 39.0 м²', price_from: 3450000, price_sqm: 94000, count: 25 },
      { type: '2k', name: '2-комнатная', area: '48.0 – 58.0 м²', price_from: 4600000, price_sqm: 89000, count: 22 },
      { type: '3k', name: '3-комнатная', area: '65.0 – 74.0 м²', price_from: 5900000, price_sqm: 86000, count: 9 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/33450',
    avito_url: 'https://zhk-mkr-ozerki-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://ksm-kirov.ru',
    contact_phone: '+7 (8332) 51-11-11'
  },
  {
    id: 'zhk-green-hills',
    name: 'ЖК Green Hills',
    developer: 'Маяковская',
    district: 'Первомайский район',
    microdistrict: 'Исторический центр',
    address: 'г. Киров, Пристанский переулок, 17',
    lat: 58.6002,
    lng: 49.6912,
    price_from: 6800000,
    price_to: 18500000,
    price_sqm_from: 135000,
    completion_date: '4 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт+',
    finishing: ['white_box'],
    floors: '9–12 этажей',
    wall_material: 'Керамический кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Клубный кирпичный комплекс на склоне реки с великолепным обзором на Вятку и Заречный парк. 100% кирпичные стены повышенной толщины для идеальной тепло- и шумоизоляции.',
    features: ['100% классический кирпич', 'Виды на реку Вятку', 'Закрытая охраняемая территория', 'Индивидуальное отопление'],
    apartments: [
      { type: '1k', name: '1-комнатная', area: '44.0 – 50.0 м²', price_from: 6800000, price_sqm: 145000, count: 6 },
      { type: '2k', name: '2-комнатная', area: '62.0 – 76.0 м²', price_from: 9200000, price_sqm: 138000, count: 10 },
      { type: '3k', name: '3-комнатная', area: '88.0 – 115.0 м²', price_from: 13500000, price_sqm: 135000, count: 5 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/44510',
    avito_url: 'https://zhk-green-hills-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://mayakovskaya.ru',
    contact_phone: '+7 (8332) 41-41-41'
  },
  {
    id: 'zhk-smart',
    name: 'ЖК Smart (Смарт)',
    developer: 'Кировпроект',
    district: 'Октябрьский район',
    microdistrict: 'Лепсе',
    address: 'г. Киров, ул. Карла Маркса, 18',
    lat: 58.6145,
    lng: 49.6582,
    price_from: 4200000,
    price_to: 9100000,
    price_sqm_from: 105000,
    completion_date: '2 кв. 2026',
    completion_year: 2026,
    is_completed: false,
    housing_class: 'Комфорт',
    finishing: ['white_box'],
    floors: '14 этажей',
    wall_material: 'Монолит-кирпич',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Умный дом с эргономичными планировками смарт-формата, где каждый квадратный метр функционален. Развитая инфраструктура северной части центра: школы, гимназии, парки.',
    features: ['Смарт-планировки', 'Телеметрия счетчиков', 'Детский городок с безопасным покрытием', 'Школа №28 рядом'],
    apartments: [
      { type: 'studio', name: 'Студия', area: '26.0 – 29.0 м²', price_from: 4200000, price_sqm: 148000, count: 5 },
      { type: '1k', name: '1-комнатная', area: '36.0 – 42.0 м²', price_from: 5100000, price_sqm: 125000, count: 12 },
      { type: '2k', name: '2-комнатная', area: '51.0 – 62.0 м²', price_from: 6800000, price_sqm: 115000, count: 14 },
      { type: '3k', name: '3-комнатная', area: '72.0 – 82.0 м²', price_from: 8600000, price_sqm: 105000, count: 6 }
    ],
    domrf_url: 'https://xn--80az8a.xn--d1aqf.xn--p1ai/%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3-%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA/%D0%BA%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81/47890',
    avito_url: 'https://zhk-smart-kirovskaya-oblast-kirov.avito.ru',
    builder_url: 'https://kirovproekt.ru',
    contact_phone: '+7 (8332) 35-00-55'
  }
];

const STORAGE_KEY = 'reacrm_custom_developments';

export function getStoredDevelopments() {
  if (typeof window === 'undefined') return DEFAULT_DEVELOPMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DEVELOPMENTS;
    const custom = JSON.parse(raw);
    
    // Merge: custom overwrites matching default IDs, plus custom additions
    const map = new Map();
    DEFAULT_DEVELOPMENTS.forEach(item => map.set(item.id, item));
    custom.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  } catch (err) {
    console.warn('[developmentsData] Failed to load custom developments:', err);
    return DEFAULT_DEVELOPMENTS;
  }
}

export function saveDevelopment(item) {
  if (typeof window === 'undefined') return item;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const index = custom.findIndex(x => x.id === item.id);
    if (index >= 0) {
      custom[index] = { ...custom[index], ...item, updated_at: new Date().toISOString() };
    } else {
      custom.push({ ...item, created_at: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    return item;
  } catch (err) {
    console.error('[developmentsData] Failed to save development:', err);
    return item;
  }
}

export function deleteDevelopment(id) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const filtered = custom.filter(x => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[developmentsData] Failed to delete development:', err);
  }
}
