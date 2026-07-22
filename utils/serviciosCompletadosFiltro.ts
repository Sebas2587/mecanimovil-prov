import type { OrdenActivaItem } from '@/utils/ordenProveedorUnificada';
import { parseFechaLocal } from '@/utils/fechaLocal';
import { progresoCalendarioMes } from '@/utils/finanzasMes';

export type CanalServiciosCompletados = 'todos' | 'app' | 'propias';
export type MesServiciosCompletados = 'actual';

export type FiltroServiciosCompletados = {
  canal: CanalServiciosCompletados;
  mes?: MesServiciosCompletados;
};

export function rangoMesCalendario(fechaRef = new Date()): { inicio: Date; fin: Date } {
  const y = fechaRef.getFullYear();
  const m = fechaRef.getMonth();
  return {
    inicio: new Date(y, m, 1, 0, 0, 0, 0),
    fin: new Date(y, m + 1, 0, 23, 59, 59, 999),
  };
}

function fechaEnRango(d: Date, inicio: Date, fin: Date): boolean {
  const t = d.getTime();
  return t >= inicio.getTime() && t <= fin.getTime();
}

function parseFechaServicio(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  return parseFechaLocal(String(fecha).split('T')[0]);
}

/** Alineado con ventana backend: fecha_servicio o cierre/solicitud en el mes. */
export function itemServicioEnMesActual(item: OrdenActivaItem, fechaRef = new Date()): boolean {
  const { inicio, fin } = rangoMesCalendario(fechaRef);

  if (item.origen === 'personal') {
    const { cita } = item;
    const fs = parseFechaServicio(cita.fecha_servicio);
    if (fs && fechaEnRango(fs, inicio, fin)) return true;
    if (cita.cerrada_en) {
      const ce = new Date(cita.cerrada_en);
      if (!Number.isNaN(ce.getTime()) && fechaEnRango(ce, inicio, fin)) return true;
    }
    return false;
  }

  const orden = item.orden;
  if (orden?.fecha_servicio) {
    const fs = parseFechaServicio(String(orden.fecha_servicio));
    if (fs && fechaEnRango(fs, inicio, fin)) return true;
  }
  if (orden?.fecha_hora_solicitud) {
    const sol = new Date(orden.fecha_hora_solicitud);
    if (!Number.isNaN(sol.getTime()) && fechaEnRango(sol, inicio, fin)) return true;
  }

  const oferta = item.oferta;
  if (oferta?.fecha_envio) {
    const fe = new Date(oferta.fecha_envio);
    if (!Number.isNaN(fe.getTime()) && fechaEnRango(fe, inicio, fin)) return true;
  }

  return false;
}

export function filtrarPorCanal(
  items: OrdenActivaItem[],
  canal: CanalServiciosCompletados,
): OrdenActivaItem[] {
  if (canal === 'todos') return items;
  if (canal === 'app') return items.filter((i) => i.origen === 'mecanimovil');
  return items.filter((i) => i.origen === 'personal');
}

export function filtrarServiciosCompletados(
  items: OrdenActivaItem[],
  filtro: FiltroServiciosCompletados,
  fechaRef = new Date(),
): OrdenActivaItem[] {
  let result = filtrarPorCanal(items, filtro.canal);
  if (filtro.mes === 'actual') {
    result = result.filter((item) => itemServicioEnMesActual(item, fechaRef));
  }
  return result;
}

export function parseCanalServiciosCompletados(
  value: string | string[] | undefined,
): CanalServiciosCompletados {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'app' || raw === 'propias') return raw;
  return 'todos';
}

export function parseMesServiciosCompletados(
  value: string | string[] | undefined,
): MesServiciosCompletados | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'actual' ? 'actual' : undefined;
}

export function etiquetaFiltroServiciosCompletados(filtro: FiltroServiciosCompletados): string {
  const partes: string[] = [];
  if (filtro.mes === 'actual') {
    partes.push(progresoCalendarioMes().nombreMes);
  }
  if (filtro.canal === 'app') partes.push('App Mecanimovil');
  else if (filtro.canal === 'propias') partes.push('Propias');
  return partes.length > 0 ? partes.join(' · ') : 'Todos';
}

export function tieneFiltroServiciosCompletados(filtro: FiltroServiciosCompletados): boolean {
  return filtro.canal !== 'todos' || filtro.mes === 'actual';
}
