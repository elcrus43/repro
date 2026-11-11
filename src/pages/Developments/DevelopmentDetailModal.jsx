import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  ExternalLink, 
  Phone, 
  PlusCircle, 
  Check, 
  Home, 
  Layers, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  UserCheck,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { getKsmSlugForDevelopment, filterAndSortKsmLots } from '../../lib/ksmLots';
import { getKsskSlugForDevelopment } from '../../lib/ksskLots';

const KSM_ROOM_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'studio', label: 'Ст' },
  { id: '1k', label: '1к' },
  { id: '2k', label: '2к' },
  { id: '3k', label: '3к' },
  { id: '4k', label: '4к+' },
];

function mapRoomsTypeToCount(roomsType) {
  if (roomsType === 'studio') return 0;
  if (roomsType === '1k') return 1;
  if (roomsType === '2k') return 2;
  if (roomsType === '3k') return 3;
  if (roomsType === '4k') return 4;
  return null;
}

export function DevelopmentDetailModal({
  development,
  onClose = () => {},
  onSelectOnMap = () => {},
  ksmLots = [],
  ksmMeta = null,
  onSyncKsmProject = null,
  liveLots = null,
  liveMeta = null,
  liveProvider = null,
  onSyncLiveProject = null,
}) {
  const dev = development;
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addedApts, setAddedApts] = useState({});
  const [ksmRoomFilter, setKsmRoomFilter] = useState('all');
  const [ksmSearch, setKsmSearch] = useState('');
  const [ksmSortBy, setKsmSortBy] = useState('price_asc');
  const [isKsmSyncing, setIsKsmSyncing] = useState(false);
  const [addedKsmLots, setAddedKsmLots] = useState({});
  const [previewPlanLot, setPreviewPlanLot] = useState(null);

  const ksmSlug = getKsmSlugForDevelopment(dev);
  const ksskSlug = getKsskSlugForDevelopment(dev);
  const resolvedProvider = liveProvider || (
    ksmSlug
      ? {
          id: 'ksm',
          label: 'КСМ',
          slug: ksmSlug,
          subtitle: 'Прямые данные по свободным квартирам из кабинета застройщика КСМ',
        }
      : ksskSlug
        ? {
            id: 'kssk',
            label: 'КССК',
            slug: ksskSlug,
            subtitle: 'Актуальные свободные квартиры с сайта kvartiry.kssk.ru',
          }
        : null
  );
  const activeLots = Array.isArray(liveLots) ? liveLots : ksmLots;
  const activeMeta = liveMeta || ksmMeta;
  const activeSyncHandler = onSyncLiveProject || onSyncKsmProject;

  const filteredKsmLots = useMemo(
    () =>
      filterAndSortKsmLots(activeLots, {
        roomType: ksmRoomFilter,
        search: ksmSearch,
        sortBy: ksmSortBy,
      }),
    [activeLots, ksmRoomFilter, ksmSearch, ksmSortBy]
  );

  if (!dev) return null;

  const images = dev.images && dev.images.length > 0
    ? dev.images
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'];

  const clients = state.clients || [];

  const handleAddAptToSelection = async (apt) => {
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);

      const selectionItem = {
        id: `sel_dev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        realtor_id: state.currentUser?.id,
        client_id: selectedClientId || null,
        client_ids: selectedClientId ? [selectedClientId] : [],
        address: `${dev.name}, ${dev.address}`,
        city: 'Киров',
        price: apt.price_from,
        rooms: apt.type === 'studio' ? 0 : parseInt(apt.type),
        area_total: parseFloat(apt.area),
        property_type: 'apartment',
        market_type: 'new_building',
        images: images.slice(0, 3),
        notes: `Новостройка от ${dev.developer}. Срок: ${dev.completion_date}. За м²: ${formatNumber(apt.price_sqm)} ₽. ${dev.domrf_url ? `ЕИСЖС: ${dev.domrf_url}` : ''}`,
        link: dev.avito_url || dev.builder_url || dev.domrf_url,
        contact_name: `${dev.developer} (Отдел продаж)`,
        contact_phone: dev.contact_phone || null,
        created_at: new Date().toISOString()
      };

      await dispatch({ type: 'ADD_SELECTION_ITEM', item: selectionItem });
      
      setAddedApts(prev => ({ ...prev, [apt.type]: true }));
      toast.success(
        selectedClient
          ? `Добавлено в подборку для клиента ${selectedClient.full_name}`
          : 'Добавлено в общие подборки!'
      );
    } catch (err) {
      console.error('[Add to selection error]', err);
      toast.error('Ошибка добавления в подборку: ' + err.message);
    }
  };

  const handleSyncKsmLots = async () => {
    if (!resolvedProvider?.slug || !activeSyncHandler || isKsmSyncing) return;
    setIsKsmSyncing(true);
    try {
      await activeSyncHandler(resolvedProvider.slug);
    } catch {
      // Error toast already handled by parent
    } finally {
      setIsKsmSyncing(false);
    }
  };

  const handleAddKsmLotToSelection = async (lot) => {
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const providerId = resolvedProvider?.id || 'ksm';
      const providerLabel = resolvedProvider?.label || 'КСМ';
      const selectionItem = {
        id: `sel_${providerId}_${lot.id}_${Date.now()}`,
        realtor_id: state.currentUser?.id,
        client_id: selectedClientId || null,
        client_ids: selectedClientId ? [selectedClientId] : [],
        address: `${dev.name}, ${lot.address || dev.address}${lot.flat_number ? `, кв. ${lot.flat_number}` : ''}`,
        city: 'Киров',
        price: lot.price || dev.price_from || 0,
        rooms: mapRoomsTypeToCount(lot.rooms_type),
        floor: lot.floor || null,
        area_total: lot.area || null,
        property_type: 'apartment',
        market_type: 'new_building',
        images: lot.plan_image ? [lot.plan_image, ...images.slice(0, 2)] : images.slice(0, 3),
        notes: `${providerLabel} live: ${lot.title}${lot.finishing ? `, отделка: ${lot.finishing}` : ''}${lot.floor ? `, этаж ${lot.floor}` : ''}${lot.flat_number ? `, кв. ${lot.flat_number}` : ''}.${lot.price_sqm ? ` За м²: ${formatNumber(lot.price_sqm)} ₽.` : ''} Срок: ${dev.completion_date}.`,
        link: lot.lot_url || dev.builder_url || dev.avito_url,
        contact_name: `${dev.developer} (Отдел продаж)`,
        contact_phone: dev.contact_phone || null,
        created_at: new Date().toISOString(),
      };

      await dispatch({ type: 'ADD_SELECTION_ITEM', item: selectionItem });
      setAddedKsmLots((prev) => ({ ...prev, [lot.id]: true }));
      toast.success(
        selectedClient
          ? `Лот ${lot.flat_number ? `кв. ${lot.flat_number} ` : ''}добавлен в подборку для ${selectedClient.full_name}`
          : `Лот ${lot.flat_number ? `кв. ${lot.flat_number} ` : ''}добавлен в общие подборки!`
      );
    } catch (err) {
      console.error('[Add live lot to selection error]', err);
      toast.error('Ошибка добавления лота в подборку: ' + err.message);
    }
  };

  return (
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="dev-modal-header">
          <div className="dev-modal-title-wrap">
            <span className="dev-modal-dev-tag">{dev.developer || 'Застройщик'}</span>
            <h2 className="dev-modal-title">{dev.name}</h2>
          </div>
          <button className="dev-modal-close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="dev-modal-body">
          
          {/* Gallery Section */}
          <div className="dev-gallery-section">
            <div className="dev-gallery-main">
              <img src={images[activeImgIndex]} alt={dev.name} className="dev-gallery-main-img" />
              {images.length > 1 && (
                <>
                  <button
                    className="gallery-nav prev"
                    onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="gallery-nav next"
                    onClick={() => setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              <div className="gallery-badges">
                <span className="gallery-badge class-badge">{dev.housing_class || 'Комфорт'}</span>
                <span className="gallery-badge date-badge">{dev.completion_date || 'Срок сдачи уточняется'}</span>
              </div>
            </div>

            {images.length > 1 && (
              <div className="dev-gallery-thumbs">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${idx === activeImgIndex ? 'active' : ''}`}
                    onClick={() => setActiveImgIndex(idx)}
                  >
                    <img src={img} alt={`Рендер ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info & Action Bar */}
          <div className="dev-action-bar">
            <div className="dev-price-highlight">
              <span className="label">Цены на квартиры:</span>
              <span className="value">
                {dev.price_from ? `от ${formatNumber(dev.price_from)} ₽` : 'По запросу'}
                {dev.price_to ? ` до ${formatNumber(dev.price_to)} ₽` : ''}
              </span>
              {dev.price_sqm_from && (
                <span className="sub">от {formatNumber(dev.price_sqm_from)} ₽ за м²</span>
              )}
            </div>

            <div className="dev-cta-buttons">
              <button 
                type="button" 
                className="btn-map-locate"
                onClick={() => {
                  onSelectOnMap(dev.id);
                  onClose();
                }}
              >
                <MapPin size={16} />
                <span>Показать на карте Кирова</span>
              </button>

              {dev.contact_phone && (
                <a href={`tel:${dev.contact_phone}`} className="btn-call-dev">
                  <Phone size={15} />
                  <span>{dev.contact_phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Official Verification & Portals Links */}
          <div className="dev-portals-card">
            <div className="dev-portals-title">
              <ShieldCheck size={18} className="text-success" />
              <span>Официальные реестры и площадки новостройки:</span>
            </div>
            <div className="dev-portals-grid">
              {dev.domrf_url && (
                <a
                  href={dev.domrf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-link-btn domrf"
                >
                  <div className="portal-icon">🏛️</div>
                  <div className="portal-meta">
                    <strong>ЕИСЖС наш.дом.рф</strong>
                    <span>Проектная декларация • Эскроу • Разрешение</span>
                  </div>
                  <ExternalLink size={16} className="portal-arrow" />
                </a>
              )}

              {dev.avito_url && (
                <a
                  href={dev.avito_url}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-link-btn avito"
                >
                  <div className="portal-icon">🟦</div>
                  <div className="portal-meta">
                    <strong>Каталог на Авито</strong>
                    <span>Все объявления и лоты от застройщика</span>
                  </div>
                  <ExternalLink size={16} className="portal-arrow" />
                </a>
              )}

              {dev.builder_url && (
                <a
                  href={dev.builder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-link-btn builder"
                >
                  <div className="portal-icon">🌐</div>
                  <div className="portal-meta">
                    <strong>Официальный сайт</strong>
                    <span>Сайт застройщика «{dev.developer}»</span>
                  </div>
                  <ExternalLink size={16} className="portal-arrow" />
                </a>
              )}
            </div>
          </div>

          {/* Specs Grid */}
          <div className="dev-specs-grid">
            <div className="spec-card">
              <span className="spec-label">Адрес</span>
              <span className="spec-value">{dev.address}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Район / Микрорайон</span>
              <span className="spec-value">{dev.district} {dev.microdistrict ? `(${dev.microdistrict})` : ''}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Срок сдачи</span>
              <span className="spec-value">{dev.completion_date}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Класс жилья</span>
              <span className="spec-value">{dev.housing_class}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Этажность</span>
              <span className="spec-value">{dev.floors || '–'}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Материал стен</span>
              <span className="spec-value">{dev.wall_material || 'Кирпич-монолит'}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Варианты отделки</span>
              <span className="spec-value">
                {dev.finishing?.map(f => {
                  if (f === 'white_box') return 'White box';
                  if (f === 'turnkey') return 'Чистовая';
                  return 'Черновая';
                }).join(', ') || 'Черновая'}
              </span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Застройщик</span>
              <span className="spec-value font-bold">{dev.developer}</span>
            </div>
          </div>

          {/* Live Developer Lots Section (KSM / KSSK) */}
          {resolvedProvider && (
            <div className="dev-ksm-section">
              <div className="dev-ksm-header">
                <div className="dev-ksm-title-block">
                  <div className="dev-ksm-title-row">
                    <h3 className="section-title">Свободные лоты {resolvedProvider.label} (live)</h3>
                    <span className="dev-ksm-count-badge">
                      {activeLots.length} кв.
                    </span>
                  </div>
                  <p className="section-subtitle">
                    {activeMeta?.lastSyncedAt
                      ? `Обновлено: ${new Date(activeMeta.lastSyncedAt).toLocaleString('ru-RU')}`
                      : resolvedProvider.subtitle}
                  </p>
                </div>

                <div className="dev-ksm-header-actions">
                  {clients.length > 0 && (
                    <div className="client-selector-wrap">
                      <UserCheck size={15} className="text-muted" />
                      <select
                        className="client-select"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        aria-label="Выбор клиента для подборки"
                      >
                        <option value="">(Общая подборка)</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.full_name || 'Клиент'} {c.phones && c.phones[0] ? `(${c.phones[0]})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeSyncHandler && (
                    <button
                      type="button"
                      className="btn-sync-ksm-modal"
                      onClick={handleSyncKsmLots}
                      disabled={isKsmSyncing}
                    >
                      {isKsmSyncing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      <span>{isKsmSyncing ? 'Загрузка...' : `Обновить лоты ${resolvedProvider.label}`}</span>
                    </button>
                  )}
                </div>
              </div>

              {activeLots.length > 0 ? (
                <>
                  <div className="dev-ksm-filters">
                    <div className="dev-ksm-room-chips">
                      {KSM_ROOM_FILTERS.map((rf) => (
                        <button
                          key={rf.id}
                          type="button"
                          className={`ksm-room-chip ${ksmRoomFilter === rf.id ? 'active' : ''}`}
                          onClick={() => setKsmRoomFilter(rf.id)}
                        >
                          {rf.label}
                        </button>
                      ))}
                    </div>

                    <div className="dev-ksm-search-sort">
                      <div className="ksm-search-wrap">
                        <Search size={13} className="ksm-search-icon" />
                        <input
                          type="text"
                          className="ksm-search-input"
                          placeholder="Поиск по № кв., улице..."
                          value={ksmSearch}
                          onChange={(e) => setKsmSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="ksm-sort-select"
                        value={ksmSortBy}
                        onChange={(e) => setKsmSortBy(e.target.value)}
                      >
                        <option value="price_asc">Сначала дешевле</option>
                        <option value="price_desc">Сначала дороже</option>
                        <option value="area_asc">Меньше площадь</option>
                        <option value="floor_asc">Этаж по возрастанию</option>
                      </select>
                    </div>
                  </div>

                  <div className="dev-ksm-lots-list">
                    {filteredKsmLots.length > 0 ? (
                      filteredKsmLots.map((lot) => {
                        const isAdded = Boolean(addedKsmLots[lot.id]);
                        return (
                          <div key={lot.id} className="dev-ksm-lot-row">
                            <div
                              className={`ksm-lot-plan ${lot.plan_image ? 'clickable' : ''}`}
                              onClick={() => {
                                if (lot.plan_image) setPreviewPlanLot(lot);
                              }}
                              title={lot.plan_image ? 'Открыть планировку' : 'Планировка отсутствует'}
                            >
                              {lot.plan_image ? (
                                <img src={lot.plan_image} alt={lot.title} loading="lazy" />
                              ) : (
                                <Home size={20} className="text-muted" />
                              )}
                            </div>

                            <div className="ksm-lot-main">
                              <div className="ksm-lot-title-line">
                                <strong className="ksm-lot-title">{lot.title}</strong>
                                {lot.finishing && (
                                  <span className="ksm-lot-finishing">{lot.finishing}</span>
                                )}
                              </div>
                              <div className="ksm-lot-meta-line">
                                {lot.flat_number ? (
                                  <span>№ {lot.flat_number}</span>
                                ) : (
                                  <span>ID {lot.id}</span>
                                )}
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

                            <div className="ksm-lot-price-col">
                              <div className="ksm-lot-price">
                                {lot.price ? `${formatNumber(lot.price)} ₽` : 'По запросу'}
                              </div>
                              {lot.price_sqm && (
                                <div className="ksm-lot-price-sqm">
                                  от {formatNumber(lot.price_sqm)} ₽/м²
                                </div>
                              )}
                            </div>

                            <div className="ksm-lot-actions">
                              {lot.lot_url && (
                                <a
                                  href={lot.lot_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ksm-lot-ext-link"
                                  title={`Открыть лот на сайте ${resolvedProvider.label}`}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className={`btn-add-table-sel ${isAdded ? 'added' : ''}`}
                                onClick={() => handleAddKsmLotToSelection(lot)}
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
                      })
                    ) : (
                      <div className="dev-ksm-empty">
                        По выбранным фильтрам свободные лоты не найдены
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="dev-ksm-empty">
                  Нажмите «Обновить лоты {resolvedProvider.label}», чтобы загрузить актуальные свободные квартиры с сайта застройщика
                </div>
              )}
            </div>
          )}

          {/* Available Apartments in Complex */}
          <div className="dev-apts-section">
            <div className="dev-apts-header">
              <div>
                <h3 className="section-title">Планировки и квартиры в продаже</h3>
                <p className="section-subtitle">Добавьте выбранную квартиру в подборку для отправки клиенту</p>
              </div>

              {/* Client Selector for Fast Addition */}
              {clients.length > 0 && (
                <div className="client-selector-wrap">
                  <UserCheck size={16} className="text-muted" />
                  <select
                    className="client-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">(Общая подборка без привязки)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || 'Клиент'} {c.phones && c.phones[0] ? `(${c.phones[0]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="dev-apts-table-wrap">
              <table className="dev-apts-table">
                <thead>
                  <tr>
                    <th>Тип квартиры</th>
                    <th>Площадь</th>
                    <th>Цена от</th>
                    <th>Цена за м²</th>
                    <th>В наличии</th>
                    <th className="text-right">Подборка</th>
                  </tr>
                </thead>
                <tbody>
                  {dev.apartments && dev.apartments.length > 0 ? (
                    dev.apartments.map((apt, idx) => {
                      const isAdded = addedApts[apt.type];
                      return (
                        <tr key={idx}>
                          <td>
                            <strong>{apt.name}</strong>
                          </td>
                          <td>{apt.area}</td>
                          <td>
                            <span className="apt-price-val">
                              {apt.price_from ? `${formatNumber(apt.price_from)} ₽` : 'По запросу'}
                            </span>
                          </td>
                          <td>
                            <span className="apt-sqm-val">
                              {apt.price_sqm ? `${formatNumber(apt.price_sqm)} ₽` : '–'}
                            </span>
                          </td>
                          <td>
                            <span className="apt-count-badge">
                              {apt.count ? `${apt.count} шт.` : 'Есть'}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className={`btn-add-table-sel ${isAdded ? 'added' : ''}`}
                              onClick={() => handleAddAptToSelection(apt)}
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
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Информация о свободных планировках уточняется у застройщика
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Description & Features */}
          <div className="dev-description-card">
            <h3 className="section-title">О жилом комплексе</h3>
            <p className="dev-desc-text">{dev.description}</p>

            {dev.features && dev.features.length > 0 && (
              <div className="dev-features-wrap">
                <h4 className="features-title">Особенности и преимущества:</h4>
                <div className="features-chips">
                  {dev.features.map((feat, idx) => (
                    <span key={idx} className="feature-chip">
                      <Sparkles size={13} className="text-warning" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {previewPlanLot && (
        <div className="ksm-plan-lightbox" onClick={() => setPreviewPlanLot(null)}>
          <div className="ksm-plan-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="ksm-plan-lightbox-head">
              <strong>
                {previewPlanLot.title}
                {previewPlanLot.flat_number ? ` - кв. № ${previewPlanLot.flat_number}` : ''}
              </strong>
              <button
                type="button"
                className="dev-modal-close-btn"
                onClick={() => setPreviewPlanLot(null)}
                aria-label="Закрыть планировку"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={previewPlanLot.plan_image}
              alt={previewPlanLot.title}
              className="ksm-plan-lightbox-img"
            />
          </div>
        </div>
      )}

      <style>{`
        .dev-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        .dev-modal-container {
          background: var(--surface, #ffffff);
          border-radius: var(--radius-xl, 20px);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border, #e2e8f0);
        }
        .dev-modal-header {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border, #e2e8f0);
        }
        .dev-modal-dev-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--primary, #0052FF);
        }
        .dev-modal-title {
          margin: 2px 0 0 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--text, #0f172a);
        }
        .dev-modal-close-btn {
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dev-modal-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }
        .dev-modal-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .dev-gallery-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dev-gallery-main {
          position: relative;
          height: 340px;
          border-radius: var(--radius-lg, 16px);
          overflow: hidden;
          background: #0f172a;
        }
        .dev-gallery-main-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.5);
          color: white;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        .gallery-nav.prev { left: 12px; }
        .gallery-nav.next { right: 12px; }
        .gallery-badges {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          gap: 8px;
        }
        .gallery-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          backdrop-filter: blur(8px);
        }
        .gallery-badge.class-badge {
          background: rgba(15, 23, 42, 0.8);
          color: #ffffff;
        }
        .gallery-badge.date-badge {
          background: rgba(0, 82, 255, 0.85);
          color: #ffffff;
        }
        .dev-gallery-thumbs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .thumb-btn {
          width: 72px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
        }
        .thumb-btn.active {
          border-color: var(--primary, #0052FF);
        }
        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dev-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg, #f8fafc);
          padding: 16px 20px;
          border-radius: var(--radius, 12px);
          border: 1px solid var(--border, #e2e8f0);
          flex-wrap: wrap;
          gap: 12px;
        }
        .dark .dev-action-bar {
          background: #0f172a;
        }
        .dev-price-highlight {
          display: flex;
          flex-direction: column;
        }
        .dev-price-highlight .label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted, #94a3b8);
          font-weight: 600;
        }
        .dev-price-highlight .value {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .dev-price-highlight .value {
          color: #60a5fa;
        }
        .dev-price-highlight .sub {
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .dev-cta-buttons {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .btn-map-locate {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary, #0052FF);
          color: #ffffff;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-map-locate:hover {
          background: var(--primary-hover, #0043D9);
        }
        .btn-call-dev {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface, #ffffff);
          color: var(--text, #0f172a);
          border: 1px solid var(--border, #e2e8f0);
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .dev-portals-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius, 12px);
          padding: 16px;
        }
        .dev-portals-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .dev-portals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 10px;
        }
        .portal-link-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .portal-link-btn.domrf {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e3a8a;
        }
        .dark .portal-link-btn.domrf {
          background: #1e293b;
          border-color: #2563eb;
          color: #bfdbfe;
        }
        .portal-link-btn.avito {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }
        .dark .portal-link-btn.avito {
          background: #1e293b;
          border-color: #059669;
          color: #a7f3d0;
        }
        .portal-link-btn.builder {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #1e293b;
        }
        .dark .portal-link-btn.builder {
          background: #1e293b;
          border-color: #475569;
          color: #f1f5f9;
        }
        .portal-icon {
          font-size: 20px;
        }
        .portal-meta {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .portal-meta strong {
          font-size: 13px;
        }
        .portal-meta span {
          font-size: 10px;
          opacity: 0.8;
        }
        .dev-specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 10px;
        }
        .spec-card {
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border-light, #f1f5f9);
          padding: 10px 14px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
        }
        .dark .spec-card {
          background: #0f172a;
          border-color: #334155;
        }
        .spec-label {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          margin-bottom: 2px;
        }
        .spec-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #0f172a);
        }
        .dark .spec-value {
          color: #f1f5f9;
        }
        .dev-apts-section {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius, 12px);
          padding: 18px;
        }
        .dev-apts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .section-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }
        .section-subtitle {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .client-selector-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg, #f8fafc);
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid var(--border, #e2e8f0);
        }
        .dark .client-selector-wrap {
          background: #0f172a;
        }
        .client-select {
          border: none;
          background: transparent;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
          cursor: pointer;
        }
        .dark .client-select {
          color: #f1f5f9;
        }
        .dev-apts-table-wrap {
          overflow-x: auto;
        }
        .dev-apts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .dev-apts-table th {
          text-align: left;
          padding: 10px 12px;
          color: var(--text-muted, #94a3b8);
          font-size: 11px;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border, #e2e8f0);
        }
        .dev-apts-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border-light, #f1f5f9);
        }
        .dark .dev-apts-table td {
          border-bottom-color: #334155;
        }
        .apt-price-val {
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .apt-price-val {
          color: #60a5fa;
        }
        .apt-sqm-val {
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .apt-count-badge {
          background: var(--bg, #f8fafc);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .dark .apt-count-badge {
          background: #334155;
        }
        .btn-add-table-sel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border: 1px solid var(--primary-light, #eef4ff);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-add-table-sel:hover {
          background: var(--primary, #0052FF);
          color: #ffffff;
        }
        .btn-add-table-sel.added {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .dev-description-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius, 12px);
          padding: 18px;
        }
        .dev-desc-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary, #475569);
          margin: 8px 0 16px 0;
        }
        .dark .dev-desc-text {
          color: #cbd5e1;
        }
        .features-title {
          margin: 0 0 10px 0;
          font-size: 13px;
          font-weight: 700;
        }
        .features-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg, #f8fafc);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          color: var(--text, #0f172a);
          border: 1px solid var(--border, #e2e8f0);
        }
        .dark .feature-chip {
          background: #0f172a;
          color: #f1f5f9;
        }
        .dev-ksm-section {
          background: var(--surface, #ffffff);
          border: 1px solid #a7f3d0;
          border-radius: var(--radius, 12px);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dark .dev-ksm-section {
          border-color: #059669;
        }
        .dev-ksm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dev-ksm-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dev-ksm-count-badge {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .dark .dev-ksm-count-badge {
          background: #064e3b;
          color: #a7f3d0;
          border-color: #059669;
        }
        .dev-ksm-header-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .btn-sync-ksm-modal {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 9px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-sync-ksm-modal:hover:not(:disabled) {
          background: #047857;
        }
        .btn-sync-ksm-modal:disabled {
          opacity: 0.75;
          cursor: wait;
        }
        .dev-ksm-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dev-ksm-room-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ksm-room-chip {
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          color: var(--text-secondary, #475569);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .dark .ksm-room-chip {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        .ksm-room-chip.active {
          background: #ecfdf5;
          color: #047857;
          border-color: #059669;
        }
        .dark .ksm-room-chip.active {
          background: #064e3b;
          color: #a7f3d0;
          border-color: #10b981;
        }
        .dev-ksm-search-sort {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ksm-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .ksm-search-icon {
          position: absolute;
          left: 9px;
          color: var(--text-muted, #94a3b8);
          pointer-events: none;
        }
        .ksm-search-input {
          padding: 6px 10px 6px 28px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
          min-width: 190px;
        }
        .dark .ksm-search-input {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .ksm-sort-select {
          padding: 6px 10px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg, #f8fafc);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text, #0f172a);
          outline: none;
        }
        .dark .ksm-sort-select {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }
        .dev-ksm-lots-list {
          max-height: 360px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 4px;
        }
        .dev-ksm-lot-row {
          display: grid;
          grid-template-columns: 56px 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg, #f8fafc);
          border: 1px solid var(--border-light, #f1f5f9);
          border-radius: 10px;
        }
        .dark .dev-ksm-lot-row {
          background: #0f172a;
          border-color: #334155;
        }
        @media (max-width: 640px) {
          .dev-ksm-lot-row {
            grid-template-columns: 48px 1fr;
          }
          .ksm-lot-price-col,
          .ksm-lot-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }
        .ksm-lot-plan {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .ksm-lot-plan.clickable {
          cursor: zoom-in;
        }
        .ksm-lot-plan img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .ksm-lot-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ksm-lot-title-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ksm-lot-title {
          font-size: 13px;
          color: var(--text, #0f172a);
        }
        .dark .ksm-lot-title {
          color: #f1f5f9;
        }
        .ksm-lot-finishing {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .dark .ksm-lot-finishing {
          background: #1e3a8a;
          color: #bfdbfe;
        }
        .ksm-lot-meta-line {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          font-size: 11px;
          color: var(--text-secondary, #475569);
        }
        .ksm-lot-price-col {
          text-align: right;
          white-space: nowrap;
        }
        .ksm-lot-price {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .ksm-lot-price {
          color: #60a5fa;
        }
        .ksm-lot-price-sqm {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .ksm-lot-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ksm-lot-ext-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          background: var(--surface, #ffffff);
          text-decoration: none;
        }
        .dark .ksm-lot-ext-link {
          background: #1e293b;
          border-color: #334155;
          color: #cbd5e1;
        }
        .ksm-lot-ext-link:hover {
          color: var(--primary, #0052FF);
          border-color: var(--primary, #0052FF);
        }
        .dev-ksm-empty {
          padding: 18px;
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary, #475569);
          background: var(--bg, #f8fafc);
          border: 1px dashed var(--border, #e2e8f0);
          border-radius: 10px;
        }
        .dark .dev-ksm-empty {
          background: #0f172a;
          border-color: #334155;
          color: #94a3b8;
        }
        .ksm-plan-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10020;
          padding: 20px;
        }
        .ksm-plan-lightbox-card {
          background: var(--surface, #ffffff);
          border-radius: 16px;
          padding: 16px;
          max-width: 680px;
          width: 100%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ksm-plan-lightbox-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }
        .ksm-plan-lightbox-img {
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
