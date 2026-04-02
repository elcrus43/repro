import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calculator, FileText, ExternalLink } from 'lucide-react';
import { API_BASE } from '../../config';

export function EstimationPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [params, setParams] = useState({
        city: 'Москва',
        district: '',
        rooms: 1,
        total_area: 40,
        floor: 5,
        total_floors: 12,
        deal_type: 'SALE'
    });

    const calculate = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/v1/estimation/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!response.ok) throw new Error('Ошибка при расчёте');
            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/v1/estimation/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'estimation_report.pdf';
            a.click();
        } catch (_err) {
            alert('Ошибка при скачивании PDF');
        }
    };

    return (
        <div className="page fade-in">
            <div className="header-nav">
                <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft /></button>
                <div className="header-title">Оценка стоимости</div>
            </div>

            <div className="page-content">
                <div className="card">
                    <div className="form-group">
                        <label>Город</label>
                        <input type="text" value={params.city} onChange={e => setParams({ ...params, city: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Район</label>
                        <input type="text" value={params.district} onChange={e => setParams({ ...params, district: e.target.value })} placeholder="Например, Пресненский" />
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Комнат</label>
                            <input type="number" value={params.rooms} onChange={e => setParams({ ...params, rooms: parseInt(e.target.value) })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Площадь (м²)</label>
                            <input type="number" value={params.total_area} onChange={e => setParams({ ...params, total_area: parseFloat(e.target.value) })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Этаж</label>
                            <input type="number" value={params.floor} onChange={e => setParams({ ...params, floor: parseInt(e.target.value) })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Всего этажей</label>
                            <input type="number" value={params.total_floors} onChange={e => setParams({ ...params, total_floors: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={calculate} disabled={loading}>
                        {loading ? 'Расчёт...' : <><Calculator size={18} /> Оценить</>}
                    </button>
                </div>

                {error && <div className="notif-banner badge-danger" style={{ marginTop: 16 }}>{error}</div>}

                {result && (
                    <div className="fade-in" style={{ marginTop: 24 }}>
                        <div className="section-title">Результат расчёта</div>
                        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Оценочная стоимость</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>
                                {result.estimated_avg.toLocaleString()} ₽
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, fontSize: 13 }}>
                                <span>от {result.estimated_min.toLocaleString()}</span>
                                <span>до {result.estimated_max.toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <span className={`badge badge-${result.confidence === 'HIGH' ? 'success' : 'warning'}`}>
                                    {result.confidence === 'HIGH' ? 'Высокая точность' : 'Средняя точность'}
                                </span>
                                <span style={{ fontSize: 12 }}>({result.analogs_count} аналогов)</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <button className="btn btn-ghost" onClick={downloadPdf}><FileText size={18} /> PDF Отчёт</button>
                            <button className="btn btn-ghost" onClick={() => setResult(null)}>Сбросить</button>
                        </div>

                        <div className="section-header" style={{ marginTop: 24 }}>
                            <span className="section-title">Ближайшие аналоги</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {result.analogs.map((a, i) => (
                                <div key={i} className="list-row" onClick={() => window.open(a.source_url, '_blank')}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{a.price.toLocaleString()} ₽</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {a.rooms}к • {a.total_area}м² • {a.floor}/{a.total_floors} эт.
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: 11 }}>
                                        <div className="badge badge-subtle">{a.source}</div>
                                        <ExternalLink size={12} style={{ marginLeft: 6, opacity: 0.5 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export for lazy loading
export { EstimationPage as default };
