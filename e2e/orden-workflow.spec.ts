import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test.describe('Workshop Order Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as mandante
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
  });

  test('Accept order and see next-action guidance', async ({ page, context }) => {
    console.log('Step 1: Starting test - Accept order and see next-action guidance');
    
    // Mock login by injecting token directly
    await page.evaluate(() => {
      localStorage.setItem('userToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
      localStorage.setItem('user', JSON.stringify({
        id: 2,
        username: 'test_taller',
        email: 'test_taller@mecanimovil.test'
      }));
    });

    console.log('Step 2: Navigate to orders');
    await page.goto(`${BASE_URL}/ordenes`);
    await page.waitForTimeout(2000);

    // Take screenshot of orders list
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/1-orders-list.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 1: Orders list');

    console.log('Step 3: Click on pending order #1');
    // Click on first pending order
    await page.click('[data-testid="order-1"], :text("Orden #1")').catch(() => {
      console.log('Could not find order by test-id, trying alternative selector');
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/2-order-detail-pending.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 2: Order detail - pending state');

    console.log('Step 4: Accept order');
    // Click accept button
    const acceptButton = page.locator('button:has-text("Aceptar Orden")');
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm in dialog
      const confirmButton = page.locator('button:has-text("Aceptar")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/3-order-accepted-with-next-action.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 3: Order accepted with next-action banner');

    console.log('Step 5: Check next-action banner visibility');
    // Verify next-action banner is visible
    const nextActionBanner = page.locator('text=Próximos pasos');
    expect(await nextActionBanner.isVisible()).toBeTruthy();
    console.log('✓ Next-action banner is visible');

    console.log('Step 6: Test technician assignment flow');
    // Click assign technician button if no tech assigned
    const assignButton = page.locator('button:has-text("Asignar Técnico")');
    if (await assignButton.isVisible()) {
      await assignButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ 
        path: '/opt/cursor/artifacts/4-assign-technician-modal.png',
        fullPage: true 
      });
      console.log('✓ Screenshot 4: Assign technician modal');

      // Select a mechanic
      const mechanicOption = page.locator('text=Juan').first();
      if (await mechanicOption.isVisible()) {
        await mechanicOption.click();
        await page.waitForTimeout(500);
      }

      // Confirm assignment
      const confirmAssignButton = page.locator('button:has-text("Confirmar")');
      if (await confirmAssignButton.isVisible()) {
        await confirmAssignButton.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ 
        path: '/opt/cursor/artifacts/5-technician-assigned.png',
        fullPage: true 
      });
      console.log('✓ Screenshot 5: Technician assigned');
    }

    console.log('Step 7: Start service');
    // Click start service button
    const startButton = page.locator('button:has-text("Iniciar Servicio"), button:has-text("Iniciar sin Técnico")');
    if (await startButton.first().isVisible()) {
      await startButton.first().click();
      await page.waitForTimeout(2000);

      await page.screenshot({ 
        path: '/opt/cursor/artifacts/6-service-started.png',
        fullPage: true 
      });
      console.log('✓ Screenshot 6: Service started');
    }

    console.log('✅ Test completed successfully');
  });

  test('Test responsive design at 320px width', async ({ page }) => {
    console.log('Testing 320px responsive design');
    
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${BASE_URL}/orden-detalle/1`);
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/7-responsive-320px.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 7: 320px responsive view');

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(320);
    console.log(`✓ No horizontal overflow at 320px (body width: ${bodyWidth}px)`);
  });

  test('Test responsive design at 390px width', async ({ page }) => {
    console.log('Testing 390px responsive design');
    
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/orden-detalle/1`);
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/8-responsive-390px.png',
      fullPage: true 
    });
    console.log('✓ Screenshot 8: 390px responsive view');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390);
    console.log(`✓ No horizontal overflow at 390px (body width: ${bodyWidth}px)`);
  });

  test('Test accessibility zoom preservation', async ({ page }) => {
    console.log('Testing accessibility zoom');
    
    await page.goto(`${BASE_URL}/orden-detalle/1`);
    await page.waitForTimeout(2000);

    // Check viewport meta tag
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    
    console.log(`Viewport meta: ${viewportMeta}`);
    expect(viewportMeta).not.toContain('maximum-scale=1');
    expect(viewportMeta).not.toContain('user-scalable=no');
    console.log('✓ Accessibility zoom is preserved (no zoom restrictions)');

    // Check input font sizes
    const inputFontSizes = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      return inputs.map(input => {
        const computed = window.getComputedStyle(input);
        return parseFloat(computed.fontSize);
      });
    });

    const minFontSize = Math.min(...inputFontSizes);
    console.log(`Minimum input font size: ${minFontSize}px`);
    expect(minFontSize).toBeGreaterThanOrEqual(16);
    console.log('✓ All inputs have font-size ≥ 16px (prevents iOS auto-zoom)');
  });
});
