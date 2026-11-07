import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { loadFixtureManifest } from './fixtureManifest';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8010';
const API = `${API_URL}/api`;
const CLIENTE = 'Cliente Consent 3624';
const PATENTE = 'SYN3624';
const SERVICIO = 'Inspección Test Frontend';
const HALLAZGO = 'Filtro de aceite obstruido hallazgo 3624';

test('workshop send then public accept and reject', async ({ browser, request }) => {
  test.setTimeout(360000);
  const manifest = loadFixtureManifest();
  expect(manifest.servicio_nombre).toBe(SERVICIO);
  const owner = await login(request, manifest.owner.email);
  await ensureSaturdayHours(request, owner.token);
  const ofertaId = manifest.oferta_id;
  const draft = await createBaseDraft(request, owner.token);

  const external: string[] = [];
  const ownerCtx = await browser.newContext({
    geolocation: { latitude: -33.45, longitude: -70.66 },
    permissions: ['geolocation'],
  });
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
  expect(sent.share_url || sent.cotizacion.share_url || sent.cotizacion.url_publica).toBeTruthy();
  const baseToken = tokenFromShare(sent.share_url || sent.cotizacion.share_url || sent.cotizacion.url_publica);
  await ownerPage.getByRole('button', { name: 'Ahora no' }).click();
  await ownerPage.screenshot({ path: '/opt/cursor/artifacts/COTIZACION-ENVIADA-390.png', fullPage: true });

  const accepted = await respondPublic(browser, baseToken, 'aceptar');
  expect(accepted.estado).toBe('aceptada');
  const citaId = Number(accepted.cita_id);
  expect(citaId).toBeGreaterThan(0);

  const unscheduled = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(unscheduled.horario_por_confirmar).toBe(true);
  expect(unscheduled.miembro_taller ?? null).toBeNull();
  expect(unscheduled.estado).toBe('activa');
  expect(unscheduled.detalle.cliente_nombre).toBe(CLIENTE);
  expect(unscheduled.detalle.vehiculo_patente).toBe(PATENTE);

  await ownerPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  await ownerPage.setViewportSize({ width: 320, height: 700 });
  await ownerPage.screenshot({ path: '/opt/cursor/artifacts/CITA-SIN-HORARIO-320.png', fullPage: true });
  await ownerPage.setViewportSize({ width: 390, height: 844 });
  await ownerPage.screenshot({ path: '/opt/cursor/artifacts/CITA-SIN-HORARIO-390.png', fullPage: true });
  await ownerPage.getByRole('button', { name: 'Más acciones' }).click();
  await ownerPage.getByRole('button', { name: 'Asignar técnico' }).click();
  const visitaNombre = manifest.mechanic_visita.nombre;
  if (!visitaNombre) {
    throw new Error('El manifiesto no trae el nombre del técnico de la visita.');
  }
  await ownerPage.getByText(visitaNombre, { exact: true }).click();
  const assignWait = ownerPage.waitForResponse(
    (resp) => resp.url().includes('/asignar-mecanico/') && resp.request().method() === 'POST',
  );
  await ownerPage.getByRole('button', { name: 'Continuar al calendario' }).click();
  expect((await assignWait).ok()).toBeTruthy();
  await elegirHorarioEnGrilla(ownerPage, manifest.schedule_date);
  const cita = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(cita.horario_por_confirmar).toBe(false);
  expect(cita.miembro_taller).toBe(manifest.mechanic_visita.miembro_id);
  expect(cita.estado).toBe('activa');

  const mechanic = await login(request, manifest.mechanic_visita.email);
  const mechCtx = await browser.newContext({
    geolocation: { latitude: -33.45, longitude: -70.66 },
    permissions: ['geolocation'],
  });
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
  expect(extraSent.share_url || extraSent.cotizacion.share_url || extraSent.cotizacion.url_publica).toBeTruthy();
  await ownerPage.getByRole('button', { name: 'Ahora no' }).click();

  const baseStill = await (await request.get(`${API}/ordenes/cotizaciones-canal/${draft.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  const citaStill = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(baseStill.estado).toBe('aceptada');
  expect(citaStill.estado).toBe('activa');

  await mechPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  await answerSelect(mechPage, 'Revisar nivel de aceite', 'bueno');
  await answerSelect(mechPage, 'Estado de frenos', 'bueno');
  await answerNumber(mechPage, 'Presión de neumáticos', '32');
  await openChecklist(mechPage);
  const finalizeWait = mechPage.waitForResponse(
    (resp) => resp.url().includes('/finalize/') && resp.request().method() === 'POST',
  );
  await mechPage.getByRole('button', { name: 'Finalizar checklist' }).click();
  await drawAndConfirm(mechPage);
  const finalizeResp = await finalizeWait;
  const finalizeRaw = await finalizeResp.text();
  expect(finalizeResp.status(), finalizeRaw).toBe(200);
  const finalized = JSON.parse(finalizeRaw) as { requiere_firma_supervisor?: boolean };
  expect(finalized.requiere_firma_supervisor).toBe(true);
  await mechPage.getByRole('button', { name: 'Entendido' }).click();

  await ownerPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  const supervisorWait = ownerPage.waitForResponse(
    (resp) => resp.url().includes('/firmar-supervisor/') && resp.request().method() === 'POST',
  );
  await ownerPage.getByRole('button', { name: 'Revisar y firmar' }).click();
  await drawAndConfirm(ownerPage);
  const supervisorResp = await supervisorWait;
  const supervisorRaw = await supervisorResp.text();
  expect(supervisorResp.status(), supervisorRaw).toBe(200);
  const supervised = JSON.parse(supervisorRaw) as {
    informe: { via?: string; enviado?: boolean; token?: string };
  };
  expect(supervised.informe.via).toBe('manual_link');
  expect(supervised.informe.enviado).toBe(false);
  const informeToken = supervised.informe.token;
  expect(informeToken).toEqual(expect.any(String));
  if (!informeToken) {
    throw new Error(`Informe sin token: ${supervisorRaw}`);
  }
  await ownerPage.getByRole('button', { name: 'Entendido' }).click();
  const extraWhilePending = await (await request.get(`${API}/ordenes/cotizaciones-canal/${extra.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(extraWhilePending.estado).toBe('enviada');

  await signPublicInforme(browser, informeToken);
  const citaClosed = await (await request.get(`${API}/ordenes/citas-agenda-personal/${citaId}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(citaClosed.estado).toBe('cerrada');
  expect(citaClosed.checklist_estado).toBe('COMPLETADO');
  const extraStillPending = await (await request.get(`${API}/ordenes/cotizaciones-canal/${extra.id}/`, {
    headers: { Authorization: `Token ${owner.token}` },
  })).json();
  expect(extraStillPending.estado).toBe('enviada');
  await ownerPage.goto(`${BASE_URL}/cita-agenda-personal/${citaId}`);
  await ownerPage.screenshot({ path: '/opt/cursor/artifacts/CITA-BASE-COMPLETADA-390.png', fullPage: true });

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
  expect(citaAfter.estado).toBe('cerrada');
  expect(citaAfter.checklist_estado).toBe('COMPLETADO');
  expect(external, external.join('\n')).toEqual([]);
  console.log(`CONSENT base=${draft.id} cita=${citaId} extra=${extra.id} rejected token path ok`);
});

function minutesOf(label: string): number {
  const [hour, minute] = label.split(':').map((part) => Number(part));
  return hour * 60 + minute;
}

function dayChipName(iso: string): RegExp {
  const date = new Date(`${iso}T12:00:00`);
  const weekday = date.toLocaleDateString('es-CL', { weekday: 'short' }).replace(/\./g, '').trim();
  const month = date.toLocaleDateString('es-CL', { month: 'short' }).replace(/\./g, '').trim();
  return new RegExp(`${weekday}\\s+${date.getDate()}\\s+${month}`, 'i');
}

async function elegirHorarioEnGrilla(page: Page, scheduleDate: string) {
  const day = page.getByRole('button', { name: dayChipName(scheduleDate) });
  await expect(day).toBeVisible({ timeout: 20000 });
  const disponibilidad = page.waitForResponse(
    (resp) =>
      resp.url().includes('disponibilidad_agenda')
      && resp.url().includes(scheduleDate)
      && resp.request().method() === 'GET',
  );
  await day.click();
  const disp = await disponibilidad;
  const rawDisp = await disp.text();
  expect(disp.ok(), rawDisp).toBeTruthy();
  const data = JSON.parse(rawDisp) as {
    ventanas_libres?: { hora_inicio: string; hora_fin: string }[];
  };
  const ventana = (data.ventanas_libres ?? []).find(
    (item) => minutesOf(item.hora_fin) - minutesOf(item.hora_inicio) >= 60,
  );
  if (!ventana) {
    throw new Error(`La fecha ${scheduleDate} no tiene una ventana libre de al menos 60 minutos.`);
  }
  const inicio = ventana.hora_inicio;
  const finMinutos = minutesOf(inicio) + 60;
  const fin = `${String(Math.floor(finMinutos / 60)).padStart(2, '0')}:${String(finMinutos % 60).padStart(2, '0')}`;
  await page.getByRole('button', { name: inicio, exact: true }).first().click();
  await expect(page.getByText('Término', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: fin, exact: true }).last().click();
  const saved = page.waitForResponse(
    (resp) =>
      resp.url().includes('/citas-agenda-personal/')
      && !resp.url().includes('validar-slot')
      && resp.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Agendar cita' }).click();
  const resp = await saved;
  const raw = await resp.text();
  expect(resp.ok(), raw).toBeTruthy();
}

async function openChecklist(page: Page) {
  const listItem = page.getByText('Revisar nivel de aceite');
  const continuar = page.getByRole('button', { name: /Continuar checklist|Completar checklist/ });
  if (!(await listItem.first().isVisible().catch(() => false))) {
    await continuar.first().click();
  }
  await expect(listItem.first()).toBeVisible({ timeout: 15000 });
}

async function answerSelect(page: Page, label: string, option: string) {
  await openChecklist(page);
  await page.getByText(label, { exact: true }).click();
  await expect(page.getByTestId(`checklist-option-${option}`)).toBeVisible({ timeout: 15000 });
  const save = page.waitForResponse(
    (resp) => resp.url().includes('/api/checklists/responses/') && ['POST', 'PATCH'].includes(resp.request().method()),
    { timeout: 20000 },
  );
  await page.getByTestId(`checklist-option-${option}`).click();
  await page.getByRole('button', { name: /guardar|actualizar/i }).click();
  expect((await save).ok()).toBeTruthy();
  await page.getByRole('button', { name: /^ok$/i }).click();
}

async function answerNumber(page: Page, label: string, value: string) {
  await openChecklist(page);
  await page.getByText(label, { exact: true }).click();
  const field = page.getByPlaceholder('0');
  await expect(field).toBeVisible({ timeout: 15000 });
  const save = page.waitForResponse(
    (resp) => resp.url().includes('/api/checklists/responses/') && ['POST', 'PATCH'].includes(resp.request().method()),
    { timeout: 20000 },
  );
  await field.fill(value);
  await page.getByRole('button', { name: /guardar|actualizar/i }).click();
  expect((await save).ok()).toBeTruthy();
  await page.getByRole('button', { name: /^ok$/i }).click();
}

async function drawSignature(page: Page) {
  const canvas = page.locator('canvas').last();
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Signature canvas has no box');
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(180, box.width - 12), box.y + 90, { steps: 15 });
  await page.mouse.up();
}

async function drawAndConfirm(page: Page) {
  await drawSignature(page);
  await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
}

async function signPublicInforme(
  browser: { newContext: () => Promise<BrowserContext> },
  token: string,
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
    if (req.url().includes('/informes/') && req.headers().authorization) {
      authHeaders.push(req.headers().authorization);
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const responseWait = page.waitForResponse(
    (resp) => resp.url().includes(`/informes/${token}/firmar-cliente/`) && resp.request().method() === 'POST',
  );
  await page.goto(`${BASE_URL}/informe/${token}`);
  await expect(page.getByTestId('informe-publico-bearer')).toBeVisible();
  await expect(page.getByTestId('informe-publico-cliente')).toContainText(CLIENTE);
  await expect(page.getByTestId('informe-publico-servicio')).toContainText('Inspección de base autorizada');
  const trabajo = page.getByTestId('informe-publico-trabajo');
  await expect(trabajo).toContainText('Revisar nivel de aceite');
  await expect(trabajo).toContainText('bueno');
  await expect(trabajo).toContainText('Presión de neumáticos');
  await expect(trabajo).toContainText('32');
  await expect(trabajo).toContainText(HALLAZGO);
  await page.getByTestId('informe-publico-nombre').fill(CLIENTE);
  await page.screenshot({ path: '/opt/cursor/artifacts/INFORME-PUBLICO-FIRMAR-390.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: '/opt/cursor/artifacts/INFORME-PUBLICO-FIRMAR-320.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await drawSignature(page);
  await page.screenshot({ path: '/opt/cursor/artifacts/INFORME-PUBLICO-TRAZO-390.png', fullPage: true });
  await page.getByTestId('informe-publico-firmar').click();
  const response = await responseWait;
  const posted = response.request().postData() || '';
  expect(posted.includes('data:image/'), posted.slice(0, 80)).toBeTruthy();
  expect(posted.length).toBeGreaterThan(400);
  expect(response.status()).toBe(200);
  await expect(page.getByTestId('informe-publico-estado')).toContainText('FIRMADO');
  expect(authHeaders).toEqual([]);
  await ctx.close();
}

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
  if (active?.id && String(active.hora_fin || '') < '23:59:00') {
    const extended = await request.patch(`${API}/usuarios/horarios-proveedor/${active.id}/`, {
      headers: { Authorization: `Token ${token}` },
      data: { hora_fin: '23:59:00' },
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
