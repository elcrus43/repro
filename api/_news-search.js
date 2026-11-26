/**
 * api/_news-search.js — Серверный поиск новостей по недвижимости
 * (официальные новости, мемы, интересные факты, тренды)
 *
 * Префикс "_" означает, что файл не считается отдельной Vercel Serverless Function,
 * а импортируется из api/ai-proxy.js.
 */

export const NEWS_CATEGORIES = ['all', 'official', 'memes', 'facts', 'trends'];

const CATEGORY_BADGES = {
  official: 'ОФИЦИАЛЬНО',
  memes: 'МЕМ ДНЯ',
  facts: 'ИНТЕРЕСНЫЙ ФАКТ',
  trends: 'ТРЕНД РЫНКА',
};

const CATEGORY_CTAS = {
  official: 'Напишите - разберём, как это влияет на вашу сделку',
  memes: 'Сохраняй и делись с тем, кто сейчас ищет квартиру',
  facts: 'Хотите так же выгодно? Напишите в личные сообщения',
  trends: 'Подберём лучший вариант под текущие условия рынка',
};

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Заменяет длинные тире на дефис по правилам проекта (AGENTS.md).
 */
export function normalizeDashes(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[—–]/g, '-');
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;|&ndash;/g, '-')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html) {
  if (!html) return '';
  const decoded = decodeHtmlEntities(html);
  return normalizeDashes(
    decoded
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractTag(block, tagName) {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(re);
  return match ? match[1].trim() : '';
}

function extractImageFromBlock(block) {
  const mediaMatch = block.match(/<(?:media:content|enclosure)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch && mediaMatch[1]) return mediaMatch[1];
  const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  return '';
}

/**
 * Разбирает XML RSS-ленты в нормализованный массив новостей.
 */
export function parseRssXml(xml, defaultCategory = 'official', maxItems = 12) {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < itemMatches.length && items.length < maxItems; i++) {
    const block = itemMatches[i];
    const rawTitle = extractTag(block, 'title');
    const rawLink = extractTag(block, 'link');
    const rawDesc = extractTag(block, 'description');
    const rawPubDate = extractTag(block, 'pubDate');
    const rawSource = extractTag(block, 'source');

    let title = stripHtml(rawTitle);
    let source = stripHtml(rawSource);

    // Google News часто дописывает " - Источник" в конце заголовка
    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        const maybeSource = parts[parts.length - 1].trim();
        if (maybeSource.length > 1 && maybeSource.length < 45) {
          source = maybeSource;
          title = parts.slice(0, -1).join(' - ').trim();
        }
      }
    }

    const link = decodeHtmlEntities(rawLink).trim();
    let summary = stripHtml(rawDesc);
    if (summary && title && summary.startsWith(title)) {
      summary = summary.slice(title.length).replace(/^[\s\-:]+/, '').trim();
    }
    if (!summary || summary.length < 15) {
      summary = source
        ? `Актуальная публикация издания ${source} о ситуации на рынке недвижимости.`
        : 'Актуальная новость рынка недвижимости.';
    }
    if (summary.length > 260) {
      summary = `${summary.slice(0, 257).trim()}...`;
    }

    if (!title) continue;

    let publishedAt = new Date().toISOString();
    if (rawPubDate) {
      const parsedDate = new Date(rawPubDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    const imageUrl = extractImageFromBlock(block);
    const id = `rss_${hashString(`${title}_${link}`)}`;

    items.push({
      id,
      title,
      summary,
      category: defaultCategory,
      source: source || 'Новости недвижимости',
      publishedAt,
      url: link,
      imageUrl,
      storyPreset: buildStoryPreset({ title, summary, category: defaultCategory, source }),
    });
  }

  return items;
}

export function buildStoryPreset({ title, summary, category = 'official' }) {
  const safeTitle = normalizeDashes(title || 'Новости недвижимости');
  const safeSummary = normalizeDashes(summary || '');
  const badge = CATEGORY_BADGES[category] || CATEGORY_BADGES.official;
  const cta = CATEGORY_CTAS[category] || CATEGORY_CTAS.official;

  const headline = safeTitle.length > 90 ? `${safeTitle.slice(0, 87).trim()}...` : safeTitle;
  const shortSummary = safeSummary.length > 160 ? `${safeSummary.slice(0, 157).trim()}...` : safeSummary;

  const bulletsByCategory = {
    official: [
      'Что изменилось на рынке прямо сейчас',
      'Кому это выгодно при покупке или продаже',
      'На что обратить внимание перед сделкой',
    ],
    memes: [
      'Жизненно для каждого, кто искал квартиру',
      'А с риелтором всё проходит спокойнее',
    ],
    facts: [
      'Реальный факт из мира архитектуры и жилья',
      'Сохраняйте в подборку интересного',
    ],
    trends: [
      'Свежий ориентир для покупателей и продавцов',
      'Помогу применить тренд к вашей задаче',
    ],
  };

  return {
    badge,
    headline,
    summary: shortSummary,
    bullets: bulletsByCategory[category] || bulletsByCategory.official,
    cta,
  };
}

export function buildGoogleNewsRssUrl(query = '', category = 'all') {
  const cleanQuery = (query || '').trim();
  let searchExpr = 'недвижимость ИЛИ ипотека ИЛИ новостройки';

  if (cleanQuery) {
    searchExpr = `${cleanQuery} недвижимость`;
  } else if (category === 'official') {
    searchExpr = '(ипотека ИЛИ "ключевая ставка" ИЛИ новостройки ИЛИ жилье) недвижимость';
  } else if (category === 'facts') {
    searchExpr = '("интересные факты" ИЛИ необычные дома ИЛИ архитектура) недвижимость';
  } else if (category === 'trends') {
    searchExpr = '(тренды ИЛИ аналитика ИЛИ цены) недвижимость квартиры';
  } else if (category === 'memes') {
    searchExpr = '(мемы ИЛИ юмор ИЛИ курьезы) недвижимость ипотека';
  }

  const encoded = encodeURIComponent(searchExpr);
  return `https://news.google.com/rss/search?q=${encoded}&hl=ru&gl=RU&ceid=RU:ru`;
}

export const CURATED_NEWS_BANK = [
  {
    id: 'curated_official_1',
    title: 'На что смотреть в семейной ипотеке и субсидиях при выборе новостройки',
    summary: 'Застройщики комбинируют адресные скидки и траншевые программы. Перед бронью важно считать итоговую переплату по графику платежей, а не только первый взнос.',
    category: 'official',
    source: 'Аналитика рынка',
    publishedAt: '2026-11-26T08:30:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_official_2',
    title: 'Вторичный рынок: продавцы всё чаще готовы к предметному торгу при быстром выходе на сделку',
    summary: 'Покупатели с одобренной ипотекой или наличными получают дисконт 3-7%, если документы по квартире уже проверены заранее.',
    category: 'official',
    source: 'Обзор сделок',
    publishedAt: '2026-11-25T14:00:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_meme_1',
    title: 'Когда в объявлении написано "уютная студия с дизайнерским ремонтом", а на фото кровать на холодильнике',
    summary: 'Классика поиска жилья без фильтрации: 14 квадратных метров, но зато "вид на закат и всё под рукой - буквально".',
    category: 'memes',
    source: 'Риелторский юмор',
    publishedAt: '2026-11-26T09:15:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_meme_2',
    title: 'Покупатель: "Просто посмотрим 2 варианта". Проходит 4 часа: мы уже выбрали шторы в третьей квартире',
    summary: 'Лучшая примета удачного показа - когда клиент начинает расставлять диван и проверять, куда встанет ёлка.',
    category: 'memes',
    source: 'Будни агента',
    publishedAt: '2026-11-25T16:40:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_meme_3',
    title: 'Ожидание: куплю квартиру за неделю. Реальность: изучил СНиПы, серию дома и розу ветров во дворе',
    summary: 'Через три дня самостоятельного поиска каждый покупатель становится экспертом по монолиту, шумоизоляции и управляющим компаниям.',
    category: 'memes',
    source: 'Юмор ипотеки',
    publishedAt: '2026-11-24T12:00:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_fact_1',
    title: 'Почему в старинных домах делали потолки от 3,5 метров: не только ради статуса, но и ради воздуха',
    summary: 'До эпохи принудительной вентиляции высокий потолок обеспечивал естественную циркуляцию воздуха и снижал духоту в комнатах с печным отоплением.',
    category: 'facts',
    source: 'Факты об архитектуре',
    publishedAt: '2026-11-25T10:20:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_fact_2',
    title: 'Угловые квартиры в современных ЖК часто теплее обычных: секрет в двойном контуре утепления фасада',
    summary: 'Миф о "холодном угле" остался в панельных домах прошлых десятилетий. В новых проектах угловые секции ценят за два окна и свет в комнате.',
    category: 'facts',
    source: 'Факты о домах',
    publishedAt: '2026-11-24T15:10:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_trend_1',
    title: 'Европланировки и мастер-спальни обгоняют по спросу классические двушки и трёшки',
    summary: 'Покупатели всё чаще выбирают большую кухню-гостиную 18-22 кв.м и компактные спальни вместо длинных коридоров.',
    category: 'trends',
    source: 'Тренды спроса',
    publishedAt: '2026-11-26T07:45:00.000Z',
    url: '',
    imageUrl: '',
  },
  {
    id: 'curated_trend_2',
    title: 'Двор без машин и кладовая на этаже стали главными аргументами при выборе семейной квартиры',
    summary: 'Покупатели готовы доплачивать за безопасность во дворе и хранение колясок и велосипедов вне квартиры.',
    category: 'trends',
    source: 'Тренды ЖК',
    publishedAt: '2026-11-23T11:30:00.000Z',
    url: '',
    imageUrl: '',
  },
].map(item => ({
  ...item,
  storyPreset: buildStoryPreset(item),
}));

export const DEFAULT_TG_CHANNELS = [
  'domclick',
  'cian_official',
  'ria_realty',
  'realty_rbc',
  'ipotekahouse',
  'novostroyrf',
];

function classifyPostCategory(text = '', defaultCategory = 'official') {
  const t = text.toLowerCase();
  if (/(мем|юмор|шутк|анекдот|смешн|жиза|улыбн|прикол)/.test(t)) return 'memes';
  if (/(факт|знаете ли|почему в|интересн|история|архитектур|необычн|рекорд)/.test(t)) return 'facts';
  if (/(тренд|спрос|исследован|аналитик|прогноз|статистик|рейтинг|вырос|снизил)/.test(t)) return 'trends';
  return defaultCategory === 'all' ? 'official' : defaultCategory;
}

/**
 * Извлекает имя Telegram-канала, если пользователь ввёл @channel или t.me/channel.
 */
export function extractTelegramChannelFromQuery(query = '') {
  const q = String(query || '').trim();
  const atMatch = q.match(/^@([a-zA-Z0-9_]{4,32})$/);
  if (atMatch) return atMatch[1];
  const urlMatch = q.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/(?:s\/)?([a-zA-Z0-9_]{4,32})/i);
  if (urlMatch) return urlMatch[1];
  return '';
}

/**
 * Разбирает HTML публичной веб-страницы Telegram-канала (https://t.me/s/<channel>).
 */
export function parseTelegramChannelHtml(html, channelUsername, maxItems = 10) {
  if (!html || typeof html !== 'string') return [];

  const headerMatch = html.match(/<div class="tgme_channel_info_header_title"><span[^>]*>([\s\S]*?)<\/span>/i);
  const channelTitle = headerMatch ? stripHtml(headerMatch[1]) : `@${channelUsername}`;

  const blocks = html.split(/<div class="tgme_widget_message_wrap\b/);
  const items = [];

  for (let i = blocks.length - 1; i >= 1 && items.length < maxItems; i--) {
    const block = blocks[i];
    const postMatch = block.match(/data-post=["']([^"']+)["']/i);
    if (!postMatch) continue;
    const postRef = postMatch[1];
    const postUrl = `https://t.me/${postRef}`;

    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!textMatch) continue;

    // Превращаем <br> в переносы строк для аккуратного выделения заголовка
    const rawWithBreaks = textMatch[1].replace(/<br\s*\/?>/gi, '\n');
    const cleanText = normalizeDashes(
      decodeHtmlEntities(rawWithBreaks)
        .replace(/<[^>]+>/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .trim()
    );

    if (!cleanText || cleanText.length < 25) continue;

    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || cleanText;
    let summary = lines.slice(1).join(' ').trim();

    if (title.length > 95) {
      const sentenceEnd = title.slice(0, 95).search(/[.!?]\s/);
      if (sentenceEnd > 25) {
        const rest = title.slice(sentenceEnd + 1).trim();
        title = title.slice(0, sentenceEnd + 1).trim();
        summary = summary ? `${rest} ${summary}` : rest;
      } else {
        const rest = title.slice(92).trim();
        title = `${title.slice(0, 92).trim()}...`;
        summary = summary ? `${rest} ${summary}` : rest;
      }
    }

    if (!summary || summary.length < 15) {
      summary = cleanText.length > title.length ? cleanText : `Публикация канала ${channelTitle}`;
    }
    if (summary.length > 260) {
      summary = `${summary.slice(0, 257).trim()}...`;
    }

    const photoMatch = block.match(/tgme_widget_message_photo_wrap[^>]+style=["'][^"']*background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
    const imageUrl = photoMatch && photoMatch[1] ? photoMatch[1] : '';

    const timeMatch = block.match(/<time[^>]+datetime=["']([^"']+)["']/i);
    let publishedAt = new Date().toISOString();
    if (timeMatch && timeMatch[1]) {
      const parsedDate = new Date(timeMatch[1]);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    const ownerMatch = block.match(/<a class="tgme_widget_message_owner_name"[^>]*><span[^>]*>([\s\S]*?)<\/span>/i);
    const source = ownerMatch ? stripHtml(ownerMatch[1]) : channelTitle;
    const category = classifyPostCategory(`${title} ${summary}`, 'official');

    items.push({
      id: `tg_${hashString(postUrl)}`,
      title,
      summary,
      category,
      source: source || `@${channelUsername}`,
      publishedAt,
      url: postUrl,
      imageUrl,
      storyPreset: buildStoryPreset({ title, summary, category, source }),
    });
  }

  return items;
}

async function fetchTelegramChannels(query = '', category = 'all', limit = 12) {
  const directChannel = extractTelegramChannelFromQuery(query);
  const channels = directChannel ? [directChannel] : DEFAULT_TG_CHANNELS;
  const searchQuery = directChannel ? '' : String(query || '').trim();

  const settled = await Promise.allSettled(
    channels.map(async (ch) => {
      const url = searchQuery
        ? `https://t.me/s/${encodeURIComponent(ch)}?q=${encodeURIComponent(searchQuery)}`
        : `https://t.me/s/${encodeURIComponent(ch)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return [];
      const html = await response.text();
      return parseTelegramChannelHtml(html, ch, directChannel ? limit : 5);
    })
  );

  const allItems = [];
  for (const res of settled) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allItems.push(...res.value);
    }
  }

  const filtered = allItems.filter(item => {
    if (category !== 'all' && category !== 'official') {
      return item.category === category;
    }
    return true;
  });

  // Сортируем: сначала посты с фото, затем по свежести
  filtered.sort((a, b) => {
    if (Boolean(b.imageUrl) !== Boolean(a.imageUrl)) {
      return b.imageUrl ? 1 : -1;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return filtered.slice(0, limit);
}

async function fetchRssItems(query, category, limit = 8) {
  const urls = [];
  if (!query && (category === 'all' || category === 'official' || category === 'trends')) {
    urls.push('https://realty.ria.ru/export/rss2/index.xml');
    urls.push('https://rssexport.rbc.ru/rbcnews/news/30/full.rss');
  }
  urls.push(buildGoogleNewsRssUrl(query, category));

  const settled = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchNewsBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(5500),
      });
      if (!response.ok) return [];
      const xml = await response.text();
      const parsed = parseRssXml(xml, category === 'all' ? 'official' : category, limit);
      if (url.includes('realty.ria.ru')) {
        return parsed.map(item => ({ ...item, source: 'РИА Недвижимость' }));
      }
      if (url.includes('rbc.ru')) {
        return parsed.map(item => ({ ...item, source: 'РБК' }));
      }
      return parsed;
    })
  );

  const results = [];
  for (const res of settled) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      results.push(...res.value);
    }
  }
  return results;
}

async function generateAiNewsItems({ query, category, count = 4, aiGenerateFn }) {
  if (!aiGenerateFn || count <= 0) return [];

  const catLabels = {
    all: 'официальные новости, мемы, интересные факты и тренды рынка недвижимости',
    official: 'официальные новости и аналитика рынка недвижимости, ипотеки, новостроек',
    memes: 'жизненные мемы, шутки и смешные ситуации про риелторов, ипотеку, просмотры квартир и аренду',
    facts: 'удивительные и малоизвестные факты о недвижимости, архитектуре, домах и ценах',
    trends: 'актуальные тренды недвижимости, планировок, дизайна и спроса покупателей',
  };

  const topicLine = query
    ? `Тема поиска пользователя: "${query}".`
    : 'Подбери самые актуальные и цепляющие темы.';

  const prompt = `Ты редактор медиа для риелторов. Сгенерируй ровно ${count} карточек контента в категории "${catLabels[category] || catLabels.all}".
${topicLine}

Правила:
1. Используй ТОЛЬКО обычный дефис "-", НИКОГДА не используй длинное тире "—" или "–".
2. Для категории "memes" (или смешанной выдачи) сделай короткие, остроумные жизненные мемы/ситуации, которые риелтор может сразу выложить в сторис.
3. Для "facts" - реальные интересные факты об архитектуре, жилье или сделках.
4. Для "official" и "trends" - конкретные, полезные тезисы без воды.
5. Верни ТОЛЬКО валидный JSON-массив без markdown-обёртки:
[
  {
    "title": "Яркий заголовок (до 90 символов)",
    "summary": "Короткая суть или панчлайн (1-2 предложения, до 200 символов)",
    "category": "official | memes | facts | trends",
    "source": "Название рубрики (например: Риелторский юмор, Факты о жилье, Аналитика)",
    "bullets": ["Тезис 1 (до 55 символов)", "Тезис 2 (до 55 символов)"],
    "cta": "Короткий призыв в сторис (до 55 символов)"
  }
]`;

  try {
    const raw = await aiGenerateFn(prompt);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(entry => entry && entry.title && entry.summary)
      .map((entry, idx) => {
        const itemCategory = NEWS_CATEGORIES.includes(entry.category) && entry.category !== 'all'
          ? entry.category
          : (category === 'all' ? 'trends' : category);
        const title = normalizeDashes(String(entry.title).trim());
        const summary = normalizeDashes(String(entry.summary).trim());
        const source = normalizeDashes(String(entry.source || 'AI-подборка').trim());
        const bullets = Array.isArray(entry.bullets)
          ? entry.bullets.slice(0, 3).map(b => normalizeDashes(String(b).trim())).filter(Boolean)
          : undefined;
        const cta = entry.cta ? normalizeDashes(String(entry.cta).trim()) : undefined;

        const basePreset = buildStoryPreset({ title, summary, category: itemCategory });
        return {
          id: `ai_${itemCategory}_${Date.now()}_${idx}`,
          title,
          summary,
          category: itemCategory,
          source,
          publishedAt: new Date().toISOString(),
          url: '',
          imageUrl: '',
          storyPreset: {
            ...basePreset,
            bullets: bullets && bullets.length > 0 ? bullets : basePreset.bullets,
            cta: cta || basePreset.cta,
          },
        };
      });
  } catch (err) {
    console.warn('[news-search] AI generation skipped:', err.message);
    return [];
  }
}

/**
 * Основная функция поиска новостей по недвижимости.
 */
export async function searchRealEstateNews({
  query = '',
  category = 'all',
  limit = 12,
  aiGenerateFn = null,
} = {}) {
  const safeCategory = NEWS_CATEGORIES.includes(category) ? category : 'all';
  const safeLimit = Math.min(20, Math.max(3, Number(limit) || 12));
  const cleanQuery = normalizeDashes(String(query || '').trim());

  let tgItems = [];
  let rssItems = [];
  let aiItems = [];

  const directChannel = extractTelegramChannelFromQuery(cleanQuery);

  // Параллельно опрашиваем публичные Telegram-каналы и живые RSS-ленты с фото
  const [tgRes, rssRes] = await Promise.allSettled([
    fetchTelegramChannels(cleanQuery, safeCategory, safeLimit),
    directChannel || safeCategory === 'memes'
      ? Promise.resolve([])
      : fetchRssItems(cleanQuery, safeCategory, safeLimit),
  ]);

  if (tgRes.status === 'fulfilled' && Array.isArray(tgRes.value)) {
    tgItems = tgRes.value;
  }
  if (rssRes.status === 'fulfilled' && Array.isArray(rssRes.value)) {
    rssItems = rssRes.value;
  }

  const liveCount = tgItems.length + rssItems.length;

  // Если живые первоисточники дали достаточно материалов - не разбавляем без нужды,
  // а для мемов или при нехватке результатов подключаем AI
  const needAiCount = directChannel
    ? 0
    : safeCategory === 'memes' && tgItems.length < 4
      ? Math.min(4, safeLimit - tgItems.length)
      : liveCount < 4
        ? Math.min(4, safeLimit - liveCount)
        : 0;

  if (needAiCount > 0 && aiGenerateFn) {
    aiItems = await generateAiNewsItems({
      query: cleanQuery,
      category: safeCategory,
      count: needAiCount,
      aiGenerateFn,
    });
  }

  // Объединяем с дедупликацией по заголовку, отдавая приоритет первоисточникам с фото и ссылкой
  const seenTitles = new Set();
  const merged = [];

  const pushUnique = (item) => {
    const key = item.title.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '').slice(0, 48);
    if (!key || seenTitles.has(key)) return;
    seenTitles.add(key);
    merged.push(item);
  };

  // Сначала первоисточники с фото, затем остальные первоисточники, затем AI
  const liveWithPhoto = [...tgItems, ...rssItems].filter(i => i.imageUrl);
  const liveWithoutPhoto = [...tgItems, ...rssItems].filter(i => !i.imageUrl);
  liveWithPhoto.forEach(pushUnique);
  liveWithoutPhoto.forEach(pushUnique);
  aiItems.forEach(pushUnique);

  // Детерминированный fallback из curated-базы, только если сеть и AI недоступны
  if (merged.length === 0) {
    const qLower = cleanQuery.toLowerCase();
    const curatedPool = CURATED_NEWS_BANK.filter(item => {
      const catOk = safeCategory === 'all' || item.category === safeCategory;
      if (!catOk) return false;
      if (!qLower) return true;
      return item.title.toLowerCase().includes(qLower) || item.summary.toLowerCase().includes(qLower);
    });
    const fallbackPool = curatedPool.length > 0
      ? curatedPool
      : CURATED_NEWS_BANK.filter(item => safeCategory === 'all' || item.category === safeCategory);

    fallbackPool.forEach(pushUnique);
  }

  const finalItems = merged.slice(0, safeLimit);
  let sourceMode = 'fallback';
  if (tgItems.length > 0 && rssItems.length > 0 && aiItems.length > 0) sourceMode = 'tg+rss+ai';
  else if (tgItems.length > 0 && rssItems.length > 0) sourceMode = 'tg+rss';
  else if (tgItems.length > 0 && aiItems.length > 0) sourceMode = 'tg+ai';
  else if (tgItems.length > 0) sourceMode = 'tg';
  else if (rssItems.length > 0 && aiItems.length > 0) sourceMode = 'rss+ai';
  else if (rssItems.length > 0) sourceMode = 'rss';
  else if (aiItems.length > 0) sourceMode = 'ai';

  return {
    items: finalItems,
    sourceMode,
    category: safeCategory,
    query: cleanQuery,
  };
}

/**
 * Адаптирует выбранную новость в формат 9:16 сторис (с AI и детерминированным fallback).
 */
export async function adaptNewsItemForStory({ item = {}, aiGenerateFn = null } = {}) {
  const category = NEWS_CATEGORIES.includes(item.category) && item.category !== 'all'
    ? item.category
    : 'official';
  const fallback = buildStoryPreset({
    title: item.title,
    summary: item.summary,
    category,
  });
  const fallbackCaption = normalizeDashes(
    `${fallback.headline}\n\n${fallback.summary}\n\n${fallback.cta}\n#недвижимость #новостинедвижимости #риелтор`
  );

  if (!aiGenerateFn || !item.title) {
    return { ...fallback, caption: fallbackCaption };
  }

  const prompt = `Адаптируй эту новость/мем по недвижимости для оформления в Instagram/VK/Telegram Сторис (9:16) от лица риелтора.
Заголовок: ${item.title}
Текст: ${item.summary || ''}
Категория: ${category}
Источник: ${item.source || ''}

Правила:
1. Используй ТОЛЬКО обычный дефис "-", НИКОГДА не используй длинное тире "—" или "–".
2. Сделай заголовок цепляющим и коротким (до 75 символов).
3. Суть - 1-2 ёмких предложения (до 150 символов).
4. 2-3 коротких буллита (до 48 символов каждый).
5. Верни ТОЛЬКО JSON:
{
  "badge": "Короткий бейдж капсом (до 20 символов)",
  "headline": "Цепляющий заголовок для сторис",
  "summary": "Короткая суть для карточки",
  "bullets": ["Пункт 1", "Пункт 2", "Пункт 3"],
  "cta": "Призыв к действию (до 50 символов)",
  "caption": "Готовый текст поста/сопровождения с 3 хэштегами"
}`;

  try {
    const raw = await aiGenerateFn(prompt);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      badge: normalizeDashes(String(parsed.badge || fallback.badge)).slice(0, 24),
      headline: normalizeDashes(String(parsed.headline || fallback.headline)).slice(0, 100),
      summary: normalizeDashes(String(parsed.summary || fallback.summary)).slice(0, 200),
      bullets: Array.isArray(parsed.bullets) && parsed.bullets.length > 0
        ? parsed.bullets.slice(0, 3).map(b => normalizeDashes(String(b))).filter(Boolean)
        : fallback.bullets,
      cta: normalizeDashes(String(parsed.cta || fallback.cta)).slice(0, 70),
      caption: normalizeDashes(String(parsed.caption || fallbackCaption)),
    };
  } catch (err) {
    console.warn('[news-search] adaptNewsItemForStory fallback:', err.message);
    return { ...fallback, caption: fallbackCaption };
  }
}
