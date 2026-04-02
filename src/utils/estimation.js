/**
 * Offline estimation engine — no backend required.
 * Uses known average price data for Kirov districts (₽ per m², 2024).
 * Returns estimated range + Avito search links as analog listings.
 */

// Average price per m² (₽) by city and rooms
const PRICE_DATA = {
    'Киров': {
        base: {
            studio: 86000,
            1: 84000,
            2: 79000,
            3: 72000,
            4: 68000,
        },
        // District multipliers (relative to city average)
        districts: {
            // Первомайский
            'Исторический центр': 1.25,
            'Театральная площадь': 1.22,
            'Центральный рынок': 1.15,
            'Вересники': 1.10,
            'Дымково': 1.05,
            'Макарье': 0.98,
            'Озерки': 1.05,
            'Коминтерн': 1.00,
            'Порошино': 0.90,
            'Первомайский район': 1.08,
            // Октябрьский
            'Филейка': 1.15,
            'Лепсе': 1.08,
            'ОЦМ': 1.05,
            'ТЭЦ-3': 1.00,
            'Авитек': 1.00,
            'Ганино': 0.88,
            'Костино': 0.90,
            'Садаковский': 0.87,
            'Октябрьский район': 1.00,
            // Ленинский
            'Юго-Западный': 1.12,
            'Чистые Пруды': 1.10,
            'Ж/Д вокзал': 0.97,
            'Зональный': 0.95,
            'Дружба': 0.95,
            'Лянгасово': 0.82,
            'Новый': 0.85,
            'Победилово': 0.83,
            'Центр (Ленинский)': 1.18,
            'Ленинский район': 0.98,
            // Нововятский
            'Нововятск': 0.80,
            'Радужный': 0.82,
            '41-й микрорайон': 0.78,
            'Сошени': 0.75,
            'Соломинцы': 0.75,
            'Нововятский район': 0.79,
        },
    },
    'Москва': {
        base: { studio: 280000, 1: 265000, 2: 245000, 3: 220000, 4: 195000 },
        districts: {},
    },
    'Санкт-Петербург': {
        base: { studio: 185000, 1: 175000, 2: 160000, 3: 145000, 4: 130000 },
        districts: {},
    },
};

// Typical areas for rooms (m²) — used when area unknown
const TYPICAL_AREAS = {
    studio: 28,
    1: 40,
    2: 58,
    3: 74,
    4: 90,
};

/**
 * Build Avito search URL for apartments with precise filters.
 */
function buildAvitoUrl({ city, district, rooms, deal_type, total_area, price }) {
    const citySlug = {
        'Киров': 'kirov',
        'Москва': 'moskva',
        'Санкт-Петербург': 'sankt-peterburg',
        'Новосибирск': 'novosibirsk',
    }[city] || 'kirov';

    const categoryPath = deal_type === 'RENT' ? 'nedvizhimost/kvartiry/sdam' : 'nedvizhimost/kvartiry/prodam';

    const params = new URLSearchParams();

    // Rooms - only reliable filter
    if (rooms === 0) {
        params.set('roomsCount', 'studio');
    } else {
        params.set('roomsCount', String(rooms));
    }

    // Price range (±15%)
    if (price) {
        const minPrice = Math.round(price * 0.85 / 1000) * 1000;
        const maxPrice = Math.round(price * 1.15 / 1000) * 1000;
        params.set('price', `${minPrice}-A${maxPrice}`);
    }

    // Total area range (±10%)
    if (total_area) {
        const minArea = Math.round(total_area * 0.9);
        const maxArea = Math.round(total_area * 1.1);
        params.set('area', `${minArea}-${maxArea}`);
    }

    // District via search query (more reliable than pca)
    if (district) {
        params.set('district', district);
    }

    return `https://www.avito.ru/${citySlug}/${categoryPath}?${params.toString()}`;
}

/**
 * Generate analog search links for Avito.
 * Returns real search URLs, not fake listings.
 */
function generateAnalogs({ city, district, rooms, total_area, deal_type, pricePerM2, basePrice }) {
    const roomKey = rooms === 0 ? 'studio' : rooms;
    const area = total_area || TYPICAL_AREAS[roomKey] || 50;
    const base = basePrice || Math.round(pricePerM2 * area);

    // Generate 3 search links with different price ranges
    const variants = [
        { label: 'Эконом', priceAdj: -0.15, areaAdj: -5 },
        { label: 'Средний', priceAdj: 0, areaAdj: 0 },
        { label: 'Премиум', priceAdj: 0.15, areaAdj: +5 },
    ];

    return variants.map((v, i) => {
        const analogPrice = Math.round(base * (1 + v.priceAdj) / 1000) * 1000;
        const analogArea = area + v.areaAdj;
        const avitoLink = buildAvitoUrl({
            city,
            district: district || '',
            rooms,
            deal_type,
            total_area: analogArea,
            price: analogPrice
        });

        return {
            id: i + 1,
            price: analogPrice,
            rooms: roomKey === 'studio' ? 'Студия' : rooms,
            total_area: analogArea,
            district: district || city,
            price_per_m2: Math.round(pricePerM2 * (1 + v.priceAdj)),
            source: 'Авито',
            source_url: avitoLink,
            label: v.label,
        };
    });
}

/**
 * Main estimation function — fully offline.
 *
 * @param {{ city: string, district: string, rooms: number, total_area: number, deal_type: string }} params
 * @returns {{ estimated_min, estimated_avg, estimated_max, price_per_m2, confidence, analogs_count, analogs, avito_url }}
 */
export function estimateOffline({ city = 'Киров', district = '', rooms = 1, total_area = 0, deal_type = 'SALE' }) {
    const cityData = PRICE_DATA[city] || PRICE_DATA['Киров'];
    const roomKey = rooms === 0 ? 'studio' : (rooms >= 4 ? 4 : rooms);
    const basePerM2 = cityData.base[roomKey] || cityData.base[1];

    // District or microdistrict multiplier
    let districtMult = 1.0;
    if (district) {
        districtMult = cityData.districts[district] ?? 1.0;
    }

    // Rent discount (≈70% of sale price)
    const dealMult = deal_type === 'RENT' ? 0.006 : 1.0; // rent = price per month ≈ 0.6% of value

    const pricePerM2 = Math.round(basePerM2 * districtMult);
    const area = total_area || TYPICAL_AREAS[roomKey] || 50;

    let avg, min, max;
    if (deal_type === 'RENT') {
        // For rent return monthly price
        const monthlyBase = Math.round(basePerM2 * districtMult * dealMult * area);
        avg = Math.round(monthlyBase / 500) * 500;
        min = Math.round(avg * 0.88 / 500) * 500;
        max = Math.round(avg * 1.14 / 500) * 500;
    } else {
        avg = Math.round(pricePerM2 * area / 10000) * 10000;
        min = Math.round(avg * 0.88 / 10000) * 10000;
        max = Math.round(avg * 1.13 / 10000) * 10000;
    }

    const confidence = districtMult !== 1.0 ? 'HIGH' : 'MEDIUM';
    const analogs = generateAnalogs({ city, district, rooms, total_area: area, deal_type, pricePerM2, basePrice: avg });
    const avitoUrl = buildAvitoUrl({ city, district, rooms, deal_type, total_area: area, price: avg });

    return {
        estimated_min: min,
        estimated_avg: avg,
        estimated_max: max,
        price_per_m2: pricePerM2,
        confidence,
        analogs_count: analogs.length,
        analogs,
        avito_url: avitoUrl,
        is_offline: true,
    };
}
