import api from './api';

/** Respuesta de GET /ordenes/proveedor-ordenes/kpis-resumen/ */
export interface ProveedorKpisResumen {
  ventana_dias: number;
  desde: string;
  ofertas_dirigidas_muestra: number;
  ofertas_globales_muestra: number;
  ofertas_total_en_periodo: number;
  tiempo_respuesta_dirigida_media_minutos: number | null;
  tiempo_respuesta_global_media_minutos: number | null;
  ordenes_mercado_en_periodo: number;
  ordenes_mercado_completadas: number;
  ordenes_con_checklist: number;
  checklist_completados: number;
  checklist_cumplimiento_pct: number | null;
  checklist_tiempo_promedio_minutos: number | null;
  /** Tiempo real checklist / tiempo estimado oferta (1 = cumple, &gt;1 más lento). */
  tiempo_ejecucion_vs_estimado_promedio: number | null;
  tiempo_ejecucion_vs_estimado_muestra: number;
  resenas_muestra: number;
  resenas_totales_proveedor: number;
  /** Promedio en periodo si hay reseñas; si no, promedio global del proveedor. */
  calificacion_cliente_promedio: number | null;
  calificacion_promedio_todas_resenas: number | null;
  /**
   * Promedio 1–5 desde reseñas ligadas a líneas de orden con OfertaServicio del proveedor.
   * En periodo si hay líneas calificadas; si no, histórico de esas líneas.
   */
  calificacion_servicios_promedio?: number | null;
  /** Líneas con oferta del proveedor y reseña en el periodo (muestra del promedio). */
  calificacion_servicios_lineas_muestra?: number;
  /** Total histórico de líneas con oferta del proveedor y reseña. */
  calificacion_servicios_lineas_total?: number;
  score_tiempo_respuesta: number | null;
  score_calificacion_cliente: number | null;
  score_calidad_servicio?: number | null;
  score_checklist: number | null;
  score_tiempo_ejecucion: number | null;
  score_rendimiento: number;
  /** Misma regla que en app usuarios: solo `estado === 'activa'`. */
  suscripcion_mensual_activa: boolean;
  /** Si el cliente puede ver la insignia KPI (hoy: equivale a suscripción mensual activa). */
  insignia_visible_a_clientes: boolean;
  /** True si conviene mostrar aviso para suscribirse y destacar el perfil. */
  sugerencia_suscripcion_para_insignia: boolean;
  mensaje_sugerencia_suscripcion: string | null;
}

export interface KpisServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Barra final obligatoria: sin ella Django puede redirigir y axios pierde el header Authorization → 401. */
const BASE = '/ordenes/proveedor-ordenes/kpis-resumen/';

class KpisProveedorService {
  async obtenerResumen(dias: number = 30): Promise<KpisServiceResponse<ProveedorKpisResumen>> {
    try {
      const d = Math.min(365, Math.max(1, Math.round(dias)));
      const url = `${BASE}?dias=${encodeURIComponent(String(d))}`;
      const response = await api.get(url);
      return { success: true, data: response.data as ProveedorKpisResumen };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('KpisProveedorService.obtenerResumen:', error?.response?.data || error?.message);
      }
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.detail || error.response.data?.message || 'No se pudieron cargar los KPIs',
          error: JSON.stringify(error.response.data),
        };
      }
      return {
        success: false,
        message: 'Error de conexión al cargar KPIs',
        error: error?.message,
      };
    }
  }
}

export const kpisProveedorService = new KpisProveedorService();
