import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Sparkles,
  FileText,
  Save,
  X,
} from 'lucide-react';
import { DeveloperLogo } from '../../components/DeveloperLogo';
import {
  DEVELOPERS_KNOWLEDGE,
  NEW_BUILDINGS_GUIDE,
  getStoredDeveloperNotes,
  saveDeveloperNote,
} from '../../data/developersKnowledgeBase';
import { formatNumber } from '../../utils/format';

/**
 * DevelopersKnowledgeSection
 * Раздел «База знаний по новостройкам» в каталоге: карточки застройщиков с логотипами,
 * стандарты отделки, регламенты фиксации, заметки риелтора и справочник по Кирову.
 */
export function DevelopersKnowledgeSection({
  developments = [],
  liveLotsByProvider = {},
  initialDeveloperId = null,
  onClearInitialDeveloper = () => {},
  onSelectDeveloperInCatalog = () => {},
  onOpenDevelopment = () => {},
  onShowOnMap = () => {},
}) {
  const [query, setQuery] = useState('');
  const [activeDevId, setActiveDevId] = useState(initialDeveloperId || 'all');
  const [notesMap, setNotesMap] = useState(() => getStoredDeveloperNotes());
  const [editingNoteDevId, setEditingNoteDevId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  React.useEffect(() => {
    if (initialDeveloperId) {
      setActiveDevId(initialDeveloperId);
    }
  }, [initialDeveloperId]);

  const devsByDeveloperName = useMemo(() => {
    const map = new Map();
    for (const dev of developments) {
      const key = String(dev?.developer || '').trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(dev);
    }
    return map;
  }, [developments]);

  const enrichedDevelopers = useMemo(() => {
    return DEVELOPERS_KNOWLEDGE.map((kb) => {
      const nameLower = kb.name.toLowerCase();
      const shortLower = kb.shortName.toLowerCase();
      const matchingDevs = [];
      for (const [k, list] of devsByDeveloperName.entries()) {
        if (k === nameLower || k === shortLower || k.includes(shortLower) || nameLower.includes(k)) {
          matchingDevs.push(...list);
        }
      }
      const liveCount = kb.liveFeedKey
        ? (liveLotsByProvider[kb.liveFeedKey]?.length || 0)
        : 0;
      const minPrice = matchingDevs.reduce((acc, d) => {
        const p = Number(d.price_from);
        if (!Number.isFinite(p) || p <= 0) return acc;
        return acc === null ? p : Math.min(acc, p);
      }, null);

      return {
        ...kb,
        projects: matchingDevs,
        liveCount,
        minPrice,
        note: notesMap[kb.id]?.text || '',
      };
    });
  }, [devsByDeveloperName, liveLotsByProvider, notesMap]);

  const filteredDevelopers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedDevelopers.filter((kb) => {
      if (activeDevId !== 'all' && kb.id !== activeDevId) return false;
      if (!q) return true;
      const hay = [
        kb.name,
        kb.shortName,
        kb.tagline,
        kb.summary,
        kb.finishingStandards,
        kb.bookingRules,
        kb.mortgagePrograms,
        kb.note,
        ...(kb.strengths || []),
        ...kb.projects.map((p) => `${p.name} ${p.address} ${p.district || ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedDevelopers, activeDevId, query]);

  const filteredGuide = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NEW_BUILDINGS_GUIDE;
    return NEW_BUILDINGS_GUIDE.filter((sec) => {
      const hay = [
        sec.title,
        sec.badge,
        ...sec.items.map((i) => `${i.label} ${i.text}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const startEditNote = (kb) => {
    setEditingNoteDevId(kb.id);
    setNoteDraft(kb.note || '');
  };

  const handleSaveNote = (devId) => {
    const next = saveDeveloperNote(devId, noteDraft);
    setNotesMap(next);
    setEditingNoteDevId(null);
  };

  return (
    <div className="dev-kb-container">
      {/* Header & Search */}
      <div className="dev-kb-hero">
        <div className="dev-kb-hero-top">
          <div>
            <div className="dev-kb-badge">
              <BookOpen size={14} />
              <span>База знаний по новостройкам Кирова</span>
            </div>
            <h2 className="dev-kb-title">Застройщики, стандарты и регламенты работы</h2>
            <p className="dev-kb-sub">
              Вся справочная информация по девелоперам, отделке, фиксации клиентов, ипотеке и ваши заметки в одном месте
            </p>
          </div>
          <div className="dev-kb-search-wrap">
            <Search size={16} className="dev-kb-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по застройщику, ЖК, отделке или правилу..."
              className="dev-kb-search-input"
            />
            {query && (
              <button
                type="button"
                className="dev-kb-clear-btn"
                onClick={() => setQuery('')}
                title="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Developer Filter Pills */}
        <div className="dev-kb-pills">
          <button
            type="button"
            className={`dev-kb-pill ${activeDevId === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveDevId('all');
              onClearInitialDeveloper();
            }}
          >
            Все застройщики ({enrichedDevelopers.length})
          </button>
          {enrichedDevelopers.map((kb) => (
            <button
              key={kb.id}
              type="button"
              className={`dev-kb-pill ${activeDevId === kb.id ? 'active' : ''}`}
              onClick={() => {
                setActiveDevId((prev) => (prev === kb.id ? 'all' : kb.id));
                onClearInitialDeveloper();
              }}
            >
              <DeveloperLogo developer={kb} size={20} />
              <span>{kb.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Developer Cards Grid */}
      <section className="dev-kb-section">
        <div className="dev-kb-section-header">
          <h3>
            <Building2 size={18} />
            <span>Карточки застройщиков</span>
          </h3>
          <span className="dev-kb-count">Показано: {filteredDevelopers.length}</span>
        </div>

        <div className="dev-kb-cards-grid">
          {filteredDevelopers.map((kb) => {
            const isEditing = editingNoteDevId === kb.id;
            return (
              <article key={kb.id} className="dev-kb-card">
                <div className="dev-kb-card-top">
                  <div className="dev-kb-card-brand">
                    <DeveloperLogo developer={kb} size={46} />
                    <div>
                      <h4 className="dev-kb-card-name">{kb.name}</h4>
                      <p className="dev-kb-card-tagline">{kb.tagline}</p>
                    </div>
                  </div>
                  <div className="dev-kb-card-badges">
                    <span className="dev-kb-stat-pill">
                      {kb.projects.length} ЖК
                    </span>
                    {kb.liveCount > 0 && (
                      <span className="dev-kb-stat-pill live">
                        {kb.liveCount} кв. live
                      </span>
                    )}
                  </div>
                </div>

                <p className="dev-kb-card-summary">{kb.summary}</p>

                {/* Strengths */}
                {kb.strengths?.length > 0 && (
                  <ul className="dev-kb-strengths">
                    {kb.strengths.map((s, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={14} />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Structured specs */}
                <div className="dev-kb-specs">
                  {(kb.legalName || kb.inn) && (
                    <div className="dev-kb-spec-row">
                      <span className="dev-kb-spec-label">ЕИСЖС (наш.дом.рф):</span>
                      <span className="dev-kb-spec-val">
                        {[kb.legalName, kb.inn ? `ИНН ${kb.inn}` : null].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                  <div className="dev-kb-spec-row">
                    <span className="dev-kb-spec-label">Отделка:</span>
                    <span className="dev-kb-spec-val">{kb.finishingStandards}</span>
                  </div>
                  <div className="dev-kb-spec-row">
                    <span className="dev-kb-spec-label">Фиксация и бронь:</span>
                    <span className="dev-kb-spec-val">{kb.bookingRules}</span>
                  </div>
                  <div className="dev-kb-spec-row">
                    <span className="dev-kb-spec-label">Ипотека:</span>
                    <span className="dev-kb-spec-val">{kb.mortgagePrograms}</span>
                  </div>
                </div>

                {/* Contacts & Min Price */}
                <div className="dev-kb-meta-bar">
                  {kb.phone && (
                    <a href={`tel:${kb.phone.replace(/[^\d+]/g, '')}`} className="dev-kb-contact-link">
                      <Phone size={13} />
                      <span>{kb.phone}</span>
                    </a>
                  )}
                  {kb.website && (
                    <a
                      href={kb.website}
                      target="_blank"
                      rel="noreferrer"
                      className="dev-kb-contact-link"
                    >
                      <ExternalLink size={13} />
                      <span>Сайт</span>
                    </a>
                  )}
                  {kb.erzUrl && (
                    <a
                      href={kb.erzUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="dev-kb-contact-link"
                    >
                      <ExternalLink size={13} />
                      <span>Реестр ЕИСЖС</span>
                    </a>
                  )}
                  {kb.minPrice && (
                    <span className="dev-kb-min-price">
                      от {formatNumber(kb.minPrice)} ₽
                    </span>
                  )}
                </div>

                {/* Projects list */}
                {kb.projects.length > 0 && (
                  <div className="dev-kb-projects">
                    <span className="dev-kb-projects-label">Жилые комплексы в каталоге:</span>
                    <div className="dev-kb-project-chips">
                      {kb.projects.map((proj) => (
                        <div key={proj.id} className="dev-kb-project-chip">
                          <button
                            type="button"
                            className="dev-kb-proj-open"
                            onClick={() => onOpenDevelopment(proj)}
                            title={`${proj.address} - открыть карточку ЖК`}
                          >
                            {proj.name}
                          </button>
                          <button
                            type="button"
                            className="dev-kb-proj-map"
                            onClick={() => onShowOnMap(proj)}
                            title="Показать на карте"
                          >
                            <MapPin size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Realtor Custom Notes */}
                <div className="dev-kb-note-box">
                  <div className="dev-kb-note-header">
                    <span>
                      <FileText size={13} /> Заметка риелтора
                    </span>
                    {!isEditing && (
                      <button
                        type="button"
                        className="dev-kb-note-edit-btn"
                        onClick={() => startEditNote(kb)}
                      >
                        {kb.note ? 'Изменить' : '+ Добавить'}
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="dev-kb-note-editor">
                      <textarea
                        rows={2}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Например: контакт куратора, размер комиссии, нюансы брони..."
                      />
                      <div className="dev-kb-note-actions">
                        <button
                          type="button"
                          className="dev-kb-note-save"
                          onClick={() => handleSaveNote(kb.id)}
                        >
                          <Save size={13} /> Сохранить
                        </button>
                        <button
                          type="button"
                          className="dev-kb-note-cancel"
                          onClick={() => setEditingNoteDevId(null)}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : kb.note ? (
                    <p className="dev-kb-note-text">{kb.note}</p>
                  ) : (
                    <p className="dev-kb-note-empty">Нет сохранённых заметок по застройщику</p>
                  )}
                </div>

                <div className="dev-kb-card-footer">
                  <button
                    type="button"
                    className="dev-kb-filter-btn"
                    onClick={() => onSelectDeveloperInCatalog(kb.name)}
                  >
                    Показать ЖК в каталоге и на карте
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* General Knowledge Base Guide */}
      <section className="dev-kb-section">
        <div className="dev-kb-section-header">
          <h3>
            <Sparkles size={18} />
            <span>Справочник риелтора по новостройкам</span>
          </h3>
        </div>
        <div className="dev-kb-guide-grid">
          {filteredGuide.map((sec) => (
            <div key={sec.id} className="dev-kb-guide-card">
              <div className="dev-kb-guide-top">
                <span className="dev-kb-guide-badge">{sec.badge}</span>
                <h4>{sec.title}</h4>
              </div>
              <div className="dev-kb-guide-items">
                {sec.items.map((item, idx) => (
                  <div key={idx} className="dev-kb-guide-item">
                    <strong>{item.label}</strong>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
