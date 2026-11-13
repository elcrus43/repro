/* global process, Buffer */
/**
 * api/_tiktok-report.js
 *
 * Ядро ежедневного TikTok-дайджеста для контент-плана Realtor Match.
 * Задача - не «найти вирусное видео», а вытащить вирусный ХУК: фразу, которая
 * сегодня держит внимание, и переписать её под боль ЦА риелтора.
 *
 * Срезы:
 *   1. Что залетает за 24 часа и какая первая строка подписи у этих роликов (revid.ai).
 *   2. Звук, который берут чаще всего (та же страница revid.ai).
 *   3. Сюжеты по регионам (convosight.com/moments).
 *   4. Ниша «недвижимость»: недельный тренд + месячный топ-20 с множителем (fypnow.com).
 *   5. Хук дня: скелет фразы + 3 готовых хука под падежные формы боли ниши + пост.
 *
 * Официального рейтинга «самое вирусное сегодня» у TikTok нет, поэтому всё
 * богатство источников - сторонние сэмплы. Любой упавший источник не должен
 * ронять отчёт: он помечается в errors, остальное досылается (см. AGENTS.md, п.4).
 */

import crypto from 'crypto';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const SOURCES = {
  gainers: 'https://www.revid.ai/tiktok-viral-trends-today',
  regions: 'https://www.convosight.com/tools/moments/trends/tiktok',
  nicheWeekly: 'https://fypnow.com/trends/real-estate',
  nicheMonthly: 'https://fypnow.com/blog/real-estate-tiktok-trends',
};

const REQUEST_TIMEOUT_MS = 20000;

/** Снимает теги, склеенные React-комментариями, и схлопывает пробелы. */
function stripTags(value) {
  return String(value || '')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&#39;|&#8217;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "3.2M" | "+3.2M" | "857K" | "1 234" -> число просмотров. */
function toNumber(value) {
  const raw = String(value || '').trim().replace(/[+\s]/g, '');
  const match = raw.match(/^([\d.,]+)([KMB]?)$/i);
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || '').toUpperCase()];
  return Math.round(base * (mult || 1));
}

/** Число -> компактная строка для телеграма. */
function compact(value) {
  if (value == null) return '?';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(value);
}

/** "2,477x" -> "2 477x": разделитель тысяч по-русски. */
function spaceOut(value) {
  return String(value ?? '').replace(/,/g, ' ');
}

export async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, 'accept-language': 'en,ru;q=0.8' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* 1. Прирост за 24 часа                                              */
/* ------------------------------------------------------------------ */

/** Скелет хука: по чему фраза держит внимание. Порядок важен - от самого узкого к общему. */
const HOOK_SKELETONS = [
  {
    type: 'instruction',
    test: /(how to|^steps|recipe|prep:|ingredients|tutorial|\beasy\b|\bdiy\b|\bstep\b|пошагов)/i,
    label: 'инструкция',
    formula: 'конкретное действие + обещание результата',
  },
  {
    type: 'reveal',
    test: /(reveal|finally|after \d+|the moment|won.?t believe|watch till|до конца)/i,
    label: 'раскрытие',
    formula: 'отложенный финал: "тот самый момент, когда..."',
  },
  {
    type: 'question',
    test: /(\?|why|which|would you|how many|стоит ли|почему|сколько)/i,
    label: 'вопрос',
    formula: 'вопрос, на который зритель знает ответ лучше автора',
  },
  {
    type: 'negation',
    test: /(\bdo not\b|\bdon.?t\b|\bnever\b|\bstop\b|mistake|ошибк|avoid|wrong)/i,
    label: 'запрет или ошибка',
    formula: 'отрицание привычного действия',
  },
  {
    type: 'urgency',
    test: /(\btoday\b|\bnow\b|\blast\b|only \d+|deadline|сегодня|последн|до \d+)/i,
    label: 'дедлайн',
    formula: 'ограничение по времени + конкретика',
  },
  {
    type: 'confession',
    test: /(^|\s)(i|m|we|my|myself)\s|признаюсь|я думал|мой первый/i,
    label: 'признание',
    formula: 'личная неудача от первого лица',
  },
];

/**
 * Боли ЦА с формами падежей. Подстановка идёт не одной строкой, а выбранной формой,
 * иначе на склейке получается «при срочной продажи» и «закрыть подбор объектов».
 */
const PAIN_CASES = {
  urgent: {
    nom: 'срочная продажа',
    prep: 'срочной продаже',
    gen: 'срочной продажи',
    pain: 'объект висит, цена падает, собственник давит',
  },
  matching: {
    nom: 'подбор объектов',
    prep: 'подборе объектов',
    gen: 'подбора объектов',
    pain: 'клиент ждёт подборку, а вы вечер за вечером считаете карточки вручную',
  },
  showing: {
    nom: 'показ объектов',
    prep: 'показе объектов',
    gen: 'показа объектов',
    pain: 'показы впустую: объект не подошёл по мелочи, и клиент остыл на пороге',
  },
  luxury: {
    nom: 'люкс-сегмент',
    prep: 'люкс-сегменте',
    gen: 'люкс-сегмента',
    pain: 'показывать нечем, а клиент ждёт картинку уровня Дубая',
  },
};

/** Хук - это первая строка подписи: то, что написано на экране в первые 3 секунды. */
function extractHook(caption) {
  const first = String(caption || '').split(/[\n|]/)[0].trim();
  const cleaned = first.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 120);
}

/** Формы обращения к боли недельного тренда ниши. */
function pickPainCase(nicheTrend) {
  const raw = String(nicheTrend?.title || '');
  if (/urgent|sale|sell|price|discount/i.test(raw)) return PAIN_CASES.urgent;
  if (/luxury|dubai|critic|mansion/i.test(raw)) return PAIN_CASES.luxury;
  if (/tour|showing|visit|open house/i.test(raw)) return PAIN_CASES.showing;
  return PAIN_CASES.matching;
}

/**
 * Банк хуков по скелету. Строки согласованы с конкретной падежной формой,
 * поэтому {nom}/{prep}/{gen} подставляются без сюрпризов вроде «при срочной продажи».
 */
const NICHE_HOOKS = {
  instruction: [
    '{nom}: 3 ошибки, из-за которых клиент уходит к другому',
    'Что я меняю в {prep}, чтобы всё закрывалось за вечер',
    '{nom} без таблицы на 40 листов: пошагово',
  ],
  reveal: [
    'Тот момент, когда {gen} наконец сходится',
    'Показываю, как выглядит {nom} внутри CRM, а не в переписке',
    'Что изменилось после 30 показов впустую: разбор в {prep}',
  ],
  negation: [
    'Не делайте {nom} вручную',
    'Хватит терять клиентов на {prep}',
    'Главная ошибка в {prep}: вы отвечаете клиенту сами',
  ],
  question: [
    'Сколько показов за неделю вы сделали только чтобы не потерять клиента?',
    'Почему {nom} занимает вечер, а у коллеги - 10 минут?',
    'Что делать, если {gen} зависла, а собственник давит?',
  ],
  confession: [
    'Признаюсь: в {prep} я терял каждый вечер',
    'Мой первый провал в {prep}: клиент ушёл к тому, кто ответил быстрее',
    'Я думал, что {nom} - про объекты. Оказалось, про скорость',
  ],
  urgency: [
    'Сегодня: {nom} без единого ручного подбора',
    'Один вечер до выходных - и {gen} закрыта списком совпадений',
    'Пока рынок не остыл: {nom} за 15 минут',
  ],
  statement: [
    '{nom}. Без таблицы, без "сейчас скину ссылку"',
    '{nom} - на одном экране',
    '{gen} решается списком, а не обзвоном',
  ],
};

/** По хуку и формату подписи подбираем скелет и боли-контекст. */
function classifyHook(hook) {
  return HOOK_SKELETONS.find((s) => s.test.test(hook)) || {
    type: 'statement',
    label: 'утверждение',
    formula: 'короткое утверждение без пояснений - интрига в недосказанности',
  };
}

/**
 * TikTok кладёт данные ролика в JSON внутри script#__UNIVERSAL_DATA_FOR_REHYDRATION__.
 * @param {string} html
 * @returns {object|null}
 */
function parseTiktokUniversalData(html) {
  const raw = (html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/) || [])[1];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Прямой хук ролика - его подпись целиком: на витрине TikTok это и есть текст
 * первых секунд. Работает только с не-RU egress: с российского IP TikTok отдаёт
 * statusCode 10204 (ru_cross_border_block) без данных, поэтому вызов нужен
 * серверный (Vercel-cron), а локально он честно падает в errors.
 * @param {string} url
 * @param {(u: string) => Promise<string>} [load]
 */
export async function fetchVideoHook(url, load = fetchHtml) {
  if (!/^https:\/\/www\.tiktok\.com\//.test(url)) return null;

  const data = parseTiktokUniversalData(await load(url));
  const detail = (data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__['webapp.video-detail']) || null;
  if (!detail) return { url, blocked: true, reason: 'TikTok не отдал данные ролика' };

  if (detail.statusCode && detail.statusCode !== 0) {
    const reason = detail.statusCode === 10204 ? 'TikTok блокирует этот IP' : `TikTok statusCode ${detail.statusCode}`;
    return { url, blocked: true, reason };
  }

  const desc = detail.itemInfo?.itemStruct?.desc || '';
  if (!desc) return { url, blocked: true, reason: 'у ролика нет подписи' };

  return {
    url,
    blocked: false,
    hook: extractHook(desc),
    skeleton: classifyHook(desc),
    desc: desc.replace(/\s+/g, ' ').slice(0, 140),
    author: detail.itemInfo?.itemStruct?.author?.uniqueId || '',
    likes: detail.itemInfo?.itemStruct?.stats?.diggCount ?? null,
  };
}

/** Хуки-конкуренты: реальные подписи сегодняшних виралов, классифицированные по скелету. */
function buildHooks(gainers) {
  return gainers.slice(0, 5).map((g) => ({
    hook: g.hook,
    skeleton: g.skeleton,
    author: g.author,
    gainedLabel: g.gainedLabel,
    url: g.url,
  }));
}

/** Звуковый хук: трек, который берут чаще всего (с той же страницы). */
function parseSounds(html) {  const from = html.indexOf('Trending sounds');
  if (from < 0) return [];
  const to = html.indexOf('Categories gaining views', from);
  const zone = html.slice(from, to > from ? to : html.length);
  const items = [...zone.matchAll(/<li class="flex items-center gap-3[\s\S]*?<\/li>/g)].map((m) => m[0]);

  return items
    .map((block) => {
      const rank = (block.match(/tabular-nums text-secondary">(\d+)</) || [])[1];
      const title = stripTags((block.match(/text-\[15px\] font-medium text-white">([\s\S]*?)<\/span>/) || [])[1] || '');
      const meta = stripTags((block.match(/text-\[12px\] text-white\/50">([\s\S]*?)<\/span>/) || [])[1] || '');
      return { rank, title, meta };
    })
    .filter((s) => s.title)
    .slice(0, 3);
}

function parseGainers(html) {
  const from = html.indexOf('Gaining views right now');
  const to = html.indexOf('Trending hashtags', from);
  if (from < 0) return [];
  const zone = html.slice(from, to > from ? to : html.length);

  const blocks = [...zone.matchAll(/<li class="min-w-0">[\s\S]*?(?=<li class="min-w-0">|$)/g)].map((m) => m[0]);

  return blocks
    .map((block) => {
      const link = (block.match(/href="(https:\/\/www\.tiktok\.com\/@[^/"]+\/video\/\d+)"/) || [])[1] || '';
      const author = (block.match(/@<!-- -->([A-Za-z0-9_.-]+)/) || [])[1] || '';
      const deltaRaw = (block.match(/([\d.,]+[KMB]?) views in 24h/i) || [])[1] || '';
      const gained = toNumber(deltaRaw);
      const caption = stripTags((block.match(/text-white\/60">([\s\S]*?)<\/p>/) || [])[1] || '');
      const statsTail = block.slice(block.indexOf('mt-auto flex flex-nowrap'));
      const numbers = [...statsTail.matchAll(/<\/svg>([\d.,]+[KMB]?)<\/span>/gi)].map((n) => toNumber(n[1]));
      const age = stripTags((statsTail.match(/<span>([^<]*ago)[^<]*<\/span>/i) || [])[1] || '');
      const hook = extractHook(caption);
      return {
        url: link,
        author,
        caption: caption.slice(0, 90),
        hook,
        skeleton: classifyHook(`${hook} ${caption}`),
        gained,
        gainedLabel: deltaRaw ? `+${deltaRaw}` : '',
        views: numbers[0] ?? null,
        likes: numbers[1] ?? null,
        age,
        ageHours: ageHoursOf(age),
      };
    })
    .filter((item) => item.url && item.gained > 0)
    .sort((a, b) => b.gained - a.gained);
}

/** "23h ago" | "2d ago" | "1d ago" -> часы. */
function ageHoursOf(age) {
  const match = String(age || '').match(/(\d+)\s*([hd])/i);
  if (!match) return null;
  const n = Number(match[1]);
  return match[2].toLowerCase() === 'd' ? n * 24 : n;
}

/** Возраст ролика по-русски, коротко. */
function ageRu(age) {
  const hours = ageHoursOf(age);
  if (hours == null) return String(age || '');
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}

/** Статус недельного тренда ниши по-русски. */
function statusRu(status) {
  const raw = String(status || '');
  if (/fading/i.test(raw)) return 'затухает';
  if (/ended/i.test(raw)) return 'завершён';
  if (/rising|climbing|new/i.test(raw)) return 'растёт';
  return 'активен';
}

/* ------------------------------------------------------------------ */
/* 2. Регионы                                                         */
/* ------------------------------------------------------------------ */

const REGION_BY_SLUG = [
  [/\/moments\/us\//, '🇺🇸 США'],
  [/\/moments\/europe\//, '🇪🇺 Европа'],
  [/\/moments\/asia\//, '🌏 Азия'],
  [/\/moments\/latam\//, '🌎 ЛатАм'],
];

function parseRegions(html) {
  const from = html.indexOf('This week');
  const to = html.indexOf('Earlier', from);
  if (from < 0) return [];
  const zone = html.slice(from, to > from ? to : html.length);
  const items = [...zone.matchAll(/<li class="border-b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

  return items
    .map((block) => {
      const title = stripTags((block.match(/font-semibold text-ink">([\s\S]*?)<\/p>/) || [])[1] || '');
      const meta = stripTags((block.match(/text-sm text-muted">([\s\S]*?)<\/p>/) || [])[1] || '');
      const views = (meta.match(/([\d.,]+[KMB]?)\s*views/i) || [])[1];
      const geo = (REGION_BY_SLUG.find(([re]) => re.test(block)) || [])[1] || '';
      return { title: title.slice(0, 60), views: views ? `${views}` : '', geo };
    })
    .filter((item) => item.views && item.title)
    .slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* 3. Ниша «недвижимость»                                             */
/* ------------------------------------------------------------------ */

function parseNicheWeekly(html) {
  const articles = [...html.matchAll(/<article id="([^"]+)"[\s\S]*?<\/article>/g)];

  return articles.map(([, id]) => {
    const block = (html.match(new RegExp(`<article id="${id}"[\\s\\S]*?<\\/article>`)) || [])[0] || '';
    const title = stripTags((block.match(/<h3[\s\S]*?<\/h3>/) || [])[0] || '');
    const status = stripTags((block.match(/<p class="mt-2 text-sm[\s\S]*?<\/p>/) || [])[0] || '');
    const text = stripTags(block);
    const creators = (text.match(/([\d.]+)\s*creators/i) || [])[1] || '?';
    const videos = (text.match(/([\d.]+)\s*videos/i) || [])[1] || '?';
    const multiplier = (() => {
      const raw = text.match(/([\d.,]+)\s*x\s*views/i);
      return raw ? `${raw[1].replace(/\s/g, '')}x` : '?';
    })();
    const sampleUrl = (block.match(/href="(https:\/\/www\.tiktok\.com\/[^"]*\/video\/\d+)"/) || [])[1] || '';
    return { id, title, status, creators, videos, multiplier, sampleUrl };
  });
}

function parseNicheMonthly(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);

  return rows
    .map((row) => {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1]));
      if (cells.length < 6) return null;
      const url = (row.match(/href="(https:\/\/www\.tiktok\.com\/@[^"]+\/video\/\d+)"/) || [])[1] || '';
      const exact = toNumber((row.match(/title="([\d,.]+) views"/i) || [])[1] || '');
      return {
        creator: cells[1].replace(/^@?/, '@'),
        url,
        views: exact ?? toNumber(cells[2]),
        viewsLabel: cells[2],
        followers: cells[3],
        multiplier: cells[4],
        engagement: cells[5],
      };
    })
    .filter((r) => r && r.views)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
}

/**
 * Лучший «аномальный» ролик ниши: максимальный множитель просмотры/подписчики.
 * Large account с 9x - это обычная неделя большого аккаунта, small account с 2477x -
 * это и есть залетевший ролик, алгоритм его выбросил сам.
 */
function pickOutlier(list) {
  let best = null;
  for (const item of list) {
    const mult = Number(String(item.multiplier).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(mult) || mult <= 0) continue;
    if (!best || mult > Number(best.multiplierValue)) best = { ...item, multiplierValue: mult };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* 4. Хук дня: скелет фразы и связка с болью ЦА                       */
/* ------------------------------------------------------------------ */

/** Формат вирального ролика определяется по подписи - этого хватает для выбора каркаса. */
const FORMAT_RULES = [
  {
    key: 'instruction',
    test: /(prep:|cook:|ingredients|recipe|how to|tutorial|easy|diy|step)/i,
    label: 'пошаговая инструкция крупным планом',
    topic: 'ручной подбор объектов',
    pain: 'подбор объекта под запрос клиента вручную: вечер в таблице, двадцать карточек, и всё равно мимо',
    feature: 'База клиентов и запросов: критерии задаются один раз, совпадения считает match engine',
  },
  {
    key: 'hunt',
    test: /(token|fortnite|stream|giveaway|unlock|chests|reward)/i,
    label: 'охота за наградой, которая никак не падает',
    topic: 'охота за свежим лотом',
    pain: 'свежий лот уходит за час: кто первым увидел, того и сделка',
    feature: 'Синхронизация лотов застройщиков и уведомления о новых совпадениях',
  },
  {
    key: 'skit',
    test: /(pov|skit|funny|prank|comedy|joke)/i,
    label: 'сценка-зарисовка от первого лица',
    topic: 'показ без подготовки',
    pain: 'клиент пишет в пяти мессенджерах, и история договорённостей теряется вместе с перепиской',
    feature: 'Сделка и чат по объекту: переписка, показы и документы в одном месте',
  },
  {
    key: 'satisfying',
    test: /(dog|puppy|husky|cat|animal|cute|asmr|satisfying)/i,
    label: 'залипательный визуал без слов под трендовый звук',
    topic: 'показ не того объекта',
    pain: 'показы впустую: едете на объект, который не подошёл по мелочи, и клиент это почувствовал на пороге',
    feature: 'Карточка показа с фото и комментарием клиента прямо на месте',
  },
  {
    key: 'tour',
    test: /(home tour|house|property|listing|flip|interior|luxury|dubai)/i,
    label: 'тур по объекту с честной подписью о процессе',
    topic: 'тур по объекту без готового текста',
    pain: 'красивая съёмка есть, а объявления и баннера под неё нет - пост уезжает в долгий ящик',
    feature: 'Генератор объявления и баннеров: карточка объекта превращается в готовый пост',
  },
];

const FALLBACK_FORMAT = {
  key: 'raw',
  label: 'быстрый разгон на честной подписи поверх красивой картинки',
  topic: 'подбор объектов и показы',
  pain: 'контент для соцсетей собирается по остаткам времени между сделками',
  feature: 'Генератор объявления: текст собирается из данных карточки, без зависимости от AI',
};

function detectFormat(caption) {
  return FORMAT_RULES.find((rule) => rule.test.test(caption)) || FALLBACK_FORMAT;
}

/**
 * План по хуку: берётся скелет сегодняшнего вирала, а не сам ролик.
 * Формы падежей зашиты в NICHE_HOOKS, подстановка одна - topic, поэтому
 * на стыке «скелет глобального ролика + боль ниши» не получается каша из падежей.
 */
function buildHookPlan({ gainers, sounds, nicheTrend, format, outlier, nicheHook }) {
  const globalSource = gainers[0] || null;
  const source = nicheHook || globalSource;
  const skeleton = source?.skeleton || classifyHook('');
  const painCase = pickPainCase(nicheTrend);
  const bank = NICHE_HOOKS[skeleton.type] || NICHE_HOOKS.statement;
  const fill = (tpl) =>
    tpl
      .replaceAll('{nom}', painCase.nom)
      .replaceAll('{prep}', painCase.prep)
      .replaceAll('{gen}', painCase.gen);
  const variants = bank.slice(0, 3).map(fill);
  const sound = sounds?.[0] || null;

  const post = [
    variants[0],
    '',
    `${painCase.pain}.`,
    `${format?.feature || FALLBACK_FORMAT.feature} - и весь подбор сходится за один экран.`,
    '',
    'Кому показать на примере вашей базы - напишите "подбор"',
  ].join('\n');

  const outlierNote = outlier
    ? `План Б: разобрать аномалию ниши ${outlier.creator} (${outlier.viewsLabel} при ${outlier.followers} подписчиков = ${spaceOut(outlier.multiplier)}) - это готовый хук «как малый аккаунт обогнал крупный».`
    : '';

  return {
    sourceHook: source?.hook || '',
    sourceKind: nicheHook ? 'хук из ниши' : 'глобальный хук',
    sourceAuthor: source?.author || (nicheHook ? '' : ''),
    sourceGained: source?.gainedLabel || '',
    sourceUrl: source?.url || '',
    skeletonType: skeleton.type,
    skeletonLabel: skeleton.label,
    skeletonFormula: skeleton.formula,
    painCase: painCase.nom,
    pain: painCase.pain,
    feature: format?.feature || FALLBACK_FORMAT.feature,
    variants,
    sound,
    outlierNote,
    post,
    meta: `Мета для Статейника: тема «${painCase.nom}», скелет хука «${skeleton.label}» (${skeleton.formula}), боль «${painCase.pain.split(':')[0]}», продукт «${(format?.feature || FALLBACK_FORMAT.feature).split(':')[0]}», длина ~330 знаков, вертикаль, субтитры обязательны.`,
    shootingNote: 'Чужой ролик не берём: в кадре свой объект, экран CRM или рука с телефоном. Заимствуется только скелет фразы и длительность первых 3 секунд.',
    rationale: `Хук ${source?.author ? `@${source.author}` : ''} («${source?.hook || ''}») добрал ${source?.gainedLabel || ''} за сутки за счёт скелета «${skeleton.label}: ${skeleton.formula}». Этот же скелет натягивается на боль ниши - получается фраза, а не пересъёмка чужого видео. Недельный тренд ниши: ${nicheTrend ? `«${nicheTrend.title}» (${statusRu(nicheTrend.status)})` : 'не отслежен'}.`,
  };
}

function velocityOf(item) {
  if (!item || !item.gained || !item.views) return null;
  return Math.round((item.gained / item.views) * 100);
}

/**
 * Фазовая оценка: виральный ролик живёт 2-4 недели, и смысл поста зависит от фазы.
 * До 48 часов - ещё можно успеть в волну, дальше - только брать каркас.
 */
function phaseOf(item) {
  const velocity = velocityOf(item);
  const hours = item.ageHours;
  if (hours != null && hours <= 26 && velocity != null && velocity >= 60) {
    return { phase: 'разгон', note: 'хук ещё свежий - снимать сегодня' };
  }
  if (hours != null && hours <= 72) return { phase: 'подъём', note: 'хук уже копируют, берите с твистом' };
  return { phase: 'пик', note: 'фраза затёрта - берите скелет, а не дословный хук' };
}

/* ------------------------------------------------------------------ */
/* Сборка отчёта                                                      */
/* ------------------------------------------------------------------ */

function fmtDate(date) {
  return date.toLocaleDateString('ru-RU');
}

/**
 * Собирает дайджест по всем источникам.
 * @param {{ now?: Date, fetchImpl?: (u: string) => Promise<string> }} [options]
 * @returns {Promise<object>}
 */
export async function collectTiktokReport(options = {}) {
  const now = options.now || new Date();
  const load = options.fetchImpl || fetchHtml;
  const errors = [];

  const tasks = await Promise.allSettled(
    Object.entries(SOURCES).map(([key, url]) => load(url).then((html) => ({ key, html })))
  );

  const pages = {};
  tasks.forEach((task, index) => {
    const key = Object.keys(SOURCES)[index];
    if (task.status === 'fulfilled') {
      pages[key] = task.value.html;
    } else {
      errors.push(`${key}: ${task.reason?.message || task.reason}`);
    }
  });

  const gainers = pages.gainers ? parseGainers(pages.gainers) : [];
  const sounds = pages.gainers ? parseSounds(pages.gainers) : [];
  const regions = pages.regions ? parseRegions(pages.regions) : [];
  const nicheWeekly = pages.nicheWeekly ? parseNicheWeekly(pages.nicheWeekly) : [];
  const nicheMonthly = pages.nicheMonthly ? parseNicheMonthly(pages.nicheMonthly) : [];

  // Прямые подписи нишевых роликов: точный хук, но только при не-RU egress.
  let nicheHooks = [];
  if (options.fetchVideo) {
    const probed = await Promise.allSettled(
      nicheMonthly.slice(0, 3).map((n) => fetchVideoHook(n.url, options.fetchVideo))
    );
    nicheHooks = probed.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean);
    const blocked = nicheHooks.find((h) => h.blocked);
    if (blocked) errors.push(`хук ниши напрямую: ${blocked.reason}`);
  }

  const liveNicheHook = nicheHooks.find((h) => !h.blocked) || null;
  const top = gainers[0] || null;
  const freshest =
    gainers
      .filter((g) => g.ageHours != null && g.ageHours <= 30)
      .sort((a, b) => b.gained - a.gained)[0] || null;
  const outlier = pickOutlier(nicheMonthly);
  const aliveTrend = nicheWeekly.find((t) => !/Ended/i.test(t.status)) || nicheWeekly[0] || null;
  const format = detectFormat(`${liveNicheHook?.desc || top?.hook || ''} ${top?.caption || ''} ${regions?.[0]?.title || ''}`);
  const hookPlan = buildHookPlan({ gainers, sounds, nicheTrend: aliveTrend, format, outlier, nicheHook: liveNicheHook });

  return {
    date: now,
    dateLabel: fmtDate(now),
    top,
    freshest,
    gainers: gainers.slice(0, 5),
    hooks: buildHooks(gainers),
    nicheHooks,
    sounds,
    regions,
    nicheWeekly,
    nicheTop: nicheMonthly,
    outlier,
    aliveTrend,
    phase: top ? phaseOf(top) : null,
    velocityPct: velocityOf(top),
    hookPlan,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/* Форматывание                                                       */
/* ------------------------------------------------------------------ */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function line(report) {
  const items = [];
  if (report.top) {
    items.push(
      `<b>🔥 Главный за сутки: ${esc(report.top.gainedLabel)}</b>`,
      `${esc(report.top.author)} · <i>${esc(report.top.caption)}</i>`,
      `всего ${esc(compact(report.top.views))} · ${esc(ageRu(report.top.age))} · фаза: ${esc(report.phase?.phase || '')}`
    );
    items.push(`<a href="${esc(report.top.url)}">смотреть ролик</a>`);
  }
  if (report.freshest && report.freshest !== report.top) {
    items.push(
      '',
      `<b>⚡ Самый молодой разгон: ${esc(report.freshest.gainedLabel)} за ${esc(ageRu(report.freshest.age))}</b>`,
      `${esc(report.freshest.author)} · <i>${esc(report.freshest.caption)}</i>`,
      `<a href="${esc(report.freshest.url)}">смотреть</a>`
    );
  }
  return items;
}

function regionsBlock(report) {
  if (!report.regions.length) return [];
  return ['', '<b>🌍 Сюжеты недели по регионам</b>', ...report.regions.map((r) => `${esc(r.geo)} · ${esc(r.title)} · ${esc(r.views)}`)];
}

function nicheBlock(report) {
  const items = ['', '<b>🏠 Ниша «недвижимость»</b>'];
  if (report.aliveTrend) {
    items.push(
      `Тренд недели: ${esc(report.aliveTrend.title)} · ${esc(report.aliveTrend.creators)} авторов · ${esc(report.aliveTrend.videos)} видео · множитель ${esc(report.aliveTrend.multiplier)}`,
      `Статус: ${esc(statusRu(report.aliveTrend.status))}`
    );
  } else {
    items.push('Недельный тренд не отслежен - ниша сейчас без общей волны');
  }
  if (report.outlier) {
    items.push(
      `Аномалия месяца: ${esc(report.outlier.creator)} · ${esc(report.outlier.viewsLabel)} при ${esc(report.outlier.followers)} подписчиков = <b>${esc(spaceOut(report.outlier.multiplier))}</b>`,
      `<a href="${esc(report.outlier.url)}">разобрать формат</a>`
    );
  }
  return items;
}

function hookBlock(report) {
  const h = report.hookPlan;
  const items = ['', '<b>🎯 Хук дня и его скелет</b>'];
  if (report.hooks.length) {
    items.push(...report.hooks.slice(0, 3).map((x, i) => `${i + 1}. «${esc(x.hook)}» · ${esc(x.skeleton.label)} · @${esc(x.author)} ${esc(x.gainedLabel)}`));
  }
  if (h.sourceHook) {
    items.push(
      '',
      `Скелет (${esc(h.sourceKind)}): <b>${esc(h.skeletonLabel)}</b> - ${esc(h.skeletonFormula)}`,
      `Звук, который берут чаще: ${esc(h.sound?.title || 'нет данных')}${h.sound?.meta ? ` · ${esc(h.sound.meta)}` : ''}`
    );
  }
  items.push('', '<b>Твои хуки по этому скелету (ниша риелтора)</b>');
  h.variants.forEach((v, i) => items.push(`${i + 1}) ${esc(v)}`));
  return items;
}

function postBlock(report) {
  const h = report.hookPlan;
  return [
    '',
    '<b>📝 Пост для Статейника (текст, без чужого видео)</b>',
    esc(h.post),
    '',
    `<i>${esc(h.meta)}</i>`,
    `<i>Съёмка: ${esc(h.shootingNote)}</i>`,
    h.outlierNote ? `<i>${esc(h.outlierNote)}</i>` : '',
    `<i>${esc(h.rationale)}</i>`,
  ].filter(Boolean);
}

/** Telegram-сообщение в HTML, разбитое на части по 4000 знаков. */
export function buildTelegramMessage(report) {
  const header = `<b>📈 TikTok-дайджест для контент-плана · ${esc(report.dateLabel)}</b>`;
  const footer = report.errors.length
    ? ['', `<i>⚠️ без данных: ${esc(report.errors.join('; '))}</i>`]
    : ['', '<i>Источники: revid.ai (24ч), convosight (регионы), fypnow (ниша). Официального рейтинга TikTok нет - это сторонние сэмплы.</i>'];

  const body = [header, ...line(report), ...regionsBlock(report), ...nicheBlock(report), ...hookBlock(report), ...postBlock(report), ...footer];

  const chunks = [];
  let current = [];
  let size = 0;
  for (const part of body) {
    if (size + part.length + 1 > 3800) {
      chunks.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(part);
    size += part.length + 1;
  }
  if (current.length) chunks.push(current.join('\n'));
  return chunks.filter(Boolean);
}

/** Markdown-копия в .notes/tiktok-trends/. Окончания строк - LF. */
export function buildMarkdownReport(report) {
  const md = [];

  md.push(`# TikTok-дайджест · ${report.dateLabel}`, '');
  if (report.top) {
    md.push(`## Главный за сутки: ${report.top.gainedLabel} просмотров`);
    md.push(
      `- Автор: @${report.top.author}`,
      `- Подпись: ${report.top.caption}`,
      `- Всего: ${compact(report.top.views)} · лайки ${compact(report.top.likes)} · возраст ${ageRu(report.top.age)}`,
      `- Фаза: ${report.phase?.phase} - ${report.phase?.note}`,
      `- Скорость: ${report.velocityPct}% всего объёма добирается за сутки`,
      `- Ссылка: ${report.top.url}`,
      ''
    );
  }
  if (report.gainers.length > 1) {
    md.push('## Топ прироста за 24 часа', '');
    md.push('| # | Автор | Хук (первая строка подписи) | Скелет | +24ч | Всего | Возраст |', '|---|---|---|---|---|---|---|');
    report.gainers.forEach((g, i) => {
      md.push(`| ${i + 1} | @${g.author} | ${(g.hook || g.caption).replace(/\|/g, '\\|')} | ${g.skeleton?.label || ''} | ${g.gainedLabel} | ${compact(g.views)} | ${ageRu(g.age)} |`);
    });
    md.push('');
  }
  if (report.regions.length) {
    md.push('## Сюжеты недели по регионам', '');
    report.regions.forEach((r) => md.push(`- **${r.geo}** · ${r.title} · ${r.views}`));
    md.push('');
  }
  md.push('## Ниша «недвижимость»', '');
  if (report.aliveTrend) {
    md.push(`- Тренд недели: **${report.aliveTrend.title}** (${report.aliveTrend.creators} авторов, ${report.aliveTrend.videos} видео, множитель ${report.aliveTrend.multiplier})`);
    md.push(`- Статус: ${statusRu(report.aliveTrend.status)} (${report.aliveTrend.status})`);
  }
  if (report.outlier) {
    md.push(`- Аномалия месяца: **${report.outlier.creator}** - ${report.outlier.viewsLabel} при ${report.outlier.followers} подписчиков = ${spaceOut(report.outlier.multiplier)}`);
    md.push(`  - ${report.outlier.url}`);
  }
  if (report.nicheTop.length) {
    md.push('', '| Автор | Просмотры | Подписчики | Множитель | Вовлечённость |', '|---|---|---|---|---|');
    report.nicheTop.forEach((n) => md.push(`| ${n.creator} | ${n.viewsLabel} | ${n.followers} | ${spaceOut(n.multiplier)} | ${n.engagement} |`));
  }
  const h = report.hookPlan;
  md.push(
    '',
    '## Хук дня',
    '',
    `- Источник скелета (${h.sourceKind}): «${h.sourceHook}»${h.sourceAuthor ? ` - @${h.sourceAuthor}` : ''}${h.sourceGained ? ` (${h.sourceGained} за сутки)` : ''}`,
    `- Ссылка: ${h.sourceUrl}`,
    `- Скелет: ${h.skeletonLabel} - ${h.skeletonFormula}`,
    h.sound ? `- Звук, который берут чаще: ${h.sound.title} (${h.sound.meta})` : '- Звук: нет данных',
    '',
    '### Готовые хуки под нишу риелтора',
    ''
  );
  h.variants.forEach((v, i) => md.push(`${i + 1}. ${v}`));
  if (h.outlierNote) md.push('', `> ${h.outlierNote}`);

  md.push('', '## Пост для Статейника', '', '```', h.post, '```', '', h.meta, '', `Съёмка: ${h.shootingNote}`, '', `**Почему так:** ${h.rationale}`, '');
  if (report.errors.length) md.push('> Без данных:', ...report.errors.map((e) => `> - ${e}`), '');
  md.push('---', 'Источники: revid.ai (прирост за 24ч), convosight.com (регионы), fypnow.com (ниша).', 'Официального рейтинга «самое вирусное сегодня» у TikTok нет - все цифры из сторонних сэмплов.', '');
  return md.join('\n');
}

/** Отправка в Telegram. Возвращает количество отправленных частей. */
export async function sendToTelegram(report, { botToken, chatId }) {
  if (!botToken || !chatId) throw new Error('Не заданы TELEGRAM-токен и chat_id');
  const chunks = buildTelegramMessage(report);
  for (const chunk of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) throw new Error(`Telegram API: ${json.description || res.status}`);
  }
  return chunks.length;
}

/**
 * Разрешение cron-запроса по CRON_SECRET (Bearer / x-cron-secret / ?secret=).
 * Тот же контракт, что у api/cron-lots.js, чтобы vercel cron ходил в один шаблон.
 * @param {{ headers?: object, query?: object }} req
 * @returns {boolean}
 */
export function isAuthorizedCronRequest(req) {
  const expected = process.env.CRON_SECRET;
  if (typeof expected !== 'string' || !expected) return false;

  const pick = (value) => (Array.isArray(value) ? value[0] : value);
  const headers = req?.headers || {};
  const auth = pick(headers.authorization || headers.Authorization);
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const candidate = pick(
    bearer || headers['x-cron-secret'] || headers['X-Cron-Secret'] || req?.query?.secret
  );
  if (typeof candidate !== 'string' || !candidate) return false;

  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const TIKTOK_REPORT_SOURCES = SOURCES;

// Экспорт для тестов: разбор и сборка по слепку вёрстки, без сети.
export const __internals = {
  parseGainers,
  parseRegions,
  parseNicheWeekly,
  parseNicheMonthly,
  parseSounds,
  extractHook,
  classifyHook,
  buildHooks,
  buildHookPlan,
  detectFormat,
  HOOK_SKELETONS,
  NICHE_HOOKS,
  SOURCES,
};
