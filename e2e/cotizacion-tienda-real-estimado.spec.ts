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

test('la línea muestra la tienda del precio, no la casa sugerida', async ({ browser, request }) => {
  test.setTimeout(180000);
  const login = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: 'taller@test.com', password: 'test123' },
  });
  const owner = await login.json();
  expect(login.ok()).toBeTruthy();
  const auth = { Authorization: `Token ${owner.token}` };
  const stamp = Date.now().toString().slice(-6);

  const creada = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: `Cliente Oroch ${stamp}`,
      cliente_telefono: '+56911110008',
      servicio_nombre: 'kit de embrague y aceite de caja',
      modalidad: 'taller',
      vehiculo: { marca: 'Renault', modelo: 'Oroch', anio: 2019, patente: `IM${stamp}` },
    },
  });
  expect(creada.ok()).toBeTruthy();
  const cotizacionId = (await creada.json()).cotizacion.id as number;

  shellAislado(`from mecanimovilapp.apps.ordenes.models import CotizacionCanal
c = CotizacionCanal.objects.get(pk=${cotizacionId})
c.repuestos = [
    {
        'id': 'kit',
        'nombre': 'Kit de embrague',
        'identidad': 'kit_embrague',
        'rol': 'repuesto',
        'origen': 'pedido',
        'estado_sugerencia': 'aceptada',
        'cantidad': 1,
        'precio_unitario_clp': 89000,
        'nombre_producto': 'Kit de embrague Renault Oroch 2019',
        'url_producto': 'https://www.imaparts.cl/kit-embrague-oroch',
        'proveedor_nombre': 'Imaparts',
        'tienda_referencia': 'Imaparts',
        'casa_sugerida': 'Adriazola',
        'casa_repuesto_nombre': 'Adriazola',
        'precio_verificado_en_casa': False,
        'precio_estimado': False,
        'nota_referencia': 'Precio referencial de Imaparts, no verificado en Adriazola.',
        'costo_unitario_clp': 89000,
        'certeza': 'confirmado',
        'validacion_estado': 'ok',
        'fuente_marketplace': 'web',
    },
    {
        'id': 'aceite',
        'nombre': 'Aceite de caja de cambios',
        'identidad': 'aceite_caja',
        'rol': 'insumo',
        'origen': 'pedido',
        'especificacion': '75W-80 · 2.5 L',
        'cantidad': 3,
        'precio_unitario_clp': 8990,
        'nombre_producto': 'Aceite de caja 75W-80 1 litro',
        'url_producto': 'https://www.todoauto.cl/aceite-caja-75w80-1l',
        'proveedor_nombre': 'Todoauto',
        'precio_estimado': False,
        'certeza': 'confirmado',
        'validacion_estado': 'ok',
        'fuente_marketplace': 'web',
        'costo_unitario_clp': 8990,
    },
    {
        'id': 'sensor',
        'nombre': 'Sensor de detonación',
        'identidad': 'sin_clasificar',
        'rol': 'repuesto',
        'origen': 'pedido',
        'cantidad': 1,
        'precio_unitario_clp': 10000,
        'precio_estimado': True,
        'ganancia_estimada': True,
        'costo_origen': 'estimado',
        'costo_estimado_clp': 10000,
        'certeza': 'asumido',
    },
]
c.mano_obra_clp = 40000
meta = dict(c.metadata or {})
meta['dudas'] = [
    {'id': 'pieza-sensor-de-detonacion', 'texto': 'No clasifiqué «Sensor de detonación». Quedó como pieza aparte.', 'confirmada': False},
    {'id': 'precio-estimado-sensor-de-detonacion', 'texto': 'El precio de Sensor de detonación es estimado, sin ficha de tienda.', 'confirmada': False},
]
c.metadata = meta
c.save(update_fields=['repuestos', 'mano_obra_clp', 'metadata'])`);

  const context = await browser.newContext();
  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: owner.token, user: owner.user, apiUrl: API });
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/cotizacion-canal/${cotizacionId}`);
  await cerrarAvisoLegal(page);

  await expect(page.getByText('Kit de embrague').first()).toBeVisible({ timeout: 25_000 });
  await page.getByRole('button', { name: 'Costo, tienda y margen' }).first().click();
  await expect(page.getByRole('link', { name: 'Ver en Imaparts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver en Adriazola' })).toHaveCount(0);
  const casaSugerida = page.getByText('Casa sugerida: Adriazola', { exact: true });
  await expect(casaSugerida).toBeVisible();
  await expect(page.getByText(/Precio referencial de Imaparts, no verificado en Adriazola/)).toBeVisible();
  await capturas(page, 'COTIZACION-TIENDA-REAL', casaSugerida);

  await expect(page.getByText('75W-80 · 2.5 L · 3 un.')).toBeVisible();
  await expect(page.locator('input[value="3"]')).toBeVisible();

  const estimado = page.getByText('Estimado', { exact: true }).first();
  await expect(estimado).toBeVisible();
  await capturas(page, 'COTIZACION-PRECIO-ESTIMADO', estimado);

  await expect(page.getByText(/precio de Sensor de detonación es estimado/)).toBeVisible();
  await page.getByRole('button', { name: 'Enviar cotización' }).click();
  await expect(page.getByText('Falta tu opinión')).toBeVisible();
  await expect(page.getByText('El cotizador dejó 2 dudas. Confírmalas antes de enviar.')).toBeVisible();
  await expect(page.getByTestId('platform-alert-host')).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 400);
  }));
  await capturas(page, 'COTIZACION-DUDAS-NUEVAS', page.getByTestId('platform-alert-title'));
  await sinDesborde(page);
  await sinZoomLock(page);

  await context.close();
});
