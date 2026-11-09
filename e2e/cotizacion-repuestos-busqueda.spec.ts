import { execFileSync } from 'child_process';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API = 'http://127.0.0.1:8011/api';
const TOKEN_PUBLICO = 'cotiz-publico-3624';

type CotizacionCreada = {
  id: number;
  repuestos: { costo_unitario_clp: number | null; margen_clp: number | null }[];
  ganancia_repuestos_clp: number | null;
  costo_total_repuestos_clp: number | null;
  cobrado_total_repuestos_clp: number | null;
};

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

function publicarToken(id: number) {
  execFileSync('bash', ['-lc', `
    set -euo pipefail
    cd /agent/repos/mecanimovil-prov
    export DB_NAME=mecanimovil_cotiz_3624
    export BACKEND_DIR=/tmp/mecanimovil-backend-main
    export DATABASE_URL="postgis://mecani_test:test123@127.0.0.1:5432/$DB_NAME"
    export DEBUG=True
    export SECURE_SSL_REDIRECT=False
    export SECRET_KEY=test-secret-key-for-ci-only-never-use-in-production
    export GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so
    unset REDIS_URL CELERY_BROKER_URL CELERY_RESULT_BACKEND
    /tmp/mecanimovil-backend/venv/bin/python scripts/isolated_backend.py shell -c "from mecanimovilapp.apps.ordenes.models import CotizacionCanal; CotizacionCanal.objects.exclude(pk=${id}).filter(token='${TOKEN_PUBLICO}').update(token=''); c=CotizacionCanal.objects.get(pk=${id}); c.token='${TOKEN_PUBLICO}'; c.save(update_fields=['token'])"
  `], { stdio: 'pipe' });
}

test('el taller ve costo, cobrado y ganancia, y encuentra la cotización', async ({ browser, request }) => {
  test.setTimeout(180000);
  const login = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: 'taller@test.com', password: 'test123' },
  });
  const owner = await login.json();
  expect(login.ok()).toBeTruthy();
  const auth = { Authorization: `Token ${owner.token}` };

  const creada = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: 'José Costos Busqueda',
      cliente_telefono: '+56911112222',
      servicio_nombre: 'Cambio de filtro',
      modalidad: 'taller',
      vehiculo: {
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2018,
        patente: 'JQ-CD-12',
      },
    },
  });
  expect(creada.ok()).toBeTruthy();
  const borrador = await creada.json();
  const id = borrador.cotizacion.id as number;

  const patched = await request.patch(`${API}/ordenes/cotizaciones-canal/${id}/`, {
    headers: auth,
    data: {
      repuestos: [{
        id: 'f1',
        nombre: 'Filtro de aceite Toyota Corolla 2018',
        nombre_producto: 'Filtro de aceite Toyota Corolla 2018',
        cantidad: 2,
        precio_unitario_clp: 10000,
        certeza: 'confirmado',
        fuentes_detalle: [{
          fuente: 'web',
          tienda: 'TodoAuto',
          dominio: 'todoauto.cl',
          precio_clp: 6000,
          url: 'https://www.todoauto.cl/filtro-aceite-toyota-corolla-2018',
          nombre: 'Filtro de aceite Toyota Corolla 2018',
        }],
      }],
      mano_obra_clp: 15000,
    },
  });
  expect(patched.ok()).toBeTruthy();
  const cotizacion = await patched.json() as CotizacionCreada;
  expect(cotizacion.costo_total_repuestos_clp).toBe(12000);
  expect(cotizacion.cobrado_total_repuestos_clp).toBe(20000);
  expect(cotizacion.ganancia_repuestos_clp).toBe(8000);
  expect(cotizacion.repuestos[0].costo_unitario_clp).toBe(6000);
  expect(cotizacion.repuestos[0].margen_clp).toBe(8000);

  publicarToken(id);
  const publica = await request.get(`${API}/ordenes/cotizaciones-publicas/${TOKEN_PUBLICO}/`);
  expect(publica.ok()).toBeTruthy();
  const publicaJson = JSON.stringify(await publica.json());
  expect(publicaJson).not.toContain('ganancia_repuestos_clp');
  expect(publicaJson).not.toContain('costo_unitario_clp');
  expect(publicaJson).not.toContain('costo_estimado_clp');

  const context = await browser.newContext();
  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: owner.token, user: owner.user, apiUrl: API });
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE_URL}/cotizacion-canal/${id}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('Costo final repuestos')).toBeVisible();
  await expect(page.getByText('Cobrado repuestos').first()).toBeVisible();
  await expect(page.getByText('Ganancia repuestos').first()).toBeVisible();
  await expect(page.getByText('$12.000').first()).toBeVisible();
  await expect(page.getByText('$20.000').first()).toBeVisible();
  await expect(page.getByText('$8.000').first()).toBeVisible();
  await page.getByText('Costo final repuestos').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-CREAR-390.png', fullPage: false });
  await sinDesborde(page);
  await sinZoomLock(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await sinDesborde(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE_URL}/cotizaciones`);
  await cerrarAvisoLegal(page);
  const buscador = page.getByLabel('Buscar cotizaciones');
  await expect(buscador).toBeVisible();
  await buscador.click();
  await buscador.pressSequentially('jose', { delay: 20 });
  await expect(page.getByText('José Costos Busqueda').first()).toBeVisible();
  await buscador.fill('');
  await buscador.pressSequentially('jqcd12', { delay: 20 });
  await expect(page.getByText('José Costos Busqueda').first()).toBeVisible();
  await buscador.fill('');
  await buscador.pressSequentially('toyota corolla', { delay: 20 });
  await expect(page.getByText('José Costos Busqueda').first()).toBeVisible();
  await expect(page.getByText('Sin resultados')).toHaveCount(0);
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-BUSQUEDA-390.png', fullPage: false });
  await sinDesborde(page);

  await page.getByRole('button', { name: /Abrir cotización de José Costos Busqueda/ }).first().click();
  await expect(page.getByText('Costo final repuestos')).toBeVisible();
  await expect(page.getByText('Ganancia repuestos').first()).toBeVisible();
  await expect(page.getByText('$8.000').first()).toBeVisible();
  await page.getByText('Costo final repuestos').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-DETALLE-390.png', fullPage: false });
  await page.setViewportSize({ width: 320, height: 700 });
  await sinDesborde(page);
  await sinZoomLock(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/cotizacion/${TOKEN_PUBLICO}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('José Costos Busqueda')).toBeVisible();
  await expect(page.getByText('Costo final')).toHaveCount(0);
  await expect(page.getByText('Ganancia')).toHaveCount(0);
  await context.close();
});
