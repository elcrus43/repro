import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseRssXml,
  parseTelegramChannelHtml,
  extractTelegramChannelFromQuery,
  normalizeDashes,
  buildStoryPreset,
  searchRealEstateNews,
  adaptNewsItemForStory,
} from '../api/_news-search.js';

describe('api/_news-search', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes em-dashes and en-dashes to hyphens', () => {
    expect(normalizeDashes('Ипотека — это просто – факт')).toBe('Ипотека - это просто - факт');
  });

  it('parses RSS XML, strips HTML, extracts source and normalizes dashes', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title><![CDATA[Семейная ипотека — новые лимиты в 2026 году - РБК Недвижимость]]></title>
            <link>https://example.com/news/1</link>
            <description><![CDATA[<p>Банки обновили условия &mdash; ставка сохраняется.</p>]]></description>
            <pubDate>Thu, 26 Nov 2026 09:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`;

    const items = parseRssXml(sampleXml, 'official', 5);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Семейная ипотека - новые лимиты в 2026 году');
    expect(items[0].source).toBe('РБК Недвижимость');
    expect(items[0].summary).toBe('Банки обновили условия - ставка сохраняется.');
    expect(items[0].url).toBe('https://example.com/news/1');
    expect(items[0].storyPreset.badge).toBe('ОФИЦИАЛЬНО');
  });

  it('builds story preset with category badge and bullets', () => {
    const preset = buildStoryPreset({
      title: 'Мем про студию',
      summary: 'Кровать прямо на балконе',
      category: 'memes',
    });
    expect(preset.badge).toBe('МЕМ ДНЯ');
    expect(preset.bullets.length).toBeGreaterThan(0);
    expect(preset.cta).toBeTruthy();
  });

  it('returns curated fallback items when RSS and AI fail', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const aiMock = vi.fn().mockRejectedValue(new Error('ai quota'));

    const res = await searchRealEstateNews({
      query: '',
      category: 'memes',
      limit: 6,
      aiGenerateFn: aiMock,
    });

    expect(res.sourceMode).toBe('fallback');
    expect(res.items.length).toBeGreaterThanOrEqual(3);
    expect(res.items.every(i => i.category === 'memes')).toBe(true);
    expect(res.items.every(i => !i.title.includes('—') && !i.summary.includes('—'))).toBe(true);
  });

  it('merges AI items for memes category', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no rss'));
    const aiMock = vi.fn().mockResolvedValue(JSON.stringify([
      {
        title: 'Когда клиент просит "тихий центр" по цене окраины — классика',
        summary: 'И чтобы с панорамным видом на парк.',
        category: 'memes',
        source: 'Риелторский юмор',
        bullets: ['Реальность рынка', 'Подберём лучший компромисс'],
        cta: 'Напишите в ЛС',
      },
    ]));

    const res = await searchRealEstateNews({
      query: 'тихий центр',
      category: 'memes',
      limit: 6,
      aiGenerateFn: aiMock,
    });

    expect(res.sourceMode).toBe('ai');
    expect(res.items[0].title).toBe('Когда клиент просит "тихий центр" по цене окраины - классика');
    expect(res.items[0].storyPreset.cta).toBe('Напишите в ЛС');
  });

  it('adapts news item for story with AI and falls back gracefully', async () => {
    const aiMock = vi.fn().mockRejectedValue(new Error('offline'));
    const adapted = await adaptNewsItemForStory({
      item: { title: 'Ставка ЦБ — разбор', summary: 'Что будет с ипотекой', category: 'official' },
      aiGenerateFn: aiMock,
    });

    expect(adapted.headline).toBe('Ставка ЦБ - разбор');
    expect(adapted.badge).toBe('ОФИЦИАЛЬНО');
    expect(adapted.caption).toContain('#недвижимость');
    expect(adapted.caption).not.toContain('—');
  });

  it('extracts telegram channel username from @handle or t.me url', () => {
    expect(extractTelegramChannelFromQuery('@domclick')).toBe('domclick');
    expect(extractTelegramChannelFromQuery('https://t.me/s/cian_official')).toBe('cian_official');
    expect(extractTelegramChannelFromQuery('ипотека ставки')).toBe('');
  });

  it('parses public telegram channel HTML with photo and direct post url', () => {
    const sampleHtml = `
      <div class="tgme_channel_info_header_title"><span>Домклик</span></div>
      <div class="tgme_widget_message_wrap">
        <div class="tgme_widget_message" data-post="domclick/9769">
          <a class="tgme_widget_message_owner_name" href="https://t.me/domclick"><span>Домклик</span></a>
          <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/photo.jpg')"></a>
          <div class="tgme_widget_message_text">Льготная аренда жилья — новые условия<br/><br/>Подробности программы для молодых семей и расчёты платежей.</div>
          <time datetime="2026-11-26T10:00:00+00:00"></time>
        </div>
      </div>
    `;

    const items = parseTelegramChannelHtml(sampleHtml, 'domclick', 5);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Льготная аренда жилья - новые условия');
    expect(items[0].source).toBe('Домклик');
    expect(items[0].url).toBe('https://t.me/domclick/9769');
    expect(items[0].imageUrl).toBe('https://cdn4.telesco.pe/file/photo.jpg');
    expect(items[0].title).not.toContain('—');
  });
});
