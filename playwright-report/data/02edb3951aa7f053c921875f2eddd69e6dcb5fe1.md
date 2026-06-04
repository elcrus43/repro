# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug_console.spec.js >> capture browser logs and errors after login
- Location: e2e\debug_console.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
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
          - generic [ref=e29]:
            - generic [ref=e30]: "1"
            - generic [ref=e31]: Клиенты
        - generic [ref=e32] [cursor=pointer]:
          - generic [ref=e33]:
            - img [ref=e35]
            - img [ref=e38]
          - generic [ref=e41]:
            - generic [ref=e42]: "0"
            - generic [ref=e43]: Объекты
        - generic [ref=e44] [cursor=pointer]:
          - generic [ref=e45]:
            - img [ref=e47]
            - img [ref=e50]
          - generic [ref=e53]:
            - generic [ref=e54]: "0"
            - generic [ref=e55]: Запросы
        - generic [ref=e56] [cursor=pointer]:
          - generic [ref=e57]:
            - img [ref=e59]
            - img [ref=e64]
          - generic [ref=e67]:
            - generic [ref=e68]: "0"
            - generic [ref=e69]: Совпадения
      - generic [ref=e70]:
        - generic [ref=e71]:
          - generic [ref=e72]: Эффективность
          - img [ref=e73]
        - generic [ref=e77]:
          - generic [ref=e78]:
            - generic [ref=e79]: Конверсия
            - generic [ref=e80]:
              - text: "0"
              - generic [ref=e81]: "%"
          - generic [ref=e82]:
            - generic [ref=e83]: Цикл сделки
            - generic [ref=e84]:
              - text: —
              - generic [ref=e85]: дн
      - generic [ref=e87]:
        - button "+ Объект" [ref=e88] [cursor=pointer]
        - button "+ Клиент" [ref=e89] [cursor=pointer]
  - navigation [ref=e90]:
    - button "Объекты" [ref=e91] [cursor=pointer]:
      - img [ref=e93]
      - generic [ref=e99]: Объекты
    - button "Клиенты" [ref=e100] [cursor=pointer]:
      - img [ref=e102]
      - generic [ref=e107]: Клиенты
    - button "Совпадения" [ref=e108] [cursor=pointer]:
      - img [ref=e110]
      - generic [ref=e115]: Совпадения
    - button "История" [ref=e116] [cursor=pointer]:
      - img [ref=e118]
      - generic [ref=e122]: История
    - button "Сделки" [ref=e123] [cursor=pointer]:
      - img [ref=e125]
      - generic [ref=e129]: Сделки
    - button "Задачи" [ref=e130] [cursor=pointer]:
      - img [ref=e132]
      - generic [ref=e135]: Задачи
    - button "Профиль" [ref=e136] [cursor=pointer]:
      - img [ref=e138]
      - generic [ref=e142]: Профиль
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
> 35 |   await page.waitForTimeout(15000);
     |              ^ Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
  36 | 
  37 |   // Inspect some DOM elements to see if they are empty
  38 |   const dashboardVisible = await page.locator('.dashboard, .page, .page-content').isVisible();
  39 |   console.log('Dashboard visible:', dashboardVisible);
  40 | });
  41 | 
```