import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Printer, FileText } from 'lucide-react';

export function DocumentsPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const [selectedTemplate, setSelectedTemplate] = useState('sale'); // sale, rent, act
    const realtorName = state.currentUser?.full_name || '________________________';
    const agencyName = state.currentUser?.agency_name || '________________________';
    const currentDate = new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const templates = {
        sale: {
            title: 'Договор купли-продажи недвижимости',
            content: `ДОГОВОР КУПЛИ-ПРОДАЖИ НЕДВИЖИМОСТИ

г. Москва                                                                 «${currentDate}»

Мы, нижеподписавшиеся:
Гр. __________________________________________________, паспорт: серия ________ № ____________, выдан ____________________________________________________________________, код подразделения ____________, зарегистрированный(ая) по адресу: ____________________________________________________________________, именуемый(ая) в дальнейшем «Продавец», с одной стороны, и
Гр. __________________________________________________, паспорт: серия ________ № ____________, выдан ____________________________________________________________________, код подразделения ____________, зарегистрированный(ая) по адресу: ____________________________________________________________________, именуемый(ая) в дальнейшем «Покупатель», с другой стороны,
при посредничестве Агентства недвижимости «${agencyName}» в лице риелтора ${realtorName}, заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Продавец продает, а Покупатель покупает в собственность недвижимое имущество (далее – «Объект»):
Адрес: ____________________________________________________________________________________
Кадастровый номер: ____________________________________
Общая площадь: ________ кв. м.

2. ЦЕНА И ПОРЯДОК РАСЧЕТОВ
2.1. Объект продается за цену в размере ________________________ (________________________________________________________________________) рублей.
2.2. Покупатель обязуется выплатить указанную сумму в течение ___ банковских дней с момента регистрации перехода права собственности.

3. ПОДПИСИ СТОРОН

Продавец: ____________________ / ____________________ /

Покупатель: ____________________ / ____________________ /

Риелтор: ____________________ / ${realtorName} /`
        },
        rent: {
            title: 'Договор аренды жилого помещения',
            content: `ДОГОВОР АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ

г. Москва                                                                 «${currentDate}»

Гр. __________________________________________________, паспорт: серия ________ № ____________, зарегистрированный(ая) по адресу: ____________________________________________________________________, именуемый(ая) в дальнейшем «Наймодатель», с одной стороны, и
Гр. __________________________________________________, паспорт: серия ________ № ____________, зарегистрированный(ая) по адресу: ____________________________________________________________________, именуемый(ая) в дальнейшем «Наниматель», с другой стороны,
при содействии риелтора ${realtorName} (Агентство недвижимости «${agencyName}»), заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Наймодатель предоставляет Нанимателю за плату во владение и пользование жилое помещение по адресу: ____________________________________________________________________________________

2. АРЕНДНАЯ ПЛАТА
2.1. Ежемесячная плата за пользование помещением составляет ________________________ (________________________________________________________________________) рублей.

3. ПОДПИСИ СТОРОН

Наймодатель: ____________________ / ____________________ /

Наниматель: ____________________ / ____________________ /

Риелтор: ____________________ / ${realtorName} /`
        },
        act: {
            title: 'Акт приема-передачи объекта недвижимости',
            content: `АКТ ПРИЕМА-ПЕРЕДАЧИ ОБЪЕКТА НЕДВИЖИМОСТИ

г. Москва                                                                 «${currentDate}»

Мы, нижеподписавшиеся,
Гр. __________________________________________________ (Продавец/Наймодатель), с одной стороны, и
Гр. __________________________________________________ (Покупатель/Наниматель), с другой стороны,
составили настоящий Акт о том, что в соответствии с Договором от «___» ___________ 20___ г.:

1. Продавец передал, а Покупатель принял недвижимое имущество по адресу:
____________________________________________________________________________________

2. Состояние имущества соответствует условиям договора. Претензий стороны друг к другу не имеют.

3. Передачу осуществил в присутствии риелтора ${realtorName} (Агентство недвижимости «${agencyName}»).

ПОДПИСИ СТОРОН

Передал: ____________________ / ____________________ /

Принял: ____________________ / ____________________ /

Риелтор: ____________________ / ${realtorName} /`
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="page fade-in" style={{ paddingBottom: 100 }}>
            {/* Print specific style sheet */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        color: #000 !important;
                        background: #fff !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            <div className="topbar sticky no-print" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <button 
                    className="card-clickable" 
                    onClick={() => navigate(-1)}
                    style={{ 
                        width: 44, height: 44, borderRadius: 14, border: 'none',
                        background: 'var(--surface)', color: 'var(--text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 20, fontWeight: 300 }}>Шаблоны документов</span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>Печать договоров и актов</span>
                </div>
            </div>

            <div className="page-content" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Template selectors */}
                <div className="no-print" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {Object.entries(templates).map(([key, t]) => (
                        <button
                            key={key}
                            className={`tab-filter ${selectedTemplate === key ? 'active' : ''}`}
                            onClick={() => setSelectedTemplate(key)}
                            style={{
                                whiteSpace: 'nowrap', padding: '10px 18px', borderRadius: 14, border: 'none',
                                background: selectedTemplate === key ? 'var(--primary)' : 'var(--surface)',
                                color: selectedTemplate === key ? 'white' : 'var(--text-secondary)',
                                fontSize: 13, fontWeight: 300, fontFamily: "'Oswald', sans-serif",
                                boxShadow: selectedTemplate === key ? '0 4px 12px rgba(0, 82, 255, 0.2)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <FileText size={16} />
                            {key === 'sale' ? 'Купля-продажа' : key === 'rent' ? 'Аренда' : 'Акт приема-передачи'}
                        </button>
                    ))}
                </div>

                {/* Print button */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="card-clickable"
                        onClick={handlePrint}
                        style={{
                            height: 46, padding: '0 20px', borderRadius: 14, border: 'none',
                            background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 14,
                            boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)', display: 'flex', alignItems: 'center', gap: 8
                        }}
                    >
                        <Printer size={18} /> Печать / PDF
                    </button>
                </div>

                {/* Document preview container */}
                <div 
                    id="print-area" 
                    style={{
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        borderRadius: 24,
                        padding: '40px 30px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                        fontFamily: 'serif',
                        fontSize: 15,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        minHeight: 600
                    }}
                >
                    {templates[selectedTemplate].content}
                </div>
            </div>
        </div>
    );
}

export default DocumentsPage;
