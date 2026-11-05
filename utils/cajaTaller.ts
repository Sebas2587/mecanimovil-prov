/**
 * Libro de caja. Los números salen del API.
 * El neto es cobros menos devoluciones, no ganancia.
 * Un margen null no se calcula con el exigible.
 */

export const ZONA_CAJA = 'America/Santiago';
export const DIAS_MAXIMOS = 366;
export const ETIQUETA_NETO = 'Cobros menos devoluciones';

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
  faltantes: { legacy_sin_movimiento?: number; moneda_no_clp?: number };
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

export function diasInclusivos(desde: string, hasta: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return null;
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio) return null;
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

export function validarPeriodo(desde: string, hasta: string): string | null {
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
  const serial = JSON.stringify(cuerpo);
  if (intento && JSON.stringify(intento.cuerpo) === serial) return intento;
  return { clave: nuevaClaveIdempotencia(), cuerpo };
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
  if (status == null) {
    return {
      clase: 'red',
      status,
      code,
      detail,
      mensaje: 'No hubo respuesta del servidor. El libro no cambió. Reintenta este mismo envío.',
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
