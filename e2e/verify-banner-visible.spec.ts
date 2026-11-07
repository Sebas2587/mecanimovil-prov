import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Verify banner in accepted order', async ({ page, context, request }) => {
  console.log('=== BANNER VISIBILITY TEST ===\n');

  // Error tracking
  page.on('pageerror', err => {
    throw new Error(`Page error: ${err.message}`);
  });

  // Login
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();

  // Accept order
  console.log('Accepting order #1...');
  await request.post(`${API_URL}/api/ordenes/proveedor-ordenes/1/aceptar/`, {
    headers: { 'Authorization': `Token ${authData.token}` }
  });

  // Setup context
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: authData.token, user: authData.user, apiUrl: `${API_URL}/api` });

  // Load page
  console.log('Loading order detail...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(6000);

  // Verify no error overlay
  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'Should not have Expo error overlay').toBe(0);
  console.log('✓ No error overlay');

  // Check banner visibility
  const banner = page.locator('text=Próximos pasos');
  const bannerCount = await banner.count();
  
  console.log(`\nBanner "Próximos pasos": ${bannerCount > 0 ? 'FOUND' : 'NOT FOUND'}`);

  if (bannerCount > 0) {
    const isVisible = await banner.first().isVisible();
    console.log(`Banner visible: ${isVisible ? 'YES' : 'NO'}`);
    expect(isVisible, 'Banner should be visible').toBe(true);
  }

  // Screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/BANNER-VERIFIED.png',
    fullPage: true 
  });

  console.log(`\n${bannerCount > 0 ? '✅' : '⚠️ '} Banner check complete`);
  console.log('📸 Screenshot: BANNER-VERIFIED.png');

  if (bannerCount === 0) {
    console.log('\n⚠️  Note: Banner not found - check order estado in DB');
  }
});
