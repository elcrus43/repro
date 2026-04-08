import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Edit2, Trash2, Sparkles, Building2, Calculator, ExternalLink, ChevronDown, ChevronUp, Phone, User } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { estimateOffline } from '../../utils/estimation';

/* ─── Inline Estimation Widget (offline, no backend needed) ─────────────────── */
function EstimationWidget({ prop }) {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [params, setParams] = useState({
        city: prop?.city || 'Киров',
        district: prop?.district || prop?.microdistrict || '',
        rooms: prop?.rooms ?? 1,
        total_area: prop?.area_total || 0,
        deal_type: prop?.deal_type === 'rent' ? 'RENT' : 'SALE',
    });

    // Get all districts + microdistricts for current city
    const districtOptions = params.city === 'Киров'
        ? KIROV_DISTRICTS.flatMap(d => [d.name, ...d.microdistricts])
        : [];

    const calculate = () => {
        const res = estimateOffline(params);
        setResult(res);
    };

    const avgPerM2 = result?.price_per_m2;

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
                onClick={() => setOpen(o => !o)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'var(--primary-light)', padding: 8, borderRadius: 8, color: 'var(--primary)' }}>
                        <Calculator size={18} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Оценка по аналогам</div>
                        {result ? (
                            <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>
                                {result.estimated_avg.toLocaleString()} ₽
                                {params.deal_type === 'RENT' ? '/мес' : ''}
                                &nbsp;·&nbsp;{avgPerM2?.toLocaleString()} ₽/м²
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нажмите для расчёта</div>
                        )}
                    </div>
                </div>
                {open ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>

            {open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-light)' }}>
                    {/* Compact 3-field form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                        {/* City */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Город</label>
                            <select
                                className="form-select"
                                value={params.city}
                                onChange={e => setParams({ ...params, city: e.target.value, district: '' })}
                            >
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* District / Location */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Район / Локация</label>
                            {districtOptions.length > 0 ? (
                                <select
                                    className="form-select"
                                    value={params.district}
                                    onChange={e => setParams({ ...params, district: e.target.value })}
                                >
                                    <option value="">— Выбрать район —</option>
                                    {KIROV_DISTRICTS.map(d => (
                                        <optgroup key={d.name} label={d.name}>
                                            <option value={d.name}>{d.name} (весь район)</option>
                                            {d.microdistricts.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className="form-input"
                                    value={params.district}
                                    onChange={e => setParams({ ...params, district: e.target.value })}
                                    placeholder="Район (необязательно)"
                                />
                            )}
                        </div>

                        {/* Rooms */}
                        <div className="form-group">
                            <label className="form-label">Комнат</label>
                            <select
                                className="form-select"
                                value={params.rooms}
                                onChange={e => setParams({ ...params, rooms: parseInt(e.target.value) })}
                            >
                                <option value={0}>Студия</option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4+</option>
                            </select>
                        </div>

                        {/* Area — optional, use typical if blank */}
                        <div className="form-group">
                            <label className="form-label">Площадь м² <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)' }}>(необ.)</span></label>
                            <input
                                className="form-input"
                                type="number"
                                value={params.total_area || ''}
                                onChange={e => setParams({ ...params, total_area: parseFloat(e.target.value) || 0 })}
                                placeholder="Авто"
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 12 }}
                        onClick={calculate}
                    >
                        <Calculator size={16} /> Рассчитать стоимость
                    </button>

                    {result && (
                        <div style={{ marginTop: 16 }} className="fade-in">
                            {/* Result block */}
                            <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '16px', textAlign: 'center', marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                    Оценочная стоимость {params.deal_type === 'RENT' ? '(аренда/мес)' : '(продажа)'}
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', letterSpacing: -1 }}>
                                    {result.estimated_avg.toLocaleString()} ₽
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <span>от {result.estimated_min.toLocaleString()}</span>
                                    <span>до {result.estimated_max.toLocaleString()}</span>
                                </div>
                                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span className={`badge badge-${result.confidence === 'HIGH' ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>
                                        {result.confidence === 'HIGH' ? '✓ Высокая точность' : '~ Средняя точность'}
                                    </span>
                                    <span className="badge badge-muted" style={{ fontSize: 11 }}>
                                        {result.price_per_m2.toLocaleString()} ₽/м²
                                    </span>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                    Расчёт на основе средних цен {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                </div>
                            </div>

                            {/* Avito search link */}
                            <a
                                href={result.avito_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, textDecoration: 'none' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    window.open(result.avito_url, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <ExternalLink size={16} />
                                Смотреть объявления на Авито
                            </a>

                            {/* Analogs list */}
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                Поиск аналогов на Авито
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {result.analogs.map(a => (
                                    <div
                                        key={a.id}
                                        className="list-row"
                                        onClick={() => window.open(a.source_url, '_blank', 'noopener,noreferrer')}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span className="badge badge-subtle" style={{ fontSize: 11 }}>{a.label}</span>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                                                    {a.price.toLocaleString()} ₽
                                                    {params.deal_type === 'RENT' ? '/мес' : ''}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {typeof a.rooms === 'number' ? `${a.rooms}к` : a.rooms} · {a.total_area} м² · {a.district}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)' }}>
                                            {a.source} <ExternalLink size={10} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                                * Оценка носит справочный характер. Ссылки ведут на поиск Авито по аналогичным параметрам.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── DetailsPage ────────────────────────────────────────────────────────────── */
export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const prop = state.properties.find(p => p.id === id);
    const client = state.clients.find(c => c.id === prop?.client_id);
    const matches = state.matches.filter(m => m.property_id === id);
    const showings = state.showings.filter(s => s.property_id === id);

    // Unified history from showings with event_type
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча с собственником',
        viewing: 'Просмотр',
        deposit: 'Задаток',
        deal: 'Сделка',
    };

    const events = showings
        .map(s => {
            const buyer = s.client_id ? state.clients.find(c => c.id === s.client_id) : null;
            return {
                ...s,
                buyer,
                dateObj: s.showing_date ? new Date(s.showing_date) : null,
                typeLabel: eventTypeLabels[s.event_type] || 'Показ',
            };
        })
        .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));

    if (!prop) return (
        <div className="page">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Объект не найден</span>
            </div>
        </div>
    );

    const statusLabels = { active: 'В продаже', paused: 'Пауза', deal_closed: 'Продано', refused: 'Снято' };
    const statusColors = { active: 'lime', paused: 'blue', deal_closed: 'green', refused: 'red' };
    const status = prop.status || 'active';

    function handleDelete() {
        if (window.confirm('Удалить этот объект?')) {
            dispatch({ type: 'DELETE_PROPERTY', id });
            navigate('/properties');
        }
    }

    // Initials helper
    const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Карточка объекта</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/properties/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Header Card */}
                <div className="card" style={{ padding: '0 0 16px 0', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '20px 16px', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>{formatNumber(prop.price)} ₽</div>
                            <span className={`badge badge-${statusColors[status]}`} style={{ fontSize: 12 }}>{statusLabels[status]}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{prop.address || prop.city}</div>
                    </div>

                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Общая S</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_total} м²</div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Жилая S</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_living || '—'} м²</div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Кухня</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_kitchen || '—'} м²</div>
                        </div>
                    </div>

                    <div style={{ padding: '0 16px 0', display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            onClick={() => navigate(`/matches?property_id=${id}`)}
                        >
                            <Sparkles size={18} /> Совпадения ({matches.length})
                        </button>
                    </div>
                </div>

                {/* ГАЛЕРЕЯ ФОТО */}
                {prop.images && prop.images.length > 0 && (
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: 12 }}>Фотографии ({prop.images.length})</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {prop.images.map((url, index) => (
                                <div key={index} style={{ width: 'calc(50% - 4px)', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                    <img src={url} alt={`Фото ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Client */}
                {client && (
                    <div className="card" onClick={() => navigate(`/clients/${client.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="section-title">Собственник</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                            {/* Initials only — no photo */}
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'var(--border)', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5,
                            }}>
                                {initials(client.full_name)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>{client.full_name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client.phone}</div>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                        </div>
                    </div>
                )}

                {/* Features */}
                <div className="card">
                    <div className="section-title">Параметры</div>
                    <div className="info-grid" style={{ marginTop: 8 }}>
                        <div className="info-row">
                            <span className="info-key"><Building2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Тип объекта</span>
                            <span className="info-val">{PROPERTY_TYPES[prop.property_type]}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Комнат</span>
                            <span className="info-val">{prop.rooms || 'Студия'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Этаж</span>
                            <span className="info-val">{prop.floor} из {prop.floors_total || 9}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Год постройки</span>
                            <span className="info-val">{prop.build_year || '—'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Тип сделки</span>
                            <span className="info-val">{prop.deal_type === 'sale' ? 'Продажа' : 'Аренда'}</span>
                        </div>
                        <div className="info-row" style={{ borderBottom: 'none' }}>
                            <span className="info-key">Комиссия</span>
                            <span className="info-val" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatNumber(prop.commission)} ₽</span>
                        </div>
                    </div>
                </div>

                {/* Estimation Widget */}
                <EstimationWidget prop={prop} />

                {/* ИСТОРИЯ — все события по объекту */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>История ({events.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/showings/new?property_id=${id}`)} style={{ color: 'var(--primary)', fontSize: 20 }}>+</button>
                    </div>
                    {events.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Пока нет событий</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {events.map(ev => {
                                const dateStr = ev.dateObj ? ev.dateObj.toLocaleDateString('ru-RU') : '—';
                                const timeStr = ev.dateObj ? ev.dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                const editRoute = `/showings/new?id=${ev.id}`;

                                const feedbackLabels = {
                                    interested: 'Заинтересован',
                                    other_options: 'Ищет другие варианты',
                                    price_high: 'Дорого',
                                    layout_bad: 'Не нравится планировка',
                                    location_bad: 'Не нравится расположение',
                                    condition_bad: 'Плохое состояние',
                                    ready: 'Готов к сделке',
                                };
                                const feedback = ev.client_feedback ? feedbackLabels[ev.client_feedback] || ev.client_feedback : '';

                                return (
                                    <div key={ev.id} style={{ padding: '12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                                        {/* Заголовок + дата/время + иконка редактирования */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.typeLabel}: {ev.buyer?.full_name || 'Покупатель'}</div>
                                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{dateStr}</div>
                                                {timeStr && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeStr}</div>}
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}
                                                    onClick={() => navigate(editRoute)}
                                                    title="Редактировать"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Отзыв / Комментарий — единая строка */}
                                        {(feedback || ev.feedback_comment) && (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {[feedback, ev.feedback_comment].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {prop.notes && (
                    <div className="card">
                        <div className="section-title">Описание</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: 8 }}>{prop.notes}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
