# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orden-workflow.spec.ts >> Workshop Order Workflow >> Accept order and see next-action guidance
- Location: e2e/orden-workflow.spec.ts:13:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=f1e6]:
  - generic [ref=f1e8]:
    - generic [ref=f1e9]:
      - generic [ref=f1e10]:
        - button "Dismiss error" [disabled] [ref=f1e11]
        - button "Minimize errors" [disabled] [ref=f1e14]
      - generic [ref=f1e18]:
        - button "Previous error" [disabled] [ref=f1e19]
        - generic [ref=f1e22]: 1/1
        - button "Next error" [disabled] [ref=f1e23]
    - generic [ref=f1e26]:
      - button "Reload application" [ref=f1e27] [cursor=pointer]
      - button "Copy error" [ref=f1e30] [cursor=pointer]
      - generic [ref=f1e36]: Expo 57.0.0
  - generic [ref=f1e40]:
    - generic [ref=f1e41]:
      - generic [ref=f1e42]: Server Error
      - generic [ref=f1e44]: withOpacity is not defined
    - contentinfo [ref=f1e47]: Build-time errors can only be dismissed by fixing the issue.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:19006';
  4   | const API_URL = 'http://localhost:8000';
  5   | 
  6   | test.describe('Workshop Order Workflow', () => {
  7   |   test.beforeEach(async ({ page }) => {
  8   |     // Login as mandante
  9   |     await page.goto(`${BASE_URL}/login`);
  10  |     await page.waitForTimeout(2000);
  11  |   });
  12  | 
  13  |   test('Accept order and see next-action guidance', async ({ page, context }) => {
  14  |     console.log('Step 1: Starting test - Accept order and see next-action guidance');
  15  |     
  16  |     // Mock login by injecting token directly
  17  |     await page.evaluate(() => {
  18  |       localStorage.setItem('userToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  19  |       localStorage.setItem('user', JSON.stringify({
  20  |         id: 2,
  21  |         username: 'test_taller',
  22  |         email: 'test_taller@mecanimovil.test'
  23  |       }));
  24  |     });
  25  | 
  26  |     console.log('Step 2: Navigate to orders');
  27  |     await page.goto(`${BASE_URL}/ordenes`);
  28  |     await page.waitForTimeout(2000);
  29  | 
  30  |     // Take screenshot of orders list
  31  |     await page.screenshot({ 
  32  |       path: '/opt/cursor/artifacts/1-orders-list.png',
  33  |       fullPage: true 
  34  |     });
  35  |     console.log('✓ Screenshot 1: Orders list');
  36  | 
  37  |     console.log('Step 3: Click on pending order #1');
  38  |     // Click on first pending order
  39  |     await page.click('[data-testid="order-1"], :text("Orden #1")').catch(() => {
  40  |       console.log('Could not find order by test-id, trying alternative selector');
  41  |     });
> 42  |     await page.waitForTimeout(2000);
      |                ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  43  | 
  44  |     await page.screenshot({ 
  45  |       path: '/opt/cursor/artifacts/2-order-detail-pending.png',
  46  |       fullPage: true 
  47  |     });
  48  |     console.log('✓ Screenshot 2: Order detail - pending state');
  49  | 
  50  |     console.log('Step 4: Accept order');
  51  |     // Click accept button
  52  |     const acceptButton = page.locator('button:has-text("Aceptar Orden")');
  53  |     if (await acceptButton.isVisible()) {
  54  |       await acceptButton.click();
  55  |       await page.waitForTimeout(1000);
  56  |       
  57  |       // Confirm in dialog
  58  |       const confirmButton = page.locator('button:has-text("Aceptar")').last();
  59  |       if (await confirmButton.isVisible()) {
  60  |         await confirmButton.click();
  61  |         await page.waitForTimeout(3000);
  62  |       }
  63  |     }
  64  | 
  65  |     await page.screenshot({ 
  66  |       path: '/opt/cursor/artifacts/3-order-accepted-with-next-action.png',
  67  |       fullPage: true 
  68  |     });
  69  |     console.log('✓ Screenshot 3: Order accepted with next-action banner');
  70  | 
  71  |     console.log('Step 5: Check next-action banner visibility');
  72  |     // Verify next-action banner is visible
  73  |     const nextActionBanner = page.locator('text=Próximos pasos');
  74  |     expect(await nextActionBanner.isVisible()).toBeTruthy();
  75  |     console.log('✓ Next-action banner is visible');
  76  | 
  77  |     console.log('Step 6: Test technician assignment flow');
  78  |     // Click assign technician button if no tech assigned
  79  |     const assignButton = page.locator('button:has-text("Asignar Técnico")');
  80  |     if (await assignButton.isVisible()) {
  81  |       await assignButton.click();
  82  |       await page.waitForTimeout(1000);
  83  | 
  84  |       await page.screenshot({ 
  85  |         path: '/opt/cursor/artifacts/4-assign-technician-modal.png',
  86  |         fullPage: true 
  87  |       });
  88  |       console.log('✓ Screenshot 4: Assign technician modal');
  89  | 
  90  |       // Select a mechanic
  91  |       const mechanicOption = page.locator('text=Juan').first();
  92  |       if (await mechanicOption.isVisible()) {
  93  |         await mechanicOption.click();
  94  |         await page.waitForTimeout(500);
  95  |       }
  96  | 
  97  |       // Confirm assignment
  98  |       const confirmAssignButton = page.locator('button:has-text("Confirmar")');
  99  |       if (await confirmAssignButton.isVisible()) {
  100 |         await confirmAssignButton.click();
  101 |         await page.waitForTimeout(2000);
  102 |       }
  103 | 
  104 |       await page.screenshot({ 
  105 |         path: '/opt/cursor/artifacts/5-technician-assigned.png',
  106 |         fullPage: true 
  107 |       });
  108 |       console.log('✓ Screenshot 5: Technician assigned');
  109 |     }
  110 | 
  111 |     console.log('Step 7: Start service');
  112 |     // Click start service button
  113 |     const startButton = page.locator('button:has-text("Iniciar Servicio"), button:has-text("Iniciar sin Técnico")');
  114 |     if (await startButton.first().isVisible()) {
  115 |       await startButton.first().click();
  116 |       await page.waitForTimeout(2000);
  117 | 
  118 |       await page.screenshot({ 
  119 |         path: '/opt/cursor/artifacts/6-service-started.png',
  120 |         fullPage: true 
  121 |       });
  122 |       console.log('✓ Screenshot 6: Service started');
  123 |     }
  124 | 
  125 |     console.log('✅ Test completed successfully');
  126 |   });
  127 | 
  128 |   test('Test responsive design at 320px width', async ({ page }) => {
  129 |     console.log('Testing 320px responsive design');
  130 |     
  131 |     await page.setViewportSize({ width: 320, height: 568 });
  132 |     await page.goto(`${BASE_URL}/orden-detalle/1`);
  133 |     await page.waitForTimeout(2000);
  134 | 
  135 |     await page.screenshot({ 
  136 |       path: '/opt/cursor/artifacts/7-responsive-320px.png',
  137 |       fullPage: true 
  138 |     });
  139 |     console.log('✓ Screenshot 7: 320px responsive view');
  140 | 
  141 |     // Check for horizontal overflow
  142 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
```