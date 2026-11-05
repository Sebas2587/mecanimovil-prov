/**
 * Cobro visible para el dueño. No usa el avance del trabajo como prueba de pago
 * y no trata una cotización aceptada como dinero cobrado.
 */
export type CobroVisible = 'pagado' | 'por_cobrar' | 'sin_registro';

export type OrigenCobro = 'orden' | 'oferta' | 'cita' | 'cotizacion';

export type EvidenciaCobro = {
  origen: OrigenCobro;
  estado?: string | null;
  estadoPagoRepuestos?: string | null;
  estadoPagoServicio?: string | null;
};

export type CobroVista = {
  cobro: CobroVisible;
  etiqueta: 'Pagado' | 'Por cobrar' | 'Sin registro';
  tono: 'success' | 'warning' | 'neutral';
  /** Solo si un campo de pago lo dice. Vacío si no hay evidencia. */
  detalle: string;
  /** Cómo nombrar el monto del trabajo, sin llamarlo ganancia. */
  etiquetaMonto: 'Cobrado' | 'Por cobrar' | 'Total del trabajo';
  /** Aclaración cuando el monto no es un cobro registrado. */
  aclaracion: string;
};

const ETIQUETA: Record<CobroVisible, CobroVista['etiqueta']> = {
  pagado: 'Pagado',
  por_cobrar: 'Por cobrar',
  sin_registro: 'Sin registro',
};

const TONO: Record<CobroVisible, CobroVista['tono']> = {
  pagado: 'success',
  por_cobrar: 'warning',
  sin_registro: 'neutral',
};

const MONTO: Record<CobroVisible, CobroVista['etiquetaMonto']> = {
  pagado: 'Cobrado',
  por_cobrar: 'Por cobrar',
  sin_registro: 'Total del trabajo',
};

function limpio(valor: string | null | undefined): string {
  return String(valor ?? '').trim().toLowerCase();
}

function armar(cobro: CobroVisible, detalle = ''): CobroVista {
  const aclaracion = cobro === 'sin_registro'
    ? 'Este monto es del trabajo. No hay un pago registrado.'
    : '';
  return {
    cobro,
    etiqueta: ETIQUETA[cobro],
    tono: TONO[cobro],
    detalle,
    etiquetaMonto: MONTO[cobro],
    aclaracion,
  };
}

function detalleParcial(repuestos: string, servicio: string): string {
  if (repuestos === 'pagado' && servicio === 'pendiente') return 'Falta la mano de obra.';
  if (servicio === 'pagado' && repuestos === 'pendiente') return 'Faltan los repuestos.';
  if (repuestos === 'pagado' && servicio && servicio !== 'pagado' && servicio !== 'no_aplica') {
    return 'Falta una parte.';
  }
  if (servicio === 'pagado' && repuestos && repuestos !== 'pagado' && repuestos !== 'no_aplica') {
    return 'Falta una parte.';
  }
  return '';
}

function camposDicenPagado(repuestos: string, servicio: string): boolean {
  const repOk = repuestos === 'pagado' || repuestos === 'no_aplica';
  const servOk = servicio === 'pagado';
  return repOk && servOk && (repuestos === 'pagado' || servicio === 'pagado');
}

function camposDicenPendiente(repuestos: string, servicio: string): boolean {
  return repuestos === 'pendiente' || servicio === 'pendiente';
}

/**
 * Resuelve el cobro. Cita y cotización quedan en Sin registro: aceptarlas no es cobrar.
 * En orden y oferta, Pagado y Por cobrar salen solo de estados o campos de pago.
 */
export function resolverCobroTrabajo(evidencia: EvidenciaCobro): CobroVista {
  if (evidencia.origen === 'cita' || evidencia.origen === 'cotizacion') {
    return armar('sin_registro');
  }

  const estado = limpio(evidencia.estado);
  const repuestos = limpio(evidencia.estadoPagoRepuestos);
  const servicio = limpio(evidencia.estadoPagoServicio);
  const hayCampos = Boolean(repuestos || servicio);

  if (hayCampos && camposDicenPendiente(repuestos, servicio)) {
    return armar('por_cobrar', detalleParcial(repuestos, servicio) || 'Falta una parte.');
  }

  if (hayCampos && camposDicenPagado(repuestos, servicio)) {
    return armar('pagado');
  }

  if (estado === 'pagada') return armar('pagado');
  if (estado === 'pendiente_pago') return armar('por_cobrar');
  if (estado === 'pagada_parcialmente') {
    return armar('por_cobrar', detalleParcial(repuestos, servicio) || 'Falta una parte.');
  }

  return armar('sin_registro');
}
