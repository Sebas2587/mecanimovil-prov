import cotizacionCanalService, {
  type CotizacionCanal,
  type RepuestoCotizacion,
} from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';

export const ESPERA_PRECIOS_WEB_MS = 90_000;

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

/** Pieza con nombre real, sin catálogo/historial, todavía sin monto de tienda. */
export function lineaNecesitaBusquedaPrecio(rep: RepuestoCotizacion): boolean {
  const nombre = (rep.nombre || '').trim().toLowerCase();
  if (!nombre || nombre === 'repuesto') return false;
  const key = (rep.fuente_marketplace || '').trim().toLowerCase();
  if (key === 'catalogo' || key === 'catálogo' || key === 'historial') return false;
  return !lineaTienePrecioUnitario(rep);
}

export function cotizacionTienePrecioRepuesto(
  c?: Pick<CotizacionCanal, 'repuestos'> | null,
): boolean {
  return (c?.repuestos ?? []).some(lineaTienePrecioUnitario);
}

export function resumenPreciosRepuestos(c?: Pick<CotizacionCanal, 'repuestos'> | null): {
  total: number;
  conTienda: number;
  sinTienda: number;
  lineasSinTienda: RepuestoCotizacion[];
} {
  const reps = c?.repuestos ?? [];
  const lineasSinTienda = reps.filter(lineaNecesitaBusquedaPrecio);
  return {
    total: reps.length,
    conTienda: reps.filter(lineaTienePrecioUnitario).length,
    sinTienda: lineasSinTienda.length,
    lineasSinTienda,
  };
}

/** No mostrar el editor vacío: la búsqueda web aún no trajo ningún precio. */
export function shouldHoldRevealForPrecios(c?: CotizacionCanal | null): boolean {
  return Boolean(c && busquedaWebPendiente(c) && !cotizacionTienePrecioRepuesto(c));
}

/** Espera la búsqueda en curso y, si quedan piezas en $0, lanza una segunda pasada. */
export async function esperarPreciosYReintentarSiFaltan(
  cot: CotizacionCanal,
  opts?: { onTick?: (cotizacion: CotizacionCanal) => void },
): Promise<CotizacionCanal> {
  let lista = cot;
  const onTick = opts?.onTick;
  if (lista.id && busquedaWebPendiente(lista)) {
    lista = await cotizacionCanalService.esperarPreciosWeb(lista.id, {
      maxMs: ESPERA_PRECIOS_WEB_MS,
      onTick,
    });
  }
  const faltan = resumenPreciosRepuestos(lista).lineasSinTienda;
  if (!lista.id || !faltan.length || busquedaWebPendiente(lista)) return lista;
  const ids = faltan.map((r) => String(r.id || '')).filter(Boolean);
  const res = await cotizacionCanalService.cotizarItems(lista.id, {
    nombres: [],
    repuestos: lista.repuestos ?? [],
    repuesto_ids: ids,
  });
  lista = res.cotizacion;
  onTick?.(lista);
  if ((res.busqueda_web || busquedaWebPendiente(lista)) && lista.id) {
    lista = await cotizacionCanalService.esperarPreciosWeb(lista.id, {
      maxMs: ESPERA_PRECIOS_WEB_MS,
      onTick,
    });
  }
  return lista;
}
