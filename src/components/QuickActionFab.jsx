import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Building2, 
  Users, 
  PhoneCall, 
  History, 
  Search,
  Sparkles
} from 'lucide-react';

export function QuickActionFab() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Close when pressing Esc
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAction = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleOpenSearch = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <>
      {/* Dimmed backdrop when FAB is open */}
      {isOpen && (
        <div 
          className="quick-fab-backdrop" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <div className={`quick-fab-container ${isOpen ? 'open' : ''}`}>
        {/* Speed dial list */}
        {isOpen && (
          <div className="quick-fab-actions">
            <button 
              type="button"
              className="quick-fab-action-item"
              onClick={handleOpenSearch}
            >
              <span className="quick-fab-label">Поиск и действия</span>
              <div className="quick-fab-icon-btn fab-search">
                <Search size={18} />
              </div>
            </button>

            <button 
              type="button"
              className="quick-fab-action-item"
              onClick={() => handleAction('/history/new')}
            >
              <span className="quick-fab-label">Запись в историю</span>
              <div className="quick-fab-icon-btn fab-history">
                <History size={18} />
              </div>
            </button>

            <button 
              type="button"
              className="quick-fab-action-item"
              onClick={() => handleAction('/tasks/call/new')}
            >
              <span className="quick-fab-label">Зафиксировать звонок</span>
              <div className="quick-fab-icon-btn fab-call">
                <PhoneCall size={18} />
              </div>
            </button>

            <button 
              type="button"
              className="quick-fab-action-item"
              onClick={() => handleAction('/clients/new')}
            >
              <span className="quick-fab-label">Новый клиент</span>
              <div className="quick-fab-icon-btn fab-client">
                <Users size={18} />
              </div>
            </button>

            <button 
              type="button"
              className="quick-fab-action-item"
              onClick={() => handleAction('/properties/new')}
            >
              <span className="quick-fab-label">Новый объект</span>
              <div className="quick-fab-icon-btn fab-property">
                <Building2 size={18} />
              </div>
            </button>
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          className={`quick-fab-main-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? 'Закрыть меню' : 'Быстрое действие за 1 клик'}
          title="Быстрое действие за 1 клик"
        >
          <Plus size={24} className="quick-fab-plus-icon" />
        </button>
      </div>
    </>
  );
}
