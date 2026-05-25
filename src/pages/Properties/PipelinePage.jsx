import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';

const PIPELINE_COLUMNS = [
  { id: 'meeting',     label: 'Встреча',    color: '#3b82f6' },
  { id: 'agreement',  label: 'АД',         color: '#f59e0b' },
  { id: 'advertising',label: 'В рекламе',  color: '#8b5cf6' },
  { id: 'deposit',    label: 'Задаток',    color: '#10b981' },
  { id: 'deal',       label: 'Сделка',     color: '#22c55e' },
];

export function PipelinePage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const isAdmin = state.currentUser?.role === 'admin';

  const properties = useMemo(() => {
    return state.properties.filter(p =>
      isAdmin ? true : p.realtor_id === state.currentUser?.id
    );
  }, [state.properties, isAdmin, state.currentUser?.id]);

  const columnMap = useMemo(() => {
    const map = {};
    PIPELINE_COLUMNS.forEach(col => {
      map[col.id] = properties.filter(p => p.status === col.id);
    });
    return map;
  }, [properties]);

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const propId = e.dataTransfer.getData('propertyId');
    const prop = properties.find(p => p.id === propId);
    if (prop && prop.status !== columnId) {
      dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, status: columnId } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{
      overflowX: 'auto',
      scrollbarWidth: 'none',
      display: 'flex',
      gap: 12,
      padding: '16px 4px 24px',
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
                Нет объектов
              </div>
            )}

            {cards.map(prop => {
              const client = state.clients.find(c => c.id === prop.client_id);
              return (
                <div
                  key={prop.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('propertyId', prop.id)}
                  className="card-clickable"
                  onClick={() => navigate(`/properties/${prop.id}`)}
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
                    {prop.address || prop.city || '—'}
                  </div>

                  <div className="font-oswald" style={{
                    fontSize: 16, fontWeight: 600, color: column.color,
                    marginBottom: 4,
                  }}>
                    {formatNumber(prop.price)} <span style={{ fontSize: 11, opacity: 0.7 }}>₽</span>
                  </div>

                  {client && (
                    <div style={{
                      fontSize: 11, color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--text-muted)'
                      }} />
                      {client.full_name}
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
