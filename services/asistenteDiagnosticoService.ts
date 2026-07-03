import api from './api';

export interface ReferenciaManualIA {
  titulo: string;
  url?: string;
}

export interface ContenidoAsistenteDiagnostico {
  vehiculo: string;
  problema_reportado: string;
  tipo_motor?: string;
  tipo_motor_codigo?: string;
  aviso_motor?: string;
  servicio_motor_incoherente?: boolean;
  causas_probables: string[];
  procedimiento_reparacion_detallado: string[];
  referencia_manual: ReferenciaManualIA;
  advertencias_seguridad?: string[];
}

export interface AsistenteDiagnosticoResponse {
  disponible: boolean;
  contenido: ContenidoAsistenteDiagnostico | null;
  error?: string | null;
  latencia_ms?: number;
  generado_en?: string;
  diagnostico_id?: number;
}

export type AsistenteDiagnosticoOrigen = 'orden' | 'cita';

class AsistenteDiagnosticoService {
  private ordenesUrl = '/ordenes/proveedor-ordenes';
  private citasUrl = '/ordenes/citas-agenda-personal';

  async obtenerOrden(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.get(`${this.ordenesUrl}/${ordenId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }

  async generarOrden(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.post(`${this.ordenesUrl}/${ordenId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }

  async obtenerCita(citaId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.get(`${this.citasUrl}/${citaId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }

  async generarCita(citaId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.post(`${this.citasUrl}/${citaId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }

  /** @deprecated Usar obtenerOrden */
  async obtener(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    return this.obtenerOrden(ordenId);
  }

  /** @deprecated Usar generarOrden */
  async generar(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    return this.generarOrden(ordenId);
  }
}

export const asistenteDiagnosticoService = new AsistenteDiagnosticoService();
