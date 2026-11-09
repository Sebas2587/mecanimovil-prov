import { execFileSync } from 'child_process';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API = 'http://127.0.0.1:8011/api';

async function sinDesborde(page: Page) {
  const extra = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(extra).toBeLessThanOrEqual(1);
}

async function cerrarAvisoLegal(page: Page) {
  const aceptar = page.getByRole('button', { name: 'Acepto términos y privacidad' });
  try {
    await aceptar.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return;
  }
  await aceptar.click();
  await expect(aceptar).toBeHidden();
}

async function sinZoomLock(page: Page) {
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport ?? '').not.toContain('maximum-scale=1');
  expect(viewport ?? '').not.toContain('user-scalable=no');
}

function shellAislado(codigo: string) {
  const env = { ...process.env };
  env.DB_NAME = 'mecanimovil_cotiz_3624';
  env.BACKEND_DIR = '/tmp/mecanimovil-backend-costo';
  env.DATABASE_URL = 'postgis://mecani_test:test123@127.0.0.1:5432/mecanimovil_cotiz_3624';
  env.DEBUG = 'True';
  env.SECURE_SSL_REDIRECT = 'False';
  env.SECRET_KEY = 'test-secret-key-for-ci-only-never-use-in-production';
  env.GDAL_LIBRARY_PATH = '/usr/lib/x86_64-linux-gnu/libgdal.so';
  delete env.REDIS_URL;
  delete env.CELERY_BROKER_URL;
  delete env.CELERY_RESULT_BACKEND;
  execFileSync(
    '/tmp/mecanimovil-backend/venv/bin/python',
    ['scripts/isolated_backend.py', 'shell', '-c', codigo],
    { cwd: '/agent/repos/mecanimovil-prov', env, stdio: 'pipe' },
  );
}

test('eliminar en un paso y decidir sugerencias del cotizador', async ({ browser, request }) => {
  test.setTimeout(180000);
  const login = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: 'taller@test.com', password: 'test123' },
  });
  const owner = await login.json();
  expect(login.ok()).toBeTruthy();
  const auth = { Authorization: `Token ${owner.token}` };

  const stamp = Date.now().toString().slice(-6);
  const malHecha = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: `Cliente Mal Hecha ${stamp}`,
      cliente_telefono: '+56911110001',
      servicio_nombre: 'Cambio mal cotizado',
      modalidad: 'taller',
      vehiculo: { marca: 'Kia', modelo: 'Rio', anio: 2015, patente: `MH${stamp}` },
    },
  });
  expect(malHecha.ok()).toBeTruthy();
  const malId = (await malHecha.json()).cotizacion.id as number;

  const decision = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: `Cliente LCKS17 ${stamp}`,
      cliente_telefono: '+56911110002',
      servicio_nombre: `Embrague LCKS17 ${stamp}`,
      modalidad: 'taller',
      vehiculo: { marca: 'Chevrolet', modelo: 'Sail', anio: 2017, patente: 'LCKS17' },
    },
  });
  expect(decision.ok()).toBeTruthy();
  const decisionId = (await decision.json()).cotizacion.id as number;

  const patched = await request.patch(`${API}/ordenes/cotizaciones-canal/${decisionId}/`, {
    headers: auth,
    data: {
      mano_obra_clp: 40000,
      repuestos: [
        {
          id: 'kit',
          nombre: 'Kit de embrague',
          cantidad: 1,
          precio_unitario_clp: 120000,
          certeza: 'confirmado',
          origen: 'pedido',
          estado_sugerencia: 'aceptada',
        },
        {
          id: 'bomba',
          nombre: 'Bomba de embrague',
          cantidad: 1,
          precio_unitario_clp: 45000,
          certeza: 'confirmado',
          origen: 'sugerencia',
          estado_sugerencia: 'pendiente',
          motivo_sugerencia: 'Suele cambiarse junto al kit en esta patente.',
        },
        {
          id: 'liq',
          nombre: 'Líquido de frenos',
          cantidad: 1,
          precio_unitario_clp: 8000,
          certeza: 'confirmado',
          origen: 'pedido',
          estado_sugerencia: 'aceptada',
        },
      ],
    },
  });
  expect(patched.ok()).toBeTruthy();

  shellAislado(`from mecanimovilapp.apps.ordenes.models import CotizacionCanal
from mecanimovilapp.apps.ordenes.services.asistente_cotizacion.revision_sugerencias import anotar_revision_metadata
c = CotizacionCanal.objects.get(pk=${decisionId})
reps = []
for rep in (c.repuestos or []):
    fila = dict(rep)
    if fila.get('id') == 'bomba':
        fila['origen'] = 'sugerencia'
        fila['estado_sugerencia'] = 'pendiente'
        fila['motivo_sugerencia'] = 'Suele cambiarse junto al kit en esta patente.'
    else:
        fila['origen'] = 'pedido'
        fila['estado_sugerencia'] = 'aceptada'
        fila['motivo_sugerencia'] = ''
    reps.append(fila)
c.repuestos = reps
meta = anotar_revision_metadata(dict(c.metadata or {}), reps, [{
    'id': 'd-rod',
    'texto': '¿El kit incluye el rodamiento?',
    'confirmada': False,
}])
c.metadata = meta
c.save(update_fields=['repuestos', 'metadata'])`);

  const context = await browser.newContext();
  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: owner.token, user: owner.user, apiUrl: API });
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE_URL}/cotizaciones`);
  await cerrarAvisoLegal(page);
  const buscador = page.getByLabel('Buscar cotizaciones');
  await expect(buscador).toBeVisible();
  await buscador.fill(`Cliente Mal Hecha ${stamp}`);
  await expect(page.getByText(`Cliente Mal Hecha ${stamp}`).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: new RegExp(`Eliminar cotización de Cliente Mal Hecha ${stamp}`) }).click();
  await expect(page.getByText('Se borra de la lista')).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-ELIMINAR-CONFIRMAR-390.png' });
  const delWait = page.waitForResponse((res) => (
    res.url().includes(`/cotizaciones-canal/${malId}/`)
    && res.request().method() === 'DELETE'
  ));
  await page.getByRole('button', { name: 'Eliminar' }).last().click();
  const delMal = await delWait;
  expect(delMal.status()).toBe(200);
  const cuerpoDel = await delMal.json() as { eliminada?: boolean; modo?: string; estado?: string };
  expect(cuerpoDel.eliminada).toBe(true);
  expect(cuerpoDel.modo).toBe('oculta');
  expect(cuerpoDel.estado).toBe('cancelada');
  await expect(page.getByText(`Cliente Mal Hecha ${stamp}`)).toHaveCount(0);
  await buscador.fill('');
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-ELIMINAR-LISTA-390.png' });
  await sinDesborde(page);
  await sinZoomLock(page);

  await page.getByRole('tab', { name: /Por decidir/ }).click();
  await expect(page.getByText(`Cliente LCKS17 ${stamp}`).first()).toBeVisible();
  await expect(page.getByText(/Por decidir · 1 sugerencia · 1 duda/).first()).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-POR-DECIDIR-390.png' });

  await page.goto(`${BASE_URL}/cotizacion-canal/${decisionId}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('Ítems pedidos').first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Sugerencias por revisar').first()).toBeVisible();
  await page.getByText('Sugerencias por revisar').first().scrollIntoViewIfNeeded();
  await expect(page.getByText('Suele cambiarse junto al kit en esta patente.')).toBeVisible();
  await expect(page.getByText('¿El kit incluye el rodamiento?')).toBeVisible();
  await expect(page.getByText('Repuestos cobrados').first()).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-DECISION-EDITOR-390.png' });

  const getDecision = await request.get(`${API}/ordenes/cotizaciones-canal/${decisionId}/`, { headers: auth });
  expect(getDecision.ok()).toBeTruthy();
  const cuerpoDecision = await getDecision.json() as {
    repuestos?: { id?: string; origen?: string; estado_sugerencia?: string }[];
    dudas?: { id?: string; texto?: string; confirmada?: boolean }[];
  };
  expect(cuerpoDecision.repuestos?.some((rep) => rep.id === 'bomba' && rep.origen === 'sugerencia')).toBeTruthy();
  expect(cuerpoDecision.dudas?.some((duda) => duda.id === 'd-rod' && duda.confirmada === false)).toBeTruthy();

  const postSugerencia = page.waitForResponse((res) => (
    res.url().includes(`/cotizaciones-canal/${decisionId}/sugerencias/`)
    && res.request().method() === 'POST'
  ));
  await page.getByRole('button', { name: 'Aceptar' }).click({ force: true });
  expect((await postSugerencia).ok()).toBeTruthy();
  await expect(page.getByText('Sugerido · aceptado')).toBeVisible({ timeout: 15_000 });
  const postDuda = page.waitForResponse((res) => (
    res.url().includes(`/cotizaciones-canal/${decisionId}/dudas/confirmar/`)
    && res.request().method() === 'POST'
  ));
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click({ force: true });
  expect((await postDuda).ok()).toBeTruthy();
  await expect(page.getByText('Ya no quedan dudas pendientes.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Lista para el agente')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-DECISION-LISTA-390.png' });
  await sinDesborde(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await sinDesborde(page);
  await sinZoomLock(page);

  await context.close();
});
