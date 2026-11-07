import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8010';
const ORDER_ID = 1;

test('Checklist button must show', async ({ page, context, request }) => {
  console.log('=== CHECKLIST BUTTON TEST ===\n');

  const consoleLogs: string[] = [];
  const apiCalls: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`BROWSER: ${text}`);
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      const call = `${response.request().method()} ${url.replace(API_URL, '')} → ${status}`;
      apiCalls.push(call);
      console.log(`API: ${call}`);
    }
  });

  page.on('pageerror', err => { throw new Error(`Page error: ${err.message}`); });

  const auth = await (await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'mechanic_test@example.com', password: 'test123' }
  })).json();
  
  console.log(`✓ Mechanic logged in`);

  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: `${API_URL}/api` });

  await page.goto(`${BASE_URL}/orden-detalle/${ORDER_ID}`);
  await page.waitForTimeout(8000);

  // Verify no error overlay or console warnings
  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'No Expo error overlay').toBe(0);

  // Scroll to bottom to ensure CTA is visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-CTA-TEST.png', fullPage: true });

  // Look for checklist button by testID
  const checklistBtn = page.getByTestId('checklist-cta-button');
  const isVisible = await checklistBtn.isVisible().catch(() => false);
  
  console.log(`\nChecklist CTA visible: ${isVisible ? 'YES' : 'NO'}`);
  
  if (!isVisible) {
    console.log('\n❌ FAIL: Checklist CTA not visible!');
    throw new Error('Checklist CTA not found - check CHECKLIST-CTA-TEST.png');
  }

  console.log('✅ CTA found, clicking...');
  await checklistBtn.click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-EDITOR-OPENED.png', fullPage: true });
  console.log('✅ Checklist editor opened');

  // Find and click first checklist item (SELECT type: "Revisar nivel de aceite") - navigates to detail screen
  const firstItem = page.locator('text=Revisar nivel de aceite').first();
  await firstItem.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await firstItem.click();
  
  // Wait for navigation to detail screen
  await page.waitForTimeout(2000);
  console.log('✅ Navigated to item detail screen');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-ITEM-DETAIL.png', fullPage: true });
  
  // Now find and click "bueno" option on detail screen
  const buenoOption = page.locator('text=bueno').first();
  await buenoOption.waitFor({ timeout: 5000 });
  await buenoOption.click();
  await page.waitForTimeout(1000);
  
  console.log('✅ Selected "bueno" option');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-ITEM-FILLED.png', fullPage: true });

  // Go back to checklist list
  const backButton = page.locator('[aria-label*="Volver"], [aria-label*="back"], text=Volver').first();
  await backButton.click();
  await page.waitForTimeout(2000);
  
  console.log('✅ Returned to checklist list');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-LIST-AFTER-FILL.png', fullPage: true });

  // Navigate back to checklist
  await page.goto(`${BASE_URL}/orden-detalle/${ORDER_ID}`);
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  const checklistBtnAgain = page.getByTestId('checklist-cta-button');
  await checklistBtnAgain.click();
  await page.waitForTimeout(3000);
  
  // Verify "bueno" is still selected
  const buenoSelected = page.locator('text=bueno').first();
  const isSelected = await buenoSelected.isVisible();
  
  console.log(`✅ Response persisted: ${isSelected}`);
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-PERSISTED.png', fullPage: true });
  
  if (!isSelected) {
    throw new Error('Checklist response did not persist after reload');
  }
  
  console.log('✅ MILESTONE COMPLETE: Partial save verified');
});
