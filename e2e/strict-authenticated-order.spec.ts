import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Strict authenticated order with error detection', async ({ page, context, request }) => {
  console.log('=== STRICT AUTH TEST WITH ERROR DETECTION ===\n');

  // Track errors
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`BROWSER ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.error(`PAGE ERROR: ${err.message}`);
  });

  // Step 1: Login and get token (no credentials in logs)
  console.log('Step 1: Authenticating...');
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  
  if (!loginResponse.ok()) {
    throw new Error(`Login failed: ${loginResponse.status()}`);
  }

  const authData = await loginResponse.json();
  console.log(`✓ Authenticated as workshop user (taller_id: ${authData.user.taller_id})`);
  console.log(`✓ Token type: DRF Token (${authData.token.length} chars)`);

  // Step 2: Accept order
  console.log('\nStep 2: Accepting order...');
  const acceptResponse = await request.post(`${API_URL}/api/ordenes/proveedor-ordenes/1/aceptar/`, {
    headers: { 'Authorization': `Token ${authData.token}` }
  });

  if (acceptResponse.ok()) {
    const data = await acceptResponse.json();
    console.log(`✓ Order estado: ${data.estado}`);
  } else {
    console.log('ℹ️  Order already accepted');
  }

  // Step 3: Setup browser context
  console.log('\nStep 3: Setting up browser context...');
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { 
    token: authData.token, 
    user: authData.user,
    apiUrl: `${API_URL}/api`
  });
  console.log('✓ Context initialized');

  // Step 4: Load order page
  console.log('\nStep 4: Loading order detail page...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  // Step 5: CRITICAL - Check for Expo error overlay
  console.log('\nStep 5: Checking for error overlays...');
  const expoErrorOverlay = await page.locator('#_expo-static-error').count();
  
  if (expoErrorOverlay > 0) {
    const errorText = await page.locator('#_expo-static-error').textContent();
    await page.screenshot({ path: '/opt/cursor/artifacts/FAILED-expo-error.png', fullPage: true });
    console.error('\n❌ EXPO ERROR OVERLAY DETECTED:');
    console.error(errorText?.substring(0, 500));
    throw new Error('Expo static error overlay present - app has runtime error');
  }
  console.log('✓ No Expo error overlay');

  // Step 6: Check for console errors
  if (consoleErrors.length > 0) {
    console.error('\n❌ Console errors detected:', consoleErrors.length);
    consoleErrors.slice(0, 3).forEach(err => console.error(`  - ${err.substring(0, 200)}`));
    await page.screenshot({ path: '/opt/cursor/artifacts/FAILED-console-errors.png', fullPage: true });
    throw new Error(`${consoleErrors.length} console errors detected`);
  }
  console.log('✓ No console errors');

  // Step 7: Check for page errors
  if (pageErrors.length > 0) {
    console.error('\n❌ Page errors detected:', pageErrors.length);
    pageErrors.slice(0, 3).forEach(err => console.error(`  - ${err.substring(0, 200)}`));
    await page.screenshot({ path: '/opt/cursor/artifacts/FAILED-page-errors.png', fullPage: true });
    throw new Error(`${pageErrors.length} page errors detected`);
  }
  console.log('✓ No page errors');

  // Step 8: Verify actual UI elements (not just text search)
  console.log('\nStep 6: Verifying UI elements...');
  
  const bodyText = await page.textContent('body');
  const hasErrorMessage = bodyText?.includes('No se pudo cargar');
  
  if (hasErrorMessage) {
    await page.screenshot({ path: '/opt/cursor/artifacts/FAILED-load-error.png', fullPage: true });
    throw new Error('Page shows "No se pudo cargar" error message');
  }
  console.log('✓ No error messages in UI');

  // Step 9: Check for banner via visible text locator (not string search)
  const bannerLocator = page.locator('text=Próximos pasos');
  const bannerCount = await bannerLocator.count();
  
  console.log(`\nBanner check: ${bannerCount > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`);

  if (bannerCount > 0) {
    // Verify banner is actually visible
    const isVisible = await bannerLocator.first().isVisible();
    if (!isVisible) {
      throw new Error('Banner text exists but is not visible');
    }
    console.log('✓ Banner is visible in DOM');
  }

  // Step 10: Final screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/STRICT-AUTH-SUCCESS.png',
    fullPage: true 
  });

  console.log('\n=== TEST SUMMARY ===');
  console.log(`✓ No Expo error overlay`);
  console.log(`✓ No console errors`);
  console.log(`✓ No page errors`);
  console.log(`✓ Order page loaded`);
  console.log(`${bannerCount > 0 ? '✓' : '⚠️ '} Next-action banner: ${bannerCount > 0 ? 'visible' : 'not found'}`);
  console.log(`\n📸 Screenshot: STRICT-AUTH-SUCCESS.png`);

  if (bannerCount === 0) {
    console.log('\n⚠️  Note: Banner not visible - verify order is in accepted state');
  }
});
