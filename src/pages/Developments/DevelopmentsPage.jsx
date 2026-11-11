import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  SlidersHorizontal, 
  X, 
  Plus, 
  Columns2, 
  LayoutGrid, 
  Map as MapIcon, 
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { 
  getStoredDevelopments, 
  fetchLatestDevelopments,
  getDevelopmentsSyncMeta,
  KIROV_DEVELOPERS, 
  HOUSING_CLASSES, 
  ROOM_TYPES, 
  FINISHING_OPTIONS 
} from '../../data/developmentsData';
import { KIROV_DISTRICTS } from '../../data/location';
import { DevelopmentsMap } from '../../components/Map/DevelopmentsMap';
import { DevelopmentsGoogleMap } from '../../components/Map/DevelopmentsGoogleMap';
import { DevelopmentsYandexMap } from '../../components/Map/DevelopmentsYandexMap';
import { DevelopmentCard } from './DevelopmentCard';
import { DevelopmentDetailModal } from './DevelopmentDetailModal';
import { DevelopmentFormModal } from './DevelopmentFormModal';
import { GlobalSearch } from '../../components/GlobalSearch';
import { formatNumber } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import {
  KSM_PROJECT_SLUGS,
  KSM_PROJECT_NAMES,
  getKsmSlugForDevelopment,
  fetchKsmLots,
  syncKsmProject,
  buildKsmSummaryByProject,
} from '../../lib/ksmLots';
import {
  KSSK_PROJECT_SLUGS,
  KSSK_PROJECT_NAMES,
  getKsskSlugForDevelopment,
  fetchKsskLots,
  syncKsskProject,
  buildKsskSummaryByProject,
} from '../../lib/ksskLots';

const LIVE_PROVIDERS = {
  ksm: {
    id: 'ksm',
    label: 'КСМ',
    slugs: KSM_PROJECT_SLUGS,
    names: KSM_PROJECT_NAMES,
    fetchLots: fetchKsmLots,
    syncProject: syncKsmProject,
    buildSummary: buildKsmSummaryByProject,
    getSlug: getKsmSlugForDevelopment,
    subtitle: 'Прямые данные по свободным квартирам из кабинета застройщика КСМ',
    pillTitle: 'Синхронизация КСМ: живые остатки квартир с сайта застройщика',
    syncAllTitle: 'Обновить свободные квартиры по всем 6 ЖК КСМ',
  },
  kssk: {
    id: 'kssk',
    label: 'КССК',
    slugs: KSSK_PROJECT_SLUGS,
    names: KSSK_PROJECT_NAMES,
    fetchLots: fetchKsskLots,
    syncProject: syncKsskProject,
    buildSummary: buildKsskSummaryByProject,
    getSlug: getKsskSlugForDevelopment,
    subtitle: 'Актуальные свободные квартиры с сайта kvartiry.kssk.ru',
    pillTitle: 'Синхронизация КССК: живые остатки квартир с kvartiry.kssk.ru',
    syncAllTitle: 'Обновить свободные квартиры по всем 6 ЖК КССК',
  },
};

function getLatestSyncedIso(projectsMeta = []) {
  let latest = null;
  for (const meta of projectsMeta) {
    if (!meta?.lastSyncedAt) continue;
    const t = new Date(meta.lastSyncedAt).getTime();
    if (!Number.isNaN(t) && (!latest || t > latest)) {
      latest = t;
    }
  }
  return latest ? new Date(latest).toISOString() : null;
}

export default function DevelopmentsPage() {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();

  // Data state
  const [developments, setDevelopments] = useState(() => getStoredDevelopments());
  const [syncMeta, setSyncMeta] = useState(() => getDevelopmentsSyncMeta());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDevId, setSelectedDevId] = useState(null);
  const [detailModalDev, setDetailModalDev] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Live Lots state (KSM & KSSK)
  const [liveState, setLiveState] = useState({
    ksm: { lots: [], projects: [] },
    kssk: { lots: [], projects: [] },
  });
  const [liveProgress, setLiveProgress] = useState({
    ksm: { active: false, current: 0, total: KSM_PROJECT_SLUGS.length, currentName: '' },
    kssk: { active: false, current: 0, total: KSSK_PROJECT_SLUGS.length, currentName: '' },
  });

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState('split');
  // Map Provider: 'yandex' (Яндекс.Карты) | 'google' (Google Карты) | 'osm' (OpenStreetMap)
  const [mapProvider, setMapProvider] = useState('yandex');

  useEffect(() => {
    let active = true;
    fetchLatestDevelopments().then((res) => {
      if (!active) return;
      if (Array.isArray(res?.developments) && res.developments.length > 0) {
        setDevelopments(res.developments);
        setSyncMeta(getDevelopmentsSyncMeta());
      }
    });

    Object.entries(LIVE_PROVIDERS).forEach(([providerId, provider]) => {
      provider
        .fetchLots()
        .then((res) => {
          if (!active) return;
          setLiveState((prev) => ({
            ...prev,
            [providerId]: { lots: res.lots, projects: res.projects },
          }));
        })
        .catch(() => {
          // Non-blocking fallback when unauthenticated or in localStorage mode
        });
    });

    return () => {
      active = false;
    };
  }, []);

  const liveSummaries = useMemo(
    () => ({
      ksm: buildKsmSummaryByProject(liveState.ksm.lots, liveState.ksm.projects),
      kssk: buildKsskSummaryByProject(liveState.kssk.lots, liveState.kssk.projects),
    }),
    [liveState]
  );

  const liveLastSyncedAt = useMemo(
    () => ({
      ksm: getLatestSyncedIso(liveState.ksm.projects),
      kssk: getLatestSyncedIso(liveState.kssk.projects),
    }),
    [liveState]
  );

  const applyProviderSyncResult = (providerId, slug, result) => {
    const provider = LIVE_PROVIDERS[providerId];
    const nextLots = Array.isArray(result?.lots) ? result.lots : [];
    setLiveState((prev) => {
      const prevProviderState = prev[providerId];
      const nextMeta = {
        projectSlug: slug,
        projectName: result?.projectName || provider.names[slug] || slug,
        totalCount: result?.totalCount ?? nextLots.length,
        syncedCount: result?.syncedCount ?? nextLots.length,
        lastSyncedAt: result?.syncedAt || new Date().toISOString(),
        status: 'ok',
        errorMessage: null,
      };
      const exists = prevProviderState.projects.some((m) => m.projectSlug === slug);
      return {
        ...prev,
        [providerId]: {
          lots: [
            ...prevProviderState.lots.filter((lot) => lot.project_slug !== slug),
            ...nextLots,
          ],
          projects: exists
            ? prevProviderState.projects.map((m) => (m.projectSlug === slug ? nextMeta : m))
            : [...prevProviderState.projects, nextMeta],
        },
      };
    });
  };

  const handleSyncSingleProviderProject = async (providerId, slug) => {
    const provider = LIVE_PROVIDERS[providerId];
    if (!provider || !slug) return null;
    try {
      const result = await provider.syncProject(slug);
      applyProviderSyncResult(providerId, slug, result);
      const count = result?.syncedCount ?? result?.lots?.length ?? 0;
      toast.success(`${provider.label} «${result?.projectName || provider.names[slug] || slug}»: загружено ${count} лотов`);
      return result;
    } catch (err) {
      toast.error(err?.message || `Не удалось обновить лоты ${provider.label}`);
      throw err;
    }
  };

  const handleSyncAllForProvider = async (providerId) => {
    const provider = LIVE_PROVIDERS[providerId];
    if (!provider || liveProgress[providerId]?.active) return;

    const total = provider.slugs.length;
    let syncedLotsTotal = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < total; i += 1) {
        const slug = provider.slugs[i];
        const name = provider.names[slug] || slug;
        setLiveProgress((prev) => ({
          ...prev,
          [providerId]: { active: true, current: i + 1, total, currentName: name },
        }));
        try {
          const result = await provider.syncProject(slug);
          applyProviderSyncResult(providerId, slug, result);
          syncedLotsTotal += result?.syncedCount ?? result?.lots?.length ?? 0;
        } catch (err) {
          failedCount += 1;
          console.warn(`[${provider.label} sync] Failed for ${slug}:`, err?.message);
        }
      }

      if (failedCount === 0) {
        toast.success(`${provider.label} синхронизирован: ${syncedLotsTotal} свободных лотов по ${total} ЖК`);
      } else if (failedCount < total) {
        toast.warning(`${provider.label} обновлен частично (${total - failedCount}/${total} ЖК, ${syncedLotsTotal} лотов)`);
      } else {
        toast.error(`Не удалось синхронизировать лоты ${provider.label}. Проверьте авторизацию.`);
      }
    } finally {
      setLiveProgress((prev) => ({
        ...prev,
        [providerId]: { active: false, current: 0, total, currentName: '' },
      }));
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetchLatestDevelopments({ forceRefresh: true });
      if (Array.isArray(res?.developments) && res.developments.length > 0) {
        setDevelopments(res.developments);
        setSyncMeta(getDevelopmentsSyncMeta());
        toast.success(`База новостроек обновлена (${res.developments.length} ЖК)`);
      }
    } catch {
      toast.error('Не удалось обновить базу новостроек');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter States
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedCompletion, setSelectedCompletion] = useState('all');
  const [selectedDeveloper, setSelectedDeveloper] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedFinishing, setSelectedFinishing] = useState([]);

  // Reload data
  const handleRefresh = () => {
    setDevelopments(getStoredDevelopments());
  };

  // Toggle Room Chip
  const toggleRoom = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
    );
  };

  // Toggle Finishing Chip
  const toggleFinishing = (finishId) => {
    setSelectedFinishing(prev =>
      prev.includes(finishId) ? prev.filter(f => f !== finishId) : [...prev, finishId]
    );
  };

  // Reset Filters
  const resetFilters = () => {
    setSearch('');
    setPriceMin('');
    setPriceMax('');
    setSelectedRooms([]);
    setSelectedCompletion('all');
    setSelectedDeveloper('all');
    setSelectedDistrict('all');
    setSelectedFinishing([]);
  };

  const hasActiveFilters = Boolean(
    search ||
    priceMin ||
    priceMax ||
    selectedRooms.length > 0 ||
    selectedCompletion !== 'all' ||
    selectedDeveloper !== 'all' ||
    selectedDistrict !== 'all' ||
    selectedFinishing.length > 0
  );

  // Filter logic
  const filteredDevelopments = useMemo(() => {
    return developments.filter(dev => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const text = `${dev.name} ${dev.developer} ${dev.address} ${dev.district} ${dev.microdistrict || ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      // 2. Price filter
      const pMin = priceMin ? Number(priceMin) : null;
      const pMax = priceMax ? Number(priceMax) : null;
      if (pMin && dev.price_to && dev.price_to < pMin) return false;
      if (pMax && dev.price_from && dev.price_from > pMax) return false;

      // 3. Rooms
      if (selectedRooms.length > 0) {
        const devApts = dev.apartments || [];
        const hasMatchingRoom = selectedRooms.some(r => 
          devApts.some(apt => apt.type === r)
        );
        if (!hasMatchingRoom) return false;
      }

      // 4. Completion
      if (selectedCompletion === 'completed' && !dev.is_completed) return false;
      if (selectedCompletion === '2026' && dev.completion_year !== 2026) return false;
      if (selectedCompletion === '2027+' && (dev.completion_year || 0) < 2027) return false;

      // 5. Developer
      if (selectedDeveloper !== 'all' && dev.developer !== selectedDeveloper) return false;

      // 6. District
      if (selectedDistrict !== 'all') {
        const distName = dev.district || '';
        if (!distName.toLowerCase().includes(selectedDistrict.toLowerCase())) return false;
      }

      // 7. Finishing
      if (selectedFinishing.length > 0) {
        const devFinishing = dev.finishing || [];
        const hasMatchingFinish = selectedFinishing.some(f => devFinishing.includes(f));
        if (!hasMatchingFinish) return false;
      }

      return true;
    });
  }, [
    developments,
    search,
    priceMin,
    priceMax,
    selectedRooms,
    selectedCompletion,
    selectedDeveloper,
    selectedDistrict,
    selectedFinishing
  ]);

  // Fast Add to Client Selection
  const handleAddToSelection = async (dev) => {
    try {
      const selectionItem = {
        id: `sel_dev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        realtor_id: state.currentUser?.id,
        address: `${dev.name}, ${dev.address}`,
        city: 'Киров',
        price: dev.price_from || 0,
        rooms: null,
        property_type: 'apartment',
        market_type: 'new_building',
        images: dev.images?.slice(0, 3) || [],
        notes: `Новостройка от ${dev.developer}. Срок: ${dev.completion_date}. Цена: от ${formatNumber(dev.price_from)} ₽.`,
        link: dev.avito_url || dev.domrf_url || dev.builder_url,
        contact_name: `${dev.developer} (Отдел продаж)`,
        contact_phone: dev.contact_phone || null,
        created_at: new Date().toISOString()
      };

      await dispatch({ type: 'ADD_SELECTION_ITEM', item: selectionItem });
      toast.success(`ЖК «${dev.name}» добавлен в подборки!`);
    } catch (err) {
      console.error('[Add to selection]', err);
      toast.error('Не удалось добавить в подборку: ' + err.message);
    }
  };

  return (
    <div className="developments-page-container">
      {/* Top Header Bar */}
      <header className="dev-header">
        <div className="dev-header-title-block">
          <div className="dev-header-badge">
            <Building2 size={16} />
            <span>Новостройки г. Кирова</span>
          </div>
          <h1 className="dev-header-title">Каталог и карта новостроек Кирова</h1>
          <p className="dev-header-sub">
            Актуальные жилые комплексы с проверкой в ЕИСЖС (наш.дом.рф), объявлениями на Авито и интерактивной картой города
          </p>
        </div>

        <div className="dev-header-controls">
          <GlobalSearch style={{ maxWidth: 280 }} />

          {/* Prominent View Mode Switcher */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Интерактивная карта Кирова на весь экран"
            >
              <MapIcon size={16} />
              <span className="mode-btn-text">Карта Кирова</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Сплит: Каталог и Карта рядом"
            >
              <Columns2 size={16} />
              <span className="mode-btn-text">Сплит (Карта + Список)</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Только каталог карточек"
            >
              <LayoutGrid size={16} />
              <span className="mode-btn-text">Список</span>
            </button>
          </div>

          {/* Add ЖК Button */}
          <button
            type="button"
            className="btn-add-dev"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>Добавить ЖК</span>
          </button>
        </div>
      </header>

      {/* Filter Section */}
      <section className="dev-filters-card">
        {/* Row 1: Search & Price & Dropdowns */}
        <div className="dev-filters-main-row">
          {/* Search */}
          <div className="dev-search-input-wrap">
            <Search size={16} className="dev-search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию ЖК, застройщику, улице, району..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dev-search-input"
            />
            {search && (
              <button className="dev-clear-search-btn" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Price Range */}
          <div className="dev-filter-price-box">
            <span className="price-prefix">Цена, ₽:</span>
            <input
              type="number"
              placeholder="от 3 000 000"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="price-input"
            />
            <span className="price-separator">-</span>
            <input
              type="number"
              placeholder="до 15 000 000"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="price-input"
            />
          </div>

          {/* District Select */}
          <div className="dev-filter-select-wrap">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="dev-filter-select"
            >
              <option value="all">Все районы Кирова</option>
              {KIROV_DISTRICTS.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Developer Select */}
          <div className="dev-filter-select-wrap">
            <select
              value={selectedDeveloper}
              onChange={(e) => setSelectedDeveloper(e.target.value)}
              className="dev-filter-select"
            >
              <option value="all">Все застройщики</option>
              {KIROV_DEVELOPERS.map(dev => (
                <option key={dev} value={dev}>{dev}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Room Chips, Completion, Finishing & Reset */}
        <div className="dev-filters-secondary-row">
          {/* Rooms Multi-select */}
          <div className="chips-group">
            <span className="chips-group-label">Комнатность:</span>
            {ROOM_TYPES.map(room => {
              const active = selectedRooms.includes(room.id);
              return (
                <button
                  key={room.id}
                  type="button"
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleRoom(room.id)}
                >
                  {room.label}
                </button>
              );
            })}
          </div>

          {/* Completion Date */}
          <div className="chips-group">
            <span className="chips-group-label">Срок сдачи:</span>
            {[
              { id: 'all', label: 'Любой' },
              { id: 'completed', label: 'Сдан' },
              { id: '2026', label: '2026 г.' },
              { id: '2027+', label: '2027+' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={`chip-btn ${selectedCompletion === item.id ? 'active' : ''}`}
                onClick={() => setSelectedCompletion(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Finishing */}
          <div className="chips-group">
            <span className="chips-group-label">Отделка:</span>
            {FINISHING_OPTIONS.map(fin => {
              const active = selectedFinishing.includes(fin.id);
              return (
                <button
                  key={fin.id}
                  type="button"
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleFinishing(fin.id)}
                >
                  {fin.label.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={resetFilters}
            >
              <RotateCcw size={13} />
              <span>Сбросить</span>
            </button>
          )}

          <div className="dev-count-indicator">
            {Object.entries(LIVE_PROVIDERS).map(([providerId, provider]) => {
              const pLots = liveState[providerId].lots;
              const pProgress = liveProgress[providerId];
              const pLastSynced = liveLastSyncedAt[providerId];
              return (
                <div key={providerId} className="ksm-sync-control" title={provider.pillTitle}>
                  <span className="ksm-live-pill">
                    {provider.label} live: <strong>{pLots.length}</strong> кв.
                    {pLastSynced ? ` (${new Date(pLastSynced).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn-ksm-sync"
                    onClick={() => handleSyncAllForProvider(providerId)}
                    disabled={pProgress.active}
                    title={provider.syncAllTitle}
                  >
                    <RefreshCw size={12} className={pProgress.active ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: 4 }} />
                    {pProgress.active
                      ? `${provider.label} ${pProgress.current}/${pProgress.total}: ${pProgress.currentName}`
                      : `Обновить ${provider.label}`}
                  </button>
                </div>
              );
            })}
            {syncMeta?.updatedAt && (
              <span className="dev-sync-date" title="Дата последнего ежедневного обновления базы">
                Обновлено: {new Date(syncMeta.updatedAt).toLocaleDateString('ru-RU')}
              </span>
            )}
            <button
              type="button"
              className="btn-link-map"
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Обновить список новостроек из актуального каталога"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: 4 }} />
              {isSyncing ? 'Обновление...' : 'Обновить'}
            </button>
            <span>Найдено: <strong>{filteredDevelopments.length}</strong> ЖК</span>
            {viewMode === 'grid' && (
              <button 
                type="button" 
                className="btn-link-map" 
                onClick={() => setViewMode('split')}
              >
                📍 Показать на карте
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className={`dev-content-layout ${viewMode}`}>
        
        {/* Left Column: List of Developments */}
        {viewMode !== 'map' && (
          <div className="dev-list-column">
            {filteredDevelopments.length > 0 ? (
              <div className="dev-cards-grid">
                {filteredDevelopments.map(dev => {
                  const ksmSlug = getKsmSlugForDevelopment(dev);
                  const ksskSlug = getKsskSlugForDevelopment(dev);
                  const liveSummary = ksmSlug
                    ? liveSummaries.ksm[ksmSlug] || null
                    : ksskSlug
                      ? liveSummaries.kssk[ksskSlug] || null
                      : null;
                  const liveProviderLabel = ksskSlug ? 'КССК live' : 'КСМ live';
                  return (
                    <DevelopmentCard
                      key={dev.id}
                      development={dev}
                      isSelected={dev.id === selectedDevId}
                      liveSummary={liveSummary}
                      liveProviderLabel={liveProviderLabel}
                      onSelect={(id) => {
                        setSelectedDevId(id);
                        if (viewMode === 'grid') setViewMode('split');
                      }}
                      onOpenDetail={(d) => setDetailModalDev(d)}
                      onAddToSelection={handleAddToSelection}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="dev-empty-state">
                <Building2 size={44} className="text-muted" />
                <h3>Ничего не найдено</h3>
                <p>Попробуйте смягчить фильтры поиска или сбросить критерии подбора</p>
                <button type="button" className="btn-reset-empty" onClick={resetFilters}>
                  Сбросить все фильтры
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right Column: Interactive Map (Google Карты / Яндекс.Карты / OSM) */}
        {viewMode !== 'grid' && (
          <div className={`dev-map-column ${viewMode === 'map' ? 'fullscreen' : ''}`}>
            {/* Map Provider Selector */}
            <div className="dev-map-provider-bar">
              <div className="provider-info">
                <span className="provider-label">Движок карты:</span>
              </div>
              <div className="dev-map-provider-pills">
                <button
                  type="button"
                  className={`provider-pill ${mapProvider === 'yandex' ? 'active' : ''}`}
                  onClick={() => setMapProvider('yandex')}
                  title="Яндекс.Карты г. Кирова с номерами домов и 3D зданиями"
                >
                  <span className="pill-dot yandex" />
                  <span>Яндекс.Карты</span>
                </button>
                <button
                  type="button"
                  className={`provider-pill ${mapProvider === 'google' ? 'active' : ''}`}
                  onClick={() => setMapProvider('google')}
                  title="Google Карты (Схема, Гибрид, Спутник)"
                >
                  <span className="pill-dot google" />
                  <span>Google Карты</span>
                </button>
                <button
                  type="button"
                  className={`provider-pill ${mapProvider === 'osm' ? 'active' : ''}`}
                  onClick={() => setMapProvider('osm')}
                  title="OpenStreetMap"
                >
                  <span className="pill-dot osm" />
                  <span>OpenStreetMap</span>
                </button>
              </div>
            </div>

            <div className="dev-map-embed-wrapper">
              {mapProvider === 'google' && (
                <DevelopmentsGoogleMap
                  developments={filteredDevelopments}
                  selectedId={selectedDevId}
                  onSelect={setSelectedDevId}
                  onOpenDetail={setDetailModalDev}
                  height="100%"
                />
              )}
              {mapProvider === 'yandex' && (
                <DevelopmentsYandexMap
                  developments={filteredDevelopments}
                  selectedId={selectedDevId}
                  onSelect={setSelectedDevId}
                  onOpenDetail={setDetailModalDev}
                  height="100%"
                />
              )}
              {mapProvider === 'osm' && (
                <DevelopmentsMap
                  provider="osm"
                  developments={filteredDevelopments}
                  selectedId={selectedDevId}
                  onSelect={setSelectedDevId}
                  onOpenDetail={setDetailModalDev}
                  height="100%"
                />
              )}
            </div>
          </div>
        )}

      </main>

      {/* Modals */}
      {detailModalDev && (() => {
        const ksmSlug = getKsmSlugForDevelopment(detailModalDev);
        const ksskSlug = getKsskSlugForDevelopment(detailModalDev);
        const providerId = ksmSlug ? 'ksm' : ksskSlug ? 'kssk' : null;
        const activeSlug = ksmSlug || ksskSlug;
        const providerSpec = providerId ? LIVE_PROVIDERS[providerId] : null;
        const detailLots = providerId && activeSlug
          ? liveState[providerId].lots.filter((lot) => lot.project_slug === activeSlug)
          : [];
        const detailMeta = providerId && activeSlug
          ? liveSummaries[providerId][activeSlug] || null
          : null;
        return (
          <DevelopmentDetailModal
            development={detailModalDev}
            liveLots={detailLots}
            liveMeta={detailMeta}
            liveProvider={providerSpec ? {
              id: providerSpec.id,
              label: providerSpec.label,
              slug: activeSlug,
              subtitle: providerSpec.subtitle,
            } : null}
            onSyncLiveProject={providerId ? (slug) => handleSyncSingleProviderProject(providerId, slug) : null}
            onClose={() => setDetailModalDev(null)}
            onSelectOnMap={(id) => {
              setSelectedDevId(id);
              setViewMode('split');
            }}
          />
        );
      })()}

      {isAddModalOpen && (
        <DevelopmentFormModal
          onClose={() => setIsAddModalOpen(false)}
          onSaved={(newDev) => {
            handleRefresh();
            setSelectedDevId(newDev.id);
          }}
        />
      )}

      <style>{`
        .developments-page-container {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - var(--nav-h, 64px));
          padding: 20px 24px 24px 24px;
          gap: 16px;
          box-sizing: border-box;
          width: 100%;
        }
        @media (max-width: 900px) {
          .developments-page-container {
            padding: 16px 16px 80px 16px;
          }
        }
        .dev-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
        }
        .dev-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 6px;
        }
        .dark .dev-header-badge {
          background: #1e3a8a;
          color: #bfdbfe;
        }
        .dev-header-title {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: var(--text, #0f172a);
          letter-spacing: -0.02em;
        }
        .dev-header-sub {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: var(--text-secondary, #475569);
        }
        .dev-header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .view-mode-toggle {
          display: flex;
          background: var(--surface, #ffffff);
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #475569);
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .mode-btn:hover {
          color: var(--primary, #0052FF);
        }
        .mode-btn.active {
          background: var(--primary, #0052FF);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 82, 255, 0.25);
        }
        .btn-add-dev {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary, #0052FF);
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-add-dev:hover {
          background: var(--primary-hover, #0043D9);
        }
        .dev-filters-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 16px);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05));
        }
        .dev-filters-main-row {
          display: grid;
          grid-template-columns: 2fr 1.6fr 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .dev-filters-main-row {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 640px) {
          .dev-filters-main-row {
            grid-template-columns: 1fr;
          }
        }
        .dev-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .dev-search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted, #94a3b8);
          pointer-events: none;
        }
        .dev-search-input {
          width: 100%;
          padding: 9px 36px 9px 36px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 10px;
          font-size: 13px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .dev-search-input {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .dev-search-input:focus {
          border-color: var(--primary, #0052FF);
        }
        .dev-clear-search-btn {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
        }
        .dev-filter-price-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 4px 10px;
        }
        .dark .dev-filter-price-box {
          background: #0f172a;
          border-color: #334155;
        }
        .price-prefix {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #94a3b8);
          white-space: nowrap;
        }
        .price-input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .price-input {
          color: #f1f5f9;
        }
        .price-separator {
          color: var(--text-muted, #94a3b8);
        }
        .dev-filter-select-wrap {
          display: flex;
        }
        .dev-filter-select {
          width: 100%;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
          cursor: pointer;
        }
        .dark .dev-filter-select {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .dev-filters-secondary-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
        }
        .chips-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .chips-group-label {
          color: var(--text-muted, #94a3b8);
          font-size: 11px;
          font-weight: 600;
        }
        .chip-btn {
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          color: var(--text-secondary, #475569);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dark .chip-btn {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .chip-btn:hover {
          border-color: var(--primary, #0052FF);
        }
        .chip-btn.active {
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border-color: var(--primary, #0052FF);
        }
        .dark .chip-btn.active {
          background: #1e3a8a;
          color: #93c5fd;
          border-color: #3b82f6;
        }
        .btn-reset-filters {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: var(--danger, #ef4444);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
        }
        .dev-count-indicator {
          margin-left: auto;
          font-size: 12px;
          color: var(--text-secondary, #475569);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .ksm-sync-control {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 3px 6px 3px 10px;
          border-radius: 10px;
        }
        .dark .ksm-sync-control {
          background: #064e3b;
          border-color: #059669;
        }
        .ksm-live-pill {
          font-size: 11px;
          color: #047857;
          white-space: nowrap;
        }
        .dark .ksm-live-pill {
          color: #a7f3d0;
        }
        .btn-ksm-sync {
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 7px;
          padding: 4px 9px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .btn-ksm-sync:hover:not(:disabled) {
          background: #047857;
        }
        .btn-ksm-sync:disabled {
          opacity: 0.75;
          cursor: wait;
        }
        .btn-link-map {
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border: 1px solid var(--primary-light, #eef4ff);
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .dev-content-layout {
          display: flex;
          gap: 20px;
          width: 100%;
        }
        .dev-content-layout.split {
          flex: 0 0 auto;
          height: calc(100vh - 250px);
          min-height: 520px;
          max-height: 760px;
          overflow: hidden;
        }
        .dev-content-layout.split .dev-list-column {
          width: 50%;
          overflow-y: auto;
          padding-right: 6px;
          height: 100%;
          min-height: 0;
        }
        .dev-content-layout.split .dev-map-column {
          width: 50%;
          height: 100% !important;
          min-height: 0 !important;
          border-radius: var(--radius-lg, 16px);
          overflow: hidden;
          border: 1px solid var(--border, #e2e8f0);
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
        }
        .dev-map-provider-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 14px;
          background: var(--surface, #ffffff);
          border-bottom: 1px solid var(--border, #e2e8f0);
          z-index: 10;
        }
        .provider-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted, #94a3b8);
        }
        .dev-map-provider-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .provider-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          color: var(--text-secondary, #475569);
          cursor: pointer;
          transition: all 0.2s;
        }
        .provider-pill.active {
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border-color: var(--primary, #0052FF);
          box-shadow: 0 1px 4px rgba(0, 82, 255, 0.15);
        }
        .dark .provider-pill.active {
          background: #1e3a8a;
          color: #93c5fd;
          border-color: #3b82f6;
        }
        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .pill-dot.google {
          background: #10b981;
        }
        .pill-dot.yandex {
          background: #ef4444;
        }
        .pill-dot.osm {
          background: #3b82f6;
        }
        .dev-map-embed-wrapper {
          flex: 1;
          position: relative;
          width: 100%;
          min-height: 0;
          height: 100%;
        }
        .dev-content-layout.grid .dev-list-column {
          width: 100%;
          overflow-y: auto;
        }
        .dev-content-layout.map {
          flex: 0 0 auto;
          height: calc(100vh - 230px);
          min-height: 540px;
        }
        .dev-content-layout.map .dev-map-column.fullscreen {
          width: 100% !important;
          height: 100% !important;
          min-height: 540px !important;
          border-radius: var(--radius-lg, 16px);
          overflow: hidden;
          border: 1px solid var(--border, #e2e8f0);
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 960px) {
          .view-mode-toggle {
            flex-wrap: wrap;
            max-width: 100%;
          }
          .mode-btn {
            padding: 6px 10px;
            font-size: 12px;
          }
          .dev-content-layout.split {
            flex-direction: column-reverse;
            height: auto;
            max-height: none;
            overflow: visible;
          }
          .dev-content-layout.split .dev-list-column,
          .dev-content-layout.split .dev-map-column {
            width: 100% !important;
          }
          .dev-content-layout.split .dev-list-column {
            height: auto;
            overflow-y: visible;
            padding-right: 0;
          }
          .dev-content-layout.split .dev-map-column {
            height: auto !important;
            min-height: 440px !important;
            position: relative;
          }
          .dev-content-layout.split .dev-map-embed-wrapper {
            height: 420px;
            min-height: 420px;
            flex: none;
          }
        }
        .dev-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
          padding-bottom: 24px;
        }
        .dev-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: var(--surface, #ffffff);
          border: 1px dashed var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 16px);
          text-align: center;
          margin-top: 20px;
        }
        .dev-empty-state h3 {
          margin: 14px 0 6px 0;
          font-size: 17px;
          font-weight: 700;
        }
        .dev-empty-state p {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: var(--text-secondary, #475569);
        }
        .btn-reset-empty {
          background: var(--primary, #0052FF);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
