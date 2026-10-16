import React, { useState } from 'react';
import { X, Building2, MapPin, DollarSign, Calendar, Layers, Link as LinkIcon, Image, Sparkles } from 'lucide-react';
import { KIROV_DEVELOPERS, HOUSING_CLASSES, FINISHING_OPTIONS, saveDevelopment } from '../../data/developmentsData';
import { KIROV_DISTRICTS } from '../../data/location';
import { useToastContext } from '../../components/Toast';

export function DevelopmentFormModal({
  initialData = null,
  onClose = () => {},
  onSaved = () => {}
}) {
  const { toast } = useToastContext();
  const isEditing = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState(() => {
    if (initialData) return { ...initialData };
    return {
      id: `zhk-custom-${Date.now()}`,
      name: '',
      developer: KIROV_DEVELOPERS[0] || 'Железно',
      district: KIROV_DISTRICTS[0]?.name || 'Ленинский район',
      microdistrict: '',
      address: '',
      lat: 58.6035,
      lng: 49.6679,
      price_from: '',
      price_to: '',
      price_sqm_from: '',
      completion_date: '4 кв. 2026',
      completion_year: 2026,
      is_completed: false,
      housing_class: 'Комфорт+',
      finishing: ['white_box'],
      floors: '10–16 этажей',
      wall_material: 'Монолит-кирпич',
      imagesText: '',
      description: '',
      featuresText: 'Дворы без машин\nПодземный паркинг\nШкола и садики рядом',
      domrf_url: '',
      avito_url: '',
      builder_url: '',
      contact_phone: '+7 (8332) '
    };
  });

  const availableMicrodistricts = React.useMemo(() => {
    const selectedDist = KIROV_DISTRICTS.find(d => d.name === formData.district);
    return selectedDist ? selectedDist.microdistricts : [];
  }, [formData.district]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFinishingToggle = (finishingId) => {
    setFormData(prev => {
      const current = prev.finishing || [];
      const next = current.includes(finishingId)
        ? current.filter(x => x !== finishingId)
        : [...current, finishingId];
      return { ...prev, finishing: next };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Укажите название жилого комплекса');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Укажите адрес ЖК в г. Кирове');
      return;
    }

    // Process images
    let images = formData.images || [];
    if (formData.imagesText) {
      const parsedUrls = formData.imagesText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.startsWith('http'));
      if (parsedUrls.length > 0) {
        images = parsedUrls;
      }
    }
    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'];
    }

    // Process features
    let features = formData.features || [];
    if (formData.featuresText) {
      features = formData.featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);
    }

    const payload = {
      ...formData,
      price_from: Number(formData.price_from) || 0,
      price_to: Number(formData.price_to) || 0,
      price_sqm_from: Number(formData.price_sqm_from) || 0,
      lat: Number(formData.lat) || 58.6035,
      lng: Number(formData.lng) || 49.6679,
      images,
      features,
      apartments: formData.apartments || [
        { type: 'studio', name: 'Студии', area: '26 – 29 м²', price_from: Number(formData.price_from) || 3500000, price_sqm: Number(formData.price_sqm_from) || 120000, count: 5 },
        { type: '1k', name: '1-комнатные', area: '35 – 44 м²', price_from: (Number(formData.price_from) || 3500000) * 1.25, price_sqm: Number(formData.price_sqm_from) || 115000, count: 12 },
        { type: '2k', name: '2-комнатные', area: '52 – 68 м²', price_from: (Number(formData.price_from) || 3500000) * 1.6, price_sqm: Number(formData.price_sqm_from) || 110000, count: 15 }
      ]
    };

    saveDevelopment(payload);
    toast.success(isEditing ? 'ЖК успешно обновлен!' : 'Новый ЖК успешно добавлен в каталог!');
    onSaved(payload);
    onClose();
  };

  return (
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-modal-container dev-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="dev-modal-header">
          <h2 className="dev-modal-title">
            {isEditing ? `Редактирование: ${formData.name}` : 'Добавить жилой комплекс (Киров)'}
          </h2>
          <button className="dev-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dev-form-body">
          {/* Main Info */}
          <div className="form-group-grid">
            <div className="form-field">
              <label>Название ЖК *</label>
              <input
                type="text"
                placeholder="напр. ЖК Европейский"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Застройщик</label>
              <select
                value={formData.developer}
                onChange={(e) => handleChange('developer', e.target.value)}
              >
                {KIROV_DEVELOPERS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="form-group-grid three-col">
            <div className="form-field">
              <label>Район Кирова</label>
              <select
                value={formData.district}
                onChange={(e) => {
                  handleChange('district', e.target.value);
                  handleChange('microdistrict', '');
                }}
              >
                {KIROV_DISTRICTS.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Микрорайон</label>
              <input
                type="text"
                placeholder="напр. Юго-Западный"
                value={formData.microdistrict}
                onChange={(e) => handleChange('microdistrict', e.target.value)}
                list="microdistricts-list"
              />
              <datalist id="microdistricts-list">
                {availableMicrodistricts.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="form-field">
              <label>Адрес в Кирове *</label>
              <input
                type="text"
                placeholder="ул. Ленина, 150"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="form-group-grid">
            <div className="form-field">
              <label>Широта (Latitude) карты</label>
              <input
                type="number"
                step="0.0001"
                placeholder="58.6035"
                value={formData.lat}
                onChange={(e) => handleChange('lat', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Долгота (Longitude) карты</label>
              <input
                type="number"
                step="0.0001"
                placeholder="49.6679"
                value={formData.lng}
                onChange={(e) => handleChange('lng', e.target.value)}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="form-group-grid three-col">
            <div className="form-field">
              <label>Цена квартир от, ₽</label>
              <input
                type="number"
                placeholder="3500000"
                value={formData.price_from}
                onChange={(e) => handleChange('price_from', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Цена квартир до, ₽</label>
              <input
                type="number"
                placeholder="9500000"
                value={formData.price_to}
                onChange={(e) => handleChange('price_to', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Цена за м² от, ₽</label>
              <input
                type="number"
                placeholder="105000"
                value={formData.price_sqm_from}
                onChange={(e) => handleChange('price_sqm_from', e.target.value)}
              />
            </div>
          </div>

          {/* Completion & Class */}
          <div className="form-group-grid three-col">
            <div className="form-field">
              <label>Срок сдачи (текст)</label>
              <input
                type="text"
                placeholder="4 кв. 2026 или Сдан"
                value={formData.completion_date}
                onChange={(e) => handleChange('completion_date', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Год сдачи</label>
              <input
                type="number"
                placeholder="2026"
                value={formData.completion_year}
                onChange={(e) => handleChange('completion_year', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Класс жилья</label>
              <select
                value={formData.housing_class}
                onChange={(e) => handleChange('housing_class', e.target.value)}
              >
                {HOUSING_CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Finishing */}
          <div className="form-field">
            <label>Варианты отделки</label>
            <div className="finishing-checkbox-group">
              {FINISHING_OPTIONS.map(opt => (
                <label key={opt.id} className="finishing-check-label">
                  <input
                    type="checkbox"
                    checked={formData.finishing?.includes(opt.id)}
                    onChange={() => handleFinishingToggle(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* External links */}
          <div className="form-group-grid three-col">
            <div className="form-field">
              <label>Ссылка ЕИСЖС (наш.дом.рф)</label>
              <input
                type="url"
                placeholder="https://наш.дом.рф/..."
                value={formData.domrf_url}
                onChange={(e) => handleChange('domrf_url', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Ссылка на Авито (ЖК каталог)</label>
              <input
                type="url"
                placeholder="https://avito.ru/..."
                value={formData.avito_url}
                onChange={(e) => handleChange('avito_url', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Сайт застройщика</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.builder_url}
                onChange={(e) => handleChange('builder_url', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-field">
            <label>Описание жилого комплекса</label>
            <textarea
              rows={3}
              placeholder="Краткое описание преимуществ, расположения и концепции..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          {/* Photos */}
          <div className="form-field">
            <label>Ссылки на фото / рендеры (по одной на строку)</label>
            <textarea
              rows={2}
              placeholder="https://images.unsplash.com/..."
              value={formData.imagesText}
              onChange={(e) => handleChange('imagesText', e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="form-actions-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-submit">
              {isEditing ? 'Сохранить изменения' : 'Добавить ЖК в каталог'}
            </button>
          </div>
        </form>

        <style>{`
          .dev-form-container {
            max-width: 800px;
          }
          .dev-form-body {
            padding: 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .form-group-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .form-group-grid.three-col {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-field label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary, #475569);
          }
          .form-field input,
          .form-field select,
          .form-field textarea {
            border: 1px solid var(--border, #e2e8f0);
            background: var(--bg, #f8fafc);
            padding: 10px 12px;
            border-radius: 10px;
            font-size: 13px;
            color: var(--text, #0f172a);
            outline: none;
            transition: border-color 0.2s;
          }
          .dark .form-field input,
          .dark .form-field select,
          .dark .form-field textarea {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .form-field input:focus,
          .form-field select:focus,
          .form-field textarea:focus {
            border-color: var(--primary, #0052FF);
          }
          .finishing-checkbox-group {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }
          .finishing-check-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            cursor: pointer;
          }
          .form-actions-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 14px;
            border-top: 1px solid var(--border, #e2e8f0);
            margin-top: 10px;
          }
          .btn-cancel {
            padding: 10px 20px;
            border-radius: 10px;
            border: 1px solid var(--border, #e2e8f0);
            background: transparent;
            color: var(--text-secondary, #475569);
            font-weight: 600;
            cursor: pointer;
          }
          .btn-submit {
            padding: 10px 24px;
            border-radius: 10px;
            border: none;
            background: var(--primary, #0052FF);
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .btn-submit:hover {
            background: var(--primary-hover, #0043D9);
          }
        `}</style>
      </div>
    </div>
  );
}
