import { expect, test } from '@playwright/test';
import { loadFixtureManifest } from './fixtureManifest';

const BASE_URL = 'http://localhost:19006';
const API = 'http://localhost:8010/api';

test('owner assigns, reassigns, and sees the schedule conflict in the UI', async ({ browser, request }) => {
  test.setTimeout(120000);
  const manifest = loadFixtureManifest();
  const visita = manifest.mechanic_visita.nombre;
  const ocupado = manifest.mechanic_ocupado.nombre;
  if (!visita || !ocupado) {
    throw new Error('El manifiesto no trae el nombre de los técnicos.');
  }
  const login = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: manifest.owner.email, password: 'test123' },
  });
  const owner = await login.json();
  expect(login.ok()).toBeTruthy();

  const context = await browser.newContext();
  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: owner.token, user: owner.user, apiUrl: API });
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/orden-detalle/${manifest.order_open.id}`);

  await page.getByText('Asignar', { exact: true }).click();
  await page.getByText(visita, { exact: true }).click();
  const assigned = page.waitForResponse(
    (resp) => resp.url().includes('/asignar_tecnico/') && resp.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar' }).click();
  expect((await assigned).ok()).toBeTruthy();
  await page.screenshot({ path: '/opt/cursor/artifacts/ASIGNAR-TECNICO-390.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: '/opt/cursor/artifacts/ASIGNAR-TECNICO-320.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });

  const afterAssign = await (await request.get(`${API}/ordenes/proveedor-ordenes/${manifest.order_open.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(afterAssign.mecanico_asignado_id).toBe(manifest.mechanic_visita.miembro_id);

  await page.getByText('Reasignar', { exact: true }).click();
  await page.getByText(ocupado, { exact: true }).click();
  const reassigned = page.waitForResponse(
    (resp) => resp.url().includes('/asignar_tecnico/') && resp.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar' }).click();
  expect((await reassigned).ok()).toBeTruthy();
  await expect(page.getByText('Conflictos de horario')).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/CONFLICTO-HORARIO-390.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: '/opt/cursor/artifacts/CONFLICTO-HORARIO-320.png', fullPage: true });

  const afterReassign = await (await request.get(`${API}/ordenes/proveedor-ordenes/${manifest.order_open.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(afterReassign.mecanico_asignado_id).toBe(manifest.mechanic_ocupado.miembro_id);
  await context.close();
});
