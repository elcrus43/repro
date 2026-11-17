import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Printer,
  Copy,
  Check,
  Building2,
  MapPin,
  Layers,
  Phone,
  User,
  ExternalLink,
  Sparkles,
  Calendar,
  Eye,
  EyeOff,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatNumber, formatPhone } from '../utils/format';
import { useToastContext } from './Toast';

export function SelectionPresentationModal({
  isOpen = false,
  onClose = () => {},
  client = null,
  items = [],
  currentUser = null
}) {
  const { toast } = useToastContext();
  const printAreaRef = useRef(null);

  // Опции отображения
  const [showContacts, setShowContacts] = useState(true);
  const [showPriceSqm, setShowPriceSqm] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Выбранные объекты для презентации (по умолчанию все)
  const [selectedIds, setSelectedIds] = useState(() => {
    return (items || []).map(i => i.id || i.uuid || String(Math.random()));
  });

  // При изменении items синхронизируем выбранные
  React.useEffect(() => {
    if (items && items.length > 0) {
      setSelectedIds(items.map(i => i.id || i.uuid || String(Math.random())));
    }
  }, [items]);

  const clientName = useMemo(() => {
    if (!client) return 'Клиент';
    if (typeof client === 'string') return client;
    return client.full_name || client.name || 'Клиент';
  }, [client]);

  const clientPhone = useMemo(() => {
    if (!client || typeof client === 'string') return '';
    return client.phone ? formatPhone(client.phone) : '';
  }, [client]);

  const realtorName = currentUser?.full_name || currentUser?.name || 'Ваш риелтор';
  const realtorPhone = currentUser?.phone ? formatPhone(currentUser.phone) : '';

  // Активные объекты
  const activeItems = useMemo(() => {
    return (items || []).filter(item => {
      const id = item.id || item.uuid;
      return selectedIds.includes(id);
    });
  }, [items, selectedIds]);

  // Статистика подборки
  const stats = useMemo(() => {
    if (activeItems.length === 0) {
      return { minPrice: 0, maxPrice: 0, minArea: 0, maxArea: 0, count: 0 };
    }
    const prices = activeItems.map(i => Number(i.price || i.price_from || 0)).filter(p => p > 0);
    const areas = activeItems.map(i => {
      const a = i.area_total || i.area;
      if (!a) return 0;
      if (typeof a === 'number') return a;
      const parsed = parseFloat(String(a).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    }).filter(a => a > 0);

    return {
      count: activeItems.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      minArea: areas.length > 0 ? Math.min(...areas) : 0,
      maxArea: areas.length > 0 ? Math.max(...areas) : 0,
    };
  }, [activeItems]);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id || i.uuid));
    }
  };

  // Копирование текстовой версии презентации в буфер
  const handleCopyText = async () => {
    if (activeItems.length === 0) {
      toast.warning('Нет выбранных объектов для копирования');
      return;
    }

    let text = `📋 Индивидуальная подборка объектов для ${clientName}\n`;
    text += `Дата: ${new Date().toLocaleDateString('ru-RU')}\n`;
    if (showContacts && realtorName) {
      text += `Риелтор: ${realtorName}${realtorPhone ? ` (${realtorPhone})` : ''}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    activeItems.forEach((item, idx) => {
      const price = item.price || item.price_from;
      const area = item.area_total || item.area || '—';
      const address = item.address || item.city || 'Адрес по запросу';
      const complex = item.residential_complex || item.developer || '';

      text += `${idx + 1}. ${complex ? `${complex} — ` : ''}${address}\n`;
      text += `💰 Цена: ${price ? `${formatNumber(price)} ₽` : 'По запросу'}`;
      if (showPriceSqm && item.price && item.area_total) {
        text += ` (${formatNumber(Math.round(item.price / item.area_total))} ₽/м²)`;
      }
      text += `\n`;
      text += `📐 Площадь: ${area} м²`;
      if (item.rooms) text += ` | Комнат: ${item.rooms}`;
      if (item.floor) text += ` | Этаж: ${item.floor}${item.floors_total ? `/${item.floors_total}` : ''}`;
      text += `\n`;

      if (item.description || item.notes) {
        text += `ℹ️ ${(item.description || item.notes).slice(0, 120)}...\n`;
      }
      if (showLinks && item.link) {
        text += `🔗 Ссылка: ${item.link}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Сформировано в Realtor Match (REA CRM)`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Текст презентации скопирован в буфер обмена!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Не удалось скопировать в буфер');
    }
  };

  // Отправка в WhatsApp
  const handleShareWhatsApp = () => {
    if (activeItems.length === 0) return;
    let text = `Здравствуйте, ${clientName}! Подготовил для вас подборку объектов:\n\n`;
    activeItems.forEach((item, idx) => {
      const price = item.price || item.price_from;
      const address = item.address || item.city || '';
      text += `${idx + 1}. ${address} — ${price ? `${formatNumber(price)} ₽` : 'по запросу'}\n`;
      if (item.link) text += `${item.link}\n`;
    });
    text += `\nБуду рад ответить на вопросы!`;
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Отправка в Telegram
  const handleShareTelegram = () => {
    if (activeItems.length === 0) return;
    let text = `Подборка объектов для ${clientName}:\n\n`;
    activeItems.forEach((item, idx) => {
      const price = item.price || item.price_from;
      const address = item.address || item.city || '';
      text += `${idx + 1}. ${address} — ${price ? `${formatNumber(price)} ₽` : 'по запросу'}\n`;
      if (item.link) text += `${item.link}\n`;
    });
    const tgUrl = `https://t.me/share/url?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(tgUrl, '_blank');
  };

  // Печать
  const handlePrint = () => {
    window.print();
  };

  // Скачать PDF
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsPdfGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const renderH = (imgProps.height * pdfW) / imgProps.width;

      if (renderH <= pdfH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, renderH);
      } else {
        let yPos = 0;
        while (yPos < renderH) {
          if (yPos > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, renderH);
          yPos += pdfH;
        }
      }

      const safeName = clientName.replace(/[^\wа-яА-ЯёЁ]/gi, '_').slice(0, 30);
      pdf.save(`Презентация_подборки_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF презентация успешно создана!');
    } catch (err) {
      console.error('[pdf generation error]', err);
      toast.error('Не удалось сгенерировать PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="selection-modal-backdrop" onClick={onClose}>
      <div className="selection-modal-card" onClick={e => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="selection-modal-header">
          <div className="header-info">
            <div className="header-title-row">
              <Sparkles size={18} color="var(--primary)" />
              <h2 className="header-title">Презентация подборки объектов</h2>
              <span className="client-badge">{clientName}</span>
            </div>
            <p className="header-subtitle">
              Клиентская подборка объектов с характеристиками, планировками и ценами для отправки в мессенджеры или скачивания в PDF
            </p>
          </div>

          <button type="button" className="btn-close-modal" onClick={onClose} title="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="selection-modal-toolbar">
          {/* Action Buttons */}
          <div className="toolbar-actions">
            <button
              type="button"
              className="btn-action primary"
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating || activeItems.length === 0}
              title="Скачать готовую PDF-презентацию"
            >
              <Download size={15} />
              <span>{isPdfGenerating ? 'Создание PDF...' : 'Скачать PDF'}</span>
            </button>

            <button
              type="button"
              className="btn-action whatsapp"
              onClick={handleShareWhatsApp}
              disabled={activeItems.length === 0}
              title="Отправить подборку в WhatsApp"
            >
              <Share2 size={15} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              className="btn-action telegram"
              onClick={handleShareTelegram}
              disabled={activeItems.length === 0}
              title="Отправить подборку в Telegram"
            >
              <Share2 size={15} />
              <span>Telegram</span>
            </button>

            <button
              type="button"
              className="btn-action secondary"
              onClick={handleCopyText}
              disabled={activeItems.length === 0}
              title="Скопировать текстовое описание подборки"
            >
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>

            <button
              type="button"
              className="btn-action ghost"
              onClick={handlePrint}
              title="Распечатать подборку"
            >
              <Printer size={15} />
              <span>Печать</span>
            </button>
          </div>

          {/* Options Toggles */}
          <div className="toolbar-options">
            <label className="option-toggle" title="Показывать имя и телефон риелтора">
              <input
                type="checkbox"
                checked={showContacts}
                onChange={e => setShowContacts(e.target.checked)}
              />
              <span>Контакты риелтора</span>
            </label>

            <label className="option-toggle" title="Показывать расчет стоимости за квадратный метр">
              <input
                type="checkbox"
                checked={showPriceSqm}
                onChange={e => setShowPriceSqm(e.target.checked)}
              />
              <span>Цена за м²</span>
            </label>

            <label className="option-toggle" title="Показывать прямые ссылки на объекты/ЖК">
              <input
                type="checkbox"
                checked={showLinks}
                onChange={e => setShowLinks(e.target.checked)}
              />
              <span>Ссылки</span>
            </label>
          </div>
        </div>

        {/* Selection Items Checklist Filter */}
        <div className="selection-filter-strip">
          <div className="filter-summary">
            <button type="button" className="btn-select-all" onClick={toggleSelectAll}>
              {selectedIds.length === items.length ? (
                <CheckSquare size={15} color="var(--primary)" />
              ) : (
                <Square size={15} color="var(--text-muted)" />
              )}
              <span>
                Выбрано: <strong>{activeItems.length}</strong> из {items.length} объектов
              </span>
            </button>
          </div>

          <div className="filter-chips">
            {items.map((item, idx) => {
              const id = item.id || item.uuid;
              const isSelected = selectedIds.includes(id);
              const label = item.residential_complex || item.developer || item.address || `Объект ${idx + 1}`;
              return (
                <button
                  key={id}
                  type="button"
                  className={`item-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleSelect(id)}
                >
                  {isSelected ? <Check size={12} /> : null}
                  <span>{label.length > 25 ? `${label.slice(0, 22)}...` : label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Presentation Document Canvas (Target for PDF & Print) */}
        <div className="selection-preview-scroll">
          <div className="presentation-document" ref={printAreaRef}>
            {/* Document Header */}
            <header className="presentation-header">
              <div className="brand-block">
                <div className="brand-logo">REA CRM</div>
                <div className="brand-tagline">Индивидуальная подборка недвижимости</div>
              </div>

              <div className="meta-block">
                <div className="meta-date">
                  <Calendar size={13} />
                  <span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                {showContacts && (
                  <div className="realtor-contact-card">
                    <User size={13} className="text-primary" />
                    <strong>{realtorName}</strong>
                    {realtorPhone && (
                      <span className="realtor-phone">
                        <Phone size={11} /> {realtorPhone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </header>

            {/* Target Client Banner */}
            <div className="presentation-target-banner">
              <div className="target-left">
                <span className="target-label">ПОДГОТОВЛЕНО ДЛЯ КЛИЕНТА:</span>
                <h3 className="target-client-name">{clientName}</h3>
                {clientPhone && <span className="target-client-phone">{clientPhone}</span>}
              </div>

              <div className="target-kpi-grid">
                <div className="target-kpi">
                  <span className="kpi-label">Объектов</span>
                  <span className="kpi-value">{stats.count}</span>
                </div>
                <div className="target-kpi">
                  <span className="kpi-label">Диапазон цен</span>
                  <span className="kpi-value">
                    {stats.minPrice > 0
                      ? `${(stats.minPrice / 1000000).toFixed(1)} - ${(stats.maxPrice / 1000000).toFixed(1)} млн ₽`
                      : 'По запросу'}
                  </span>
                </div>
                {stats.minArea > 0 && (
                  <div className="target-kpi">
                    <span className="kpi-label">Площади</span>
                    <span className="kpi-value">
                      {stats.minArea} - {stats.maxArea} м²
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Cards List */}
            <div className="presentation-cards-list">
              {activeItems.map((item, idx) => {
                const price = Number(item.price || item.price_from || 0);
                const area = item.area_total || item.area;
                const priceSqm = item.price_per_sqm || (price && area ? Math.round(price / Number(area)) : null);
                const address = item.address || item.city || 'Адрес по запросу';
                const complexName = item.residential_complex || item.name || '';
                const developerName = item.developer || '';
                const imageSrc =
                  item.photo ||
                  item.images?.[0] ||
                  item.photos?.[0] ||
                  item.image ||
                  '/images/developments/zhk-bulychev.jpg';

                return (
                  <div key={item.id || idx} className="presentation-card">
                    {/* Index Badge */}
                    <div className="card-number-badge">#{idx + 1}</div>

                    {/* Image Box */}
                    <div className="presentation-card-image-wrap">
                      <img
                        src={imageSrc}
                        alt={address}
                        className="presentation-card-image"
                        onError={(e) => {
                          e.target.src = '/images/developments/zhk-bulychev.jpg';
                        }}
                      />
                      <div className="card-image-badges">
                        {complexName && <span className="badge-complex">{complexName}</span>}
                        {item.housing_class && <span className="badge-class">{item.housing_class}</span>}
                      </div>
                    </div>

                    {/* Content Box */}
                    <div className="presentation-card-content">
                      {/* Top Header: Developer & Price */}
                      <div className="card-header-row">
                        <div>
                          {developerName && <span className="card-developer">{developerName}</span>}
                          <h4 className="card-title">
                            {complexName ? `${complexName}, ` : ''}{address}
                          </h4>
                        </div>
                        <div className="card-price-block">
                          <span className="card-price">
                            {price > 0 ? `${formatNumber(price)} ₽` : 'По запросу'}
                          </span>
                          {showPriceSqm && priceSqm && (
                            <span className="card-price-sqm">
                              {formatNumber(priceSqm)} ₽/м²
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Location Row */}
                      <div className="card-location-row">
                        <MapPin size={13} className="text-primary flex-shrink-0" />
                        <span>
                          {item.city ? `${item.city}, ` : ''}
                          {item.district ? `${item.district}, ` : ''}
                          {item.microdistrict ? `${item.microdistrict}, ` : ''}
                          {address}
                        </span>
                      </div>

                      {/* Key Specs Grid */}
                      <div className="card-specs-grid">
                        {item.rooms !== undefined && (
                          <div className="spec-item">
                            <span className="spec-label">Комнатность</span>
                            <span className="spec-value">
                              {item.rooms === 0 ? 'Студия' : `${item.rooms}-комнатная`}
                            </span>
                          </div>
                        )}
                        {area && (
                          <div className="spec-item">
                            <span className="spec-label">Общая площадь</span>
                            <span className="spec-value">{area} м²</span>
                          </div>
                        )}
                        {item.floor && (
                          <div className="spec-item">
                            <span className="spec-label">Этаж</span>
                            <span className="spec-value">
                              {item.floor}{item.floors_total ? ` из ${item.floors_total}` : ''} эт.
                            </span>
                          </div>
                        )}
                        {item.completion_date && (
                          <div className="spec-item">
                            <span className="spec-label">Срок сдачи</span>
                            <span className="spec-value">{item.completion_date}</span>
                          </div>
                        )}
                        {item.renovation && (
                          <div className="spec-item">
                            <span className="spec-label">Отделка</span>
                            <span className="spec-value">{item.renovation}</span>
                          </div>
                        )}
                      </div>

                      {/* Description / Highlights */}
                      {(item.description || item.notes) && (
                        <p className="card-description">
                          {(item.description || item.notes).slice(0, 220)}
                          {(item.description || item.notes).length > 220 ? '...' : ''}
                        </p>
                      )}

                      {/* External Link */}
                      {showLinks && item.link && (
                        <div className="card-link-row">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-ext-link"
                          >
                            <span>Открыть страницу объекта</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Footer */}
            <footer className="presentation-footer">
              <div className="footer-left">
                <strong>Realtor Match (REA CRM)</strong> — Профессиональная система подбора и совпадений объектов
              </div>
              <div className="footer-right">
                Цены и условия действительны на дату формирования: {new Date().toLocaleDateString('ru-RU')}
              </div>
            </footer>
          </div>
        </div>
      </div>

      <style>{`
        .selection-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .selection-modal-card {
          width: 100%;
          max-width: 960px;
          max-height: 94vh;
          background: var(--surface, #ffffff);
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border-light, #e2e8f0);
        }
        .dark .selection-modal-card {
          background: #0f172a;
          border-color: #334155;
        }
        .selection-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border-light, #e2e8f0);
          gap: 16px;
        }
        .dark .selection-modal-header {
          border-color: #334155;
        }
        .header-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .header-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: var(--text, #0f172a);
        }
        .dark .header-title {
          color: #f8fafc;
        }
        .client-badge {
          background: rgba(0, 82, 255, 0.1);
          color: var(--primary, #0052FF);
          border: 1px solid rgba(0, 82, 255, 0.2);
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .header-subtitle {
          font-size: 12px;
          font-weight: 300;
          color: var(--text-muted, #94a3b8);
          margin: 4px 0 0;
        }
        .btn-close-modal {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.15s;
        }
        .btn-close-modal:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text, #0f172a);
        }
        .selection-modal-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 24px;
          background: rgba(248, 250, 252, 0.8);
          border-bottom: 1px solid var(--border-light, #e2e8f0);
        }
        .dark .selection-modal-toolbar {
          background: rgba(30, 41, 59, 0.6);
          border-color: #334155;
        }
        .toolbar-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .btn-action.primary {
          background: var(--primary, #0052FF);
          color: #ffffff;
        }
        .btn-action.primary:hover:not(:disabled) {
          background: #0043D9;
          transform: translateY(-1px);
        }
        .btn-action.whatsapp {
          background: #25d366;
          color: #ffffff;
        }
        .btn-action.whatsapp:hover:not(:disabled) {
          background: #1eb855;
          transform: translateY(-1px);
        }
        .btn-action.telegram {
          background: #0088cc;
          color: #ffffff;
        }
        .btn-action.telegram:hover:not(:disabled) {
          background: #0077b5;
          transform: translateY(-1px);
        }
        .btn-action.secondary {
          background: var(--surface, #ffffff);
          border-color: var(--border, #e2e8f0);
          color: var(--text, #0f172a);
        }
        .btn-action.secondary:hover:not(:disabled) {
          border-color: var(--primary, #0052FF);
          color: var(--primary, #0052FF);
        }
        .btn-action.ghost {
          background: transparent;
          border-color: var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
        }
        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .toolbar-options {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .option-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--text-secondary, #475569);
          cursor: pointer;
          user-select: none;
        }
        .dark .option-toggle {
          color: #cbd5e1;
        }
        .selection-filter-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 24px;
          border-bottom: 1px solid var(--border-light, #e2e8f0);
          background: var(--surface, #ffffff);
        }
        .dark .selection-filter-strip {
          background: #0f172a;
          border-color: #334155;
        }
        .btn-select-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          font-size: 11.5px;
          color: var(--text, #0f172a);
          cursor: pointer;
          padding: 2px 4px;
        }
        .dark .btn-select-all {
          color: #f8fafc;
        }
        .filter-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          max-width: 65%;
          scrollbar-width: none;
        }
        .filter-chips::-webkit-scrollbar {
          display: none;
        }
        .item-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--surface, #ffffff);
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .item-chip.active {
          border-color: var(--primary, #0052FF);
          background: rgba(0, 82, 255, 0.08);
          color: var(--primary, #0052FF);
          font-weight: 500;
        }
        .selection-preview-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          background: #f1f5f9;
        }
        .dark .selection-preview-scroll {
          background: #0b1120;
        }
        .presentation-document {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          color: #0f172a;
          font-family: inherit;
        }
        .presentation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 20px;
          border-bottom: 2px solid #0052FF;
          margin-bottom: 20px;
        }
        .brand-logo {
          font-size: 22px;
          font-weight: 800;
          color: #0052FF;
          letter-spacing: -0.02em;
        }
        .brand-tagline {
          font-size: 11px;
          font-weight: 300;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .meta-block {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }
        .meta-date {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #64748b;
        }
        .realtor-contact-card {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #0f172a;
        }
        .realtor-phone {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #0052FF;
          font-weight: 600;
        }
        .presentation-target-banner {
          background: linear-gradient(135deg, rgba(0, 82, 255, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
          border: 1px solid rgba(0, 82, 255, 0.15);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        .target-label {
          font-size: 9.5px;
          font-weight: 300;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }
        .target-client-name {
          font-size: 16px;
          font-weight: 700;
          margin: 2px 0 0;
          color: #0f172a;
        }
        .target-client-phone {
          font-size: 11px;
          color: #64748b;
        }
        .target-kpi-grid {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .target-kpi {
          display: flex;
          flex-direction: column;
          text-align: right;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 300;
          color: #64748b;
          text-transform: uppercase;
        }
        .kpi-value {
          font-size: 14px;
          font-weight: 700;
          color: #0052FF;
        }
        .presentation-cards-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .presentation-card {
          position: relative;
          display: flex;
          gap: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          background: #ffffff;
          page-break-inside: avoid;
        }
        .card-number-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          z-index: 2;
        }
        .presentation-card-image-wrap {
          position: relative;
          width: 220px;
          height: 160px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          background: #f1f5f9;
        }
        .presentation-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-image-badges {
          position: absolute;
          bottom: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .badge-complex {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 600;
        }
        .badge-class {
          background: #0052FF;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 600;
        }
        .presentation-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .card-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .card-developer {
          font-size: 10.5px;
          font-weight: 300;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.04em;
        }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          margin: 2px 0 0;
          color: #0f172a;
          line-height: 1.25;
        }
        .card-price-block {
          text-align: right;
          flex-shrink: 0;
        }
        .card-price {
          font-size: 17px;
          font-weight: 800;
          color: #0052FF;
          white-space: nowrap;
        }
        .card-price-sqm {
          display: block;
          font-size: 10.5px;
          font-weight: 300;
          color: #64748b;
        }
        .card-location-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: #475569;
        }
        .card-specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 8px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px 12px;
          border: 1px solid #f1f5f9;
        }
        .spec-item {
          display: flex;
          flex-direction: column;
        }
        .spec-label {
          font-size: 9.5px;
          font-weight: 200;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.02em;
        }
        .spec-value {
          font-size: 11.5px;
          font-weight: 600;
          color: #0f172a;
        }
        .card-description {
          font-size: 11px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.4;
          margin: 0;
        }
        .card-link-row {
          margin-top: auto;
          display: flex;
          justify-content: flex-end;
        }
        .card-ext-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #0052FF;
          text-decoration: none;
          font-weight: 500;
        }
        .card-ext-link:hover {
          text-decoration: underline;
        }
        .presentation-footer {
          margin-top: 28px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .presentation-document, .presentation-document * {
            visibility: visible;
          }
          .presentation-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none;
            padding: 0;
          }
        }
        @media (max-width: 640px) {
          .presentation-card {
            flex-direction: column;
          }
          .presentation-card-image-wrap {
            width: 100%;
            height: 180px;
          }
          .toolbar-options {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default SelectionPresentationModal;
