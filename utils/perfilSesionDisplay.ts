import type { EstadoProveedor } from '@/services/api';
import type { MiembroTaller } from '@/services/equipoTallerService';

export type RolTallerSesion = 'mandante' | 'supervisor' | 'mecanico';

type UsuarioBasico = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type PerfilBadgeVariant = 'primary' | 'warning' | 'neutral' | 'success';

export interface PerfilBadge {
  label: string;
  variant: PerfilBadgeVariant;
}

function etiquetaModalidadPerfilMecanico(params: {
  modalidad_tecnico?: string | null;
  modalidad_tecnico_display?: string | null;
}): string {
  switch (params.modalidad_tecnico) {
    case 'en_taller':
      return 'Mecánico en taller';
    case 'a_domicilio':
      return 'Mecánico a domicilio';
    case 'ambas':
      return 'Taller y domicilio';
    default:
      return params.modalidad_tecnico_display?.trim() || '';
  }
}

function resolverPerfilMecanico(params: {
  estadoProveedor: EstadoProveedor | null;
  miembroEquipo?: MiembroTaller | null;
}) {
  const { estadoProveedor, miembroEquipo } = params;
  return {
    modalidad_tecnico:
      miembroEquipo?.modalidad_tecnico ?? estadoProveedor?.miembro_modalidad_tecnico ?? null,
    modalidad_tecnico_display:
      miembroEquipo?.modalidad_tecnico_display ?? estadoProveedor?.miembro_modalidad_display ?? null,
    especialidades:
      miembroEquipo?.especialidades_detalle?.length
        ? miembroEquipo.especialidades_detalle
        : estadoProveedor?.miembro_especialidades ?? [],
  };
}

function nombreDesdeUsuario(usuario: UsuarioBasico | null | undefined): string {
  const completo = `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim();
  if (completo) return completo;
  if (usuario?.username?.trim()) return usuario.username.trim();
  return '';
}

/** Nombre principal del encabezado de perfil según quién inició sesión. */
export function obtenerNombreDisplayPerfil(params: {
  rolTaller: RolTallerSesion;
  estadoProveedor: EstadoProveedor | null;
  usuario: UsuarioBasico | null;
  miembroEquipo?: MiembroTaller | null;
  nombreProveedorFallback: string;
}): string {
  const { rolTaller, estadoProveedor, usuario, miembroEquipo, nombreProveedorFallback } = params;

  if (rolTaller === 'mandante') {
    return nombreProveedorFallback || 'Proveedor';
  }

  const desdeMiembro =
    estadoProveedor?.miembro_nombre?.trim()
    || miembroEquipo?.nombre?.trim()
    || '';
  if (desdeMiembro) return desdeMiembro;

  const desdeUsuario = nombreDesdeUsuario(usuario);
  if (desdeUsuario) return desdeUsuario;

  return rolTaller === 'supervisor' ? 'Supervisor' : 'Mecánico';
}

/** Subtítulo con el nombre del taller cuando la sesión no es del mandante. */
export function obtenerSubtituloTallerPerfil(params: {
  rolTaller: RolTallerSesion;
  estadoProveedor: EstadoProveedor | null;
}): string | null {
  if (params.rolTaller === 'mandante') return null;
  const nombre = params.estadoProveedor?.nombre?.trim();
  return nombre || null;
}

/** Etiquetas del perfil acordes al rol de sesión. */
export function obtenerEtiquetasPerfil(params: {
  rolTaller: RolTallerSesion;
  estadoProveedor: EstadoProveedor | null;
  miembroEquipo?: MiembroTaller | null;
}): PerfilBadge[] {
  const { rolTaller, estadoProveedor, miembroEquipo } = params;
  const badges: PerfilBadge[] = [];

  if (rolTaller === 'supervisor') {
    badges.push({ label: 'SUPERVISOR', variant: 'warning' });
    return badges;
  }

  if (rolTaller === 'mecanico') {
    badges.push({ label: 'MECÁNICO', variant: 'primary' });
    const { modalidad_tecnico, modalidad_tecnico_display, especialidades } = resolverPerfilMecanico({
      estadoProveedor,
      miembroEquipo,
    });
    const modalidad = etiquetaModalidadPerfilMecanico({
      modalidad_tecnico,
      modalidad_tecnico_display,
    });
    if (modalidad) {
      badges.push({ label: modalidad.toUpperCase(), variant: 'neutral' });
    }
    for (const esp of especialidades.slice(0, 4)) {
      if (esp.nombre?.trim()) {
        badges.push({ label: esp.nombre.trim().toUpperCase(), variant: 'success' });
      }
    }
    return badges;
  }

  // Mandante (dueño del taller o mecánico a domicilio legacy)
  if (estadoProveedor?.tipo_proveedor === 'mecanico') {
    badges.push({ label: 'MECÁNICO A DOMICILIO', variant: 'neutral' });
  } else {
    badges.push({ label: 'TALLER', variant: 'neutral' });
  }

  const cobertura =
    estadoProveedor?.tipo_cobertura_marca
    || estadoProveedor?.datos_proveedor?.tipo_cobertura_marca;
  if (cobertura === 'multimarca') {
    badges.push({ label: '🌐 MULTIMARCA', variant: 'primary' });
  } else if (cobertura === 'especialista') {
    badges.push({ label: '⭐ ESPECIALISTA', variant: 'success' });
  }

  return badges;
}
