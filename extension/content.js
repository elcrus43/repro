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
            const priceEl = document.querySelector('[data-marker="item-view/price-value"], [itemprop="price"], span[class*="price-value"]');
            if (priceEl) {
                const textPrice = priceEl.getAttribute('content') || priceEl.textContent || '';
                const digits = textPrice.replace(/\D/g, '');
                if (digits) data.price = digits;
            }
        }
        if (!data.price) {
            const priceMatch = bodyText.match(/(\d[\d\s]+)\s*₽/);
            if (priceMatch) data.price = priceMatch[1].replace(/\s/g, '');
        }

        // 2. DESCRIPTION
        const descMeta = document.querySelector('meta[property="og:description"], meta[name="description"]');
        if (descMeta) data.description = descMeta.getAttribute('content');
        const descEl = document.querySelector('[data-marker="item-view/item-description"], div[class*="item-description"]');
        if (descEl && descEl.textContent.trim().length > (data.description || '').length) {
            data.description = descEl.textContent.trim();
        }
        const fullDescMatch = bodyText.match(/Описание\s*\n([\s\S]{50,1500}?)(?=\nРасположение|\nПожаловаться|\nХарактеристики)/i);
        if (fullDescMatch && (!data.description || fullDescMatch[1].trim().length > data.description.length)) {
            data.description = fullDescMatch[1].trim();
        }

        // 3. PARSE PARAMS (from structured DOM or title)
        const paramItems = document.querySelectorAll('[data-marker="item-view/item-params"] li, ul[class*="params-paramsList"] li');
        paramItems.forEach(li => {
            const t = li.textContent;
            // Rooms
            const rMatch = t.match(/Количество комнат:\s*(\d+)/i) || t.match(/Количество комнат:\s*(студия)/i);
            if (rMatch) {
                data.rooms = rMatch[1].toLowerCase() === 'студия' ? 0 : parseInt(rMatch[1]);
            }
            // Area total
            const aTotMatch = t.match(/Общая площадь:\s*([\d.,]+)\s*м²/i);
            if (aTotMatch) data.area_total = aTotMatch[1].replace(',', '.');
            // Area living
            const aLivMatch = t.match(/Жилая площадь:\s*([\d.,]+)\s*м²/i);
            if (aLivMatch) data.area_living = aLivMatch[1].replace(',', '.');
            // Area kitchen
            const aKitMatch = t.match(/Площадь кухни:\s*([\d.,]+)\s*м²/i);
            if (aKitMatch) data.area_kitchen = aKitMatch[1].replace(',', '.');
            // Floor
            const flMatch = t.match(/Этаж:\s*(\d+)\s*из\s*(\d+)/i);
            if (flMatch) {
                data.floor = flMatch[1];
                data.floors_total = flMatch[2];
            }
            // Year built
            const yrMatch = t.match(/Год постройки:\s*(\d{4})/i);
            if (yrMatch) data.year_built = yrMatch[1];
        });

        // Fallback for parameters from title
        const titleStr = document.title;
        if (data.rooms === undefined) {
            const roomsMatch = titleStr.match(/(\d+)-(?:к|комн)/i);
            if (roomsMatch) data.rooms = parseInt(roomsMatch[1]);
            if (/студия/i.test(titleStr)) data.rooms = 0;
        }
        if (!data.area_total) {
            const areaMatch = titleStr.match(/([\d.,]+)\s*м²/);
            if (areaMatch) data.area_total = areaMatch[1].replace(',', '.');
        }
        if (!data.floor) {
            const floorMatch = titleStr.match(/(\d+)\s*\/\s*(\d+)\s*эт/);
            if (floorMatch) {
                data.floor = floorMatch[1];
                data.floors_total = floorMatch[2];
            }
        }

        // 4. ADDRESS / JSON-LD / IMAGES
        const extractedImages = [];
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) extractedImages.push(ogImage);

        // Try DOM images from gallery
        const galleryImgs = document.querySelectorAll('[data-marker="item-view/gallery"] img, [data-marker="image-frame/image-wrapper"] img');
        galleryImgs.forEach(img => {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')?.[0];
            if (src && src.startsWith('http')) extractedImages.push(src);
        });

        const ldJsons = document.querySelectorAll('script[type="application/ld+json"]');
        ldJsons.forEach(script => {
            try {
                const json = JSON.parse(script.textContent);
                JSON.stringify(json, (key, value) => {
                    if (key === 'price' && !data.price) data.price = String(value);
                    if ((key === 'addressLocality' || key === 'addressRegion') && value && !data.city) data.city = value;
                    if (key === 'streetAddress' && value && !data.address) data.address = value;
                    if (key === 'description' && value && value.length > (data.description || '').length) data.description = value;
                    if (key === 'image' || key === 'photos') {
                        if (typeof value === 'string' && value.startsWith('http')) extractedImages.push(value);
                        else if (Array.isArray(value)) {
                            value.forEach(v => {
                                if (typeof v === 'string' && v.startsWith('http')) extractedImages.push(v);
                                else if (v && typeof v === 'object' && typeof v.url === 'string') extractedImages.push(v.url);
                            });
                        }
                    }
                    return value;
                });
            } catch (e) {}
        });

        // DOM Address fallback
        const addrEl = document.querySelector('[data-marker="item-view/item-address"], [itemprop="address"], span[class*="style-item-address__string"]');
        if (addrEl && addrEl.textContent.trim()) {
            data.address = addrEl.textContent.trim();
        }

        if (extractedImages.length > 0) {
            data.images = [...new Set(extractedImages)];
        }

        if (!data.address) {
            const addressMatch = bodyText.match(/(?:Адрес|Расположение)\s*\n([^\n]+)/i);
            if (addressMatch) data.address = addressMatch[1].trim();
        }

    } catch (e) {
        console.error("Realtor Match Parser Error:", e);
    }
    
    return data;
})();
