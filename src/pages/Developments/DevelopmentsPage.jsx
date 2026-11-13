import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { DevelopmentCard } from './DevelopmentCard';
import { DevelopmentDetailModal } from './DevelopmentDetailModal';
import { DevelopmentFormModal } from './DevelopmentFormModal';
import { LiveLotsFinder } from './LiveLotsFinder';
import { GlobalSearch } from '../../components/GlobalSearch';
import { formatNumber } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import {
  buildMapItemsFromDevelopments,
  resolveHouseCoords,
} from '../../lib/houseCoordinates';
import {
  isPurchaseRequestForDevelopments,
  matchDevelopmentsToRequest,
  buildSelectionItemFromDevelopment,
} from '../../lib/developmentMatching';
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
import {
  KINO_PROJECT_SLUGS,
  KINO_PROJECT_NAMES,
  getKinoSlugForDevelopment,
  fetchKinoLots,
  syncKinoProject,
  buildKinoSummaryByProject,
} from '../../lib/kinoLots';

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
  kino: {
    id: 'kino',
    label: 'КИНО',
    slugs: KINO_PROJECT_SLUGS,
    names: KINO_PROJECT_NAMES,
    fetchLots: fetchKinoLots,
    syncProject: syncKinoProject,
    buildSummary: buildKinoSummaryByProject,
    getSlug: getKinoSlugForDevelopment,
    subtitle: 'Актуальные свободные квартиры застройщика КИНО девелопмент',
    pillTitle: 'Синхронизация КИНО: живые остатки квартир',
    syncAllTitle: 'Обновить свободные квартиры по всем 3 ЖК КИНО',
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

  // Live Lots state (KSM & KSSK & KINO)
  const [liveState, setLiveState] = useState({
    ksm: { lots: [], projects: [] },
    kssk: { lots: [], projects: [] },
    kino: { lots: [], projects: [] },
  });
  const [liveProgress, setLiveProgress] = useState({
    ksm: { active: false, current: 0, total: KSM_PROJECT_SLUGS.length, currentName: '' },
    kssk: { active: false, current: 0, total: KSSK_PROJECT_SLUGS.length, currentName: '' },
    kino: { active: false, current: 0, total: KINO_PROJECT_SLUGS.length, currentName: '' },
  });

  // View Mode: 'split' | 'grid' | 'map' | 'lots'
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 900 ? 'grid' : 'split'));
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showHousePins, setShowHousePins] = useState(true);
  const [mapFocusTarget, setMapFocusTarget] = useState(null);

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
      kino: buildKinoSummaryByProject(liveState.kino.lots, liveState.kino.projects),
    }),
    [liveState]
  );

  const liveLastSyncedAt = useMemo(
    () => ({
      ksm: getLatestSyncedIso(liveState.ksm.projects),
      kssk: getLatestSyncedIso(liveState.kssk.projects),
      kino: getLatestSyncedIso(liveState.kino.projects),
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

  const totalLiveLotsCount =
    liveState.ksm.lots.length + liveState.kssk.lots.length + liveState.kino.lots.length;
  const isAnyProviderSyncing =
    liveProgress.ksm.active || liveProgress.kssk.active || liveProgress.kino.active;

  const handleSyncAllProviders = async () => {
    if (isAnyProviderSyncing) return;
    await Promise.all([
      handleSyncAllForProvider('kssk'),
      handleSyncAllForProvider('ksm'),
      handleSyncAllForProvider('kino'),
    ]);
  };

  const handleFocusHouseOnMap = (lot, dev) => {
    const targetDev = dev || developments.find((d) => {
      const slug = lot?.project_slug;
      return (
        slug &&
        (getKsmSlugForDevelopment(d) === slug ||
          getKsskSlugForDevelopment(d) === slug ||
          getKinoSlugForDevelopment(d) === slug)
      );
    }) || null;
    if (!targetDev) return;

    const coords = resolveHouseCoords(targetDev, lot?.address || targetDev.address);
    if (coords?.lat && coords?.lng) {
      setMapFocusTarget({ lat: coords.lat, lng: coords.lng, zoom: 16, key: `${targetDev.id}_${lot?.id || ''}_${Date.now()}` });
    }
    setSelectedDevId(targetDev.id);
    setDetailModalDev(null);
    if (viewMode === 'grid' || viewMode === 'lots') {
      setViewMode('split');
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRequestId, setSelectedRequestId] = useState(() => searchParams.get('request') || '');
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedCompletion, setSelectedCompletion] = useState('all');
  const [selectedDeveloper, setSelectedDeveloper] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedFinishing, setSelectedFinishing] = useState([]);

  useEffect(() => {
    const paramReq = searchParams.get('request') || '';
    if (paramReq !== selectedRequestId) {
      setSelectedRequestId(paramReq);
    }
  }, [searchParams, selectedRequestId]);

  const activePurchaseRequests = useMemo(
    () => (state.requests || []).filter(isPurchaseRequestForDevelopments),
    [state.requests]
  );

  const selectedRequest = useMemo(
    () => activePurchaseRequests.find((r) => r.id === selectedRequestId) || null,
    [activePurchaseRequests, selectedRequestId]
  );

  const selectedRequestClient = useMemo(() => {
    if (!selectedRequest) return null;
    const cId = selectedRequest.client_id || selectedRequest.client_ids?.[0];
    return (state.clients || []).find((c) => c.id === cId) || null;
  }, [selectedRequest, state.clients]);

  const requestMatchesMap = useMemo(() => {
    const map = new Map();
    if (!selectedRequest) return map;
    const allLots = [...liveState.ksm.lots, ...liveState.kssk.lots, ...liveState.kino.lots];
    const matched = matchDevelopmentsToRequest(developments, selectedRequest, { liveLots: allLots });
    for (const item of matched) {
      if (item?.dev?.id) {
        map.set(item.dev.id, item);
      }
    }
    return map;
  }, [developments, selectedRequest, liveState.ksm.lots, liveState.kssk.lots, liveState.kino.lots]);

  const handleSelectRequestFilter = (reqId) => {
    setSelectedRequestId(reqId);
    const nextParams = new URLSearchParams(searchParams);
    if (reqId) {
      nextParams.set('request', reqId);
    } else {
      nextParams.delete('request');
    }
    setSearchParams(nextParams, { replace: true });
  };

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
    handleSelectRequestFilter('');
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
    selectedRequestId ||
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
    const list = developments.filter(dev => {
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

    if (!selectedRequest) return list;

    return [...list].sort((a, b) => {
      const mA = requestMatchesMap.get(a.id);
      const mB = requestMatchesMap.get(b.id);
      if (mA && !mB) return -1;
      if (!mA && mB) return 1;
      if (mA && mB && mB.score !== mA.score) return mB.score - mA.score;
      return 0;
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
    selectedFinishing,
    selectedRequest,
    requestMatchesMap
  ]);

  const mapItems = useMemo(
    () =>
      buildMapItemsFromDevelopments(filteredDevelopments, {
        ksmLots: liveState.ksm.lots,
        ksskLots: liveState.kssk.lots,
        kinoLots: liveState.kino.lots,
        ksmSummaryBySlug: liveSummaries.ksm,
        ksskSummaryBySlug: liveSummaries.kssk,
        kinoSummaryBySlug: liveSummaries.kino,
        showHousePins,
      }),
    [
      filteredDevelopments,
      liveState.ksm.lots,
      liveState.kssk.lots,
      liveState.kino.lots,
      liveSummaries.ksm,
      liveSummaries.kssk,
      liveSummaries.kino,
      showHousePins,
    ]
  );

  // Fast Add to Client Selection
  const handleAddToSelection = async (dev) => {
    try {
      const matchEntry = requestMatchesMap.get(dev.id);
      const bestApt = matchEntry?.matchedApartments?.find(a => a.inBudget) || matchEntry?.matchedApartments?.[0] || null;
      const selectionItem = selectedRequest
        ? buildSelectionItemFromDevelopment({
            dev,
            request: selectedRequest,
            apartment: bestApt,
            realtorId: state.currentUser?.id || selectedRequest.realtor_id || null,
          })
        : {
            realtor_id: state.currentUser?.id,
            address: `${dev.name}, ${dev.address}`,
            city: 'Киров',
            price: dev.price_from || 0,
            property_type: 'apartment',
            images: dev.images?.slice(0, 3) || [],
            notes: `Новостройка от ${dev.developer}. Срок: ${dev.completion_date}. Цена: от ${formatNumber(dev.price_from)} ₽.`,
            link: dev.avito_url || dev.domrf_url || dev.builder_url,
            contact_name: `${dev.developer} (Отдел продаж)`,
            contact_phone: dev.contact_phone || null,
          };

      await dispatch({ type: 'ADD_SELECTION_ITEM', item: selectionItem });
      toast.success(
        selectedRequestClient
          ? `ЖК "${dev.name}" добавлен в подборку для ${selectedRequestClient.full_name}!`
          : `ЖК "${dev.name}" добавлен в подборки!`
      );
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
          <GlobalSearch className="dev-global-search" style={{ maxWidth: 280 }} />

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
            <button
              type="button"
              className={`mode-btn ${viewMode === 'lots' ? 'active' : ''}`}
              onClick={() => setViewMode('lots')}
              title="Быстрый подбор свободных квартир и планировок КСМ и КССК для клиентов"
            >
              <Layers size={16} />
              <span className="mode-btn-text">Подбор квартир ({totalLiveLotsCount})</span>
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
      {viewMode !== 'lots' && (
      <section className={`dev-filters-card ${showMobileFilters ? 'mobile-filters-open' : ''}`}>
        <div className="dev-mobile-filter-bar">
          <div className="dev-search-input-wrap" style={{ flex: 1, minWidth: 0 }}>
            <Search size={16} className="dev-search-icon" />
            <input
              type="text"
              placeholder="Поиск ЖК, района..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dev-search-input"
            />
            {search && (
              <button type="button" className="dev-clear-search-btn" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`dev-mobile-filter-toggle ${showMobileFilters ? 'active' : ''}`}
            onClick={() => setShowMobileFilters(v => !v)}
          >
            <SlidersHorizontal size={15} />
            <span>Фильтры</span>
            {(priceMin || priceMax || selectedRooms.length > 0 || selectedCompletion !== 'all' || selectedDeveloper !== 'all' || selectedDistrict !== 'all' || selectedFinishing.length > 0 || selectedRequestId) && (
              <span className="dev-mobile-filter-dot" />
            )}
          </button>
        </div>

        {/* Row 1: Search & Price & Dropdowns */}
        <div className="dev-filters-main-row">
          {/* Search (desktop) */}
          <div className="dev-search-input-wrap dev-desktop-search-wrap">
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

          {/* Purchase Request Highlight Selector */}
          <div className="dev-filter-select-wrap">
            <select
              value={selectedRequestId}
              onChange={(e) => handleSelectRequestFilter(e.target.value)}
              className="dev-filter-select"
              title="Выделить новостройки под запрос на покупку"
            >
              <option value="">Подсветка по запросу: не выбрана</option>
              {activePurchaseRequests.map((req) => {
                const cId = req.client_id || req.client_ids?.[0];
                const client = (state.clients || []).find((c) => c.id === cId);
                const budgetLabel = req.budget_max ? `до ${formatNumber(req.budget_max)} ₽` : 'без бюджета';
                const distLabel = req.districts?.length > 0 ? req.districts[0] : 'все районы';
                return (
                  <option key={req.id} value={req.id}>
                    {client?.full_name || 'Клиент'} ({budgetLabel}, {distLabel})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {selectedRequest && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              padding: '10px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(0, 82, 255, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Sparkles size={15} color="#047857" />
              <span>
                <strong>Выделены новостройки под запрос:</strong>{' '}
                {selectedRequestClient?.full_name || 'Клиент'}
                {selectedRequest.budget_max ? ` - до ${formatNumber(selectedRequest.budget_max)} ₽` : ''}
                {selectedRequest.districts?.length > 0 ? ` - ${selectedRequest.districts.join(', ')}` : ''}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#047857',
                  background: 'rgba(16, 185, 129, 0.16)',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 11,
                }}
              >
                Совпадает: {requestMatchesMap.size} ЖК
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectRequestFilter('')}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11.5,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              Сбросить запрос
            </button>
          </div>
        )}

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
      )}

      {/* Main Content Area */}
      <main className={`dev-content-layout ${viewMode}`}>
        {viewMode === 'lots' ? (
          <div style={{ width: '100%' }}>
            <LiveLotsFinder
              ksmLots={liveState.ksm.lots}
              ksskLots={liveState.kssk.lots}
              kinoLots={liveState.kino.lots}
              developments={developments}
              onOpenDetail={(d) => setDetailModalDev(d)}
              onFocusHouseOnMap={handleFocusHouseOnMap}
              onSyncAll={handleSyncAllProviders}
              isSyncingAny={isAnyProviderSyncing}
            />
          </div>
        ) : (
          <>
            {/* Left Column: List of Developments */}
            {viewMode !== 'map' && (
              <div className="dev-list-column">
                {filteredDevelopments.length > 0 ? (
                  <div className="dev-cards-grid">
                    {filteredDevelopments.map(dev => {
                      const ksmSlug = getKsmSlugForDevelopment(dev);
                      const ksskSlug = getKsskSlugForDevelopment(dev);
                      const kinoSlug = getKinoSlugForDevelopment(dev);
                      const liveSummary = ksmSlug
                        ? liveSummaries.ksm[ksmSlug] || null
                        : ksskSlug
                          ? liveSummaries.kssk[ksskSlug] || null
                          : kinoSlug
                            ? liveSummaries.kino[kinoSlug] || null
                            : null;
                      const liveProviderLabel = kinoSlug ? 'КИНО live' : ksskSlug ? 'КССК live' : 'КСМ live';
                      return (
                        <DevelopmentCard
                          key={dev.id}
                          development={dev}
                          isSelected={dev.id === selectedDevId}
                          requestMatch={requestMatchesMap.get(dev.id) || null}
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

            {/* Right Column: Interactive Map (OpenStreetMap) */}
            {viewMode !== 'grid' && (
              <div className={`dev-map-column ${viewMode === 'map' ? 'fullscreen' : ''}`}>
                {/* Map Control Bar */}
                <div className="dev-map-provider-bar">
                  <div className="provider-info" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="provider-label">Карта OpenStreetMap</span>
                    <button
                      type="button"
                      className={`provider-pill ${showHousePins ? 'active' : ''}`}
                      onClick={() => setShowHousePins((v) => !v)}
                      title="Показывать отдельные метки по реальным адресам домов и корпусов с живыми ценами"
                    >
                      <MapPin size={12} />
                      <span>{showHousePins ? `Дома (${mapItems.length})` : `ЖК (${mapItems.length})`}</span>
                    </button>
                  </div>
                </div>

                <div className="dev-map-embed-wrapper">
                  <DevelopmentsMap
                    provider="osm"
                    developments={mapItems}
                    selectedId={selectedDevId}
                    focusTarget={mapFocusTarget}
                    onSelect={setSelectedDevId}
                    onOpenDetail={setDetailModalDev}
                    height="100%"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {detailModalDev && (() => {
        const ksmSlug = getKsmSlugForDevelopment(detailModalDev);
        const ksskSlug = getKsskSlugForDevelopment(detailModalDev);
        const kinoSlug = getKinoSlugForDevelopment(detailModalDev);
        const providerId = ksmSlug ? 'ksm' : ksskSlug ? 'kssk' : kinoSlug ? 'kino' : null;
        const activeSlug = ksmSlug || ksskSlug || kinoSlug;
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
            initialClientId={selectedRequest ? (selectedRequest.client_id || selectedRequest.client_ids?.[0] || '') : ''}
            liveLots={detailLots}
            liveMeta={detailMeta}
            liveProvider={providerSpec ? {
              id: providerSpec.id,
              label: providerSpec.label,
              slug: activeSlug,
              subtitle: providerSpec.subtitle,
            } : null}
            onSyncLiveProject={providerId ? (slug) => handleSyncSingleProviderProject(providerId, slug) : null}
            onFocusHouseOnMap={handleFocusHouseOnMap}
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
          min-height: calc(100vh - var(--nav-h, 72px));
          padding: 20px 24px 24px 24px;
          gap: 16px;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }
        @media (max-width: 900px) {
          .developments-page-container {
            padding: 14px 14px calc(var(--nav-h, 72px) + 28px + env(safe-area-inset-bottom, 0px)) 14px;
            gap: 12px;
          }
          .dev-header-title {
            font-size: 20px !important;
          }
          .dev-header-sub {
            font-size: 12px !important;
          }
          .dev-header-controls {
            width: 100%;
          }
          .dev-global-search {
            max-width: 100% !important;
            width: 100%;
          }
        }
        .dev-mobile-filter-bar {
          display: none;
        }
        @media (max-width: 640px) {
          .dev-mobile-filter-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
          }
          .dev-mobile-filter-toggle {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 12px;
            border-radius: 10px;
            border: 1px solid var(--border, #e2e8f0);
            background: var(--bg, #f8fafc);
            color: var(--text, #0f172a);
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
          }
          .dev-mobile-filter-toggle.active {
            background: var(--primary-light, #eef4ff);
            border-color: var(--primary, #0052FF);
            color: var(--primary, #0052FF);
          }
          .dev-mobile-filter-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--primary, #0052FF);
          }
          .dev-desktop-search-wrap {
            display: none !important;
          }
          .dev-filters-card:not(.mobile-filters-open) .dev-filters-main-row,
          .dev-filters-card:not(.mobile-filters-open) .dev-filters-secondary-row {
            display: none;
          }
          .dev-cards-grid {
            grid-template-columns: minmax(0, 1fr) !important;
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
