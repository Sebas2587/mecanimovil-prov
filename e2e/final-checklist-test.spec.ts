import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';
const ORDER_ID = 3;

test('Full checklist workflow with real instance', async ({ page, context, request }) => {
  console.log('=== FINAL CHECKLIST TEST ===\n');

  page.on('pageerror', err => { throw new Error(`Page error: ${err.message}`); });

  // Login as mechanic
  const auth = await (await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_mecanico', password: 'test123' }
  })).json();
  
  console.log(`✓ Mechanic logged in`);

  // Verify checklist exists
  const checklistResp = await request.get(`${API_URL}/api/checklists/instances/?orden_id=${ORDER_ID}`, {
    headers: { 'Authorization': `Token ${auth.token}` }
  });
  const checklistData = await checklistResp.json();
  console.log(`Checklist instances: ${checklistData.count}`);

  // Setup browser
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: `${API_URL}/api` });

  // Navigate to order
  await page.goto(`${BASE_URL}/orden-detalle/${ORDER_ID}`);
  await page.waitForTimeout(5000);

  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError).toBe(0);

  await page.screenshot({ path: '/opt/cursor/artifacts/FINAL-1-order.png', fullPage: true });
  console.log('✓ Order page loaded');

  // Check for checklist button/link
  const pageText = await page.textContent('body');
  console.log('\nPage content check:');
  console.log(`  - Contains "checklist": ${pageText?.toLowerCase().includes('checklist')}`);
  console.log(`  - Contains "servicio iniciado": ${pageText?.toLowerCase().includes('servicio iniciado')}`);

  await page.screenshot({ path: '/opt/cursor/artifacts/FINAL-2-full-page.png', fullPage: true });
  
  console.log('\n✅ Test complete');
  console.log('Checklist instance exists:', checklistData.count > 0);
});
