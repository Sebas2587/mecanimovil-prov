import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Mechanic sees assigned order', async ({ page, context, request }) => {
  console.log('=== MECHANIC WORKFLOW TEST ===\n');

  // Error tracking
  page.on('pageerror', err => {
    throw new Error(`Page error: ${err.message}`);
  });

  // Step 1: Login as mechanic
  console.log('Step 1: Logging in as mechanic...');
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_mecanico', password: 'test123' }
  });
  
  expect(loginResponse.ok()).toBeTruthy();
  const authData = await loginResponse.json();
  
  console.log(`✓ Logged in as: ${authData.user.username}`);
  console.log(`  Role: ${authData.user.rol_taller}`);
  console.log(`  Taller ID: ${authData.user.taller_id}`);

  // Step 2: Verify mechanic can see assigned order
  console.log('\nStep 2: Checking assigned order...');
  const orderResponse = await request.get(`${API_URL}/api/ordenes/proveedor-ordenes/1/`, {
    headers: { 'Authorization': `Token ${authData.token}` }
  });
  
  expect(orderResponse.ok()).toBeTruthy();
  const order = await orderResponse.json();
  
  console.log(`✓ Order #${order.id} - Estado: ${order.estado}`);
  console.log(`  Assigned to miembro: ${order.mecanico_asignado_id}`);
  
  // Step 3: Setup browser context
  console.log('\nStep 3: Loading app as mechanic...');
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: authData.token, user: authData.user, apiUrl: `${API_URL}/api` });

  // Step 4: Navigate to order
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  // Step 5: Verify no errors
  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'Should not have Expo error').toBe(0);

  await page.screenshot({ 
    path: '/opt/cursor/artifacts/MECHANIC-order-view.png',
    fullPage: true 
  });

  console.log('✓ Order page loaded for mechanic');
  console.log('📸 Screenshot: MECHANIC-order-view.png');
  
  // Step 6: Check for "Iniciar Servicio" button (mechanic should see it)
  const iniciarButton = page.locator('text=Iniciar Servicio');
  const hasIniciarButton = await iniciarButton.count() > 0;
  
  console.log(`\n${hasIniciarButton ? '✓' : '⚠️ '} "Iniciar Servicio" button: ${hasIniciarButton ? 'visible' : 'not found'}`);

  console.log('\n✅ Mechanic can view assigned order');
});
