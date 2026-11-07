import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';

test.describe('Verified Working App Tests', () => {
  
  test('App loads without runtime errors', async ({ page }) => {
    console.log('=== Verifying App Loads Without Errors ===');
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // CRITICAL: Verify NO error overlay
    const errorOverlay = await page.locator('#_expo-static-error');
    const hasError = await errorOverlay.count();
    
    if (hasError > 0) {
      const errorText = await errorOverlay.textContent();
      console.error('❌ FAIL: App has error overlay');
      console.error('Error:', errorText);
      await page.screenshot({ 
        path: '/opt/cursor/artifacts/FAIL-app-has-error.png',
        fullPage: true 
      });
      throw new Error(`App has runtime error: ${errorText}`);
    }

    console.log('✓ PASS: No error overlay detected');
    
    // Verify actual React root exists
    const root = await page.locator('#root').count();
    expect(root).toBeGreaterThan(0);
    console.log('✓ PASS: React root element exists');

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/PASS-app-loaded.png',
      fullPage: true 
    });
    console.log('✓ Screenshot: App loaded successfully');
  });

  test('Responsive 320px - NO overflow', async ({ page }) => {
    console.log('=== Testing 320px Responsive (REAL APP) ===');
    
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // MUST verify no error first
    const hasError = await page.locator('#_expo-static-error').count();
    if (hasError > 0) {
      await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-320-has-error.png' });
      throw new Error('Cannot test responsive: app has error');
    }
    console.log('✓ No error overlay');

    // Verify content exists
    const hasContent = await page.locator('#root').count();
    expect(hasContent).toBeGreaterThan(0);

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/PASS-responsive-320px.png',
      fullPage: true 
    });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`Body scrollWidth: ${bodyWidth}px (viewport: 320px)`);
    
    if (bodyWidth > 320) {
      console.error(`❌ FAIL: Horizontal overflow detected (${bodyWidth}px > 320px)`);
      throw new Error(`Horizontal overflow: ${bodyWidth}px`);
    }

    console.log('✅ PASS: No horizontal overflow at 320px');
  });

  test('Responsive 390px - NO overflow', async ({ page }) => {
    console.log('=== Testing 390px Responsive (REAL APP) ===');
    
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // MUST verify no error first
    const hasError = await page.locator('#_expo-static-error').count();
    if (hasError > 0) {
      await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-390-has-error.png' });
      throw new Error('Cannot test responsive: app has error');
    }
    console.log('✓ No error overlay');

    await page.screenshot({ 
      path: '/opt/cursor/artifacts/PASS-responsive-390px.png',
      fullPage: true 
    });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`Body scrollWidth: ${bodyWidth}px (viewport: 390px)`);
    
    if (bodyWidth > 390) {
      console.error(`❌ FAIL: Horizontal overflow detected (${bodyWidth}px > 390px)`);
      throw new Error(`Horizontal overflow: ${bodyWidth}px`);
    }

    console.log('✅ PASS: No horizontal overflow at 390px');
  });

  test('Accessibility zoom preserved', async ({ page }) => {
    console.log('=== Testing Accessibility Zoom ===');
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    
    console.log(`Viewport meta: ${viewportMeta}`);
    
    // Check for bad restrictions
    const hasMaxScale = viewportMeta?.includes('maximum-scale=1');
    const hasUserScalable = viewportMeta?.includes('user-scalable=no');
    
    if (hasMaxScale || hasUserScalable) {
      console.error('❌ FAIL: Zoom restrictions found');
      throw new Error('Accessibility violation: zoom restricted');
    }

    console.log('✅ PASS: No zoom restrictions (maximum-scale or user-scalable=no)');

    // Check inputs if present (not required on splash screen)
    const inputs = await page.locator('input, textarea').all();
    if (inputs.length > 0) {
      const fontSizes = await Promise.all(
        inputs.map(input => input.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return parseFloat(computed.fontSize);
        }))
      );

      const minFontSize = Math.min(...fontSizes);
      console.log(`Minimum input font size: ${minFontSize}px`);
      
      if (minFontSize < 16) {
        console.error(`❌ FAIL: Input font size too small (${minFontSize}px < 16px)`);
        throw new Error(`Input font size violation: ${minFontSize}px`);
      }
      console.log('✅ PASS: All inputs ≥ 16px');
    } else {
      console.log('ℹ️  No inputs on current screen (splash/login)');
    }
  });
});
