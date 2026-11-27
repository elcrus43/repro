import { describe, it, expect } from 'vitest';
import {
  CROSS_SERVICE_TEMPLATES,
  getCrossServiceTemplate,
  buildCrossServiceSearchText,
  formatCrossServiceShareText,
} from './crossServices';

describe('crossServices templates and helpers', () => {
  it('defines all 13 cross-service application templates', () => {
    expect(CROSS_SERVICE_TEMPLATES).toHaveLength(13);
    const ids = new Set(CROSS_SERVICE_TEMPLATES.map(t => t.id));
    expect(ids.size).toBe(13);
  });

  it('builds search text including normalized phone and details', () => {
    const text = buildCrossServiceSearchText({
      service_type: 'auto_insurance',
      client_name: 'Иванов Пётр',
      client_phone: '79091304090',
      details: { plate_number: 'А123ВС43', insurance_type: 'ОСАГО' },
    });
    expect(text).toContain('страховка автомобиль');
    expect(text).toContain('иванов пётр');
    expect(text).toContain('а123вс43');
    expect(text).toContain('осаго');
  });

  it('formats shareable application text cleanly without em-dashes', () => {
    const tpl = getCrossServiceTemplate('rentier_insurance');
    expect(tpl.id).toBe('rentier_insurance');
    const txt = formatCrossServiceShareText({
      service_type: 'rentier_insurance',
      details: {
        owner_name: 'Сидорова Анна',
        owner_phone: '79091304090',
        agent_email: 'agent@reacrm.ru',
        insurance_cost: '3685',
      },
      notes: 'Срочно до пятницы',
    });
    expect(txt).toContain('Страховка квартиры РАНТЬЕ');
    expect(txt).toContain('Сидорова Анна');
    expect(txt).toContain('3685');
    expect(txt).not.toContain('—');
  });
});
