import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';

export function DevelopmentDetailModal({
  development,
  onClose = () => {},
  onSelectOnMap = () => {}
}) {
  const dev = development;
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addedApts, setAddedApts] = useState({});

  if (!dev) return null;

  const images = dev.images && dev.images.length > 0
    ? dev.images
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'];

  const clients = state.clients || [];

  const handleAddAptToSelection = async (apt) => {
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const title = `${apt.name} в ${dev.name} (${apt.area})`;
      
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
      `}</style>
    </div>
  );
}
