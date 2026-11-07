import { test, expect } from '@playwright/test';
import { loadFixtureManifest } from './fixtureManifest';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8010';

test('Checklist button must show', async ({ page, context, request }) => {
  test.setTimeout(180000);
  console.log('=== CHECKLIST BUTTON TEST ===\n');

  const consoleLogs: string[] = [];
  const apiCalls: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`BROWSER: ${text}`);
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      const call = `${response.request().method()} ${url.replace(API_URL, '')} → ${status}`;
      apiCalls.push(call);
      console.log(`API: ${call}`);
    }
  });

  page.on('pageerror', err => { throw new Error(`Page error: ${err.message}`); });

  const manifest = loadFixtureManifest();
  const ORDER_ID = manifest.order_checklist.id;
  const INSTANCE_ID = manifest.order_checklist.instance_id;
  const SELECT_ITEM = manifest.order_checklist.select_item_template_id;
  const SELECT_LABEL = manifest.select_label;
  const auth = await (await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: manifest.mechanic_checklist.email, password: 'test123' }
  })).json();
  
  console.log(`✓ Mechanic logged in`);
  await page.setViewportSize({ width: 390, height: 844 });

  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: `${API_URL}/api` });

  await page.goto(`${BASE_URL}/orden-detalle/${ORDER_ID}`);
  await page.waitForTimeout(8000);

  // Verify no error overlay or console warnings
  const expoError = await page.locator('#_expo-static-error').count();
  expect(expoError, 'No Expo error overlay').toBe(0);

  // Scroll to bottom to ensure CTA is visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-CTA-TEST.png', fullPage: true });

  // Look for checklist button by testID
  const checklistBtn = page.getByTestId('checklist-cta-button');
  const isVisible = await checklistBtn.isVisible().catch(() => false);
  
  console.log(`\nChecklist CTA visible: ${isVisible ? 'YES' : 'NO'}`);
  
  if (!isVisible) {
    console.log('\n❌ FAIL: Checklist CTA not visible!');
    throw new Error('Checklist CTA not found - check CHECKLIST-CTA-TEST.png');
  }

  console.log('✅ CTA found, clicking...');
  await checklistBtn.click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-EDITOR-OPENED.png', fullPage: true });
  console.log('✅ Checklist editor opened');

  // Find the checklist item row - try multiple approaches
  console.log('Attempting to find and click checklist item...');
  
  // Approach 1: Find row with both title and OBLIGATORIO badge
  let itemRow = page.locator('div').filter({ hasText: new RegExp(`^${SELECT_LABEL}`) }).filter({ has: page.locator('text=OBLIGATORIO') });
  let rowCount = await itemRow.count();
  console.log(`Approach 1 (title + badge): found ${rowCount} elements`);
  
  // Approach 2: Try chevron icon parent
  if (rowCount === 0) {
    itemRow = page.getByText(SELECT_LABEL, { exact: true }).locator('xpath=ancestor::div[contains(@style, "cursor")]').first();
    rowCount = await itemRow.count();
    console.log(`Approach 2 (cursor style parent): found ${rowCount} elements`);
  }
  
  // Approach 3: Simplest - just the title text's grandparent div
  if (rowCount === 0) {
    itemRow = page.getByText(SELECT_LABEL, { exact: true }).locator('xpath=../..').first();
    rowCount = await itemRow.count();
    console.log(`Approach 3 (grandparent): found ${rowCount} elements`);
  }
  
  await itemRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const urlBefore = page.url();
  console.log(`URL before click: ${urlBefore}`);
  
  // Force click to bypass any pointer-events issues
  await itemRow.click({ force: true });
  await page.waitForTimeout(2000);
  
  const urlAfter = page.url();
  console.log(`URL after click: ${urlAfter}`);
  console.log(`Navigation result: ${urlBefore === urlAfter ? 'FAILED - URL did not change' : 'SUCCESS - navigated'}`);
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-ITEM-AFTER-CLICK.png', fullPage: true });
  
  const question = page.getByTestId('checklist-item-question');
  await expect(question).toHaveText(SELECT_LABEL);

  // Select "bajo" option (observable change from any previous state)
  const bajoOption = page.getByTestId('checklist-option-bajo');
  await bajoOption.waitFor({ timeout: 5000 });
  await bajoOption.click();
  await page.waitForTimeout(1000);
  
  console.log('✅ Selected "bajo" option');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-ITEM-SELECTED-BAJO.png', fullPage: true });

  // Click save button (could be "Guardar y continuar" or "Actualizar y continuar" depending on state)
  const saveButton = page.getByRole('button', { name: /guardar|actualizar|save|update/i });
  await saveButton.waitFor({ timeout: 5000 });
  
  // Capture API POST or PATCH request (POST for new, PATCH for update)
  const savePromise = page.waitForResponse(resp => {
    const url = resp.url();
    const method = resp.request().method();
    return url.includes('/api/checklists/responses/') && (method === 'POST' || method === 'PATCH');
  }, { timeout: 10000 });
  
  await saveButton.click();
  const saveResponse = await savePromise;
  const saveStatus = saveResponse.status();
  const saveMethod = saveResponse.request().method();
  const saveData = await saveResponse.json();
  
  console.log(`✅ Save API: ${saveMethod} /api/checklists/responses/${saveMethod === 'PATCH' ? saveData.id + '/' : ''} → ${saveStatus}`);
  console.log(`Response ID: ${saveData.id}, seleccion: ${saveData.respuesta_seleccion}`);
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-SAVE-MODAL.png', fullPage: true });

  // Dismiss success modal (look specifically for OK button, not the save button)
  const okButton = page.getByRole('button', { name: /^ok$/i });
  await okButton.waitFor({ timeout: 5000 });
  await okButton.click();
  await page.waitForTimeout(1000);
  
  console.log('✅ Dismissed modal');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-AFTER-SAVE.png', fullPage: true });

  // Verify via GET API that value persisted
  const getResponse = await page.request.get(`${API_URL}/api/checklists/instances/?orden_id=${ORDER_ID}`, {
    headers: { 'Authorization': `Token ${auth.token}` }
  });
  const getData = await getResponse.json();
  const orderInstance = getData.results.find((row: { orden?: number | null }) => row.orden === ORDER_ID);
  const savedResponses = orderInstance?.respuestas || [];
  const firstItemResponse = savedResponses.find((r: { item_template: number }) => r.item_template === SELECT_ITEM);
  
  console.log(`✅ GET verification: Response ID ${firstItemResponse?.id}, seleccion="${firstItemResponse?.respuesta_seleccion}"`);
  
  if (firstItemResponse?.respuesta_seleccion !== 'bajo') {
    throw new Error(`GET shows wrong value: expected "bajo", got "${firstItemResponse?.respuesta_seleccion}"`);
  }
  
  // Navigate back and verify UI shows persisted value
  await page.goto(`${BASE_URL}/orden-detalle/${ORDER_ID}`);
  await page.waitForTimeout(3000);
  console.log('✅ Reloaded order detail page');
  
  // Open checklist again
  const checklistBtnAgain = page.getByTestId('checklist-cta-button');
  await checklistBtnAgain.click();
  await page.waitForTimeout(3000);
  
  // Click first item to open detail
  const firstItemAgain = page.locator('div').filter({ hasText: new RegExp(`^${SELECT_LABEL}`) }).first();
  await firstItemAgain.click({ force: true });
  await page.waitForTimeout(2000);
  
  console.log('✅ Reopened item detail');
  await expect(page.getByTestId('checklist-item-question')).toHaveText(SELECT_LABEL);
  const bajoSelected = page.getByTestId('checklist-option-bajo');
  await expect(bajoSelected).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('checklist-option-bueno')).toHaveAttribute('aria-selected', 'false');
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-VALUE-PERSISTED.png', fullPage: true });
  console.log('✅✅✅ MILESTONE 1: saved value is the selected option after reload');

  // Item detail is a route; the checklist list is local state on the order
  // screen, so returning lands on the order and the list must be reopened.
  await page.goBack();
  await page.waitForURL(/\/orden-detalle\//);
  const pauseButton = page.getByRole('button', { name: 'Pausar checklist' });
  if (!(await pauseButton.isVisible().catch(() => false))) {
    await page.getByTestId('checklist-cta-button').click();
  }
  await expect(pauseButton).toBeVisible();
  const pauseResponse = page.waitForResponse(
    (resp) => resp.url().includes('/pause/') && resp.request().method() === 'POST',
  );
  await pauseButton.click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  expect((await pauseResponse).status()).toBe(200);
  await expect(page.getByText('Checklist pausado')).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-PAUSED.png', fullPage: true });

  const paused = await (await page.request.get(`${API_URL}/api/checklists/instances/${INSTANCE_ID}/`, {
    headers: { Authorization: `Token ${auth.token}` },
  })).json();
  const pausedAnswer = paused.respuestas.find((r: { item_template: number }) => r.item_template === SELECT_ITEM);
  console.log(`PAUSE estado=${paused.estado} response=${pausedAnswer?.id} seleccion=${pausedAnswer?.respuesta_seleccion}`);
  expect(paused.estado).toBe('PAUSADO');
  expect(pausedAnswer?.respuesta_seleccion).toBe('bajo');

  await page.getByRole('button', { name: 'Continuar checklist' }).click();
  await expect(page.getByRole('button', { name: 'Pausar checklist' })).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-RESUMED.png', fullPage: true });

  const resumed = await (await page.request.get(`${API_URL}/api/checklists/instances/${INSTANCE_ID}/`, {
    headers: { Authorization: `Token ${auth.token}` },
  })).json();
  const resumedAnswer = resumed.respuestas.find((r: { item_template: number }) => r.item_template === SELECT_ITEM);
  console.log(`RESUME estado=${resumed.estado} response=${resumedAnswer?.id} seleccion=${resumedAnswer?.respuesta_seleccion}`);
  expect(resumed.estado).toBe('EN_PROGRESO');
  expect(resumedAnswer?.respuesta_seleccion).toBe('bajo');

  const textNodeWarnings = consoleLogs.filter((t) => t.includes('Unexpected text node'));
  expect(textNodeWarnings, textNodeWarnings.join('\n')).toEqual([]);
  console.log('✅✅✅ MILESTONE 2: pause/resume via UI, value still persisted, no text-node warning');
});
