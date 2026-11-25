/* global process */
/**
 * scripts/upsert-domclick-real.js
 *
 * Загружает реальные объявления DomClick по Кирову в таблицу analog_listings (Neon).
 * Деактивирует старые seed-записи, upsert-ит свежие по source_id.
 *
 * Запуск: node scripts/upsert-domclick-real.js
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('NEON_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(dbUrl);

/**
 * Извлекает source_id из URL карточки DomClick.
 * https://kirov.domclick.ru/card/sale__flat__2081156933 -> "2081156933"
 * https://kirov.domclick.ru/card/sale__new_flat__2082008445 -> "2082008445"
 */
function extractSourceId(url) {
  const m = url.match(/(\d{5,})(?:\?|$)/);
  return m ? m[1] : url;
}

/**
 * Извлекает район из адреса (если есть "м-н" в поле district или address).
 */
function normalizeDistrict(district, address) {
  if (district) return district.replace(/\s*м-н$/, '');
  if (!address) return null;
  const m = address.match(/,\s*([^,]+?)\s*м-н/);
  return m ? m[1].trim() : null;
}

// 60 реальных объявлений, собранных browser-агентом 2026-11-25
const REAL_LISTINGS = [
  {"title":"2-комн. квартира, 45,2 м²","price":10576800,"address":"Россия, Киров, Чистые пруды м-н, Чистопрудненская улица, 13а","rooms":2,"total_area":45.2,"floor":17,"total_floors":18,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2082008445","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/ef/24/ef24741e31cba08cfee1949fbe0151d44e11dff0.webp"},
  {"title":"Студия, 33,9 м²","price":8900000,"address":"Киров, Октябрьский проспект, 117","rooms":0,"total_area":33.9,"floor":8,"total_floors":23,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2081156933","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/0c/88/0c88017a66c9a672beef9211b3ac95c383a47637.webp"},
  {"title":"3-комн. квартира, 59,9 м²","price":7487500,"address":"Россия, Киров, Домостроитель м-н, Прибрежный бульвар, 6","rooms":3,"total_area":59.9,"floor":13,"total_floors":17,"district":"Домостроитель м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079077955","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/d6/41/d6411aa34339831fcbb7f59220ff86e04ea45254.webp"},
  {"title":"2-комн. квартира, 82,9 м²","price":13900000,"address":"Киров, Исторический центр м-н, Казанская улица, 90","rooms":2,"total_area":82.9,"floor":2,"total_floors":5,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2080409479","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/68/95/6895d2d0230765bd2b21f6739c434ba8bcd7153b.webp"},
  {"title":"3-комн. квартира, 67,1 м²","price":9662400,"address":"Россия, Киров, Урванцево м-н, улица Капитана Дорофеева, 20","rooms":3,"total_area":67.1,"floor":1,"total_floors":13,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078687480?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/77/77/77778cd7667673df3ed2ccdc265e333811d6628d.webp"},
  {"title":"2-комн. квартира, 59,6 м²","price":13800000,"address":"Киров, Исторический центр м-н, Профсоюзная улица, 50","rooms":2,"total_area":59.6,"floor":1,"total_floors":9,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2080714251","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/fa/c1/fac1438dba1f4c6b99e35b6367a7b6ec.webp"},
  {"title":"2-комн. квартира, 72 м²","price":11240614,"address":"Россия, Киров, Новый м-н, улица 4 Пятилетки, 107а","rooms":2,"total_area":72,"floor":5,"total_floors":9,"district":"Новый м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2081975986","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/93/87/9387e4439c3644bde417494938c759b63aa8ae87.webp"},
  {"title":"2-комн. квартира, 57 м²","price":11490000,"address":"Киров, Исторический центр м-н, Успенская улица, 47","rooms":2,"total_area":57,"floor":3,"total_floors":9,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081072912","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/b0/86/b0869e48494742734e7cc9a4d14ec08fdf27bd02.webp"},
  {"title":"3-комн. квартира, 60,3 м²","price":11215800,"address":"Россия, Киров, Мелькомбинатовский проезд, 3","rooms":3,"total_area":60.3,"floor":2,"total_floors":18,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2069944428","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/fd/d2/fdd26861e324fcc3d6ce324bfea4ee65331389a4.webp"},
  {"title":"2-комн. квартира, 40,9 м²","price":5950000,"address":"Киров, Севастопольская улица, 12","rooms":2,"total_area":40.9,"floor":3,"total_floors":3,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2080199828","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/11/e3/11e38ace4688902c342f51fc7230e4c0f182c6fb.webp"},
  {"title":"2-комн. квартира, 62 м²","price":10697736,"address":"Россия, Киров, Пост охраны","rooms":2,"total_area":62,"floor":8,"total_floors":10,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079510794","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/79/6b/796bc0dc4015f3de90a3773b69e92540430256c9.webp"},
  {"title":"2-комн. квартира, 51,5 м²","price":8390000,"address":"Киров, Чистые пруды м-н, Мостовицкая улица, 12","rooms":2,"total_area":51.5,"floor":9,"total_floors":17,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2079913530","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/b5/5c/b55c29ee0771ec387de60f779bdf15f1c6b14794.webp"},
  {"title":"2-комн. квартира, 80 м²","price":19040330,"address":"Россия, Киров, Исторический центр м-н, улица Свободы, 28","rooms":2,"total_area":80,"floor":9,"total_floors":20,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078714838","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/70/e5/70e55857d1ceaf0e5dfe4eae150f956788935998.webp"},
  {"title":"2-комн. квартира, 44,3 м²","price":6235000,"address":"Киров, Исторический центр м-н, улица Свободы, 15","rooms":2,"total_area":44.3,"floor":5,"total_floors":9,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2080874594","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/30/43/3043f67d52ef4485bf7d5ea0a6acdee6.webp"},
  {"title":"1-комн. квартира, 35 м²","price":6654947,"address":"Россия, Киров, улица Дмитрия Козулева, 11 к2","rooms":1,"total_area":35,"floor":6,"total_floors":9,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079501994","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/da/2f/da2f62e775e77fce667ee0e85dd5ec476bf8eefc.webp"},
  {"title":"3-комн. квартира, 64 м²","price":9990000,"address":"Киров, улица Дмитрия Козулева, 9 к2","rooms":3,"total_area":64,"floor":4,"total_floors":8,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2081923258","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/7c/32/7c325f63eb977ed7abf2b67925bcfb3e6ee6aae8.webp"},
  {"title":"2-комн. квартира, 62,4 м²","price":9048000,"address":"Россия, Киров, Чистые пруды м-н, Чистопрудненская улица, 13","rooms":2,"total_area":62.4,"floor":1,"total_floors":17,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2081518389","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/82/7c/827cfefbba245aa1c36910f3f8b46b7cde136d52.webp"},
  {"title":"4-комн. квартира, 102 м²","price":16000000,"address":"Киров, Новый м-н, улица 4 Пятилетки, 84","rooms":4,"total_area":102,"floor":1,"total_floors":4,"district":"Новый м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082061704","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/8c/85/8c85f5b74376d3e0f447f4d281e843174e146da5.webp"},
  {"title":"1-комн. квартира, 33 м²","price":4785000,"address":"Россия, Киров, Домостроитель м-н, Прибрежный бульвар, 6","rooms":1,"total_area":33,"floor":16,"total_floors":17,"district":"Домостроитель м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078792708","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/8d/35/8d35ff0a7b4da62e063fd41ad51de6033fcfbd13.webp"},
  {"title":"2-комн. квартира, 57,7 м²","price":7100000,"address":"Киров, улица Пушкина, 25 к1","rooms":2,"total_area":57.7,"floor":12,"total_floors":17,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2079108178","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/90/cc/90ccac1b161419aaab6a4e0c7bc79fbd31a36d9c.webp"},
  {"title":"2-комн. квартира, 36 м²","price":6850800,"address":"Россия, Киров, Урванцево м-н, улица Капитана Дорофеева, 20","rooms":2,"total_area":36,"floor":9,"total_floors":13,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078687476","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/c5/01/c501ee524572c3fb984a3877e60f97f96fabd5ec.webp"},
  {"title":"3-комн. квартира, 108,6 м²","price":10400000,"address":"Киров, Озерки м-н, улица Павла Корчагина, 240 к2","rooms":3,"total_area":108.6,"floor":14,"total_floors":14,"district":"Озерки м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2074381338","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/d7/16/d7165893a5374ec09a0f75eed5e5969e.webp"},
  {"title":"3-комн. квартира, 86 м²","price":14587776,"address":"Россия, Киров, Новый м-н, улица 4 Пятилетки, 107","rooms":3,"total_area":86,"floor":2,"total_floors":9,"district":"Новый м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2077432729","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/2b/15/2b15890e3e5eafea1cacf2dcae53e5b2b4f52868.webp"},
  {"title":"2-комн. квартира, 40 м²","price":6999999,"address":"Киров, Урванцево м-н, улица Архитектора Валерия Зянкина, 11 к1","rooms":2,"total_area":40,"floor":11,"total_floors":19,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082094562","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/49/44/4944716f5c2d043f3048a71e64c05fcdf4022610.webp"},
  {"title":"3-комн. квартира, 73,4 м²","price":12111000,"address":"Россия, Киров, Мелькомбинатовский проезд, 3","rooms":3,"total_area":73.4,"floor":3,"total_floors":18,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2070309059?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/6c/c8/6cc8f93a9ae4ed4bb4197f5c985208ae7a785388.webp"},
  {"title":"3-комн. квартира, 63,9 м²","price":10450000,"address":"Киров, Чистые пруды м-н, Мостовицкая улица, 10","rooms":3,"total_area":63.9,"floor":7,"total_floors":9,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081584140","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/6d/9e/6d9eb4441b5951d3c0539ba434a3dc858483db05.webp"},
  {"title":"1-комн. квартира, 40 м²","price":7205969,"address":"Россия, Киров, Пост охраны","rooms":1,"total_area":40,"floor":7,"total_floors":10,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078846201","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/a0/39/a0390582b9d2bc6013786f6e7c0d921c1d75f48e.webp"},
  {"title":"1-комн. квартира, 35,5 м²","price":5990000,"address":"Киров, ОЦМ м-н, улица Чернышевского, 18","rooms":1,"total_area":35.5,"floor":5,"total_floors":10,"district":"ОЦМ м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2079785901","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/2a/b5/2ab58cd36cdfa6163655cfdfee7fcfdfa129bcd9.webp"},
  {"title":"2-комн. квартира, 66 м²","price":16190080,"address":"Россия, Киров, Исторический центр м-н, улица Свободы, 28","rooms":2,"total_area":66,"floor":1,"total_floors":20,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2081053056","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/4c/91/4c914c517534b16f0e4992be654ce2df87a10349.webp"},
  {"title":"3-комн. квартира, 52,6 м²","price":7790000,"address":"Киров, Филейка м-н, улица Василия Жуковского, 9","rooms":3,"total_area":52.6,"floor":1,"total_floors":10,"district":"Филейка м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082342560","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/d3/6b/d36b650155274befac8fa286d101198f.webp"},
  {"title":"2-комн. квартира, 68 м²","price":11043979,"address":"Россия, Киров, улица Дмитрия Козулева, 11","rooms":2,"total_area":68,"floor":4,"total_floors":9,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2076018950?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/7d/df/7ddfe6a1bb80e43be568ac377360b022cfb0b736.webp"},
  {"title":"2-комн. квартира, 47 м²","price":8200000,"address":"Киров, Мининский м-н, улица Тургенева, 12","rooms":2,"total_area":47,"floor":8,"total_floors":19,"district":"Мининский м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081390851","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/8b/c3/8bc3ffddcecb031ef7ade5f063c2348f7b85e6c9.webp"},
  {"title":"2-комн. квартира, 65,6 м²","price":9512000,"address":"Россия, Киров, Чистые пруды м-н, Чистопрудненская улица, 13","rooms":2,"total_area":65.6,"floor":1,"total_floors":17,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2081518399","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/86/f7/86f70c416acf098df14894e8d6964c4706f9d9fd.webp"},
  {"title":"3-комн. квартира, 61,2 м²","price":8499000,"address":"Киров, Урванцево м-н, улица Архитектора Валерия Зянкина, 10 к2","rooms":3,"total_area":61.2,"floor":3,"total_floors":6,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081510204","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/1f/7b/1f7bd22042304b8f89b049932786bfa2.webp"},
  {"title":"3-комн. квартира, 58,7 м²","price":7719050,"address":"Россия, Киров, Домостроитель м-н, Прибрежный бульвар, 6","rooms":3,"total_area":58.7,"floor":16,"total_floors":17,"district":"Домостроитель м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079077961","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/10/a8/10a8d7bdcf5e0c524591f7fd236e569d209ab5ac.webp"},
  {"title":"1-комн. квартира, 38,8 м²","price":6600000,"address":"Киров, Дружба м-н, улица Калинина, 40","rooms":1,"total_area":38.8,"floor":5,"total_floors":9,"district":"Дружба м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081788362","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/27/73/277373def4d2f906444723cd5f50dfb1d9faf9b1.webp"},
  {"title":"1-комн. квартира, 40,4 м²","price":6625600,"address":"Россия, Киров, Урванцево м-н, улица Капитана Дорофеева, 20","rooms":1,"total_area":40.4,"floor":6,"total_floors":13,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079184108?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/22/b4/22b4b185998f435db25b1fb277e6356e42bc2332.webp"},
  {"title":"1-комн. квартира, 32 м²","price":5980000,"address":"Киров, Урванцево м-н, улица Капитана Дорофеева, 24","rooms":1,"total_area":32,"floor":2,"total_floors":9,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082244227","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/39/48/394869bf827be786f6fc0a6aea966be4b031e3d3.webp"},
  {"title":"2-комн. квартира, 72 м²","price":10677777,"address":"Россия, Киров, Новый м-н, улица 4 Пятилетки, 107","rooms":2,"total_area":72,"floor":3,"total_floors":9,"district":"Новый м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078425576?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/87/06/87061a994de4ebbdf5b85f773ccd17ed9e35f29d.webp"},
  {"title":"2-комн. квартира, 65,5 м²","price":15700000,"address":"Киров, Октябрьский проспект, 106","rooms":2,"total_area":65.5,"floor":13,"total_floors":17,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2080870095","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/d6/51/d6512c3475480b96978f1f6228e680124f5e8db4.webp"},
  {"title":"3-комн. квартира, 73,7 м²","price":12160500,"address":"Россия, Киров, Мелькомбинатовский проезд, 3","rooms":3,"total_area":73.7,"floor":2,"total_floors":18,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2069944427","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/10/05/10056799a8496cf3dfac8fe2159695f665b6ab57.webp"},
  {"title":"1-комн. квартира, 42,9 м²","price":7310000,"address":"Киров, Зональный м-н, улица Ленина, 191","rooms":1,"total_area":42.9,"floor":2,"total_floors":17,"district":"Зональный м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081200931","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/60/3d/603d337e480add2ce1269f40c201f27c2e4eeb00.webp"},
  {"title":"1-комн. квартира, 44 м²","price":9062550,"address":"Россия, Киров, Песочная улица, 47","rooms":1,"total_area":44,"floor":8,"total_floors":10,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2082269790","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/38/5c/385c15cea3786964d0a8e3fb97c6e0849a3d4cba.webp"},
  {"title":"1-комн. квартира, 37,6 м²","price":7999999,"address":"Киров, улица Маклина, 60а","rooms":1,"total_area":37.6,"floor":3,"total_floors":16,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2082149202","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/92/ee/92ee9523dcbf4243a0c21b63211e4b04.webp"},
  {"title":"5-комн. квартира, 344,8 м²","price":106888000,"address":"Россия, Киров, Исторический центр м-н, улица Свободы, 28","rooms":5,"total_area":344.8,"floor":17,"total_floors":20,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2075843999","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/22/96/22968dde586a61331d3cb1214fd793478c034ec8.webp"},
  {"title":"1-комн. квартира, 32,6 м²","price":5990000,"address":"Киров, Солнечный берег м-н, улица Героя Костина, 3","rooms":1,"total_area":32.6,"floor":8,"total_floors":10,"district":"Солнечный берег м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082370247","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/5d/54/5d548355dfcd4dcab2cb55f821ade6fa.webp"},
  {"title":"2-комн. квартира, 62 м²","price":12038048,"address":"Россия, Киров, улица Дмитрия Козулева, 11 к2","rooms":2,"total_area":62,"floor":1,"total_floors":9,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079380098?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/04/98/0498e527a80b40ded1b5d6f16ade6770cb20b67e.webp"},
  {"title":"3-комн. квартира, 87 м²","price":19300000,"address":"Киров, Исторический центр м-н, улица Альберта Лиханова, 10а","rooms":3,"total_area":87,"floor":3,"total_floors":4,"district":"Исторический центр м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081316112","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/68/f3/68f39a6449a4f440495116df5e8fb1b7418129f0.webp"},
  {"title":"3-комн. квартира, 75,4 м²","price":12893400,"address":"Россия, Киров, Чистые пруды м-н, Чистопрудненская улица, 13","rooms":3,"total_area":75.4,"floor":13,"total_floors":17,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2081518386","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/d7/ca/d7ca1e0782380b549dc2ada5d1f0a9df1b5bb6a9.webp"},
  {"title":"2-комн. квартира, 44,6 м²","price":8250000,"address":"Киров, улица Горького, 25 к1","rooms":2,"total_area":44.6,"floor":5,"total_floors":9,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2081447722","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/ab/b1/abb1cd6c0311b0e7626e5d443b62f054da1d4a95.webp"},
  {"title":"3-комн. квартира, 83,5 м²","price":8859350,"address":"Россия, Киров, Домостроитель м-н, Прибрежный бульвар, 6","rooms":3,"total_area":83.5,"floor":16,"total_floors":16,"district":"Домостроитель м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078688089","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/ae/c0/aec0a0b7c0926fa67b32d770fa86f93050c820d5.webp"},
  {"title":"3-комн. квартира, 78,4 м²","price":11650000,"address":"Киров, Зональный м-н, улица Ленина, 184 к2","rooms":3,"total_area":78.4,"floor":3,"total_floors":9,"district":"Зональный м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2082412555","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/6e/19/6e197c6b336d4a4b98ec88523b1a73f9.webp"},
  {"title":"3-комн. квартира, 75,3 м²","price":10240800,"address":"Россия, Киров, Урванцево м-н, улица Капитана Дорофеева, 20","rooms":3,"total_area":75.3,"floor":2,"total_floors":13,"district":"Урванцево м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2079184110","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/5d/a1/5da1bb2d79b19d718c87785a89b1b9891c717175.webp"},
  {"title":"2-комн. квартира, 84 м²","price":10890000,"address":"Киров, улица Дмитрия Козулева, 1","rooms":2,"total_area":84,"floor":2,"total_floors":8,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2077991129","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/f2/07/f2075642bbad9276b7a6891dc6525723fcde2248.webp"},
  {"title":"2-комн. квартира, 74 м²","price":11014209,"address":"Россия, Киров, Новый м-н, улица 4 Пятилетки, 107","rooms":2,"total_area":74,"floor":4,"total_floors":9,"district":"Новый м-н","source_url":"https://kirov.domclick.ru/card/sale__new_flat__2078425578?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/e9/77/e977e1ee148493548218e9ecb0e24f6d5f2d6298.webp"},
  {"title":"2-комн. квартира, 49,5 м²","price":7450000,"address":"Киров, Чистые пруды м-н, Чистопрудненская улица, 13","rooms":2,"total_area":49.5,"floor":15,"total_floors":16,"district":"Чистые пруды м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2081624567","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/7a/61/7a61413068dd4284188e1d1bc3e8b4c07d74effc.webp"},
  {"title":"3-комн. квартира, 66,4 м²","price":10889600,"address":"Россия, Киров, Мелькомбинатовский проезд, 3","rooms":3,"total_area":66.4,"floor":2,"total_floors":18,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2069061951","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/18/8b/188bcbcc75881b29a46271a97e4c1b31a7d95f95.webp"},
  {"title":"2-комн. квартира, 53,2 м²","price":8100000,"address":"Киров, Солнечный берег м-н, улица Героя Костина, 3","rooms":2,"total_area":53.2,"floor":5,"total_floors":10,"district":"Солнечный берег м-н","source_url":"https://kirov.domclick.ru/card/sale__flat__2080458433","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/owner/70/ad/70ad235b91fd4e55a71a95f22214202b.webp"},
  {"title":"2-комн. квартира, 65 м²","price":10450510,"address":"Россия, Киров, Песочная улица, 47","rooms":2,"total_area":65,"floor":2,"total_floors":13,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__new_flat__2072291244?to_flats=true","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/76/82/7682249bf98c7cf1b6e017657c5cb2e570683593.webp"},
  {"title":"2-комн. квартира, 62,4 м²","price":12200000,"address":"Киров, Октябрьский проспект, 117","rooms":2,"total_area":62.4,"floor":14,"total_floors":27,"district":null,"source_url":"https://kirov.domclick.ru/card/sale__flat__2082174853","image_url":"https://img.dmclk.ru/c960x640q80/vitrina/3c/b4/3cb4fd5a88d056673673a64aacf66f997091961f.webp"},
];

async function main() {
  console.log(`=== DomClick Real Listings Upsert (${REAL_LISTINGS.length} items) ===\n`);

  // 1. Деактивировать старые seed-записи DomClick (dc-101..dc-510, dc-*k-*)
  const deactivated = await sql`
    UPDATE analog_listings
    SET is_active = false
    WHERE source = 'DOMCLICK'
      AND (source_id LIKE 'dc-%' OR source_id LIKE 'dc_%')
  `;
  console.log('Деактивировано старых seed-записей:', deactivated.count ?? 0);

  // 2. Upsert каждое реальное объявление
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const item of REAL_LISTINGS) {
    const sourceId = extractSourceId(item.source_url);
    const district = normalizeDistrict(item.district, item.address);
    const rawData = JSON.stringify({
      source: 'domclick',
      image_url: item.image_url || null,
      mortgage_discount: 0.3,
      scraped_at: new Date().toISOString(),
    });

    try {
      // Проверяем существование
      const existing = await sql`
        SELECT id FROM analog_listings
        WHERE source = 'DOMCLICK' AND source_id = ${sourceId}
      `;

      if (existing.length > 0) {
        // Update
        await sql`
          UPDATE analog_listings
          SET price = ${item.price},
              title = ${item.title},
              address = ${item.address},
              district = ${district},
              rooms = ${item.rooms},
              total_area = ${item.total_area},
              floor = ${item.floor},
              total_floors = ${item.total_floors},
              raw_data = ${rawData}::jsonb,
              is_active = true,
              last_seen_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        updated++;
      } else {
        // Insert
        await sql`
          INSERT INTO analog_listings (
            id, source, source_id, source_url, title, price, city, district,
            address, rooms, total_area, floor, total_floors, building_type,
            deal_type, is_active, raw_data, last_seen_at
          ) VALUES (
            ${randomUUID()}, 'DOMCLICK', ${sourceId}, ${item.source_url},
            ${item.title}, ${item.price}, 'Киров', ${district},
            ${item.address}, ${item.rooms}, ${item.total_area},
            ${item.floor}, ${item.total_floors}, NULL,
            'SALE', true, ${rawData}::jsonb, NOW()
          )
        `;
        inserted++;
      }
    } catch (err) {
      errors++;
      console.error(`  Ошибка [${sourceId}]:`, err.message);
    }
  }

  console.log(`\nВставлено: ${inserted}, Обновлено: ${updated}, Ошибок: ${errors}`);

  // 3. Финальная статистика
  const stats = await sql`
    SELECT source,
           count(id) as total,
           count(CASE WHEN is_active THEN 1 END) as active,
           count(CASE WHEN raw_data->>'image_url' IS NOT NULL
                       AND raw_data->>'image_url' != '' THEN 1 END) as with_photo,
           min(price) as min_price,
           max(price) as max_price
    FROM analog_listings
    WHERE source = 'DOMCLICK'
    GROUP BY source
  `;
  console.log('\nСтатистика DOMCLICK:', JSON.stringify(stats, null, 2));

  // Общая статистика по всем источникам
  const allStats = await sql`
    SELECT source,
           count(id) as total,
           count(CASE WHEN is_active THEN 1 END) as active
    FROM analog_listings
    GROUP BY source
    ORDER BY source
  `;
  console.log('\nВсе источники:', JSON.stringify(allStats, null, 2));
}

main().catch(console.error);
