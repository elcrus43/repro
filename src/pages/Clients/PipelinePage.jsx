import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';

const PIPELINE_COLUMNS = [
  { id: 'new',        label: 'Не отработан', color: '#6b7280' },
  { id: 'selection',  label: 'Подбор',       color: '#3b82f6' },
  { id: 'active',     label: 'В работе',     color: '#10b981' },
  { id: 'refused',    label: 'Отказ',        color: '#ef4444' },
];

export function PipelinePage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const isAdmin = state.currentUser?.role === 'admin';

  // Helper status mapping
  const mapStatus = (status) => {
    switch (status) {
      case 'new': return 'new';
      case 'refused': return 'refused';
      case 'search':
      case 'request':
      case 'selection': return 'selection';
      default: return 'active';
    }
  };

  // Only show clients who are buyers (Покупатели)
  const buyerClients = useMemo(() => {
    return state.clients
      .filter(c => c.client_types?.includes('buyer'))
      .filter(c => isAdmin ? true : c.realtor_id === state.currentUser?.id);
  }, [state.clients, isAdmin, state.currentUser?.id]);

  const columnMap = useMemo(() => {
    const map = {};
    PIPELINE_COLUMNS.forEach(col => {
      map[col.id] = buyerClients.filter(c => mapStatus(c.status) === col.id);
    });
    return map;
  }, [buyerClients]);

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    const client = buyerClients.find(c => c.id === clientId);
    if (client && mapStatus(client.status) !== columnId) {
      dispatch({ type: 'UPDATE_CLIENT', client: { ...client, status: columnId } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="pipeline-scrollbar" style={{
      overflowX: 'auto',
      scrollbarWidth: 'none',
      display: 'flex',
      gap: 12,
      padding: '16px 20px 24px',
      margin: '0 -20px',
      width: 'calc(100% + 40px)',
      boxSizing: 'border-box',
      minHeight: 400,
    }}>
      <style>{`
        .pipeline-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {PIPELINE_COLUMNS.map(column => {
        const cards = columnMap[column.id] || [];
        return (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
            style={{
              minWidth: 220,
              flex: '0 0 220px',
              background: 'var(--bg-light)',
              borderRadius: 20,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Column Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: column.color, flexShrink: 0
              }} />
              <span className="font-oswald" style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1
              }}>
                {column.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: column.color,
                background: `${column.color}18`, borderRadius: 8,
                padding: '2px 8px'
              }}>
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            {cards.length === 0 && (
              <div style={{
                border: `2px dashed ${column.color}33`,
                borderRadius: 14,
                padding: '20px 12px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: 12,
                opacity: 0.6
              }}>
                Нет клиентов
              </div>
            )}

            {cards.map(client => {
              return (
                <div
                  key={client.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('clientId', client.id)}
                  className="card-clickable"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 16,
                    padding: 14,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    cursor: 'grab',
                    border: '1px solid var(--border-light)',
                    userSelect: 'none',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    marginBottom: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                  }}>
                    {client.full_name}
                  </div>

                  <div style={{
                    fontSize: 11, color: 'var(--primary)', fontWeight: 400,
                    marginBottom: 4
                  }}>
                    {formatPhone(client.phone)}
                  </div>

                  {client.source && (
                    <div style={{
                      fontSize: 10, color: 'var(--text-secondary)',
                      background: 'var(--bg-light)', padding: '2px 6px', borderRadius: 4,
                      width: 'fit-content'
                    }}>
                      Источник: {client.source}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default PipelinePage;
