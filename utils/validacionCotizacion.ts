export const ESTADOS_VALIDACION = [
  'ok',
  'sin_referencia_valida',
  'requiere_revision',
  'asumido',
] as const;

export type EstadoValidacion = (typeof ESTADOS_VALIDACION)[number];

export type TonoValidacion = 'success' | 'neutral' | 'warning' | 'error';

export type VistaValidacion = {
  estado: EstadoValidacion;
  etiqueta: string;
  tono: TonoValidacion;
  motivo: string;
  alertas: string[];
  colapsable: boolean;
};

export type AlertaValidacionVista = {
  repuesto: string;
  estado: EstadoValidacion | '';
  etiqueta: string;
  tono: TonoValidacion | null;
  motivo: string;
  alertas: string[];
  colapsable: boolean;
};

const UMBRAL_CARACTERES = 180;
const UMBRAL_ALERTAS = 2;

const POR_ESTADO: Record<EstadoValidacion, { etiqueta: string; tono: TonoValidacion }> = {
  ok: { etiqueta: 'Verificado', tono: 'success' },
  asumido: { etiqueta: 'Precio asumido', tono: 'neutral' },
  sin_referencia_valida: { etiqueta: 'Sin referencia válida', tono: 'warning' },
  requiere_revision: { etiqueta: 'Requiere revisión', tono: 'error' },
};

export function esEstadoValidacion(valor: unknown): valor is EstadoValidacion {
  return typeof valor === 'string' && (ESTADOS_VALIDACION as readonly string[]).includes(valor);
}

export function textosAlertas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((item) => String(item ?? '').trim()).filter(Boolean);
}

/** Quita alertas que repiten el motivo u otra alerta ya listada. */
export function alertasSinDuplicar(motivo: string, alertas: string[]): string[] {
  const visto = new Set<string>();
  const motivoClave = motivo.trim().toLowerCase();
  if (motivoClave) visto.add(motivoClave);
  const salida: string[] = [];
  for (const alerta of alertas) {
    const clave = alerta.trim().toLowerCase();
    if (!clave || visto.has(clave)) continue;
    visto.add(clave);
    salida.push(alerta);
  }
  return salida;
}

export function detalleEsLargo(motivo: string, alertas: string[]): boolean {
  if (alertas.length > UMBRAL_ALERTAS) return true;
  const largo = motivo.length + alertas.join(' ').length;
  return largo > UMBRAL_CARACTERES;
}

export function vistaValidacionLinea(rep: {
  validacion_estado?: string | null;
  validacion_motivo?: string | null;
  alertas?: unknown;
} | null | undefined): VistaValidacion | null {
  if (!rep || !esEstadoValidacion(rep.validacion_estado)) return null;
  const meta = POR_ESTADO[rep.validacion_estado];
  const motivo = rep.validacion_estado === 'ok'
    ? ''
    : String(rep.validacion_motivo ?? '').trim();
  const alertas = alertasSinDuplicar(motivo, textosAlertas(rep.alertas));
  return {
    estado: rep.validacion_estado,
    etiqueta: meta.etiqueta,
    tono: meta.tono,
    motivo,
    alertas,
    colapsable: detalleEsLargo(motivo, alertas),
  };
}

export function alertasValidacionVisibles(valor: unknown): AlertaValidacionVista[] {
  if (!Array.isArray(valor)) return [];
  const salida: AlertaValidacionVista[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const fila = item as {
      repuesto?: unknown;
      estado?: unknown;
      motivo?: unknown;
      alertas?: unknown;
    };
    const estado = esEstadoValidacion(fila.estado) ? fila.estado : '';
    const meta = estado ? POR_ESTADO[estado] : null;
    const motivo = estado === 'ok' ? '' : String(fila.motivo ?? '').trim();
    const alertas = alertasSinDuplicar(motivo, textosAlertas(fila.alertas));
    const repuesto = String(fila.repuesto ?? '').trim();
    if (!repuesto && !motivo && alertas.length === 0 && !estado) continue;
    salida.push({
      repuesto,
      estado,
      etiqueta: meta?.etiqueta ?? '',
      tono: meta?.tono ?? null,
      motivo,
      alertas,
      colapsable: detalleEsLargo(motivo, alertas),
    });
  }
  return salida;
}
