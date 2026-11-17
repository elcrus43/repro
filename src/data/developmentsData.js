/**
 * developmentsData.js
 * База актуальных строящихся жилых комплексов г. Кирова
 * с координатами, ценами, застройщиками, планировками и ссылками на ЕИСЖС (наш.дом.рф) и Авито.
 */

export const KIROV_DEVELOPERS = [
  'Железно',
  'Кировспецмонтаж (КСМ)',
  'Кировский ССК',
  'ПрофСтрой',
  'Стройсоюз',
  'КИНО Девелопмент',
  'СМУ-5',
  'Алтай-Строй',
  'СМУ-16',
  'СМТ',
  'Маяковская',
  'Кировпроект'
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

// @DEVELOPMENTS_DATA_START
export const DEFAULT_DEVELOPMENTS = [
  {
    "id": "zhk-bulychev",
    "name": "Дом «Булычев»",
    "developer": "Железно",
    "district": "Первомайский район",
    "microdistrict": "Исторический центр",
    "address": "г. Киров, ул. Свободы, 28",
    "lat": 58.612221,
    "lng": 49.676611,
    "price_from": 12500000,
    "price_to": 32000000,
    "price_sqm_from": 210000,
    "completion_date": "Сдан (2024)",
    "completion_year": 2024,
    "is_completed": true,
    "housing_class": "Элитный",
    "finishing": [
      "white_box",
      "turnkey"
    ],
    "floors": "7 этажей",
    "wall_material": "Кирпич, неоклассика",
    "images": [
      "/images/developments/zhk-bulychev.jpg",
      "https://storage.yandexcloud.net/zhelezno-media/media/p/p/g/8f31d1106e6632d285504ce729b30920e6e4a6b4.jpg"
    ],
    "description": "Первый в России умный дом высшего класса «А» с неоклассической архитектурой, приватным спа-комплексом, консьерж-сервисом и панорамными террасами в историческом центре Кирова.",
    "features": [
      "Класс «А» умный дом",
      "Собственный фитнес и SPA",
      "Консьерж-сервис 24/7",
      "Подземный паркинг"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "58.0 - 72.0 м²",
        "price_from": 12500000,
        "price_sqm": 215000,
        "count": 4
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "85.0 - 120.0 м²",
        "price_from": 18200000,
        "price_sqm": 210000,
        "count": 3
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек/комплекс/32954",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Дом+Булычев+Киров",
    "builder_url": "https://zhcom.ru/kirov/projects/bulychev/",
    "contact_phone": "+7 (8332) 203-722"
  },
  {
    "id": "zhk-znak",
    "name": "ЖК ZNAK (Знак)",
    "developer": "Железно",
    "district": "Ленинский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, ул. Капитана Дорофеева / Дмитрия Козулева, 2",
    "lat": 58.57985,
    "lng": 49.55901,
    "price_from": 6100000,
    "price_to": 14500000,
    "price_sqm_from": 118000,
    "completion_date": "2026 - 2029 (по очередям)",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "white_box",
      "turnkey"
    ],
    "floors": "4-8 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "https://storage.yandexcloud.net/zhelezno-media/media/p/p/g/dc0c0fa25924d954636b8a3d0be716b451c553d3.png"
    ],
    "description": "Европейский среднеэтажный квартал комфорт-класса на Юго-Западе Кирова. Собственная школа №26, детские сады, прогулочные бульвары, дворы без машин и сервис «Мажордом».",
    "features": [
      "Дворы без машин",
      "Своя школа и садики",
      "Система «Умный дом»",
      "Безбарьерная среда"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "35.0 - 43.0 м²",
        "price_from": 6100000,
        "price_sqm": 145000,
        "count": 16
      },
      {
        "type": "2k",
        "name": "2-комнатная (евро)",
        "area": "51.0 - 65.0 м²",
        "price_from": 7600000,
        "price_sqm": 128000,
        "count": 20
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "72.0 - 88.0 м²",
        "price_from": 9800000,
        "price_sqm": 118000,
        "count": 8
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек/комплекс/32954",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Знак",
    "builder_url": "https://zhk-znak.ru",
    "contact_phone": "+7 (8332) 203-722"
  },
  {
    "id": "zhk-zaryadnoe",
    "name": "ЖК Зарядное",
    "developer": "Железно",
    "district": "Ленинский район",
    "microdistrict": "Новый",
    "address": "г. Киров, ул. 4-й Пятилетки, 82А",
    "lat": 58.56268,
    "lng": 49.65867,
    "price_from": 6000000,
    "price_to": 12900000,
    "price_sqm_from": 122000,
    "completion_date": "2027 - 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "white_box",
      "turnkey"
    ],
    "floors": "6-10 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "https://storage.yandexcloud.net/zhelezno-media/media/p/p/i/d5c0a92478210dd6bf820d600d5ef1144743d1b8.jpg"
    ],
    "description": "Современный жилой квартал комфорт-класса с концепцией двор-парк, эргономичными планировками и развитой спортивной инфраструктурой.",
    "features": [
      "Двор-парк",
      "Колясочные",
      "Безбарьерная среда",
      "Энергоэффективные дома"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 42.0 м²",
        "price_from": 6000000,
        "price_sqm": 145000,
        "count": 14
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "52.0 - 64.0 м²",
        "price_from": 7800000,
        "price_sqm": 130000,
        "count": 18
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "74.0 - 86.0 м²",
        "price_from": 10200000,
        "price_sqm": 122000,
        "count": 6
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Зарядное",
    "builder_url": "https://zhk-zaryadnoe.ru",
    "contact_phone": "+7 (8332) 203-722"
  },
  {
    "id": "zhk-innograd",
    "name": "ЖК Инноград",
    "developer": "Железно",
    "district": "Ленинский район",
    "microdistrict": "Новый",
    "address": "г. Киров, ул. Песочная",
    "lat": 58.55795,
    "lng": 49.66512,
    "price_from": 6700000,
    "price_to": 14200000,
    "price_sqm_from": 125000,
    "completion_date": "IV кв. 2027 - 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "white_box",
      "turnkey"
    ],
    "floors": "5-9 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://storage.yandexcloud.net/zhelezno-media/media/p/p/i/cc44bf54bf82b38408b4c6b5455ae859f02cc023.png"
    ],
    "description": "Инновационный жилой квартал с собственной парковой зоной, интеллектуальными системами доступа и современной архитектурой.",
    "features": [
      "Собственный парк",
      "Умный дом Мажордом",
      "Дворы без машин",
      "Дизайнерские подъезды"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "38.0 - 44.0 м²",
        "price_from": 6700000,
        "price_sqm": 152000,
        "count": 12
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 66.0 м²",
        "price_from": 8500000,
        "price_sqm": 136000,
        "count": 15
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "75.0 - 92.0 м²",
        "price_from": 11500000,
        "price_sqm": 125000,
        "count": 6
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Инноград",
    "builder_url": "https://zhk-innograd.ru",
    "contact_phone": "+7 (8332) 203-722"
  },
  {
    "id": "zhk-chistoprudnenskaya-11a",
    "name": "Дом на Чистопрудненской, 11А",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Ленинский район",
    "microdistrict": "Чистые Пруды",
    "address": "г. Киров, ул. Чистопрудненская, 11А",
    "lat": 58.56304,
    "lng": 49.63538,
    "price_from": 3650000,
    "price_to": 9200000,
    "price_sqm_from": 113000,
    "completion_date": "IV кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "17 этажей",
    "wall_material": "Панель нового стандарта с утеплением",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/BuildingHeroSlide/2026-10-23/747bc431292c018e33144a4827fc8e6a.jpg"
    ],
    "description": "Старт продаж ноября 2026 г. Односекционный 17-этажный дом комфорт-класса в микрорайоне Чистые Пруды: колясочные на 1 этаже, двор без машин, школа и садик рядом.",
    "features": [
      "Старт продаж 11.2026",
      "Двор без машин",
      "Колясочные на 1 этаже",
      "Школа и садик рядом"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "32.3 - 40.0 м²",
        "price_from": 3650000,
        "price_sqm": 113000,
        "count": 20
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "50.0 - 62.0 м²",
        "price_from": 5650000,
        "price_sqm": 113000,
        "count": 24
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "68.0 - 78.0 м²",
        "price_from": 7680000,
        "price_sqm": 113000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Чистопрудненская+11А",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-chistye-prudy",
    "name": "ЖК Чистые Пруды",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Ленинский район",
    "microdistrict": "Чистые Пруды",
    "address": "г. Киров, ул. Чистопрудненская, 11, 13, 13А / ул. Ивана Попова, 58",
    "lat": 58.56809,
    "lng": 49.63744,
    "price_from": 6100000,
    "price_to": 9600000,
    "price_sqm_from": 108000,
    "completion_date": "2026 - 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "16-18 этажей",
    "wall_material": "Панель, кирпич",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2025-07-08/791ebe6ceb9cad619f85549ba67d1f5f.jpg"
    ],
    "description": "Крупнейший современный микрорайон Кирова с новой транспортной развязкой, школой №25, детскими садами и прудами. Действует семейная ипотека с ПВ от 20 000 руб.",
    "features": [
      "Школа №25 рядом",
      "Парковая зона с прудами",
      "Ипотека без удорожания (ПВ от 20 т.р.)",
      "Отделка со скидкой"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 42.0 м²",
        "price_from": 4400000,
        "price_sqm": 118000,
        "count": 18
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "52.0 - 63.0 м²",
        "price_from": 6100000,
        "price_sqm": 112000,
        "count": 24
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "69.0 - 80.0 м²",
        "price_from": 7800000,
        "price_sqm": 108000,
        "count": 10
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек/комплекс/28140",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Чистые+Пруды",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-life-ksm",
    "name": "Квартал «Лайф» (Парк-квартал)",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Ленинский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, мкр. Урванцево, ул. Анжелия Михеева, 17 / ул. Энтузиастов",
    "lat": 58.58428,
    "lng": 49.56818,
    "price_from": 6000000,
    "price_to": 11800000,
    "price_sqm_from": 118000,
    "completion_date": "до III кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "white_box",
      "turnkey"
    ],
    "floors": "12-17 этажей",
    "wall_material": "Монолит, панель",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2024-11-27/fe2e46dd1024002fc1708c3003b5e97a.jpg"
    ],
    "description": "Парк-квартал рядом с Зубаревским лесом в развивающемся микрорайоне Урванцево. Семейные планировки, скидки до 10% для семейного формата.",
    "features": [
      "Рядом с Зубаревским лесом",
      "Школа и садики рядом",
      "Скидки на семейные квартиры"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 44.0 м²",
        "price_from": 6000000,
        "price_sqm": 135000,
        "count": 14
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "52.0 - 65.0 м²",
        "price_from": 7300000,
        "price_sqm": 122000,
        "count": 18
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "72.0 - 85.0 м²",
        "price_from": 9200000,
        "price_sqm": 118000,
        "count": 8
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Квартал+Лайф+Киров",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-city-park",
    "name": "ЖК Сити Парк",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Ленинский район",
    "microdistrict": "Чистые Пруды",
    "address": "г. Киров, мкр. Чистые Пруды, ул. Парковая, 1Б, 1В / пр-кт Липатникова",
    "lat": 58.55388,
    "lng": 49.6465,
    "price_from": 7100000,
    "price_to": 12400000,
    "price_sqm_from": 115000,
    "completion_date": "III кв. 2026 - III кв. 2029",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "14-18 этажей",
    "wall_material": "Монолит-кирпич, панель",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2025-04-04/1d69b7de33c7376e5c83a5031b4134ae.jpg"
    ],
    "description": "Комплексная застройка рядом с природным массивом в Чистых Прудах. Кладовые помещения, льготная ипотека с минимальным ПВ и скидки на отделку.",
    "features": [
      "Природный парк рядом",
      "Кладовые помещения",
      "Семейная ипотека от 20 000 руб. ПВ"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "52.0 - 64.0 м²",
        "price_from": 7100000,
        "price_sqm": 124000,
        "count": 16
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "70.0 - 86.0 м²",
        "price_from": 8900000,
        "price_sqm": 115000,
        "count": 10
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Сити+Парк+Киров",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-vidny",
    "name": "ЖК Видный",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, Мелькомбинатовский проезд, 3",
    "lat": 58.59174,
    "lng": 49.62644,
    "price_from": 7500000,
    "price_to": 18500000,
    "price_sqm_from": 154000,
    "completion_date": "I кв. 2027 - IV кв. 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "до 18 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2025-09-09/55677665de3ce7963fe51319e04f9f6e.jpg"
    ],
    "description": "Квартал бизнес-класса в центральной части Кирова с подземным паркингом и закрытой территорией. Школы и садики в нескольких минутах ходьбы.",
    "features": [
      "Бизнес-класс в центре",
      "Подземный паркинг",
      "Закрытая территория",
      "Видовые квартиры"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "42.0 - 48.0 м²",
        "price_from": 7500000,
        "price_sqm": 165000,
        "count": 10
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "58.0 - 72.0 м²",
        "price_from": 9600000,
        "price_sqm": 158000,
        "count": 14
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "82.0 - 105.0 м²",
        "price_from": 13200000,
        "price_sqm": 154000,
        "count": 6
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Видный+Киров",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-river-park",
    "name": "ЖК River Park (Ривер Парк)",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Первомайский район",
    "microdistrict": "Озерки",
    "address": "г. Киров, Прибрежный бульвар, 6/1, 6/2",
    "lat": 58.65586,
    "lng": 49.68488,
    "price_from": 3700000,
    "price_to": 10800000,
    "price_sqm_from": 105000,
    "completion_date": "2026 (сдача очередей)",
    "completion_year": 2026,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "10-18 этажей",
    "wall_material": "Монолит, панель",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2025-09-16/16ef3defe98560d28d20cdce8b8a48b2.jpg"
    ],
    "description": "Жилой квартал с видом на реку Вятку и собственным детским садом на территории. Доступна ипотека без удорожания с ПВ от 20 000 руб.",
    "features": [
      "Вид на реку Вятку",
      "Собственный детский сад",
      "Скидка 8 000 р./м² на отделку"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "26.0 - 29.0 м²",
        "price_from": 3700000,
        "price_sqm": 135000,
        "count": 8
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 44.0 м²",
        "price_from": 4650000,
        "price_sqm": 115000,
        "count": 14
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 65.0 м²",
        "price_from": 6400000,
        "price_sqm": 105000,
        "count": 16
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек/комплекс/45610",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Ривер+Парк+Киров",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-ozerki-ksm",
    "name": "ЖК Озерки",
    "developer": "Кировспецмонтаж (КСМ)",
    "district": "Первомайский район",
    "microdistrict": "Озерки",
    "address": "г. Киров, ул. Торфяная, 13в",
    "lat": 58.6662,
    "lng": 49.6809,
    "price_from": 4187700,
    "price_to": 9500000,
    "price_sqm_from": 115000,
    "completion_date": "4 кв. 2026",
    "completion_year": 2026,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "17 этажей",
    "wall_material": "Панель",
    "images": [
      "https://ksm-kirov.ru/media/Catalog/ProjectHeroSlide/2026-09-21/427505601eb286c4749592b08e27919e.jpg"
    ],
    "description": "Современный жилой квартал в микрорайоне Озерки от застройщика Кировспецмонтаж. Продуманные планировки от студий до трехкомнатных квартир, благоустроенные дворы, детские площадки и развитая инфраструктура района.",
    "features": [
      "Черновая и чистовая отделка",
      "Школа и детский сад в микрорайоне",
      "Остановка транспорта рядом",
      "Семейная ипотека"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 42.0 м²",
        "price_from": 4187700,
        "price_sqm": 118000,
        "count": 16
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "50.0 - 63.0 м²",
        "price_from": 5850000,
        "price_sqm": 115000,
        "count": 20
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "68.0 - 80.0 м²",
        "price_from": 7850000,
        "price_sqm": 115000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Озерки+Киров",
    "builder_url": "https://ksm-kirov.ru",
    "contact_phone": "+7 (8332) 51-11-11"
  },
  {
    "id": "zhk-skandinaviya",
    "name": "ЖК Скандинавия",
    "developer": "Кировский ССК",
    "district": "Ленинский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, ул. Анжелия Михеева, 1, 5 / Скандинавский проезд",
    "lat": 58.5902,
    "lng": 49.5684,
    "price_from": 4400000,
    "price_to": 11500000,
    "price_sqm_from": 112000,
    "completion_date": "2027 - 2030",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "9-17 этажей",
    "wall_material": "Панель ССК, монолит",
    "images": [
      "https://kvartiry.kssk.ru/upload/resize_cache/iblock/b9e/fxk02du8xwg2v1681nkblfcc5thrp9ym/1920_1080_1/1.jpg"
    ],
    "description": "Жилой комплекс в скандинавской эстетике рядом с новой школой на 1500 мест. Доступны приватные секции по 2-3 квартиры на этаже, студии и просторные евро-3.",
    "features": [
      "Школа на 1500 мест рядом",
      "Секции 2-3 квартиры на этаже",
      "Новый участок ул. Михеева"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "27.9 - 30.0 м²",
        "price_from": 4400000,
        "price_sqm": 148000,
        "count": 10
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 43.0 м²",
        "price_from": 5100000,
        "price_sqm": 128000,
        "count": 18
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "52.0 - 65.0 м²",
        "price_from": 6900000,
        "price_sqm": 118000,
        "count": 20
      },
      {
        "type": "3k",
        "name": "3-комнатная (евро)",
        "area": "72.0 - 83.8 м²",
        "price_from": 9200000,
        "price_sqm": 112000,
        "count": 9
      }
    ],
    "domrf_url": "https://scandinaviya.kssk.ru",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Скандинавия+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-metro",
    "name": "ЖК Метро",
    "developer": "Кировский ССК",
    "district": "Октябрьский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, ул. Московская, 209А",
    "lat": 58.59839,
    "lng": 49.57522,
    "price_from": 4500000,
    "price_to": 9900000,
    "price_sqm_from": 114000,
    "completion_date": "2027 - 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "16-17 этажей",
    "wall_material": "Монолит-панель ССК",
    "images": [
      "https://kvartiry.kssk.ru/upload/iblock/c36/tnumtb2c6xzotv9cpsi2bt5ame56eux6/cp-_2_.png"
    ],
    "description": "Современный жилой комплекс вдоль Московской улицы с удобным выездом в центр. Возможна покупка с частичным ПВ 10% и меблировкой в ипотеку.",
    "features": [
      "Удобная транспортная развязка",
      "Частичный ПВ 10%",
      "Отделка по спеццене"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "26.5 - 29.0 м²",
        "price_from": 4500000,
        "price_sqm": 152000,
        "count": 9
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "35.0 - 42.0 м²",
        "price_from": 5200000,
        "price_sqm": 130000,
        "count": 16
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "51.0 - 62.0 м²",
        "price_from": 6800000,
        "price_sqm": 114000,
        "count": 14
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Метро+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-sloboda",
    "name": "ЖК Слобода",
    "developer": "Кировский ССК",
    "district": "Ленинский район",
    "microdistrict": "Чистые Пруды",
    "address": "г. Киров, ул. Потребкооперации, 34",
    "lat": 58.56287,
    "lng": 49.62795,
    "price_from": 3900000,
    "price_to": 8800000,
    "price_sqm_from": 102000,
    "completion_date": "2026 - II кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "14-17 этажей",
    "wall_material": "Панель ССК",
    "images": [
      "https://kvartiry.kssk.ru/upload/resize_cache/iblock/8d2/g6496yryhiyoos2e812df6gexuc85eqj/1920_1080_1/1.jpg"
    ],
    "description": "Популярный квартал комфорт-класса на Юго-Западе с поэтапным вводом секций и доступным порогом входа.",
    "features": [
      "Доступная цена входа",
      "Частичный ПВ 10%",
      "Развитая инфраструктура района"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "25.0 - 28.0 м²",
        "price_from": 3900000,
        "price_sqm": 138000,
        "count": 11
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 41.0 м²",
        "price_from": 4700000,
        "price_sqm": 118000,
        "count": 18
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "50.0 - 60.0 м²",
        "price_from": 5900000,
        "price_sqm": 102000,
        "count": 15
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Слобода+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-x2",
    "name": "ЖК Х2",
    "developer": "Кировский ССК",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, Хлебозаводской проезд, 2",
    "lat": 58.60265,
    "lng": 49.6451,
    "price_from": 6700000,
    "price_to": 15900000,
    "price_sqm_from": 148000,
    "completion_date": "IV кв. 2026 - I кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "17 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://kvartiry.kssk.ru/upload/resize_cache/iblock/619/1o8a00nic0hscqukifnbcklde0aj30km/1920_1080_1/1.jpg"
    ],
    "description": "Жилой комплекс бизнес-класса в ближнем центре Кирова. Стильная архитектура, закрытый двор и быстрая выдача ключей в 2027 году.",
    "features": [
      "Бизнес-класс в ближнем центре",
      "Высокая готовность",
      "Подземный паркинг"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "40.0 - 46.0 м²",
        "price_from": 6700000,
        "price_sqm": 156000,
        "count": 8
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "58.0 - 70.0 м²",
        "price_from": 9100000,
        "price_sqm": 150000,
        "count": 10
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "80.0 - 102.0 м²",
        "price_from": 12300000,
        "price_sqm": 148000,
        "count": 5
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Х2+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-dom-u-reki",
    "name": "ЖК Дом у реки",
    "developer": "Кировский ССК",
    "district": "Первомайский район",
    "microdistrict": "Дымково",
    "address": "г. Киров, ул. Заводская, 14, 14к2",
    "lat": 58.62803,
    "lng": 49.67586,
    "price_from": 6210000,
    "price_to": 12800000,
    "price_sqm_from": 132000,
    "completion_date": "IV кв. 2027 - I кв. 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "16 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://kvartiry.kssk.ru/upload/iblock/1c0/q4mi0gulsu0z26kk8gfb083v08t27vwu/2-_5_-_1_.jpg"
    ],
    "description": "Видовые квартиры семейного формата с панорамой на реку Вятку (площади 41.1 - 69.1 м²). Семейная ипотека 5% при ПВ от 20.1%.",
    "features": [
      "Панорама на реку Вятку",
      "Семейные планировки 41-69 м²",
      "Близость к историческому центру"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "41.1 - 54.0 м²",
        "price_from": 6210000,
        "price_sqm": 142000,
        "count": 14
      },
      {
        "type": "3k",
        "name": "3-комнатная (евро)",
        "area": "60.0 - 69.1 м²",
        "price_from": 8600000,
        "price_sqm": 132000,
        "count": 10
      }
    ],
    "domrf_url": "https://domureki.kssk.ru",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Дом+у+реки+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-pushkina",
    "name": "ЖК Пушкина",
    "developer": "Кировский ССК",
    "district": "Нововятский район",
    "microdistrict": "Нововятск",
    "address": "г. Киров, Нововятский р-н, ул. Пушкина, 25, 25/1",
    "lat": 58.51136,
    "lng": 49.6917,
    "price_from": 3300000,
    "price_to": 7400000,
    "price_sqm_from": 92000,
    "completion_date": "IV кв. 2026 - IV кв. 2029",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "10-16 этажей",
    "wall_material": "Панель ССК",
    "images": [
      "https://kvartiry.kssk.ru/upload/resize_cache/iblock/d0c/ym3vb6ld7ue1p12xvd6q0a2hcajvpx32/1920_1080_1/1.jpg"
    ],
    "description": "Доступные квартиры в Нововятском районе с возможностью покупки с частичным ПВ 10% и в рассрочку.",
    "features": [
      "Самый доступный порог входа в городе",
      "Частичный ПВ 10%",
      "Рядом зеленая зона"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "24.5 - 28.0 м²",
        "price_from": 3300000,
        "price_sqm": 122000,
        "count": 12
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 40.0 м²",
        "price_from": 3950000,
        "price_sqm": 104000,
        "count": 20
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "49.0 - 59.0 м²",
        "price_from": 5100000,
        "price_sqm": 92000,
        "count": 16
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Пушкина+Киров",
    "builder_url": "https://kssk.ru",
    "contact_phone": "+7 (8332) 71-44-44"
  },
  {
    "id": "zhk-metropolis",
    "name": "ЖК Метрополис",
    "developer": "ПрофСтрой",
    "district": "Ленинский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, ул. Воровского, 173 (р-н Зубаревского леса)",
    "lat": 58.59733,
    "lng": 49.5826,
    "price_from": 4100000,
    "price_to": 11200000,
    "price_sqm_from": 128000,
    "completion_date": "III кв. 2029",
    "completion_year": 2029,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "25 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://static.tildacdn.com/tila6435-3634-4463-a164-316235663362/download_4.jpg"
    ],
    "description": "Масштабный жилой квартал: 25-этажная секция I этапа, общий стилобат с благоустройством на кровле, двухуровневый закрытый паркинг и траншевая ипотека.",
    "features": [
      "Старт продаж",
      "Стилобат с кровлей-парком",
      "Закрытый 2-ур. паркинг",
      "Траншевая ипотека"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "21.5 - 26.0 м²",
        "price_from": 4100000,
        "price_sqm": 158000,
        "count": 22
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "32.0 - 40.0 м²",
        "price_from": 4950000,
        "price_sqm": 138000,
        "count": 35
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "46.0 - 56.0 м²",
        "price_from": 6800000,
        "price_sqm": 132000,
        "count": 28
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "60.0 - 66.6 м²",
        "price_from": 8900000,
        "price_sqm": 128000,
        "count": 15
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Метрополис+Киров",
    "builder_url": "https://жк-метрополис.рф",
    "contact_phone": "+7 (922) 990-57-17"
  },
  {
    "id": "zhk-vdohnovenie",
    "name": "ЖК Вдохновение",
    "developer": "ПрофСтрой",
    "district": "Ленинский район",
    "microdistrict": "Юго-Западный",
    "address": "г. Киров, мкр. Урванцево, ул. Энтузиастов, 17 к.1",
    "lat": 58.58491,
    "lng": 49.5726,
    "price_from": 5300000,
    "price_to": 11800000,
    "price_sqm_from": 134000,
    "completion_date": "III кв. 2028",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "white_box"
    ],
    "floors": "14-17 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "https://static.tildacdn.com/tila6237-6239-4133-a261-343936373232/download_3.jpg"
    ],
    "description": "Современный комплекс в районе Европейских улочек с субсидированными ставками по семейной ипотеке и скидками через кабинет агента до 6.5%.",
    "features": [
      "Район Европейские улочки",
      "Скидки до 6.5%",
      "Семейная ипотека со сниженной ставкой"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 42.0 м²",
        "price_from": 5300000,
        "price_sqm": 146000,
        "count": 14
      },
      {
        "type": "2k",
        "name": "2-комнатная (евро)",
        "area": "41.7 - 52.0 м²",
        "price_from": 6900000,
        "price_sqm": 139000,
        "count": 18
      },
      {
        "type": "3k",
        "name": "3-комнатная (евро)",
        "area": "51.4 - 68.0 м²",
        "price_from": 7140000,
        "price_sqm": 134000,
        "count": 10
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Вдохновение+Киров",
    "builder_url": "https://profstroy-kirov.ru",
    "contact_phone": "+7 (922) 990-57-17"
  },
  {
    "id": "zhk-kapital",
    "name": "ЖК Капитал",
    "developer": "ПрофСтрой",
    "district": "Первомайский район",
    "microdistrict": "Исторический центр",
    "address": "г. Киров, ул. Орловская, 62Б",
    "lat": 58.59489,
    "lng": 49.66635,
    "price_from": 12800000,
    "price_to": 26000000,
    "price_sqm_from": 178000,
    "completion_date": "IV кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "white_box"
    ],
    "floors": "8-10 этажей",
    "wall_material": "Керамический кирпич",
    "images": [
      "https://static.tildacdn.com/tila3961-3437-4030-b564-613030663662/_ChatGPT_9__2026__09.png"
    ],
    "description": "Клубный дом бизнес-класса в историческом центре Кирова. Камерная атмосфера, высокие потолки, подземный паркинг и закрытый двор.",
    "features": [
      "Клубный формат в центре",
      "Подземный паркинг",
      "Кирпичные стены"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "66.0 - 80.0 м²",
        "price_from": 12800000,
        "price_sqm": 182000,
        "count": 8
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "90.0 - 125.0 м²",
        "price_from": 16800000,
        "price_sqm": 178000,
        "count": 5
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Капитал+Киров",
    "builder_url": "https://profstroy-kirov.ru",
    "contact_phone": "+7 (922) 990-57-17"
  },
  {
    "id": "zhk-garmoniya",
    "name": "ЖК Гармония",
    "developer": "ПрофСтрой",
    "district": "Первомайский район",
    "microdistrict": "Исторический центр",
    "address": "г. Киров, ул. Ленина, 106",
    "lat": 58.59111,
    "lng": 49.68249,
    "price_from": 10800000,
    "price_to": 21500000,
    "price_sqm_from": 165000,
    "completion_date": "IV кв. 2026",
    "completion_year": 2026,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "white_box"
    ],
    "floors": "7-10 этажей",
    "wall_material": "Светлый кирпич",
    "images": [
      "https://static.tildacdn.com/tila3065-6639-4435-b564-316238623037/download_1.jpg"
    ],
    "description": "Дом высокой степени готовности в историческом центре на ул. Ленина, 106. Светлый кирпичный фасад, большие окна, малоэтажная секция.",
    "features": [
      "Сдача в конце 2026 г.",
      "Исторический центр",
      "Малоэтажная секция"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "62.0 - 74.0 м²",
        "price_from": 10800000,
        "price_sqm": 170000,
        "count": 6
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "85.0 - 110.0 м²",
        "price_from": 14500000,
        "price_sqm": 165000,
        "count": 4
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Гармония+Киров",
    "builder_url": "https://profstroy-kirov.ru",
    "contact_phone": "+7 (922) 990-57-17"
  },
  {
    "id": "zhk-murashinskiy-7",
    "name": "Дом на Мурашинском 7",
    "developer": "ПрофСтрой",
    "district": "Октябрьский район",
    "microdistrict": "ОЦМ",
    "address": "г. Киров, Мурашинский проезд, д. 7",
    "lat": 58.616364,
    "lng": 49.608994,
    "price_from": 6325000,
    "price_to": 8520000,
    "price_sqm_from": 147000,
    "completion_date": "Сдан (II кв. 2026)",
    "completion_year": 2026,
    "is_completed": true,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "13 этажей",
    "wall_material": "Кирпич",
    "images": [
      "/images/developments/zhk-murashinskiy-7.jpg",
      "https://regburokirov.ru/media/photo_nb/282_2928_458d00dcd0b015d4923afb3f75982e.jpg"
    ],
    "description": "Кирпичный жилой дом комфорт-класса в Октябрьском районе недалеко от парка Победы. 13 этажей, 77 квартир, тёплый чердак, два лифта, закрытая придомовая территория.",
    "features": [
      "Дом сдан",
      "100% кирпич",
      "Рядом парк Победы",
      "Всего 77 квартир"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "42.9 - 43.6 м²",
        "price_from": 6325000,
        "price_sqm": 147440,
        "count": 5
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.6 м²",
        "price_from": 8262000,
        "price_sqm": 151320,
        "count": 1
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек/объект/58185",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Мурашинский+проезд+7+Киров",
    "builder_url": "https://unitflow.profstroy-services.ru/apartments",
    "contact_phone": "+7 (8332) 77-50-50"
  },
  {
    "id": "zhk-zapovedny",
    "name": "ЖК Заповедный",
    "developer": "Стройсоюз",
    "district": "Первомайский район",
    "microdistrict": "Макарье",
    "address": "г. Киров, ул. Сандаловская, 2а, 2а/1 / ул. Заповедная",
    "lat": 58.62139,
    "lng": 49.71333,
    "price_from": 4880000,
    "price_to": 9500000,
    "price_sqm_from": 118000,
    "completion_date": "до II кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "4-5 этажей",
    "wall_material": "Кирпич",
    "images": [
      "/images/developments/zhk-zapovedny.png",
      "https://stroy-soyuz.ru/upload/iblock/ebd/7ynvpus9i400j4ns5gtyvz37ob9fxfij.png"
    ],
    "description": "Малоэтажный кирпичный квартал в зеленой зоне. В новой очереди действует программа с ремонтом 15 000 ₽/м² и сниженной ипотечной ставкой.",
    "features": [
      "Малоэтажная кирпичная застройка",
      "Загородная атмосфера",
      "Выгодный ремонт от застройщика"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "27.0 - 31.0 м²",
        "price_from": 4880000,
        "price_sqm": 148000,
        "count": 8
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 42.0 м²",
        "price_from": 5100000,
        "price_sqm": 130000,
        "count": 14
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "50.0 - 62.0 м²",
        "price_from": 5800000,
        "price_sqm": 118000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Заповедный+Киров",
    "builder_url": "https://stroysoyuz43.ru",
    "contact_phone": "+7 (8332) 71-57-05"
  },
  {
    "id": "zhk-repinskie-prudy",
    "name": "ЖК Репинские пруды",
    "developer": "Стройсоюз",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, ул. Блюхера, 46 / ул. Никитская",
    "lat": 58.58245,
    "lng": 49.6753,
    "price_from": 5650000,
    "price_to": 14500000,
    "price_sqm_from": 166000,
    "completion_date": "II кв. 2028",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "8-14 этажей",
    "wall_material": "Кирпич",
    "images": [
      "https://stroy-soyuz.ru/upload/iblock/ec2/de1ml5tuttay9nsgc2ps1mt7l42tambx.jpg"
    ],
    "description": "Новая очередь престижного жилого комплекса в центральной части Кирова рядом с парковой зоной и инфраструктурой.",
    "features": [
      "Центральное расположение",
      "Кирпичные дома",
      "Закрытые дворы"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 42.0 м²",
        "price_from": 5650000,
        "price_sqm": 168000,
        "count": 10
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 68.0 м²",
        "price_from": 8900000,
        "price_sqm": 166000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Репинские+пруды+Киров",
    "builder_url": "https://stroysoyuz43.ru",
    "contact_phone": "+7 (8332) 71-57-05"
  },
  {
    "id": "zhk-sloboda-solomintsy",
    "name": "ЖК Слобода Соломинцы",
    "developer": "Стройсоюз",
    "district": "Нововятский район",
    "microdistrict": "Соломинцы",
    "address": "г. Киров, ул. Мичурина / ул. Соломинская",
    "lat": 58.50673,
    "lng": 49.67763,
    "price_from": 5200000,
    "price_to": 9800000,
    "price_sqm_from": 114000,
    "completion_date": "IV кв. 2028 - I кв. 2029",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "4 этажа",
    "wall_material": "Кирпич",
    "images": [
      "https://stroy-soyuz.ru/upload/iblock/161/wmk1jwiyfgbbbk13kd5wmgcqrvk5rcdu.jpg"
    ],
    "description": "Малоэтажные 4-этажные кирпичные дома с дворами без машин, окруженные природой. Продуманные семейные планировки.",
    "features": [
      "Всего 4 этажа",
      "Дворы без машин",
      "Природа рядом",
      "Кирпичный дом"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "38.0 - 44.0 м²",
        "price_from": 5200000,
        "price_sqm": 124000,
        "count": 10
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 66.0 м²",
        "price_from": 6800000,
        "price_sqm": 114000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Слобода+Соломинцы",
    "builder_url": "https://stroysoyuz43.ru",
    "contact_phone": "+7 (8332) 71-57-05"
  },
  {
    "id": "zhk-premier",
    "name": "Клубный дом «Премьер»",
    "developer": "Стройсоюз",
    "district": "Первомайский район",
    "microdistrict": "Исторический центр",
    "address": "г. Киров, ул. Свободы, 115Г",
    "lat": 58.59508,
    "lng": 49.67707,
    "price_from": 11500000,
    "price_to": 28000000,
    "price_sqm_from": 185000,
    "completion_date": "2026 - 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Премиум",
    "finishing": [
      "white_box"
    ],
    "floors": "5-7 этажей",
    "wall_material": "Кирпич",
    "images": [
      "https://stroy-soyuz.ru/upload/iblock/5d5/vxwl8zau5uas806jzu922qhucdl15kdl.jpg"
    ],
    "description": "Приватный клубный дом в историческом центре города. Высокий уровень приватности, семейная ипотека 6% при ПВ 50%.",
    "features": [
      "Приватность и клубный формат",
      "Исторический центр",
      "Свободные планировки"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "62.0 - 78.0 м²",
        "price_from": 11500000,
        "price_sqm": 185000,
        "count": 5
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "90.0 - 130.0 м²",
        "price_from": 16800000,
        "price_sqm": 185000,
        "count": 4
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Премьер+Свободы+115",
    "builder_url": "https://stroysoyuz43.ru",
    "contact_phone": "+7 (8332) 71-57-05"
  },
  {
    "id": "zhk-uspenskaya",
    "name": "Резиденция «На Успенской»",
    "developer": "Стройсоюз",
    "district": "Первомайский район",
    "microdistrict": "Исторический центр",
    "address": "г. Киров, ул. Успенская, 29, 33",
    "lat": 58.59662,
    "lng": 49.68814,
    "price_from": 11500000,
    "price_to": 24000000,
    "price_sqm_from": 178000,
    "completion_date": "2026 - 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Премиум",
    "finishing": [
      "white_box"
    ],
    "floors": "4-6 этажей",
    "wall_material": "Кирпич",
    "images": [
      "https://stroy-soyuz.ru/upload/iblock/cef/yrb07os5t4crdbvsxu70hr1kmvm7bflj.jpg"
    ],
    "description": "Камерная резиденция в историческом центре (корпус на Успенской, 29 - всего 8 квартир). Закрытый двор, дизайнерское лобби, угловые окна.",
    "features": [
      "Камерный дом (8 квартир)",
      "Дизайнерское лобби",
      "Закрытый внутренний двор"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "65.0 - 75.0 м²",
        "price_from": 11500000,
        "price_sqm": 178000,
        "count": 4
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "85.0 - 115.0 м²",
        "price_from": 15200000,
        "price_sqm": 178000,
        "count": 3
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Резиденция+на+Успенской",
    "builder_url": "https://stroysoyuz43.ru",
    "contact_phone": "+7 (8332) 71-57-05"
  },
  {
    "id": "zhk-gorkogo-2a",
    "name": "Дом на Горького, 2А",
    "developer": "КИНО Девелопмент",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, ул. Горького, 2А",
    "lat": 58.603,
    "lng": 49.65067,
    "price_from": 11700000,
    "price_to": 24500000,
    "price_sqm_from": 175000,
    "completion_date": "III кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "white_box"
    ],
    "floors": "11 этажей",
    "wall_material": "Кирпич",
    "images": [
      "/images/developments/zhk-gorkogo-2a.jpg",
      "https://gorkogo2a.ru/static/images/start-screen-bg.jpeg"
    ],
    "description": "Кирпичный дом бизнес-класса в центральной части Кирова с подземным паркингом. В ноябре 2026 действуют скидки до 2.2 млн руб.",
    "features": [
      "Бизнес-класс",
      "Подземный паркинг",
      "Скидки до 2.2 млн в ноябре"
    ],
    "apartments": [
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "64.0 - 76.0 м²",
        "price_from": 11700000,
        "price_sqm": 180000,
        "count": 8
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "88.0 - 118.0 м²",
        "price_from": 15400000,
        "price_sqm": 175000,
        "count": 6
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Горького+2а+Киров",
    "builder_url": "https://кинодевелопмент.рф",
    "contact_phone": "+7 (8332) 45-45-45"
  },
  {
    "id": "zhk-fusion-kino",
    "name": "ЖК Fusion (Фьюжн)",
    "developer": "КИНО Девелопмент",
    "district": "Нововятский район",
    "microdistrict": "Нововятск",
    "address": "Кирово-Чепецкий р-н, д. Шутовщина, ул. Ботаническая",
    "lat": 58.46621,
    "lng": 49.71345,
    "price_from": 3420000,
    "price_to": 8200000,
    "price_sqm_from": 108000,
    "completion_date": "II кв. 2027 - II кв. 2028",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "5-8 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "/images/developments/zhk-fusion-kino.jpg",
      "https://cdn.idalite.ru/i/insecure/q:85/rs:fit:1920:0/g:ce/bl:0/c:0/plain/s3://idalite-media/media/projects/19305b28-5de6-427b-b7dd-dee0829c24de/sites/blocks/29c0dcb70fc241b5a0fccd5e1f035f6d.jpg"
    ],
    "description": "Среднеэтажный пригородный проект рядом с Нововятским районом. Компактные студии и евро-планировки с выбором чистовой отделки.",
    "features": [
      "Доступный старт цены",
      "Малоэтажная среда",
      "Акционные лоты в ноябре"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "24.5 - 28.0 м²",
        "price_from": 3420000,
        "price_sqm": 128000,
        "count": 12
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "34.0 - 41.0 м²",
        "price_from": 4200000,
        "price_sqm": 115000,
        "count": 18
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "50.0 - 62.0 м²",
        "price_from": 5600000,
        "price_sqm": 108000,
        "count": 14
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Фьюжн+Киров",
    "builder_url": "https://кинодевелопмент.рф",
    "contact_phone": "+7 (8332) 45-45-45"
  },
  {
    "id": "zhk-yuterra",
    "name": "ЖК Ютерра",
    "developer": "КИНО Девелопмент",
    "district": "Нововятский район",
    "microdistrict": "Нововятск",
    "address": "Кирово-Чепецкий р-н, д. Шутовщина, ул. Беговая / ул. Творчества",
    "lat": 58.4681,
    "lng": 49.7162,
    "price_from": 2999000,
    "price_to": 7900000,
    "price_sqm_from": 102000,
    "completion_date": "I кв. 2029",
    "completion_year": 2029,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "white_box",
      "turnkey"
    ],
    "floors": "5-8 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "https://cdn.idalite.ru/i/insecure/q:85/rs:fit:1200:1200/plain/s3://idalite-media/media/images/b6887fedb1774ab6843843d591b7e2b7.jpg"
    ],
    "description": "Старт продаж 03.11.2026: 6 кварталов из 14 домов в эстетике минимализма. Школа на 1100 мест, детсад на 140 мест, спортивный бульвар 2.1 км и 3 варианта отделки.",
    "features": [
      "Старт продаж 11.2026 от 2.99 млн",
      "Школа 1100 мест и детсад",
      "Беговой бульвар 2100 м"
    ],
    "apartments": [
      {
        "type": "studio",
        "name": "Студия",
        "area": "24.0 - 27.5 м²",
        "price_from": 2999000,
        "price_sqm": 118000,
        "count": 20
      },
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "33.5 - 40.0 м²",
        "price_from": 3850000,
        "price_sqm": 108000,
        "count": 28
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "49.0 - 60.0 м²",
        "price_from": 5300000,
        "price_sqm": 102000,
        "count": 22
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Ютерра",
    "builder_url": "https://ютерра.рф",
    "contact_phone": "+7 (8332) 45-45-45"
  },
  {
    "id": "zhk-mayak",
    "name": "ЖД Маяк",
    "developer": "СМУ-5",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, ул. Молодой Гвардии, 84 к.4",
    "lat": 58.59775,
    "lng": 49.65471,
    "price_from": 6110000,
    "price_to": 18500000,
    "price_sqm_from": 165000,
    "completion_date": "IV кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "white_box"
    ],
    "floors": "10-14 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://smu5kirov.ru/uploads/im/img-20260423-203107-6a031eb60c6cf132138429.png"
    ],
    "description": "Малоквартирный дом бизнес-класса в центре Кирова. Доступны евро-3 площадью 65.89 м² по спеццене 180 тыс. ₽/м².",
    "features": [
      "Бизнес-класс в центре",
      "Малоквартирный формат",
      "Монолит-кирпич"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "38.0 - 46.0 м²",
        "price_from": 6110000,
        "price_sqm": 165000,
        "count": 8
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "58.0 - 70.0 м²",
        "price_from": 9800000,
        "price_sqm": 170000,
        "count": 10
      },
      {
        "type": "3k",
        "name": "3-комнатная (евро)",
        "area": "65.9 - 92.0 м²",
        "price_from": 11860000,
        "price_sqm": 180000,
        "count": 6
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Маяк+Молодой+Гвардии+84",
    "builder_url": "https://smu5kirov.ru",
    "contact_phone": "+7 (8332) 71-11-55"
  },
  {
    "id": "zhk-sovremennik",
    "name": "ЖД Современник",
    "developer": "СМУ-5",
    "district": "Ленинский район",
    "microdistrict": "Зональный",
    "address": "г. Киров, ул. Хлыновская, 21",
    "lat": 58.58129,
    "lng": 49.68172,
    "price_from": 6140000,
    "price_to": 14800000,
    "price_sqm_from": 142000,
    "completion_date": "III кв. 2028",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "white_box"
    ],
    "floors": "17 этажей",
    "wall_material": "Кирпич",
    "images": [
      "https://smu5kirov.ru/uploads/11/11-post-6aedf408d57a9573429649.jpg"
    ],
    "description": "17-этажный кирпичный дом комфорт-класса в Зональном районе с видовыми квартирами. Действует акция со скидкой 1 млн руб. на видовые квартиры.",
    "features": [
      "Скидка 1 млн на видовые квартиры",
      "100% кирпич",
      "Видовые этажи"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "40.0 - 46.0 м²",
        "price_from": 6140000,
        "price_sqm": 148000,
        "count": 12
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "56.0 - 68.0 м²",
        "price_from": 8100000,
        "price_sqm": 142000,
        "count": 14
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "76.0 - 94.0 м²",
        "price_from": 10900000,
        "price_sqm": 142000,
        "count": 8
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Современник+Хлыновская+21",
    "builder_url": "https://smu5kirov.ru",
    "contact_phone": "+7 (8332) 71-11-55"
  },
  {
    "id": "zhk-rudnitskogo-32",
    "name": "Клубный дом на Рудницкого, 32",
    "developer": "СМУ-5",
    "district": "Ленинский район",
    "microdistrict": "Зональный",
    "address": "г. Киров, ул. Рудницкого, 32",
    "lat": 58.57073,
    "lng": 49.69126,
    "price_from": 6800000,
    "price_to": 15500000,
    "price_sqm_from": 148000,
    "completion_date": "IV кв. 2026",
    "completion_year": 2026,
    "is_completed": false,
    "housing_class": "Бизнес",
    "finishing": [
      "white_box"
    ],
    "floors": "8-10 этажей",
    "wall_material": "Кирпич",
    "images": [
      "https://smu5kirov.ru/uploads/13/1394kh952-2-6a4671d68d8c2319688891.jpg"
    ],
    "description": "Клубный кирпичный дом бизнес-класса в тихом районе с высокой степенью готовности (сдача в IV кв. 2026 г.).",
    "features": [
      "Бизнес-класс",
      "Сдача в конце 2026 г.",
      "Кирпичный дом"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "42.0 - 48.0 м²",
        "price_from": 6800000,
        "price_sqm": 155000,
        "count": 5
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "60.0 - 72.0 м²",
        "price_from": 9200000,
        "price_sqm": 148000,
        "count": 7
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Рудницкого+32+Киров",
    "builder_url": "https://smu5kirov.ru",
    "contact_phone": "+7 (8332) 71-11-55"
  },
  {
    "id": "zhk-dinastiya",
    "name": "ЖК Династия",
    "developer": "Алтай-Строй",
    "district": "Ленинский район",
    "microdistrict": "Центр (Ленинский)",
    "address": "г. Киров, Хлебозаводской проезд, 30",
    "lat": 58.59441,
    "lng": 49.6399,
    "price_from": 6500000,
    "price_to": 22000000,
    "price_sqm_from": 130000,
    "completion_date": "IV кв. 2026 - II кв. 2027",
    "completion_year": 2027,
    "is_completed": false,
    "housing_class": "Премиум",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "8-16 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://altai-stroi.org/upload/iblock/d03/ce1q0yk45y5sxgdea6v2mbypcjq2qkbo.jpg"
    ],
    "description": "Жилой комплекс переменной этажности с подземным паркингом и закрытой территорией в ближнем центре. Первый этап готовится к вводу.",
    "features": [
      "Подземный паркинг",
      "Закрытая территория",
      "1-й этап на вводе"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "42.0 - 49.0 м²",
        "price_from": 6500000,
        "price_sqm": 145000,
        "count": 8
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "62.0 - 74.0 м²",
        "price_from": 9100000,
        "price_sqm": 135000,
        "count": 10
      },
      {
        "type": "3k",
        "name": "3-комнатная",
        "area": "76.0 - 98.0 м²",
        "price_from": 10000000,
        "price_sqm": 130000,
        "count": 7
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Династия+Киров",
    "builder_url": "https://altai-stroi.org",
    "contact_phone": "+7 (8332) 77-88-99"
  },
  {
    "id": "zhk-oniks",
    "name": "ЖК Оникс",
    "developer": "Алтай-Строй",
    "district": "Ленинский район",
    "microdistrict": "Ж/Д вокзал",
    "address": "г. Киров, ул. Гороховская, 85, 87",
    "lat": 58.57883,
    "lng": 49.64366,
    "price_from": 4900000,
    "price_to": 11500000,
    "price_sqm_from": 118000,
    "completion_date": "I кв. 2028",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт+",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "14-17 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "https://altai-stroi.org/upload/iblock/c7b/6zfil22f37crs9d0p4mvog1j253xnolj.jpg"
    ],
    "description": "Современный многоквартирный комплекс на улице Гороховской с удобным выездом в центр и к ж/д вокзалу.",
    "features": [
      "Удобная локация",
      "Монолит-кирпич",
      "Рациональные планировки"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "36.0 - 44.0 м²",
        "price_from": 4900000,
        "price_sqm": 128000,
        "count": 12
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 65.0 м²",
        "price_from": 6800000,
        "price_sqm": 118000,
        "count": 14
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=ЖК+Оникс+Киров",
    "builder_url": "https://altai-stroi.org",
    "contact_phone": "+7 (8332) 77-88-99"
  },
  {
    "id": "zhk-erdyakova-9",
    "name": "ЖД на Ердякова, 9",
    "developer": "СМТ",
    "district": "Октябрьский район",
    "microdistrict": "Лепсе",
    "address": "г. Киров, ул. Романа Ердякова, 9",
    "lat": 58.60955,
    "lng": 49.6358,
    "price_from": 4970000,
    "price_to": 9800000,
    "price_sqm_from": 116000,
    "completion_date": "IV кв. 2026",
    "completion_year": 2026,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "turnkey"
    ],
    "floors": "12-16 этажей",
    "wall_material": "Кирпич, монолит",
    "images": [
      "https://altai-stroi.org/upload/iblock/115/2dpk73u5kqm063pstvqi9n1y62ek32l1.jpg"
    ],
    "description": "Новый жилой дом от застройщика СМТ (ГК Алтай-Строй) с выбором квартир в чистовой и черновой отделке, рассрочкой и ипотечными программами.",
    "features": [
      "Выбор чистовой отделки",
      "Рассрочка",
      "Сдача в IV кв. 2026"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "38.0 - 43.0 м²",
        "price_from": 4970000,
        "price_sqm": 124000,
        "count": 9
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "55.0 - 68.7 м²",
        "price_from": 6600000,
        "price_sqm": 116000,
        "count": 11
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Ердякова+9+Киров",
    "builder_url": "https://altai-stroi.org",
    "contact_phone": "+7 (8332) 77-88-99"
  },
  {
    "id": "zhk-krasina-6",
    "name": "Дом на Красина, 6",
    "developer": "СМУ-16",
    "district": "Ленинский район",
    "microdistrict": "Ж/Д вокзал",
    "address": "г. Киров, ул. Красина, 6",
    "lat": 58.57945,
    "lng": 49.64362,
    "price_from": 5200000,
    "price_to": 10800000,
    "price_sqm_from": 122000,
    "completion_date": "II кв. 2028",
    "completion_year": 2028,
    "is_completed": false,
    "housing_class": "Комфорт",
    "finishing": [
      "rough",
      "white_box"
    ],
    "floors": "12-16 этажей",
    "wall_material": "Монолит-кирпич",
    "images": [
      "/images/developments/zhk-krasina-6.jpg"
    ],
    "description": "Монолитно-кирпичный дом комфорт-класса на улице Красина. Планируемый ввод во II квартале 2028 года.",
    "features": [
      "Монолитно-кирпичная технология",
      "Транспортная доступность",
      "Комфорт-класс"
    ],
    "apartments": [
      {
        "type": "1k",
        "name": "1-комнатная",
        "area": "38.0 - 44.0 м²",
        "price_from": 5200000,
        "price_sqm": 128000,
        "count": 10
      },
      {
        "type": "2k",
        "name": "2-комнатная",
        "area": "54.0 - 64.0 м²",
        "price_from": 6900000,
        "price_sqm": 122000,
        "count": 12
      }
    ],
    "domrf_url": "https://xn--80az8a.xn--d1aqf.xn--p1ai/сервисы/каталог-новостроек",
    "avito_url": "https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry?q=Красина+6+Киров",
    "builder_url": "https://smu16.ru",
    "contact_phone": "+7 (8332) 64-00-16"
  }
];
// @DEVELOPMENTS_DATA_END

const STORAGE_KEY = 'reacrm_custom_developments';
const REMOTE_CACHE_KEY = 'reacrm_developments_remote_cache';
const REMOTE_META_KEY = 'reacrm_developments_sync_meta';

const CATALOG_VERSION = '2026-11-17-v2';

function mergeDevelopmentsLists(baseList, customList) {
  const map = new Map();
  (baseList || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  (customList || []).forEach(item => {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (existing) {
        // Always prioritize the canonical high-res images from baseList (DEFAULT_DEVELOPMENTS)
        const imagesToUse = (existing.images && existing.images.length > 0)
          ? existing.images
          : (item.images || []);
        map.set(item.id, { ...item, ...existing, images: imagesToUse });
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

export function getDevelopmentsSyncMeta() {
  if (typeof window === 'undefined') {
    return { updatedAt: null, source: 'static', catalogVersion: CATALOG_VERSION };
  }
  try {
    const raw = localStorage.getItem(REMOTE_META_KEY);
    return raw ? JSON.parse(raw) : { updatedAt: null, source: 'static', catalogVersion: CATALOG_VERSION };
  } catch {
    return { updatedAt: null, source: 'static', catalogVersion: CATALOG_VERSION };
  }
}

export function getStoredDevelopments() {
  if (typeof window === 'undefined') return DEFAULT_DEVELOPMENTS;
  try {
    const meta = getDevelopmentsSyncMeta();
    if (meta?.catalogVersion !== CATALOG_VERSION) {
      // Clear outdated remote cache so fresh canonical DEFAULT_DEVELOPMENTS are used immediately
      localStorage.removeItem(REMOTE_CACHE_KEY);
    }

    let baseList = DEFAULT_DEVELOPMENTS;
    const cachedRaw = localStorage.getItem(REMOTE_CACHE_KEY);
    if (cachedRaw) {
      const parsedCache = JSON.parse(cachedRaw);
      if (Array.isArray(parsedCache) && parsedCache.length > 0) {
        baseList = mergeDevelopmentsLists(DEFAULT_DEVELOPMENTS, parsedCache);
      }
    }

    const customRaw = localStorage.getItem(STORAGE_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : [];
    return mergeDevelopmentsLists(baseList, custom);
  } catch (err) {
    console.warn('[developmentsData] Failed to load custom developments:', err);
    return DEFAULT_DEVELOPMENTS;
  }
}

export async function fetchLatestDevelopments({ forceRefresh = false } = {}) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return {
      developments: DEFAULT_DEVELOPMENTS,
      updatedAt: null,
      source: 'static'
    };
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const meta = getDevelopmentsSyncMeta();
  const needVersionRefresh = meta?.catalogVersion !== CATALOG_VERSION;

  // Если за сегодня уже синхронизировали, нет явного forceRefresh и версия актуальна - отдаем локальный кеш
  if (!forceRefresh && !needVersionRefresh && meta.lastCheckedDate === todayKey) {
    return {
      developments: getStoredDevelopments(),
      updatedAt: meta.updatedAt || null,
      source: meta.source || 'cache'
    };
  }

  try {
    const cacheBust = forceRefresh || needVersionRefresh ? Date.now() : todayKey;
    const res = await fetch(`/data/developments.json?v=${cacheBust}`, {
      cache: forceRefresh || needVersionRefresh ? 'reload' : 'no-cache'
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const payload = await res.json();
    const remoteList = Array.isArray(payload?.developments) ? payload.developments : [];
    if (remoteList.length > 0) {
      localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(remoteList));
      const nextMeta = {
        updatedAt: payload.updated_at || new Date().toISOString(),
        source: payload.source || 'remote',
        lastCheckedDate: todayKey,
        count: remoteList.length,
        catalogVersion: CATALOG_VERSION
      };
      localStorage.setItem(REMOTE_META_KEY, JSON.stringify(nextMeta));
      return {
        developments: getStoredDevelopments(),
        updatedAt: nextMeta.updatedAt,
        source: nextMeta.source
      };
    }
  } catch (err) {
    console.warn('[developmentsData] Daily feed fetch fallback to bundled data:', err.message);
  }

  return {
    developments: getStoredDevelopments(),
    updatedAt: meta.updatedAt || null,
    source: 'static'
  };
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
