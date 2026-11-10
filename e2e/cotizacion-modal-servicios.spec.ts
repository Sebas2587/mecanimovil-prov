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

async function medirDialogo(page: Page, width: number) {
  const dialogo = page.getByTestId('cotizacion-dialogo');
  await expect(dialogo).toBeVisible();
  const box = await dialogo.boundingBox();
  expect(box).toBeTruthy();
  const viewport = page.viewportSize()!;
  if (width >= 1024) {
    expect(box!.width).toBeGreaterThanOrEqual(700);
    expect(box!.width).toBeLessThanOrEqual(900);
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height * 0.8);
    expect(box!.height).toBeLessThanOrEqual(viewport.height * 0.96);
  } else {
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width * 0.88);
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height * 0.82);
  }

  const scroll = await dialogo.evaluate((el) => {
    const node = el as HTMLElement;
    const inner = [...node.querySelectorAll('*')].filter((n) => {
      const h = n as HTMLElement;
      const oy = window.getComputedStyle(h).overflowY;
      return h.scrollHeight > h.clientHeight + 4 && (oy === 'auto' || oy === 'scroll' || oy === 'overlay');
    });
    return {
      extraX: node.scrollWidth - node.clientWidth,
      extraY: node.scrollHeight - node.clientHeight,
      innerScrollers: inner.length,
    };
  });
  expect(scroll.extraX).toBeLessThanOrEqual(2);
  expect(scroll.extraY).toBeLessThanOrEqual(4);
  expect(scroll.innerScrollers).toBeLessThanOrEqual(1);

  const acciones = page.getByTestId('cotizacion-dialogo-acciones');
  await expect(acciones).toBeVisible();
  const abox = await acciones.boundingBox();
  expect(abox).toBeTruthy();
  expect(abox!.y).toBeGreaterThanOrEqual(0);
  expect(abox!.y + abox!.height).toBeLessThanOrEqual(viewport.height + 2);

  const inputsChicos = await dialogo.evaluate((el) => {
    const campos = [...(el as HTMLElement).querySelectorAll('input, textarea')];
    return campos
      .map((n) => Number.parseFloat(window.getComputedStyle(n).fontSize))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 16);
  });
  expect(inputsChicos).toEqual([]);
}

test('el modal de cotización cabe en 1280, 390 y 320 sin scroll doble', async ({ browser, request }) => {
  test.setTimeout(180000);
  const login = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: 'taller@test.com', password: 'test123' },
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

  for (const [width, height, stem] of [
    [1280, 800, 'DESPUES-MODAL-COTIZACION-1280'],
    [390, 844, 'DESPUES-MODAL-COTIZACION-390'],
    [320, 700, null],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`${BASE_URL}/`);
    await cerrarAvisoLegal(page);
    await page.getByRole('button', { name: 'Nueva cotización' }).first().click();
    await expect(page.getByTestId('cotizacion-dialogo')).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder('Ej. Cambio de aceite y filtros')).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await medirDialogo(page, width);
    await sinDesborde(page);
    await sinZoomLock(page);
    await expect(page.getByRole('button', { name: 'Crear en blanco' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generar con IA' })).toBeVisible();
    if (stem) {
      await page.screenshot({ path: `/opt/cursor/artifacts/${stem}.png` });
    }
    await page.keyboard.press('Escape');
  }

  await context.close();
});

test('con servicios[] agrupa mano de obra y deja las sugerencias aparte', async ({ browser, request }) => {
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
      cliente_nombre: `Cliente Servicios ${stamp}`,
      cliente_telefono: '+56911110009',
      servicio_nombre: 'Embrague',
      modalidad: 'taller',
      vehiculo: { marca: 'Renault', modelo: 'Oroch', anio: 2019, patente: `SV${stamp}` },
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
        'certeza': 'confirmado',
    },
    {
        'id': 'rod',
        'nombre': 'Rodamiento',
        'identidad': 'rodamiento',
        'rol': 'repuesto',
        'origen': 'sugerencia',
        'estado_sugerencia': 'pendiente',
        'motivo_sugerencia': 'No viene en el kit',
        'cantidad': 1,
        'precio_unitario_clp': 0,
        'precio_estimado': True,
        'certeza': 'asumido',
    },
    {
        'id': 'sensor',
        'nombre': 'Sensor sin precio',
        'identidad': 'sensor',
        'rol': 'repuesto',
        'origen': 'pedido',
        'cantidad': 1,
        'precio_unitario_clp': 0,
    },
]
c.mano_obra_clp = 90000
meta = dict(c.metadata or {})
meta['servicios_lineas'] = [{'id': 'cambio_embrague', 'nombre': 'Cambio de embrague', 'monto_clp': 90000, 'horas': 6, 'estimada': True, 'origen': 'estimada', 'motivo': 'Bajar la caja y cambiar el embrague son unas 6 horas de taller.'}]
meta['servicios'] = [{
    'id': 'cambio_embrague',
    'nombre': 'Cambio de embrague',
    'solo_mano': False,
    'vehiculo': {'marca': 'Renault', 'modelo': 'Oroch', 'anio': 2019, 'motor': '1.6'},
    'mano_obra': {
        'monto_clp': 90000,
        'horas': 6,
        'tarifa_hora_clp': 15000,
        'origen': 'estimada',
        'estimada': True,
        'motivo': 'Bajar la caja y cambiar el embrague son unas 6 horas de taller.',
    },
    'repuestos_requeridos': [
        {'identidad': 'kit_embrague', 'nombre': 'Kit de embrague', 'motivo': ''},
    ],
    'sugeridos': [
        {'identidad': 'rodamiento', 'nombre': 'Rodamiento', 'motivo': 'No viene en el kit'},
    ],
}]
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
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/cotizacion-canal/${cotizacionId}`);
  await cerrarAvisoLegal(page);

  await expect(page.getByTestId('servicio-grupo').first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText('Cambio de embrague').first()).toBeVisible();
  await expect(page.getByText('Estimada', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Bajar la caja y cambiar el embrague/)).toBeVisible();
  await expect(page.getByText('Kit de embrague').first()).toBeVisible();
  await expect(page.getByText('Sugerencias por revisar')).toBeVisible();
  await expect(page.getByText('Rodamiento').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descartar' }).first()).toBeVisible();
  await expect(page.getByText('Otros repuestos')).toBeVisible();
  await page.getByText('Sensor sin precio').scrollIntoViewIfNeeded();
  await expect(page.getByPlaceholder('Por confirmar').first()).toBeVisible();
  await expect(page.getByText('Estimado', { exact: true }).first()).toBeVisible();
  await sinDesborde(page);
  await sinZoomLock(page);

  await context.close();
});
