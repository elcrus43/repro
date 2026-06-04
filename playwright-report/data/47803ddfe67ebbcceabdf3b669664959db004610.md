# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug_console.spec.js >> capture browser logs and errors after login
- Location: e2e\debug_console.spec.js:3:1

# Error details

```
Error: locator.isVisible: Error: strict mode violation: locator('.dashboard, .page, .page-content') resolved to 2 elements:
    1) <div class="page fade-in">…</div> aka getByText('Привет, Шумейко! BEGIN EXECUTE query; END; ТШ1Клиенты0Объекты0Запросы0')
    2) <div class="page-content">…</div> aka getByText('Клиенты0Объекты0Запросы0СовпаденияЭффективностьКонверсия0')

Call log:
    - checking visibility of locator('.dashboard, .page, .page-content')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - heading "Привет, Шумейко!" [level=1] [ref=e8]
          - generic [ref=e10]:
            - img [ref=e11]
            - text: BEGIN EXECUTE query; END;
        - generic [ref=e15] [cursor=pointer]: ТШ
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18] [cursor=pointer]:
            - generic [ref=e19]:
              - img [ref=e21]
              - img [ref=e26]
            - generic [ref=e28]:
              - generic [ref=e29]: "1"
              - generic [ref=e30]: Клиенты
          - generic [ref=e31] [cursor=pointer]:
            - generic [ref=e32]:
              - img [ref=e34]
              - img [ref=e37]
            - generic [ref=e39]:
              - generic [ref=e40]: "0"
              - generic [ref=e41]: Объекты
          - generic [ref=e42] [cursor=pointer]:
            - generic [ref=e43]:
              - img [ref=e45]
              - img [ref=e48]
            - generic [ref=e50]:
              - generic [ref=e51]: "0"
              - generic [ref=e52]: Запросы
          - generic [ref=e53] [cursor=pointer]:
            - generic [ref=e54]:
              - img [ref=e56]
              - img [ref=e59]
            - generic [ref=e61]:
              - generic [ref=e62]: "0"
              - generic [ref=e63]: Совпадения
        - generic [ref=e64]:
          - generic [ref=e65]:
            - generic [ref=e66]: Эффективность
            - img [ref=e67]
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: Конверсия
              - generic [ref=e74]:
                - text: "0"
                - generic [ref=e75]: "%"
            - generic [ref=e76]:
              - generic [ref=e77]: Цикл сделки
              - generic [ref=e78]:
                - text: —
                - generic [ref=e79]: дн
        - generic [ref=e81]:
          - button "+ Объект" [ref=e82] [cursor=pointer]
          - button "+ Клиент" [ref=e83] [cursor=pointer]
    - navigation [ref=e84]:
      - button "Объекты" [ref=e85] [cursor=pointer]:
        - img [ref=e87]
        - generic [ref=e91]: Объекты
      - button "Клиенты" [ref=e92] [cursor=pointer]:
        - img [ref=e94]
        - generic [ref=e99]: Клиенты
      - button "Совпадения" [ref=e100] [cursor=pointer]:
        - img [ref=e102]
        - generic [ref=e105]: Совпадения
      - button "История" [ref=e106] [cursor=pointer]:
        - img [ref=e108]
        - generic [ref=e112]: История
      - button "Сделки" [ref=e113] [cursor=pointer]:
        - img [ref=e115]
        - generic [ref=e119]: Сделки
      - button "Задачи" [ref=e120] [cursor=pointer]:
        - img [ref=e122]
        - generic [ref=e125]: Задачи
      - button "Профиль" [ref=e126] [cursor=pointer]:
        - img [ref=e128]
        - generic [ref=e132]: Профиль
  - iframe [ref=e133]:
    
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('capture browser logs and errors after login', async ({ page }) => {
  4  |   // Listen for console logs in browser
  5  |   page.on('console', msg => {
  6  |     console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
  7  |   });
  8  | 
  9  |   // Listen for unhandled exceptions in browser
  10 |   page.on('pageerror', exception => {
  11 |     console.log(`[Browser Exception] ${exception.message}`);
  12 |   });
  13 | 
  14 |   console.log('Navigating to login page...');
  15 |   await page.goto('/login');
  16 | 
  17 |   // Fill in email and password
  18 |   console.log('Filling credentials...');
  19 |   await page.fill('input[placeholder="Email"]', 'tshu464122@gmail.com');
  20 |   await page.fill('input[placeholder="Пароль"]', 'repro12345');
  21 |   
  22 |   // Click the submit button
  23 |   console.log('Submitting login form...');
  24 |   await page.click('button[type="submit"], button:has-text("Войти")');
  25 | 
  26 |   // Wait to see if we navigate to dashboard
  27 |   console.log('Waiting for navigation to dashboard...');
  28 |   await page.waitForURL('**/#/', { timeout: 10000 }).catch(() => {});
  29 |   
  30 |   // Print current page location
  31 |   console.log('Current URL is:', page.url());
  32 | 
  33 |   // Let the app run for 15 seconds to capture background operations
  34 |   console.log('Holding session open for 15 seconds to monitor background errors...');
  35 |   await page.waitForTimeout(15000);
  36 | 
  37 |   // Inspect some DOM elements to see if they are empty
> 38 |   const dashboardVisible = await page.locator('.dashboard, .page, .page-content').isVisible();
     |                                                                                   ^ Error: locator.isVisible: Error: strict mode violation: locator('.dashboard, .page, .page-content') resolved to 2 elements:
  39 |   console.log('Dashboard visible:', dashboardVisible);
  40 | });
  41 | 
```