import type { MiembroTallerResumen, OfertaProveedor, SolicitudPublica } from '@/services/solicitudesService';

export type ModalidadServicio = {
  tipo: 'taller' | 'mecanico';
  label: string;
  a_domicilio: boolean;
};

function modalidadDesdeTecnico(
  tecnico: MiembroTallerResumen,
): ModalidadServicio | null {
  if (tecnico.modalidad_tecnico === 'a_domicilio') {
    return {
      tipo: 'mecanico',
      label: tecnico.modalidad_display || 'A domicilio',
      a_domicilio: true,
    };
  }
  if (tecnico.modalidad_tecnico === 'en_taller') {
    return {
      tipo: 'taller',
      label: tecnico.modalidad_display || 'En taller',
      a_domicilio: false,
    };
  }
  return null;
}

function inferirModalidadAmbas(solicitud: SolicitudPublica): ModalidadServicio {
  if (solicitud.direccion_usuario || solicitud.direccion_usuario_info?.direccion) {
    return { tipo: 'mecanico', label: 'A domicilio', a_domicilio: true };
  }
  return { tipo: 'taller', label: 'En taller', a_domicilio: false };
}

function resolverTecnicoPreferido(
  solicitud: SolicitudPublica | null | undefined,
  oferta: OfertaProveedor | null | undefined,
): MiembroTallerResumen | null {
  if (oferta?.miembro_taller_detail) return oferta.miembro_taller_detail;
  return solicitud?.miembro_taller_preferido_detail ?? null;
}

/** Modalidad efectiva del servicio (alineada con backend resolve_tipo_proveedor_servicio_efectivo). */
export function resolveModalidadServicio(
  solicitud: SolicitudPublica | null | undefined,
  oferta: OfertaProveedor | null | undefined,
): ModalidadServicio | null {
  if (!solicitud && !oferta) return null;

  if (oferta?.tipo_proveedor === 'mecanico') {
    return { tipo: 'mecanico', label: 'A domicilio', a_domicilio: true };
  }

  const tecnico = resolverTecnicoPreferido(solicitud, oferta);
  if (tecnico?.modalidad_tecnico) {
    const fromTecnico = modalidadDesdeTecnico(tecnico);
    if (fromTecnico) return fromTecnico;
    if (tecnico.modalidad_tecnico === 'ambas' && solicitud) {
      return inferirModalidadAmbas(solicitud);
    }
  }

  if (solicitud?.modalidad_servicio?.label) {
    return solicitud.modalidad_servicio as ModalidadServicio;
  }

  const tipo =
    solicitud?.tipo_proveedor_servicio
    || oferta?.tipo_proveedor;
  if (tipo === 'taller') {
    return { tipo: 'taller', label: 'En taller', a_domicilio: false };
  }
  if (tipo === 'mecanico') {
    return { tipo: 'mecanico', label: 'A domicilio', a_domicilio: true };
  }

  return null;
}

/** Filtro de modalidad_tecnico para APIs de agenda del taller. */
export function modalidadFiltroMecanico(
  modalidad: ModalidadServicio | null,
): 'a_domicilio' | 'en_taller' | undefined {
  if (!modalidad) return undefined;
  return modalidad.a_domicilio ? 'a_domicilio' : 'en_taller';
}

export function tipoServicioAgenda(
  modalidad: ModalidadServicio | null,
): 'taller' | 'domicilio' {
  return modalidad?.a_domicilio ? 'domicilio' : 'taller';
}
