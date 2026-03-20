document.getElementById('importBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = 'Подготовка...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('avito.ru') && !tab.url.includes('cian.ru')) {
        statusEl.innerHTML = '<span style="color:#DC2626; font-weight:600;">Это не Авито и не ЦИАН!</span>';
        return;
    }

    try {
        statusEl.innerHTML = 'Сбор данных страницы...';
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        const data = results[0].result;
        if (!data) {
            statusEl.innerHTML = '<span style="color:#DC2626">Не удалось собрать данные.</span>';
            return;
        }

        statusEl.innerHTML = 'Открываем CRM...';
        
        // Encode data into base64 to pass securely via URL hash
        const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        const urlWithData = 'http://localhost:5173/properties/new#import=' + encodedData;
        
        // Open CRM in a new tab
        await chrome.tabs.create({ url: urlWithData });
        
        statusEl.innerHTML = '<span style="color:#16A34A; font-weight:600;">Готово! Данные переданы.</span>';

    } catch (e) {
        statusEl.innerHTML = '<span style="color:#DC2626">Ошибка: ' + e.message + '</span>';
    }
});
