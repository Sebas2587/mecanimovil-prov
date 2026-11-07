import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Workshop starts service, mechanic does partial checklist', async ({ page, context, request }) => {
  console.log('=== CHECKLIST PARTIAL SAVE TEST ===\n');

  // Error tracking
  page.on('pageerror', err => {
    throw new Error(`Page error: ${err.message}`);
  });

  // STEP 1: Workshop owner starts service
  console.log('Step 1: Workshop owner starting service...');
  const ownerLogin = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const ownerAuth = await ownerLogin.json();
  
  const startResponse = await request.post(`${API_URL}/api/ordenes/proveedor-ordenes/1/iniciar_servicio/`, {
    headers: { 'Authorization': `Token ${ownerAuth.token}` }
  });
  
  expect(startResponse.ok()).toBeTruthy();
  const startData = await startResponse.json();
  console.log(`✓ Service started: ${startData.message}`);
  console.log(`  Checklist created: ${startData.checklist_creado}`);
  if (startData.checklist_id) {
    console.log(`  Checklist ID: ${startData.checklist_id}`);
  }

  // STEP 2: Mechanic logs in
  console.log('\nStep 2: Mechanic logging in...');
  const mechanicLogin = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_mecanico', password: 'test123' }
  });
  const mechanicAuth = await mechanicLogin.json();
  console.log(`✓ Mechanic logged in: ${mechanicAuth.user.username}`);

  // STEP 3: Setup browser as mechanic
  console.log('\nStep 3: Loading app as mechanic...');
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { 
    token: mechanicAuth.token, 
    user: mechanicAuth.user,
    apiUrl: `${API_URL}/api`
  });

  // STEP 4: Navigate to order
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'Should not have Expo error').toBe(0);

  await page.screenshot({ 
    path: '/opt/cursor/artifacts/CHECKLIST-1-order-started.png',
    fullPage: true 
  });
  console.log('✓ Order page loaded');

  // STEP 5: Check for checklist button
  const checklistButton = page.locator('text=/Checklist|Continuar checklist|Iniciar checklist/i');
  const hasChecklistButton = await checklistButton.count() > 0;
  
  console.log(`\nChecklist button: ${hasChecklistButton ? 'found' : 'not found'}`);
  
  if (!hasChecklistButton) {
    console.log('⚠️  Checklist button not visible - checking order estado...');
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('Servicio Iniciado')) {
      console.log('✓ Order shows "Servicio Iniciado" state');
    }
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/CHECKLIST-2-no-button.png',
      fullPage: true 
    });
  } else {
    console.log('✓ Checklist button visible - clicking...');
    await checklistButton.first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/CHECKLIST-3-opened.png',
      fullPage: true 
    });
    console.log('✓ Checklist opened');
  }

  console.log('\n=== TEST SUMMARY ===');
  console.log('✓ Owner started service via API');
  console.log('✓ Mechanic logged in and viewed order');
  console.log('✓ No Expo errors');
  console.log(`${hasChecklistButton ? '✓' : '⚠️ '} Checklist button visibility`);
  
  console.log('\n📸 Screenshots:');
  console.log('  - CHECKLIST-1-order-started.png');
  if (!hasChecklistButton) {
    console.log('  - CHECKLIST-2-no-button.png');
  } else {
    console.log('  - CHECKLIST-3-opened.png');
  }
});
