import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  ExternalLink,
  PlusCircle,
  Check,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Sparkles,
  RefreshCw,
  Loader2,
  Home,
  Layers,
  List,
  X,
  RotateCcw,
  ZoomIn,
  Building2,
} from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { KIROV_DISTRICTS } from '../../data/location';
import {
  ROOM_FILTER_OPTIONS,
  mergeAllDeveloperLots,
  filterFinderLots,
  groupLotsByLayout,
  buildSelectionItemFromLot,
  findActiveBuyerRequestForClient,
  requestToFinderFilters,
} from '../../lib/liveLotsFinder';

const INITIAL_VISIBLE_COUNT = 60;

const DEFAULT_FILTERS = {
  provider: 'all',
  roomTypes: [],
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  floorMin: '',
  floorMax: '',
  notFirstFloor: false,
  notLastFloor: false,
  districts: [],
  search: '',
  sortBy: 'price_asc',
};

function formatRequestSummary(req) {
  if (!req) return '';
  const parts = [];
  if (Array.isArray(req.rooms) && req.rooms.length > 0) {
    parts.push(
      req.rooms
        .map((r) => (r === 0 || r === 'studio' ? 'Ст' : `${r}к`))
        .join(', ')
    );
  }
  if (req.budget_min || req.budget_max) {
    const minStr = req.budget_min ? `от ${formatNumber(req.budget_min)}` : '';
    const maxStr = req.budget_max ? `до ${formatNumber(req.budget_max)}` : '';
    parts.push(`${[minStr, maxStr].filter(Boolean).join(' ')} ₽`);
  }
  if (req.area_min || req.area_max) {
    const minA = req.area_min ? `от ${req.area_min}` : '';
    const maxA = req.area_max ? `до ${req.area_max}` : '';
    parts.push(`${[minA, maxA].filter(Boolean).join(' ')} м²`);
  }
  if (req.not_first_floor) parts.push('не 1-й эт.');
  if (Array.isArray(req.districts) && req.districts.length > 0) {
    parts.push(req.districts.join(', '));
  }
  return parts.join(' · ');
}

export function LiveLotsFinder({
  ksmLots = [],
  ksskLots = [],
  kinoLots = [],
  developments = [],
  onOpenDetail = () => {},
  onFocusHouseOnMap = null,
  onSyncAll = null,
  isSyncingAny = false,
}) {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();

  const clients = useMemo(() => state.clients || [], [state.clients]);
  const requests = useMemo(() => state.requests || [], [state.requests]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [viewMode, setViewMode] = useState('layouts'); // 'layouts' | 'all'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedLotUids, setSelectedLotUids] = useState(() => new Set());
  const [addedLotUids, setAddedLotUids] = useState({});
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [previewPlanLot, setPreviewPlanLot] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const clientRequestMap = useMemo(() => {
    const map = new Map();
    for (const c of clients) {
      if (!c?.id) continue;
      const req = findActiveBuyerRequestForClient(requests, c.id);
      if (req) map.set(c.id, req);
    }
    return map;
  }, [clients, requests]);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const activeClientRequest = useMemo(
    () => (selectedClientId ? clientRequestMap.get(selectedClientId) || null : null),
    [clientRequestMap, selectedClientId]
  );

  const mergedLots = useMemo(
    () => mergeAllDeveloperLots({ ksmLots, ksskLots, kinoLots, developments }),
    [ksmLots, ksskLots, kinoLots, developments]
  );

  const filteredLots = useMemo(
    () => filterFinderLots(mergedLots, filters),
    [mergedLots, filters]
  );

  const layoutGroups = useMemo(
    () => groupLotsByLayout(filteredLots),
    [filteredLots]
  );

  const availableDistricts = useMemo(() => {
    const set = new Set(KIROV_DISTRICTS.map((d) => d.name));
    for (const lot of mergedLots) {
      if (lot._district) set.add(lot._district);
    }
    return Array.from(set);
  }, [mergedLots]);

  const lotsByUid = useMemo(() => {
    const map = new Map();
    for (const lot of mergedLots) {
      map.set(lot._uid, lot);
    }
    return map;
  }, [mergedLots]);

  const applyClientRequest = (req) => {
    const mapped = requestToFinderFilters(req);
    if (!mapped) return;
    setFilters((prev) => ({
      ...prev,
      ...mapped,
    }));
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    const req = clientId ? clientRequestMap.get(clientId) : null;
    if (req) {
      applyClientRequest(req);
      toast.info('Фильтры настроены по активному запросу клиента');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const toggleRoomType = (roomId) => {
    setFilters((prev) => {
      const exists = prev.roomTypes.includes(roomId);
      const nextRooms = exists
        ? prev.roomTypes.filter((r) => r !== roomId)
        : [...prev.roomTypes, roomId];
      return { ...prev, roomTypes: nextRooms };
    });
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.provider !== 'all' ||
      filters.roomTypes.length > 0 ||
      Boolean(filters.priceMin) ||
      Boolean(filters.priceMax) ||
      Boolean(filters.areaMin) ||
      Boolean(filters.areaMax) ||
      Boolean(filters.floorMin) ||
      Boolean(filters.floorMax) ||
      filters.notFirstFloor ||
      filters.notLastFloor ||
      filters.districts.length > 0 ||
      Boolean(filters.search.trim())
    );
  }, [filters]);

  const toggleGroupExpanded = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleLotSelected = (uid) => {
    setSelectedLotUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const toggleGroupSelection = (group) => {
    const groupUids = group.lots.map((l) => l._uid);
    const allSelected = groupUids.every((uid) => selectedLotUids.has(uid));
    setSelectedLotUids((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupUids.forEach((uid) => next.delete(uid));
      } else {
        groupUids.forEach((uid) => next.add(uid));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedLotUids(new Set());
  };

  const handleAddSingleLot = async (lot) => {
    try {
      const item = buildSelectionItemFromLot({
        lot,
        dev: lot._dev,
        providerLabel: lot._providerLabel,
        providerId: lot._provider,
        clientId: selectedClientId || null,
        realtorId: state.currentUser?.id || null,
      });

      await dispatch({ type: 'ADD_SELECTION_ITEM', item });
      setAddedLotUids((prev) => ({ ...prev, [lot._uid]: true }));
      toast.success(
        activeClient
          ? `Лот ${lot.flat_number ? `кв. ${lot.flat_number} ` : ''}добавлен в подборку для ${activeClient.full_name}`
          : `Лот ${lot.flat_number ? `кв. ${lot.flat_number} ` : ''}добавлен в общие подборки!`
      );
    } catch (err) {
      console.error('[LiveLotsFinder add single error]', err);
      toast.error('Ошибка добавления лота в подборку: ' + err.message);
    }
  };

  const handleBulkAddToSelection = async () => {
    const uids = Array.from(selectedLotUids);
    if (uids.length === 0 || isBulkAdding) return;

    setIsBulkAdding(true);
    try {
      const selectedLots = uids.map((uid) => lotsByUid.get(uid)).filter(Boolean);
      await Promise.all(
        selectedLots.map((lot) => {
          const item = buildSelectionItemFromLot({
            lot,
            dev: lot._dev,
            providerLabel: lot._providerLabel,
            providerId: lot._provider,
            clientId: selectedClientId || null,
            realtorId: state.currentUser?.id || null,
          });
          return dispatch({ type: 'ADD_SELECTION_ITEM', item });
        })
      );

      setAddedLotUids((prev) => {
        const next = { ...prev };
        selectedLots.forEach((l) => {
          next[l._uid] = true;
        });
        return next;
      });
      setSelectedLotUids(new Set());
      toast.success(
        activeClient
          ? `Добавлено ${selectedLots.length} кв. в подборку для ${activeClient.full_name}`
          : `Добавлено ${selectedLots.length} кв. в общие подборки!`
      );
    } catch (err) {
      console.error('[LiveLotsFinder bulk add error]', err);
      toast.error('Ошибка массового добавления в подборку: ' + err.message);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const visibleGroups = useMemo(
    () => layoutGroups.slice(0, visibleCount),
    [layoutGroups, visibleCount]
  );

  const visibleLots = useMemo(
    () => filteredLots.slice(0, visibleCount),
    [filteredLots, visibleCount]
  );

  const selectedCount = selectedLotUids.size;

  return (
    <div className="llf-container">
      {/* Top Bar: Client Selector + View Mode Toggle + Sync */}
      <div className="llf-top-bar">
        <div className="llf-client-block">
          <div className="llf-client-select-wrap">
            <UserCheck size={16} className="llf-icon-primary" />
            <select
              className="llf-client-select"
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              aria-label="Выбор клиента и запроса"
            >
              <option value="">Выбор клиента / Запрос (общая подборка)</option>
              {clients.map((c) => {
                const hasReq = clientRequestMap.has(c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.full_name || 'Клиент'}
                    {c.phones && c.phones[0] ? ` (${c.phones[0]})` : ''}
                    {hasReq ? ' - активный запрос' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {activeClientRequest && (
            <div className="llf-request-pill">
              <Sparkles size={14} className="llf-icon-emerald" />
              <span className="llf-request-summary" title={formatRequestSummary(activeClientRequest)}>
                Запрос: {formatRequestSummary(activeClientRequest) || 'параметры заданы'}
              </span>
              <button
                type="button"
                className="llf-btn-apply-req"
                onClick={() => {
                  applyClientRequest(activeClientRequest);
                  toast.success('Применены параметры запроса клиента');
                }}
              >
                Подобрать по запросу
              </button>
            </div>
          )}
        </div>

        <div className="llf-top-right">
          <div className="llf-view-toggle" role="tablist" aria-label="Режим отображения лотов">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'layouts'}
              className={`llf-view-btn ${viewMode === 'layouts' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('layouts');
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
            >
              <Layers size={15} />
              <span>По планировкам ({layoutGroups.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'all'}
              className={`llf-view-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('all');
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
            >
              <List size={15} />
              <span>Все квартиры ({filteredLots.length})</span>
            </button>
          </div>

          {onSyncAll && (
            <button
              type="button"
              className="llf-btn-sync"
              onClick={onSyncAll}
              disabled={isSyncingAny}
              title="Обновить свободные квартиры от КСМ и КССК"
            >
              {isSyncingAny ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              <span>{isSyncingAny ? 'Синхронизация...' : 'Обновить лоты'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Fast Filters Row */}
      <div className="llf-filters-card">
        <div className="llf-filters-row-primary">
          {/* Developer switch */}
          <div className="llf-seg-group" aria-label="Застройщик">
            {[
              { id: 'all', label: 'Все' },
              { id: 'ksm', label: 'КСМ' },
              { id: 'kssk', label: 'КССК' },
              { id: 'kino', label: 'КИНО' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`llf-seg-btn ${filters.provider === p.id ? 'active' : ''}`}
                onClick={() => updateFilter('provider', p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Room type multi-select chips */}
          <div className="llf-room-chips" aria-label="Комнатность">
            {ROOM_FILTER_OPTIONS.map((rf) => {
              const active = filters.roomTypes.includes(rf.id);
              return (
                <button
                  key={rf.id}
                  type="button"
                  className={`llf-room-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleRoomType(rf.id)}
                >
                  {rf.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="llf-search-wrap">
            <Search size={14} className="llf-search-icon" />
            <input
              type="text"
              className="llf-search-input"
              placeholder="Поиск: ЖК, улица, № кв., отделка..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
            {filters.search && (
              <button
                type="button"
                className="llf-search-clear"
                onClick={() => updateFilter('search', '')}
                aria-label="Очистить поиск"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            className="llf-sort-select"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            aria-label="Сортировка"
          >
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="price_sqm_asc">Дешевле за м²</option>
            <option value="area_asc">Меньше площадь</option>
            <option value="area_desc">Больше площадь</option>
            <option value="floor_asc">Этаж по возрастанию</option>
          </select>
        </div>

        <div className="llf-filters-row-secondary">
          <div className="llf-range-group">
            <span className="llf-range-label">Бюджет, ₽</span>
            <input
              type="number"
              className="llf-num-input llf-num-price"
              placeholder="от"
              value={filters.priceMin}
              onChange={(e) => updateFilter('priceMin', e.target.value)}
              min="0"
            />
            <span className="llf-range-sep">-</span>
            <input
              type="number"
              className="llf-num-input llf-num-price"
              placeholder="до"
              value={filters.priceMax}
              onChange={(e) => updateFilter('priceMax', e.target.value)}
              min="0"
            />
          </div>

          <div className="llf-range-group">
            <span className="llf-range-label">Площадь, м²</span>
            <input
              type="number"
              className="llf-num-input llf-num-small"
              placeholder="от"
              value={filters.areaMin}
              onChange={(e) => updateFilter('areaMin', e.target.value)}
              min="0"
              step="0.5"
            />
            <span className="llf-range-sep">-</span>
            <input
              type="number"
              className="llf-num-input llf-num-small"
              placeholder="до"
              value={filters.areaMax}
              onChange={(e) => updateFilter('areaMax', e.target.value)}
              min="0"
              step="0.5"
            />
          </div>

          <div className="llf-range-group">
            <span className="llf-range-label">Этаж</span>
            <input
              type="number"
              className="llf-num-input llf-num-tiny"
              placeholder="от"
              value={filters.floorMin}
              onChange={(e) => updateFilter('floorMin', e.target.value)}
              min="1"
            />
            <span className="llf-range-sep">-</span>
            <input
              type="number"
              className="llf-num-input llf-num-tiny"
              placeholder="до"
              value={filters.floorMax}
              onChange={(e) => updateFilter('floorMax', e.target.value)}
              min="1"
            />
          </div>

          <label className="llf-check-label">
            <input
              type="checkbox"
              checked={filters.notFirstFloor}
              onChange={(e) => updateFilter('notFirstFloor', e.target.checked)}
            />
            <span>Не 1-й</span>
          </label>

          <label className="llf-check-label">
            <input
              type="checkbox"
              checked={filters.notLastFloor}
              onChange={(e) => updateFilter('notLastFloor', e.target.checked)}
            />
            <span>Не посл.</span>
          </label>

          <select
            className="llf-district-select"
            value={filters.districts.length === 1 ? filters.districts[0] : filters.districts.length > 1 ? '__multi__' : ''}
            onChange={(e) => {
              const val = e.target.value;
              updateFilter('districts', val ? [val] : []);
            }}
            aria-label="Район"
          >
            <option value="">Все районы</option>
            {filters.districts.length > 1 && (
              <option value="__multi__">
                Выбрано районов: {filters.districts.length}
              </option>
            )}
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="llf-btn-reset"
              onClick={handleResetFilters}
            >
              <RotateCcw size={13} />
              <span>Сбросить</span>
            </button>
          )}
        </div>
      </div>

      {/* Sticky Multi-Select Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="llf-sticky-bulk-bar">
          <div className="llf-bulk-info">
            <CheckSquare size={18} className="llf-icon-emerald" />
            <strong>Выбрано {selectedCount} кв.</strong>
            {activeClient && (
              <span className="llf-bulk-client">для клиента: {activeClient.full_name}</span>
            )}
          </div>
          <div className="llf-bulk-actions">
            <button
              type="button"
              className="llf-btn-clear-sel"
              onClick={clearSelection}
              disabled={isBulkAdding}
            >
              Снять выбор
            </button>
            <button
              type="button"
              className="llf-btn-bulk-add"
              onClick={handleBulkAddToSelection}
              disabled={isBulkAdding}
            >
              {isBulkAdding ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <PlusCircle size={15} />
              )}
              <span>
                {isBulkAdding ? 'Добавление...' : 'Добавить в подборку клиенту'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Results Content */}
      {mergedLots.length === 0 ? (
        <div className="llf-empty-state">
          <Building2 size={36} className="llf-empty-icon" />
          <h3>Live-лоты застройщиков еще не загружены</h3>
          <p>
            Нажмите «Обновить лоты», чтобы загрузить актуальные свободные квартиры КСМ и КССК.
          </p>
          {onSyncAll && (
            <button
              type="button"
              className="llf-btn-sync"
              onClick={onSyncAll}
              disabled={isSyncingAny}
            >
              {isSyncingAny ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span>{isSyncingAny ? 'Синхронизация...' : 'Обновить лоты сейчас'}</span>
            </button>
          )}
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="llf-empty-state">
          <Search size={32} className="llf-empty-icon" />
          <h3>По выбранным фильтрам квартиры не найдены</h3>
          <p>Попробуйте расширить бюджет, площадь или сбросить часть фильтров.</p>
          <button type="button" className="llf-btn-reset" onClick={handleResetFilters}>
            <RotateCcw size={14} />
            <span>Сбросить фильтры</span>
          </button>
        </div>
      ) : viewMode === 'layouts' ? (
        <div className="llf-layouts-grid">
          {visibleGroups.map((group) => {
            const isExpanded = Boolean(expandedGroups[group.groupKey]);
            const selectedInGroup = group.lots.filter((l) => selectedLotUids.has(l._uid)).length;
            const allInGroupSelected = selectedInGroup === group.count && group.count > 0;

            return (
              <div key={group.groupKey} className={`llf-layout-card ${selectedInGroup > 0 ? 'has-selected' : ''}`}>
                <div className="llf-layout-top">
                  <div
                    className={`llf-plan-thumb ${group.planImage ? 'clickable' : ''}`}
                    onClick={() => {
                      if (group.planImage) setPreviewPlanLot(group.representativeLot);
                    }}
                    title={group.planImage ? 'Увеличить планировку' : 'Планировка отсутствует'}
                  >
                    {group.planImage ? (
                      <>
                        <img src={group.planImage} alt={group.roomsLabel} loading="lazy" />
                        <span className="llf-plan-zoom-badge">
                          <ZoomIn size={12} />
                        </span>
                      </>
                    ) : (
                      <Home size={28} className="llf-muted-icon" />
                    )}
                  </div>

                  <div className="llf-layout-main">
                    <div className="llf-badges-row">
                      <span className={`llf-provider-badge ${group.provider || 'ksm'}`}>
                        {group.providerLabel || 'КСМ'}
                      </span>
                      <span className="llf-rooms-area">
                        {group.roomsLabel}
                        {group.area ? ` · ${group.area} м²` : ''}
                      </span>
                      {group.finishing && (
                        <span className="llf-finishing-badge">{group.finishing}</span>
                      )}
                    </div>

                    <div className="llf-dev-row">
                      {group.dev ? (
                        <button
                          type="button"
                          className="llf-dev-link-btn"
                          onClick={() => onOpenDetail(group.dev)}
                        >
                          {group.devName || group.dev.name}
                        </button>
                      ) : (
                        <span className="llf-dev-name">{group.devName || 'ЖК'}</span>
                      )}
                      {group.dev?.completion_date && (
                        <span className="llf-completion-tag">{group.dev.completion_date}</span>
                      )}
                    </div>

                    <div className="llf-address-row">
                      <span className="llf-address-text">{group.address || 'Адрес уточняется'}</span>
                      {onFocusHouseOnMap && (
                        <button
                          type="button"
                          className="llf-btn-map"
                          onClick={() => onFocusHouseOnMap(group.representativeLot, group.dev)}
                        >
                          <MapPin size={12} />
                          <span>На карте</span>
                        </button>
                      )}
                    </div>

                    <div className="llf-price-availability">
                      <div className="llf-price-block">
                        <strong className="llf-price-main">
                          {group.minPrice ? `от ${formatNumber(group.minPrice)} ₽` : 'По запросу'}
                        </strong>
                        {group.minPriceSqm && (
                          <span className="llf-price-sqm">
                            от {formatNumber(group.minPriceSqm)} ₽/м²
                          </span>
                        )}
                      </div>

                      <div className="llf-avail-meta">
                        <span className="llf-count-pill">
                          {group.count} кв. в наличии
                          {group.floorsSummary ? ` · ${group.floorsSummary}` : ''}
                          {group.count === 1 && group.representativeLot?.flat_number
                            ? `, кв. ${group.representativeLot.flat_number}`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout Footer Actions */}
                <div className="llf-layout-footer">
                  <button
                    type="button"
                    className={`llf-btn-check-group ${allInGroupSelected ? 'active' : ''}`}
                    onClick={() => toggleGroupSelection(group)}
                    title={allInGroupSelected ? 'Снять выбор со всех квартир планировки' : 'Выбрать все квартиры этой планировки'}
                  >
                    {allInGroupSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    <span>
                      {group.count === 1
                        ? (allInGroupSelected ? 'Выбрано' : 'Выбрать')
                        : selectedInGroup > 0
                          ? `Выбрано ${selectedInGroup}/${group.count}`
                          : `Выбрать все (${group.count})`}
                    </span>
                  </button>

                  {group.count === 1 ? (
                    <div className="llf-single-lot-actions">
                      {group.representativeLot.lot_url && (
                        <a
                          href={group.representativeLot.lot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="llf-ext-link"
                          title="Открыть на сайте застройщика"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        className={`llf-btn-add ${addedLotUids[group.representativeLot._uid] ? 'added' : ''}`}
                        onClick={() => handleAddSingleLot(group.representativeLot)}
                      >
                        {addedLotUids[group.representativeLot._uid] ? (
                          <>
                            <Check size={14} />
                            <span>Добавлено</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={14} />
                            <span>В подборку</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="llf-btn-expand-floors"
                      onClick={() => toggleGroupExpanded(group.groupKey)}
                    >
                      <span>{isExpanded ? 'Скрыть этажи' : `Этажи (${group.count})`}</span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                </div>

                {/* Expandable Floor-by-Floor Rows */}
                {isExpanded && group.count > 1 && (
                  <div className="llf-floors-drawer">
                    {group.lots.map((lot) => {
                      const isChecked = selectedLotUids.has(lot._uid);
                      const isAdded = Boolean(addedLotUids[lot._uid]);
                      return (
                        <div
                          key={lot._uid}
                          className={`llf-floor-row ${isChecked ? 'checked' : ''}`}
                        >
                          <label className="llf-floor-check">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLotSelected(lot._uid)}
                            />
                            <span className="llf-floor-badge">
                              {lot.floor ? `${lot.floor} эт.` : 'Этаж -'}
                            </span>
                            <span className="llf-flat-num">
                              {lot.flat_number ? `кв. ${lot.flat_number}` : `ID ${lot.id}`}
                            </span>
                          </label>

                          <div className="llf-floor-price">
                            <strong>{lot.price ? `${formatNumber(lot.price)} ₽` : 'По запросу'}</strong>
                            {lot.price_sqm && (
                              <span>{formatNumber(lot.price_sqm)} ₽/м²</span>
                            )}
                          </div>

                          <div className="llf-floor-actions">
                            {lot.lot_url && (
                              <a
                                href={lot.lot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="llf-ext-link"
                                title="Открыть на сайте застройщика"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              type="button"
                              className={`llf-btn-add compact ${isAdded ? 'added' : ''}`}
                              onClick={() => handleAddSingleLot(lot)}
                            >
                              {isAdded ? <Check size={13} /> : <PlusCircle size={13} />}
                              <span>{isAdded ? 'Добавлено' : 'В подборку'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="llf-flat-list">
          {visibleLots.map((lot) => {
            const isChecked = selectedLotUids.has(lot._uid);
            const isAdded = Boolean(addedLotUids[lot._uid]);
            return (
              <div key={lot._uid} className={`llf-flat-row ${isChecked ? 'checked' : ''}`}>
                <label className="llf-flat-checkbox-wrap" aria-label={`Выбрать лот ${lot.flat_number || lot.id}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLotSelected(lot._uid)}
                  />
                </label>

                <div
                  className={`llf-flat-plan ${lot.plan_image ? 'clickable' : ''}`}
                  onClick={() => {
                    if (lot.plan_image) setPreviewPlanLot(lot);
                  }}
                >
                  {lot.plan_image ? (
                    <img src={lot.plan_image} alt={lot.title} loading="lazy" />
                  ) : (
                    <Home size={20} className="llf-muted-icon" />
                  )}
                </div>

                <div className="llf-flat-main">
                  <div className="llf-badges-row">
                    <span className={`llf-provider-badge ${lot._provider}`}>
                      {lot._providerLabel}
                    </span>
                    <strong className="llf-flat-title">{lot.title}</strong>
                    {lot.finishing && (
                      <span className="llf-finishing-badge">{lot.finishing}</span>
                    )}
                  </div>

                  <div className="llf-flat-meta">
                    {lot._dev ? (
                      <button
                        type="button"
                        className="llf-dev-link-btn"
                        onClick={() => onOpenDetail(lot._dev)}
                      >
                        {lot._devName}
                      </button>
                    ) : (
                      <span>{lot._devName}</span>
                    )}
                    <span>-</span>
                    <span>{lot.flat_number ? `кв. ${lot.flat_number}` : `ID ${lot.id}`}</span>
                    <span>-</span>
                    <span>Этаж {lot.floor || '-'}</span>
                    {lot.address && (
                      <>
                        <span>-</span>
                        <span>{lot.address}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="llf-flat-price-col">
                  <div className="llf-price-main">
                    {lot.price ? `${formatNumber(lot.price)} ₽` : 'По запросу'}
                  </div>
                  {lot.price_sqm && (
                    <div className="llf-price-sqm">
                      {formatNumber(lot.price_sqm)} ₽/м²
                    </div>
                  )}
                </div>

                <div className="llf-flat-actions">
                  {onFocusHouseOnMap && (
                    <button
                      type="button"
                      className="llf-btn-map"
                      onClick={() => onFocusHouseOnMap(lot, lot._dev)}
                      title="Показать дом на карте"
                    >
                      <MapPin size={12} />
                      <span>На карте</span>
                    </button>
                  )}
                  {lot.lot_url && (
                    <a
                      href={lot.lot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="llf-ext-link"
                      title="Открыть на сайте застройщика"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    className={`llf-btn-add ${isAdded ? 'added' : ''}`}
                    onClick={() => handleAddSingleLot(lot)}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} />
                        <span>Добавлено</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>В подборку</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show More Pagination */}
      {(viewMode === 'layouts' ? layoutGroups.length : filteredLots.length) > visibleCount && (
        <div className="llf-load-more-wrap">
          <button
            type="button"
            className="llf-btn-load-more"
            onClick={() => setVisibleCount((prev) => prev + INITIAL_VISIBLE_COUNT)}
          >
            Показать еще (осталось {(viewMode === 'layouts' ? layoutGroups.length : filteredLots.length) - visibleCount})
          </button>
        </div>
      )}

      {/* Plan Lightbox */}
      {previewPlanLot && (
        <div className="llf-lightbox" onClick={() => setPreviewPlanLot(null)}>
          <div className="llf-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="llf-lightbox-head">
              <div>
                <strong>
                  {previewPlanLot.title}
                  {previewPlanLot.flat_number ? ` - кв. № ${previewPlanLot.flat_number}` : ''}
                </strong>
                {previewPlanLot._devName && (
                  <div className="llf-lightbox-sub">
                    {previewPlanLot._devName}
                    {previewPlanLot.address ? ` · ${previewPlanLot.address}` : ''}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="llf-lightbox-close"
                onClick={() => setPreviewPlanLot(null)}
                aria-label="Закрыть планировку"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={previewPlanLot.plan_image}
              alt={previewPlanLot.title}
              className="llf-lightbox-img"
            />
          </div>
        </div>
      )}

      <style>{`
        .llf-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 24px;
        }
        .llf-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 12px 16px;
        }
        .dark .llf-top-bar {
          background: #1e293b;
          border-color: #334155;
        }
        .llf-client-block {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          flex: 1;
          min-width: 260px;
        }
        .llf-client-select-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 7px 12px;
          min-width: 260px;
          max-width: 100%;
        }
        .dark .llf-client-select-wrap {
          background: #0f172a;
          border-color: #334155;
        }
        .llf-client-select {
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #0f172a);
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .dark .llf-client-select {
          color: #f1f5f9;
        }
        .llf-request-pill {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 10px;
          padding: 5px 10px;
          font-size: 12px;
          color: #065f46;
        }
        .dark .llf-request-pill {
          background: #064e3b;
          border-color: #059669;
          color: #a7f3d0;
        }
        .llf-request-summary {
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
        .llf-btn-apply-req {
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 7px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .llf-btn-apply-req:hover {
          background: #047857;
        }
        .llf-top-right {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .llf-view-toggle {
          display: inline-flex;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 3px;
          gap: 3px;
        }
        .dark .llf-view-toggle {
          background: #0f172a;
          border-color: #334155;
        }
        .llf-view-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: transparent;
          color: var(--text-secondary, #475569);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dark .llf-view-btn {
          color: #94a3b8;
        }
        .llf-view-btn.active {
          background: var(--primary, #0052FF);
          color: #ffffff;
        }
        .llf-btn-sync {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .llf-btn-sync:hover:not(:disabled) {
          background: #047857;
        }
        .llf-btn-sync:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .llf-filters-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dark .llf-filters-card {
          background: #1e293b;
          border-color: #334155;
        }
        .llf-filters-row-primary,
        .llf-filters-row-secondary {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .llf-seg-group {
          display: inline-flex;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          padding: 2px;
        }
        .dark .llf-seg-group {
          background: #0f172a;
          border-color: #334155;
        }
        .llf-seg-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary, #475569);
          padding: 5px 10px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-seg-btn {
          color: #94a3b8;
        }
        .llf-seg-btn.active {
          background: var(--surface, #ffffff);
          color: var(--primary, #0052FF);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .dark .llf-seg-btn.active {
          background: #334155;
          color: #60a5fa;
        }
        .llf-room-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .llf-room-chip {
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          color: var(--text-secondary, #475569);
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dark .llf-room-chip {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-room-chip.active {
          background: #eff6ff;
          border-color: var(--primary, #0052FF);
          color: var(--primary, #0052FF);
        }
        .dark .llf-room-chip.active {
          background: #1e3a8a;
          border-color: #60a5fa;
          color: #bfdbfe;
        }
        .llf-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 210px;
        }
        .llf-search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted, #94a3b8);
          pointer-events: none;
        }
        .llf-search-input {
          width: 100%;
          padding: 6px 28px 6px 30px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 9px;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .llf-search-input {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .llf-search-clear {
          position: absolute;
          right: 7px;
          background: none;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          display: flex;
          padding: 2px;
        }
        .llf-sort-select,
        .llf-district-select {
          padding: 6px 10px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 9px;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .llf-sort-select,
        .dark .llf-district-select {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .llf-range-group {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          padding: 4px 8px;
        }
        .dark .llf-range-group {
          background: #0f172a;
          border-color: #334155;
        }
        .llf-range-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #94a3b8);
          margin-right: 2px;
        }
        .llf-num-input {
          border: none;
          background: transparent;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .llf-num-input {
          color: #f1f5f9;
        }
        .llf-num-price { width: 78px; }
        .llf-num-small { width: 46px; }
        .llf-num-tiny { width: 36px; }
        .llf-range-sep {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .llf-check-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #475569);
          cursor: pointer;
          user-select: none;
        }
        .dark .llf-check-label {
          color: #cbd5e1;
        }
        .llf-btn-reset {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          padding: 6px 10px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-btn-reset {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-sticky-bulk-bar {
          position: sticky;
          top: 10px;
          z-index: 40;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
        }
        .llf-bulk-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .llf-bulk-client {
          font-size: 12px;
          color: #cbd5e1;
        }
        .llf-bulk-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .llf-btn-clear-sel {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .llf-btn-bulk-add {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .llf-btn-bulk-add:hover:not(:disabled) {
          background: #10b981;
        }
        .llf-layouts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
          gap: 14px;
        }
        @media (max-width: 520px) {
          .llf-layouts-grid {
            grid-template-columns: 1fr;
          }
        }
        .llf-layout-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dark .llf-layout-card {
          background: #1e293b;
          border-color: #334155;
        }
        .llf-layout-card.has-selected {
          border-color: #059669;
          box-shadow: 0 0 0 1px #059669;
        }
        .llf-layout-top {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        @media (max-width: 480px) {
          .llf-layout-top {
            flex-direction: column;
          }
        }
        .llf-plan-thumb {
          position: relative;
          width: 118px;
          height: 118px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid var(--border, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .dark .llf-plan-thumb {
          border-color: #334155;
        }
        .llf-plan-thumb.clickable {
          cursor: zoom-in;
        }
        .llf-plan-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }
        .llf-plan-zoom-badge {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.68);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .llf-layout-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .llf-badges-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .llf-provider-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .llf-provider-badge.ksm {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .llf-provider-badge.kssk {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .llf-provider-badge.kino {
          background: #f5f3ff;
          color: #6d28d9;
          border: 1px solid #ddd6fe;
        }
        .dark .llf-provider-badge.ksm {
          background: #064e3b;
          color: #a7f3d0;
          border-color: #059669;
        }
        .dark .llf-provider-badge.kssk {
          background: #1e3a8a;
          color: #bfdbfe;
          border-color: #2563eb;
        }
        .dark .llf-provider-badge.kino {
          background: #4c1d95;
          color: #ddd6fe;
          border-color: #7c3aed;
        }
        .llf-rooms-area {
          font-size: 14px;
          font-weight: 700;
          color: var(--text, #0f172a);
        }
        .dark .llf-rooms-area {
          color: #f1f5f9;
        }
        .llf-finishing-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
        }
        .dark .llf-finishing-badge {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-dev-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .llf-dev-link-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary, #0052FF);
          cursor: pointer;
          text-align: left;
        }
        .llf-dev-link-btn:hover {
          text-decoration: underline;
        }
        .dark .llf-dev-link-btn {
          color: #60a5fa;
        }
        .llf-dev-name {
          font-size: 13px;
          font-weight: 700;
        }
        .llf-completion-tag {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .llf-address-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .dark .llf-address-row {
          color: #94a3b8;
        }
        .llf-btn-map {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--primary, #0052FF);
          padding: 3px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-btn-map {
          background: #0f172a;
          border-color: #334155;
          color: #60a5fa;
        }
        .llf-price-availability {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 2px;
        }
        .llf-price-block {
          display: flex;
          flex-direction: column;
        }
        .llf-price-main {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .llf-price-main {
          color: #60a5fa;
        }
        .llf-price-sqm {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .llf-count-pill {
          display: inline-block;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          padding: 4px 9px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary, #475569);
        }
        .dark .llf-count-pill {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-layout-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border-top: 1px solid var(--border-light, #f1f5f9);
          padding-top: 10px;
        }
        .dark .llf-layout-footer {
          border-top-color: #334155;
        }
        .llf-btn-check-group {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-btn-check-group {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-btn-check-group.active {
          background: #ecfdf5;
          border-color: #059669;
          color: #047857;
        }
        .dark .llf-btn-check-group.active {
          background: #064e3b;
          color: #a7f3d0;
        }
        .llf-single-lot-actions,
        .llf-flat-actions,
        .llf-floor-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .llf-btn-expand-floors {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-btn-expand-floors {
          background: #1e3a8a;
          color: #bfdbfe;
        }
        .llf-floors-drawer {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px dashed var(--border, #e2e8f0);
        }
        .dark .llf-floors-drawer {
          border-top-color: #334155;
        }
        .llf-floor-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 7px 10px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border-light, #f1f5f9);
          border-radius: 9px;
        }
        .dark .llf-floor-row {
          background: #0f172a;
          border-color: #334155;
        }
        .llf-floor-row.checked {
          border-color: #059669;
          background: #ecfdf5;
        }
        .dark .llf-floor-row.checked {
          background: #064e3b;
        }
        .llf-floor-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .llf-floor-badge {
          font-weight: 700;
          color: var(--text, #0f172a);
        }
        .dark .llf-floor-badge {
          color: #f1f5f9;
        }
        .llf-flat-num {
          color: var(--text-secondary, #475569);
        }
        .dark .llf-flat-num {
          color: #cbd5e1;
        }
        .llf-floor-price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 12px;
        }
        .llf-floor-price strong {
          color: var(--primary, #0052FF);
        }
        .dark .llf-floor-price strong {
          color: #60a5fa;
        }
        .llf-floor-price span {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .llf-ext-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--surface, #ffffff);
          color: var(--text-secondary, #475569);
          text-decoration: none;
        }
        .dark .llf-ext-link {
          background: #1e293b;
          border-color: #334155;
          color: #cbd5e1;
        }
        .llf-btn-add {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .llf-btn-add.compact {
          padding: 5px 9px;
          font-size: 11px;
        }
        .llf-btn-add:hover {
          background: var(--primary, #0052FF);
          color: #ffffff;
        }
        .llf-btn-add.added {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .llf-flat-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .llf-flat-row {
          display: grid;
          grid-template-columns: auto 58px 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
        }
        .dark .llf-flat-row {
          background: #1e293b;
          border-color: #334155;
        }
        .llf-flat-row.checked {
          border-color: #059669;
        }
        @media (max-width: 720px) {
          .llf-flat-row {
            grid-template-columns: auto 50px 1fr;
          }
          .llf-flat-price-col,
          .llf-flat-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }
        .llf-flat-checkbox-wrap {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .llf-flat-plan {
          width: 58px;
          height: 58px;
          border-radius: 9px;
          background: #ffffff;
          border: 1px solid var(--border, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .llf-flat-plan.clickable {
          cursor: zoom-in;
        }
        .llf-flat-plan img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .llf-flat-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .llf-flat-title {
          font-size: 13px;
          color: var(--text, #0f172a);
        }
        .dark .llf-flat-title {
          color: #f1f5f9;
        }
        .llf-flat-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .dark .llf-flat-meta {
          color: #94a3b8;
        }
        .llf-flat-price-col {
          text-align: right;
          white-space: nowrap;
        }
        .llf-empty-state {
          background: var(--surface, #ffffff);
          border: 1px dashed var(--border, #e2e8f0);
          border-radius: 16px;
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .dark .llf-empty-state {
          background: #1e293b;
          border-color: #334155;
        }
        .llf-empty-state h3 {
          margin: 0;
          font-size: 16px;
        }
        .llf-empty-state p {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: var(--text-secondary, #475569);
        }
        .llf-empty-icon,
        .llf-muted-icon {
          color: var(--text-muted, #94a3b8);
        }
        .llf-icon-primary { color: var(--primary, #0052FF); }
        .llf-icon-emerald { color: #059669; }
        .llf-load-more-wrap {
          display: flex;
          justify-content: center;
          padding-top: 8px;
        }
        .llf-btn-load-more {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text, #0f172a);
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .llf-btn-load-more {
          background: #1e293b;
          border-color: #334155;
          color: #f1f5f9;
        }
        .llf-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10030;
          padding: 20px;
        }
        .llf-lightbox-card {
          background: var(--surface, #ffffff);
          border-radius: 16px;
          padding: 16px;
          max-width: 720px;
          width: 100%;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dark .llf-lightbox-card {
          background: #1e293b;
          color: #f1f5f9;
        }
        .llf-lightbox-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
        }
        .llf-lightbox-sub {
          font-size: 12px;
          color: var(--text-secondary, #475569);
          margin-top: 2px;
        }
        .dark .llf-lightbox-sub {
          color: #94a3b8;
        }
        .llf-lightbox-close {
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .llf-lightbox-img {
          width: 100%;
          max-height: 70vh;
          object-fit: contain;
          background: #ffffff;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
