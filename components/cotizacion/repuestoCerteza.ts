import type { CertezaPrecio, RepuestoCotizacion } from '@/services/cotizacionCanalService';

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
