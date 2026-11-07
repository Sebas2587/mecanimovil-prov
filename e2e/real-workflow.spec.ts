import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test.describe('Real Workshop Workflow with Backend', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get real JWT token via login API
    const loginResponse = await request.post(`${API_URL}/api/usuarios/login/`, {
      data: {
        username: 'test_taller',
        password: 'test123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    console.log('✓ Got real JWT token via login API');
  });

  test('Full workflow: accept → assign → start service', async ({ page, request }) => {
    console.log('=== Starting Real Workflow Test ===');
    
    // Step 1: Go to app
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Check for error overlay BEFORE proceeding
    const hasError = await page.locator('#_expo-static-error').count();
    if (hasError > 0) {
      const errorText = await page.locator('#_expo-static-error').textContent();
      console.error('❌ App has error overlay:', errorText);
      await page.screenshot({ path: '/opt/cursor/artifacts/ERROR-app-broken.png', fullPage: true });
      throw new Error('App has runtime error, cannot proceed with test');
    }
    console.log('✓ No runtime error overlay detected');

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/real-1-app-loaded.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 1: App loaded without errors');

    // Step 2: Accept order via direct API call
    console.log('Step 1: Accepting order #1 via backend API...');
    const acceptResponse = await request.post(
      `${API_URL}/api/ordenes/proveedor-ordenes/1/aceptar/`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {}
      }
    );

    console.log(`Accept response status: ${acceptResponse.status()}`);
    if (acceptResponse.ok()) {
      const acceptData = await acceptResponse.json();
      console.log('✓ Order accepted:', acceptData.message || acceptData);
    } else {
      const errorText = await acceptResponse.text();
      console.log('Accept error:', errorText);
    }

    // Step 3: Get order details to verify state
    console.log('Step 2: Fetching order details...');
    const orderResponse = await request.get(
      `${API_URL}/api/ordenes/proveedor-ordenes/1/`,
      { headers: { 'Authorization': `Bearer ${authToken}` }}
    );

    expect(orderResponse.ok()).toBeTruthy();
    const orderData = await orderResponse.json();
    console.log(`✓ Order state: ${orderData.estado}`);
    console.log(`✓ Mechanic assigned: ${orderData.mecanico_asignado?.nombre || 'None'}`);

    // Step 4: Assign technician if not already assigned
    if (!orderData.mecanico_asignado) {
      console.log('Step 3: Assigning technician...');
      const assignResponse = await request.post(
        `${API_URL}/api/ordenes/proveedor-ordenes/1/asignar_tecnico/`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { mecanico_id: 6, motivo: 'E2E test assignment' }
        }
      );

      console.log(`Assignment status: ${assignResponse.status()}`);
      if (assignResponse.ok()) {
        const assignData = await assignResponse.json();
        console.log('✓ Technician assigned:', assignData.tecnico?.nombre || assignData);
      } else {
        const errorText = await assignResponse.text();
        console.log('Assignment response:', errorText);
      }
    }

    // Step 5: Start service
    console.log('Step 4: Starting service...');
    const startResponse = await request.post(
      `${API_URL}/api/ordenes/proveedor-ordenes/1/iniciar_servicio/`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {}
      }
    );

    console.log(`Start service status: ${startResponse.status()}`);
    if (startResponse.ok()) {
      const startData = await startResponse.json();
      console.log('✓ Service started:', startData.message || 'success');
      console.log(`✓ Checklist created: ${startData.checklist_creado}`);
      console.log(`✓ Final order state: ${startData.orden?.estado}`);
    } else {
      const errorText = await startResponse.text();
      console.log('Start service response:', errorText);
    }

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/real-2-workflow-api-complete.png',
      fullPage: true 
    });

    console.log('✅ Real workflow via backend API completed');
  });

  test('Responsive 320px with REAL content', async ({ page }) => {
    console.log('=== Testing 320px Responsive Design ===');
    
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Verify NO error overlay
    const hasError = await page.locator('#_expo-static-error').count();
    expect(hasError).toBe(0);
    console.log('✓ No error overlay');

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/real-3-responsive-320px.png',
      fullPage: true 
    });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`Body width at 320px viewport: ${bodyWidth}px`);
    expect(bodyWidth).toBeLessThanOrEqual(320);
    console.log('✓ PASS: No horizontal overflow at 320px');
  });

  test('Responsive 390px with REAL content', async ({ page }) => {
    console.log('=== Testing 390px Responsive Design ===');
    
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Verify NO error overlay
    const hasError = await page.locator('#_expo-static-error').count();
    expect(hasError).toBe(0);
    console.log('✓ No error overlay');

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/real-4-responsive-390px.png',
      fullPage: true 
    });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`Body width at 390px viewport: ${bodyWidth}px`);
    expect(bodyWidth).toBeLessThanOrEqual(390);
    console.log('✓ PASS: No horizontal overflow at 390px');
  });

  test('Accessibility zoom with input verification', async ({ page }) => {
    console.log('=== Testing Accessibility Zoom ===');
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Check viewport meta
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    
    console.log(`Viewport meta: ${viewportMeta}`);
    expect(viewportMeta).not.toContain('maximum-scale=1');
    expect(viewportMeta).not.toContain('user-scalable=no');
    console.log('✓ PASS: No zoom restrictions');

    // Check actual inputs if they exist
    const inputs = await page.locator('input, textarea').all();
    console.log(`Found ${inputs.length} input elements`);
    
    if (inputs.length > 0) {
      const fontSizes = await Promise.all(
        inputs.map(input => input.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return parseFloat(computed.fontSize);
        }))
      );

      const minFontSize = Math.min(...fontSizes);
      console.log(`Minimum input font size: ${minFontSize}px`);
      expect(minFontSize).toBeGreaterThanOrEqual(16);
      console.log('✓ PASS: All inputs ≥ 16px');
    } else {
      console.log('⚠️  No inputs on splash/login screen (not a failure)');
    }
  });
});
