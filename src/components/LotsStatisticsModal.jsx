import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Search,
  Filter,
  CheckCircle2,
  MinusCircle,
  Home,
  RefreshCw,
} from 'lucide-react';
import { formatNumber } from '../utils/format';
import {
  getLotsStatistics,
  buildLotsStatisticsReportText,
  getTodayDateString,
  getAvailableStatisticsDates,
  DEVELOPER_LABELS,
} from '../lib/lotsStatistics';

const PERIOD_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: '30 дней' },
  { id: 'all', label: 'Все время' },
];

export function LotsStatisticsModal({ isOpen = true, onClose, onRefreshSync }) {
  if (!isOpen) return null;

  const todayStr = useMemo(() => getTodayDateString(), []);
  const yesterdayStr = useMemo(
    () => getTodayDateString(new Date(Date.now() - 86400000)),
    []
  );
  const weekAgoStr = useMemo(
    () => getTodayDateString(new Date(Date.now() - 7 * 86400000)),
    []
  );
  const monthAgoStr = useMemo(
    () => getTodayDateString(new Date(Date.now() - 30 * 86400000)),
    []
  );

  const [periodPreset, setPeriodPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewTab, setViewTab] = useState('projects'); // 'projects' | 'developers' | 'events'
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'added' | 'removed'
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Handle Preset Switching
  const handleSelectPreset = (presetId) => {
    setPeriodPreset(presetId);
    if (presetId === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (presetId === 'yesterday') {
      setDateFrom(yesterdayStr);
      setDateTo(yesterdayStr);
    } else if (presetId === 'week') {
      setDateFrom(weekAgoStr);
      setDateTo(todayStr);
    } else if (presetId === 'month') {
      setDateFrom(monthAgoStr);
      setDateTo(todayStr);
    } else if (presetId === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Compute statistics
  const stats = useMemo(() => {
    return getLotsStatistics({
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      provider: selectedProvider,
      projectSlug: selectedProject,
      changeType: eventFilter,
    });
  }, [dateFrom, dateTo, selectedProvider, selectedProject, eventFilter]);

  // Filter project summaries by search query
  const filteredProjects = useMemo(() => {
    let list = stats.projectSummaries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.providerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stats.projectSummaries, searchQuery]);

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    let list = stats.changeEvents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.projectName.toLowerCase().includes(q) ||
          e.providerName.toLowerCase().includes(q) ||
          e.roomsLabel.toLowerCase().includes(q) ||
          (e.flatNumber && e.flatNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [stats.changeEvents, searchQuery]);

  // Dynamic project options for filter dropdown
  const availableProjects = useMemo(() => {
    const list = stats.projectSummaries.map((p) => ({
      slug: p.projectSlug,
      name: p.projectName,
      provider: p.provider,
    }));
    return list;
  }, [stats.projectSummaries]);

  const handleCopyReport = () => {
    const report = buildLotsStatisticsReportText({
      dateFrom,
      dateTo,
      provider: selectedProvider,
      projectSlug: selectedProject,
    });
    navigator.clipboard.writeText(report);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div
      className="lots-stats-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="lots-stats-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="lots-stats-header">
          <div className="lots-stats-header-info">
            <div className="lots-stats-badge">
              <BarChart3 size={14} />
              <span>Аналитика и учет лотов новостроек</span>
            </div>
            <h2 className="lots-stats-title">Динамика квартир застройщиков</h2>
            <p className="lots-stats-subtitle">
              Ежедневный учет добавленных (+X) и проданных / выбывших (-Y) квартир по застройщикам и проектам
            </p>
          </div>
          <button
            type="button"
            className="lots-stats-close-btn"
            onClick={onClose}
            aria-label="Закрыть статистику"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Toolbar: Periods & Filters */}
        <div className="lots-stats-toolbar">
          {/* Period selector */}
          <div className="lots-stats-periods-row">
            <span className="stats-label">Период:</span>
            <div className="stats-period-tabs">
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`btn-period-tab ${periodPreset === preset.id ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom date range if needed */}
            <div className="stats-date-inputs">
              <Calendar size={13} className="text-muted" />
              <input
                type="date"
                className="stats-date-field"
                value={dateFrom}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setDateFrom(e.target.value);
                }}
                aria-label="Дата с"
              />
              <span>-</span>
              <input
                type="date"
                className="stats-date-field"
                value={dateTo}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setDateTo(e.target.value);
                }}
                aria-label="Дата по"
              />
            </div>

            {/* Copy report button */}
            <button
              type="button"
              className={`btn-stats-copy ${copyFeedback ? 'success' : ''}`}
              onClick={handleCopyReport}
              title="Скопировать готовую сводку для планерки или отчета"
            >
              {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
              <span>{copyFeedback ? 'Скопировано!' : 'Скопировать сводку'}</span>
            </button>
          </div>

          {/* Secondary filter bar */}
          <div className="lots-stats-filters-row">
            {/* Developer Selector */}
            <div className="stats-filter-item">
              <Building2 size={13} className="text-muted" />
              <select
                className="stats-select"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedProject('all');
                }}
              >
                <option value="all">Все застройщики (9)</option>
                {Object.entries(DEVELOPER_LABELS).map(([k, name]) => (
                  <option key={k} value={k}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selector */}
            <div className="stats-filter-item">
              <Home size={13} className="text-muted" />
              <select
                className="stats-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="all">Все проекты (ЖК)</option>
                {availableProjects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="stats-search-box">
              <Search size={13} className="text-muted" />
              <input
                type="text"
                placeholder="Поиск по ЖК или квартире..."
                className="stats-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="lots-stats-kpi-row">
          <div className="stats-kpi-card">
            <span className="kpi-label">В наличии сейчас</span>
            <div className="kpi-value-line">
              <strong className="kpi-number">{formatNumber(stats.totalCurrent)}</strong>
              <span className="kpi-unit">кв.</span>
            </div>
            <span className="kpi-hint">Свободный пул лотов в Кирове</span>
          </div>

          <div className="stats-kpi-card added">
            <span className="kpi-label">Добавлено новых</span>
            <div className="kpi-value-line">
              <ArrowUpRight size={22} className="kpi-icon-up" />
              <strong className="kpi-number text-emerald">
                +{formatNumber(stats.totalAdded)}
              </strong>
              <span className="kpi-unit">кв.</span>
            </div>
            <span className="kpi-hint">Выставлено застройщиками за период</span>
          </div>

          <div className="stats-kpi-card removed">
            <span className="kpi-label">Продано / снято</span>
            <div className="kpi-value-line">
              <ArrowDownRight size={22} className="kpi-icon-down" />
              <strong className="kpi-number text-rose">
                -{formatNumber(stats.totalRemoved)}
              </strong>
              <span className="kpi-unit">кв.</span>
            </div>
            <span className="kpi-hint">Выбыло из свободной продажи</span>
          </div>

          <div className="stats-kpi-card net">
            <span className="kpi-label">Баланс рынка (Net)</span>
            <div className="kpi-value-line">
              <strong
                className={`kpi-number ${stats.netChange >= 0 ? 'text-emerald' : 'text-rose'}`}
              >
                {stats.netChange >= 0 ? `+${formatNumber(stats.netChange)}` : formatNumber(stats.netChange)}
              </strong>
              <span className="kpi-unit">кв.</span>
            </div>
            <span className="kpi-hint">Разница между приходом и продажами</span>
          </div>
        </div>

        {/* Tab switcher: Projects table vs Developers vs Change Log Events */}
        <div className="lots-stats-tabs-bar">
          <div className="stats-view-tabs">
            <button
              type="button"
              className={`btn-view-tab ${viewTab === 'projects' ? 'active' : ''}`}
              onClick={() => setViewTab('projects')}
            >
              <Building2 size={15} />
              <span>По проектам (ЖК) ({filteredProjects.length})</span>
            </button>
            <button
              type="button"
              className={`btn-view-tab ${viewTab === 'developers' ? 'active' : ''}`}
              onClick={() => setViewTab('developers')}
            >
              <Layers size={15} />
              <span>По застройщикам ({stats.providerSummaries.length})</span>
            </button>
            <button
              type="button"
              className={`btn-view-tab ${viewTab === 'events' ? 'active' : ''}`}
              onClick={() => setViewTab('events')}
            >
              <TrendingUp size={15} />
              <span>Журнал движения квартир ({filteredEvents.length})</span>
            </button>
          </div>

          {viewTab === 'events' && (
            <div className="stats-event-filter-pills">
              <button
                type="button"
                className={`btn-filter-pill ${eventFilter === 'all' ? 'active' : ''}`}
                onClick={() => setEventFilter('all')}
              >
                Все
              </button>
              <button
                type="button"
                className={`btn-filter-pill green ${eventFilter === 'added' ? 'active' : ''}`}
                onClick={() => setEventFilter('added')}
              >
                + Добавленные
              </button>
              <button
                type="button"
                className={`btn-filter-pill red ${eventFilter === 'removed' ? 'active' : ''}`}
                onClick={() => setEventFilter('removed')}
              >
                - Проданные/снятые
              </button>
            </div>
          )}
        </div>

        {/* Content Pane */}
        <div className="lots-stats-content-pane">
          {viewTab === 'projects' && (
            <div className="stats-table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Застройщик</th>
                    <th>Проект (ЖК)</th>
                    <th className="text-right">В наличии</th>
                    <th className="text-right">Добавлено</th>
                    <th className="text-right">Продано/снято</th>
                    <th className="text-right">Баланс</th>
                    <th className="text-right">Обновлено</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((proj) => {
                      const net = proj.addedCount - proj.removedCount;
                      return (
                        <tr key={`${proj.provider}_${proj.projectSlug}`}>
                          <td>
                            <span className={`stats-provider-tag ${proj.provider}`}>
                              {proj.providerName}
                            </span>
                          </td>
                          <td>
                            <strong className="stats-project-title">{proj.projectName}</strong>
                          </td>
                          <td className="text-right">
                            <span className="stats-current-pill">
                              {formatNumber(proj.currentCount)} кв.
                            </span>
                          </td>
                          <td className="text-right">
                            <span className={`stats-diff-badge ${proj.addedCount > 0 ? 'plus' : 'zero'}`}>
                              {proj.addedCount > 0 ? `+${proj.addedCount}` : '0'}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className={`stats-diff-badge ${proj.removedCount > 0 ? 'minus' : 'zero'}`}>
                              {proj.removedCount > 0 ? `-${proj.removedCount}` : '0'}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className={`stats-net-badge ${net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral'}`}>
                              {net > 0 ? `+${net}` : net}
                            </span>
                          </td>
                          <td className="text-right text-muted text-small">
                            {proj.lastUpdatedAt
                              ? new Date(proj.lastUpdatedAt).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="stats-empty-cell">
                        Нет данных за выбранный период или по заданным фильтрам
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {viewTab === 'developers' && (
            <div className="stats-devs-grid">
              {stats.providerSummaries.map((dev) => {
                const net = dev.addedCount - dev.removedCount;
                return (
                  <div key={dev.provider} className="stats-dev-card">
                    <div className="stats-dev-card-head">
                      <span className={`stats-provider-tag lg ${dev.provider}`}>
                        {dev.providerName}
                      </span>
                      <span className="stats-dev-projects-count">
                        {dev.projectsCount} ЖК в базе
                      </span>
                    </div>

                    <div className="stats-dev-card-body">
                      <div className="stats-dev-metric">
                        <span className="metric-label">В наличии:</span>
                        <strong className="metric-val">{formatNumber(dev.currentCount)} кв.</strong>
                      </div>
                      <div className="stats-dev-metric">
                        <span className="metric-label">Добавлено (+):</span>
                        <span className="metric-val text-emerald">+{dev.addedCount}</span>
                      </div>
                      <div className="stats-dev-metric">
                        <span className="metric-label">Продано (-):</span>
                        <span className="metric-val text-rose">-{dev.removedCount}</span>
                      </div>
                      <div className="stats-dev-metric">
                        <span className="metric-label">Баланс движения:</span>
                        <span className={`metric-val ${net >= 0 ? 'text-emerald' : 'text-rose'}`}>
                          {net >= 0 ? `+${net}` : net}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewTab === 'events' && (
            <div className="stats-events-list">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => {
                  const isAdd = evt.changeType === 'added';
                  return (
                    <div key={evt.id} className={`stats-event-row ${isAdd ? 'add' : 'rem'}`}>
                      <div className="stats-event-status">
                        {isAdd ? (
                          <div className="status-badge add">
                            <CheckCircle2 size={14} />
                            <span>Добавлена</span>
                          </div>
                        ) : (
                          <div className="status-badge rem">
                            <MinusCircle size={14} />
                            <span>Продана / снята</span>
                          </div>
                        )}
                        <span className="event-date">
                          {evt.date} ·{' '}
                          {new Date(evt.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="stats-event-main">
                        <div className="event-project-line">
                          <span className={`stats-provider-tag sm ${evt.provider}`}>
                            {evt.providerName}
                          </span>
                          <strong className="event-project-name">{evt.projectName}</strong>
                        </div>

                        <div className="event-flat-specs">
                          <span className="event-rooms">{evt.roomsLabel}</span>
                          {evt.area ? <span>· {evt.area} м²</span> : ''}
                          {evt.floor ? <span>· {evt.floor} этаж</span> : ''}
                          {evt.flatNumber ? <span>· кв. № {evt.flatNumber}</span> : ''}
                        </div>
                      </div>

                      <div className="stats-event-price">
                        {evt.price ? (
                          <>
                            <strong>{formatNumber(evt.price)} ₽</strong>
                            {evt.priceSqm && <small>{formatNumber(evt.priceSqm)} ₽/м²</small>}
                          </>
                        ) : (
                          <span className="text-muted">Цена по запросу</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="stats-empty-events">
                  <span>За выбранный период движений лотов не зафиксировано</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .lots-stats-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 15, 26, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .lots-stats-modal-window {
          background: #ffffff;
          width: 100%;
          max-width: 1100px;
          height: 92vh;
          max-height: 860px;
          border-radius: 20px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dark .lots-stats-modal-window {
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Header */
        .lots-stats-header {
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          background: #f8fafc;
        }

        .dark .lots-stats-header {
          background: #1e293b;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .lots-stats-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0052ff;
          background: rgba(0, 82, 255, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 4px;
        }

        .dark .lots-stats-badge {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
        }

        .lots-stats-title {
          font-size: 19px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .dark .lots-stats-title {
          color: #ffffff;
        }

        .lots-stats-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 3px 0 0;
        }

        .dark .lots-stats-subtitle {
          color: #94a3b8;
        }

        .lots-stats-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s;
        }

        .dark .lots-stats-close-btn {
          background: #334155;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .lots-stats-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Toolbar */
        .lots-stats-toolbar {
          padding: 12px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dark .lots-stats-toolbar {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .lots-stats-periods-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .stats-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .stats-period-tabs {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 9px;
        }

        .dark .stats-period-tabs {
          background: #1e293b;
        }

        .btn-period-tab {
          padding: 5px 11px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-period-tab {
          color: #94a3b8;
        }

        .btn-period-tab.active {
          background: #ffffff;
          color: #0052ff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dark .btn-period-tab.active {
          background: #334155;
          color: #60a5fa;
        }

        .stats-date-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .dark .stats-date-inputs {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .stats-date-field {
          border: none;
          background: transparent;
          font-size: 12px;
          color: inherit;
          outline: none;
        }

        .btn-stats-copy {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dark .btn-stats-copy {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .btn-stats-copy:hover {
          background: #f1f5f9;
          color: #0052ff;
        }

        .btn-stats-copy.success {
          background: #10b981;
          color: #ffffff;
          border-color: #10b981;
        }

        .lots-stats-filters-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stats-filter-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 4px 10px;
        }

        .dark .stats-filter-item {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .stats-select {
          border: none;
          background: transparent;
          font-size: 12px;
          color: inherit;
          outline: none;
          cursor: pointer;
        }

        .stats-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 200px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 4px 10px;
        }

        .dark .stats-search-box {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .stats-search-input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 12px;
          color: inherit;
          outline: none;
        }

        /* KPI Cards */
        .lots-stats-kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 16px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .dark .lots-stats-kpi-row {
          background: #131d31;
          border-color: rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 768px) {
          .lots-stats-kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stats-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
        }

        .dark .stats-kpi-card {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .stats-kpi-card.added {
          border-left: 4px solid #10b981;
        }

        .stats-kpi-card.removed {
          border-left: 4px solid #f43f5e;
        }

        .stats-kpi-card.net {
          border-left: 4px solid #0052ff;
        }

        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
        }

        .dark .kpi-label {
          color: #94a3b8;
        }

        .kpi-value-line {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .kpi-number {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }

        .dark .kpi-number {
          color: #f8fafc;
        }

        .kpi-unit {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .kpi-hint {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .text-emerald { color: #10b981 !important; }
        .text-rose { color: #f43f5e !important; }

        .kpi-icon-up { color: #10b981; }
        .kpi-icon-down { color: #f43f5e; }

        /* Tabs Bar */
        .lots-stats-tabs-bar {
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
        }

        .dark .lots-stats-tabs-bar {
          border-color: rgba(255, 255, 255, 0.08);
        }

        .stats-view-tabs {
          display: flex;
          gap: 6px;
        }

        .btn-view-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-view-tab.active {
          background: rgba(0, 82, 255, 0.08);
          color: #0052ff;
          border-color: rgba(0, 82, 255, 0.2);
        }

        .dark .btn-view-tab.active {
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
          border-color: rgba(96, 165, 250, 0.3);
        }

        .stats-event-filter-pills {
          display: flex;
          gap: 4px;
        }

        .btn-filter-pill {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
        }

        .dark .btn-filter-pill {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }

        .btn-filter-pill.active {
          background: #0f172a;
          color: #ffffff;
        }

        .btn-filter-pill.green.active {
          background: #10b981;
          color: #ffffff;
          border-color: #10b981;
        }

        .btn-filter-pill.red.active {
          background: #f43f5e;
          color: #ffffff;
          border-color: #f43f5e;
        }

        /* Content */
        .lots-stats-content-pane {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
        }

        /* Table */
        .stats-table-wrap {
          overflow-x: auto;
        }

        .stats-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .stats-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
        }

        .dark .stats-table th {
          border-bottom-color: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }

        .stats-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .dark .stats-table td {
          border-bottom-color: rgba(255, 255, 255, 0.05);
        }

        .text-right { text-align: right !important; }
        .text-muted { color: #94a3b8; }
        .text-small { font-size: 11px; }

        .stats-provider-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e2e8f0;
          color: #1e293b;
        }

        .dark .stats-provider-tag {
          background: #334155;
          color: #f1f5f9;
        }

        .stats-provider-tag.ksm { background: #dbeafe; color: #1e40af; }
        .stats-provider-tag.kssk { background: #dcfce7; color: #166534; }
        .stats-provider-tag.kino { background: #fae8ff; color: #86198f; }
        .stats-provider-tag.zhelezno { background: #ffedd5; color: #9a3412; }
        .stats-provider-tag.stroysoyuz { background: #ccfbf1; color: #115e59; }
        .stats-provider-tag.profstroy { background: #e0e7ff; color: #3730a3; }
        .stats-provider-tag.smu5 { background: #fef3c7; color: #92400e; }
        .stats-provider-tag.avitek { background: #f1f5f9; color: #334155; }
        .stats-provider-tag.altai { background: #fee2e2; color: #991b1b; }

        .stats-provider-tag.lg { font-size: 12px; padding: 4px 10px; }
        .stats-provider-tag.sm { font-size: 9px; padding: 1px 4px; }

        .stats-project-title {
          font-weight: 700;
          color: #0f172a;
        }

        .dark .stats-project-title {
          color: #f8fafc;
        }

        .stats-current-pill {
          font-weight: 700;
          color: #0052ff;
        }

        .dark .stats-current-pill {
          color: #60a5fa;
        }

        .stats-diff-badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 5px;
          font-weight: 700;
          font-size: 12px;
        }

        .stats-diff-badge.plus {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
        }

        .stats-diff-badge.minus {
          background: rgba(244, 63, 94, 0.12);
          color: #e11d48;
        }

        .stats-diff-badge.zero {
          color: #94a3b8;
        }

        .stats-net-badge {
          display: inline-block;
          font-weight: 800;
          font-size: 12px;
        }

        .stats-net-badge.positive { color: #10b981; }
        .stats-net-badge.negative { color: #f43f5e; }
        .stats-net-badge.neutral { color: #64748b; }

        .stats-empty-cell {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        /* Developers Grid */
        .stats-devs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 900px) {
          .stats-devs-grid {
            grid-template-columns: 1fr;
          }
        }

        .stats-dev-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
        }

        .dark .stats-dev-card {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .stats-dev-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .stats-dev-projects-count {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }

        .dark .stats-dev-projects-count {
          color: #94a3b8;
        }

        .stats-dev-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stats-dev-metric {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }

        .metric-label {
          color: #64748b;
        }

        .dark .metric-label {
          color: #94a3b8;
        }

        .metric-val {
          font-weight: 700;
        }

        /* Events list */
        .stats-events-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stats-event-row {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .dark .stats-event-row {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .stats-event-row.add {
          border-left: 4px solid #10b981;
        }

        .stats-event-row.rem {
          border-left: 4px solid #f43f5e;
        }

        .stats-event-status {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 140px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-badge.add { color: #10b981; }
        .status-badge.rem { color: #f43f5e; }

        .event-date {
          font-size: 11px;
          color: #94a3b8;
        }

        .stats-event-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .event-project-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .event-project-name {
          font-size: 13px;
          color: #0f172a;
        }

        .dark .event-project-name {
          color: #f8fafc;
        }

        .event-flat-specs {
          font-size: 12px;
          color: #64748b;
        }

        .dark .event-flat-specs {
          color: #94a3b8;
        }

        .stats-event-price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 13px;
        }

        .stats-event-price small {
          font-size: 11px;
          color: #94a3b8;
        }

        .stats-empty-events {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
