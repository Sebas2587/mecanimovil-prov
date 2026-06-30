/** Utilidades de contexto temporal para la tarjeta Finanzas del mes. */

export type ProgresoCalendarioMes = {
  diaActual: number;
  diasEnMes: number;
  pctTranscurrido: number;
  nombreMes: string;
};

export function progresoCalendarioMes(fechaRef = new Date()): ProgresoCalendarioMes {
  const diaActual = fechaRef.getDate();
  const diasEnMes = new Date(fechaRef.getFullYear(), fechaRef.getMonth() + 1, 0).getDate();
  const pctTranscurrido = Math.min(100, Math.round((diaActual / diasEnMes) * 100));
  const nombreMes = fechaRef.toLocaleDateString('es-CL', { month: 'long' });
  return { diaActual, diasEnMes, pctTranscurrido, nombreMes };
}

/** Proyección lineal al cierre del mes según ritmo diario acumulado. */
export function proyectarGananciasFinMes(totalActual: number, diaActual: number, diasEnMes: number): number | null {
  if (totalActual <= 0 || diaActual <= 0) return null;
  return Math.round((totalActual / diaActual) * diasEnMes);
}

/** Porcentaje del mes anterior ya alcanzado (mes completo anterior como referencia). */
export function pctDelMesAnterior(totalActual: number, totalMesAnterior: number): number | null {
  if (totalMesAnterior <= 0) return null;
  return Math.round((totalActual / totalMesAnterior) * 100);
}

export function formatearDeltaMesAnterior(deltaPct: number | null | undefined): {
  label: string;
  tone: 'up' | 'down' | 'neutral';
} {
  if (deltaPct == null || Number.isNaN(deltaPct)) {
    return { label: 'Sin datos del mes anterior', tone: 'neutral' };
  }
  if (deltaPct === 0) {
    return { label: 'Igual que el mes anterior', tone: 'neutral' };
  }
  const sign = deltaPct > 0 ? '+' : '';
  return {
    label: `${sign}${deltaPct}% vs mes anterior (total)`,
    tone: deltaPct > 0 ? 'up' : 'down',
  };
}
