/**
 * Tipos de motor — catálogo maestro y ofertas de proveedor.
 */

export type TipoMotorCodigo = 'GASOLINA' | 'DIESEL' | 'ELECTRICO' | 'HIBRIDO' | '';

const LABELS: Record<string, string> = {
  GASOLINA: 'Gasolina',
  DIESEL: 'Diésel',
  ELECTRICO: 'Eléctrico',
  HIBRIDO: 'Híbrido',
};

export function normalizeTipoMotor(value: unknown): TipoMotorCodigo {
  if (value == null || value === '') return '';
  const upper = String(value).toUpperCase().trim();
  if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) return 'DIESEL';
  if (upper.includes('ELECTR')) return 'ELECTRICO';
  if (upper.includes('HIBR') || upper.includes('HYBR')) return 'HIBRIDO';
  if (upper.includes('BENCINA') || upper.includes('GASOL')) return 'GASOLINA';
  if (['GASOLINA', 'DIESEL', 'ELECTRICO', 'HIBRIDO'].includes(upper)) return upper as TipoMotorCodigo;
  return '';
}

export function labelTipoMotor(codigo: string | null | undefined): string {
  const norm = normalizeTipoMotor(codigo);
  if (!norm) return 'Todos los motores';
  return LABELS[norm] || norm;
}

export function normalizeMotoresLista(raw: unknown): TipoMotorCodigo[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.map(normalizeTipoMotor).filter(Boolean) as TipoMotorCodigo[];
  return [...new Set(out)];
}

/** Catálogo vacío = universal (todos los motores). */
export function motoresCatalogoUniversal(motores: TipoMotorCodigo[]): boolean {
  return motores.length === 0;
}

/**
 * Selector de alcance solo si Django definió 2+ motores (precio distinto por motor).
 * Con 0 (universal) o 1 motor: la oferta hereda el catálogo sin elegir.
 */
export function requiereSelectorAlcanceMotor(motoresCatalogo: TipoMotorCodigo[]): boolean {
  return motoresCatalogo.length >= 2;
}

export function opcionesAlcanceMotor(motoresCatalogo: TipoMotorCodigo[]): {
  value: TipoMotorCodigo;
  label: string;
}[] {
  if (!requiereSelectorAlcanceMotor(motoresCatalogo)) {
    return [{ value: '', label: 'Todos los motores aplicables' }];
  }

  const opciones: { value: TipoMotorCodigo; label: string }[] = [
    {
      value: '',
      label: `Mismo precio (${motoresCatalogo.map(labelTipoMotor).join(', ')})`,
    },
  ];

  for (const m of motoresCatalogo) {
    opciones.push({ value: m, label: `Solo ${labelTipoMotor(m)}` });
  }
  return opciones;
}

export function resumenMotoresCatalogo(motoresCatalogo: TipoMotorCodigo[]): string {
  if (motoresCatalogoUniversal(motoresCatalogo)) {
    return 'Todos los tipos de motor';
  }
  return motoresCatalogo.map(labelTipoMotor).join(' · ');
}

/** Lee motores del catálogo desde fila API (tipos_motor_compatibles o motores_info). */
export function extractMotoresServicio(
  source?: { tipos_motor_compatibles?: unknown; motores_info?: unknown } | null,
): TipoMotorCodigo[] {
  if (!source) return [];
  const raw = source.tipos_motor_compatibles ?? source.motores_info;
  return normalizeMotoresLista(raw);
}
