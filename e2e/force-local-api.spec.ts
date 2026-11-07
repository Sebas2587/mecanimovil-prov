import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Force local API and authenticate', async ({ page, request }) => {
  console.log('=== Forcing Local API Configuration ===');

  // Get auth
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();
  console.log(`✓ Got token for user: ${authData.user.username}`);

  // Setup console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API URL') || text.includes('isAuthenticated') || text.includes('ERROR')) {
      console.log(`BROWSER: ${text}`);
    }
  });

  // Load app
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  // FORCE local API configuration by intercepting serverConfig initialization
  await page.evaluate(({apiUrl}) => {
    // Override localStorage BEFORE app initializes
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    
    // Try to override process.env if accessible
    if (typeof process !== 'undefined' && process.env) {
      (process as any).env.EXPO_PUBLIC_API_URL = apiUrl;
      (process as any).env.EXPO_PUBLIC_ENVIRONMENT = 'test';
    }
  }, { apiUrl: `${API_URL}/api` });

  console.log('✓ Forced local API configuration');

  // Now inject auth
  await page.evaluate(({token, user}) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    console.log('AUTH SET:', {
      hasToken: !!localStorage.getItem('authToken'),
      hasUser: !!localStorage.getItem('userData')
    });
  }, { token: authData.token, user: authData.user });

  console.log('✓ Auth injected');

  // Reload
  await page.reload();
  await page.waitForTimeout(4000);

  // Check what API it's using
  const apiCheck = await page.evaluate(() => {
    const logs: string[] = [];
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    logs.push(`authToken exists: ${!!authToken}`);
    logs.push(`userData exists: ${!!userData}`);
    return logs;
  });
  console.log('Storage check:', apiCheck);

  await page.screenshot({ path: '/opt/cursor/artifacts/FORCE-1-after-reload.png', fullPage: true });

  // Try direct API call from browser context
  console.log('\\nTrying to fetch order directly via fetch...');
  const fetchResult = await page.evaluate(async ({apiUrl, token}) => {
    try {
      const response = await fetch(`${apiUrl}/ordenes/proveedor-ordenes/1/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        data: data,
        url: response.url
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      };
    }
  }, { apiUrl: API_URL, token: authData.token });

  console.log('Direct fetch result:', {
    ok: fetchResult.ok,
    status: fetchResult.status,
    url: fetchResult.url,
    hasData: !!fetchResult.data
  });

  if (fetchResult.ok && fetchResult.data) {
    console.log(`✅ Order fetched successfully: #${fetchResult.data.id}, estado: ${fetchResult.data.estado}`);
    console.log(`   Cliente: ${fetchResult.data.cliente_detail?.nombre || 'N/A'}`);
    console.log(`   Mecánico: ${fetchResult.data.mecanico_asignado?.nombre || 'No asignado'}`);
  }

  // Now navigate to order detail
  console.log('\\nNavigating to order detail page...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(4000);

  const finalText = await page.textContent('body');
  const hasError = finalText?.toLowerCase().includes('error');
  const hasOrder = finalText?.toLowerCase().includes('orden');
  
  console.log(`\\nPage content check: hasError=${hasError}, hasOrder=${hasOrder}`);

  await page.screenshot({ 
    path: '/opt/cursor/artifacts/FORCE-2-order-page-FINAL.png',
    fullPage: true 
  });

  console.log('\\n✅ Test complete - check FORCE screenshots');
});
