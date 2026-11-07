import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8010';

test('network failure does not mark the checklist answer saved', async ({ page, context, request }) => {
  test.setTimeout(120000);
  const auth = await (await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'mechanic_test@example.com', password: 'test123' },
  })).json();

  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: `${API_URL}/api` });

  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.getByTestId('checklist-cta-button').waitFor({ timeout: 20000 });
  await page.screenshot({ path: '/opt/cursor/artifacts/ORDER-DETAIL-320.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/opt/cursor/artifacts/ORDER-DETAIL-390.png', fullPage: true });

  const before = await answer(request, auth.token);
  let dropped = false;
  await page.route(/\/checklists\/responses\/?/, async (route) => {
    const method = route.request().method();
    if (!dropped && (method === 'PATCH' || method === 'POST')) {
      dropped = true;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.getByTestId('checklist-cta-button').click();
  await page.locator('div').filter({ hasText: /^Revisar nivel de aceite/ }).first().click({ force: true });
  await page.getByTestId('checklist-option-sucio').click();
  await page.getByRole('button', { name: /guardar|actualizar/i }).click();
  await expect(page.getByText('Sin conexión')).toBeVisible();
  await expect(page.getByText('Tu respuesta ha sido guardada exitosamente')).toHaveCount(0);
  const during = await answer(request, auth.token);
  expect(during.respuesta_seleccion).toBe(before.respuesta_seleccion);
  expect(during.id).toBe(before.id);

  await page.screenshot({ path: '/opt/cursor/artifacts/CHECKLIST-NETWORK-UNSAVED.png', fullPage: true });
  const saved = page.waitForResponse(
    (resp) => resp.url().includes('/api/checklists/responses/') && resp.request().method() === 'PATCH' && resp.status() === 200,
  );
  await page.getByRole('button', { name: 'Reintentar' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.getByText('Tu respuesta ha sido guardada exitosamente')).toBeVisible();
  const after = await answer(request, auth.token);
  expect(after.id).toBe(before.id);
  expect(after.respuesta_seleccion).toBe('sucio');
  const rows = await responses(request, auth.token);
  expect(rows.filter((row) => row.item_template === 5)).toHaveLength(1);
});

async function answer(request: { get: (url: string, opts: { headers: Record<string, string> }) => Promise<{ json: () => Promise<unknown> }> }, token: string) {
  const rows = await responses(request, token);
  const row = rows.find((item) => item.item_template === 5);
  if (!row) throw new Error('missing oil response');
  return row;
}

async function responses(
  request: { get: (url: string, opts: { headers: Record<string, string> }) => Promise<{ json: () => Promise<unknown> }> },
  token: string,
) {
  const body = await (await request.get(`${API_URL}/api/checklists/instances/?orden_id=1`, {
    headers: { Authorization: `Token ${token}` },
  })).json() as { results: Array<{ orden: number | null; respuestas: Array<{ id: number; item_template: number; respuesta_seleccion: string }> }> };
  const instance = body.results.find((row) => row.orden === 1);
  if (!instance) throw new Error('missing order 1 checklist');
  return instance.respuestas;
}
