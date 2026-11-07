import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8010';
const API = `${API_URL}/api`;
const CLIENTE = 'Cliente Consent 3624';
const PATENTE = 'SYN3624';
const SERVICIO = 'Inspección Test Frontend';
const HALLAZGO = 'Filtro de aceite obstruido hallazgo 3624';
const VEHICULO = 'Toyota Corolla';

test('workshop send then public accept and reject', async ({ browser, request }) => {
  test.setTimeout(240000);
  const owner = await login(request, 'taller@test.com');
  await ensureSaturdayHours(request, owner.token);
  const ofertaId = await ensureCatalogOffer(request, owner.token);
  const draft = await createBaseDraft(request, owner.token);

  const external: string[] = [];
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  watchExternal(ownerPage, external);
  await ownerPage.setViewportSize({ width: 390, height: 844 });
  await seedSession(ownerCtx, owner);

  await ownerPage.goto(`${BASE_URL}/cotizacion-canal/${draft.id}`);
  const enviar = ownerPage.getByRole('button', { name: 'Enviar cotización' });
  await enviar.first().waitFor({ timeout: 20000 });
  const sendWait = ownerPage.waitForResponse(
    (resp) => resp.url().includes('/enviar/') && resp.request().method() === 'POST',
  );
  await enviar.first().click();
  await ownerPage.getByRole('button', { name: 'Enviar cotización' }).last().click();
  const sendResp = await sendWait;
  expect(sendResp.status()).toBe(200);
  const sent = await sendResp.json();
  expect(sent.cotizacion.estado).toBe('enviada');
  expect(sent.entrega_via).toBe('link_publico');
  expect(sent.message_id).toBeNull();
  const baseToken = tokenFromShare(sent.share_url || sent.cotizacion.share_url || sent.cotizacion.url_publica);
  await ownerPage.getByRole('button', { name: 'Ahora no' }).click();
  await ownerPage.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-ENVIADA-390.png', fullPage: true });

  const accepted = await respondPublic(browser, baseToken, 'aceptar');
  expect(accepted.estado).toBe('aceptada');
  const citaId = Number(accepted.cita_id);
  expect(citaId).toBeGreaterThan(0);

  let cita: { horario_por_confirmar?: boolean; estado?: string; detalle?: { cliente_nombre?: string; vehiculo_patente?: string } } | null = null;
  let scheduledOk = false;
  for (const hora of ['20:00:00', '21:00:00', '13:50:00']) {
    const scheduled = await request.patch(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
      headers: { Authorization: `Token ${owner.token}` },
      data: {
        fecha_servicio: '2026-11-07',
        hora_servicio: hora,
        duracion_minutos: 60,
        tipo_servicio: 'taller',
        miembro_taller: 7,
      },
    });
    cita = await scheduled.json();
    scheduledOk = scheduled.ok();
    if (scheduledOk) break;
  }
  expect(scheduledOk, JSON.stringify(cita)).toBeTruthy();
  expect(cita.horario_por_confirmar).toBe(false);
  expect(cita.estado).toBe('activa');
  expect(cita.detalle.cliente_nombre).toBe(CLIENTE);
  expect(cita.detalle.vehiculo_patente).toBe(PATENTE);

  const mechanic = await login(request, 'mechanic_test@example.com');
  const mechCtx = await browser.newContext();
  const mechPage = await mechCtx.newPage();
  watchExternal(mechPage, external);
  await mechPage.setViewportSize({ width: 390, height: 844 });
  await seedSession(mechCtx, mechanic);
  await mechPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  const iniciar = mechPage.getByRole('button', { name: 'Iniciar servicio' });
  const observacion = mechPage.getByText('Observaciones generales');
  const continuar = mechPage.getByRole('button', { name: 'Continuar checklist' });
  await expect(iniciar.or(continuar).or(observacion).first()).toBeVisible({ timeout: 20000 });
  if (await iniciar.isVisible().catch(() => false)) await iniciar.click();
  await expect(continuar.or(observacion).first()).toBeVisible({ timeout: 20000 });
  if (!(await observacion.first().isVisible().catch(() => false))) {
    await continuar.click();
  }
  await observacion.first().click();
  await mechPage.getByPlaceholder('Ingrese su respuesta...').fill(HALLAZGO);
  const textSave = mechPage.waitForResponse(
    (resp) => resp.url().includes('/api/checklists/responses/') && ['POST', 'PATCH'].includes(resp.request().method()),
  );
  await mechPage.getByRole('button', { name: /guardar|actualizar/i }).click();
  expect((await textSave).ok()).toBeTruthy();
  await mechPage.getByRole('button', { name: /^ok$/i }).click();

  await ownerPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  await ownerPage.getByRole('button', { name: 'Más acciones' }).click();
  await ownerPage.getByRole('button', { name: 'Agregar hallazgo' }).click();
  await expect(ownerPage.getByTestId('hallazgo-motivo')).toHaveValue(HALLAZGO);
  await expect(ownerPage.getByText(`${CLIENTE} · Toyota Corolla`)).toBeVisible();
  await ownerPage.getByTestId(`catalogo-oferta-${ofertaId}`).click();
  const createdWait = ownerPage.waitForResponse(
    (resp) => resp.url().includes('/crear-adicional/') && resp.request().method() === 'POST',
  );
  await ownerPage.getByRole('button', { name: 'Crear borrador para revisar' }).click();
  const createdResp = await createdWait;
  expect(createdResp.status()).toBe(201);
  const created = await createdResp.json();
  const extra = created.cotizacion;
  expect(extra.estado).toBe('borrador');
  expect(extra.cotizacion_original_id).toBe(draft.id);
  expect(extra.cita_origen_id || extra.cita_personal_id).toBeTruthy();
  expect(extra.cliente_nombre).toBe(CLIENTE);
  expect(extra.vehiculo_patente).toBe(PATENTE);
  expect(extra.motivo_servicio_adicional).toBe(HALLAZGO);
  await ownerPage.getByRole('button', { name: 'Revisar y enviar' }).click();

  const extraSendWait = ownerPage.waitForResponse(
    (resp) => resp.url().includes('/enviar/') && resp.request().method() === 'POST',
  );
  await ownerPage.getByRole('button', { name: 'Enviar cotización' }).first().click();
  await ownerPage.getByRole('button', { name: 'Enviar cotización' }).last().click();
  const extraSend = await extraSendWait;
  expect(extraSend.status()).toBe(200);
  const extraSent = await extraSend.json();
  expect(extraSent.cotizacion.estado).toBe('enviada');
  expect(extraSent.entrega_via).toBe('link_publico');
  expect(extraSent.message_id).toBeNull();
  await ownerPage.getByRole('button', { name: 'Ahora no' }).click();

  const baseStill = await (await request.get(`${API}/ordenes/cotizaciones-canal/${draft.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  const citaStill = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(baseStill.estado).toBe('aceptada');
  expect(citaStill.estado).toBe('activa');
  const closeBlocked = await request.post(`${API}/ordenes/citas-agenda-personal/${citaId}/cerrar/`, {
    headers: { Authorization: `Token ${owner.token}` },
    data: {},
  });
  expect(closeBlocked.status()).toBe(409);
  const closeBody = await closeBlocked.json();
  expect(closeBody.codigo).toBe('checklist_en_curso');
  const extraPending = await (await request.get(`${API}/ordenes/cotizaciones-canal/${extra.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(extraPending.estado).toBe('enviada');

  const extraToken = tokenFromShare(extraSent.share_url || extraSent.cotizacion.url_publica);
  const rejected = await respondPublic(browser, extraToken, 'rechazar');
  expect(rejected.estado).toBe('rechazada');
  const extraAfter = await (await request.get(`${API}/ordenes/cotizaciones-canal/${extra.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  const baseAfter = await (await request.get(`${API}/ordenes/cotizaciones-canal/${draft.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  const citaAfter = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(extraAfter.estado).toBe('rechazada');
  expect(baseAfter.estado).toBe('aceptada');
  expect(citaAfter.estado).toBe('activa');
  expect(external, external.join('\n')).toEqual([]);
  console.log(`CONSENT base=${draft.id} cita=${citaId} extra=${extra.id} rejected token path ok`);
});

function watchExternal(page: Page, bucket: string[]) {
  page.on('request', (req) => {
    const url = req.url();
    if (/wa\.me|whatsapp|graph\.facebook|facebook\.com\/dialog/i.test(url)) bucket.push(url);
  });
  page.on('pageerror', (err) => {
    throw new Error(`Page error: ${err.message}`);
  });
}

async function seedSession(
  context: BrowserContext,
  auth: { token: string; user: unknown },
) {
  await context.addInitScript(({ token, user, apiUrl }) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: auth.token, user: auth.user, apiUrl: API });
}

async function login(request: APIRequestContext, username: string) {
  const resp = await request.post(`${API}/usuarios/login-proveedor/`, {
    data: { username, password: 'test123' },
  });
  const body = await resp.json();
  expect(resp.ok(), JSON.stringify(body.user ? { id: body.user.id } : body)).toBeTruthy();
  return body as { token: string; user: unknown };
}

async function ensureSaturdayHours(request: APIRequestContext, token: string) {
  const listed = await request.get(`${API}/usuarios/horarios-proveedor/?dia_semana=5`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(listed.ok()).toBeTruthy();
  const body = await listed.json();
  const rows = Array.isArray(body) ? body : body.results || [];
  const active = rows.find((row: { activo?: boolean; id?: number; hora_fin?: string }) => row.activo !== false);
  if (active?.id && String(active.hora_fin || '') <= '20:00:00') {
    const extended = await request.patch(`${API}/usuarios/horarios-proveedor/${active.id}/`, {
      headers: { Authorization: `Token ${token}` },
      data: { hora_fin: '22:00:00' },
    });
    expect(extended.ok(), JSON.stringify(await extended.json())).toBeTruthy();
  }
  if (active) return;
  const created = await request.post(`${API}/usuarios/horarios-proveedor/`, {
    headers: { Authorization: `Token ${token}` },
    data: {
      dia_semana: 5,
      activo: true,
      hora_inicio: '08:00:00',
      hora_fin: '20:00:00',
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
  });
  const hours = await created.json();
  expect(created.ok(), JSON.stringify(hours)).toBeTruthy();
}

async function ensureCatalogOffer(request: APIRequestContext, token: string) {
  const listed = await request.get(`${API}/servicios/proveedor/mis-servicios/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(listed.ok()).toBeTruthy();
  const rows = await listed.json();
  const offers = Array.isArray(rows) ? rows : rows.results || [];
  const ready = offers.find((row: { disponible?: boolean; id: number }) => row.disponible && row.id);
  if (ready) return ready.id as number;
  const created = await request.post(`${API}/servicios/proveedor/mis-servicios/`, {
    headers: { Authorization: `Token ${token}` },
    data: {
      servicio: 2,
      disponible: true,
      tipo_servicio: 'sin_repuestos',
      costo_mano_de_obra_sin_iva: 15000,
      duracion_estimada: '01:00:00',
    },
  });
  const offer = await created.json();
  expect(created.status(), JSON.stringify(offer)).toBe(201);
  return offer.id as number;
}

async function createBaseDraft(request: APIRequestContext, token: string) {
  const created = await request.post(`${API}/ordenes/cotizaciones-canal/crear-borrador/`, {
    headers: { Authorization: `Token ${token}` },
    data: {
      cliente_nombre: CLIENTE,
      cliente_telefono: '+56911112222',
      servicio_nombre: SERVICIO,
      descripcion_problema: 'Inspección de base autorizada',
      modalidad: 'taller',
      vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2018, patente: PATENTE },
    },
  });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify(createdBody)).toBe(201);
  const cot = createdBody.cotizacion;
  const priced = await request.patch(`${API}/ordenes/cotizaciones-canal/${cot.id}/`, {
    headers: { Authorization: `Token ${token}` },
    data: { mano_obra_clp: 25000 },
  });
  const pricedBody = await priced.json();
  expect(priced.ok(), JSON.stringify(pricedBody)).toBeTruthy();
  return cot as { id: number };
}

function tokenFromShare(url: string) {
  const match = String(url || '').match(/cotizacion\/([^/?#]+)/);
  if (!match) throw new Error(`Public share URL has no token: ${url}`);
  return decodeURIComponent(match[1]);
}

async function respondPublic(
  browser: { newContext: () => Promise<BrowserContext> },
  token: string,
  accion: 'aceptar' | 'rechazar',
) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((apiUrl: string) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }, API);
  const page = await ctx.newPage();
  const authHeaders: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/cotizaciones-publicas/') && req.headers().authorization) {
      authHeaders.push(req.headers().authorization);
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const responseWait = page.waitForResponse(
    (resp) => resp.url().includes(`/cotizaciones-publicas/${token}/${accion}/`) && resp.request().method() === 'POST',
  );
  await page.goto(`${BASE_URL}/cotizacion/${token}`);
  await expect(page.getByTestId('cotizacion-publica-bearer')).toBeVisible();
  await expect(page.getByTestId('cotizacion-publica-cliente')).toContainText(CLIENTE);
  await expect(page.getByTestId('cotizacion-publica-vehiculo')).toContainText(PATENTE);
  await page.screenshot({
    path: `/opt/cursor/artifacts/COTIZACION-PUBLICA-${accion.toUpperCase()}-390.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({
    path: `/opt/cursor/artifacts/COTIZACION-PUBLICA-${accion.toUpperCase()}-320.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId(`cotizacion-publica-${accion}`).click();
  const resp = await responseWait;
  expect(resp.status()).toBe(200);
  await expect(page.getByTestId('cotizacion-publica-estado')).toHaveText(accion === 'aceptar' ? 'aceptada' : 'rechazada');
  expect(authHeaders).toEqual([]);
  const body = await resp.json();
  await ctx.close();
  return body as { estado: string; cita_id?: number };
}
