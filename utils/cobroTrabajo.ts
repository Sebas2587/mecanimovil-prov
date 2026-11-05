/**
 * Cobro visible para el dueño. El avance del trabajo no prueba un pago.
 *
 * Contrato que falta para la etapa 2: `Orden` (proveedor-ordenes) y el ítem de
 * pipeline no garantizan `estado_pago_repuestos` ni `estado_pago_servicio`.
 * Esos campos sí existen en `OfertaProveedor`. Si la orden no los trae, un
 * estado `en_ejecucion` o `completado` no puede conservar «Pagado».
 */
export type CobroVisible = 'pagado' | 'por_cobrar' | 'sin_informacion';

export type OrigenCobro = 'orden' | 'oferta' | 'cita' | 'cotizacion';

export type EvidenciaCobro = {
  origen: OrigenCobro;
  estado?: string | null;
  estadoPagoRepuestos?: string | null;
  estadoPagoServicio?: string | null;
};

export type CobroVista = {
  cobro: CobroVisible;
  etiqueta: 'Pagado' | 'Por cobrar' | 'Pago sin información';
  tono: 'success' | 'warning' | 'neutral';
  /** Solo si un campo de pago lo dice. Vacío si no hay evidencia. */
  detalle: string;
  /** Cómo nombrar el monto del trabajo, sin llamarlo ganancia. */
  etiquetaMonto: 'Cobrado' | 'Por cobrar' | 'Total del trabajo';
  /** Aclaración cuando el monto no prueba un cobro. */
  aclaracion: string;
};

const ETIQUETA: Record<CobroVisible, CobroVista['etiqueta']> = {
  pagado: 'Pagado',
  por_cobrar: 'Por cobrar',
  sin_informacion: 'Pago sin información',
};

const TONO: Record<CobroVisible, CobroVista['tono']> = {
  pagado: 'success',
  por_cobrar: 'warning',
  sin_informacion: 'neutral',
};

const MONTO: Record<CobroVisible, CobroVista['etiquetaMonto']> = {
  pagado: 'Cobrado',
  por_cobrar: 'Por cobrar',
  sin_informacion: 'Total del trabajo',
};

const ESTADOS_PAGO_COMPLETO = new Set(['pagada']);
const ESTADOS_PAGO_PENDIENTE = new Set(['pendiente_pago']);
const ESTADOS_PAGO_PARCIAL = new Set(['pagada_parcialmente']);

type ClaseCampo = 'vacio' | 'pagado' | 'pendiente' | 'no_aplica' | 'parcial' | 'reversado' | 'desconocido';

function limpio(valor: string | null | undefined): string {
  return String(valor ?? '').trim().toLowerCase();
}

function armar(cobro: CobroVisible, detalle = ''): CobroVista {
  const aclaracion = cobro === 'sin_informacion'
    ? 'Este monto es del trabajo. El pago no tiene información.'
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

function clasificarCampo(valor: string): ClaseCampo {
  if (!valor) return 'vacio';
  if (valor === 'pagado') return 'pagado';
  if (valor === 'pendiente') return 'pendiente';
  if (valor === 'no_aplica') return 'no_aplica';
  if (valor === 'parcial' || valor === 'parcialmente' || valor === 'pagado_parcial' || valor === 'pagada_parcialmente') {
    return 'parcial';
  }
  if (
    valor === 'reembolsado'
    || valor === 'reembolsada'
    || valor === 'fallido'
    || valor === 'fallida'
    || valor === 'cancelado'
    || valor === 'cancelada'
  ) {
    return 'reversado';
  }
  return 'desconocido';
}

function detalleReverso(repuestos: string, servicio: string): string {
  const texto = `${repuestos} ${servicio}`;
  if (texto.includes('reembols')) return 'Este pago figura reembolsado.';
  if (texto.includes('fallid')) return 'Este pago figura fallido.';
  if (texto.includes('cancel')) return 'Este pago figura cancelado.';
  return 'Este pago no figura como cobrado.';
}

function detalleParcial(repuestos: ClaseCampo, servicio: ClaseCampo): string {
  if (repuestos === 'pagado' && servicio === 'pendiente') return 'Falta la mano de obra.';
  if (servicio === 'pagado' && repuestos === 'pendiente') return 'Faltan los repuestos.';
  return 'Falta una parte.';
}

function camposDicenPagado(repuestos: ClaseCampo, servicio: ClaseCampo): boolean {
  const repOk = repuestos === 'pagado' || repuestos === 'no_aplica';
  return repOk && servicio === 'pagado';
}

/**
 * Resuelve el cobro. Cita y cotización no son un pago.
 * En orden y oferta, Pagado y Por cobrar salen de campos de pago o de un
 * estado de pago. El avance (aceptada, en ejecución, completado) no cuenta.
 */
export function resolverCobroTrabajo(evidencia: EvidenciaCobro): CobroVista {
  if (evidencia.origen === 'cita' || evidencia.origen === 'cotizacion') {
    return armar('sin_informacion');
  }

  const estado = limpio(evidencia.estado);
  const repuestos = clasificarCampo(limpio(evidencia.estadoPagoRepuestos));
  const servicio = clasificarCampo(limpio(evidencia.estadoPagoServicio));
  const crudoRepuestos = limpio(evidencia.estadoPagoRepuestos);
  const crudoServicio = limpio(evidencia.estadoPagoServicio);
  const hayReverso = repuestos === 'reversado' || servicio === 'reversado';
  const hayParcial = repuestos === 'parcial' || servicio === 'parcial';
  const hayPendiente = repuestos === 'pendiente' || servicio === 'pendiente';
  const hayDesconocido = repuestos === 'desconocido' || servicio === 'desconocido';
  const hayCampos = repuestos !== 'vacio' || servicio !== 'vacio';

  if (hayReverso) {
    return armar('sin_informacion', detalleReverso(crudoRepuestos, crudoServicio));
  }

  if (hayParcial || hayPendiente) {
    return armar('por_cobrar', detalleParcial(repuestos, servicio));
  }

  if (hayDesconocido) {
    return armar('sin_informacion');
  }

  if (ESTADOS_PAGO_PARCIAL.has(estado)) {
    return armar('por_cobrar', 'Falta una parte.');
  }

  if (hayCampos && camposDicenPagado(repuestos, servicio)) {
    return armar('pagado');
  }

  if (ESTADOS_PAGO_COMPLETO.has(estado)) {
    return armar('pagado');
  }
  if (ESTADOS_PAGO_PENDIENTE.has(estado)) {
    return armar('por_cobrar');
  }

  return armar('sin_informacion');
}

export type RegistroCobro = {
  estado?: string | null;
  estado_pago_repuestos?: string | null;
  estado_pago_servicio?: string | null;
};

/** Arma la evidencia con los campos persistentes si el registro los trae. */
export function evidenciaCobroDeRegistro(registro: RegistroCobro, origen: OrigenCobro): EvidenciaCobro {
  return {
    origen,
    estado: registro.estado,
    estadoPagoRepuestos: registro.estado_pago_repuestos,
    estadoPagoServicio: registro.estado_pago_servicio,
  };
}

/** Detalle de orden y de servicio: mismos campos, misma lectura. */
export function cobroVisibleOrden(orden: RegistroCobro | null | undefined): CobroVista {
  return resolverCobroTrabajo(evidenciaCobroDeRegistro(orden ?? {}, 'orden'));
}

/** Oferta de la solicitud, con sus campos de pago. */
export function cobroVisibleOferta(oferta: RegistroCobro | null | undefined): CobroVista {
  return resolverCobroTrabajo(evidenciaCobroDeRegistro(oferta ?? {}, 'oferta'));
}

/**
 * Lista de Servicios. Si hay oferta, sus campos de pago mandan aunque el
 * estado efectivo sea el de la orden (completado, en ejecución).
 */
export function cobroVisibleLista(item: {
  estadoEfectivo?: string | null;
  orden?: RegistroCobro | null;
  oferta?: RegistroCobro | null;
}): CobroVista {
  const oferta = item.oferta;
  const orden = item.orden;
  const origen: OrigenCobro = oferta ? 'oferta' : 'orden';
  return resolverCobroTrabajo({
    origen,
    estado: item.estadoEfectivo ?? orden?.estado ?? oferta?.estado,
    estadoPagoRepuestos: oferta?.estado_pago_repuestos ?? orden?.estado_pago_repuestos,
    estadoPagoServicio: oferta?.estado_pago_servicio ?? orden?.estado_pago_servicio,
  });
}

/** Fila de cliente o seguimiento. El pipeline no trae campos de pago hoy. */
export function cobroVisiblePipeline(item: RegistroCobro & { tipo_entidad?: string | null }): CobroVista {
  const tipo = item.tipo_entidad;
  const origen: OrigenCobro = tipo === 'cotizacion_canal'
    ? 'cotizacion'
    : tipo === 'cita_personal'
      ? 'cita'
      : tipo === 'oferta' || tipo === 'solicitud_publica'
        ? 'oferta'
        : 'orden';
  return resolverCobroTrabajo(evidenciaCobroDeRegistro(item, origen));
}
