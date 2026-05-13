import { ChevronLeft, Building2, Users, Clock, Calendar, MessageSquare, Pencil } from 'lucide-react';

export function DetailsPage() {
    const { id } = useParams();
    const { state } = useApp();
    const navigate = useNavigate();
    
    const showing = state.showings.find(s => s.id === id);
    if (!showing) {
        return (
            <div className="page fade-in" style={{ background: 'var(--surface)' }}>
                <div className="topbar sticky" style={{ 
                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(180%)',
                    padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1000
                }}>
                    <button onClick={() => navigate(-1)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-oswald" style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text)' }}>Не найдено</span>
                    <div style={{ width: 44 }} />
                </div>
            </div>
        );
    }

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
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1000,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate(-1)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        Детали события
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>История</span>
                </div>
                <button onClick={() => navigate(`/history/new?id=${showing.id}`)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--primary)' }}>
                    <Pencil size={18} />
                </button>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px' }}>
                <div className="card" style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.03)', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <span style={{ 
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '6px 12px', 
                            borderRadius: 12, background: showing.status === 'completed' ? '#ecfdf5' : showing.status === 'failed' ? '#fef2f2' : 'var(--primary-light)',
                            color: showing.status === 'completed' ? '#059669' : showing.status === 'failed' ? '#dc2626' : 'var(--primary)'
                        }}>
                            {statusLabels[showing.status] || showing.status}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
                            <Calendar size={14} />
                            {new Date(showing.showing_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Clock size={22} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Тип и время</div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{eventTypeLabels[showing.event_type] || 'Событие'} в {new Date(showing.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                        
                        {prop && (
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Объект недвижимости</div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{prop.address || prop.city}</div>
                                </div>
                            </div>
                        )}
                        
                        {clients.length > 0 && (
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Users size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Клиенты</div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{clientNames}</div>
                                </div>
                            </div>
                        )}
                        
                        {(showing.client_feedback || showing.feedback_comment) && (
                            <div style={{ 
                                marginTop: 8, padding: 20, borderRadius: 24, background: '#f8fafc',
                                borderLeft: '4px solid var(--primary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <MessageSquare size={16} color="var(--primary)" />
                                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Результат встречи</div>
                                </div>
                                {showing.client_feedback && (
                                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                                        {showing.client_feedback}
                                    </div>
                                )}
                                {showing.feedback_comment && (
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                                        {showing.feedback_comment}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        className="card-clickable" 
                        onClick={() => navigate(`/history/new?id=${showing.id}`)} 
                        style={{ 
                            marginTop: 32, width: '100%', height: 52, borderRadius: 14, border: 'none', 
                            background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 14,
                            fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                            boxShadow: '0 8px 24px rgba(0, 82, 255, 0.2)'
                        }}
                    >
                        Редактировать
                    </button>
                </div>
            </div>
        </div>
    );
}

