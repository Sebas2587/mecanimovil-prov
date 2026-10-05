import {
  resolverManoObraLineas,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';

export type EstadoCotizacionVista =
  | 'borrador'
  | 'enviada'
  | 'aceptada'
  | 'agendada'
  | 'rechazada';

export const ESTADO_COTIZACION_LABEL: Record<EstadoCotizacionVista, string> = {
  borrador: 'Por revisar',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  agendada: 'Agendada',
  rechazada: 'Rechazada',
};

export function estadoCotizacionVista(
  cotizacion: Pick<CotizacionCanal, 'estado' | 'tiene_horario_agendado' | 'fecha_agendada'>,
): EstadoCotizacionVista {
  if (cotizacion.estado === 'borrador') return 'borrador';
  if (
    cotizacion.estado === 'rechazada'
    || cotizacion.estado === 'expirada'
    || cotizacion.estado === 'cancelada'
  ) {
    return 'rechazada';
  }
  if (cotizacion.estado === 'aceptada' && (cotizacion.tiene_horario_agendado || cotizacion.fecha_agendada)) {
    return 'agendada';
  }
  if (cotizacion.estado === 'aceptada') return 'aceptada';
  return 'enviada';
}

export function etiquetaEstadoCotizacion(
  cotizacion: Pick<CotizacionCanal, 'estado' | 'tiene_horario_agendado' | 'fecha_agendada' | 'visto_en'>,
): string {
  const vista = estadoCotizacionVista(cotizacion);
  if (vista === 'enviada' && cotizacion.visto_en) return 'Vista';
  if (cotizacion.estado === 'expirada') return 'Vencida';
  if (cotizacion.estado === 'cancelada') return 'Cancelada';
  return ESTADO_COTIZACION_LABEL[vista];
}

export function fechaCortaCotizacion(iso: string | null | undefined): string {
  if (!iso) return '';
  const dia = iso.includes('T') ? new Date(iso) : new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dia.getTime())) return '';
  return dia.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
}

export function fechaLargaCotizacion(iso: string | null | undefined): string {
  if (!iso) return '';
  const dia = iso.includes('T') ? new Date(iso) : new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dia.getTime())) return '';
  const texto = dia.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export type LineaDesglose = {
  id: string;
  label: string;
  monto: number;
  cantidad: number;
};

export function lineasDesgloseCotizacion(cotizacion: CotizacionCanal): LineaDesglose[] {
  const lineas: LineaDesglose[] = [];
  resolverManoObraLineas(cotizacion).forEach((linea, index) => {
    lineas.push({
      id: `mo-${linea.id || index}`,
      label: linea.nombre?.trim() || 'Mano de obra',
      monto: redondearCLP(linea.monto_clp),
      cantidad: 1,
    });
  });
  (cotizacion.repuestos ?? []).forEach((repuesto, index) => {
    const cantidad = Math.max(1, redondearCLP(repuesto.cantidad) || 1);
    lineas.push({
      id: `rp-${repuesto.id || index}`,
      label: repuesto.nombre?.trim() || 'Repuesto',
      monto: redondearCLP(cantidad * redondearCLP(repuesto.precio_unitario_clp)),
      cantidad,
    });
  });
  return lineas.filter((linea) => linea.label);
}

export function montoCotizacion(cotizacion: Pick<CotizacionCanal, 'total_clp'>): number {
  return redondearCLP(cotizacion.total_clp);
}
