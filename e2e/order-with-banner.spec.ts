import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Order detail with next-action banner', async ({ page, context, request }) => {
  console.log('=== ORDER WITH NEXT-ACTION BANNER TEST ===\\n');

  // Step 1: Login
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();
  const token = authData.token;
  console.log(`✓ Logged in as: ${authData.user.username}`);

  // Step 2: Accept order #1 (if not already accepted)
  console.log('\\nAccepting order #1...');
  const acceptResponse = await request.post(`${API_URL}/api/ordenes/proveedor-ordenes/1/aceptar/`, {
    headers: { 'Authorization': `Token ${token}` }
  });
  
  if (acceptResponse.ok()) {
    const acceptData = await acceptResponse.json();
    console.log(`✓ Order accepted, new estado: ${acceptData.estado || 'aceptada_por_proveedor'}`);
  } else if (acceptResponse.status() === 400) {
    console.log('ℹ️  Order already accepted or cannot be accepted');
  }

  // Step 3: Setup browser context
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token, user: authData.user, apiUrl: `${API_URL}/api` });

  // Step 4: Load order detail
  console.log('\\nLoading order detail page...');
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  // Step 5: Look for next-action banner
  const nextActionBanner = await page.locator('text=Próximos pasos').count();
  const assignTechButton = await page.locator('text=Asignar Técnico').count();
  const startServiceButton = await page.locator('text=Iniciar Servicio').count();

  console.log(`\\n=== Banner Check ===`);
  console.log(`  - "Próximos pasos" banner: ${nextActionBanner > 0 ? '✓ FOUND' : '✗ not found'}`);
  console.log(`  - "Asignar Técnico" button: ${assignTechButton > 0 ? '✓ FOUND' : '✗ not found'}`);
  console.log(`  - "Iniciar Servicio" button: ${startServiceButton > 0 ? '✓ FOUND' : '✗ not found'}`);

  // Take final screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/ORDER-WITH-BANNER.png',
    fullPage: true 
  });

  if (nextActionBanner > 0) {
    console.log('\\n✅ SUCCESS: Next-action banner visible!');
  } else {
    console.log('\\n⚠️  Banner not visible - check order state or UI conditions');
    const bodyText = await page.textContent('body');
    console.log(`\\nPage contains:`);
    if (bodyText?.includes('pendiente')) console.log('  - "pendiente"');
    if (bodyText?.includes('aceptada')) console.log('  - "aceptada"');
    if (bodyText?.includes('Error')) console.log('  - "Error"');
  }

  console.log('\\n📸 Screenshot saved: ORDER-WITH-BANNER.png');
});
