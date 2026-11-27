/**
 * Справочник кросс-услуг и шаблонов заявок (13 направлений).
 */

import { formatPhone, stripPhone } from '../utils/format';

export const CROSS_SERVICE_STATUSES = [
  { id: 'new', label: 'Новая заявка', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  { id: 'in_progress', label: 'В работе', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'awaiting_payment', label: 'Ожидает оплаты', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'completed', label: 'Оформлена', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'cancelled', label: 'Отменена', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
];

export const CROSS_SERVICE_STATUS_MAP = Object.fromEntries(
  CROSS_SERVICE_STATUSES.map(s => [s.id, s])
);

export const CROSS_SERVICE_CATEGORIES = [
  { id: 'all', label: 'Все услуги' },
  { id: 'insurance', label: 'Страхование' },
  { id: 'home', label: 'Дом и ремонт' },
  { id: 'auto_other', label: 'Авто и сервис' },
];

export const CROSS_SERVICE_TEMPLATES = [
  {
    id: 'rentier_insurance',
    category: 'insurance',
    title: 'Страховка квартиры РАНТЬЕ (от 6 мес.)',
    shortTitle: 'Страховка РАНТЬЕ',
    icon: 'ShieldCheck',
    color: '#0284c7',
    fields: [
      { key: 'owner_name', label: 'ФИО собственника', type: 'text', required: true, role: 'client_name' },
      { key: 'owner_phone', label: 'Телефон собственника', type: 'tel', required: true, role: 'client_phone' },
      { key: 'agent_email', label: 'Email АГЕНТА (для ссылки на оплату и полиса)', type: 'email', required: true, role: 'client_email' },
      { key: 'monthly_rent', label: 'Стоимость арендной платы в месяц (₽)', type: 'number', placeholder: 'Например: 35000' },
      { key: 'insurance_cost', label: 'Стоимость страховки', type: 'select', options: ['2646', '3685', '6469'] },
      { key: 'rent_start_date', label: 'Срок аренды - начало', type: 'date' },
      { key: 'rent_end_date', label: 'Срок аренды - окончание', type: 'date' },
      { key: 'residents_count', label: 'Количество проживающих', type: 'number', placeholder: '1' },
      { key: 'avito_url', label: 'Ссылка на Авито или объявление объекта', type: 'text', placeholder: 'https://...' },
      { key: 'documents_note', label: 'Документы: ЕГРН, 1 стр. паспорта, фото объекта', type: 'textarea', hint: 'Прикрепите файлы ниже или отметьте, что передано' },
    ],
  },
  {
    id: 'rent_insurance',
    category: 'insurance',
    title: 'Страховка квартиры Аренда (от 2 мес.)',
    shortTitle: 'Страховка Аренда',
    icon: 'Home',
    color: '#2563eb',
    fields: [
      { key: 'owner_name', label: 'ФИО собственника', type: 'text', required: true, role: 'client_name' },
      { key: 'owner_phone', label: 'Телефон собственника', type: 'tel', required: true, role: 'client_phone' },
      { key: 'agent_email', label: 'Email АГЕНТА (для ссылки на оплату и полиса)', type: 'email', required: true, role: 'client_email' },
      { key: 'avito_url', label: 'Ссылка на Авито или объявление объекта', type: 'text', placeholder: 'https://...' },
      { key: 'documents_note', label: 'Документы: ЕГРН на квартиру, 1 стр. паспорта + прописка, фото объекта', type: 'textarea' },
    ],
  },
  {
    id: 'pet_tick_insurance',
    category: 'insurance',
    title: 'АНТИКЛЕЩ для животных',
    shortTitle: 'Антиклещ (животные)',
    icon: 'Bug',
    color: '#16a34a',
    fields: [
      { key: 'client_name', label: 'ФИО страхователя', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Номер телефона', type: 'tel', required: true, role: 'client_phone' },
      { key: 'client_email', label: 'Электронная почта', type: 'email', role: 'client_email' },
      { key: 'pet_species', label: 'Кошка / собака', type: 'select', options: ['Кошка', 'Собака'] },
      { key: 'pet_name', label: 'Кличка', type: 'text' },
      { key: 'pet_gender', label: 'Пол животного', type: 'select', options: ['Самец', 'Самка'] },
      { key: 'pet_age_months', label: 'Возраст (полных месяцев)', type: 'number' },
      { key: 'pet_breed', label: 'Вид породы', type: 'text' },
      { key: 'pet_color', label: 'Окрас', type: 'text' },
      { key: 'documents_note', label: 'Фото страхователя с питомцем, паспорт 1 стр. + прописка', type: 'textarea' },
    ],
  },
  {
    id: 'pet_insurance',
    category: 'insurance',
    title: 'Страховка животных',
    shortTitle: 'Страховка животных',
    icon: 'HeartHandshake',
    color: '#059669',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'client_email', label: 'Электронная почта', type: 'email', role: 'client_email' },
      { key: 'pet_species', label: 'Животное (кот, собака)', type: 'select', options: ['Кот', 'Собака'] },
      { key: 'pet_age', label: 'Возраст животного', type: 'text' },
      { key: 'insurance_plan', label: 'Вид страховки (уточнять заранее)', type: 'select', options: ['Базовая', 'Оптимальная', 'Расширенная', 'Максимальная', 'Сбалансированная'] },
      { key: 'pet_name', label: 'Кличка', type: 'text' },
      { key: 'pet_gender', label: 'Пол', type: 'select', options: ['Самец', 'Самка'] },
      { key: 'pet_breed', label: 'Вид породы', type: 'text' },
      { key: 'pet_color', label: 'Окрас', type: 'text' },
      { key: 'chip_or_tattoo', label: 'Номер чипа или клеймо', type: 'text' },
      { key: 'chronic_diseases', label: 'Хронические заболевания', type: 'text', placeholder: 'Нет / указать какие' },
      { key: 'documents_note', label: 'Фото ветпаспорта и селфи хозяина с питомцем', type: 'textarea' },
    ],
  },
  {
    id: 'auto_insurance',
    category: 'auto_other',
    title: 'Страховка автомобиль',
    shortTitle: 'Страховка авто',
    icon: 'Car',
    color: '#dc2626',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'client_email', label: 'Адрес электронной почты (обязательно)', type: 'email', required: true, role: 'client_email' },
      { key: 'insurance_type', label: 'Вид страховки', type: 'select', options: ['ОСАГО', 'КАСКО'] },
      { key: 'usage_type', label: 'Доп. информация (использование)', type: 'select', options: ['Личная', 'Корпоративная'] },
      { key: 'plate_number', label: 'Регистрационный знак (ГРЗ) - номер машины', type: 'text', placeholder: 'А123ВС43' },
      { key: 'documents_note', label: 'Документы: паспорт 1-2 стр.; ОСАГО: паспорт собственника, ПТС, вод. права всех водителей', type: 'textarea' },
    ],
  },
  {
    id: 'property_insurance',
    category: 'insurance',
    title: 'Страховка квартиры или дома',
    shortTitle: 'Страховка жилья',
    icon: 'Building2',
    color: '#0ea5e9',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'client_email', label: 'Адрес электронной почты', type: 'email', role: 'client_email' },
      { key: 'insurance_type', label: 'Вид страховки', type: 'text', placeholder: 'Ипотечное / добровольное / титул...' },
      { key: 'notes', label: 'Доп. информация', type: 'textarea' },
      { key: 'documents_note', label: 'Документы: паспорт 1 стр. разворот и прописка (страховая может запросить доп. документы)', type: 'textarea' },
    ],
  },
  {
    id: 'kids_sport_tourism_insurance',
    category: 'insurance',
    title: 'Страховка дети / Спорт и Туризм',
    shortTitle: 'Дети / Спорт / Туризм',
    icon: 'Plane',
    color: '#f97316',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'client_email', label: 'Адрес электронной почты', type: 'email', role: 'client_email' },
      { key: 'insurance_type', label: 'Вид страховки', type: 'select', options: ['Страховка дети', 'Спорт', 'Туризм'] },
      { key: 'notes', label: 'Доп. информация', type: 'textarea' },
      { key: 'documents_note', label: 'Документы: паспорт 1 стр. + прописка (дети: свидетельство о рождении, прописка)', type: 'textarea' },
    ],
  },
  {
    id: 'cleaning',
    category: 'home',
    title: 'Клининг',
    shortTitle: 'Клининг',
    icon: 'Sparkles',
    color: '#06b6d4',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'property_type', label: 'Объект недвижимости', type: 'select', options: ['Квартира', 'Дом', 'Коммерческое помещение'] },
      { key: 'rooms', label: 'Кол-во комнат', type: 'number' },
      { key: 'area', label: 'Площадь квартиры (м²)', type: 'number' },
      { key: 'cleaning_type', label: 'Вид уборки', type: 'select', options: ['Генеральная', 'После ремонта'] },
      { key: 'address', label: 'Адрес объекта', type: 'text', role: 'address' },
      { key: 'documents_note', label: 'Фото туалет и кухня (обязательно)', type: 'textarea' },
    ],
  },
  {
    id: 'moving',
    category: 'home',
    title: 'Переезд',
    shortTitle: 'Переезд',
    icon: 'Truck',
    color: '#8b5cf6',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон клиента', type: 'tel', required: true, role: 'client_phone' },
      { key: 'load_address', label: 'Адрес погрузки (город)', type: 'text', role: 'address' },
      { key: 'unload_address', label: 'Адрес выгрузки (город)', type: 'text' },
      { key: 'cargo_description', label: 'Что перевозим?', type: 'textarea' },
      { key: 'move_datetime', label: 'Дата и время', type: 'text', placeholder: 'Например: 15.12.2026 к 10:00' },
      { key: 'notes', label: 'Доп. информация', type: 'textarea' },
    ],
  },
  {
    id: 'renovation',
    category: 'home',
    title: 'Ремонт',
    shortTitle: 'Ремонт',
    icon: 'Hammer',
    color: '#d97706',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'address', label: 'Адрес квартиры', type: 'text', role: 'address' },
      { key: 'market_type', label: 'Вторичка или Новостройка', type: 'select', options: ['Вторичка', 'Новостройка'] },
      { key: 'area', label: 'Площадь квартиры (м²)', type: 'number' },
      { key: 'documents_note', label: 'Планировка квартиры (если новостройка - прикрепить планировку)', type: 'textarea' },
      { key: 'notes', label: 'Доп. информация', type: 'textarea' },
    ],
  },
  {
    id: 'apartment_acceptance',
    category: 'home',
    title: 'Приемка квартиры',
    shortTitle: 'Приемка квартиры',
    icon: 'ClipboardCheck',
    color: '#0d9488',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон клиента', type: 'tel', required: true, role: 'client_phone' },
      { key: 'property_type', label: 'Объект (дом или квартира)', type: 'select', options: ['Квартира', 'Дом'] },
      { key: 'address', label: 'Адрес объекта', type: 'text', role: 'address' },
      { key: 'finish_type', label: 'Отделка', type: 'select', options: ['Черновая', 'Чистовая', 'Чистовая с мебелью'] },
      { key: 'area', label: 'Площадь квартиры (м²)', type: 'number' },
      { key: 'acceptance_date', label: 'Дата приемки', type: 'date' },
    ],
  },
  {
    id: 'dry_cleaning',
    category: 'auto_other',
    title: 'Химчистка / Автохимчистка',
    shortTitle: 'Химчистка',
    icon: 'Droplets',
    color: '#6366f1',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон', type: 'tel', required: true, role: 'client_phone' },
      { key: 'item_category', label: 'Что отдаем в химчистку?', type: 'select', options: ['Мебель', 'Салон авто', 'Ковры', 'Другое'] },
      { key: 'car_brand', label: 'Автомобиль - марка авто (если автохимчистка)', type: 'text' },
      { key: 'address', label: 'Адрес местоположения', type: 'text', role: 'address' },
      { key: 'documents_note', label: 'Фото того, что отдают в химчистку', type: 'textarea' },
      { key: 'notes', label: 'Доп. информация', type: 'textarea' },
    ],
  },
  {
    id: 'interior_design',
    category: 'home',
    title: 'Дизайн интерьера',
    shortTitle: 'Дизайн интерьера',
    icon: 'Palette',
    color: '#ec4899',
    fields: [
      { key: 'client_name', label: 'ФИО клиента', type: 'text', required: true, role: 'client_name' },
      { key: 'client_phone', label: 'Телефон клиента', type: 'tel', required: true, role: 'client_phone' },
      { key: 'property_type', label: 'Объект (дом или квартира)', type: 'select', options: ['Квартира', 'Дом'] },
      { key: 'address', label: 'Адрес объекта', type: 'text', role: 'address' },
      { key: 'design_package', label: 'Дизайн', type: 'select', options: ['Базовый', 'Продвинутый', 'Эксклюзивный'] },
      { key: 'area', label: 'Площадь объекта недвижимости (м²)', type: 'number' },
    ],
  },
];

export const CROSS_SERVICE_MAP = Object.fromEntries(
  CROSS_SERVICE_TEMPLATES.map(t => [t.id, t])
);

export function getCrossServiceTemplate(serviceType) {
  return CROSS_SERVICE_MAP[serviceType] || CROSS_SERVICE_TEMPLATES[0];
}

export function getCrossServiceStatusMeta(status) {
  return CROSS_SERVICE_STATUS_MAP[status] || CROSS_SERVICE_STATUSES[0];
}

/**
 * Формирует строку для сквозного поиска по заявке кросс-услуги.
 */
export function buildCrossServiceSearchText(item, client = null) {
  const tpl = getCrossServiceTemplate(item?.service_type);
  const detailsText = item?.details && typeof item.details === 'object'
    ? Object.values(item.details).filter(Boolean).join(' ')
    : '';
  const phone = item?.client_phone || client?.phone || '';
  return [
    tpl.title,
    tpl.shortTitle,
    item?.client_name || client?.full_name || '',
    phone,
    stripPhone(phone),
    formatPhone(phone),
    item?.client_email || client?.email || '',
    item?.address || '',
    item?.notes || '',
    detailsText,
  ].join(' ').toLowerCase();
}

/**
 * Форматирует заполненную заявку для копирования и отправки партнёру / в чат.
 */
export function formatCrossServiceShareText(item) {
  const tpl = getCrossServiceTemplate(item?.service_type);
  const details = item?.details || {};
  const lines = [`Заявка: ${tpl.title}`, ''];

  tpl.fields.forEach((field, idx) => {
    const val = details[field.key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const displayVal = field.type === 'tel' ? formatPhone(String(val)) : String(val).trim();
      lines.push(`${idx + 1}. ${field.label}: ${displayVal}`);
    }
  });

  if (item?.notes?.trim()) {
    lines.push(`Комментарий: ${item.notes.trim()}`);
  }

  return lines.join('\n');
}
