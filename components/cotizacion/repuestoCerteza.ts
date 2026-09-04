import type {
  AlternativaRepuesto,
  CertezaPrecio,
  FuenteRepuesto,
  OpcionRepuesto,
  RepuestoCotizacion,
} from '@/services/cotizacionCanalService';

export const FAMILIAS_SENSIBLES_UI: Record<string, { label: string; opciones: string[] }> = {
  bujia: { label: 'Tipo de bujía', opciones: ['Cobre', 'Platino', 'Iridio'] },
  pastilla_freno: { label: 'Tipo de pastilla', opciones: ['Orgánica', 'Semi-metálica', 'Cerámica'] },
  aceite_motor: { label: 'Tipo de aceite', opciones: ['Mineral', 'Semi-sintético', 'Sintético'] },
  amortiguador: { label: 'Tipo', opciones: ['Hidráulico', 'Gas'] },
  bateria: { label: 'Tecnología', opciones: ['Convencional', 'EFB', 'AGM'] },
  disco_freno: { label: 'Tipo', opciones: ['Liso', 'Ventilado', 'Perforado'] },
};

export function certezaDe(rep: RepuestoCotizacion): CertezaPrecio {
  const raw = String(rep.certeza || '').trim();
  if (raw === 'confirmado' || raw === 'asumido' || raw === 'referencial' || raw === 'sin_precio') {
    return raw;
  }
  const fuente = (rep.fuente_marketplace || '').trim().toLowerCase();
  if (fuente === 'catalogo' || fuente === 'catálogo' || fuente === 'proveedor') return 'confirmado';
  if (fuente === 'historial' || fuente === 'web' || fuente === 'mercadolibre') return 'referencial';
  if ((rep.precio_unitario_clp || 0) > 0) return 'referencial';
  return 'sin_precio';
}

export function lineaPendientePrecio(rep: RepuestoCotizacion): boolean {
  const c = certezaDe(rep);
  return c !== 'confirmado' && c !== 'asumido';
}

export function familiaDe(rep: RepuestoCotizacion): string {
  if (rep.familia_sensible) return rep.familia_sensible;
  const n = (rep.nombre || '').toLowerCase();
  if (n.includes('buj')) return 'bujia';
  if (n.includes('pastilla') || n.includes('balata')) return 'pastilla_freno';
  if (n.includes('aceite')) return 'aceite_motor';
  if (n.includes('amortiguador')) return 'amortiguador';
  if (n.includes('bater')) return 'bateria';
  if (n.includes('disco') && n.includes('freno')) return 'disco_freno';
  return '';
}

export function opcionesFamilia(rep: RepuestoCotizacion): string[] {
  return FAMILIAS_SENSIBLES_UI[familiaDe(rep)]?.opciones ?? [];
}

export function labelFamilia(rep: RepuestoCotizacion): string {
  return FAMILIAS_SENSIBLES_UI[familiaDe(rep)]?.label || 'Especificación';
}

export function formatRangoClp(min?: number, max?: number): string | null {
  const a = Math.round(Number(min) || 0);
  const b = Math.round(Number(max) || 0);
  if (a <= 0 && b <= 0) return null;
  if (a > 0 && b > 0 && a !== b) {
    return `$${a.toLocaleString('es-CL')} – $${b.toLocaleString('es-CL')}`;
  }
  const v = b || a;
  return `$${v.toLocaleString('es-CL')}`;
}

const ETIQUETA_FUENTE: Record<string, string> = {
  proveedor: 'Mis precios',
  catalogo: 'Catálogo del taller',
  historial: 'Historial del taller',
  web: 'Tienda web',
  mercadolibre: 'Mercado Libre',
};

/** Fuentes trazables de la línea; cae al proveedor suelto si el backend es viejo. */
export function fuentesDe(rep: RepuestoCotizacion): FuenteRepuesto[] {
  const detalle = (rep.fuentes_detalle || []).filter((f) => f && (f.tienda || f.dominio || f.url));
  if (detalle.length) return detalle;
  const tienda = (rep.proveedor_nombre || rep.tienda_ml || '').trim();
  const fuente = (rep.fuente_marketplace || rep.fuente_repuesto || '').trim();
  if (!tienda && !fuente) return [];
  return [{
    fuente,
    tienda: tienda || ETIQUETA_FUENTE[fuente] || 'Referencia',
    precio_clp: rep.precio_marketplace_clp || rep.precio_unitario_clp,
    url: rep.url_producto || '',
  }];
}

function raizDominio(dominio: string): string {
  const partes = dominio.replace(/^www\./, '').split('.').filter(Boolean);
  return (partes.length >= 2 ? partes[partes.length - 2] : partes[0] || '').toLowerCase();
}

/** Nombre de tienda para mostrar; suma el dominio solo si dice algo nuevo. */
export function nombreFuente(f: FuenteRepuesto): string {
  const tienda = (f.tienda || '').trim();
  const dominio = (f.dominio || '').trim();
  const generico = ETIQUETA_FUENTE[f.fuente || ''] || 'Referencia';
  if (!dominio) return tienda || generico;
  const raiz = raizDominio(dominio);
  const tiendaNorm = tienda.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!tienda || (raiz && tiendaNorm.includes(raiz))) return tienda || dominio;
  return `${tienda} · ${dominio}`;
}

/** Nombre de la casa / tienda para chip; null si no hay fuente trazable. */
export function casaRepuestosLabel(rep: RepuestoCotizacion): string | null {
  const fuentes = fuentesDe(rep);
  if (!fuentes.length) return null;
  return fuentes.length > 1
    ? `${nombreFuente(fuentes[0])} +${fuentes.length - 1}`
    : nombreFuente(fuentes[0]);
}

/** Meta sin la casa: variante, marca y antigüedad. */
export function metaLineaTexto(rep: RepuestoCotizacion): string {
  const partes: string[] = [];
  const spec = (rep.especificacion || '').trim();
  if (spec) partes.push(spec);
  const marca = (rep.marca_repuesto || '').trim();
  if (marca) partes.push(marca);
  const edad = antigüedadLabel(rep.precio_capturado_en);
  if (edad) partes.push(edad);
  return partes.join(' · ');
}

/** Una línea de meta: variante, tienda y antigüedad, sin repetir el estado. */
export function metaLinea(rep: RepuestoCotizacion): string {
  return [metaLineaTexto(rep), casaRepuestosLabel(rep)].filter(Boolean).join(' · ');
}

/** Qué le falta a la línea para tener precio (y qué hacer). */
export function motivoSinPrecio(rep: RepuestoCotizacion): string | null {
  if (certezaDe(rep) !== 'sin_precio') return null;
  if (rep.especificacion_pendiente || rep.motivo_sin_precio === 'especificacion') {
    return 'Elige el tipo para poder cotizar: el precio cambia según la variante.';
  }
  return 'No encontramos referencia de precio. Escribe el monto o pídelo a tu casa de repuestos.';
}

/** Único chip de estado de la línea: qué tan firme es el precio. */
export function estadoLinea(
  rep: RepuestoCotizacion,
): { label: string; variant: 'success' | 'neutral' | 'info' | 'warning' | 'error' } {
  const certeza = certezaDe(rep);
  if (certeza === 'confirmado') return { label: 'Confirmado', variant: 'success' };
  if (certeza === 'asumido') return { label: 'Precio asumido', variant: 'neutral' };
  if (certeza === 'referencial') {
    const n = Number(rep.fuentes_n) || 0;
    return {
      label: n > 1 ? `Referencia · ${n} fuentes` : 'Referencia web',
      variant: 'info',
    };
  }
  if (rep.especificacion_pendiente || rep.motivo_sin_precio === 'especificacion') {
    return { label: 'Falta el tipo', variant: 'warning' };
  }
  return { label: 'Falta precio', variant: 'error' };
}

/** Cómo se llama la banda según de dónde viene. */
export function etiquetaBanda(rep: RepuestoCotizacion): string {
  return certezaDe(rep) === 'sin_precio' ? 'Referencia de mercado' : 'Rango real';
}

const CALIDAD_LABEL: Record<string, string> = {
  original: 'Original',
  oem: 'Equivalente OEM',
  alternativo: 'Alternativo',
};

export function calidadLabel(rep: RepuestoCotizacion | { calidad?: string } | null): string {
  const key = String(rep?.calidad || '').trim().toLowerCase();
  return CALIDAD_LABEL[key] || '';
}

export function origenOpcionLabel(op: OpcionRepuesto): string {
  if (op.es_proveedor_taller || op.fuente === 'proveedor') return 'mi casa';
  if (op.fuente === 'catalogo' || op.fuente === 'historial') return 'mis precios';
  return 'referencia web';
}

export function opcionesDe(rep: RepuestoCotizacion): OpcionRepuesto[] {
  if (Array.isArray(rep.opciones) && rep.opciones.length) {
    return rep.opciones.filter((o) => o && o.id);
  }
  const alts = (rep.alternativas || []) as AlternativaRepuesto[];
  const mapa: Record<string, string> = {
    economica: 'alternativo',
    equivalente: 'oem',
    premium: 'original',
  };
  return alts.map((alt, idx) => ({
    id: `alt-${idx}`,
    nombre: alt.nombre || rep.nombre,
    marca_repuesto: alt.marca_repuesto,
    especificacion: alt.especificacion,
    calidad: mapa[String(alt.etiqueta || '')] || '',
    precio_clp: alt.precio_clp,
    fuente: 'web',
    tienda: alt.proveedor_nombre,
    url: alt.url_producto,
  }));
}

export function antigüedadLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const horas = Math.round((Date.now() - d.getTime()) / 36e5);
  if (horas < 48) return null;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.max(1, Math.round(dias / 30));
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}
