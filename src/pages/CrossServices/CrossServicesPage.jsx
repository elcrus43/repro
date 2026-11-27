import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Copy, Pencil, Trash2, Phone, User, Paperclip, Briefcase, Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { GlobalSearch } from '../../components/GlobalSearch';
import { CrossServiceModal } from '../../components/CrossServiceModal';
import {
  CROSS_SERVICE_TEMPLATES,
  CROSS_SERVICE_CATEGORIES,
  CROSS_SERVICE_STATUSES,
  getCrossServiceTemplate,
  getCrossServiceStatusMeta,
  buildCrossServiceSearchText,
  formatCrossServiceShareText,
} from '../../data/crossServices';
import { formatPhone, formatNumber, stripPhone } from '../../utils/format';

export function CrossServicesPage() {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();
  const navigate = useNavigate();

  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ open: false, item: null, serviceType: 'rentier_insurance' });

  const clientsById = useMemo(() => {
    const map = new Map();
    (state.clients || []).forEach(c => map.set(c.id, c));
    return map;
  }, [state.clients]);

  const items = useMemo(() => {
    const list = Array.isArray(state.crossServices) ? state.crossServices : [];
    const q = search.trim().toLowerCase();

    return list.filter(item => {
      const tpl = getCrossServiceTemplate(item.service_type);
      if (category !== 'all' && tpl.category !== category) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && item.service_type !== serviceFilter) return false;
      if (q) {
        const client = item.client_id ? clientsById.get(item.client_id) : null;
        const haystack = buildCrossServiceSearchText(item, client);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [state.crossServices, category, statusFilter, serviceFilter, search, clientsById]);

  const stats = useMemo(() => {
    const all = Array.isArray(state.crossServices) ? state.crossServices : [];
    const active = all.filter(i => ['new', 'in_progress', 'awaiting_payment'].includes(i.status)).length;
    const completed = all.filter(i => i.status === 'completed').length;
    const totalCommission = all.reduce((sum, i) => sum + (Number(i.commission) || 0), 0);
    return { total: all.length, active, completed, totalCommission };
  }, [state.crossServices]);

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(formatCrossServiceShareText(item));
      toast.success('Заявка скопирована');
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const handleDelete = async (item) => {
    const tpl = getCrossServiceTemplate(item.service_type);
    if (!window.confirm(`Удалить заявку «${tpl.shortTitle}» (${item.client_name || 'без имени'})?`)) return;
    await dispatch({ type: 'DELETE_CROSS_SERVICE', id: item.id });
    toast.success('Заявка удалена');
  };

  const handleStatusChange = async (item, newStatus) => {
    await dispatch({
      type: 'UPDATE_CROSS_SERVICE',
      item: { ...item, status: newStatus },
    });
    toast.success('Статус обновлён');
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 100 }}>
      {/* Topbar */}
      <div className="topbar" style={{ justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Briefcase size={20} color="var(--primary)" />
          <span className="topbar-title font-oswald" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Кросс-услуги
          </span>
        </div>
        <GlobalSearch className="list-topbar-search" />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModalState({ open: true, item: null, serviceType: 'rentier_insurance' })}
          style={{ borderRadius: 12, height: 38, padding: '0 14px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <Plus size={16} /> Новая заявка
        </button>
      </div>

      <div className="page-content" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div className="card" style={{ padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Всего заявок</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>В работе</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{stats.active}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Оформлено</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{stats.completed}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Комиссия</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{formatNumber(stats.totalCommission)} ₽</div>
          </div>
        </div>

        {/* Быстрый запуск по шаблонам */}
        <div className="card" style={{ padding: '14px 16px', borderRadius: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Быстро создать заявку по форме
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CROSS_SERVICE_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModalState({ open: true, item: null, serviceType: t.id })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: `1px solid ${t.color}33`,
                  background: `${t.color}12`,
                  color: t.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + {t.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* Фильтры и поиск */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CROSS_SERVICE_CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  border: category === c.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: category === c.id ? 'var(--primary)' : 'var(--surface)',
                  color: category === c.id ? '#fff' : 'var(--text)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5,
            }}
          >
            <option value="all">Все типы услуг</option>
            {CROSS_SERVICE_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.shortTitle}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5,
            }}
          >
            <option value="all">Все статусы</option>
            {CROSS_SERVICE_STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, телефону, ГРЗ, адресу..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 32px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
              }}
            />
          </div>
        </div>

        {/* Список заявок */}
        {items.length === 0 ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 20, color: 'var(--text-secondary)' }}>
            <Filter size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Заявок пока нет</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Нажмите «Новая заявка» или выберите шаблон услуги выше</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {items.map(item => {
              const tpl = getCrossServiceTemplate(item.service_type);
              const st = getCrossServiceStatusMeta(item.status);
              const linkedClient = item.client_id ? clientsById.get(item.client_id) : null;
              const displayName = item.client_name || linkedClient?.full_name || 'Клиент не указан';
              const displayPhone = item.client_phone || linkedClient?.phone || '';
              const attCount = Array.isArray(item.attachments) ? item.attachments.length : 0;

              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    borderLeft: `4px solid ${tpl.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: `${tpl.color}16`, color: tpl.color,
                    }}>
                      {tpl.shortTitle}
                    </span>

                    <select
                      value={item.status || 'new'}
                      onChange={e => handleStatusChange(item, e.target.value)}
                      style={{
                        padding: '3px 8px', borderRadius: 8, border: 'none',
                        background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {CROSS_SERVICE_STATUSES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                      <User size={14} color="var(--text-secondary)" />
                      {linkedClient ? (
                        <span
                          onClick={() => navigate(`/clients/${linkedClient.id}`)}
                          style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                        >
                          {displayName}
                        </span>
                      ) : (
                        <span>{displayName}</span>
                      )}
                    </div>
                    {displayPhone && (
                      <a
                        href={`tel:+${stripPhone(displayPhone)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'none', marginTop: 3 }}
                      >
                        <Phone size={12} /> {formatPhone(displayPhone)}
                      </a>
                    )}
                  </div>

                  {/* Краткие ключевые поля */}
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {tpl.fields.slice(0, 4).map(f => {
                      if (['client_name', 'owner_name', 'client_phone', 'owner_phone'].includes(f.key)) return null;
                      const v = item.details?.[f.key];
                      if (!v) return null;
                      return (
                        <div key={f.key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ opacity: 0.75 }}>{f.label}:</span> <strong>{v}</strong>
                        </div>
                      );
                    })}
                    {item.notes && (
                      <div style={{ opacity: 0.85, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{
                    marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : ''}</span>
                      {item.commission ? <strong style={{ color: '#10b981' }}>+{formatNumber(item.commission)} ₽</strong> : null}
                      {attCount > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Paperclip size={12} /> {attCount}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        title="Скопировать заявку"
                        style={{
                          padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg-light)', color: 'var(--text)', cursor: 'pointer',
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalState({ open: true, item, serviceType: item.service_type })}
                        title="Редактировать"
                        style={{
                          padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg-light)', color: 'var(--text)', cursor: 'pointer',
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title="Удалить"
                        style={{
                          padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg-light)', color: '#ef4444', cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalState.open && (
        <CrossServiceModal
          isOpen={modalState.open}
          initialItem={modalState.item}
          initialServiceType={modalState.serviceType}
          onClose={() => setModalState({ open: false, item: null, serviceType: 'rentier_insurance' })}
        />
      )}
    </div>
  );
}
