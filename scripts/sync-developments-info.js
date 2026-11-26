/**
 * scripts/sync-developments-info.js
 * Обновляет ТОЛЬКО фото, генпланы и описания проектов КСМ (https://ksm-kirov.ru/)
 * и КССК (https://kvartiry.kssk.ru/) в src/data/developmentsData.js и public/data/developments.json.
 * Планировки и свободные квартиры обновляются отдельно через api/_ksm-lots.js и api/_kssk-lots.js.
 *
 * Запуск: node scripts/sync-developments-info.js
 */

import fs from 'fs';

const KSM_PROJECT_SLUGS = {
  'zhk-chistoprudnenskaya-11a': 'zhr-chistye-prudy',
  'zhk-chistye-prudy': 'zhr-chistye-prudy',
  'zhk-life-ksm': 'life',
  'zhk-city-park': 'siti-park',
  'zhk-vidny': 'vidnyy',
  'zhk-river-park': 'zhk-river-park',
  'zhk-ozerki-ksm': 'mkr-ozerki',
};

const KSSK_OBJECT_PATHS = {
  'zhk-skandinaviya': { path: '/objects/mikheeva-1/', keyword: 'mikheeva_1_skandinaviya' },
  'zhk-metro': { path: '/objects/ul-moskovskaya-d-209a/', keyword: 'moskovskaya_d_209a_metro' },
  'zhk-sloboda': { path: '/objects/ul-potrebkooperatsii-34/', keyword: 'ul_potrebkooperatsii_34_sloboda' },
  'zhk-x2': { path: '/objects/khlebozavodskoy-pr-d-d-2-kh2/', keyword: 'khlebozavodskoy_pr_d_d_2_kh2' },
  'zhk-dom-u-reki': { path: '/objects/ul-zavodskaya-14-k2/', keyword: 'ul_zavodskaya_14_k2' },
  'zhk-pushkina': { path: '/objects/pushkina-25/', keyword: 'ul_pushkina_25' },
};

function cleanText(raw) {
  return String(raw || '')
    .replace(/&quot;/gi, '"')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&mdash;|&ndash;|—/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function collectKsmUpdates() {
  const cache = new Map();
  const updates = {};

  for (const [devId, slug] of Object.entries(KSM_PROJECT_SLUGS)) {
    if (!cache.has(slug)) {
      const url = `https://ksm-kirov.ru/catalog/projects/${slug}`;
      const html = await fetchHtml(url);
      const metaDesc = cleanText(
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      );
      const heroSlides = [...new Set(
        [...html.matchAll(/\/media\/Catalog\/ProjectHeroSlide\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)].map(
          (m) => `https://ksm-kirov.ru${m[0]}`
        )
      )].filter((u) => !u.includes('_2x') && !u.includes('_mob') && !u.includes('webp_'));
      const progressImgs = [...new Set(
        [...html.matchAll(/\/media\/Catalog\/BuildingProgressImage\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)].map(
          (m) => `https://ksm-kirov.ru${m[0]}`
        )
      )].filter((u) => !u.includes('_2x') && !u.includes('_mob') && !u.includes('webp_'));
      const genplan = [...new Set(
        [...html.matchAll(/\/media\/Catalog\/Project\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)].map(
          (m) => `https://ksm-kirov.ru${m[0]}`
        )
      )].filter((u) => !u.includes('_2x') && !u.includes('_mob') && !u.includes('webp_'));

      cache.set(slug, {
        url,
        description: metaDesc,
        images: [...heroSlides.slice(0, 1), ...progressImgs.slice(0, 2), ...genplan.slice(0, 1)],
      });
    }

    const parsed = cache.get(slug);
    if (devId === 'zhk-chistoprudnenskaya-11a') {
      updates[devId] = {
        builder_url: parsed.url,
        images: [
          'https://ksm-kirov.ru/media/Catalog/BuildingHeroSlide/2026-10-23/747bc431292c018e33144a4827fc8e6a.jpg',
          ...parsed.images.slice(1),
        ].filter(Boolean),
      };
    } else if (parsed.images.length > 0) {
      updates[devId] = {
        builder_url: parsed.url,
        ...(parsed.description ? { description: parsed.description } : {}),
        images: parsed.images,
      };
    }
  }

  return updates;
}

async function collectKsskUpdates() {
  const homeHtml = await fetchHtml('https://kvartiry.kssk.ru/');
  const homeImgs = [...new Set(
    [...homeHtml.matchAll(/\/upload\/(?:resize_cache\/)?iblock\/[^"'\s)]+\.(?:jpg|jpeg|png)/gi)].map(
      (m) => m[0]
    )
  )].map((rel) =>
    `https://kvartiry.kssk.ru${rel.replace(/\/upload\/resize_cache\/iblock\/([^/]+)\/\d+_\d+_\d+\/([^/?#]+)/i, '/upload/iblock/$1/$2')}`
  );

  const updates = {};
  for (const [devId, spec] of Object.entries(KSSK_OBJECT_PATHS)) {
    const pageUrl = `https://kvartiry.kssk.ru${spec.path}`;
    const pageHtml = await fetchHtml(pageUrl);
    const metaDesc = cleanText(
      pageHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    );
    const matchedImgs = [...new Set(homeImgs.filter((u) => u.includes(spec.keyword)))];

    updates[devId] = {
      builder_url: pageUrl,
      ...(metaDesc ? { description: metaDesc } : {}),
      ...(matchedImgs.length > 0 ? { images: matchedImgs } : {}),
    };
  }

  return updates;
}

async function main() {
  const [ksmUpdates, ksskUpdates] = await Promise.all([
    collectKsmUpdates(),
    collectKsskUpdates(),
  ]);
  const allUpdates = { ...ksmUpdates, ...ksskUpdates };

  const json = JSON.parse(fs.readFileSync('public/data/developments.json', 'utf8'));
  for (const d of json.developments || []) {
    if (allUpdates[d.id]) Object.assign(d, allUpdates[d.id]);
  }
  json.updated_at = new Date().toISOString();
  fs.writeFileSync('public/data/developments.json', JSON.stringify(json, null, 2) + '\n', 'utf8');

  let jsText = fs.readFileSync('src/data/developmentsData.js', 'utf8');
  const startMarker = '// @DEVELOPMENTS_DATA_START\nexport const DEFAULT_DEVELOPMENTS = ';
  const endMarker = ';\n// @DEVELOPMENTS_DATA_END';
  const sIdx = jsText.indexOf(startMarker);
  const eIdx = jsText.indexOf(endMarker);
  const arr = JSON.parse(jsText.slice(sIdx + startMarker.length, eIdx));
  for (const d of arr) {
    if (allUpdates[d.id]) Object.assign(d, allUpdates[d.id]);
  }
  jsText = jsText.slice(0, sIdx + startMarker.length) + JSON.stringify(arr, null, 2) + jsText.slice(eIdx);
  fs.writeFileSync('src/data/developmentsData.js', jsText, 'utf8');

  console.log('Synced photo & info for', Object.keys(allUpdates).length, 'KSM/KSSK developments.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
