import api from './api';

export interface ReferenciaManualIA {
  titulo: string;
  url?: string;
}

export interface ContenidoAsistenteDiagnostico {
  vehiculo: string;
  problema_reportado: string;
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

class AsistenteDiagnosticoService {
  private baseUrl = '/ordenes/proveedor-ordenes';

  async obtener(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.get(`${this.baseUrl}/${ordenId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }

  async generar(ordenId: number): Promise<AsistenteDiagnosticoResponse> {
    const response = await api.post(`${this.baseUrl}/${ordenId}/asistente-ia/`);
    return response.data as AsistenteDiagnosticoResponse;
  }
}

export const asistenteDiagnosticoService = new AsistenteDiagnosticoService();
