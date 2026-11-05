/**
 * Redondeo a peso entero (half-up). El peso chileno no tiene decimales, así que todo
 * monto se expresa en pesos enteros, igual que la boleta del SII y que lo que cobra
 * Mercado Pago. Centraliza el criterio para que la app de proveedores muestre los
 * mismos enteros que el backend y la app de usuarios.
 */
export function redondearCLP(monto: number | string | null | undefined): number {
  const num = typeof monto === 'string' ? parseFloat(monto) : (monto ?? 0);
  if (!Number.isFinite(num as number)) return 0;
  return Math.round(num as number);
}

/**
 * Monto para mostrar en la ficha. Null, vacío o no numérico no se ven como $0.
 * El cero explícito sí se formatea.
 */
export function montoConocidoCLP(monto: unknown): string | null {
  if (monto == null) return null;
  if (typeof monto === 'number') {
    if (!Number.isFinite(monto)) return null;
    return formatearMontoCLP(monto);
  }
  if (typeof monto === 'string') {
    if (!monto.trim()) return null;
    const n = Number(monto.trim());
    if (!Number.isFinite(n)) return null;
    return formatearMontoCLP(n);
  }
  return null;
}

/** Formatea montos CLP como peso entero (sin decimales). */
export function formatearMontoCLP(monto: number | string | null | undefined): string {
  if (monto == null || monto === '') return '$0';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (!Number.isFinite(num)) return '$0';
  const formatted = redondearCLP(num).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${formatted}`;
}
