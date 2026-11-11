import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, FileText, CheckCircle2, Clock3, ExternalLink, Trash2,
    ShieldCheck, Building2, KeyRound, Handshake, Landmark, Receipt, Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import {
    DEAL_DOC_STATUS_META,
    getDealKind,
    getDealChecklist,
    normalizeDealDocuments,
    setDealDocumentStatus,
    removeDealDocument,
    nextDealDocumentStatus,
    dealDocumentsProgress,
} from '../utils/dealDocuments';

const ITEM_ICONS = {
    sale_contract: Handshake,
    rent_contract: Handshake,
    act: FileText,
    keys_act: KeyRound,
    agency_seller: ShieldCheck,
    agency_buyer: ShieldCheck,
    agency_landlord: ShieldCheck,
    services_3party: Users,
    egrn: Landmark,
    owner_docs: Landmark,
    spouse_consent: Users,
    registered_persons: Building2,
    payment_details: Receipt,
};

const STATUS_ICONS = {
    pending: Clock3,
    ready: FileText,
    signed: CheckCircle2,
};

function StatusPill({ status, onClick, title }) {
    const meta = DEAL_DOC_STATUS_META[status] || DEAL_DOC_STATUS_META.pending;
    const Icon = STATUS_ICONS[status] || Clock3;
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${meta.color}35`,
                background: meta.bg,
                color: meta.color,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
            }}
        >
            <Icon size={12} />
            {meta.label}
        </button>
    );
}

export function DealDocumentsModal({ isOpen, deal, property, onClose }) {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const navigate = useNavigate();

    const liveDeal = useMemo(
        () => state.deals.find(d => String(d.id) === String(deal?.id)) || deal,
        [state.deals, deal]
    );
    const liveProperty = useMemo(
        () => state.properties.find(p => String(p.id) === String(liveDeal?.property_id)) || property,
        [state.properties, liveDeal, property]
    );

    const defaultKind = useMemo(() => getDealKind(liveDeal, liveProperty), [liveDeal, liveProperty]);
    const [kindOverride, setKindOverride] = useState(null);
    const kind = kindOverride || defaultKind;

    const documents = useMemo(() => normalizeDealDocuments(liveDeal?.documents), [liveDeal]);
    const checklist = getDealChecklist(kind);
    const progress = dealDocumentsProgress(documents, kind);
    const docMap = useMemo(() => new Map(documents.map(d => [d.key, d])), [documents]);

    if (!isOpen || !liveDeal) return null;

    const persist = (nextDocuments) => {
        dispatch({
            type: 'UPDATE_DEAL',
            deal: { ...liveDeal, documents: nextDocuments },
        });
    };

    const handleCycleStatus = (item) => {
        const current = docMap.get(item.key)?.status || 'pending';
        const nextStatus = nextDealDocumentStatus(current);
        persist(setDealDocumentStatus(documents, item.key, nextStatus));
        toast.success(`«${item.label}»: ${DEAL_DOC_STATUS_META[nextStatus].label.toLowerCase()}`);
    };

    const handleReset = (item) => {
        persist(removeDealDocument(documents, item.key));
        toast.info(`«${item.label}» сброшен`);
    };

    const handleGenerate = (item) => {
        onClose?.();
        navigate('/documents', {
            state: {
                docPrefill: {
                    dealId: liveDeal.id,
                    template: item.templateKey,
                    dealDocumentKey: item.key,
                },
            },
        });
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(10px) saturate(180%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                padding: 0,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="fade-up"
                style={{
                    width: '100%', maxWidth: 560,
                    maxHeight: '92vh', overflowY: 'auto',
                    background: 'var(--surface)',
                    borderTopLeftRadius: 28, borderTopRightRadius: 28,
                    padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
                    boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                    <div>
                        <div className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Документы по сделке
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600 }}>
                            {liveDeal.title}{liveProperty?.address ? ` • ${liveProperty.address}` : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="card-clickable"
                        style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'var(--bg-light)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title="Закрыть"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress */}
                <div style={{ background: 'var(--bg-light)', borderRadius: 18, padding: 16, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Готово {progress.done} из {progress.total}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: progress.percent === 100 ? '#059669' : 'var(--primary)' }}>
                            {progress.percent}%
                        </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${progress.percent}%`, height: '100%', borderRadius: 999, background: progress.percent === 100 ? '#059669' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 600, opacity: 0.75 }}>
                        Подписано: {progress.signed} • Не готово: {progress.pending}
                    </div>
                </div>

                {/* Kind tabs */}
                <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--bg-light)', marginBottom: 16 }}>
                    {[
                        { id: 'sale', label: 'Купля-продажа' },
                        { id: 'rent', label: 'Аренда' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setKindOverride(tab.id)}
                            style={{
                                flex: 1, height: 38, borderRadius: 11, border: 'none',
                                cursor: 'pointer', fontSize: 12, fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                                background: kind === tab.id ? 'var(--surface)' : 'transparent',
                                color: kind === tab.id ? 'var(--text)' : 'var(--text-secondary)',
                                boxShadow: kind === tab.id ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {checklist.map(item => {
                        const entry = docMap.get(item.key);
                        const status = entry?.status || 'pending';
                        const Icon = ITEM_ICONS[item.key] || FileText;
                        return (
                            <div
                                key={item.key}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', borderRadius: 16,
                                    border: '1px solid var(--border-light)',
                                    background: status === 'signed' ? 'rgba(5,150,105,0.045)' : 'var(--surface)',
                                }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: status === 'signed' ? 'rgba(5,150,105,0.12)' : 'var(--bg-light)',
                                    color: status === 'signed' ? '#059669' : 'var(--text-secondary)',
                                }}>
                                    <Icon size={17} />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                                        {item.label}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                        <StatusPill
                                            status={status}
                                            onClick={() => handleCycleStatus(item)}
                                            title="Нажмите, чтобы изменить статус"
                                        />
                                        {entry?.fileName && (
                                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={entry.fileName}>
                                                {entry.fileName}
                                            </span>
                                        )}
                                        {item.templateKey && !entry?.fileName && (
                                            <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>
                                                шаблон доступен
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    {item.templateKey && (
                                        <button
                                            type="button"
                                            onClick={() => handleGenerate(item)}
                                            className="card-clickable"
                                            title="Создать документ"
                                            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(0,82,255,0.07)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <ExternalLink size={15} />
                                        </button>
                                    )}
                                    {entry && (
                                        <button
                                            type="button"
                                            onClick={() => handleReset(item)}
                                            className="card-clickable"
                                            title="Сбросить статус"
                                            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.5, fontWeight: 600, opacity: 0.75 }}>
                    Нажмите на статус, чтобы переключить: не готов → готов → подписан.
                    Документы сохраняются в карточке сделки.
                </div>
            </div>
        </div>
    );
}
