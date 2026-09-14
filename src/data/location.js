export const CITIES = ['Киров', 'Москва', 'Санкт-Петербург', 'Другой'];

export const KIROV_DISTRICTS = [
    {
        name: 'Ленинский район',
        description: 'Самый густонаселенный, включает Юго-Западный мкр, Чистые Пруды, район ж/д вокзала, Зональный, Дружба, а также посёлки Лянгасово, Новый, Победилово',
        microdistricts: ['Юго-Западный', 'Чистые Пруды', 'Ж/Д вокзал', 'Зональный', 'Дружба', 'Лянгасово', 'Новый', 'Победилово', 'Центр (Ленинский)']
    },
    {
        name: 'Октябрьский район',
        description: 'Северная и северо-западная часть. Филейка, Лепсе, ОЦМ, ТЭЦ-3, Авитек, а также Ганино, Костино, Садаковский',
        microdistricts: ['Филейка', 'Лепсе', 'ОЦМ', 'ТЭЦ-3', 'Авитек', 'Ганино', 'Костино', 'Садаковский']
    },
    {
        name: 'Первомайский район',
        description: 'Исторический центр, Вересники, Дымково, Макарье, Озерки, Коминтерн, Порошино',
        microdistricts: ['Исторический центр', 'Театральная площадь', 'Центральный рынок', 'Вересники', 'Дымково', 'Макарье', 'Озерки', 'Коминтерн', 'Порошино']
    },
    {
        name: 'Нововятский район',
        description: 'Нововятск, Радужный, 41-й микрорайон, Сошени, Соломинцы',
        microdistricts: ['Нововятск', 'Радужный', '41-й микрорайон', 'Сошени', 'Соломинцы']
    }
];

export function getCustomMicrodistricts() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('repro_custom_microdistricts');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCustomMicrodistrict(name, districtName = null) {
    if (!name || typeof name !== 'string') return null;
    const clean = name.trim();
    if (!clean) return null;
    if (typeof window === 'undefined') return clean;
    try {
        const existing = getCustomMicrodistricts();
        const exists = existing.some(m => (typeof m === 'string' ? m : m.name).toLowerCase() === clean.toLowerCase());
        if (!exists) {
            existing.push(districtName ? { name: clean, district: districtName } : clean);
            localStorage.setItem('repro_custom_microdistricts', JSON.stringify(existing));
        }
    } catch (e) {
        console.warn('Failed to save custom microdistrict:', e);
    }
    return clean;
}

export function getAllMicrodistricts(districtName = '', propertiesList = []) {
    let builtIn = [];
    if (districtName) {
        const d = KIROV_DISTRICTS.find(x => 
            x.name.toLowerCase() === districtName.toLowerCase() || 
            x.name.toLowerCase().includes(districtName.toLowerCase()) ||
            districtName.toLowerCase().includes(x.name.toLowerCase())
        );
        builtIn = d ? [...d.microdistricts] : [];
    } else {
        builtIn = KIROV_DISTRICTS.flatMap(d => d.microdistricts);
    }

    const customEntries = getCustomMicrodistricts().map(item => typeof item === 'string' ? item : item.name);

    const fromDb = (propertiesList || [])
        .map(p => p.microdistrict)
        .filter(m => m && typeof m === 'string' && m.trim().length > 0);

    const seen = new Set();
    const result = [];
    for (const m of [...builtIn, ...customEntries, ...fromDb]) {
        if (!m || typeof m !== 'string') continue;
        const trimmed = m.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !seen.has(key)) {
            seen.add(key);
            result.push(trimmed);
        }
    }
    return result;
}
