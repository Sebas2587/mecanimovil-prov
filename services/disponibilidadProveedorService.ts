import { getAPI } from './api';

export type MiembroAptoAgenda = {
  id: number;
  nombre: string;
  foto_url?: string | null;
  modalidad_tecnico?: string;
  modalidad_display?: string;
};

export type SlotDisponible = {
  hora: string;
  hora_fin_estimada?: string;
};

export type DisponibilidadConDuracion = {
  fecha?: string;
  proveedor_disponible?: boolean;
  mensaje?: string;
  slots_disponibles?: SlotDisponible[];
};

function basePath(tipoProveedor: 'taller' | 'mecanico', proveedorId: number): string {
  if (tipoProveedor === 'taller') {
    return `/usuarios/talleres/${proveedorId}`;
  }
  return `/usuarios/mecanicos-domicilio/${proveedorId}`;
}

export async function obtenerMecanicosAptosAgenda(params: {
  tallerId: number;
  ofertaServicioId?: number;
  modalidad?: 'a_domicilio' | 'en_taller';
}): Promise<MiembroAptoAgenda[]> {
  const api = await getAPI();
  const query = new URLSearchParams();
  if (params.ofertaServicioId) {
    query.set('oferta_servicio_id', String(params.ofertaServicioId));
  }
  if (params.modalidad) {
    query.set('modalidad', params.modalidad);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await api.get(`/usuarios/talleres/${params.tallerId}/mecanicos-aptos-agenda/${suffix}`);
  const miembros = res.data?.miembros;
  return Array.isArray(miembros) ? miembros : [];
}

export async function obtenerDisponibilidadConDuracion(params: {
  tipoProveedor: 'taller' | 'mecanico';
  proveedorId: number;
  fecha: string;
  ofertaServicioId?: number;
  miembroTallerId?: number;
  modalidad?: 'a_domicilio' | 'en_taller';
}): Promise<DisponibilidadConDuracion> {
  const api = await getAPI();
  const query = new URLSearchParams({ fecha: params.fecha });
  if (params.ofertaServicioId) {
    query.set('oferta_servicio_id', String(params.ofertaServicioId));
  }
  if (params.miembroTallerId) {
    query.set('miembro_taller', String(params.miembroTallerId));
  }
  if (params.modalidad) {
    query.set('modalidad', params.modalidad);
  }
  const path = `${basePath(params.tipoProveedor, params.proveedorId)}/disponibilidad_con_duracion/?${query.toString()}`;
  const res = await api.get(path);
  return res.data ?? {};
}
