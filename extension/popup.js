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
        
        // Open CRM in a new tab. Change this to your Vercel URL if testing on production.
        const crmUrl = 'https://repro-five-sable.vercel.app/properties/new'; // fallback
        const crmTab = await chrome.tabs.create({ url: 'http://localhost:5173/properties/new' });

        // Wait for tab to complete loading to inject postMessage
        chrome.tabs.onUpdated.addListener(function listener(tabId, info, updatedTab) {
            if (tabId === crmTab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener); // clean up
                
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (payload) => {
                        localStorage.setItem('property_import_data', JSON.stringify(payload));
                        window.postMessage({ type: 'PROPERTY_IMPORT_DATA', payload }, '*');
                    },
                    args: [data]
                });
                statusEl.innerHTML = '<span style="color:#16A34A; font-weight:600;">Готово! Данные переданы.</span>';
            }
        });

    } catch (e) {
        statusEl.innerHTML = '<span style="color:#DC2626">Ошибка: ' + e.message + '</span>';
    }
});
