import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';
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

  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'No Expo error overlay').toBe(0);

  await page.screenshot({ path: '/opt/cursor/artifacts/BTN-TEST-page.png', fullPage: true });

  // Look for checklist button
  const checklistBtn = page.locator('text=/checklist|revisión/i');
  const btnCount = await checklistBtn.count();
  
  console.log(`\nChecklist button found: ${btnCount > 0 ? 'YES' : 'NO'}`);
  
  if (btnCount === 0) {
    console.log('\n❌ FAIL: No checklist button found!');
    console.log('\nRelevant console logs:');
    consoleLogs.filter(log => 
      log.includes('checklist') || log.includes('Checklist') || log.includes('disponible')
    ).forEach(log => console.log(`  ${log}`));
    
    throw new Error('Checklist button not found - check BTN-TEST-page.png');
  }

  console.log('✅ Button found, clicking...');
  await checklistBtn.first().click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/BTN-TEST-clicked.png', fullPage: true });
  console.log('✅ Test complete');
});
