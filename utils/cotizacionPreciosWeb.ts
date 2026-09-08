import { redondearCLP } from '@/utils/formatearMontoCLP';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';

export function busquedaWebPendiente(
  c?: { metadata?: { busqueda_web_estado?: string } } | null,
): boolean {
  return c?.metadata?.busqueda_web_estado === 'pendiente';
}

export function lineaTienePrecioUnitario(
  rep?: Pick<RepuestoCotizacion, 'precio_unitario_clp'> | null,
): boolean {
  return redondearCLP(rep?.precio_unitario_clp) > 0;
}

export function cotizacionTienePrecioRepuesto(
  c?: Pick<CotizacionCanal, 'repuestos'> | null,
): boolean {
  return (c?.repuestos ?? []).some(lineaTienePrecioUnitario);
}

/** No mostrar el editor vacío: la búsqueda web aún no trajo ningún precio. */
export function shouldHoldRevealForPrecios(c?: CotizacionCanal | null): boolean {
  return Boolean(c && busquedaWebPendiente(c) && !cotizacionTienePrecioRepuesto(c));
}
