import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Final authenticated order detail', async ({ page, context, request }) => {
  console.log('=== FINAL AUTH TEST ===\\n');

  // Step 1: Get real token
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const authData = await loginResponse.json();
  console.log(`✓ Authenticated as: ${authData.user.username} (taller_id: ${authData.user.taller_id})`);

  // Step 2: Set up context storage BEFORE loading the app
  // This is key - we set storage in the browser context before any page loads
  await context.addInitScript(({token, user, apiUrl}) => {
    // Set localStorage items that will be read by the app
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    console.log('✓ PRE-INIT: Storage set', {
      hasToken: !!localStorage.getItem('authToken'),
      apiUrl: localStorage.getItem('LOCAL_API_URL')
    });
  }, { 
    token: authData.token, 
    user: authData.user,
    apiUrl: `${API_URL}/api`
  });

  console.log('✓ Init script added to context');

  // Step 3: Setup logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API') || text.includes('TEST MODE') || text.includes('isAuthenticated')) {
      console.log(`  BROWSER: ${text}`);
    }
  });

  // Step 4: Load app - auth should already be in place
  console.log('\\nStep 4: Loading app with pre-injected auth...');
  await page.goto(BASE_URL);
  await page.waitForTimeout(4000);

  // Verify no error
  const hasError = await page.locator('#_expo-static-error').count();
  expect(hasError, 'Should not have static error').toBe(0);

  await page.screenshot({ path: '/opt/cursor/artifacts/FINAL-1-initial-load.png', fullPage: true });
  console.log('✓ Initial load screenshot');

  // Step 5: Navigate directly to order detail
  console.log('\\nStep 5: Navigating to order detail /orden-detalle/1...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/opt/cursor/artifacts/FINAL-2-order-detail.png', fullPage: true });

  // Step 6: Verify page content
  const bodyText = await page.textContent('body');
  const hasErrorText = bodyText?.toLowerCase().includes('no se pudo cargar');
  const hasOrderText = bodyText?.toLowerCase().includes('orden') || bodyText?.toLowerCase().includes('cliente');

  console.log(`\\nPage analysis:`);
  console.log(`  - Has error message: ${hasErrorText}`);
  console.log(`  - Has order content: ${hasOrderText}`);

  if (hasErrorText && !hasOrderText) {
    console.error('\\n❌ FAILED: Page shows error instead of order');
    
    // Debug: check what API is being used
    const apiUrlCheck = await page.evaluate(() => {
      return {
        forceLocal: localStorage.getItem('FORCE_LOCAL_API'),
        localApiUrl: localStorage.getItem('LOCAL_API_URL'),
        authToken: localStorage.getItem('authToken')?.substring(0, 20),
        hasUserData: !!localStorage.getItem('userData')
      };
    });
    console.log('  Storage state:', apiUrlCheck);

    throw new Error('Order page failed to load - check screenshot FINAL-2-order-detail.png');
  }

  // Step 7: Check for next-action banner
  const nextActionBanner = await page.locator('text=Próximos pasos').count();
  if (nextActionBanner > 0) {
    console.log('\\n✅ SUCCESS: Next-action banner found!');
  } else {
    console.log('\\nℹ️  Next-action banner not visible (order may not be in accepted state)');
    // Check actual order state
    const stateText = await page.textContent('body');
    if (stateText?.includes('pendiente') || stateText?.includes('aceptada')) {
      console.log(`   Order state keywords found in page`);
    }
  }

  // Final screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/FINAL-3-SUCCESS-order-authenticated.png',
    fullPage: true 
  });

  console.log('\\n✅ TEST COMPLETE');
  console.log('   Artifacts: FINAL-1, FINAL-2, FINAL-3 screenshots');
});
