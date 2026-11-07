import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Minimal order page - no error overlay', async ({ page, context, request }) => {
  console.log('=== MINIMAL ORDER PAGE TEST ===\n');

  // Track errors strictly
  const errors: string[] = [];
  page.on('pageerror', err => {
    errors.push(err.message);
    console.error(`❌ PAGE ERROR: ${err.message}`);
  });

  // Login
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();
  console.log(`✓ Auth: workshop user taller_id=${authData.user.taller_id}`);

  // Setup context
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: authData.token, user: authData.user, apiUrl: `${API_URL}/api` });

  // Load order page
  console.log('\nLoading /orden-detalle/1...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(6000);

  // CRITICAL: Check for Expo error overlay
  const expoError = await page.locator('#_expo-static-error').count();
  
  if (expoError > 0) {
    const errorText = await page.locator('#_expo-static-error').textContent();
    await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-expo-error.png', fullPage: true });
    console.error('\n❌ EXPO ERROR OVERLAY:');
    console.error(errorText?.substring(0, 300));
    throw new Error('Expo error overlay present');
  }

  console.log('✓ No Expo error overlay');

  // Check for page errors
  if (errors.length > 0) {
    await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-page-errors.png', fullPage: true });
    console.error(`\n❌ ${errors.length} page errors`);
    throw new Error(`Page errors: ${errors[0]}`);
  }

  console.log('✓ No page errors');

  // Check page loaded actual content
  const bodyText = await page.textContent('body');
  const hasError = bodyText?.includes('No se pudo cargar');
  const hasOrder = bodyText?.includes('Orden') || bodyText?.includes('Cliente');

  console.log(`\nPage content: ${hasError ? '❌ error message' : '✓ no error'}, ${hasOrder ? '✓ has order text' : '❌ no order text'}`);

  // Take screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/ORDER-PAGE-CLEAN.png',
    fullPage: true 
  });

  if (hasError) {
    throw new Error('Page shows error message');
  }

  console.log('\n✅ Order page loaded without errors');
  console.log('📸 Screenshot: ORDER-PAGE-CLEAN.png');
});
