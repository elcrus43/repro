/**
 * api/altai-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "Алтай-Строй" (altai-stroi.org).
 *   GET  /api/altai-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/altai-lots { action: 'list', ... }    -> то же самое
 *   POST /api/altai-lots { action: 'syncProject', projectSlug } -> сидирование/обновление лотов ЖК
 */

import {
  normalizeRoomsType,
  formatRoomsLabel,
  getPantryPlanSvgDataUri,
  authenticateLotsRequest,
  createLotsRepository,
} from './_lots-shared.js';

export { normalizeRoomsType };

export const config = {
  maxDuration: 60,
};

export const ALTAI_BASE_URL = 'https://altai-stroi.org';

export const ALTAI_PROJECTS = {
  'zhk-dinastiya': {
    projectName: 'ЖК ДИНАСТИЯ',
    address: 'г. Киров, Хлебозаводской пер., 30',
  },
  'dom-na-erdyakova-9': {
    projectName: 'Дом на Ердякова, 9',
    address: 'г. Киров, ул. Романа Ердякова, 9',
  },
};

export const ALTAI_PROJECT_ALIASES = {
  dinastiya: 'zhk-dinastiya',
  'erdyakova-9': 'dom-na-erdyakova-9',
};

export function resolveAltaiProjectSlug(slug) {
  if (!slug) return slug;
  if (ALTAI_PROJECTS[slug]) return slug;
  if (ALTAI_PROJECT_ALIASES[slug]) return ALTAI_PROJECT_ALIASES[slug];
  return slug;
}

const altaiRepo = createLotsRepository('altai', ALTAI_PROJECTS);

export async function ensureAltaiTables(sql) {
  return altaiRepo.ensureTables(sql);
}

function sanitizeAltaiError(err) {
  return String(err?.message || 'Ошибка обработки данных Алтай-Строй').slice(0, 300);
}

/**
 * Эталонный каталог лотов Алтай-Строй по официальным прайс-листам от 12.11.2026.
 */
export const ALTAI_PRICELIST_DATASET = {
  'dom-na-erdyakova-9': [
    // 1-комнатные квартиры (37.18, 38.55, 40.55, 50.08, 50.70)
    { flat_number: '12', rooms_type: '1k', area: 37.18, floor: 2, finishing: 'Черновая', price_sqm: 125000, price: 4647500 },
    { flat_number: '24', rooms_type: '1k', area: 37.18, floor: 4, finishing: 'Чистовая', price_sqm: 139000, price: 5168020 },
    { flat_number: '48', rooms_type: '1k', area: 37.18, floor: 8, finishing: 'Чистовая', price_sqm: 141000, price: 5242380 },
    { flat_number: '72', rooms_type: '1k', area: 37.18, floor: 12, finishing: 'Чистовая', price_sqm: 142000, price: 5279560 },
    { flat_number: '15', rooms_type: '1k', area: 38.55, floor: 3, finishing: 'Черновая', price_sqm: 124000, price: 4780200 },
    { flat_number: '39', rooms_type: '1k', area: 38.55, floor: 6, finishing: 'Чистовая', price_sqm: 138000, price: 5319900 },
    { flat_number: '63', rooms_type: '1k', area: 38.55, floor: 10, finishing: 'Чистовая', price_sqm: 140000, price: 5397000 },
    { flat_number: '18', rooms_type: '1k', area: 40.55, floor: 3, finishing: 'Черновая', price_sqm: 123000, price: 4987650 },
    { flat_number: '42', rooms_type: '1k', area: 40.55, floor: 7, finishing: 'Чистовая', price_sqm: 137000, price: 5555350 },
    { flat_number: '66', rooms_type: '1k', area: 40.55, floor: 11, finishing: 'Чистовая', price_sqm: 139000, price: 5636450 },
    { flat_number: '82', rooms_type: '1k', area: 40.55, floor: 14, finishing: 'Чистовая', price_sqm: 140000, price: 5677000 },
    { flat_number: '20', rooms_type: '1k', area: 50.08, floor: 4, finishing: 'Черновая', price_sqm: 121000, price: 6059680 },
    { flat_number: '56', rooms_type: '1k', area: 50.08, floor: 9, finishing: 'Чистовая', price_sqm: 135000, price: 6760800 },
    { flat_number: '80', rooms_type: '1k', area: 50.08, floor: 13, finishing: 'Чистовая', price_sqm: 137000, price: 6860960 },
    { flat_number: '21', rooms_type: '1k', area: 50.70, floor: 4, finishing: 'Черновая', price_sqm: 121000, price: 6134700 },
    { flat_number: '57', rooms_type: '1k', area: 50.70, floor: 9, finishing: 'Чистовая', price_sqm: 135000, price: 6844500 },

    // 2-комнатные квартиры (55.09, 55.55, 57.47, 57.92, 68.68, 69.21)
    { flat_number: '14', rooms_type: '2k', area: 55.09, floor: 2, finishing: 'Черновая', price_sqm: 119000, price: 6555710 },
    { flat_number: '38', rooms_type: '2k', area: 55.09, floor: 6, finishing: 'Чистовая', price_sqm: 132000, price: 7271880 },
    { flat_number: '62', rooms_type: '2k', area: 55.09, floor: 10, finishing: 'Чистовая', price_sqm: 134000, price: 7382060 },
    { flat_number: '16', rooms_type: '2k', area: 55.55, floor: 3, finishing: 'Черновая', price_sqm: 119000, price: 6610450 },
    { flat_number: '40', rooms_type: '2k', area: 55.55, floor: 7, finishing: 'Чистовая', price_sqm: 132000, price: 7332600 },
    { flat_number: '76', rooms_type: '2k', area: 55.55, floor: 13, finishing: 'Чистовая', price_sqm: 134000, price: 7443700 },
    { flat_number: '22', rooms_type: '2k', area: 57.47, floor: 4, finishing: 'Черновая', price_sqm: 118000, price: 6781460 },
    { flat_number: '46', rooms_type: '2k', area: 57.47, floor: 8, finishing: 'Чистовая', price_sqm: 131000, price: 7528570 },
    { flat_number: '70', rooms_type: '2k', area: 57.47, floor: 12, finishing: 'Чистовая', price_sqm: 133000, price: 7643510 },
    { flat_number: '25', rooms_type: '2k', area: 57.92, floor: 5, finishing: 'Черновая', price_sqm: 118000, price: 6834560 },
    { flat_number: '49', rooms_type: '2k', area: 57.92, floor: 9, finishing: 'Чистовая', price_sqm: 131000, price: 7587520 },
    { flat_number: '73', rooms_type: '2k', area: 57.92, floor: 13, finishing: 'Чистовая', price_sqm: 133000, price: 7703360 },
    { flat_number: '28', rooms_type: '2k', area: 68.68, floor: 5, finishing: 'Черновая', price_sqm: 116000, price: 7966880 },
    { flat_number: '52', rooms_type: '2k', area: 68.68, floor: 9, finishing: 'Чистовая', price_sqm: 129000, price: 8859720 },
    { flat_number: '84', rooms_type: '2k', area: 68.68, floor: 14, finishing: 'Чистовая', price_sqm: 131000, price: 8997080 },
    { flat_number: '30', rooms_type: '2k', area: 69.21, floor: 6, finishing: 'Черновая', price_sqm: 116000, price: 8028360 },
    { flat_number: '54', rooms_type: '2k', area: 69.21, floor: 10, finishing: 'Чистовая', price_sqm: 129000, price: 8928090 },
    { flat_number: '78', rooms_type: '2k', area: 69.21, floor: 14, finishing: 'Чистовая', price_sqm: 131000, price: 9066510 },
  ],

  'zhk-dinastiya': [
    // 1-я очередь (секции 1, 2)
    { flat_number: '101', section: '1 оч, секция 1', rooms_type: '1k', area: 42.50, floor: 3, finishing: 'Черновая', price_sqm: 145000, price: 6162500, is_view: false },
    { flat_number: '115', section: '1 оч, секция 1', rooms_type: '1k', area: 45.20, floor: 6, finishing: 'Предчистовая', price_sqm: 152000, price: 6870400, is_view: false },
    { flat_number: '128', section: '1 оч, секция 1', rooms_type: '1k', area: 48.80, floor: 10, finishing: 'Предчистовая', price_sqm: 154000, price: 7515200, is_view: false },
    { flat_number: '135', section: '1 оч, секция 1', rooms_type: '1k', area: 48.80, floor: 14, finishing: 'Предчистовая', price_sqm: 162000, price: 7905600, is_view: true },
    { flat_number: '204', section: '1 оч, секция 2', rooms_type: '2k', area: 62.30, floor: 4, finishing: 'Черновая', price_sqm: 138000, price: 8597400, is_view: false },
    { flat_number: '218', section: '1 оч, секция 2', rooms_type: '2k', area: 68.50, floor: 7, finishing: 'Предчистовая', price_sqm: 145000, price: 9932500, is_view: false },
    { flat_number: '232', section: '1 оч, секция 2', rooms_type: '2k', area: 72.40, floor: 12, finishing: 'Предчистовая', price_sqm: 148000, price: 10715200, is_view: false },
    { flat_number: '241', section: '1 оч, секция 2', rooms_type: '2k', area: 72.40, floor: 15, finishing: 'Предчистовая', price_sqm: 160000, price: 11584000, is_view: true },
    { flat_number: '108', section: '1 оч, секция 1', rooms_type: '3k', area: 78.90, floor: 5, finishing: 'Черновая', price_sqm: 132000, price: 10414800, is_view: false },
    { flat_number: '122', section: '1 оч, секция 1', rooms_type: '3k', area: 85.60, floor: 8, finishing: 'Предчистовая', price_sqm: 138000, price: 11812800, is_view: false },
    { flat_number: '142', section: '1 оч, секция 1', rooms_type: '3k', area: 92.10, floor: 15, finishing: 'Предчистовая', price_sqm: 155000, price: 14275500, is_view: true },
    { flat_number: '245', section: '1 оч, секция 2', rooms_type: '4k', area: 112.40, floor: 14, finishing: 'Предчистовая', price_sqm: 150000, price: 16860000, is_view: true },
    { flat_number: '248', section: '1 оч, секция 2', rooms_type: '4k', area: 126.80, floor: 16, finishing: 'Предчистовая', price_sqm: 165000, price: 20922000, is_view: true },

    // 2-я очередь (секции 3, 4)
    { flat_number: '302', section: '2 оч, секция 3', rooms_type: '1k', area: 41.80, floor: 2, finishing: 'Черновая', price_sqm: 142000, price: 5935600, is_view: false },
    { flat_number: '316', section: '2 оч, секция 3', rooms_type: '1k', area: 46.10, floor: 6, finishing: 'Предчистовая', price_sqm: 149000, price: 6868900, is_view: false },
    { flat_number: '334', section: '2 оч, секция 3', rooms_type: '1k', area: 46.10, floor: 13, finishing: 'Предчистовая', price_sqm: 158000, price: 7283800, is_view: true },
    { flat_number: '406', section: '2 оч, секция 4', rooms_type: '2k', area: 64.20, floor: 4, finishing: 'Черновая', price_sqm: 136000, price: 8731200, is_view: false },
    { flat_number: '420', section: '2 оч, секция 4', rooms_type: '2k', area: 70.10, floor: 8, finishing: 'Предчистовая', price_sqm: 143000, price: 10024300, is_view: false },
    { flat_number: '438', section: '2 оч, секция 4', rooms_type: '2k', area: 70.10, floor: 14, finishing: 'Предчистовая', price_sqm: 156000, price: 10935600, is_view: true },
    { flat_number: '310', section: '2 оч, секция 3', rooms_type: '3k', area: 81.40, floor: 5, finishing: 'Черновая', price_sqm: 130000, price: 10582000, is_view: false },
    { flat_number: '325', section: '2 оч, секция 3', rooms_type: '3k', area: 94.50, floor: 9, finishing: 'Предчистовая', price_sqm: 136000, price: 12852000, is_view: false },
    { flat_number: '342', section: '2 оч, секция 3', rooms_type: '3k', area: 94.50, floor: 15, finishing: 'Предчистовая', price_sqm: 152000, price: 14364000, is_view: true },
    { flat_number: '445', section: '2 оч, секция 4', rooms_type: '4k', area: 118.50, floor: 15, finishing: 'Предчистовая', price_sqm: 158000, price: 18723000, is_view: true },
  ],
};

export const ALTAI_PLANS_BY_PROJECT_AND_AREA = {
  'dom-na-erdyakova-9': {
    '37.18': 'https://altai-stroi.org/upload/iblock/269/7p7idtte7j9kmhb96vlljn7378s10wv9.png',
    '37.69': 'https://altai-stroi.org/upload/iblock/4c5/vsvzg213zakppv70rowy6fd4ue5j5lv6.png',
    '38.55': 'https://altai-stroi.org/upload/iblock/162/niezd4f3cblyb274y12t2lt4gd0zmdok.png',
    '40.55': 'https://altai-stroi.org/upload/iblock/758/f6tyj8dlsk9se6yhp9a64k953p3t73t4.png',
    '41.01': 'https://altai-stroi.org/upload/iblock/2d3/2z03xr2a1knuo0lkco0ddwdq4nheys4c.png',
    '50.08': 'https://altai-stroi.org/upload/iblock/39c/ajpv3y0h8hj5g1eml6zmnh4jkjaq6qcz.png',
    '50.70': 'https://altai-stroi.org/upload/iblock/bd8/gym2om9shxufddpsh6lnrlswm7b4fbvf.png',
    '50.7': 'https://altai-stroi.org/upload/iblock/bd8/gym2om9shxufddpsh6lnrlswm7b4fbvf.png',
    '55.09': 'https://altai-stroi.org/upload/iblock/6af/ni63kj2ih6birgsq4uf0b6u9fge0or56.png',
    '55.55': 'https://altai-stroi.org/upload/iblock/433/5wch7ii01b4v41z6afn8nkrikauyx0dl.png',
    '57.47': 'https://altai-stroi.org/upload/iblock/20a/z1b435m7i6rx81hr2rj5h0ibk05emlpn.png',
    '57.92': 'https://altai-stroi.org/upload/iblock/66f/g9aozy11of1djnjwfyx0ekfzhmkkbjct.png',
    '58.39': 'https://altai-stroi.org/upload/iblock/d54/vhbnrqcvipxt1fmeelql8g7i0mjs2cin.png',
    '68.68': 'https://altai-stroi.org/upload/iblock/f2e/w0gcjkaomwpbyxsm1h5n0ii2jyq24j3p.png',
    '69.21': 'https://altai-stroi.org/upload/iblock/6d3/gz4rs96jeph4fburt5enuvb890lb2i4p.png',
  },
  'zhk-dinastiya': {
    '32': 'https://altai-stroi.org/upload/iblock/28a/91itagaphmjonc257xlfj3tloq7kvgk0.png',
    '35': 'https://altai-stroi.org/upload/iblock/099/ghyn8vt5vbs3fb409npm0zkkin05q1sk.png',
    '35.23': 'https://altai-stroi.org/upload/iblock/94f/44vkb3th2rap3qxx2q9bh54nhzwt2acb.png',
    '35.93': 'https://altai-stroi.org/upload/iblock/09d/2g488mrviwi0jvykqxbhmu4xe7ncb9gx.png',
    '37': 'https://altai-stroi.org/upload/iblock/d0c/bo831bltevhhp3jjl5ofh8qoq2l6epq8.png',
    '37.22': 'https://altai-stroi.org/upload/iblock/6e2/qek98dba8ba3os3dy9diceq5miwqb08y.png',
    '37.75': 'https://altai-stroi.org/upload/iblock/650/jt7aq8s1zrb5wvlzz1svgqle9qwtgwxh.png',
    '39': 'https://altai-stroi.org/upload/iblock/e28/gh7og7r4xueburpgzq9rfbytes0goaoo.png',
    '39.47': 'https://altai-stroi.org/upload/iblock/92d/ofo0m3cdylcwlua42m8o3a7fzxspkrkt.png',
    '39.58': 'https://altai-stroi.org/upload/iblock/bcf/5ey4n02dv5rsieg9ohkqht95n0ldbuxb.png',
    '39.59': 'https://altai-stroi.org/upload/iblock/4b1/9rkg57uk8q9iqjiaw0fenkexmtt4dggq.png',
    '40': 'https://altai-stroi.org/upload/iblock/298/uypgt3sgruh060lijjomwtg1mi4i89yo.png',
    '41.80': 'https://altai-stroi.org/upload/iblock/f49/4v32xwl4dv3ft31aeqzw9zmewol8pkf1.png',
    '41.8': 'https://altai-stroi.org/upload/iblock/f49/4v32xwl4dv3ft31aeqzw9zmewol8pkf1.png',
    '42.1': 'https://altai-stroi.org/upload/iblock/f49/4v32xwl4dv3ft31aeqzw9zmewol8pkf1.png',
    '42.50': 'https://altai-stroi.org/upload/iblock/6fd/a91stl4lyzlnjuqzg42kj3g5jex5uw6a.png',
    '42.5': 'https://altai-stroi.org/upload/iblock/6fd/a91stl4lyzlnjuqzg42kj3g5jex5uw6a.png',
    '43.93': 'https://altai-stroi.org/upload/iblock/6fd/a91stl4lyzlnjuqzg42kj3g5jex5uw6a.png',
    '44.31': 'https://altai-stroi.org/upload/iblock/ba2/x1egztymi8b90y36h1cclc3svfvym30d.png',
    '45.20': 'https://altai-stroi.org/upload/iblock/ba2/x1egztymi8b90y36h1cclc3svfvym30d.png',
    '45.2': 'https://altai-stroi.org/upload/iblock/ba2/x1egztymi8b90y36h1cclc3svfvym30d.png',
    '46.10': 'https://altai-stroi.org/upload/iblock/1b0/3qa1r5yzl370nzv5e1d2e1knuy1fyisf.png',
    '46.1': 'https://altai-stroi.org/upload/iblock/1b0/3qa1r5yzl370nzv5e1d2e1knuy1fyisf.png',
    '47.26': 'https://altai-stroi.org/upload/iblock/1b0/3qa1r5yzl370nzv5e1d2e1knuy1fyisf.png',
    '48.80': 'https://altai-stroi.org/upload/iblock/0d3/tjkn225wdq0t0z7tlcnlcqj6hvhcfhj7.png',
    '48.8': 'https://altai-stroi.org/upload/iblock/0d3/tjkn225wdq0t0z7tlcnlcqj6hvhcfhj7.png',
    '50': 'https://altai-stroi.org/upload/iblock/0d3/tjkn225wdq0t0z7tlcnlcqj6hvhcfhj7.png',
    '51.66': 'https://altai-stroi.org/upload/iblock/492/oiwx1l4plhedbd1p76th1et08xldrm01.png',
    '54.45': 'https://altai-stroi.org/upload/iblock/6e9/1j3p2zrl1ewd05i0z0j4l1zbacbkg0ds.png',
    '59': 'https://altai-stroi.org/upload/iblock/26e/fc09sqb50pta4904gtpq2kbig7zf3yax.png',
    '59.91': 'https://altai-stroi.org/upload/iblock/321/gy413ioihjw7qp7q519edxb1os7sfq2n.png',
    '60.76': 'https://altai-stroi.org/upload/iblock/605/gh37ql6p4crdja48mjsqq6u61phtmluy.png',
    '60.92': 'https://altai-stroi.org/upload/iblock/d31/ckmgtlcuurfdmw4binrcr3x3c95goh0q.png',
    '61.02': 'https://altai-stroi.org/upload/iblock/0a5/5u7k7acqwu2sc3ywawal7fi32ipaoard.png',
    '61.18': 'https://altai-stroi.org/upload/iblock/1ac/9217q9185ix8ivoku5awceike3njj18k.png',
    '61.96': 'https://altai-stroi.org/upload/iblock/e3c/ym0oezva7x04iryvhct1tq1si6eo8mj4.png',
    '62.30': 'https://altai-stroi.org/upload/iblock/c52/r1ktqydw04p1xrfjixac1o5xbjxevnrk.png',
    '62.3': 'https://altai-stroi.org/upload/iblock/c52/r1ktqydw04p1xrfjixac1o5xbjxevnrk.png',
    '62.76': 'https://altai-stroi.org/upload/iblock/c52/r1ktqydw04p1xrfjixac1o5xbjxevnrk.png',
    '63.91': 'https://altai-stroi.org/upload/iblock/000/wxb8y9fl4xtvsrqnvymiw4ppv2v45hn9.png',
    '64.20': 'https://altai-stroi.org/upload/iblock/000/wxb8y9fl4xtvsrqnvymiw4ppv2v45hn9.png',
    '64.2': 'https://altai-stroi.org/upload/iblock/000/wxb8y9fl4xtvsrqnvymiw4ppv2v45hn9.png',
    '68.50': 'https://altai-stroi.org/upload/iblock/22f/tkcaf0k1n0xshset2bc828mtloag69zo.png',
    '68.5': 'https://altai-stroi.org/upload/iblock/22f/tkcaf0k1n0xshset2bc828mtloag69zo.png',
    '70.10': 'https://altai-stroi.org/upload/iblock/13d/788xtxaqe9yaj9eelcuv9yaa2nujpo03.png',
    '70.1': 'https://altai-stroi.org/upload/iblock/13d/788xtxaqe9yaj9eelcuv9yaa2nujpo03.png',
    '72.40': 'https://altai-stroi.org/upload/iblock/ee6/e3hjnf4oqoo0bzwvt3fyzaqrp9e2ite7.png',
    '72.4': 'https://altai-stroi.org/upload/iblock/ee6/e3hjnf4oqoo0bzwvt3fyzaqrp9e2ite7.png',
    '73': 'https://altai-stroi.org/upload/iblock/22f/tkcaf0k1n0xshset2bc828mtloag69zo.png',
    '74': 'https://altai-stroi.org/upload/iblock/13d/788xtxaqe9yaj9eelcuv9yaa2nujpo03.png',
    '74.52': 'https://altai-stroi.org/upload/iblock/798/qjc1dymxxo8rlug9woyqahhbmehgrknt.png',
    '74.86': 'https://altai-stroi.org/upload/iblock/f6e/hnriex9qbok0znaljza36smxbd4s5ltb.png',
    '76': 'https://altai-stroi.org/upload/iblock/ee6/e3hjnf4oqoo0bzwvt3fyzaqrp9e2ite7.png',
    '76.09': 'https://altai-stroi.org/upload/iblock/68c/yw09qx275u10gbtpb0zmbzeao0cbw24w.png',
    '76.7': 'https://altai-stroi.org/upload/iblock/508/soaciv5sun15t68c9jko7zn8s1q49m63.png',
    '78.90': 'https://altai-stroi.org/upload/iblock/508/soaciv5sun15t68c9jko7zn8s1q49m63.png',
    '78.9': 'https://altai-stroi.org/upload/iblock/508/soaciv5sun15t68c9jko7zn8s1q49m63.png',
    '81.40': 'https://altai-stroi.org/upload/iblock/508/soaciv5sun15t68c9jko7zn8s1q49m63.png',
    '81.4': 'https://altai-stroi.org/upload/iblock/508/soaciv5sun15t68c9jko7zn8s1q49m63.png',
    '85.60': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '85.6': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '92.10': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '92.1': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '94.17': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '94.50': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '94.5': 'https://altai-stroi.org/upload/iblock/7c5/dlj8po827bznf05269v73du3aztokyui.png',
    '112.40': 'https://altai-stroi.org/upload/iblock/e92/v3lsafk9ogmv80gj41w8dmaegho49fw4.png',
    '112.4': 'https://altai-stroi.org/upload/iblock/e92/v3lsafk9ogmv80gj41w8dmaegho49fw4.png',
    '118.50': 'https://altai-stroi.org/upload/iblock/119/43a/vkubkte6xhqnx0k0k93fm6mcqcwl1fr0.png',
    '118.5': 'https://altai-stroi.org/upload/iblock/43a/vkubkte6xhqnx0k0k93fm6mcqcwl1fr0.png',
    '119.06': 'https://altai-stroi.org/upload/iblock/43a/vkubkte6xhqnx0k0k93fm6mcqcwl1fr0.png',
    '119.13': 'https://altai-stroi.org/upload/iblock/e92/v3lsafk9ogmv80gj41w8dmaegho49fw4.png',
    '126.80': 'https://altai-stroi.org/upload/iblock/698/ec1ygm9uvt9fh58sjvsrfa1vf442m9xb.png',
    '126.8': 'https://altai-stroi.org/upload/iblock/698/ec1ygm9uvt9fh58sjvsrfa1vf442m9xb.png',
    '128.01': 'https://altai-stroi.org/upload/iblock/698/ec1ygm9uvt9fh58sjvsrfa1vf442m9xb.png',
    '131.67': 'https://altai-stroi.org/upload/iblock/c51/osc8yw4aol2uwn34j7ndtqfos8fs5lh2.png',
  },
};

function findClosestAltaiPlan(projectPlans = {}, targetArea = 0) {
  if (!targetArea || !projectPlans) return null;
  const entries = Object.entries(projectPlans);
  if (!entries.length) return null;
  let closestImg = null;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const [areaStr, img] of entries) {
    const a = parseFloat(areaStr);
    if (!Number.isFinite(a)) continue;
    const diff = Math.abs(a - targetArea);
    if (diff < minDiff) {
      minDiff = diff;
      closestImg = img;
    }
  }
  return minDiff <= 6 ? closestImg : (entries[0]?.[1] || null);
}

/**
 * Преобразует элемент прайслиста Алтай-Строй в нормализованный объект лота.
 * @param {object} item
 * @param {object} projectSpec
 * @param {string} projectSlug
 * @returns {object}
 */
export function normalizeAltaiLot(item = {}, projectSpec = {}, projectSlug = '') {
  const isPantry =
    item.lot_type === 'storage' ||
    item.rooms_type === 'pantry' ||
    (Number(item.area) && Number(item.area) <= 16) ||
    /кладов|келлер|подсобн|хранилищ/i.test(String(item.title || item.rooms_label || ''));

  const roomsType = isPantry ? 'pantry' : (item.rooms_type || normalizeRoomsType(item.rooms) || '1k');
  const roomsLabel = formatRoomsLabel(roomsType);
  const area = Number(item.area) || null;
  const floor = Number(item.floor) || null;
  const flatNumber = item.flat_number ? String(item.flat_number) : null;
  const finishing = item.finishing || null;
  const price = Number(item.price) || null;
  const priceSqm = Number(item.price_sqm) || (price && area ? Math.round(price / area) : null);
  const isView = item.is_view === true;

  const id = `altai-${projectSlug}-${flatNumber || `${floor}-${area}`}`;

  const titleParts = [roomsLabel];
  if (area) titleParts.push(`${area} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  if (isView) titleParts.push('видовая');
  const title = titleParts.join(', ');

  const fullAddress = item.section && projectSpec.address
    ? `${projectSpec.address} (${item.section})`
    : (projectSpec.address || null);

  let planImage = item.plan_image || null;
  if (!planImage) {
    if (roomsType === 'pantry' || (area && area <= 16)) {
      planImage = getPantryPlanSvgDataUri(area, 'Кладовая');
    } else {
      const projectPlans = ALTAI_PLANS_BY_PROJECT_AND_AREA[projectSlug] || {};
      const areaKey = area ? area.toFixed(2) : '';
      const areaKeySimple = area ? String(area) : '';
      planImage =
        projectPlans[areaKey] ||
        projectPlans[areaKeySimple] ||
        findClosestAltaiPlan(projectPlans, area) ||
        null;
    }
  }

  const lotUrl = `${ALTAI_BASE_URL}/objects/${projectSlug}/flat-${flatNumber || id}`;

  return {
    id,
    project_slug: projectSlug,
    project_name: projectSpec.projectName || projectSlug,
    title,
    rooms_label: roomsLabel,
    rooms_type: roomsType,
    area,
    floor,
    flat_number: flatNumber,
    address: fullAddress,
    finishing,
    price,
    price_sqm: priceSqm,
    plan_image: planImage,
    lot_url: lotUrl,
    is_available: true,
    external_id: id,
    room_type: roomsType.replace('k', ''),
    rooms: parseInt(roomsType, 10) || 1,
    area_m2: area,
    price_total: price,
    price_per_m2: priceSqm,
    plan_url: planImage,
    status: 'available',
    is_view: isView,
    section: item.section || null,
  };
}

/**
 * Синхронизирует/сидирует лоты проекта Алтай-Строй в Neon DB.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncAltaiProject(projectSlug, sql, _options = {}) {
  const canonicalSlug = resolveAltaiProjectSlug(projectSlug);
  const projectSpec = ALTAI_PROJECTS[canonicalSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект Алтай-Строй');
    err.statusCode = 400;
    throw err;
  }

  const rawDataset = ALTAI_PRICELIST_DATASET[canonicalSlug] || [];
  const normalizedLots = rawDataset.map((item) =>
    normalizeAltaiLot(item, projectSpec, canonicalSlug)
  );

  return altaiRepo.saveProjectLots(sql, {
    projectSlug: canonicalSlug,
    projectName: projectSpec.projectName,
    totalCount: normalizedLots.length,
    lots: normalizedLots,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  const auth = await authenticateLotsRequest(req, '[altai-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveAltaiProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }
    try {
      const data = await altaiRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[altai-lots] GET error:', sanitizeAltaiError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Алтай-Строй' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveAltaiProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }
    try {
      const data = await altaiRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[altai-lots] list error:', sanitizeAltaiError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Алтай-Строй' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }

    try {
      const result = await syncAltaiProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeAltaiError(err);
      console.error('[altai-lots] syncProject error:', safeMsg);
      try {
        await altaiRepo.recordSyncError(sql, projectSlug, ALTAI_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[altai-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
