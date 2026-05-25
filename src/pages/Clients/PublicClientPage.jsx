import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { Home, MapPin, Maximize, Layers, Heart, X, Check } from 'lucide-react';
import { formatNumber } from '../../utils/format';

export function PublicClientPage() {
    const { token } = useParams();
    const { dispatch } = useApp();
    const [client, setClient] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // 1. Fetch client by public_token
            const { data: clientData, error: clientErr } = await supabase
                .from('clients')
                .select('*')
                .eq('public_token', token)
                .single();

            if (clientErr || !clientData) {
                throw new Error('Клиент не найден или ссылка недействительна');
            }
            setClient(clientData);

            // 2. Fetch requests of this client
            const { data: requestsData, error: reqErr } = await supabase
                .from('requests')
                .select('id')
                .eq('client_id', clientData.id);

            if (reqErr) throw reqErr;

            if (requestsData && requestsData.length > 0) {
                // 3. Fetch matches for these requests
                const reqIds = requestsData.map(r => r.id);
                const { data: matchesData, error: matchErr } = await supabase
                    .from('matches')
                    .select('*, properties(*)')
                    .in('request_id', reqIds);

                if (matchErr) throw matchErr;
                // Filter matches that have a valid property
                setMatches(matchesData?.filter(m => m.properties) || []);
            } else {
                setMatches([]);
            }
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateStatus = async (match, newStatus) => {
        try {
            // Update in Supabase
            const updatedMatch = {
                ...match,
                status: newStatus,
                updated_at: new Date().toISOString()
            };
            // Remove the nested properties relation from match payload to avoid db errors
            const { properties, ...matchPayload } = updatedMatch;

            const { error: updateErr } = await supabase
                .from('matches')
                .upsert(matchPayload);

            if (updateErr) throw updateErr;

            // Update local state
            setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: newStatus } : m));

            // Dispatch UPDATE_MATCH on frontend
            dispatch({
                type: 'UPDATE_MATCH',
                match: updatedMatch
            });
        } catch (err) {
            console.error('Error updating match status:', err);
            alert('Не удалось обновить статус объекта. Попробуйте еще раз.');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
                <span className="font-oswald" style={{ color: 'var(--text-secondary)' }}>Загрузка предложений...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h2 className="font-oswald" style={{ color: 'var(--text)', marginBottom: 12 }}>Ошибка</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <h1 className="font-oswald" style={{ fontSize: 28, fontWeight: 300, color: 'var(--text)', marginBottom: 8 }}>
                    Здравствуйте, {client.full_name}!
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 300, lineHeight: 1.5 }}>
                    Мы подобрали для вас следующие предложения недвижимости. Выберите подходящие варианты.
                </p>
            </div>

            {matches.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border-light)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Для вас пока нет подобранных объектов.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {matches.map(match => {
                        const prop = match.properties;
                        const mainImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;

                        return (
                            <div key={match.id} style={{ 
                                background: 'var(--surface)', 
                                borderRadius: 24, 
                                overflow: 'hidden', 
                                border: '1px solid var(--border-light)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                            }}>
                                {/* Property Image */}
                                <div style={{ width: '100%', height: 200, background: '#E5E7EB', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {mainImage ? (
                                        <img src={mainImage} alt={prop.address || prop.city} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Home size={48} color="#9CA3AF" />
                                    )}
                                    
                                    {/* Status Badge */}
                                    {match.status === 'liked' && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, background: '#EF4444', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Heart size={14} fill="white" /> Нравится
                                        </div>
                                    )}
                                    {match.status === 'rejected' && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, background: '#6B7280', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                            Не подходит
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: 20 }}>
                                    {/* Price and Type */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span className="font-oswald" style={{ fontSize: 22, fontWeight: 400, color: 'var(--text)' }}>
                                            {formatNumber(prop.price)} ₽
                                        </span>
                                    </div>

                                    {/* Address */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                                        <MapPin size={16} style={{ flexShrink: 0 }} />
                                        <span>{prop.address || prop.city}</span>
                                    </div>

                                    {/* Specs Grid */}
                                    <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
                                            <Maximize size={16} />
                                            <span>{prop.area_total} м²</span>
                                        </div>
                                        {prop.floor && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
                                                <Layers size={16} />
                                                <span>{prop.floor} {prop.floors_total ? `/ ${prop.floors_total}` : ''} эт.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button 
                                            onClick={() => handleUpdateStatus(match, 'liked')}
                                            style={{
                                                flex: 1,
                                                height: 44,
                                                borderRadius: 14,
                                                border: 'none',
                                                background: match.status === 'liked' ? '#EF4444' : 'var(--bg-light)',
                                                color: match.status === 'liked' ? 'white' : '#EF4444',
                                                fontWeight: 600,
                                                fontSize: 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Heart size={16} fill={match.status === 'liked' ? 'white' : 'transparent'} /> Нравится ❤️
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(match, 'rejected')}
                                            style={{
                                                flex: 1,
                                                height: 44,
                                                borderRadius: 14,
                                                border: 'none',
                                                background: match.status === 'rejected' ? '#6B7280' : 'var(--bg-light)',
                                                color: match.status === 'rejected' ? 'white' : 'var(--text)',
                                                fontWeight: 600,
                                                fontSize: 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <X size={16} /> Не подходит ✗
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
