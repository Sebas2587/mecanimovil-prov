import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';

/** Overlay: no repetir 90s+90s. El worker sigue; el editor ya muestra el borrador. */
export const ESPERA_PRECIOS_WEB_MS = 45_000;
export const HOLD_REVEAL_PRECIOS_MS = 50_000;

export function busquedaWebPendiente(
  c?: { metadata?: { busqueda_web_estado?: string } } | null,
): boolean {
  return c?.metadata?.busqueda_web_estado === 'pendiente';
}

export function esBorradorGeneradoPorAgente(
  c?: { metadata?: { origen?: string } } | null,
): boolean {
  const origen = (c?.metadata?.origen || '').trim();
  return origen === 'agente_ia' || origen === 'catalogo_taller' || origen === 'plantilla_auto';
}

export function precioUnitarioEfectivo(
  rep?: Pick<RepuestoCotizacion, 'precio_unitario_clp' | 'precio_max_clp' | 'precio_min_clp'> | null,
): number {
  const unitario = redondearCLP(rep?.precio_unitario_clp);
  if (unitario > 0) return unitario;
  const techo = redondearCLP(rep?.precio_max_clp);
  if (techo > 0) return techo;
  return redondearCLP(rep?.precio_min_clp);
}

export function hidratarPreciosCotizacion(c: CotizacionCanal): CotizacionCanal {
  if (!esBorradorGeneradoPorAgente(c)) return c;
  const reps = (c.repuestos ?? []).map((rep) => {
    const unitario = redondearCLP(rep.precio_unitario_clp);
    const techo = precioUnitarioEfectivo(rep);
    if (unitario > 0 || techo <= 0) return rep;
    const certeza = String(rep.certeza || '').trim();
    return {
      ...rep,
      precio_unitario_clp: techo,
      certeza: !certeza || certeza === 'sin_precio' ? 'asumido' : rep.certeza,
    };
  });
  return { ...c, repuestos: reps };
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

/** Kit/inyector/turbo: Tavily + año + ficha exacta. Un filtro de aceite no. */
export function lineaEsRepuestoDeFichaExigente(
  rep?: Pick<RepuestoCotizacion, 'nombre'> | null,
): boolean {
  const n = (rep?.nombre || '').toLowerCase();
  if (!n) return false;
  return /embrague|clutch|inyector|turbo|kit de distribuci|kit distribuci/.test(n);
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
  fichaExigente: boolean;
} {
  const reps = c?.repuestos ?? [];
  const lineasSinTienda = reps.filter(lineaNecesitaBusquedaPrecio);
  return {
    total: reps.length,
    conTienda: reps.filter(lineaTienePrecioUnitario).length,
    sinTienda: lineasSinTienda.length,
    lineasSinTienda,
    fichaExigente: reps.some(lineaEsRepuestoDeFichaExigente),
  };
}

/** No mostrar el editor vacío: la búsqueda web aún no trajo ningún precio. */
export function shouldHoldRevealForPrecios(c?: CotizacionCanal | null): boolean {
  if (esBorradorGeneradoPorAgente(c)) return false;
  return Boolean(c && busquedaWebPendiente(c) && !cotizacionTienePrecioRepuesto(c));
}

/** Espera la búsqueda en curso y, si quedan piezas en $0, lanza una segunda pasada sin bloquear. */
export async function esperarPreciosYReintentarSiFaltan(
  cot: CotizacionCanal,
  opts?: { onTick?: (cotizacion: CotizacionCanal) => void },
): Promise<CotizacionCanal> {
  const { default: cotizacionCanalService } = await import('@/services/cotizacionCanalService');
  let lista = cot;
  const onTick = opts?.onTick;
  if (lista.id && busquedaWebPendiente(lista) && !esBorradorGeneradoPorAgente(lista)) {
    lista = await cotizacionCanalService.esperarPreciosWeb(lista.id, {
      maxMs: ESPERA_PRECIOS_WEB_MS,
      onTick,
    });
  }
  if (esBorradorGeneradoPorAgente(lista)) return hidratarPreciosCotizacion(lista);
  const faltan = resumenPreciosRepuestos(lista).lineasSinTienda;
  if (!lista.id || !faltan.length || busquedaWebPendiente(lista)) return lista;
  const ids = faltan.map((r) => String(r.id || '')).filter(Boolean);
  try {
    const res = await cotizacionCanalService.cotizarItems(lista.id, {
      nombres: [],
      repuestos: lista.repuestos ?? [],
      repuesto_ids: ids,
    });
    lista = res.cotizacion;
    onTick?.(lista);
  } catch {
    // El editor muestra el borrador; el taller pulsa Buscar si hace falta.
  }
  return lista;
}
