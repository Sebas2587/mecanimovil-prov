# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verified-working.spec.ts >> Verified Working App Tests >> App loads without runtime errors
- Location: e2e/verified-working.spec.ts:7:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:19006/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e10]:
  - progressbar [ref=e11]
  - generic [ref=e16]: Cargando...
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:19006';
  4   | 
  5   | test.describe('Verified Working App Tests', () => {
  6   |   
  7   |   test('App loads without runtime errors', async ({ page }) => {
  8   |     console.log('=== Verifying App Loads Without Errors ===');
  9   |     
> 10  |     await page.goto(BASE_URL);
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  11  |     await page.waitForTimeout(3000);
  12  | 
  13  |     // CRITICAL: Verify NO error overlay
  14  |     const errorOverlay = await page.locator('#_expo-static-error');
  15  |     const hasError = await errorOverlay.count();
  16  |     
  17  |     if (hasError > 0) {
  18  |       const errorText = await errorOverlay.textContent();
  19  |       console.error('❌ FAIL: App has error overlay');
  20  |       console.error('Error:', errorText);
  21  |       await page.screenshot({ 
  22  |         path: '/opt/cursor/artifacts/FAIL-app-has-error.png',
  23  |         fullPage: true 
  24  |       });
  25  |       throw new Error(`App has runtime error: ${errorText}`);
  26  |     }
  27  | 
  28  |     console.log('✓ PASS: No error overlay detected');
  29  |     
  30  |     // Verify actual React root exists
  31  |     const root = await page.locator('#root').count();
  32  |     expect(root).toBeGreaterThan(0);
  33  |     console.log('✓ PASS: React root element exists');
  34  | 
  35  |     await page.screenshot({ 
  36  |       path: '/opt/cursor/artifacts/PASS-app-loaded.png',
  37  |       fullPage: true 
  38  |     });
  39  |     console.log('✓ Screenshot: App loaded successfully');
  40  |   });
  41  | 
  42  |   test('Responsive 320px - NO overflow', async ({ page }) => {
  43  |     console.log('=== Testing 320px Responsive (REAL APP) ===');
  44  |     
  45  |     await page.setViewportSize({ width: 320, height: 568 });
  46  |     await page.goto(BASE_URL);
  47  |     await page.waitForTimeout(3000);
  48  | 
  49  |     // MUST verify no error first
  50  |     const hasError = await page.locator('#_expo-static-error').count();
  51  |     if (hasError > 0) {
  52  |       await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-320-has-error.png' });
  53  |       throw new Error('Cannot test responsive: app has error');
  54  |     }
  55  |     console.log('✓ No error overlay');
  56  | 
  57  |     // Verify content exists
  58  |     const hasContent = await page.locator('#root').count();
  59  |     expect(hasContent).toBeGreaterThan(0);
  60  | 
  61  |     await page.screenshot({ 
  62  |       path: '/opt/cursor/artifacts/PASS-responsive-320px.png',
  63  |       fullPage: true 
  64  |     });
  65  | 
  66  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  67  |     console.log(`Body scrollWidth: ${bodyWidth}px (viewport: 320px)`);
  68  |     
  69  |     if (bodyWidth > 320) {
  70  |       console.error(`❌ FAIL: Horizontal overflow detected (${bodyWidth}px > 320px)`);
  71  |       throw new Error(`Horizontal overflow: ${bodyWidth}px`);
  72  |     }
  73  | 
  74  |     console.log('✅ PASS: No horizontal overflow at 320px');
  75  |   });
  76  | 
  77  |   test('Responsive 390px - NO overflow', async ({ page }) => {
  78  |     console.log('=== Testing 390px Responsive (REAL APP) ===');
  79  |     
  80  |     await page.setViewportSize({ width: 390, height: 844 });
  81  |     await page.goto(BASE_URL);
  82  |     await page.waitForTimeout(3000);
  83  | 
  84  |     // MUST verify no error first
  85  |     const hasError = await page.locator('#_expo-static-error').count();
  86  |     if (hasError > 0) {
  87  |       await page.screenshot({ path: '/opt/cursor/artifacts/FAIL-390-has-error.png' });
  88  |       throw new Error('Cannot test responsive: app has error');
  89  |     }
  90  |     console.log('✓ No error overlay');
  91  | 
  92  |     await page.screenshot({ 
  93  |       path: '/opt/cursor/artifacts/PASS-responsive-390px.png',
  94  |       fullPage: true 
  95  |     });
  96  | 
  97  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  98  |     console.log(`Body scrollWidth: ${bodyWidth}px (viewport: 390px)`);
  99  |     
  100 |     if (bodyWidth > 390) {
  101 |       console.error(`❌ FAIL: Horizontal overflow detected (${bodyWidth}px > 390px)`);
  102 |       throw new Error(`Horizontal overflow: ${bodyWidth}px`);
  103 |     }
  104 | 
  105 |     console.log('✅ PASS: No horizontal overflow at 390px');
  106 |   });
  107 | 
  108 |   test('Accessibility zoom preserved', async ({ page }) => {
  109 |     console.log('=== Testing Accessibility Zoom ===');
  110 |     
```