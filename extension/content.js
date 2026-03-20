(() => {
    const url = window.location.href;
    const data = {
        source_url: url,
        title: document.title, 
        price: '', description: '',
        area_total: '', area_living: '', area_kitchen: '',
        rooms: undefined, floor: '', floors_total: '', 
        address: '', city: '', year_built: ''
    };

    try {
        const bodyText = document.body.innerText || '';

        // 1. PRICE
        const priceMeta = document.querySelector('meta[property="product:price:amount"], meta[itemprop="price"]');
        if (priceMeta) data.price = priceMeta.getAttribute('content');
        if (!data.price) {
            const priceMatch = bodyText.match(/(\d[\d\s]+)\s*₽/);
            if (priceMatch) data.price = priceMatch[1].replace(/\s/g, '');
        }

        // 2. DESCRIPTION
        const descMeta = document.querySelector('meta[property="og:description"], meta[name="description"]');
        if (descMeta) data.description = descMeta.getAttribute('content');
        const fullDescMatch = bodyText.match(/Описание\s*\n([\s\S]{50,1500}?)(?=\nРасположение|\nПожаловаться|\nХарактеристики)/i);
        if (fullDescMatch) data.description = fullDescMatch[1].trim();

        // 3. PARSE TITLE FOR PARAMS
        const titleStr = document.title;
        // Rooms
        const roomsMatch = titleStr.match(/(\d+)-(?:к|комн)/i);
        if (roomsMatch) data.rooms = parseInt(roomsMatch[1]);
        if (/студия/i.test(titleStr)) data.rooms = 0;
        // Area
        const areaMatch = titleStr.match(/([\d.,]+)\s*м²/);
        if (areaMatch) data.area_total = areaMatch[1].replace(',', '.');
        // Floors
        const floorMatch = titleStr.match(/(\d+)\s*\/\s*(\d+)\s*эт/);
        if (floorMatch) {
            data.floor = floorMatch[1];
            data.floors_total = floorMatch[2];
        }

        // 4. ADDRESS / JSON-LD
        const ldJsons = document.querySelectorAll('script[type="application/ld+json"]');
        ldJsons.forEach(script => {
            try {
                const json = JSON.parse(script.textContent);
                JSON.stringify(json, (key, value) => {
                    if (key === 'price' && !data.price) data.price = String(value);
                    if ((key === 'addressLocality' || key === 'addressRegion') && value) data.city = value;
                    if (key === 'streetAddress' && value) data.address = value;
                    if (key === 'description' && value && value.length > data.description.length) data.description = value;
                    return value;
                });
            } catch (e) {}
        });

        if (!data.address) {
            const addressMatch = bodyText.match(/(?:Адрес|Расположение)\s*\n([^\n]+)/i);
            if (addressMatch) data.address = addressMatch[1].trim();
        }

    } catch (e) {
        console.error("Realtor Match Parser Error:", e);
    }
    
    return data;
})();
