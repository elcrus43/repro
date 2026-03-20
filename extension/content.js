(() => {
    // This script runs in the context of the Avito/CIAN page
    const url = window.location.href;
    const data = {
        source_url: url,
        title: '', price: '', description: '',
        area_total: '', area_living: '', area_kitchen: '',
        rooms: undefined, floor: '', floors_total: '', 
        address: '', city: '', year_built: ''
    };

    try {
        if (url.includes('avito.ru')) {
            const titleEl = document.querySelector('[data-marker="item-view/title-info"]');
            if (titleEl) data.title = titleEl.textContent.trim();
            
            const priceEl = document.querySelector('[data-marker="item-price"]');
            if (priceEl) data.price = priceEl.getAttribute('content') || priceEl.textContent.replace(/\D/g, '');

            const descEl = document.querySelector('[data-marker="item-view/item-description"]');
            if (descEl) data.description = descEl.textContent.trim();

            const addressEl = document.querySelector('[data-marker="item-address/geo-container"]');
            if (addressEl) data.address = addressEl.textContent.replace('Скрывать карту', '').trim();

            const paramsList = document.querySelectorAll('.params-paramsList__item');
            paramsList.forEach(item => {
                const text = item.textContent.trim();
                if (text.includes('Количество комнат:')) {
                    const match = text.match(/\d+/);
                    if (match) data.rooms = parseInt(match[0]);
                    if (text.includes('Студия')) data.rooms = 0;
                }
                if (text.includes('Общая площадь:')) data.area_total = text.replace(/[^0-9.]/g, '');
                if (text.includes('Жилая площадь:')) data.area_living = text.replace(/[^0-9.]/g, '');
                if (text.includes('Площадь кухни:')) data.area_kitchen = text.replace(/[^0-9.]/g, '');
                if (text.includes('Этаж:')) {
                    const match = text.match(/(\d+)\s*из\s*(\d+)/);
                    if (match) {
                        data.floor = match[1];
                        data.floors_total = match[2];
                    }
                }
                if (text.includes('Год постройки:')) data.year_built = text.replace(/[^0-9]/g, '');
            });
        } 
        else if (url.includes('cian.ru')) {
            const titleEl = document.querySelector('h1');
            if (titleEl) data.title = titleEl.textContent.trim();

            const priceEl = document.querySelector('[itemprop="price"]');
            if (priceEl) data.price = priceEl.getAttribute('content') || priceEl.textContent.replace(/\D/g, '');

            const descEl = document.querySelector('[itemprop="description"]');
            if (descEl) data.description = descEl.textContent.trim();

            const addressEls = document.querySelectorAll('[data-name="GeoLabel"]');
            if (addressEls.length > 0) {
                data.address = Array.from(addressEls).map(el => el.textContent.trim()).join(', ');
            }

            const summaryItems = document.querySelectorAll('[data-name="ObjectSummaryDescription"] [data-name="ObjectFact"]');
            summaryItems.forEach(item => {
                const title = item.querySelector('[data-name="ObjectFactTitle"]')?.textContent;
                const value = item.querySelector('[data-name="ObjectFactValue"]')?.textContent;
                if (!title || !value) return;
                
                if (title.includes('Общая')) data.area_total = value.replace(/[^0-9.,]/g, '').replace(',', '.');
                if (title.includes('Жилая')) data.area_living = value.replace(/[^0-9.,]/g, '').replace(',', '.');
                if (title.includes('Кухня')) data.area_kitchen = value.replace(/[^0-9.,]/g, '').replace(',', '.');
                if (title.includes('Этаж')) {
                    const match = value.match(/(\d+)\s*из\s*(\d+)/);
                    if (match) {
                        data.floor = match[1];
                        data.floors_total = match[2];
                    } else if (value.match(/\d+/)) {
                        data.floor = value.match(/\d+/)[0];
                    }
                }
                if (title.includes('Построено')) data.year_built = value.replace(/[^0-9]/g, '');
            });

            if (data.title && data.title.includes('комн')) {
                const match = data.title.match(/(\d+)-комн/);
                if (match) data.rooms = parseInt(match[1]);
            }
            if (data.title && data.title.includes('Студия')) {
                data.rooms = 0;
            }
        }
    } catch (e) {
        console.error("Realtor Match Parser Error:", e);
    }
    
    return data;
})();
