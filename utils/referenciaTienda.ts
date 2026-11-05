import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

export type ReferenciaTiendaInput = {
  url_referencia?: string | null;
  tienda_referencia?: string | null;
  precio_verificado_clp?: number | null;
  casa_sugerida?: string | null;
  precio_verificado_en_casa?: boolean | null;
  nota_referencia?: string | null;
};

export type ReferenciaTiendaVista = {
  url: string | null;
  tienda: string;
  precio: string;
  casaSugerida: string;
  nota: string;
};

/** Ficha del link y casa sugerida por separado. Null si no hay nada que mostrar. */
export function vistaReferenciaTienda(rep: ReferenciaTiendaInput): ReferenciaTiendaVista | null {
  const urlRaw = String(rep.url_referencia || '').trim();
  const url = urlRaw && esUrlHttp(urlRaw) ? urlRaw : null;
  const tienda = String(rep.tienda_referencia || '').trim();
  const raw = rep.precio_verificado_clp;
  const precio = raw == null || !Number.isFinite(Number(raw)) ? '' : formatearMontoCLP(raw);
  const casaSugerida = String(rep.casa_sugerida || '').trim();
  const nota = notaSiNoEsLaCasa(rep, casaSugerida);
  if (!url) return null;
  return {
    url,
    tienda,
    precio,
    casaSugerida,
    nota,
  };
}

function notaSiNoEsLaCasa(rep: ReferenciaTiendaInput, casa: string): string {
  if (rep.precio_verificado_en_casa !== false) return '';
  const nota = String(rep.nota_referencia || '').trim();
  if (nota) return nota;
  if (casa) return `Precio no verificado en ${casa}.`;
  return 'Precio no verificado en la casa sugerida.';
}

function esUrlHttp(url: string): boolean {
  try {
    const protocolo = new URL(url).protocol;
    return protocolo === 'http:' || protocolo === 'https:';
  } catch {
    return false;
  }
}
