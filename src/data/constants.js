export const BUILDING_TYPES = {
    panel: 'Панель',
    brick: 'Кирпич',
    monolith: 'Монолит',
    wood: 'Дерево',
    block: 'Блок'
};

export const BALCONY_LABELS = {
    none: 'Нет',
    balcony: 'Балкон',
    loggia: 'Лоджия',
    both: 'Оба'
};

export const RENOVATION_LABELS = {
    none: 'Без ремонта',
    cosmetic: 'Косметический',
    euro: 'Евро',
    designer: 'Дизайнерский'
};

export const MARKET_LABELS = {
    secondary: 'Вторичка',
    new_building: 'Новостройка'
};

export const PROPERTY_TYPES = {
    apartment: 'Квартира',
    house: 'Дом',
    land: 'Земельный участок',
    garden: 'Сад',
    commercial: 'Коммерческая',
    room: 'Комната'
};

export const STATUS_LABELS = {
    meeting: 'Встреча',
    agreement: 'АД',
    advertising: 'В рекламе',
    deposit: 'Задаток',
    deal: 'Сделка',
    rejected: 'Отказ',
    active: 'Активен',
    sold: 'Продан',
    reserved: 'Резерв',
    withdrawn: 'Снят'
};

export const STATUS_COLORS = {
    meeting: 'primary',
    agreement: 'warning-alt',
    advertising: 'success',
    deposit: 'warning',
    deal: 'success',
    rejected: 'danger',
    active: 'success',
    sold: 'muted',
    reserved: 'warning',
    withdrawn: 'danger'
};

export const REQUEST_STATUS_LABELS = {
    active: 'Актуально',
    completed: 'Завершен',
    paused: 'Завершен',
    deal_closed: 'Завершен',
    refused: 'Завершен'
};

export const REQUEST_STATUS_COLORS = {
    active: '#10b981',
    completed: '#64748b',
    paused: '#64748b',
    deal_closed: '#64748b',
    refused: '#64748b'
};

export const REQUEST_STATUSES = [
    { id: 'active', label: 'Актуально', color: '#10b981' },
    { id: 'completed', label: 'Завершен', color: '#64748b' }
];

export const HOUSE_MATERIALS = {
    brick: 'Кирпич',
    timber: 'Брус',
    wood: 'Дерево / бревно',
    block: 'Блок / газобетон',
    frame: 'Каркасный',
    monolith: 'Монолит'
};

export const HOUSE_CONDITIONS = {
    new: 'Новый',
    good: 'Хорошее',
    normal: 'Среднее / жилое',
    renovation: 'Требует ремонта',
    rough: 'Черновая отделка'
};

export const LAND_CATEGORIES = {
    izhs: 'ИЖС',
    lph: 'ЛПХ',
    snt: 'СНТ',
    dnt: 'ДНТ',
    settlement: 'Земли поселений',
    other: 'Другое'
};

export const ROAD_ACCESS = {
    asphalt: 'Асфальт',
    gravel: 'Гравий / щебень',
    dirt: 'Грунтовка',
    none: 'Нет дороги'
};

export const FENCE_TYPES = {
    none: 'Нет',
    partial: 'Частичный',
    full_proflist: 'Профлист',
    full_metal: 'Металл / штакетник',
    full_wood: 'Дерево',
    full_brick: 'Кирпич / камень'
};

export const WATER_TYPES = {
    central: 'Центральное',
    well: 'Скважина',
    pit: 'Колодец',
    summer: 'Летний водопровод'
};

export const GAS_TYPES = {
    main: 'Магистральный',
    cylinder: 'Баллонный / газгольдер',
    border: 'По границе'
};

export const SEWAGE_TYPES = {
    central: 'Центральная',
    septic: 'Септик',
    pit: 'Выгребная яма'
};

export const COMMERCIAL_TYPES = {
    free_purpose: 'Свободного назначения (ПСН)',
    retail: 'Торговое / Магазин',
    office: 'Офис',
    catering: 'Общепит / Кафе / Ресторан',
    warehouse: 'Склад',
    production: 'Производство',
    autoservice: 'Автосервис / Мойка',
    services: 'Сфера услуг / Салон',
    hotel: 'Гостиница / Отель'
};

export const ENTRANCE_TYPES = {
    separate_street: 'Отдельный с улицы',
    separate_yard: 'Отдельный со двора',
    common_street: 'Общий с улицы',
    business_center: 'Через БЦ / ТЦ / проходную'
};

export const COMMERCIAL_LAYOUTS = {
    open_space: 'Open Space (открытая)',
    cabinet: 'Кабинетная',
    mixed: 'Смешанная',
    hall: 'Зальная'
};

export const LOCATION_LINES = {
    first_line: '1-я линия',
    second_line: '2-я линия / во дворе'
};

export const VENTILATION_TYPES = {
    forced: 'Приточно-вытяжная',
    natural: 'Естественная',
    exhaust_hood: 'Отдельный вентканал (для общепита)',
    none: 'Без вентиляции'
};

export const CLIENT_SOURCES = [
    'Авито',
    'лидген',
    'сайт',
    'дежурство в офисе',
    'Лид руководства',
    'Лид РГ',
    'с показа',
    'рекомендация',
    'соцсети',
    'ТОП-100',
    'ХЗ',
    'попутная наработка',
    'Лид Руководителя',
    'Вх. звонок в Офис',
    'другое'
];

export const AGENCY_CONTRACT_TYPES = [
    'АД Покупка',
    'АД Продажа',
    'АД ЮСС Покупка',
    'АД ЮСС Продажа',
    'АД Найм с наймодателем',
    'АД Найм с нанимателем',
    'АД Аренда с арендодателем',
    'АД Аренда с арендатором'
];

export const CLIENT_TYPES = [
    { id: 'buyer', label: 'Покупатель' },
    { id: 'seller', label: 'Продавец' },
    { id: 'developer', label: 'Застройщик' },
    { id: 'agent', label: 'Агент' },
    { id: 'landlord', label: 'Наймодатель' },
    { id: 'tenant', label: 'Наниматель' },
    { id: 'lessor', label: 'Арендодатель' },
    { id: 'lessee', label: 'Арендатор' },
    { id: 'lawyer', label: 'Юрист' }
];

export const CLIENT_TYPE_LABELS = {
    buyer: 'Покупатель',
    seller: 'Продавец',
    developer: 'Застройщик',
    agent: 'Агент',
    landlord: 'Наймодатель',
    tenant: 'Наниматель',
    lessor: 'Арендодатель',
    lessee: 'Арендатор',
    lawyer: 'Юрист',
    'Покупатель': 'Покупатель',
    'Продавец': 'Продавец',
    'Застройщик': 'Застройщик',
    'Агент': 'Агент',
    'Наймодатель': 'Наймодатель',
    'Наниматель': 'Наниматель',
    'Арендодатель': 'Арендодатель',
    'Арендатор': 'Арендатор',
    'Юрист': 'Юрист'
};
