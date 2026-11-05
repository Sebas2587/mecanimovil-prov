import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

export type ReferenciaTiendaInput = {
  url_referencia?: string | null;
  tienda_referencia?: string | null;
  precio_verificado_clp?: number | null;
};

/** Texto compacto de la ficha. Null si no hay URL http(s). */
export function textoReferenciaTienda(
  rep: ReferenciaTiendaInput,
): { texto: string; url: string } | null {
  const url = String(rep.url_referencia || '').trim();
  if (!url || !esUrlHttp(url)) return null;
  const tienda = String(rep.tienda_referencia || '').trim();
  const raw = rep.precio_verificado_clp;
  const monto = raw == null || !Number.isFinite(Number(raw))
    ? ''
    : formatearMontoCLP(raw);
  return { texto: [tienda, monto].filter(Boolean).join(' '), url };
}

function esUrlHttp(url: string): boolean {
  try {
    const protocolo = new URL(url).protocol;
    return protocolo === 'http:' || protocolo === 'https:';
  } catch {
    return false;
  }
}
