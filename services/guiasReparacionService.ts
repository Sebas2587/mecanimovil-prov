import api from './api';
import { extraerMensajeErrorApi } from '@/utils/extraerMensajeErrorApi';
import type { ContenidoAsistenteDiagnostico } from './asistenteDiagnosticoService';
import type { AsistenteDiagnosticoOrigen } from './asistenteDiagnosticoService';

export interface GuiaReparacionGuardada {
  id: number;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_anio: number | null;
  vehiculo_patente: string;
  titulo: string;
  contenido: ContenidoAsistenteDiagnostico;
  origen: AsistenteDiagnosticoOrigen;
  origen_id: number | null;
  creado_en: string;
}

export interface GuiaReparacionGrupoModelo {
  modelo: string;
  total: number;
}

export interface GuiaReparacionGrupoMarca {
  marca: string;
  modelos: GuiaReparacionGrupoModelo[];
}

const BASE = '/ordenes/guias-reparacion-guardadas/';

function mensajeErrorGuia(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 404) {
    return 'La biblioteca de guías aún no está disponible en el servidor. Actualiza el backend y aplica la migración 0023.';
  }
  return extraerMensajeErrorApi(error, fallback);
}

class GuiasReparacionService {
  async listar(params?: { marca?: string; modelo?: string }): Promise<GuiaReparacionGuardada[]> {
    try {
      const search = new URLSearchParams();
      if (params?.marca) search.set('marca', params.marca);
      if (params?.modelo) search.set('modelo', params.modelo);
      const q = search.toString();
      const response = await api.get(`${BASE}${q ? `?${q}` : ''}`);
      return response.data?.results || response.data || [];
    } catch (error) {
      throw new Error(mensajeErrorGuia(error, 'No se pudieron cargar las guías.'));
    }
  }

  async agrupadas(): Promise<GuiaReparacionGrupoMarca[]> {
    try {
      const response = await api.get(`${BASE}agrupadas/`);
      return response.data || [];
    } catch (error) {
      throw new Error(mensajeErrorGuia(error, 'No se pudieron cargar tus guías guardadas.'));
    }
  }

  async guardar(payload: {
    origen: AsistenteDiagnosticoOrigen;
    origen_id: number;
    diagnostico_id: number;
  }): Promise<GuiaReparacionGuardada> {
    try {
      const response = await api.post(BASE, payload);
      return response.data;
    } catch (error) {
      throw new Error(mensajeErrorGuia(error, 'No se pudo guardar la guía.'));
    }
  }

  async eliminar(id: number): Promise<void> {
    try {
      await api.delete(`${BASE}${id}/`);
    } catch (error) {
      throw new Error(mensajeErrorGuia(error, 'No se pudo eliminar la guía.'));
    }
  }
}

export const guiasReparacionService = new GuiasReparacionService();
