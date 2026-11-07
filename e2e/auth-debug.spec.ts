import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Debug authenticated navigation', async ({ page, request }) => {
  console.log('=== Debugging Auth Navigation ===');

  // Get auth token
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();
  console.log(`✓ Token: ${authData.token.substring(0, 30)}...`);

  // Setup console logging
  page.on('console', msg => console.log(`BROWSER: ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));

  // Load app
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  // Inject auth
  await page.evaluate(({token, user, apiUrl}) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('apiBaseURL', apiUrl);
    console.log('AUTH INJECTED:', { token: token.substring(0, 20), userId: user.id });
  }, { token: authData.token, user: authData.user, apiUrl: API_URL });

  // Reload
  await page.reload();
  await page.waitForTimeout(3000);

  // Check what's on screen
  const bodyText = await page.textContent('body');
  const firstChars = bodyText?.substring(0, 500) || '';
  console.log(`\\nPage content preview:\\n${firstChars}\\n`);

  // Check for error overlay
  const errorOverlay = await page.locator('#_expo-static-error');
  const hasStaticError = await errorOverlay.count();
  if (hasStaticError > 0) {
    const errorText = await errorOverlay.textContent();
    console.error('STATIC ERROR:', errorText);
  }

  await page.screenshot({ path: '/opt/cursor/artifacts/DEBUG-1-after-auth.png', fullPage: true });

  // Try to navigate to order detail
  console.log('\\nNavigating to /orden-detalle/1...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(4000);

  // Get final state
  const finalText = await page.textContent('body');
  const finalPreview = finalText?.substring(0, 500) || '';
  console.log(`\\nOrder page content:\\n${finalPreview}\\n`);

  // Check for specific error indicators
  const hasExpoError = await page.locator('#_expo-static-error').count();
  const hasReactError = finalText?.toLowerCase().includes('error boundary');
  const hasNetworkError = finalText?.toLowerCase().includes('network');
  
  console.log('\\n=== Error Check ===');
  console.log(`Expo static error: ${hasExpoError > 0}`);
  console.log(`React error boundary: ${hasReactError}`);
  console.log(`Network error: ${hasNetworkError}`);

  await page.screenshot({ path: '/opt/cursor/artifacts/DEBUG-2-order-page.png', fullPage: true });

  // Check auth state
  const authCheck = await page.evaluate(() => ({
    authToken: localStorage.getItem('authToken')?.substring(0, 20),
    hasUserData: !!localStorage.getItem('userData'),
    apiBaseURL: localStorage.getItem('apiBaseURL')
  }));
  console.log('\\n=== Auth State ===', authCheck);

  console.log('\\n✅ Debug complete - check screenshots and logs');
});
