import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../../components/Toast';
import { ChevronLeft, Calculator, FileText, ExternalLink } from 'lucide-react';
import { estimateOffline } from '../../utils/estimation';

/**
 * Оценка стоимости — работает полностью офлайн (без внешнего backend).
 * Расчёт: src/utils/estimation.js (estimateOffline).
 * PDF собирается на клиенте через html2canvas + jspdf.
 */
export function EstimationPage() {
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const resultRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
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

    const calculate = () => {
        setLoading(true);
        setError(null);
        try {
            const data = estimateOffline({
                city: params.city,
                district: params.district,
                rooms: params.rooms,
                total_area: params.total_area,
                deal_type: params.deal_type,
            });
            setResult(data);
        } catch (e) {
            console.error('[estimation]', e);
            setError('Не удалось выполнить расчёт. Проверьте введённые данные.');
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = async () => {
        if (!resultRef.current) return;
        setPdfLoading(true);
        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ]);

            const canvas = await html2canvas(resultRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgW = pageW - margin * 2;
            const imgH = (canvas.height * imgW) / canvas.width;
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            let heightLeft = imgH;
            let position = margin;
            pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
            heightLeft -= (pageH - margin * 2);

            while (heightLeft > 0) {
                position = heightLeft - imgH + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
                heightLeft -= (pageH - margin * 2);
            }

            const safeCity = (params.city || 'Объект').replace(/\s+/g, '_');
            pdf.save(`Оценка_${safeCity}.pdf`);
        } catch (e) {
            console.error('[estimation pdf]', e);
            toast.error('Ошибка при скачивании PDF');
        } finally {
            setPdfLoading(false);
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
                    <div className="form-group">
                        <label>Тип сделки</label>
                        <select value={params.deal_type} onChange={e => setParams({ ...params, deal_type: e.target.value })}>
                            <option value="SALE">Купля-продажа</option>
                            <option value="RENT">Аренда</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Комнат</label>
                            <input type="number" value={params.rooms} onChange={e => setParams({ ...params, rooms: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Площадь (м²)</label>
                            <input type="number" value={params.total_area} onChange={e => setParams({ ...params, total_area: parseFloat(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Этаж</label>
                            <input type="number" value={params.floor} onChange={e => setParams({ ...params, floor: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Всего этажей</label>
                            <input type="number" value={params.total_floors} onChange={e => setParams({ ...params, total_floors: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="form-submit-container" style={{ marginTop: 12, marginBottom: 0 }}>
                        <button className="form-submit-btn btn btn-primary card-clickable" onClick={calculate} disabled={loading}>
                            {loading ? 'Расчёт...' : <><Calculator size={18} /> Оценить</>}
                        </button>
                    </div>
                </div>

                {error && <div className="notif-banner badge-danger" style={{ marginTop: 16 }}>{error}</div>}

                {result && (
                    <div className="fade-in" style={{ marginTop: 24 }}>
                        <div className="section-title">Результат расчёта</div>

                        <div
                            ref={resultRef}
                            style={{
                                background: '#ffffff',
                                color: '#111827',
                                borderRadius: 18,
                                padding: '20px 18px',
                                border: '1px solid #e5e7eb',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                                    Оценка стоимости
                                </div>
                                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                                    {new Date().toLocaleDateString('ru-RU')}
                                </div>
                            </div>

                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                                {[params.city, params.district].filter(Boolean).join(', ')}
                                {' • '}
                                {params.rooms === 0 ? 'Студия' : `${params.rooms}-комн.`}
                                {' • '}
                                {params.total_area} м²
                                {' • '}
                                {params.deal_type === 'RENT' ? 'аренда' : 'купля-продажа'}
                            </div>

                            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                    {params.deal_type === 'RENT' ? 'Оценочная ставка, ₽/мес' : 'Оценочная стоимость'}
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#0052ff', letterSpacing: '-0.02em' }}>
                                    {result.estimated_avg.toLocaleString('ru-RU')} ₽
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#374151' }}>
                                    <span>от {result.estimated_min.toLocaleString('ru-RU')} ₽</span>
                                    <span>до {result.estimated_max.toLocaleString('ru-RU')} ₽</span>
                                </div>
                                <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
                                    {params.deal_type === 'RENT'
                                        ? `${result.price_per_m2.toLocaleString('ru-RU')} ₽/м² (стоимость объекта)`
                                        : `${result.price_per_m2.toLocaleString('ru-RU')} ₽/м²`}
                                    {' • '}
                                    {result.confidence === 'HIGH' ? 'высокая точность' : 'средняя точность'}
                                    {' • '}
                                    {result.analogs_count} аналогов
                                </div>
                            </div>

                            <div style={{ marginTop: 18 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 8 }}>
                                    Поиск аналогов
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {result.analogs.map((a, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#f9fafb' }}>
                                            <div style={{ fontSize: 12, color: '#374151' }}>
                                                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 6, background: '#eef2ff', color: '#4338ca', fontSize: 10, fontWeight: 700, marginRight: 8 }}>
                                                    {a.label || 'Авито'}
                                                </span>
                                                {a.price.toLocaleString('ru-RU')} ₽ • {a.rooms}к • {a.total_area} м²
                                            </div>
                                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{a.source}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af' }}>
                                Расчёт выполнен офлайн по средней стоимости м². Не является отчётом об оценке.
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <button className="btn btn-ghost" onClick={downloadPdf} disabled={pdfLoading}>
                                <FileText size={18} /> {pdfLoading ? 'PDF...' : 'PDF Отчёт'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => setResult(null)}>Сбросить</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                            {result.analogs.map((a, i) => (
                                <div key={i} className="list-row" onClick={() => window.open(a.source_url, '_blank', 'noopener,noreferrer')}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <span className="badge badge-subtle" style={{ fontSize: 11 }}>{a.label || 'Авито'}</span>
                                            <span style={{ fontWeight: 600 }}>{a.price.toLocaleString('ru-RU')} ₽</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {a.rooms}к • {a.total_area}м²
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)' }}>
                                        {a.source} <ExternalLink size={12} />
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

export default EstimationPage;
