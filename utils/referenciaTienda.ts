import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

export type ReferenciaTiendaInput = {
  url_referencia?: string | null;
  url_producto?: string | null;
  tienda_referencia?: string | null;
  proveedor_nombre?: string | null;
  tienda_ml?: string | null;
  precio_verificado_clp?: number | null;
  casa_sugerida?: string | null;
  casa_repuesto_nombre?: string | null;
  precio_verificado_en_casa?: boolean | null;
  nota_referencia?: string | null;
  precio_estimado?: boolean | null;
  ganancia_estimada?: boolean | null;
  costo_origen?: string | null;
  certeza?: string | null;
  especificacion?: string | null;
  cantidad?: number | string | null;
};

export type ReferenciaTiendaVista = {
  url: string | null;
  tienda: string;
  precio: string;
  casaSugerida: string;
  nota: string;
};

function texto(valor: unknown): string {
  return String(valor || '').trim();
}

function esUrlHttp(url: string): boolean {
  try {
    const protocolo = new URL(url).protocol;
    return protocolo === 'http:' || protocolo === 'https:';
  } catch {
    return false;
  }
}

/** Link de la ficha que cotizó el precio. */
export function urlPrecioLinea(rep: ReferenciaTiendaInput): string | null {
  for (const crudo of [rep.url_producto, rep.url_referencia]) {
    const url = texto(crudo);
    if (url && esUrlHttp(url)) return url;
  }
  return null;
}

function mismaTienda(a: string, b: string): boolean {
  return Boolean(a) && Boolean(b) && a.toLocaleLowerCase('es-CL') === b.toLocaleLowerCase('es-CL');
}

/**
 * Tienda real del precio. Nunca casa_sugerida.
 * Cotizaciones viejas: casa_repuesto_nombre solo si no es la casa sugerida.
 */
export function tiendaPrecioLinea(rep: ReferenciaTiendaInput): string {
  const tienda = texto(rep.proveedor_nombre) || texto(rep.tienda_referencia);
  if (tienda) return tienda;
  const casaSugerida = texto(rep.casa_sugerida);
  const consolidada = texto(rep.casa_repuesto_nombre);
  if (consolidada && !mismaTienda(consolidada, casaSugerida)) return consolidada;
  return texto(rep.tienda_ml);
}

export function lineaPrecioEstimado(rep: ReferenciaTiendaInput): boolean {
  if (rep.precio_estimado === true) return true;
  if (rep.precio_estimado === false) return false;
  return texto(rep.certeza) === 'asumido' && !urlPrecioLinea(rep);
}

export function lineaGananciaEstimada(rep: ReferenciaTiendaInput): boolean {
  if (rep.ganancia_estimada === true) return true;
  if (rep.ganancia_estimada === false) return false;
  return lineaPrecioEstimado(rep);
}

/** Spec y envases. Vacío si no hay nada que agregar al nombre. */
export function textoEspecificacionLinea(rep: ReferenciaTiendaInput): string {
  const spec = texto(rep.especificacion);
  const cantidad = Number(rep.cantidad);
  const partes: string[] = [];
  if (spec) partes.push(spec);
  if (Number.isFinite(cantidad) && cantidad > 1) {
    partes.push(`${Math.round(cantidad)} un.`);
  }
  return partes.join(' · ');
}

function notaSiNoEsLaCasa(rep: ReferenciaTiendaInput, casa: string): string {
  if (rep.precio_verificado_en_casa === true) return '';
  const nota = texto(rep.nota_referencia);
  if (nota) return nota;
  if (rep.precio_verificado_en_casa !== false || !casa) return '';
  const tienda = tiendaPrecioLinea(rep);
  if (tienda && mismaTienda(tienda, casa)) return '';
  if (tienda) return `Precio referencial de ${tienda}, no verificado en ${casa}.`;
  return `Precio no verificado en ${casa}.`;
}

/** Ficha del link y casa sugerida por separado. Null si no hay nada que mostrar. */
export function vistaReferenciaTienda(rep: ReferenciaTiendaInput): ReferenciaTiendaVista | null {
  const url = urlPrecioLinea(rep);
  const tienda = tiendaPrecioLinea(rep);
  const raw = rep.precio_verificado_clp;
  const precio = raw == null || !Number.isFinite(Number(raw)) ? '' : formatearMontoCLP(raw);
  const casaSugerida = texto(rep.casa_sugerida);
  const nota = notaSiNoEsLaCasa(rep, casaSugerida);
  if (!url && !tienda && !casaSugerida && !nota) return null;
  return {
    url,
    tienda,
    precio,
    casaSugerida,
    nota,
  };
}
