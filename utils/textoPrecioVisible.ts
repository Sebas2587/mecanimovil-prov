import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

export type PrecioVisibleInput = {
  precio_unitario_clp?: number | null;
  monto_clp?: number | null;
  precio_estimado?: boolean | null;
  estimada?: boolean | null;
  certeza?: string | null;
};

function montoDe(input: PrecioVisibleInput): number | null {
  const crudo = input.precio_unitario_clp ?? input.monto_clp;
  if (crudo == null) return null;
  const n = Number(crudo);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Nunca un $ vacío. Con monto: CLP. Si falta: Estimado o Por confirmar. */
export function textoPrecioVisible(input: PrecioVisibleInput): string {
  const monto = montoDe(input);
  if (monto != null) return formatearMontoCLP(monto);
  if (input.precio_estimado === true || input.estimada === true) return 'Estimado';
  if (String(input.certeza || '').trim() === 'asumido') return 'Estimado';
  return 'Por confirmar';
}
