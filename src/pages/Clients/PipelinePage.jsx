import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, formatNumber, stripPhone } from '../../utils/format';
import { getContractTypeConfig } from '../../utils/contractTerms';
import { CLIENT_PIPELINE_STAGES, getClientPipelineMeta, getClientPipelineStage } from '../../utils/clientPipeline';
import { nanoid } from '../../utils/nanoid';
import { GoogleContactStatusBadge } from '../../components/GoogleContactStatusBadge';
import { useGoogleContactCheck } from '../../hooks/useGoogleContactCheck';
import { createGoogleContact } from '../../lib/googleContacts';
import {
  Phone, User, Home, Tag, Calendar, FileText, CheckCircle2,
  XCircle, Plus, MessageSquare, ChevronDown, ChevronUp, X, Pencil
} from 'lucide-react';

const EXCLUDED_TYPES = ['developer', 'agent', 'lawyer'];
const DEAL_TYPES = ['buyer', 'seller', 'legal_entity', 'landlord', 'tenant', 'lessor', 'lessee'];

const CLIENT_TYPE_INFO = {
  buyer:        { label: 'Покупатель',   color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.25)' },
  seller:       { label: 'Продавец',     color: '#10b981', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.25)' },
  legal_entity: { label: 'Юр. лицо',     color: '#0284c7', bg: 'rgba(2, 132, 199, 0.10)', border: 'rgba(2, 132, 199, 0.25)' },
  landlord:     { label: 'Наймодатель',  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.25)' },
  tenant:       { label: 'Наниматель',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)' },
  lessor:       { label: 'Арендодатель', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.25)' },
  lessee:       { label: 'Арендатор',    color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)' },
};

const SEGMENTS = [
  { id: 'all',          label: 'Все клиенты' },
  { id: 'buyer',        label: 'Покупатели' },
  { id: 'seller',       label: 'Продавцы' },
  { id: 'legal_entity', label: 'Юрлица' },
  { id: 'rent',         label: 'Аренда / Найм' },
];

const toLocalISOString = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export function PipelinePage({ initialSegment = 'all', scope = 'mine' }) {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();
  const navigate = useNavigate();
  const isAdmin = state.currentUser?.role === 'admin';

  // Normalize initial segment
  const defaultSegment = ['buyer', 'seller'].includes(initialSegment)
    ? initialSegment
    : ['landlord', 'tenant', 'lessor', 'lessee'].includes(initialSegment)
      ? 'rent'
      : 'all';

  const [activeSegment, setActiveSegment] = useState(defaultSegment);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showRefusedList, setShowRefusedList] = useState(false);
  const [quickMenuClientId, setQuickMenuClientId] = useState(null);
  const [activeModalAction, setActiveModalAction] = useState(null);
  const [inlineNoteClientId, setInlineNoteClientId] = useState(null);
  const [inlineNoteText, setInlineNoteText] = useState('');
  const [addClientModalColumn, setAddClientModalColumn] = useState(null);
  const [quickClientForm, setQuickClientForm] = useState({
    full_name: '',
    phone: '',
    client_type: 'buyer',
    notes: ''
  });
  const [saveQuickToGoogle, setSaveQuickToGoogle] = useState(true);
  const quickGoogleCheck = useGoogleContactCheck(quickClientForm.phone, {
    enabled: Boolean(addClientModalColumn),
  });
  const [actionForm, setActionForm] = useState({
    date: '',
    comment: '',
    property_id: '',
    call_status: 'completed'
  });

  // Close quick menu on outside click
  useEffect(() => {
    if (!quickMenuClientId) return;
    const handleOutsideClick = () => setQuickMenuClientId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [quickMenuClientId]);

  const getClientStage = useCallback((client) => {
    return getClientPipelineStage(client, {
      deals: state.deals,
      properties: state.properties,
      showings: state.showings
    });
  }, [state.deals, state.properties, state.showings]);

  // Base client pool: ONLY clients of deal types, STRICTLY excluding developers, agents, lawyers
  const dealClients = useMemo(() => {
    return (state.clients || []).filter(c => {
      const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);

      // Strict exclusion: developers, agents, lawyers must NEVER be in pipeline
      const hasExcluded = types.some(t => EXCLUDED_TYPES.includes(t));
      if (hasExcluded) return false;

      // Must be a deal-related client
      const hasDealType = types.some(t => DEAL_TYPES.includes(t));
      if (!hasDealType) return false;

      // Scope check: my clients or all
      if (scope === 'mine' && !isAdmin) {
        return c.realtor_id === state.currentUser?.id;
      }
      return true;
    });
  }, [state.clients, scope, isAdmin, state.currentUser?.id]);

  // Counts per segment
  const segmentCounts = useMemo(() => {
    const counts = { all: dealClients.length, buyer: 0, seller: 0, legal_entity: 0, rent: 0 };
    dealClients.forEach(c => {
      const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
      if (types.includes('buyer')) counts.buyer++;
      if (types.includes('seller')) counts.seller++;
      if (types.includes('legal_entity')) counts.legal_entity++;
      if (types.some(t => ['landlord', 'tenant', 'lessor', 'lessee'].includes(t))) counts.rent++;
    });
    return counts;
  }, [dealClients]);

  // Filtered by active segment
  const filteredClients = useMemo(() => {
    if (activeSegment === 'all') return dealClients;
    if (activeSegment === 'buyer') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.includes('buyer');
      });
    }
    if (activeSegment === 'seller') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.includes('seller');
      });
    }
    if (activeSegment === 'legal_entity') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.includes('legal_entity');
      });
    }
    if (activeSegment === 'rent') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.some(t => ['landlord', 'tenant', 'lessor', 'lessee'].includes(t));
      });
    }
    return dealClients;
  }, [dealClients, activeSegment]);

  // Full pipeline stages configuration
  const pipelineColumns = CLIENT_PIPELINE_STAGES;

  // Visible columns on the board: Лиды (other), На контроле (control), В работе (active)
  // "Сделка закрыта" and "Отказ / Архив" are hidden from vertical columns and rendered as drop target fields below
  const visibleColumns = useMemo(() => {
    return pipelineColumns.filter(col => !['completed', 'refused'].includes(col.id));
  }, [pipelineColumns]);

  const columnMap = useMemo(() => {
    const map = {};
    pipelineColumns.forEach(col => {
      map[col.id] = filteredClients.filter(c => getClientStage(c) === col.id);
    });
    return map;
  }, [filteredClients, pipelineColumns, getClientStage]);

  const completedCards = columnMap['completed'] || [];
  const refusedCards = columnMap['refused'] || [];

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    const client = filteredClients.find(c => c.id === clientId) || (state.clients || []).find(c => c.id === clientId);
    if (!client) return;

    const currentStage = getClientStage(client);
    if (currentStage === columnId) return;

    const targetStage = CLIENT_PIPELINE_STAGES.find(s => s.id === columnId);
    const newStatus = targetStage ? targetStage.statusValue : client.status;

    dispatch({
      type: 'UPDATE_CLIENT',
      client: {
        ...client,
        status: newStatus,
        pipeline_stage: columnId,
        updated_at: new Date().toISOString()
      }
    });

    if (columnId === 'completed') {
      toast.success(`Клиент "${client.full_name}" перенесен в "Сделка закрыта"`);
    } else if (columnId === 'refused') {
      toast.success(`Клиент "${client.full_name}" перенесен в "Отказ / Архив"`);
    } else {
      toast.success(`Клиент "${client.full_name}" перемещен на этап "${targetStage?.label || columnId}"`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Helper to get client's budget or request info
  const getClientMeta = (client) => {
    const types = Array.isArray(client.client_types) ? client.client_types : (client.client_type ? [client.client_type] : []);

    // For buyers / tenants / lessees: look for request budget
    if (types.some(t => ['buyer', 'tenant', 'lessee'].includes(t))) {
      const req = (state.requests || []).find(r => r.client_id === client.id || r.client_ids?.includes(client.id));
      if (req?.budget_max) {
        return { type: 'budget', text: `до ${formatNumber(req.budget_max)} ₽` };
      }
      if (client.budget_max) {
        return { type: 'budget', text: `до ${formatNumber(client.budget_max)} ₽` };
      }
    }

    // For sellers / landlords / lessors: look for property count
    if (types.some(t => ['seller', 'landlord', 'lessor'].includes(t))) {
      const count = (state.properties || []).filter(p => p.owner_id === client.id || p.client_id === client.id).length;
      if (count > 0) {
        return { type: 'property', text: `Объектов: ${count}` };
      }
    }

    return null;
  };

  // Quick Action Form Submission
  const handleSaveQuickAction = (e) => {
    e.preventDefault();
    if (!activeModalAction) return;
    const { client, type } = activeModalAction;

    if (type === 'meeting') {
      let dateIso = null;
      if (actionForm.date) {
        const parsed = new Date(actionForm.date);
        if (!isNaN(parsed.getTime())) dateIso = parsed.toISOString();
      }
      if (!dateIso) {
        toast.error('Укажите дату и время встречи');
        return;
      }
      const newShowing = {
        id: nanoid(),
        realtor_id: state.currentUser?.id || client.realtor_id || null,
        client_id: client.id,
        client_ids: [client.id],
        property_id: actionForm.property_id || null,
        showing_date: dateIso,
        status: 'planned',
        event_type: 'meeting',
        feedback_comment: actionForm.comment?.trim() || `Встреча с клиентом ${client.full_name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dispatch({ type: 'ADD_SHOWING', showing: newShowing });
      toast.success('Встреча добавлена');
    } else if (type === 'call') {
      let dateIso = null;
      if (actionForm.date) {
        const parsed = new Date(actionForm.date);
        if (!isNaN(parsed.getTime())) dateIso = parsed.toISOString();
      } else {
        dateIso = new Date().toISOString();
      }
      const newShowing = {
        id: nanoid(),
        realtor_id: state.currentUser?.id || client.realtor_id || null,
        client_id: client.id,
        client_ids: [client.id],
        property_id: actionForm.property_id || null,
        showing_date: dateIso,
        status: actionForm.call_status || 'completed',
        event_type: 'call',
        feedback_comment: actionForm.comment?.trim() || `Звонок клиенту ${client.full_name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dispatch({ type: 'ADD_SHOWING', showing: newShowing });
      toast.success('Звонок сохранен');
    } else if (type === 'comment') {
      const text = actionForm.comment?.trim();
      if (!text) {
        toast.error('Введите текст комментария');
        return;
      }
      const newShowing = {
        id: nanoid(),
        realtor_id: state.currentUser?.id || client.realtor_id || null,
        client_id: client.id,
        client_ids: [client.id],
        property_id: null,
        showing_date: new Date().toISOString(),
        status: 'completed',
        event_type: 'comment',
        feedback_comment: text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dispatch({ type: 'ADD_SHOWING', showing: newShowing });

      const currentNotes = client.notes || '';
      const dateLabel = new Date().toLocaleDateString('ru-RU');
      const updatedNotes = currentNotes ? `${currentNotes}\n[${dateLabel}]: ${text}` : `[${dateLabel}]: ${text}`;
      dispatch({
        type: 'UPDATE_CLIENT',
        client: {
          ...client,
          notes: updatedNotes,
          updated_at: new Date().toISOString()
        }
      });
      toast.success('Комментарий сохранен');
    }

    setActiveModalAction(null);
    setActionForm({ date: '', comment: '', property_id: '', call_status: 'completed' });
  };

  const getDefaultClientType = useCallback((segment) => {
    if (segment === 'seller') return 'seller';
    if (segment === 'legal_entity') return 'legal_entity';
    if (segment === 'rent') return 'tenant';
    return 'buyer';
  }, []);

  const handleOpenAddClientModal = (column) => {
    setAddClientModalColumn(column);
    setSaveQuickToGoogle(true);
    setQuickClientForm({
      full_name: '',
      phone: '',
      client_type: getDefaultClientType(activeSegment),
      notes: ''
    });
  };

  const handleSaveQuickClient = (e) => {
    e.preventDefault();
    if (!addClientModalColumn) return;
    const name = quickClientForm.full_name.trim();
    if (!name) {
      toast.error('Укажите ФИО клиента');
      return;
    }

    const newId = nanoid();
    const dateLabel = new Date().toLocaleDateString('ru-RU');
    const initialNotes = quickClientForm.notes?.trim()
      ? `[${dateLabel}]: ${quickClientForm.notes.trim()}`
      : '';

    const newClient = {
      id: newId,
      full_name: name,
      phone: quickClientForm.phone?.trim() || '',
      email: '',
      client_types: [quickClientForm.client_type || 'buyer'],
      status: addClientModalColumn.statusValue || 'new',
      pipeline_stage: addClientModalColumn.id,
      notes: initialNotes,
      realtor_id: state.currentUser?.id || null,
      has_agency_contract: addClientModalColumn.id === 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      additional_contacts: [],
      source: 'Воронка'
    };

    dispatch({ type: 'ADD_CLIENT', client: newClient });

    if (saveQuickToGoogle && quickGoogleCheck.status === 'not_found' && newClient.phone) {
      createGoogleContact(newClient, { checkDuplicate: false })
        .then((gRes) => {
          if (gRes.created) {
            toast.success(`Контакт «${name}» также добавлен в Google Контакты`);
          }
        })
        .catch((gErr) => {
          console.warn('[Pipeline Google Contacts create error]', gErr);
          toast.error(`Клиент сохранён в CRM, но не записан в Google Контакты: ${gErr.message}`);
        });
    }

    if (quickClientForm.notes?.trim()) {
      dispatch({
        type: 'ADD_SHOWING',
        showing: {
          id: nanoid(),
          realtor_id: state.currentUser?.id || null,
          client_id: newId,
          client_ids: [newId],
          property_id: null,
          showing_date: new Date().toISOString(),
          status: 'completed',
          event_type: 'comment',
          feedback_comment: quickClientForm.notes.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    toast.success(`Клиент "${name}" добавлен в «${addClientModalColumn.label}»`);
    setAddClientModalColumn(null);
    setQuickClientForm({ full_name: '', phone: '', client_type: 'buyer', notes: '' });
  };

  const handleSaveInlineNote = (client) => {
    const text = inlineNoteText.trim();
    if (!text) return;
    const currentNotes = client.notes || '';
    const dateLabel = new Date().toLocaleDateString('ru-RU');
    const updatedNotes = currentNotes ? `${currentNotes}\n[${dateLabel}]: ${text}` : `[${dateLabel}]: ${text}`;

    const newShowing = {
      id: nanoid(),
      realtor_id: state.currentUser?.id || client.realtor_id || null,
      client_id: client.id,
      client_ids: [client.id],
      property_id: null,
      showing_date: new Date().toISOString(),
      status: 'completed',
      event_type: 'comment',
      feedback_comment: text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dispatch({ type: 'ADD_SHOWING', showing: newShowing });

    dispatch({
      type: 'UPDATE_CLIENT',
      client: {
        ...client,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      }
    });

    toast.success('Заметка сохранена');
    setInlineNoteClientId(null);
    setInlineNoteText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── СЕГМЕНТЫ ВОРОНКИ ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 4
      }}>
        {SEGMENTS.map(seg => {
          const isActive = activeSegment === seg.id;
          const count = segmentCounts[seg.id] || 0;
          return (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 12,
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--primary)' : 'var(--surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 2px 8px rgba(0, 82, 255, 0.22)' : 'none'
              }}
            >
              <span>{seg.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-light)',
                color: isActive ? '#ffffff' : 'var(--text)',
                padding: '1px 6px',
                borderRadius: 8
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── КАНБАН ДОСКА ВОРОНКИ (ВИДИМЫЕ ЭТАПЫ: ЛИДЫ, НА КОНТРОЛЕ, В РАБОТЕ) ── */}
      <div className="client-pipeline-board">
        <style>{`
          .client-pipeline-board {
            overflow-x: auto;
            scrollbar-width: none;
            display: flex;
            gap: 14px;
            padding: 4px 0 16px;
            width: 100%;
            box-sizing: border-box;
            min-height: 480px;
          }
          .client-pipeline-board::-webkit-scrollbar { display: none; }

          .client-pipeline-col {
            min-width: 270px;
            max-width: 340px;
            flex: 1 0 270px;
            background: var(--bg-light);
            border-radius: 20px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
          }

          .client-pipeline-card {
            background: var(--surface);
            border-radius: 16px;
            padding: 14px;
            user-select: none;
            display: flex;
            flex-direction: column;
            gap: 9px;
            position: relative;
            box-sizing: border-box;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .client-card-name {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--text);
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            flex: 1;
          }

          @media (min-width: 960px) {
            .client-pipeline-board {
              gap: 16px;
            }
            .client-pipeline-col {
              min-width: 320px;
              max-width: 520px;
              flex: 1 1 320px;
              padding: 16px;
              gap: 12px;
              border-radius: 22px;
            }
            .client-pipeline-card {
              padding: 16px 16px !important;
              border-radius: 18px !important;
              gap: 11px !important;
            }
            .client-card-name {
              font-size: 14.5px !important;
              line-height: 1.35 !important;
            }
          }
        `}</style>

        {visibleColumns.map(column => {
          const cards = columnMap[column.id] || [];
          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="client-pipeline-col"
            >
              {/* Column Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 4px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: column.color, flexShrink: 0
                  }} />
                  <span className="font-oswald" style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--text)',
                    textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1
                  }}>
                    {column.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: column.color,
                    background: column.badgeBg, borderRadius: 8,
                    padding: '2px 8px'
                  }}>
                    {cards.length}
                  </span>
                  <button
                    type="button"
                    className="card-clickable"
                    onClick={() => handleOpenAddClientModal(column)}
                    title={`Добавить клиента на этап «${column.label}»`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      border: `1px solid ${column.border}`,
                      background: column.badgeBg,
                      color: column.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
                {column.subLabel && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 18 }}>
                    {column.subLabel}
                  </div>
                )}
              </div>

              {/* Empty Column Placeholder */}
              {cards.length === 0 && (
                <div style={{
                  border: `2px dashed ${column.color}33`,
                  borderRadius: 14,
                  padding: '28px 12px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  opacity: 0.65
                }}>
                  Нет клиентов на этом этапе
                </div>
              )}

              {/* Client Cards */}
              {cards.map(client => {
                const types = Array.isArray(client.client_types) ? client.client_types : (client.client_type ? [client.client_type] : []);
                const validDealTypes = types.filter(t => DEAL_TYPES.includes(t));
                const meta = getClientMeta(client);
                const assignedRealtor = (state.users || []).find(u => u.id === client.realtor_id);

                // Check active/fulfilled AD & deals
                const { hasClosedDeal, activeContracts, fulfilledContracts, hasActiveAD, hasFulfilledAD } = getClientPipelineMeta(client, { deals: state.deals, properties: state.properties });
                const activeContract = activeContracts[0] || null;
                const contractType = activeContract?.type || 'АД';
                const contractTypeCfg = activeContract ? getContractTypeConfig(contractType) : { color: '#059669', bg: '#ecfdf5', border: '#10b981' };

                // Check meetings
                const clientShowings = (state.showings || []).filter(s => {
                  const cIds = s.client_ids || (s.client_id ? [s.client_id] : []);
                  return cIds.includes(client.id);
                });
                const meetingEvents = clientShowings.filter(s => ['meeting', 'showing', 'viewing'].includes(s.event_type));
                const latestMeeting = meetingEvents.length > 0
                  ? [...meetingEvents].sort((a, b) => new Date(b.showing_date) - new Date(a.showing_date))[0]
                  : null;

                const isMenuOpen = quickMenuClientId === client.id;

                return (
                  <div
                    key={client.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('clientId', client.id)}
                    className="card-clickable client-pipeline-card"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    style={{
                      boxShadow: isMenuOpen ? '0 12px 32px rgba(0,0,0,0.14)' : '0 4px 16px rgba(0,0,0,0.05)',
                      cursor: 'grab',
                      border: isMenuOpen ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      zIndex: isMenuOpen ? 120 : 1
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)';
                    }}
                  >
                    {/* Top Row: Full Name + Quick Actions Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <div
                          className="client-card-name"
                          style={{
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            flex: 1
                          }}
                        >
                          {client.full_name}
                        </div>

                        {/* Top-right card actions: Quick Edit + Plus Action Menu */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="card-clickable"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clients/${client.id}/edit`);
                            }}
                            title="Редактировать клиента"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-light)',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Pencil size={13} />
                          </button>

                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className="card-clickable"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickMenuClientId(isMenuOpen ? null : client.id);
                              }}
                              title="Добавить активность: встреча, звонок, комментарий"
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 8,
                                border: isMenuOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: isMenuOpen ? 'var(--primary)' : 'var(--bg-light)',
                                color: isMenuOpen ? '#ffffff' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Plus size={15} />
                            </button>

                            {/* Quick Action Popup Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: 32,
                                  right: 0,
                                  zIndex: 250,
                                  background: 'var(--surface)',
                                  borderRadius: 14,
                                  boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
                                  border: '1px solid var(--border)',
                                  minWidth: 190,
                                  padding: 6,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
                                    setQuickMenuClientId(null);
                                    setActionForm({
                                      date: toLocalISOString(nextHour),
                                      comment: '',
                                      property_id: '',
                                      call_status: 'completed'
                                    });
                                    setActiveModalAction({ client, type: 'meeting' });
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: 'transparent', color: 'var(--text)',
                                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                                    textAlign: 'left', width: '100%'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Calendar size={14} color="#8b5cf6" />
                                  <span>+ Встреча</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuClientId(null);
                                    setActionForm({
                                      date: toLocalISOString(new Date()),
                                      comment: '',
                                      property_id: '',
                                      call_status: 'completed'
                                    });
                                    setActiveModalAction({ client, type: 'call' });
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: 'transparent', color: 'var(--text)',
                                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                                    textAlign: 'left', width: '100%'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Phone size={14} color="#3b82f6" />
                                  <span>+ Звонок</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuClientId(null);
                                    setActionForm({
                                      date: toLocalISOString(new Date()),
                                      comment: '',
                                      property_id: '',
                                      call_status: 'completed'
                                    });
                                    setActiveModalAction({ client, type: 'comment' });
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: 'transparent', color: 'var(--text)',
                                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                                    textAlign: 'left', width: '100%'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <MessageSquare size={14} color="#10b981" />
                                  <span>+ Комментарий</span>
                                </button>

                                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuClientId(null);
                                    navigate(`/clients/${client.id}/edit`);
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: 'transparent', color: 'var(--text)',
                                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                                    textAlign: 'left', width: '100%'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Pencil size={14} color="var(--primary)" />
                                  <span>Редактировать</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Type Badges */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {hasActiveAD && (
                          <span
                            title={`Действующий агентский договор: ${contractType}${activeContract?.contract_date || client.agency_contract_date ? ` от ${new Date(activeContract?.contract_date || client.agency_contract_date).toLocaleDateString('ru-RU')}` : ''}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: contractTypeCfg.color,
                              background: contractTypeCfg.bg,
                              border: `1px solid ${contractTypeCfg.border}`,
                              borderRadius: 6,
                              padding: '1px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <FileText size={10} />
                            <span>{contractType}</span>
                          </span>
                        )}
                        {!hasActiveAD && (hasClosedDeal || ['completed', 'deal_closed'].includes(client.status)) && (
                          <span
                            title={hasFulfilledAD ? `Сделка закрыта, АД исполнен (${fulfilledContracts[0]?.type || 'АД'})` : 'Сделка закрыта'}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#0f766e',
                              background: 'rgba(15, 118, 110, 0.10)',
                              border: '1px solid rgba(15, 118, 110, 0.30)',
                              borderRadius: 6,
                              padding: '1px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <CheckCircle2 size={10} />
                            <span>{hasFulfilledAD ? 'АД исполнен' : 'Сделка закрыта'}</span>
                          </span>
                        )}
                        {meetingEvents.length > 0 && !hasActiveAD && !hasClosedDeal && (
                          <span
                            title={`Встреч/показов: ${meetingEvents.length}${latestMeeting ? `, последняя: ${new Date(latestMeeting.showing_date).toLocaleDateString('ru-RU')}` : ''}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#d97706',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: 6,
                              padding: '1px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <Calendar size={10} />
                            <span>Встреч: {meetingEvents.length}</span>
                          </span>
                        )}
                        {validDealTypes.map(t => {
                          const conf = CLIENT_TYPE_INFO[t] || { label: t, color: 'var(--text-secondary)', bg: 'var(--bg-light)', border: 'transparent' };
                          return (
                            <span
                              key={t}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: conf.color,
                                background: conf.bg,
                                border: `1px solid ${conf.border}`,
                                borderRadius: 6,
                                padding: '1px 6px'
                              }}
                            >
                              {conf.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Row: Phone & Budget/Property */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                      {client.phone && (
                        <a
                          href={`tel:+${stripPhone(client.phone)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: 500
                          }}
                        >
                          <Phone size={11} />
                          <span>{formatPhone(client.phone)}</span>
                        </a>
                      )}

                      {meta && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: meta.type === 'budget' ? 'var(--primary)' : 'var(--text)',
                          background: 'var(--bg-light)',
                          padding: '2px 6px',
                          borderRadius: 6,
                          marginLeft: 'auto'
                        }}>
                          {meta.text}
                        </span>
                      )}
                    </div>

                    {/* Notes / Comments Section */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        background: client.notes ? 'var(--bg-light)' : 'transparent',
                        border: client.notes ? '1px solid var(--border-light)' : '1px dashed var(--border)',
                        borderRadius: 12,
                        padding: client.notes ? '8px 10px' : '4px 6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {inlineNoteClientId === client.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <textarea
                            autoFocus
                            rows={2}
                            placeholder="Текст заметки / комментария..."
                            value={inlineNoteText}
                            onChange={(e) => setInlineNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleSaveInlineNote(client);
                              }
                            }}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: '1px solid var(--primary)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              fontSize: 12,
                              fontFamily: 'inherit',
                              resize: 'vertical'
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineNoteClientId(null);
                                setInlineNoteText('');
                              }}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineNote(client)}
                              disabled={!inlineNoteText.trim()}
                              style={{
                                padding: '3px 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 6,
                                border: 'none',
                                background: 'var(--primary)',
                                color: '#ffffff',
                                cursor: inlineNoteText.trim() ? 'pointer' : 'default',
                                opacity: inlineNoteText.trim() ? 1 : 0.5
                              }}
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      ) : client.notes ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                              <MessageSquare size={11} color="var(--primary)" />
                              <span>Заметка</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineNoteClientId(client.id);
                                setInlineNoteText('');
                              }}
                              title="Добавить еще одну заметку"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--primary)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: 0
                              }}
                            >
                              <Plus size={11} strokeWidth={2.5} />
                              <span>Добавить</span>
                            </button>
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            maxHeight: 72,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            paddingRight: 2
                          }}>
                            {client.notes}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineNoteClientId(client.id);
                            setInlineNoteText('');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: 11,
                            padding: '3px 6px',
                            cursor: 'pointer',
                            width: '100%',
                            borderRadius: 6,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--primary)';
                            e.currentTarget.style.background = 'rgba(0, 82, 255, 0.04)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <MessageSquare size={11} />
                          <span>+ Заметка / комментарий</span>
                        </button>
                      )}
                    </div>
                    {(client.source || (scope === 'all' && assignedRealtor)) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: 6,
                        fontSize: 10,
                        color: 'var(--text-secondary)'
                      }}>
                        {client.source ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Tag size={10} />
                            <span>{client.source}</span>
                          </span>
                        ) : <span />}

                        {scope === 'all' && assignedRealtor && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500, color: 'var(--text-muted)' }}>
                            <User size={10} />
                            <span>{assignedRealtor.name || assignedRealtor.full_name}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── ПОЛЯ ДЛЯ ПЕРЕНОСА КАРТОЧЕК: "СДЕЛКА ЗАКРЫТА" И "ОТКАЗ / АРХИВ" ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
        paddingTop: 4
      }}>
        {/* Drop Zone: Сделка закрыта */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (activeDropZone !== 'completed') setActiveDropZone('completed');
          }}
          onDragLeave={() => setActiveDropZone(null)}
          onDrop={(e) => {
            setActiveDropZone(null);
            handleDrop(e, 'completed');
          }}
          style={{
            border: activeDropZone === 'completed'
              ? '2px solid #0f766e'
              : '2px dashed rgba(15, 118, 110, 0.40)',
            background: activeDropZone === 'completed'
              ? 'rgba(15, 118, 110, 0.16)'
              : 'rgba(15, 118, 110, 0.05)',
            borderRadius: 18,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: activeDropZone === 'completed' ? '0 0 16px rgba(15, 118, 110, 0.25)' : 'none',
            cursor: 'default'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(15, 118, 110, 0.14)',
                color: '#0f766e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="font-oswald" style={{ fontSize: 14, fontWeight: 600, color: '#0f766e', letterSpacing: '0.03em' }}>
                    СДЕЛКА ЗАКРЫТА
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(15, 118, 110, 0.15)',
                    color: '#0f766e',
                    borderRadius: 8, padding: '2px 8px'
                  }}>
                    {completedCards.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Перетащите карточку сюда для успешного закрытия сделки
                </div>
              </div>
            </div>

            {completedCards.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCompletedList(prev => !prev)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(15, 118, 110, 0.3)',
                  background: showCompletedList ? '#0f766e' : 'var(--surface)',
                  color: showCompletedList ? '#ffffff' : '#0f766e',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{showCompletedList ? 'Скрыть' : `Список (${completedCards.length})`}</span>
                {showCompletedList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {/* Expandable list of closed deal clients */}
          {showCompletedList && completedCards.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 240,
              overflowY: 'auto',
              paddingTop: 6,
              borderTop: '1px solid rgba(15, 118, 110, 0.15)'
            }}>
              {completedCards.map(client => (
                <div
                  key={client.id}
                  className="card-clickable"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface)',
                    borderRadius: 10,
                    border: '1px solid rgba(15, 118, 110, 0.2)',
                    fontSize: 12.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <CheckCircle2 size={14} color="#0f766e" />
                    <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.full_name}
                    </span>
                    {client.phone && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {formatPhone(client.phone)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, marginLeft: 8 }}>
                    Профиль →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drop Zone: Отказ / Архив */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (activeDropZone !== 'refused') setActiveDropZone('refused');
          }}
          onDragLeave={() => setActiveDropZone(null)}
          onDrop={(e) => {
            setActiveDropZone(null);
            handleDrop(e, 'refused');
          }}
          style={{
            border: activeDropZone === 'refused'
              ? '2px solid #ef4444'
              : '2px dashed rgba(239, 68, 68, 0.40)',
            background: activeDropZone === 'refused'
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(239, 68, 68, 0.04)',
            borderRadius: 18,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: activeDropZone === 'refused' ? '0 0 16px rgba(239, 68, 68, 0.25)' : 'none',
            cursor: 'default'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <XCircle size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="font-oswald" style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', letterSpacing: '0.03em' }}>
                    ОТКАЗ / АРХИВ
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    borderRadius: 8, padding: '2px 8px'
                  }}>
                    {refusedCards.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Перетащите карточку сюда в случае отказа клиента
                </div>
              </div>
            </div>

            {refusedCards.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRefusedList(prev => !prev)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: showRefusedList ? '#ef4444' : 'var(--surface)',
                  color: showRefusedList ? '#ffffff' : '#ef4444',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{showRefusedList ? 'Скрыть' : `Список (${refusedCards.length})`}</span>
                {showRefusedList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {/* Expandable list of refused clients */}
          {showRefusedList && refusedCards.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 240,
              overflowY: 'auto',
              paddingTop: 6,
              borderTop: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              {refusedCards.map(client => (
                <div
                  key={client.id}
                  className="card-clickable"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface)',
                    borderRadius: 10,
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: 12.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <XCircle size={14} color="#ef4444" />
                    <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.full_name}
                    </span>
                    {client.phone && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {formatPhone(client.phone)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginLeft: 8 }}>
                    Профиль →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── МОДАЛЬНОЕ ОКНО БЫСТРОГО ДОБАВЛЕНИЯ ВСТРЕЧИ / ЗВОНКА / КОММЕНТАРИЯ ── */}
      {activeModalAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setActiveModalAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 22,
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: 440,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: activeModalAction.type === 'meeting' ? 'rgba(139, 92, 246, 0.12)' : activeModalAction.type === 'call' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: activeModalAction.type === 'meeting' ? '#8b5cf6' : activeModalAction.type === 'call' ? '#3b82f6' : '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {activeModalAction.type === 'meeting' && <Calendar size={18} />}
                  {activeModalAction.type === 'call' && <Phone size={18} />}
                  {activeModalAction.type === 'comment' && <MessageSquare size={18} />}
                </div>
                <div>
                  <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                    {activeModalAction.type === 'meeting' && 'Новая встреча'}
                    {activeModalAction.type === 'call' && 'Звонок клиенту'}
                    {activeModalAction.type === 'comment' && 'Добавить комментарий'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {activeModalAction.client.full_name}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalAction(null)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  padding: 4, borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveQuickAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activeModalAction.type === 'meeting' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Дата и время встречи *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={actionForm.date}
                      onChange={e => setActionForm(prev => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                        borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                      }}
                    />
                  </div>

                  {(() => {
                    const clientProps = (state.properties || []).filter(p =>
                      p.owner_id === activeModalAction.client.id ||
                      p.client_id === activeModalAction.client.id ||
                      (Array.isArray(p.client_ids) && p.client_ids.includes(activeModalAction.client.id))
                    );
                    if (clientProps.length === 0) return null;
                    return (
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          Объект (опционально)
                        </label>
                        <select
                          value={actionForm.property_id}
                          onChange={e => setActionForm(prev => ({ ...prev, property_id: e.target.value }))}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                            borderRadius: 10, border: '1px solid var(--border)',
                            background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                          }}
                        >
                          <option value="">Без привязки к объекту</option>
                          {clientProps.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.address || p.city || 'Объект'} ({formatNumber(p.price || 0)} ₽)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Повестка / комментарий
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Где встречаемся, что обсуждаем..."
                      value={actionForm.comment}
                      onChange={e => setActionForm(prev => ({ ...prev, comment: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                        borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13,
                        resize: 'vertical', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </>
              )}

              {activeModalAction.type === 'call' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Дата и время звонка
                    </label>
                    <input
                      type="datetime-local"
                      value={actionForm.date}
                      onChange={e => setActionForm(prev => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                        borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Статус звонка
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setActionForm(prev => ({ ...prev, call_status: 'completed' }))}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                          border: actionForm.call_status === 'completed' ? '1px solid #10b981' : '1px solid var(--border)',
                          background: actionForm.call_status === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-light)',
                          color: actionForm.call_status === 'completed' ? '#059669' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Состоялся
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionForm(prev => ({ ...prev, call_status: 'planned' }))}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                          border: actionForm.call_status === 'planned' ? '1px solid #3b82f6' : '1px solid var(--border)',
                          background: actionForm.call_status === 'planned' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-light)',
                          color: actionForm.call_status === 'planned' ? '#2563eb' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        🕒 Запланирован
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Результат звонка / заметка
                    </label>
                    <textarea
                      rows={3}
                      placeholder="О чем договорились с клиентом..."
                      value={actionForm.comment}
                      onChange={e => setActionForm(prev => ({ ...prev, comment: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                        borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13,
                        resize: 'vertical', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </>
              )}

              {activeModalAction.type === 'comment' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Комментарий / Заметка *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Введите заметку по клиенту..."
                    value={actionForm.comment}
                    onChange={e => setActionForm(prev => ({ ...prev, comment: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13,
                      resize: 'vertical', fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveModalAction(null)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg-light)',
                    color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    border: 'none', background: 'var(--primary)',
                    color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)'
                  }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── МОДАЛЬНОЕ ОКНО БЫСТРОГО ДОБАВЛЕНИЯ КЛИЕНТА НА ЭТАП ВОРОНКИ ── */}
      {addClientModalColumn && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setAddClientModalColumn(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 22,
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: 460,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: addClientModalColumn.badgeBg,
                  color: addClientModalColumn.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                    Новый клиент
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Этап:
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: addClientModalColumn.color,
                      background: addClientModalColumn.badgeBg,
                      borderRadius: 6,
                      padding: '1px 7px'
                    }}>
                      {addClientModalColumn.label}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddClientModalColumn(null)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  padding: 4, borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveQuickClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  ФИО клиента *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Иванов Иван Иванович"
                  value={quickClientForm.full_name}
                  onChange={e => setQuickClientForm(prev => ({ ...prev, full_name: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Телефон
                  </label>
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={quickClientForm.phone}
                    onChange={e => setQuickClientForm(prev => ({ ...prev, phone: formatPhone(e.target.value, true) }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Тип клиента
                  </label>
                  <select
                    value={quickClientForm.client_type}
                    onChange={e => setQuickClientForm(prev => ({ ...prev, client_type: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13
                    }}
                  >
                    <option value="buyer">Покупатель</option>
                    <option value="seller">Продавец</option>
                    <option value="legal_entity">Юр. лицо</option>
                    <option value="landlord">Наймодатель</option>
                    <option value="tenant">Наниматель</option>
                    <option value="lessor">Арендодатель</option>
                    <option value="lessee">Арендатор</option>
                  </select>
                </div>
              </div>

              <GoogleContactStatusBadge
                compact
                status={quickGoogleCheck.status}
                contact={quickGoogleCheck.contact}
                error={quickGoogleCheck.error}
                saveToGoogle={saveQuickToGoogle}
                onToggleSaveToGoogle={setSaveQuickToGoogle}
                canApplyContact={!quickClientForm.full_name?.trim()}
                onApplyContact={(c) => {
                  if (c.name && !quickClientForm.full_name?.trim()) {
                    setQuickClientForm(prev => ({ ...prev, full_name: c.name }));
                  }
                }}
              />

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Заметка / пожелания клиента
                </label>
                <textarea
                  rows={3}
                  placeholder="Что ищет, бюджет, район или данные объекта..."
                  value={quickClientForm.notes}
                  onChange={e => setQuickClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13,
                    resize: 'vertical', fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => {
                    const col = addClientModalColumn;
                    const type = quickClientForm.client_type;
                    setAddClientModalColumn(null);
                    navigate(`/clients/new?status=${col.statusValue}&pipeline_stage=${col.id}&type=${type}`);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Открыть полную форму &rarr;
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setAddClientModalColumn(null)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg-light)',
                    color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!quickClientForm.full_name.trim()}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    border: 'none', background: 'var(--primary)',
                    color: '#ffffff', fontSize: 13, fontWeight: 600,
                    cursor: quickClientForm.full_name.trim() ? 'pointer' : 'default',
                    opacity: quickClientForm.full_name.trim() ? 1 : 0.6,
                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)'
                  }}
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PipelinePage;
