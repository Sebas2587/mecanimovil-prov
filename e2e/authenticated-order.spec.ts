import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Authenticated order detail with next-action banner', async ({ page, request }) => {
  console.log('=== Authenticating and navigating to order detail ===');

  // Step 1: Get real auth token from backend
  console.log('Step 1: Logging in via backend API...');
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: {
      username: 'test_taller',
      password: 'test123'
    }
  });

  expect(loginResponse.ok(), `Login failed: ${loginResponse.status()}`).toBeTruthy();
  const authData = await loginResponse.json();
  console.log(`✓ Logged in as: ${authData.user.username}`);
  console.log(`✓ Taller ID: ${authData.user.taller_id}`);
  console.log(`✓ Token: ${authData.token.substring(0, 20)}...`);

  // Step 2: Load app
  console.log('Step 2: Loading app...');
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  // Verify no error overlay
  const hasError = await page.locator('#_expo-static-error').count();
  if (hasError > 0) {
    await page.screenshot({ path: '/opt/cursor/artifacts/ERROR-still-broken.png' });
    throw new Error('App still has runtime error');
  }
  console.log('✓ No error overlay');

  // Step 3: Inject auth using correct storage format
  console.log('Step 3: Injecting auth credentials...');
  await page.evaluate(({token, user, apiUrl}) => {
    // AsyncStorage is used on web (from authStorage.ts)
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    
    // Also set API base URL
    localStorage.setItem('apiBaseURL', apiUrl);
  }, { 
    token: authData.token, 
    user: authData.user,
    apiUrl: API_URL 
  });

  console.log('✓ Auth credentials injected into localStorage');

  // Step 4: Reload to apply auth
  console.log('Step 4: Reloading app with auth...');
  await page.reload();
  await page.waitForTimeout(3000);

  await page.screenshot({ 
    path: '/opt/cursor/artifacts/AUTH-1-after-reload.png',
    fullPage: true 
  });
  console.log('✓ Screenshot after auth reload');

  // Step 5: Navigate to order #1 (pending order from seed data)
  console.log('Step 5: Navigating to order #1...');
  
  // Try direct navigation to order detail
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(3000);

  await page.screenshot({ 
    path: '/opt/cursor/artifacts/AUTH-2-order-detail-nav.png',
    fullPage: true 
  });
  console.log('✓ Screenshot after navigation to order detail');

  // Step 6: Verify we're on order detail page
  console.log('Step 6: Verifying order detail page loaded...');
  
  // Check if page has order content (not error, not login)
  const pageText = await page.textContent('body');
  
  if (pageText?.includes('withOpacity') || pageText?.includes('Error')) {
    console.error('❌ Page shows error');
    await page.screenshot({ path: '/opt/cursor/artifacts/ERROR-on-order-page.png' });
    throw new Error('Order page has error');
  }

  // Log what we see
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Check for order-related content
  const hasOrderContent = pageText?.includes('Orden') || 
                          pageText?.includes('Cliente') || 
                          pageText?.includes('Vehículo');

  if (hasOrderContent) {
    console.log('✓ Order content detected');
  } else {
    console.log('⚠️  No obvious order content - might be login/loading screen');
  }

  // Step 7: Check if next-action banner is present (if order is accepted)
  const nextActionBanner = await page.locator('text=Próximos pasos').count();
  if (nextActionBanner > 0) {
    console.log('✓ Next-action banner found!');
  } else {
    console.log('ℹ️  Next-action banner not visible (order may not be in accepted state)');
  }

  // Step 8: Take final screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/AUTH-3-FINAL-order-detail.png',
    fullPage: true 
  });
  console.log('✓ Final screenshot captured');

  // Step 9: Log network activity to diagnose auth issues
  console.log('\\n=== Checking Auth State ===');
  const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
  const userData = await page.evaluate(() => localStorage.getItem('userData'));
  
  console.log(`Auth token in storage: ${authToken ? 'YES' : 'NO'}`);
  console.log(`User data in storage: ${userData ? 'YES' : 'NO'}`);

  if (userData) {
    const user = JSON.parse(userData);
    console.log(`User in storage: ${user.username}, taller: ${user.taller_id}`);
  }

  console.log('\\n✅ Test completed - check screenshots for actual UI state');
});
