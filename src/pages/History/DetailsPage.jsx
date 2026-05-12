import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function DetailsPage() {
    const { id } = useParams();
    const { state } = useApp();
    const navigate = useNavigate();
    
    const showing = state.showings.find(s => s.id === id);
    if (!showing) return <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate(-1)}>←</button><span className="topbar-title">Событие не найдено</span></div></div>;

    const prop = state.properties.find(p => p.id === showing.property_id);
    const clients = state.clients.filter(c => (showing.client_ids || [showing.client_id]).includes(c.id));
    const clientNames = clients.map(c => c.full_name).join(', ');
    
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча',
        viewing: 'Просмотр',
        deposit: 'Задаток',
        deal: 'Сделка',
        call: 'Звонок'
    };
    
    const statusLabels = { planned: 'Запланирован', completed: 'Проведен', failed: 'Не состоялся' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">Детали события</span>
            </div>
            <div className="page-content">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-primary" style={{ fontSize: 12 }}>{statusLabels[showing.status] || showing.status}</span>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {new Date(showing.showing_date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ТИП СОБЫТИЯ</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{eventTypeLabels[showing.event_type] || 'Событие'}</div>
                    </div>
                    
                    {prop && (
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ОБЪЕКТ</div>
                            <div style={{ fontWeight: 600 }}>{prop.address || prop.city}</div>
                        </div>
                    )}
                    
                    {clients.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>КЛИЕНТЫ</div>
                            <div style={{ fontWeight: 600 }}>{clientNames}</div>
                        </div>
                    )}
                    
                    {showing.feedback_comment && (
                        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10, marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Комментарий</div>
                            <div style={{ fontSize: 14 }}>{showing.feedback_comment}</div>
                        </div>
                    )}
                    
                    <button className="btn btn-primary" onClick={() => navigate(`/history/new?id=${showing.id}`)} style={{ marginTop: 12 }}>
                        Редактировать
                    </button>
                </div>
            </div>
        </div>
    );
}
