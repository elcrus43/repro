import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Newspaper,
  Search,
  Sparkles,
  Laugh,
  Lightbulb,
  TrendingUp,
  Building2,
  ExternalLink,
  Bookmark,
  RefreshCw,
  Plus,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';
import { getToken } from '../../lib/neon';
import { useToastContext } from '../../components/Toast';
import { NewsStoryModal } from './NewsStoryModal';

const CATEGORIES = [
  { id: 'all', label: 'Все', icon: Layers },
  { id: 'official', label: 'Официальные', icon: Building2 },
  { id: 'memes', label: 'Мемы и юмор', icon: Laugh },
  { id: 'facts', label: 'Интересные факты', icon: Lightbulb },
  { id: 'trends', label: 'Тренды', icon: TrendingUp },
  { id: 'saved', label: 'Избранное', icon: Bookmark },
];

const QUICK_TOPICS = [
  'Ключевая ставка ЦБ',
  'Семейная ипотека',
  'Цены на новостройки',
  'Юмор риелтора',
  'Необычные дома',
  'Аренда жилья',
];

/* ─── Встроенная подборка: отображается при сбое API (до деплоя или оффлайн) ─── */
const BUILTIN_NEWS_BANK = [
  {
    id: 'builtin_off_1',
    title: 'На что смотреть в семейной ипотеке и субсидиях при выборе новостройки',
    summary: 'Застройщики комбинируют адресные скидки и траншевые программы. Перед бронью важно считать итоговую переплату по графику платежей, а не только первый взнос.',
    category: 'official',
    source: 'Аналитика рынка',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ОФИЦИАЛЬНО', headline: 'Семейная ипотека и субсидии - что изменилось', summary: 'Застройщики комбинируют скидки и траншевые программы.', bullets: ['Что изменилось на рынке прямо сейчас', 'Кому это выгодно при покупке или продаже', 'На что обратить внимание перед сделкой'], cta: 'Напишите - разберём, как это влияет на вашу сделку' },
  },
  {
    id: 'builtin_off_2',
    title: 'Вторичный рынок: продавцы всё чаще готовы к предметному торгу при быстром выходе на сделку',
    summary: 'Покупатели с одобренной ипотекой или наличными получают дисконт 3-7%, если документы по квартире уже проверены заранее.',
    category: 'official',
    source: 'Обзор сделок',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ОФИЦИАЛЬНО', headline: 'Торг на вторичке стал нормой', summary: 'Дисконт 3-7% при быстром выходе на сделку.', bullets: ['Что изменилось на рынке прямо сейчас', 'Кому это выгодно при покупке или продаже'], cta: 'Напишите - разберём, как это влияет на вашу сделку' },
  },
  {
    id: 'builtin_meme_1',
    title: 'Когда в объявлении написано "уютная студия с дизайнерским ремонтом", а на фото кровать на холодильнике',
    summary: 'Классика поиска жилья без фильтрации: 14 квадратных метров, но зато "вид на закат и всё под рукой - буквально".',
    category: 'memes',
    source: 'Риелторский юмор',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'МЕМ ДНЯ', headline: 'Уютная студия - вид на закат и всё под рукой', summary: '14 кв.м, но зато "дизайнерский ремонт".', bullets: ['Жизненно для каждого, кто искал квартиру', 'А с риелтором всё проходит спокойнее'], cta: 'Сохраняй и делись с тем, кто сейчас ищет квартиру' },
  },
  {
    id: 'builtin_meme_2',
    title: 'Покупатель: "Просто посмотрим 2 варианта". Проходит 4 часа: мы уже выбрали шторы в третьей квартире',
    summary: 'Лучшая примета удачного показа - когда клиент начинает расставлять диван и проверять, куда встанет ёлка.',
    category: 'memes',
    source: 'Будни агента',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'МЕМ ДНЯ', headline: '"Просто посмотрим" - а через 4 часа выбираем шторы', summary: 'Лучшая примета удачного показа - обсуждение мебели.', bullets: ['Жизненно для каждого, кто искал квартиру', 'А с риелтором всё проходит спокойнее'], cta: 'Сохраняй и делись с тем, кто сейчас ищет квартиру' },
  },
  {
    id: 'builtin_meme_3',
    title: 'Ожидание: куплю квартиру за неделю. Реальность: изучил СНиПы, серию дома и розу ветров во дворе',
    summary: 'Через три дня самостоятельного поиска каждый покупатель становится экспертом по монолиту, шумоизоляции и управляющим компаниям.',
    category: 'memes',
    source: 'Юмор ипотеки',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'МЕМ ДНЯ', headline: 'Куплю квартиру за неделю - а потом изучаю СНиПы', summary: 'Три дня поиска и ты уже эксперт по шумоизоляции.', bullets: ['Жизненно для каждого, кто искал квартиру', 'А с риелтором всё проходит спокойнее'], cta: 'Сохраняй и делись с тем, кто сейчас ищет квартиру' },
  },
  {
    id: 'builtin_fact_1',
    title: 'Почему в старинных домах делали потолки от 3,5 метров: не только ради статуса, но и ради воздуха',
    summary: 'До эпохи принудительной вентиляции высокий потолок обеспечивал естественную циркуляцию воздуха и снижал духоту в комнатах с печным отоплением.',
    category: 'facts',
    source: 'Факты об архитектуре',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ИНТЕРЕСНЫЙ ФАКТ', headline: 'Потолки 3,5 метра - не статус, а вентиляция', summary: 'Высокий потолок обеспечивал циркуляцию воздуха.', bullets: ['Реальный факт из мира архитектуры и жилья', 'Сохраняйте в подборку интересного'], cta: 'Хотите так же выгодно? Напишите в личные сообщения' },
  },
  {
    id: 'builtin_fact_2',
    title: 'Угловые квартиры в современных ЖК часто теплее обычных: секрет в двойном контуре утепления фасада',
    summary: 'Миф о "холодном угле" остался в панельных домах прошлых десятилетий. В новых проектах угловые секции ценят за два окна и свет в комнате.',
    category: 'facts',
    source: 'Факты о домах',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ИНТЕРЕСНЫЙ ФАКТ', headline: 'Угловая квартира - теплее, чем вы думаете', summary: 'Миф о холодном угле остался в панельных домах.', bullets: ['Реальный факт из мира архитектуры и жилья', 'Сохраняйте в подборку интересного'], cta: 'Хотите так же выгодно? Напишите в личные сообщения' },
  },
  {
    id: 'builtin_trend_1',
    title: 'Европланировки и мастер-спальни обгоняют по спросу классические двушки и трёшки',
    summary: 'Покупатели всё чаще выбирают большую кухню-гостиную 18-22 кв.м и компактные спальни вместо длинных коридоров.',
    category: 'trends',
    source: 'Тренды спроса',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ТРЕНД РЫНКА', headline: 'Европланировки побеждают классические двушки', summary: 'Кухня-гостиная 18-22 кв.м вместо длинных коридоров.', bullets: ['Свежий ориентир для покупателей и продавцов', 'Помогу применить тренд к вашей задаче'], cta: 'Подберём лучший вариант под текущие условия рынка' },
  },
  {
    id: 'builtin_trend_2',
    title: 'Двор без машин и кладовая на этаже стали главными аргументами при выборе семейной квартиры',
    summary: 'Покупатели готовы доплачивать за безопасность во дворе и хранение колясок и велосипедов вне квартиры.',
    category: 'trends',
    source: 'Тренды ЖК',
    publishedAt: new Date().toISOString(),
    url: '',
    imageUrl: '',
    storyPreset: { badge: 'ТРЕНД РЫНКА', headline: 'Двор без машин и кладовая - топ при выборе ЖК', summary: 'Безопасный двор и хранение вне квартиры в приоритете.', bullets: ['Свежий ориентир для покупателей и продавцов', 'Помогу применить тренд к вашей задаче'], cta: 'Подберём лучший вариант под текущие условия рынка' },
  },
];

function getBuiltinItems(category, query) {
  const qLower = (query || '').toLowerCase();
  return BUILTIN_NEWS_BANK.filter(item => {
    const catOk = category === 'all' || item.category === category;
    if (!catOk) return false;
    if (!qLower) return true;
    return item.title.toLowerCase().includes(qLower) || item.summary.toLowerCase().includes(qLower);
  });
}

const CATEGORY_META = {
  official: { label: 'Официально', color: '#0052FF', bg: 'rgba(0, 82, 255, 0.1)' },
  memes: { label: 'Мем дня', color: '#d97706', bg: 'rgba(245, 158, 11, 0.14)' },
  facts: { label: 'Факт', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  trends: { label: 'Тренд', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
};

const SOURCE_MODE_LABELS = {
  'tg+rss+ai': 'Telegram + СМИ + AI',
  'tg+rss': 'Telegram-каналы + СМИ (первоисточники)',
  'tg+ai': 'Telegram-каналы + AI',
  tg: 'Telegram-каналы (первоисточники)',
  'rss+ai': 'СМИ + AI',
  rss: 'Лента СМИ (первоисточники)',
  ai: 'AI-подборка',
  fallback: 'Подборка редакции',
  builtin: 'Встроенная подборка',
};

const LS_FAVORITES_KEY = 'rem_news_favorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

function formatNewsDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function NewsPage() {
  const { showToast } = useToastContext();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [items, setItems] = useState([]);
  const [sourceMode, setSourceMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [storyItem, setStoryItem] = useState(null);

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  const fetchNews = useCallback(async (searchQuery, category) => {
    if (category === 'saved') return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await apiFetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'searchNews',
          query: searchQuery,
          category,
          limit: 12,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка сервера (${res.status})`);
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setSourceMode(data.sourceMode || '');
    } catch (err) {
      console.warn('[NewsPage] API error, using builtin fallback:', err.message);
      // Клиентский fallback: показываем встроенную подборку при сбое API
      const fallbackItems = getBuiltinItems(category, searchQuery);
      setItems(fallbackItems);
      setSourceMode('builtin');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNews('', 'all');
  }, [fetchNews]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const targetCat = activeCategory === 'saved' ? 'all' : activeCategory;
    if (activeCategory === 'saved') setActiveCategory('all');
    fetchNews(query, targetCat);
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    if (catId !== 'saved') {
      fetchNews(query, catId);
    }
  };

  const handleQuickTopic = (topic) => {
    setQuery(topic);
    const targetCat = activeCategory === 'saved' ? 'all' : activeCategory;
    if (activeCategory === 'saved') setActiveCategory('all');
    fetchNews(topic, targetCat);
  };

  const toggleFavorite = (item) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id);
      const next = exists ? prev.filter(f => f.id !== item.id) : [item, ...prev];
      saveFavorites(next);
      return next;
    });
  };

  const handleCustomStory = () => {
    setStoryItem({
      id: `custom_${Date.now()}`,
      title: query.trim() || 'Важная новость рынка недвижимости',
      summary: 'Короткий комментарий эксперта: на что обратить внимание покупателям и продавцам прямо сейчас.',
      category: activeCategory === 'memes' ? 'memes' : 'official',
      source: 'Личный блог риелтора',
      publishedAt: new Date().toISOString(),
      storyPreset: {
        badge: activeCategory === 'memes' ? 'МЕМ ДНЯ' : 'МНЕНИЕ ЭКСПЕРТА',
        headline: query.trim() || 'Важная новость рынка недвижимости',
        summary: 'Короткий комментарий эксперта: на что обратить внимание покупателям и продавцам прямо сейчас.',
        bullets: ['Что это значит для рынка', 'Как действовать выгодно'],
        cta: 'Напишите в ЛС - разберём вашу задачу',
      },
    });
  };

  const visibleItems = activeCategory === 'saved' ? favorites : items;

  return (
    <div className="page-container" style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 96 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(0, 82, 255, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Newspaper size={21} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                Новости недвижимости
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Официальные новости, мемы, интересные факты и оформление в сторис 9:16
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCustomStory}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Своя сторис
        </button>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={17}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            className="form-input"
            placeholder="Поиск по темам, ипотеке или @канал (например @domclick)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 40, width: '100%' }}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' }}
        >
          {loading ? <RefreshCw size={15} className="spin" /> : <Search size={15} />}
          {loading ? 'Ищем...' : 'Найти'}
        </button>
      </form>

      {/* Quick Topics */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {QUICK_TOPICS.map(topic => (
          <button
            key={topic}
            type="button"
            onClick={() => handleQuickTopic(topic)}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: query === topic ? 'rgba(0, 82, 255, 0.1)' : 'var(--surface)',
              color: query === topic ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon size={15} />
                {cat.label}
                {cat.id === 'saved' && favorites.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: active ? 'rgba(255,255,255,0.22)' : 'var(--bg)',
                    }}
                  >
                    {favorites.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {sourceMode && activeCategory !== 'saved' && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Источник: {SOURCE_MODE_LABELS[sourceMode] || sourceMode}
          </span>
        )}
      </div>

      {/* Content Grid */}
      {loading && visibleItems.length === 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className="card"
              style={{ height: 210, opacity: 0.55, padding: 18 }}
            >
              <div style={{ width: '40%', height: 14, borderRadius: 6, background: 'var(--border)', marginBottom: 14 }} />
              <div style={{ width: '90%', height: 20, borderRadius: 6, background: 'var(--border)', marginBottom: 10 }} />
              <div style={{ width: '75%', height: 14, borderRadius: 6, background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <Newspaper size={34} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--text)' }}>
            {activeCategory === 'saved' ? 'В избранном пока пусто' : 'Ничего не найдено'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {activeCategory === 'saved'
              ? 'Сохраняйте интересные новости и мемы кнопкой закладки на карточке.'
              : 'Попробуйте изменить поисковый запрос или выбрать другую категорию.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: 16,
          }}
        >
          {visibleItems.map(item => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.official;
            const isSaved = favoriteIds.has(item.id);
            const dateStr = formatNewsDate(item.publishedAt);

            return (
              <article
                key={item.id}
                className="card"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  borderRadius: 16,
                }}
              >
                <div>
                  {item.imageUrl && (
                    <div
                      style={{
                        margin: '-18px -18px 14px -18px',
                        height: 176,
                        overflow: 'hidden',
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        background: 'var(--bg)',
                      }}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.parentElement.style.display = 'none';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: meta.bg,
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {[item.source, dateStr].filter(Boolean).join(' • ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item)}
                        aria-label={isSaved ? 'Убрать из избранного' : 'Сохранить в избранное'}
                        title={isSaved ? 'Убрать из избранного' : 'Сохранить'}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: isSaved ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg)',
                          color: isSaved ? 'var(--primary)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontSize: 16,
                      fontWeight: 800,
                      lineHeight: 1.35,
                      color: 'var(--text)',
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.summary}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setStoryItem(item)}
                    style={{
                      fontSize: 13,
                      padding: '8px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={15} /> Оформить в сторис
                  </button>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        fontSize: 12,
                        padding: '8px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} /> Источник
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {storyItem && (
        <NewsStoryModal
          item={storyItem}
          onClose={() => setStoryItem(null)}
        />
      )}
    </div>
  );
}
