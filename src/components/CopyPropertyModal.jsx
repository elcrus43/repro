import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Copy, X, Building2, Tag, Key, Search, FileText, 
    SlidersHorizontal, Check, AlertCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import { formatNumber } from '../utils/format';
import { nanoid } from '../utils/nanoid';

const DEAL_TYPES = [
    { id: 'sale', label: 'Продажа', icon: Tag, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    { id: 'rent', label: 'Аренда', icon: Key, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    { id: 'buy',  label: 'Покупка', icon: Search, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
    { id: 'hire', label: 'Найм',    icon: FileText, color: '#be185d', bg: 'rgba(190,24,93,0.08)' },
];

const STATUS_OPTIONS = [
    { id: 'meeting', label: 'Встреча' },
    { id: 'advertising', label: 'В рекламе' },
    { id: 'agreement', label: 'АД' },
    { id: 'selection', label: 'Подбор' },
];

export function CopyPropertyModal({ isOpen, onClose, property }) {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const navigate = useNavigate();

    const [targetDealType, setTargetDealType] = useState('rent');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState('meeting');
    const [copyImages, setCopyImages] = useState(true);
    const [copyContacts, setCopyContacts] = useState(true);
    const [copyDetails, setCopyDetails] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize state when modal opens or property changes
    useEffect(() => {
        if (isOpen && property) {
            const currentDt = property.deal_type || 'sale';
            // Default target: if current is sale, suggest rent; if rent, suggest sale
            const suggestedDt = currentDt === 'sale' ? 'rent' : 'sale';
            setTargetDealType(suggestedDt);

            // If same deal type, prefill current price; otherwise leave empty for user input
            if (suggestedDt === currentDt) {
                setPrice(property.price ? String(property.price) : '');
            } else {
                setPrice('');
            }
            setStatus('meeting');
            setCopyImages(true);
            setCopyContacts(true);
            setCopyDetails(true);
        }
    }, [isOpen, property]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !property) return null;

    const sourceDealType = property.deal_type || 'sale';
    const isRental = targetDealType === 'rent' || targetDealType === 'hire';

    const handleSelectDealType = (dtId) => {
        setTargetDealType(dtId);
        // If switched to the source property's deal type, prefill price; otherwise if switching from sale to rent, clear price
        if (dtId === sourceDealType) {
            setPrice(property.price ? String(property.price) : '');
        } else if ((sourceDealType === 'sale' && (dtId === 'rent' || dtId === 'hire')) || 
                   ((sourceDealType === 'rent' || sourceDealType === 'hire') && dtId === 'sale')) {
            setPrice('');
        }
    };

    const handlePriceChange = (e) => {
        const clean = e.target.value.replace(/\D/g, '');
        setPrice(clean);
    };

    const prepareDuplicateData = () => {
        const cleanPrice = price ? Number(price) : 0;
        
        // Strip out entity-specific / transient identifiers
        const {
            id: _oldId,
            created_at: _oldCreated,
            updated_at: _oldUpdated,
            ...rest
        } = property;

        return {
            ...rest,
            deal_type: targetDealType,
            price: cleanPrice,
            price_min: 0,
            commission: 0,
            deal_expenses: [],
            status: status || 'meeting',
            images: copyImages ? (property.images || []) : [],
            floorplan_images: copyImages ? (property.floorplan_images || []) : [],
            client_id: copyContacts ? (property.client_id || null) : null,
            client_ids: copyContacts ? (property.client_ids || (property.client_id ? [property.client_id] : [])) : [],
            client_shares: copyContacts ? (property.client_shares || {}) : {},
            agent_id: copyContacts ? (property.agent_id || '') : '',
            contact_name: copyContacts ? (property.contact_name || '') : '',
            contact_phone: copyContacts ? (property.contact_phone || '') : '',
            description: copyDetails ? (property.description || '') : '',
            notes: copyDetails ? (property.notes || '') : '',
            movable_property: copyDetails ? (property.movable_property || '') : '',
            realtor_id: state.currentUser?.id || property.realtor_id,
        };
    };

    const handleCreateImmediate = async () => {
        setIsSubmitting(true);
        try {
            const newId = nanoid();
            const now = new Date().toISOString();
            const duplicated = {
                ...prepareDuplicateData(),
                id: newId,
                created_at: now,
                updated_at: now,
            };

            await dispatch({ type: 'ADD_PROPERTY', property: duplicated });
            const dtLabel = DEAL_TYPES.find(d => d.id === targetDealType)?.label || targetDealType;
            toast.success(`✓ Копия объекта (${dtLabel}) создана!`);
            onClose();
            navigate(`/properties/${newId}`);
        } catch (err) {
            console.error('[Duplicate Error]', err);
            toast.error('Ошибка создания копии: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenInEditor = () => {
        const duplicated = prepareDuplicateData();
        onClose();
        navigate('/properties/new', { 
            state: { 
                prefillProperty: duplicated,
                isCopy: true,
                sourceId: property.id
            } 
        });
        toast.info('Черновик копии открыт для редактирования');
    };

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--surface, #ffffff)',
                    color: 'var(--text, #1e293b)',
                    borderRadius: 24,
                    maxWidth: 540,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-light, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'rgba(8, 145, 178, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0891b2'
                        }}>
                            <Copy size={20} />
                        </div>
                        <div>
                            <h3 className="font-oswald" style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '0.01em' }}>
                                Скопировать объект
                            </h3>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                Дублирование для продажи, аренды или новой стратегии
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="card-clickable"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: 'none',
                            background: 'var(--bg-light, #f1f5f9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Source Property Card Summary */}
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        background: 'var(--bg-light, #f8fafc)',
                        border: '1px solid var(--border-light, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: 'rgba(0,0,0,0.04)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {property.images?.[0] ? (
                                <img src={property.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Building2 size={22} style={{ opacity: 0.3 }} />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Исходный объект
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {property.address || property.city || 'Без адреса'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span>{property.rooms ? `${property.rooms}к` : ''} {property.area_total ? `${property.area_total} м²` : ''}</span>
                                <span>•</span>
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                    {formatNumber(property.price || 0)} ₽
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Target Deal Type Selection */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                            Тип сделки для копии
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {DEAL_TYPES.map(dt => {
                                const isSelected = targetDealType === dt.id;
                                const IconComp = dt.icon;
                                return (
                                    <button
                                        key={dt.id}
                                        type="button"
                                        onClick={() => handleSelectDealType(dt.id)}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: 14,
                                            border: isSelected ? `2px solid ${dt.color}` : '1px solid var(--border-light, #e2e8f0)',
                                            background: isSelected ? dt.bg : 'var(--surface, #ffffff)',
                                            color: isSelected ? dt.color : 'var(--text)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 4,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <IconComp size={16} />
                                        <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400 }}>
                                            {dt.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Price Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                {isRental ? 'Стоимость аренды' : 'Стоимость объекта'}
                            </label>
                            {price && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                                    {formatNumber(Number(price))} {isRental ? '₽/мес' : '₽'}
                                </span>
                            )}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={price ? formatNumber(Number(price)) : ''}
                                onChange={handlePriceChange}
                                placeholder={isRental ? 'Например, 35 000' : 'Например, 6 800 000'}
                                style={{
                                    width: '100%',
                                    height: 44,
                                    borderRadius: 14,
                                    border: '1px solid var(--border, #cbd5e1)',
                                    background: 'var(--surface, #ffffff)',
                                    color: 'var(--text)',
                                    padding: '0 50px 0 14px',
                                    fontSize: 14,
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                right: 14,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-secondary)'
                            }}>
                                {isRental ? '₽/мес' : '₽'}
                            </span>
                        </div>
                    </div>

                    {/* Initial Status */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                            Начальный статус копии
                        </label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {STATUS_OPTIONS.map(opt => {
                                const isSelected = status === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setStatus(opt.id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 12,
                                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-light, #e2e8f0)',
                                            background: isSelected ? 'var(--primary-light, rgba(0, 82, 255, 0.08))' : 'var(--bg-light, #f8fafc)',
                                            color: isSelected ? 'var(--primary)' : 'var(--text)',
                                            fontSize: 12,
                                            fontWeight: isSelected ? 600 : 400,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Options checkboxes */}
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        background: 'var(--bg-light, #f8fafc)',
                        border: '1px solid var(--border-light, #e2e8f0)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Что перенести в копию:
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={copyImages} 
                                onChange={e => setCopyImages(e.target.checked)} 
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <span>Фотографии объекта ({property.images?.length || 0} шт.)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={copyContacts} 
                                onChange={e => setCopyContacts(e.target.checked)} 
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <span>Собственников, контакты и агента</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={copyDetails} 
                                onChange={e => setCopyDetails(e.target.checked)} 
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <span>Описание, заметки и список движимого имущества</span>
                        </label>
                    </div>

                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-light, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'var(--surface)'
                }}>
                    <button
                        type="button"
                        onClick={handleOpenInEditor}
                        style={{
                            height: 42,
                            padding: '0 16px',
                            borderRadius: 14,
                            border: '1px solid var(--border, #cbd5e1)',
                            background: 'var(--surface, #ffffff)',
                            color: 'var(--text)',
                            fontSize: 13,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer'
                        }}
                    >
                        <SlidersHorizontal size={15} />
                        <span>Настроить в редакторе</span>
                    </button>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                height: 42,
                                padding: '0 16px',
                                borderRadius: 14,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 13,
                                cursor: 'pointer'
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleCreateImmediate}
                            style={{
                                height: 42,
                                padding: '0 20px',
                                borderRadius: 14,
                                border: 'none',
                                background: 'linear-gradient(135deg, #0052ff 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 14px rgba(0, 82, 255, 0.25)',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            <Copy size={15} />
                            <span>Создать копию</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default CopyPropertyModal;
