/**
 * Libro de caja. Los números salen del API.
 * El neto es cobros menos devoluciones, no ganancia.
 * Un margen null no se calcula con el exigible.
 */

export const ZONA_CAJA = 'America/Santiago';
export const DIAS_MAXIMOS = 366;
export const ETIQUETA_NETO = 'Cobros menos devoluciones';

/** Un 0 del libro ya cargado sigue siendo cero. Este texto solo concuerda el conteo. */
export function textoPagosFuenteFuera(cantidad: number | null | undefined): string | null {
  if (cantidad == null || !Number.isFinite(cantidad) || cantidad <= 0) return null;
  if (cantidad === 1) return '1 pago de fuente no entra al libro.';
  return `${cantidad} pagos de fuente no entran al libro.`;
}

export function textoFilasSinEfecto(cantidad: number | null | undefined): string | null {
  if (cantidad == null || !Number.isFinite(cantidad) || cantidad <= 0) return null;
  if (cantidad === 1) return '1 fila no entra al libro.';
  return `${cantidad} filas no entran al libro.`;
}

/** Nombres que el API puede agregar para no pedir cada caso. */
export const CAMPOS_ETIQUETA_HUMANA = ['cliente_nombre', 'vehiculo_patente', 'folio'] as const;

export type GranularidadCaja = 'dia' | 'semana' | 'mes';
export type AnclaTipo = 'cita' | 'solicitud' | 'oferta';
export type TipoMovimiento = 'entrada' | 'reembolso';
export type ComponenteCobro = 'total' | 'repuestos' | 'servicio';
export type ComponenteCosto = 'repuestos' | 'servicio';
export type TipoCosto = 'registrado' | 'estimado';

export type ResumenCaja = {
  cobros_brutos_clp: number;
  reembolsos_clp: number;
  neto_clp: number;
  pendientes_no_sumados_clp: number;
  moneda: 'CLP';
  completo: boolean;
  conocido_parcial: boolean;
  /** Códigos, por ejemplo legacy_sin_movimiento o moneda_no_clp. No es un contador. */
  faltantes: string[];
  legacy_no_contabilizado: number;
};

export type BucketCaja = {
  inicio: string;
  fin: string;
  cobros_brutos_clp: number;
  reembolsos_clp: number;
  neto_clp: number;
};

export type MovimientoCaja = {
  id: string;
  ancla_tipo: AnclaTipo | string;
  ancla_id: string;
  componente: string;
  origen: string;
  ref_externa?: string | null;
  tipo: string;
  estado: string;
  monto_clp: number;
  moneda: string;
  contabiliza_clp: boolean;
  monto_origen?: number | null;
  fecha_efectiva: string;
  fecha_local: string;
  movimiento_origen_id?: string | null;
  motivo?: string | null;
  creado?: boolean;
  cliente_nombre?: string | null;
  vehiculo_patente?: string | null;
  folio?: string | null;
};

export type CasoCaja = {
  ancla_tipo: AnclaTipo | string;
  ancla_id: string;
  monto_exigible_clp: number | null;
  exigible_conocido: boolean;
  neto_acumulado_clp: number | null;
  saldo_clp: number | null;
  saldo_conocido: boolean;
  estado_pago: 'unknown' | 'pendiente' | 'parcial' | 'pagado' | string;
  exigible_fuente?: string | null;
  exigible_faltantes?: string[] | null;
  filas_sin_efecto_contable?: number | null;
  pendientes_no_sumados_clp?: number | null;
  costo_registrado_clp?: number | null;
  costo_estimado_clp?: number | null;
  resultado_caja_clp?: number | null;
  margen_real_clp?: number | null;
  margen_contratado_clp?: number | null;
  margen_estimado_clp?: number | null;
  margen_faltantes?: string[] | null;
  cliente_nombre?: string | null;
  vehiculo_patente?: string | null;
  folio?: string | null;
};

export type Pagina<T> = {
  count: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type LibroCaja = {
  zona: string;
  desde: string;
  hasta: string;
  granularidad: GranularidadCaja;
  resumen: ResumenCaja;
  serie: BucketCaja[];
  movimientos: Pagina<MovimientoCaja>;
  casos: Pagina<CasoCaja>;
};

export type CuerpoCobro = {
  ancla_tipo: AnclaTipo;
  ancla_id: string;
  tipo: TipoMovimiento;
  componente: ComponenteCobro;
  monto_clp: number;
  fecha_efectiva: string;
  movimiento_origen_id: string | null;
  motivo: string;
  confirmar_sobrepago: boolean;
};

export type CuerpoCosto = {
  ancla_tipo: AnclaTipo;
  ancla_id: string;
  componente: ComponenteCosto;
  tipo: TipoCosto;
  monto_clp: number;
  nota: string;
};

export type IntentoCaja<T> = {
  clave: string;
  cuerpo: T;
  /** True cuando el POST salió y no hubo respuesta. La clave y el cuerpo quedan fijos. */
  incierto?: boolean;
};

export type ClaseFallo = 'api_ausente' | 'ancla_ajena' | 'sin_permiso' | 'conflicto' | 'solicitud' | 'red';

export type FalloCaja = {
  clase: ClaseFallo;
  status: number | null;
  code: string;
  detail: string;
  mensaje: string;
};

export function esFalloCaja(error: unknown): error is FalloCaja {
  return Boolean(error && typeof error === 'object' && 'clase' in error && 'mensaje' in error);
}

const formatoFechaSantiago = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CAJA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function fechaSantiago(ahora = new Date()): string {
  return formatoFechaSantiago.format(ahora);
}

export function periodoMesHastaHoy(ahora = new Date()): { desde: string; hasta: string } {
  const hasta = fechaSantiago(ahora);
  const [anio, mes] = hasta.split('-');
  return { desde: `${anio}-${mes}-01`, hasta };
}

/** YYYY-MM-DD que existe en el calendario. 2026-02-31 no pasa. */
export function fechaRealIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const anio = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const probe = new Date(Date.UTC(anio, mes - 1, dia));
  return probe.getUTCFullYear() === anio
    && probe.getUTCMonth() === mes - 1
    && probe.getUTCDate() === dia;
}

/** El día de una fecha sola o de un instante. Null si el texto no trae un día. */
function prefijoDia(valor: string): string | null {
  const texto = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(texto)) return null;
  return texto.slice(0, 10);
}

/**
 * null cuando el cobro puede enviarse, solo como YYYY-MM-DD de un día real.
 * 2026-02-30 y 2026-02-30T15:04:00 no se envían: el servidor responde 400 y no inserta.
 */
export function motivoFechaCobro(valor: string): string | null {
  const texto = valor.trim();
  if (fechaRealIso(texto)) return null;
  const dia = prefijoDia(texto);
  if (dia && !fechaRealIso(dia)) {
    return 'La fecha efectiva no existe. El servidor no guarda ese cobro.';
  }
  return 'La fecha efectiva no existe. Usa un día real, con forma YYYY-MM-DD.';
}

export function etiquetaTipoMovimiento(tipo: string): string {
  if (tipo === 'entrada') return 'Cobro';
  if (tipo === 'reembolso') return 'Devolución';
  if (tipo === 'contracargo') return 'Contracargo';
  return tipo;
}

export function diasInclusivos(desde: string, hasta: string): number | null {
  if (!fechaRealIso(desde) || !fechaRealIso(hasta)) return null;
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio) return null;
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

export function validarPeriodo(desde: string, hasta: string): string | null {
  const imposible = [desde, hasta].some((valor) => {
    const dia = prefijoDia(valor);
    return dia != null && !fechaRealIso(dia);
  });
  if (imposible) return 'La fecha no existe. Revisa el día del mes.';
  const dias = diasInclusivos(desde, hasta);
  if (dias == null) return 'El período usa fechas YYYY-MM-DD y la fecha final no puede ser anterior.';
  if (dias > DIAS_MAXIMOS) return `El período admite como máximo ${DIAS_MAXIMOS} días.`;
  return null;
}

export function nuevaClaveIdempotencia(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `caja-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function claveParaIntento<T>(intento: IntentoCaja<T> | null, cuerpo: T): IntentoCaja<T> {
  if (intento?.incierto) return intento;
  const serial = JSON.stringify(cuerpo);
  if (intento && JSON.stringify(intento.cuerpo) === serial) return intento;
  return { clave: nuevaClaveIdempotencia(), cuerpo, incierto: false };
}

/** Sin estado, 408 o 5xx: el servidor pudo haber guardado y la respuesta no lo prueba. */
export function resultadoAmbiguo(status: number | null): boolean {
  if (status == null) return true;
  if (status === 408) return true;
  return status >= 500;
}

export function mensajeResultadoAmbiguo(
  status: number | null,
  lectura: false | 'mismo' | 'otro' | 'costo' = false,
): string {
  const cabeza = status == null
    ? 'No hubo respuesta del servidor.'
    : `El servidor no confirmó el resultado (${status}).`;
  if (lectura === 'mismo') {
    return `${cabeza} No se sabe si el libro cambió. Las cifras que siguen son del período ya cargado.`;
  }
  if (lectura === 'otro') {
    return `${cabeza} No se sabe si ese período cargó. No se muestran cifras de otro período.`;
  }
  if (lectura === 'costo') {
    return `${cabeza} No se sabe si el costo quedó guardado. No lo reintentes: podría duplicarse.`;
  }
  return `${cabeza} No se sabe si el cobro quedó guardado. Reintenta este mismo envío, con estos datos, antes de editarlo.`;
}

export type DuenoCaja = { usuarioId: string; tallerId: string };

export function duenoCaja(usuarioId: unknown, tallerId: unknown): DuenoCaja | null {
  const usuario = String(usuarioId ?? '').trim();
  const taller = String(tallerId ?? '').trim();
  if (!usuario || !taller || usuario === 'undefined' || taller === 'undefined') return null;
  return { usuarioId: usuario, tallerId: taller };
}

function claveDueno(dueno: DuenoCaja): string {
  return `${dueno.usuarioId}\n${dueno.tallerId}`;
}

const CLAVE_SESION_INTENTO = 'mecanimovil.caja.intento-incierto';
const intentosEnMemoria = new Map<string, IntentoCaja<CuerpoCobro>>();

function almacenamientoSesion(): Storage | null {
  try {
    const candidato = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!candidato || typeof candidato.getItem !== 'function') return null;
    return candidato;
  } catch {
    return null;
  }
}

type BolsaIntentos = Record<string, IntentoCaja<CuerpoCobro>>;

function leerBolsa(): BolsaIntentos {
  const raw = almacenamientoSesion()?.getItem(CLAVE_SESION_INTENTO);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const suelto = parsed as IntentoCaja<CuerpoCobro>;
    if (suelto.incierto && suelto.clave && suelto.cuerpo) {
      almacenamientoSesion()?.removeItem(CLAVE_SESION_INTENTO);
      return {};
    }
    return parsed as BolsaIntentos;
  } catch {
    return {};
  }
}

function escribirBolsa(bolsa: BolsaIntentos): void {
  const caja = almacenamientoSesion();
  if (!caja) return;
  if (Object.keys(bolsa).length === 0) caja.removeItem(CLAVE_SESION_INTENTO);
  else caja.setItem(CLAVE_SESION_INTENTO, JSON.stringify(bolsa));
}

/** El intento de esta cuenta y este taller. Otra identidad no lo ve y no lo borra. */
export function leerIntentoIncierto(dueno: DuenoCaja | null): IntentoCaja<CuerpoCobro> | null {
  if (!dueno) return null;
  const clave = claveDueno(dueno);
  const enMemoria = intentosEnMemoria.get(clave);
  if (enMemoria?.incierto) return enMemoria;
  const guardado = leerBolsa()[clave];
  if (!guardado?.incierto || !guardado.clave || !guardado.cuerpo) return null;
  intentosEnMemoria.set(clave, guardado);
  return guardado;
}

export function guardarIntentoIncierto(dueno: DuenoCaja | null, intento: IntentoCaja<CuerpoCobro> | null): void {
  if (!dueno) return;
  const clave = claveDueno(dueno);
  const fijo = intento?.incierto ? intento : null;
  if (fijo) intentosEnMemoria.set(clave, fijo);
  else intentosEnMemoria.delete(clave);
  const bolsa = leerBolsa();
  if (fijo) bolsa[clave] = fijo;
  else delete bolsa[clave];
  escribirBolsa(bolsa);
}

/** Limpia la memoria del proceso. No toca los intentos de otras pestañas. */
export function olvidarIntentosCaja(): void {
  intentosEnMemoria.clear();
}

export function cuerpoDesdeEntrada(movimiento: MovimientoCaja, ahora = new Date()): CuerpoCobro {
  const componente = movimiento.componente === 'repuestos' || movimiento.componente === 'servicio'
    ? movimiento.componente
    : 'total';
  const ancla = movimiento.ancla_tipo === 'solicitud' || movimiento.ancla_tipo === 'oferta'
    ? movimiento.ancla_tipo
    : 'cita';
  return {
    ancla_tipo: ancla,
    ancla_id: String(movimiento.ancla_id),
    tipo: 'reembolso',
    componente,
    monto_clp: movimiento.monto_clp,
    fecha_efectiva: fechaSantiago(ahora),
    movimiento_origen_id: movimiento.id,
    motivo: '',
    confirmar_sobrepago: false,
  };
}

export function entradaManualDevolvible(movimiento: MovimientoCaja): boolean {
  return movimiento.tipo === 'entrada'
    && String(movimiento.origen || '').toLowerCase() === 'manual'
    && Boolean(movimiento.id);
}

const NOMBRE_FALTANTE: Record<string, string> = {
  legacy_sin_movimiento: 'fuente sin movimiento',
  moneda_no_clp: 'otra moneda',
};

/** Lista de códigos. Un objeto o un ausente no se convierte en contador 0. */
export function textoFaltantesResumen(faltantes: unknown): string | null {
  if (!Array.isArray(faltantes)) return null;
  const nombres = faltantes
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .map((codigo) => NOMBRE_FALTANTE[codigo] || codigo);
  if (nombres.length === 0) return null;
  return `Faltan datos: ${nombres.join(', ')}.`;
}

const NOMBRE_ANCLA: Record<string, string> = {
  cita: 'Cita',
  solicitud: 'Solicitud',
  oferta: 'Oferta',
};

export function etiquetaAncla(tipo: string, id: string): string {
  return `${NOMBRE_ANCLA[tipo] || tipo} ${id}`;
}

/** La fila queda en el ancla que devolvió el POST, no en el que se escribió. */
export function anclaGuardada(
  pedido: { ancla_tipo: string; ancla_id: string },
  respuesta: { ancla_tipo?: string | null; ancla_id?: string | null },
): { ancla_tipo: string; ancla_id: string; distinta: boolean } {
  const tipo = String(respuesta.ancla_tipo || '').trim();
  const id = String(respuesta.ancla_id || '').trim();
  if (!tipo || !id) {
    return { ancla_tipo: pedido.ancla_tipo, ancla_id: pedido.ancla_id, distinta: false };
  }
  return {
    ancla_tipo: tipo,
    ancla_id: id,
    distinta: tipo !== pedido.ancla_tipo || id !== pedido.ancla_id,
  };
}

export function tituloHumano(fila: {
  ancla_tipo: string;
  ancla_id: string;
  cliente_nombre?: string | null;
  vehiculo_patente?: string | null;
  folio?: string | null;
}): { titulo: string; sinNombre: boolean } {
  const partes = [fila.cliente_nombre, fila.vehiculo_patente, fila.folio]
    .map((parte) => (parte || '').trim())
    .filter(Boolean);
  if (partes.length === 0) {
    return { titulo: etiquetaAncla(fila.ancla_tipo, fila.ancla_id), sinNombre: true };
  }
  return { titulo: partes.join(' · '), sinNombre: false };
}

export function textoSaldo(saldo: number | null, conocido: boolean): { texto: string; esCeroContable: boolean } {
  if (!conocido || saldo == null) {
    return { texto: 'Sin saldo contable', esCeroContable: false };
  }
  return { texto: String(saldo), esCeroContable: saldo === 0 };
}

function textoClave(caso: object, clave: string, incompleto: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(caso, clave)) return null;
  const valor = (caso as Record<string, unknown>)[clave];
  if (valor == null) return incompleto;
  return String(valor);
}

/**
 * No resta el exigible ni el costo. Null es incompleto. La clave ausente no se dibuja.
 */
export function textoMargenReal(caso: object): string | null {
  return textoClave(caso, 'margen_real_clp', 'Margen real incompleto');
}

export function textoResultadoCaja(caso: object): string | null {
  return textoClave(caso, 'resultado_caja_clp', 'Resultado de caja incompleto');
}

export function textoMargenContratado(caso: object): string | null {
  return textoClave(caso, 'margen_contratado_clp', 'Margen contratado incompleto');
}

export function textoMargenEstimado(caso: object): string | null {
  return textoClave(caso, 'margen_estimado_clp', 'Margen estimado incompleto');
}

export function notaExigible(caso: {
  exigible_fuente?: string | null;
  exigible_faltantes?: string[] | null;
}): string {
  const fuente = (caso.exigible_fuente || '').trim();
  const faltan = (caso.exigible_faltantes || []).map((item) => item.trim()).filter(Boolean);
  const partes = [
    fuente ? `Fuente ${fuente}` : '',
    faltan.length ? `Falta ${faltan.join(', ')}` : '',
  ].filter(Boolean);
  return partes.join('. ');
}

export function falloDesdeRespuesta(status: number | null, data: unknown): FalloCaja {
  const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const code = typeof body.code === 'string' ? body.code : '';
  const detail = typeof body.detail === 'string' ? body.detail : '';
  if (resultadoAmbiguo(status)) {
    return {
      clase: 'red',
      status,
      code,
      detail,
      mensaje: mensajeResultadoAmbiguo(status),
    };
  }
  if (status === 404 && code === 'ancla_ajena') {
    return { clase: 'ancla_ajena', status, code, detail, mensaje: 'Ese caso no es de este taller.' };
  }
  if (status === 404 && code === 'reverso_sin_origen') {
    return {
      clase: 'solicitud',
      status,
      code,
      detail,
      mensaje: detail || 'La devolución no encuentra el movimiento de origen.',
    };
  }
  if (status === 404) {
    return {
      clase: 'api_ausente',
      status,
      code,
      detail,
      mensaje: 'La caja no está publicada en el servidor. No es un período sin movimientos.',
    };
  }
  if (status === 403) {
    return {
      clase: 'sin_permiso',
      status,
      code: code || 'sin_permiso',
      detail,
      mensaje: detail || 'No tienes permiso para registrar este movimiento.',
    };
  }
  if (status === 409) {
    return { clase: 'conflicto', status, code, detail, mensaje: mensajeConflicto(code, detail) };
  }
  if (status === 400 && code === 'fecha_invalida') {
    return {
      clase: 'solicitud',
      status,
      code,
      detail,
      mensaje: 'La fecha no existe. El servidor no guardó el cobro.',
    };
  }
  return {
    clase: 'solicitud',
    status,
    code,
    detail,
    mensaje: detail || code || 'El servidor rechazó la solicitud.',
  };
}

function mensajeConflicto(code: string, detail: string): string {
  if (code === 'idempotencia_conflicto') return 'La misma clave llegó con otro cuerpo. No se reenvió.';
  if (code === 'reverso_excede_original') return 'La devolución supera el movimiento de origen.';
  if (code === 'reverso_mp_solo_webhook') return 'Una devolución de Mercado Pago solo entra por el webhook, no por este formulario.';
  if (code === 'reverso_ancla_distinta') return 'La devolución tiene que ser del mismo caso que la entrada.';
  if (code === 'sobrepago') return detail || 'El cobro supera lo exigible. Hay que confirmar el sobrepago para reintentar.';
  return detail || code || 'El servidor rechazó el movimiento.';
}

export function falloDesdeAxios(error: unknown): FalloCaja {
  const respuesta = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (!respuesta) return falloDesdeRespuesta(null, null);
  return falloDesdeRespuesta(respuesta.status ?? null, respuesta.data);
}
