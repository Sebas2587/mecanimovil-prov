import type { SolicitudPublica } from '@/services/solicitudesService';

export type HomeSolicitudCardMeta = {
  servicioTitulo: string;
  servicioExtra: number;
  vehiculoLabel: string | null;
  descripcionResumen: string | null;
  clienteNombre: string;
  clienteFotoUrl: string | null;
  clienteSubtitulo: string | null;
  tecnicoNombre: string | null;
  tecnicoFotoUrl: string | null;
  ctaLabel: string;
  esAsignacionCatalogo: boolean;
  badgeEstado: string | null;
};

function esAsignacionCatalogoPendiente(solicitud: SolicitudPublica): boolean {
  const oferta = solicitud.oferta_seleccionada_detail;
  if (oferta?.origen === 'catalogo' && solicitud.estado === 'pendiente_confirmacion') {
    return true;
  }
  if (
    solicitud.estado === 'pendiente_confirmacion'
    && solicitud.tipo_solicitud === 'dirigida'
    && Boolean(oferta)
  ) {
    return true;
  }
  return false;
}

function truncarTexto(texto: string, max = 100): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function buildVehiculoLabel(solicitud: SolicitudPublica): string | null {
  const v = solicitud.vehiculo_info;
  if (!v) return null;

  const year = v.año ?? v.anio;
  const partes: string[] = [];

  const marcaModelo = [v.marca, v.modelo].filter(Boolean).join(' ');
  if (marcaModelo) partes.push(marcaModelo);
  if (year) partes.push(String(year));

  const motorPatente = [v.tipo_motor, v.patente].filter(Boolean).join(' · ');
  if (motorPatente) partes.push(motorPatente);

  return partes.length > 0 ? partes.join(' · ') : null;
}

export function resolveHomeSolicitudCardMeta(solicitud: SolicitudPublica): HomeSolicitudCardMeta {
  const servicios = solicitud.servicios_solicitados_detail || [];
  const servicioTitulo = servicios[0]?.nombre || 'Servicio solicitado';
  const servicioExtra = Math.max(0, servicios.length - 1);

  const vehiculoLabel = buildVehiculoLabel(solicitud);

  const descripcionResumen = solicitud.descripcion_problema?.trim()
    ? truncarTexto(solicitud.descripcion_problema)
    : null;

  const clienteNombre =
    solicitud.cliente_info?.nombre?.trim()
    || solicitud.cliente_nombre?.trim()
    || 'Cliente';
  const clienteFotoUrl = solicitud.cliente_info?.foto_perfil ?? null;

  const tecnico =
    solicitud.miembro_taller_preferido_detail
    || solicitud.oferta_seleccionada_detail?.miembro_taller_detail
    || null;
  const tecnicoNombre = tecnico?.nombre?.trim() || null;
  const tecnicoFotoUrl = tecnico?.foto_url ?? null;

  const esAsignacionCatalogo = esAsignacionCatalogoPendiente(solicitud);

  let ctaLabel = 'Ver detalle';
  if (esAsignacionCatalogo) {
    ctaLabel = 'Aceptar o rechazar';
  } else if (solicitud.puede_recibir_ofertas) {
    ctaLabel = 'Cotizar solicitud';
  } else if (solicitud.estado === 'pendiente_confirmacion') {
    ctaLabel = 'Revisar asignación';
  }

  let badgeEstado: string | null = null;
  if (esAsignacionCatalogo) {
    badgeEstado = 'Asignación catálogo';
  } else if (solicitud.urgencia === 'urgente') {
    badgeEstado = 'Urgente';
  } else if (solicitud.tipo_solicitud === 'dirigida') {
    badgeEstado = 'Dirigida a ti';
  }

  const clienteSubtitulo =
    badgeEstado
    || solicitud.tiempo_restante
    || null;

  return {
    servicioTitulo,
    servicioExtra,
    vehiculoLabel,
    descripcionResumen,
    clienteNombre,
    clienteFotoUrl,
    clienteSubtitulo,
    tecnicoNombre,
    tecnicoFotoUrl,
    ctaLabel,
    esAsignacionCatalogo,
    badgeEstado,
  };
}
