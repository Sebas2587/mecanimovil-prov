import { execFileSync } from 'child_process';
import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function capturas(page: Page, stem: string, keep?: Locator) {
  for (const [width, height] of [[390, 844], [320, 700]] as const) {
    await page.setViewportSize({ width, height });
    if (keep) {
      await keep.evaluate((nodo) => {
        (nodo as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest' });
      });
    }
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await page.screenshot({ path: `/opt/cursor/artifacts/${stem}-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
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

  const pedidoReal = 'kit de embrague, bomba de embrague y cambio de líquido de frenos';
  const decision = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: `Cliente LCKS17 ${stamp}`,
      cliente_telefono: '+56911110002',
      servicio_nombre: pedidoReal,
      descripcion_problema: pedidoReal,
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
      servicio_nombre: pedidoReal,
      descripcion_problema: pedidoReal,
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
          origen: 'pedido',
          estado_sugerencia: 'aceptada',
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
        {
          id: 'rod',
          nombre: 'Rodamiento de volante',
          cantidad: 1,
          precio_unitario_clp: 12000,
          certeza: 'confirmado',
          origen: 'sugerencia',
          estado_sugerencia: 'pendiente',
          motivo_sugerencia: 'No viene en el kit (disco, prensa y collarín de empuje). Al bajar la caja conviene cambiar el rodamiento piloto.',
        },
        {
          id: 'aceite',
          nombre: 'Aceite de caja de cambios',
          cantidad: 1,
          precio_unitario_clp: 32000,
          certeza: 'confirmado',
          origen: 'sugerencia',
          estado_sugerencia: 'pendiente',
          motivo_sugerencia: 'Al bajar la caja se pierde la valvulina. Es el llenado, no un tambor ni la caja.',
        },
        {
          id: 'reten',
          nombre: 'Retén trasero de cigüeñal',
          cantidad: 1,
          precio_unitario_clp: 7000,
          certeza: 'confirmado',
          origen: 'sugerencia',
          estado_sugerencia: 'pendiente',
          motivo_sugerencia: 'Queda a la vista al sacar la caja. Solo si el retén de este motor se cambia en el mismo trabajo.',
        },
      ],
    },
  });
  expect(patched.ok()).toBeTruthy();
  const cuerpoPatch = await patched.json() as {
    repuestos?: { id?: string; nombre?: string; origen?: string; estado_sugerencia?: string }[];
  };
  const bombaPatch = cuerpoPatch.repuestos?.find((rep) => (
    rep.id === 'bomba' || (rep.nombre || '').toLowerCase().includes('bomba')
  ));
  expect(bombaPatch?.origen, 'PATCH no debe reclasificar la bomba pedida').toBe('pedido');

  shellAislado(`from mecanimovilapp.apps.ordenes.models import CotizacionCanal
from mecanimovilapp.apps.ordenes.services.asistente_cotizacion.revision_sugerencias import anotar_revision_metadata
c = CotizacionCanal.objects.get(pk=${decisionId})
motivos = {
    'rod': 'No viene en el kit (disco, prensa y collarín de empuje). Al bajar la caja conviene cambiar el rodamiento piloto.',
    'aceite': 'Al bajar la caja se pierde la valvulina. Es el llenado, no un tambor ni la caja.',
    'reten': 'Queda a la vista al sacar la caja. Solo si el retén de este motor se cambia en el mismo trabajo.',
}
pedidos = {'kit', 'bomba', 'liq'}
reps = []
for rep in (c.repuestos or []):
    fila = dict(rep)
    clave = str(fila.get('id') or '')
    if clave in pedidos or clave == 'bomba':
        fila['origen'] = 'pedido'
        fila['estado_sugerencia'] = 'aceptada'
        fila['motivo_sugerencia'] = ''
    elif clave in motivos:
        fila['origen'] = 'sugerencia'
        fila['estado_sugerencia'] = 'pendiente'
        fila['motivo_sugerencia'] = motivos[clave]
    reps.append(fila)
c.repuestos = reps
meta = anotar_revision_metadata(dict(c.metadata or {}), reps, [{
    'id': 'd-rod',
    'texto': 'No confirmé la composición del kit en una ficha. El rodamiento de empuje suele venir dentro; el piloto no, y quedó como sugerencia.',
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
  await capturas(page, 'COTIZACION-ELIMINAR-CONFIRMAR');
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
  await capturas(page, 'COTIZACION-ELIMINAR-LISTA');
  await sinDesborde(page);
  await sinZoomLock(page);

  await buscador.fill(`Cliente LCKS17 ${stamp}`);
  await page.getByRole('tab', { name: /Por decidir/ }).click();
  await expect(page.getByText(`Cliente LCKS17 ${stamp}`).first()).toBeVisible();
  await expect(page.getByText(/Por decidir · /).first()).toBeVisible();
  await expect(page.getByText('$213.000').first()).toBeVisible();
  await capturas(page, 'COTIZACION-POR-DECIDIR');

  await page.goto(`${BASE_URL}/cotizacion-canal/${decisionId}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('Ítems pedidos').first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Agregar ítem' })).toBeVisible();
  await expect(page.getByTestId('cotizacion-editor-fab')).toHaveCount(0);
  const etiquetaPedido = page.getByText('Pedido', { exact: true });
  await expect(etiquetaPedido.nth(2)).toBeVisible();
  await expect(page.getByText('No hay ficha de tienda. El precio se asumió para cotizar. Casa sugerida: Adriazola.').first()).toBeVisible();
  await capturas(page, 'COTIZACION-DECISION-PEDIDOS', etiquetaPedido.nth(1));
  await expect(page.getByText('Sugerencias por revisar').first()).toBeVisible();
  await expect(page.getByText('Rodamiento de volante')).toBeVisible();
  await expect(page.getByText(/No viene en el kit/)).toBeVisible();
  await expect(page.getByText('Aceite de caja de cambios')).toBeVisible();
  await expect(page.getByText('Retén trasero de cigüeñal')).toBeVisible();
  const duda = page.getByText(/piloto|composición del kit|El cotizador necesita tu opinión/);
  await duda.first().scrollIntoViewIfNeeded();
  await expect(duda.first()).toBeVisible();
  await expect(page.getByText('Repuestos cobrados').first()).toBeVisible();
  const avisoSugerencia = page.getByText(/Mientras esté pendiente, no se suma al total/).first();
  await avisoSugerencia.evaluate((nodo) => {
    (nodo as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await capturas(page, 'COTIZACION-DECISION-EDITOR', avisoSugerencia);
  await expect(page.getByRole('button', { name: 'Enviar cotización' })).toBeVisible();

  const getDecision = await request.get(`${API}/ordenes/cotizaciones-canal/${decisionId}/`, { headers: auth });
  expect(getDecision.ok()).toBeTruthy();
  const cuerpoDecision = await getDecision.json() as {
    repuestos?: { id?: string; nombre?: string; origen?: string; estado_sugerencia?: string }[];
    dudas?: { id?: string; texto?: string; confirmada?: boolean }[];
  };
  expect(cuerpoDecision.repuestos?.some((rep) => (
    (rep.id === 'bomba' || (rep.nombre || '').includes('Bomba')) && rep.origen === 'pedido'
  ))).toBeTruthy();
  expect(cuerpoDecision.repuestos?.some((rep) => (
    (rep.id === 'rod' || (rep.nombre || '').includes('Rodamiento')) && rep.origen === 'sugerencia'
  ))).toBeTruthy();
  expect(cuerpoDecision.dudas?.some((duda) => duda.id === 'd-rod' && duda.confirmada === false)).toBeTruthy();

  const postSugerencia = page.waitForResponse((res) => (
    res.url().includes(`/cotizaciones-canal/${decisionId}/sugerencias/`)
    && res.request().method() === 'POST'
  ));
  await page.getByRole('button', { name: 'Aceptar' }).first().click({ force: true });
  expect((await postSugerencia).ok()).toBeTruthy();
  await expect(page.getByText('Sugerido · aceptado')).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 2; i += 1) {
    const postDescartar = page.waitForResponse((res) => (
      res.url().includes(`/cotizaciones-canal/${decisionId}/sugerencias/`)
      && res.request().method() === 'POST'
    ));
    await page.getByRole('button', { name: 'Descartar' }).first().click({ force: true });
    expect((await postDescartar).ok()).toBeTruthy();
  }
  const postDuda = page.waitForResponse((res) => (
    res.url().includes(`/cotizaciones-canal/${decisionId}/dudas/confirmar/`)
    && res.request().method() === 'POST'
  ));
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click({ force: true });
  expect((await postDuda).ok()).toBeTruthy();
  await expect(page.getByText('Ya no quedan dudas pendientes.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Lista para el agente')).toBeVisible({ timeout: 15_000 });
  const notaIva = page.getByText(/Los precios de línea ya incluyen IVA/);
  await notaIva.evaluate((nodo) => {
    (nodo as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await capturas(page, 'COTIZACION-DECISION-LISTA', notaIva);
  await sinDesborde(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await notaIva.evaluate((nodo) => {
    (nodo as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await expect(notaIva).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar cotización' })).toBeVisible();
  await sinDesborde(page);
  await sinZoomLock(page);

  await context.close();
});
