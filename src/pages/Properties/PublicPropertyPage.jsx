import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MapPin, Home, Maximize, Layers, Phone, MessageCircle } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { PROPERTY_TYPES } from '../../data/constants';
import { API_BASE } from '../../config';

export function PublicPropertyPage() {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [linkData, setLinkData] = useState(null);
    const [property, setProperty] = useState(null);
    const [agent, setAgent] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            // 1. Get link info from FastAPI
            const res = await fetch(`${API_BASE}/p/${slug}`);
            if (!res.ok) throw new Error('Ссылка не найдена или неактивна');
            const data = await res.json();
            setLinkData(data);

            // 2. Get property details from Supabase
            const { data: prop, error: propErr } = await supabase
                .from('properties')
                .select('*, profiles(*)')
                .eq('id', data.property_id)
                .single();

            if (propErr) throw propErr;
            setProperty(prop);
            setAgent(prop.profiles);

            // Track view (Fire and forget)
            fetch(`${API_BASE}/p/${slug}/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'view' })
            }).catch(() => {});

        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="loading-screen">Загрузка...</div>;
    if (error) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <h2>Ошибка</h2>
            <p>{error}</p>
        </div>
    );

    const price = linkData.show_price ? property.price : null;
    const address = linkData.show_address ? property.address : property.city;

    return (
        <div className="public-property-page" style={{ background: '#F9FAFB', minHeight: '100vh', paddingBottom: 80 }}>
            {/* Gallery Placeholder */}
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={64} color="#9CA3AF" />
            </div>

            <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827' }}>
                            {price ? `${formatNumber(price)} ₽` : 'Цена по запросу'}
                        </h1>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 15, marginTop: 4 }}>
                            <MapPin size={16} /> {address}
                        </p>
                    </div>
                    <div style={{ background: '#EEF2FF', color: '#4F46E5', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        {PROPERTY_TYPES[property.property_type]}
                    </div>
                </div>

                {/* Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, border: '1px solid #F3F4F6' }}>
                        <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Площадь</div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Maximize size={16} color="#4F46E5" /> {property.area_total} м²
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, border: '1px solid #F3F4F6' }}>
                        <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Этаж</div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Layers size={16} color="#4F46E5" /> {property.floor} / {property.floors_total}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Описание</h3>
                    <p style={{ color: '#4B5563', lineHeight: 1.6, fontSize: 15 }}>
                        {linkData.custom_note || property.description || 'Описание уточняйте у агента.'}
                    </p>
                </div>

                {/* Agent Card */}
                {agent && (
                    <div style={{ background: 'white', padding: 16, borderRadius: 16, border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 24, background: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                            {agent.full_name[0]}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{agent.full_name}</div>
                            <div style={{ color: '#6B7280', fontSize: 13 }}>{agent.agency_name || 'Ваш риелтор'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Actions */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '12px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 12, zIndex: 100 }}>
                <a href={`tel:${agent?.phone}`} style={{ flex: 1, height: 48, background: '#4F46E5', color: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', fontWeight: 600 }}>
                    <Phone size={20} /> Позвонить
                </a>
                <a href={`https://wa.me/${agent?.phone.replace(/\D/g, '')}`} style={{ width: 48, height: 48, background: '#DCFCE7', color: '#166534', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={24} />
                </a>
            </div>
        </div>
    );
}
