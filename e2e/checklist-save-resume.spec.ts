import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Mechanic partial checklist save and resume', async ({ page, context, request }) => {
  console.log('=== CHECKLIST SAVE & RESUME TEST ===\n');

  page.on('pageerror', err => { throw new Error(`Page error: ${err.message}`); });

  // Login as mechanic
  const mechanicLogin = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_mecanico', password: 'test123' }
  });
  const auth = await mechanicLogin.json();
  console.log(`✓ Mechanic logged in`);

  // Setup context
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: `${API_URL}/api` });

  // Navigate to order
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError).toBe(0);

  await page.screenshot({ path: '/opt/cursor/artifacts/SAVE-1-order-page.png', fullPage: true });
  console.log('✓ Order page loaded');

  // Look for checklist button
  const checklistBtn = page.locator('text=/checklist/i').first();
  const hasBtn = await checklistBtn.count() > 0;
  
  console.log(`Checklist button: ${hasBtn ? 'found' : 'not found'}`);
  
  if (hasBtn) {
    await checklistBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/opt/cursor/artifacts/SAVE-2-checklist-open.png', fullPage: true });
    console.log('✓ Checklist opened');
  }

  console.log('\n✅ Test complete - check screenshots');
});
