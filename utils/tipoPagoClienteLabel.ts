/** Etiquetas del plan de pago elegido por el cliente (3 opciones en app usuarios). */

export type MetodoPagoCliente =
  | 'repuestos_adelantado'
  | 'todo_adelantado'
  | 'cliente_compra_repuestos'
  | 'pendiente';

export type OfertaCamposPago = {
  metodo_pago_cliente?: MetodoPagoCliente | string | null;
  estado_pago_repuestos?: 'no_aplica' | 'pendiente' | 'pagado' | string | null;
  estado_pago_servicio?: 'pendiente' | 'pagado' | string | null;
  incluye_repuestos?: boolean;
  costo_repuestos?: string | number | null;
  costo_gestion_compra?: string | number | null;
  estado?: string;
};

const PLAN_LABELS: Record<MetodoPagoCliente, string> = {
  repuestos_adelantado: 'Repuestos ahora',
  todo_adelantado: 'Pago total ahora',
  cliente_compra_repuestos: 'Repuestos por el cliente',
  pendiente: '',
};

function ofertaTieneRepuestosCotizados(oferta: OfertaCamposPago): boolean {
  if (!oferta.incluye_repuestos) return false;
  const rep = parseFloat(String(oferta.costo_repuestos ?? '0')) || 0;
  const gest = parseFloat(String(oferta.costo_gestion_compra ?? '0')) || 0;
  return rep > 0 || gest > 0;
}

export function resolverMetodoPagoCliente(oferta: OfertaCamposPago): MetodoPagoCliente {
  const metodo = oferta.metodo_pago_cliente;
  if (
    metodo === 'repuestos_adelantado' ||
    metodo === 'todo_adelantado' ||
    metodo === 'cliente_compra_repuestos'
  ) {
    return metodo;
  }

  const repPagado = oferta.estado_pago_repuestos === 'pagado';
  const servPagado = oferta.estado_pago_servicio === 'pagado';
  if (
    !repPagado &&
    servPagado &&
    ofertaTieneRepuestosCotizados(oferta)
  ) {
    return 'cliente_compra_repuestos';
  }

  return 'pendiente';
}

export function getEstadoPagoActualLabel(oferta: OfertaCamposPago): string {
  const plan = resolverMetodoPagoCliente(oferta);
  const rep = oferta.estado_pago_repuestos;
  const serv = oferta.estado_pago_servicio;

  if (plan === 'repuestos_adelantado') {
    if (rep === 'pagado' && serv === 'pendiente') return 'Repuestos pagados · falta mano de obra';
    if (rep === 'pagado' && serv === 'pagado') return 'Pago completo';
    if (rep === 'pendiente') return 'Pendiente: pago de repuestos';
    return 'Plan: repuestos primero';
  }

  if (plan === 'todo_adelantado') {
    if (rep === 'pagado' && serv === 'pagado') return 'Todo pagado';
    return 'Pendiente: pago total';
  }

  if (plan === 'cliente_compra_repuestos') {
    if (serv === 'pagado') return 'Mano de obra pagada';
    return 'Pendiente: pago mano de obra';
  }

  if (rep === 'pagado' && serv === 'pendiente') return 'Repuestos pagados · falta mano de obra';
  if (rep === 'pagado' && serv === 'pagado') return 'Pago completo';
  if (serv === 'pagado') return 'Mano de obra pagada';

  return '';
}

export type ResumenTipoPagoCliente = {
  visible: boolean;
  metodo: MetodoPagoCliente;
  planLabel: string;
  estadoLabel: string;
  lineaCompleta: string;
};

const ESTADOS_CON_PAGO = new Set([
  'pendiente_pago',
  'pagada_parcialmente',
  'pagada',
  'en_ejecucion',
  'completada',
]);

export function getResumenTipoPagoCliente(oferta: OfertaCamposPago): ResumenTipoPagoCliente {
  const metodo = resolverMetodoPagoCliente(oferta);
  const planLabel = PLAN_LABELS[metodo];
  const estadoLabel = getEstadoPagoActualLabel(oferta);

  const huboPago =
    oferta.estado_pago_repuestos === 'pagado' || oferta.estado_pago_servicio === 'pagado';
  const visible =
    metodo !== 'pendiente' ||
    huboPago ||
    (oferta.estado != null && ESTADOS_CON_PAGO.has(oferta.estado));

  const lineaCompleta =
    planLabel && estadoLabel
      ? `${planLabel} · ${estadoLabel}`
      : planLabel || estadoLabel;

  return {
    visible: visible && Boolean(lineaCompleta),
    metodo,
    planLabel,
    estadoLabel,
    lineaCompleta,
  };
}
