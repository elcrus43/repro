import { test, expect } from '@playwright/test';

test('capture browser logs and errors after login', async ({ page }) => {
  // Listen for console logs in browser
  page.on('console', msg => {
    console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
  });

  // Listen for unhandled exceptions in browser
  page.on('pageerror', exception => {
    console.log(`[Browser Exception] ${exception.message}`);
  });

  console.log('Navigating to login page...');
  await page.goto('/login');

  // Fill in email and password
  console.log('Filling credentials...');
  await page.fill('input[placeholder="Email"]', 'tshu464122@gmail.com');
  await page.fill('input[placeholder="Пароль"]', 'repro12345');
  
  // Click the submit button
  console.log('Submitting login form...');
  await page.click('button[type="submit"], button:has-text("Войти")');

  // Wait to see if we navigate to dashboard
  console.log('Waiting for navigation to dashboard...');
  await page.waitForURL('**/#/', { timeout: 10000 }).catch(() => {});
  
  // Print current page location
  console.log('Current URL is:', page.url());

  // Let the app run for 15 seconds to capture background operations
  console.log('Holding session open for 15 seconds to monitor background errors...');
  await page.waitForTimeout(15000);

  // Inspect some DOM elements to see if they are empty
  const dashboardVisible = await page.locator('.dashboard, .page, .page-content').isVisible();
  console.log('Dashboard visible:', dashboardVisible);
});
