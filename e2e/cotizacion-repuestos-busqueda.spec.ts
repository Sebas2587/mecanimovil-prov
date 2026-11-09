import { execFileSync } from 'child_process';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API = 'http://127.0.0.1:8011/api';
const TOKEN_PUBLICO = 'cotiz-publico-3624';

type CotizacionCreada = {
  id: number;
  repuestos: {
    costo_unitario_clp: number | null;
    precio_cobrado_clp: number | null;
    margen_clp: number | null;
    margen_pct: number | null;
    costo_estimado_clp: number | null;
    costo_origen: string | null;
  }[];
  ganancia_repuestos_clp: number | null;
  costo_total_repuestos_clp: number | null;
  cobrado_total_repuestos_clp: number | null;
  margen_repuestos_pct: number | null;
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

function publicarToken(id: number) {
  shellAislado(`from django.utils.crypto import get_random_string
from mecanimovilapp.apps.ordenes.models import CotizacionCanal
qs = CotizacionCanal.objects.exclude(pk=${id}).filter(token='${TOKEN_PUBLICO}')
for row in qs:
    row.token = 'old-' + get_random_string(12)
    row.save(update_fields=['token'])
c = CotizacionCanal.objects.get(pk=${id})
c.token = '${TOKEN_PUBLICO}'
c.save(update_fields=['token'])`);
}

function sembrarTallerAjeno() {
  shellAislado(`from django.contrib.auth import get_user_model
from mecanimovilapp.apps.usuarios.models import MiembroTaller, Taller
User = get_user_model()
owner, created = User.objects.get_or_create(username='taller_ajeno', defaults={'email': 'taller.ajeno@test.com', 'is_active': True})
owner.email = 'taller.ajeno@test.com'
owner.is_active = True
owner.set_password('test123')
owner.save()
taller, _ = Taller.objects.get_or_create(usuario=owner, defaults={'nombre': 'Taller Ajeno', 'telefono': '+56955556666', 'estado_verificacion': 'aprobado', 'verificado': True, 'onboarding_completado': True, 'activo': True, 'modalidad_atencion': 'ambas', 'tipo_cobertura_marca': 'multimarca'})
taller.nombre = 'Taller Ajeno'
taller.estado_verificacion = 'aprobado'
taller.verificado = True
taller.onboarding_completado = True
taller.activo = True
taller.save()
mandante, _ = MiembroTaller.objects.get_or_create(taller=taller, rol='mandante', defaults={'usuario': owner, 'nombre': 'Dueño Ajeno', 'activo': True, 'modalidad_tecnico': 'en_taller'})
if mandante.usuario_id != owner.id or not mandante.activo:
    mandante.usuario = owner
    mandante.activo = True
    mandante.save(update_fields=['usuario', 'activo'])`);
}

test('el taller ve costo, cobrado y ganancia, y encuentra la cotización', async ({ browser, request }) => {
  test.setTimeout(180000);
  sembrarTallerAjeno();
  const loginAjeno = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username: 'taller.ajeno@test.com', password: 'test123' },
  });
  expect(loginAjeno.ok()).toBeTruthy();
  const ajeno = await loginAjeno.json();
  const authAjeno = { Authorization: `Token ${ajeno.token}` };
  const cotizacionAjena = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: authAjeno,
    data: {
      cliente_nombre: 'Cliente Taller Ajeno',
      cliente_telefono: '+56955550000',
      servicio_nombre: 'Cambio de correa',
      modalidad: 'taller',
      vehiculo: { marca: 'Honda', modelo: 'Civic', anio: 2016, patente: 'AJ-EN-99' },
    },
  });
  expect(cotizacionAjena.ok()).toBeTruthy();

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
  expect(cotizacion.repuestos[0].precio_cobrado_clp).toBe(10000);
  expect(cotizacion.repuestos[0].margen_clp).toBe(8000);
  expect(cotizacion.repuestos[0].margen_pct).toBe(66.7);
  expect(cotizacion.repuestos[0].costo_estimado_clp).toBe(6000);
  expect(cotizacion.repuestos[0].costo_origen).toBe('estimado');
  expect(cotizacion.margen_repuestos_pct).toBe(66.7);

  const sinCosto = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: auth,
    data: {
      cliente_nombre: 'Linea Sin Costo',
      servicio_nombre: 'Revision',
      modalidad: 'taller',
      vehiculo: { marca: 'Fiat', modelo: 'Bravo', anio: 2012, patente: 'SC-00-11' },
    },
  });
  expect(sinCosto.ok()).toBeTruthy();
  const sinId = (await sinCosto.json()).cotizacion.id as number;
  const mixto = await request.patch(`${API}/ordenes/cotizaciones-canal/${sinId}/`, {
    headers: auth,
    data: {
      repuestos: [
        { id: 's1', nombre: 'Bujia', cantidad: 1, precio_unitario_clp: 4000 },
        { id: 's2', nombre: 'Filtro', cantidad: 2, precio_unitario_clp: 10000, costo_unitario_clp: 6000 },
      ],
    },
  });
  expect(mixto.ok()).toBeTruthy();
  const mixtoJson = await mixto.json() as CotizacionCreada;
  expect(mixtoJson.costo_total_repuestos_clp).toBeNull();
  expect(mixtoJson.ganancia_repuestos_clp).toBeNull();
  expect(mixtoJson.cobrado_total_repuestos_clp).toBe(24000);
  expect(mixtoJson.repuestos[0].costo_unitario_clp).toBeNull();

  const porNombre = await request.get(`${API}/ordenes/cotizaciones-canal/?q=${encodeURIComponent('josé costos')}&page_size=100`, { headers: auth });
  expect(porNombre.ok()).toBeTruthy();
  const filasNombre = ((await porNombre.json()) as { results: { id: number }[] }).results;
  expect(filasNombre.some((fila) => fila.id === id)).toBeTruthy();
  const porPatente = await request.get(`${API}/ordenes/cotizaciones-canal/?q=jq.cd.12&page_size=100`, { headers: auth });
  const filasPatente = ((await porPatente.json()) as { results: { id: number }[] }).results;
  expect(filasPatente.some((fila) => fila.id === id)).toBeTruthy();

  publicarToken(id);
  const publica = await request.get(`${API}/ordenes/cotizaciones-publicas/${TOKEN_PUBLICO}/`);
  expect(publica.ok()).toBeTruthy();
  const publicaJson = JSON.stringify(await publica.json());
  expect(publicaJson).not.toContain('ganancia_repuestos_clp');
  expect(publicaJson).not.toContain('costo_unitario_clp');
  expect(publicaJson).not.toContain('costo_estimado_clp');
  expect(publicaJson).not.toContain('costo_registrado_clp');
  expect(publicaJson).not.toContain('precio_cobrado_clp');
  expect(publicaJson).not.toContain('margen_clp');
  expect(publicaJson).not.toContain('costo_origen');
  expect(publicaJson).not.toContain('costo_total_repuestos_clp');

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
  const pedidoNombre = page.waitForResponse((res) => {
    if (!res.url().includes('/cotizaciones-canal/') || !res.ok()) return false;
    return new URL(res.url()).searchParams.get('q') === 'jose';
  });
  await buscador.pressSequentially('jose', { delay: 20 });
  const cuerpoBusqueda = await (await pedidoNombre).json() as { results?: { id: number }[] };
  expect((cuerpoBusqueda.results ?? []).some((fila) => fila.id === id)).toBeTruthy();
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

  await buscador.fill('');
  const pedidoAjeno = page.waitForResponse((res) => {
    if (!res.url().includes('/cotizaciones-canal/') || !res.ok()) return false;
    return new URL(res.url()).searchParams.get('q') === 'ajeno';
  });
  await buscador.pressSequentially('ajeno', { delay: 20 });
  const cuerpoAjeno = await (await pedidoAjeno).json() as { results?: { cliente_nombre?: string }[] };
  expect((cuerpoAjeno.results ?? []).every((fila) => !/ajeno/i.test(fila.cliente_nombre || ''))).toBeTruthy();
  await expect(page.getByText('Cliente Taller Ajeno')).toHaveCount(0);
  await expect(page.getByText('José Costos Busqueda')).toHaveCount(0);

  await buscador.fill('');
  await buscador.pressSequentially('jose', { delay: 20 });
  await expect(page.getByText('José Costos Busqueda').first()).toBeVisible();
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
  await page.goto(`${BASE_URL}/cotizacion-canal/${sinId}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('Costo final sin costo registrado').first()).toBeVisible();
  await expect(page.getByText('Ganancia sin costo registrado').first()).toBeVisible();
  await expect(page.getByText('Cobrado repuestos').first()).toBeVisible();
  await expect(page.getByText('$24.000').first()).toBeVisible();
  await expect(page.getByText('Costo final $0')).toHaveCount(0);

  await page.goto(`${BASE_URL}/cotizacion/${TOKEN_PUBLICO}`);
  await cerrarAvisoLegal(page);
  await expect(page.getByText('José Costos Busqueda')).toBeVisible();
  await expect(page.getByText('Costo final')).toHaveCount(0);
  await expect(page.getByText('Ganancia')).toHaveCount(0);
  await context.close();
});
