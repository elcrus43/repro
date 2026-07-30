async function getCrmBaseUrl() {
    try {
        // Find if user already has CRM open in any tab
        const tabs = await chrome.tabs.query({});
        const crmTab = tabs.find(t => t.url && (t.url.includes('vercel.app') || t.url.includes('localhost') || t.url.includes('127.0.0.1')));
        if (crmTab) {
            const urlObj = new URL(crmTab.url);
            return `${urlObj.origin}/`;
        }
    } catch (e) {
        console.warn('Could not query active tabs:', e);
    }
    return 'https://realtor-match.vercel.app/';
}

async function runImport(targetRoute) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = 'Подготовка...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || (!tab.url.includes('avito.ru') && !tab.url.includes('cian.ru'))) {
        statusEl.innerHTML = '<span style="color:#DC2626; font-weight:600;">Откройте страницу объявления на Авито или ЦИАН!</span>';
        return;
    }

    try {
        statusEl.innerHTML = 'Сбор данных страницы...';
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        const data = results?.[0]?.result;
        if (!data) {
            statusEl.innerHTML = '<span style="color:#DC2626">Не удалось собрать данные с этой страницы.</span>';
            return;
        }

        statusEl.innerHTML = 'Открываем CRM...';
        
        // Encode data safely into base64 to pass securely via URL query param
        const jsonString = JSON.stringify(data);
        const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
        
        const baseUrl = await getCrmBaseUrl();
        // Use HashRouter compatible path format: `#/route?import=[data]`
        const urlWithData = `${baseUrl}#/${targetRoute}?import=${encodeURIComponent(encodedData)}`;
        
        // Open CRM in a new tab
        await chrome.tabs.create({ url: urlWithData });
        
        statusEl.innerHTML = '<span style="color:#16A34A; font-weight:600;">Готово! Передано в CRM.</span>';

    } catch (e) {
        console.error('Import error:', e);
        statusEl.innerHTML = '<span style="color:#DC2626">Ошибка: ' + (e.message || 'Сбой скрипта') + '</span>';
    }
}

document.getElementById('importPropBtn').addEventListener('click', () => runImport('properties/new'));
document.getElementById('importSelectBtn').addEventListener('click', () => runImport('selection/new'));
