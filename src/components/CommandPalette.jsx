import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  X, 
  Building2, 
  Users, 
  Plus, 
  FileCheck, 
  History, 
  FolderHeart, 
  PhoneCall, 
  Calendar, 
  Moon, 
  Sun, 
  ClipboardList, 
  ArrowRight,
  Sparkles,
  Command,
  Landmark
} from 'lucide-react';
import { formatNumber, formatPhone, stripPhone } from '../utils/format';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { state } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Global listener for Ctrl+K, Cmd+K, or custom event
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }

    function handleCustomOpen() {
      setIsOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsOpen(false);
  };

  // Base Quick Actions
  const staticActions = useMemo(() => [
    {
      id: 'act-new-property',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Добавить новый объект',
      subtitle: 'Создать карточку продажи или аренды',
      icon: Plus,
      badge: '1 клик',
      action: () => { setIsOpen(false); navigate('/properties/new'); }
    },
    {
      id: 'act-new-client',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Добавить нового клиента',
      subtitle: 'Покупатель, продавец или арендатор',
      icon: Users,
      badge: '1 клик',
      action: () => { setIsOpen(false); navigate('/clients/new'); }
    },
    {
      id: 'act-new-call',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Зафиксировать звонок',
      subtitle: 'Создать задачу звонка клиенту',
      icon: PhoneCall,
      action: () => { setIsOpen(false); navigate('/tasks/call/new'); }
    },
    {
      id: 'act-new-meeting',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Назначить встречу с собственником',
      subtitle: 'Запланировать показ или переговоры',
      icon: Calendar,
      action: () => { setIsOpen(false); navigate('/tasks/meeting/new'); }
    },
    {
      id: 'act-new-history',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Добавить запись в историю',
      subtitle: 'Фиксация контакта или этапа сделки',
      icon: History,
      action: () => { setIsOpen(false); navigate('/history/new'); }
    },
    {
      id: 'act-new-selection',
      type: 'action',
      category: 'Быстрые действия',
      title: 'Создать подборку объектов',
      subtitle: 'Сформировать презентацию для покупателя',
      icon: FolderHeart,
      action: () => { setIsOpen(false); navigate('/selection/new'); }
    },
    {
      id: 'act-theme',
      type: 'action',
      category: 'Настройки',
      title: 'Переключить тему оформления',
      subtitle: 'Светлая / Тёмная тема интерфейса',
      icon: Sparkles,
      action: toggleTheme
    },
    {
      id: 'nav-dashboard',
      type: 'navigation',
      category: 'Разделы',
      title: 'Дашборд и аналитика',
      subtitle: 'Сводка, статистика и показатели',
      icon: Landmark,
      action: () => { setIsOpen(false); navigate('/'); }
    },
    {
      id: 'nav-properties',
      type: 'navigation',
      category: 'Разделы',
      title: 'Все объекты недвижимости',
      subtitle: 'Каталог, фильтры и база квартир',
      icon: Building2,
      action: () => { setIsOpen(false); navigate('/properties'); }
    },
    {
      id: 'nav-clients',
      type: 'navigation',
      category: 'Разделы',
      title: 'Клиенты и контакты',
      subtitle: 'База покупателей и продавцов',
      icon: Users,
      action: () => { setIsOpen(false); navigate('/clients'); }
    },
    {
      id: 'nav-deals',
      type: 'navigation',
      category: 'Разделы',
      title: 'Сделки и задачи',
      subtitle: 'Воронка, звонки и встречи',
      icon: FileCheck,
      action: () => { setIsOpen(false); navigate('/tasks'); }
    },
    {
      id: 'nav-docs',
      type: 'navigation',
      category: 'Разделы',
      title: 'Шаблоны документов',
      subtitle: 'Договоры, акты и соглашения',
      icon: ClipboardList,
      action: () => { setIsOpen(false); navigate('/documents'); }
    }
  ], [navigate]);

  // Search Results across real data + static items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return staticActions;
    }

    const matchedStatic = staticActions.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );

    const cleanQ = q.replace(/\D/g, '');

    // Search properties
    const matchedProperties = (state.properties || [])
      .filter(p => 
        p.address?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.complex_name?.toLowerCase().includes(q) ||
        p.price?.toString().includes(q)
      )
      .slice(0, 5)
      .map(p => ({
        id: `prop-${p.id}`,
        type: 'property',
        category: 'Объекты',
        title: p.address || 'Без адреса',
        subtitle: `${p.price ? formatNumber(p.price) + ' ₽' : ''} ${p.rooms ? `· ${p.rooms}-комн.` : ''} ${p.area ? `· ${p.area} м²` : ''}`,
        icon: Building2,
        badge: p.deal_type === 'rent' ? 'Аренда' : 'Продажа',
        action: () => { setIsOpen(false); navigate(`/properties/${p.id}`); }
      }));

    // Search clients
    const matchedClients = (state.clients || [])
      .filter(c => {
        const clientPhones = [c.phone, ...(c.phones || [])].filter(Boolean);
        return c.full_name?.toLowerCase().includes(q) ||
          clientPhones.some(p => p.includes(q) || formatPhone(p).includes(q) || (cleanQ.length >= 3 && stripPhone(p).includes(cleanQ)));
      })
      .slice(0, 5)
      .map(c => ({
        id: `client-${c.id}`,
        type: 'client',
        category: 'Клиенты',
        title: c.full_name || 'Без имени',
        subtitle: c.phone ? formatPhone(c.phone) : 'Телефон не указан',
        icon: Users,
        badge: c.type === 'seller' ? 'Продавец' : (c.type === 'landlord' ? 'Арендодатель' : 'Покупатель'),
        action: () => { setIsOpen(false); navigate(`/clients/${c.id}`); }
      }));

    // Search deals
    const matchedDeals = (state.deals || [])
      .filter(d => 
        d.title?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map(d => ({
        id: `deal-${d.id}`,
        type: 'deal',
        category: 'Сделки',
        title: d.title || 'Сделка без названия',
        subtitle: d.stage ? `Этап: ${d.stage}` : '',
        icon: FileCheck,
        action: () => { setIsOpen(false); navigate('/tasks'); }
      }));

    return [...matchedStatic, ...matchedProperties, ...matchedClients, ...matchedDeals];
  }, [query, staticActions, state.properties, state.clients, state.deals, navigate]);

  // Keyboard navigation
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('.cmd-item.selected');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        {/* Search header */}
        <div className="cmd-header">
          <Search size={20} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Любое действие, объект или клиент за 1 клик..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          {query && (
            <button type="button" className="cmd-clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <div className="cmd-esc-badge" onClick={() => setIsOpen(false)}>ESC</div>
        </div>

        {/* Results list */}
        <div className="cmd-list" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="cmd-empty">
              <Search size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>Ничего не найдено по запросу «{query}»</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Попробуйте найти объект по адресу или клиента по номеру телефона
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-item-icon">
                    <Icon size={18} />
                  </div>
                  <div className="cmd-item-content">
                    <div className="cmd-item-title-row">
                      <span className="cmd-item-title">{item.title}</span>
                      {item.badge && (
                        <span className="cmd-item-badge">{item.badge}</span>
                      )}
                    </div>
                    {item.subtitle && (
                      <span className="cmd-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="cmd-item-category">{item.category}</span>
                  <ArrowRight size={14} className="cmd-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="cmd-footer">
          <div className="cmd-footer-shortcuts">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Навигация</span>
            <span><kbd>↵</kbd> Выбрать</span>
            <span><kbd>Esc</kbd> Закрыть</span>
          </div>
          <div className="cmd-footer-brand">
            <Command size={13} style={{ marginRight: 4 }} />
            <span>Командная строка CRM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
