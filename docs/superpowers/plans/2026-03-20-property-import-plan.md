# Property Import Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension that parses Avito/CIAN and a CRM receiver that auto-fills the property creation form. 

**Architecture:** 
1. The CRM (`PropertyFormPage.jsx`) listens for a `message` event.
2. The Chrome Extension injects a `content.js` script to scrape the DOM.
3. The Extension's popup opens the CRM in a new tab and sends the scraped data via `postMessage`.

**Tech Stack:** React (CRM), Vanilla JS (Extension), HTML/CSS

---

### Task 1: Prepare CRM to Receive Data

**Files:**
- Modify: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\src\pages\Properties\PropertyFormPage.jsx`

- [ ] **Step 1: Add message listener in PropertyFormPage**
Use `useEffect` to listen for `message` events on the `window` object. Validate the origin (can be any for now or strictly our domains) and the message type (`type === 'PROPERTY_IMPORT_DATA'`).
```javascript
useEffect(() => {
    function handleMessage(event) {
        if (event.data?.type === 'PROPERTY_IMPORT_DATA') {
            const data = event.data.payload;
            setForm(prev => ({
                ...prev,
                title: data.title || prev.title,
                price: data.price || prev.price,
                description: data.description || prev.description,
                area_total: data.area_total || prev.area_total,
                rooms: data.rooms || prev.rooms,
                address: data.address || prev.address,
            }));
            alert('Данные успешно импортированы!'); // Visual feedback
        }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
}, [setForm]);
```

- [ ] **Step 2: Commit CRM Changes**
```bash
git add src/pages/Properties/PropertyFormPage.jsx
git commit -m "feat: add support for receiving imported property data via postMessage"
```

---

### Task 2: Build the Chrome Extension

**Files:**
- Create: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\extension\manifest.json`
- Create: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\extension\popup.html`
- Create: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\extension\popup.js`
- Create: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\extension\content.js`

- [ ] **Step 1: Create `manifest.json`**
Configure Manifest V3. Set permissions for `activeTab` and `scripting`. Set host permissions for `*://*.avito.ru/*` and `*://*.cian.ru/*`. Set `action` to `popup.html`.

- [ ] **Step 2: Create `popup.html`**
Simple HTML with a button: `<button id="importBtn">Импортировать в CRM</button>`.

- [ ] **Step 3: Create `popup.js`**
Execute `content.js` on the active tab when `importBtn` is clicked. Get the result (JSON).
Open `https://realtor-match.vercel.app/properties/new` (or localhost for dev). Wait for it to load, then use `chrome.scripting.executeScript` on the NEW tab to trigger `window.postMessage` so the CRM catches it!

- [ ] **Step 4: Create `content.js` (The Scraper)**
Implement `parseAvito` and `parseCian` logic using `document.querySelector`.
- **Avito Example:** Title (`[data-marker="item-view/title-info"]`), Price (`[data-marker="item-price"]`), Description (`[data-marker="item-view/item-description"]`).

- [ ] **Step 5: Verify Extension Locally**
Load `extension/` as an unpacked extension in Chrome. Go to an Avito ad, click the extension icon, click "Импортировать", verify it opens the CRM and populates the fields.

- [ ] **Step 6: Commit Extension**
```bash
git add extension/
git commit -m "feat: initial release of property import chrome extension"
```
