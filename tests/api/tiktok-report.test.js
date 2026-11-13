/**
 * tests/api/tiktok-report.test.js
 *
 * Проверки разбора сторонних TikTok-трекеров и сборки хука.
 * Фикстуры - слепки реальной вёрстки: парсеры завязаны на классы и React-комментарии,
 * поэтому переезд любого источника должен падать тестом, а не молча присылать пустой дайджест.
 */

import { describe, it, expect } from 'vitest';
import {
  collectTiktokReport,
  buildTelegramMessage,
  buildMarkdownReport,
  fetchVideoHook,
  __internals,
} from '../../api/_tiktok-report.js';

const { parseGainers, parseRegions, parseNicheWeekly, parseNicheMonthly, parseSounds, extractHook, classifyHook } =
  __internals;

const GAINERS_FIXTURE = `
<h2>Gaining views right now</h2>
<ul>
<li class="min-w-0"><article><a href="https://www.tiktok.com/@thezachchoi/video/7706826501584391455"><img src="x.png"><span>+3.2M views in 24h</span></a>
<div><span class="truncate text-xs font-medium text-white/85">@<!-- -->thezachchoi</span>
<p class="line-clamp-2 text-[12.5px] leading-snug text-white/60">Chicken Parmesan 🧀🍗 Prep: 10m | Cook: 10m</p>
<div class="mt-auto flex flex-nowrap items-center"><span class="inline-flex"><svg viewBox="0 0 24 24"><path d="M1 12"/></svg>4.3M</span><span class="inline-flex"><svg viewBox="0 0 24 24"><path d="M20 4"/></svg>420K</span><span>2d ago</span></div></div></article></li>
<li class="min-w-0"><article><a href="https://www.tiktok.com/@aliaandmere/video/7707133448699399437"><span>+857K views in 24h</span></a>
<div><span class="truncate text-xs font-medium text-white/85">@<!-- -->aliaandmere</span>
<p class="line-clamp-2 text-[12.5px] leading-snug text-white/60">your friends mom who makes you feel unwelcome 😂 #skit #funny #pov</p>
<div class="mt-auto flex flex-nowrap items-center"><span class="inline-flex"><svg viewBox="0 0 24 24"><path d="M1 12"/></svg>749K</span><span class="inline-flex"><svg viewBox="0 0 24 24"><path d="M20 4"/></svg>128K</span><span>1d ago</span></div></div></article></li>
</ul>
<h2>Trending sounds</h2><ol>
<li class="flex items-center gap-3"><span class="w-6 shrink-0 text-center font-euclid text-lg tabular-nums text-secondary">1</span>
<span class="min-w-0 flex-1"><span class="truncate text-[15px] font-medium text-white">Nicole Kidman Official Instrumental</span>
<span class="block truncate text-[12px] text-white/50">Dan Swift Del Rey · <!-- -->3<!-- --> posts · <!-- -->3<!-- --> creators</span></span></li>
</ol>
<h2>Categories gaining views</h2>
<h2>Trending hashtags</h2>`;

const REGIONS_FIXTURE = `
<h2>This week</h2><ol>
<li class="border-b border-line pl-1"><a href="/tools/moments/us/2026-11-09/one-piece-fortnite-token">
<div class="min-w-0"><p class="font-serif text-xl font-semibold text-ink">One Piece Fortnite</p>
<p class="mt-1 text-sm text-ink">Crossover mini-season.</p>
<p class="mt-2 text-sm text-muted">111M<!-- --> views · <!-- -->🇺🇸 USA</p></div></a></li>
<li class="border-b border-line pl-1"><a href="/tools/moments/asia/2026-11-11/remarried-empress-2026">
<div class="min-w-0"><p class="font-serif text-xl font-semibold text-ink">The Remarried Empress</p>
<p class="mt-2 text-sm text-muted">44.3M<!-- --> views · <!-- -->🌏 Asia</p></div></a></li>
</ol><h2>Earlier</h2>`;

const NICHE_WEEKLY_FIXTURE = `
<h2>Open trends</h2>
<article id="urgent-real-estate-sales-pitch">
<h3 class="text-lg"><a href="#urgent-real-estate-sales-pitch">Urgent real estate sales pitch</a></h3>
<p class="mt-2 text-sm text-deep-slate"><span class="font-semibold">Fading</span><span> since Nov 12, 2026</span></p>
<ul><li>4 creators</li><li>6 videos</li><li>best video <span class="font-semibold">7.9<!-- -->x</span> views ÷ followers</li></ul>
<a href="https://www.tiktok.com/@/video/7703105293147770120">Watch on TikTok</a>
</article>`;

const NICHE_MONTHLY_FIXTURE = `<table>
<tr><th>Creator</th></tr>
<tr><td>1</td><td><a href="https://www.tiktok.com/@kalee_rogers/video/7694052345994349837">@kalee_rogers</a></td><td title="9,800,000 views">9.8M</td><td>1.1M</td><td>9.1x</td><td>14.9%</td></tr>
<tr><td>2</td><td><a href="https://www.tiktok.com/@phillysparks/video/7692160284240235806">@phillysparks</a></td><td title="4,999,297 views">5.0M</td><td>2.0K</td><td>2,477x</td><td>7.5%</td></tr>
</table>`;

function fixtureLoader() {
  const map = {
    [__internals.SOURCES.gainers]: GAINERS_FIXTURE,
    [__internals.SOURCES.regions]: REGIONS_FIXTURE,
    [__internals.SOURCES.nicheWeekly]: NICHE_WEEKLY_FIXTURE,
    [__internals.SOURCES.nicheMonthly]: NICHE_MONTHLY_FIXTURE,
  };
  return async (url) => {
    if (map[url]) return map[url];
    throw new Error(`нет фикстуры для ${url}`);
  };
}

describe('парсеры по слепку вёрстки', () => {
  it('читает прирост за сутки, всего просмотров и возраст', () => {
    const items = parseGainers(GAINERS_FIXTURE);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      author: 'thezachchoi',
      gained: 3_200_000,
      gainedLabel: '+3.2M',
      views: 4_300_000,
      likes: 420_000,
      ageHours: 48,
    });
    expect(items[0].url).toContain('/video/7706826501584391455');
  });

  it('сортирует по приросту, а не по общему объёму', () => {
    const items = parseGainers(GAINERS_FIXTURE);
    expect(items[0].gained).toBeGreaterThan(items[1].gained);
  });

  it('не падает на пустом разборе', () => {
    expect(parseGainers('<html>нет секции</html>')).toEqual([]);
  });

  it('вытаскивает звуковый хук', () => {
    const sounds = parseSounds(GAINERS_FIXTURE);
    expect(sounds[0].title).toBe('Nicole Kidman Official Instrumental');
    expect(sounds[0].meta).toContain('3 creators');
  });

  it('читает регионы, тренд ниши и месячный топ', () => {
    expect(parseRegions(REGIONS_FIXTURE)[0]).toEqual({ title: 'One Piece Fortnite', views: '111M', geo: '🇺🇸 США' });
    const [trend] = parseNicheWeekly(NICHE_WEEKLY_FIXTURE);
    expect(trend).toMatchObject({ creators: '4', videos: '6', multiplier: '7.9x' });
    const monthly = parseNicheMonthly(NICHE_MONTHLY_FIXTURE);
    expect(monthly[1]).toMatchObject({ creator: '@phillysparks', views: 4_999_297, multiplier: '2,477x' });
  });
});

describe('хук', () => {
  it('берёт первую строку подписи и режет хештеги', () => {
    expect(extractHook('your friends mom who makes you feel unwelcome 😂 #skit #funny #pov')).toBe(
      'your friends mom who makes you feel unwelcome 😂'
    );
  });

  it('определяет скелет хука', () => {
    expect(classifyHook('how to get to your car in the hood').type).toBe('instruction');
    expect(classifyHook('your friends mom who makes you feel unwelcome').type).toBe('statement');
    expect(classifyHook('DO NOT miss my next stream!').type).toBe('negation');
  });
});

/** Слепок страницы TikTok: данные ролика лежат в JSON внутри script#__UNIVERSAL_DATA_FOR_REHYDRATION__. */
function tiktokPage(desc, extra = {}) {
  const payload = {
    __DEFAULT_SCOPE__: {
      'webapp.video-detail': {
        statusCode: 0,
        itemInfo: {
          itemStruct: {
            desc,
            author: { uniqueId: extra.author || 'phillysparks' },
            stats: { diggCount: extra.likes || 300000 },
          },
        },
      },
    },
  };
  return `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(payload)}</script>`;
}

function tiktokBlockedPage() {
  const payload = {
    __DEFAULT_SCOPE__: { 'webapp.video-detail': { statusCode: 10204, statusMsg: 'ru_cross_border_block' } },
  };
  return `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(payload)}</script>`;
}

describe('fetchVideoHook', () => {
  it('не притворяется данными, когда TikTok режет IP', async () => {
    const res = await fetchVideoHook('https://www.tiktok.com/@phillysparks/video/7692160284240235806', async () => tiktokBlockedPage());

    expect(res).toMatchObject({ blocked: true, reason: 'TikTok блокирует этот IP' });
  });

  it('читает хук из подписи ролика, когда страница доступна', async () => {
    const res = await fetchVideoHook('https://www.tiktok.com/@phillysparks/video/7692160284240235806', async () =>
      tiktokPage('The finished flip headache "no more" #realestate')
    );

    expect(res.blocked).toBe(false);
    expect(res.hook).toBe('The finished flip headache "no more"');
    expect(res.author).toBe('phillysparks');
    expect(res.skeleton.label).toBeTruthy();
  });

  it('молча пропускает не-тиктоковые ссылки', async () => {
    expect(await fetchVideoHook('https://fypnow.com/blog', async () => '')).toBeNull();
  });

  it('не падает, если JSON повреждён', async () => {
    const res = await fetchVideoHook('https://www.tiktok.com/@x/video/1', async () =>
      '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{битый'
    );
    expect(res).toMatchObject({ blocked: true });
  });
});

describe('collectTiktokReport', () => {
  it('строит хук дня и варианты под падежи боли ниши', async () => {
    const report = await collectTiktokReport({ fetchImpl: fixtureLoader(), now: new Date('2026-11-13T12:00:00Z') });

    expect(report.top.hook).toBe('Chicken Parmesan 🧀🍗 Prep: 10m');
    expect(report.hookPlan.skeletonLabel).toBe('инструкция');
    expect(report.hookPlan.variants).toHaveLength(3);
    expect(report.hookPlan.variants[0]).toBe('срочная продажа: 3 ошибки, из-за которых клиент уходит к другому');
    expect(report.hookPlan.variants[1]).toContain('в срочной продаже');
    expect(report.hookPlan.post.startsWith(report.hookPlan.variants[0])).toBe(true);
    expect(report.hookPlan.meta).toContain('Мета для Статейника');
    expect(report.hookPlan.sound.title).toBe('Nicole Kidman Official Instrumental');
    expect(report.outlier.creator).toBe('@phillysparks');
  });

  it('не остаётся без хука, когда источник недоступен', async () => {
    const report = await collectTiktokReport({
      fetchImpl: async () => {
        throw new Error('HTTP 503');
      },
    });

    expect(report.errors).toHaveLength(4);
    expect(report.top).toBeNull();
    expect(report.hookPlan.variants.length).toBeGreaterThan(0);
    expect(buildTelegramMessage(report).join('\n')).toContain('HTTP 503');
  });

  it('предпочитает прямой хук нишевого ролика, если TikTok его отдаёт', async () => {
    const report = await collectTiktokReport({
      fetchImpl: fixtureLoader(),
      fetchVideo: async () => tiktokPage('Why does this house sit on the market? #realestate'),
    });

    expect(report.hookPlan.sourceKind).toBe('хук из ниши');
    expect(report.hookPlan.skeletonLabel).toBe('вопрос');
    expect(report.hookPlan.variants.some((v) => v.includes('?'))).toBe(true);
  });

  it('честно пишет про блокировку TikTok по IP', async () => {
    const report = await collectTiktokReport({
      fetchImpl: fixtureLoader(),
      fetchVideo: async () => tiktokBlockedPage(),
    });

    expect(report.errors.join(' ')).toContain('TikTok блокирует этот IP');
    expect(report.hookPlan.sourceKind).toBe('глобальный хук');
  });
});

describe('форматывание', () => {
  it('укладывается в лимит Telegram и экранирует разметку', async () => {
    const report = await collectTiktokReport({ fetchImpl: fixtureLoader() });
    const chunks = buildTelegramMessage(report);

    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(4096));
    const all = chunks.join('\n');
    expect(all).toContain('Хук дня');
    expect(all).toContain('2 477x');
    expect(all).toContain('🎯');
  });

  it('пишет markdown с хуками и постом', async () => {
    const report = await collectTiktokReport({ fetchImpl: fixtureLoader() });
    const md = buildMarkdownReport(report);

    expect(md).toContain('## Хук дня');
    expect(md).toContain('### Готовые хуки под нишу риелтора');
    expect(md).toContain('## Пост для Статейника');
    expect(md).not.toContain('U+FFFD');
  });
});
