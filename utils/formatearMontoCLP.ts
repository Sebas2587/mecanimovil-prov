/** Formatea montos CLP con hasta 2 decimales, sin redondear a entero. */
export function formatearMontoCLP(monto: number | string | null | undefined): string {
  if (monto == null || monto === '') return '$0';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (!Number.isFinite(num)) return '$0';
  const hasFraction = Math.abs(num - Math.trunc(num)) > 0.0001;
  const formatted = num.toLocaleString('es-CL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
}
