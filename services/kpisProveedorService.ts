import api from './api';

/** Promedios 1–5 de aspectos estructurados de reseñas del cliente. */
export interface AspectosResena {
  puntualidad: number | null;
  recepcion_a_tiempo: number | null;
  limpieza_auto: number | null;
  zona_limpia: number | null;
  claridad_explicacion: number | null;
  informacion_relevante: number | null;
  trato: number | null;
  pct_entrego_repuestos: number | null;
}

/** Respuesta de GET /ordenes/proveedor-ordenes/kpis-resumen/ */
export interface ProveedorKpisResumen {
  ventana_dias: number;
  desde: string;
  // Ofertas
  ofertas_dirigidas_muestra: number;
  ofertas_globales_muestra: number;
  ofertas_total_en_periodo: number;
  tiempo_respuesta_dirigida_media_minutos: number | null;
  tiempo_respuesta_global_media_minutos: number | null;
  // Órdenes
  ordenes_mercado_en_periodo: number;
  ordenes_mercado_completadas: number;
  servicios_terminados_en_periodo: number;
  // Checklist
  ordenes_con_checklist: number;
  checklist_completados: number;
  checklist_cumplimiento_pct: number | null;
  /** Tiempo real del proveedor en el checklist (excluye espera de firma del cliente). */
  checklist_tiempo_promedio_minutos: number | null;
  /** Tiempo real checklist proveedor / tiempo estimado oferta (1.0 = en tiempo, >1 más lento). */
  tiempo_ejecucion_vs_estimado_promedio: number | null;
  tiempo_ejecucion_vs_estimado_muestra: number;
  /**
   * Racha máxima de días consecutivos con ≥1 servicio terminado en el periodo.
   * 10 días consecutivos = score_consistencia 100.
   */
  max_racha_dias_consecutivos: number | null;
  /**
   * Tiempo promedio (minutos) desde que se crea el checklist (servicio iniciado)
   * hasta que el proveedor pulsa "iniciar". Mide velocidad de arranque.
   */
  tiempo_inicio_checklist_promedio_minutos: number | null;
  // Reseñas y calificaciones
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
  /** Promedios 1–5 de los aspectos detallados ingresados por el cliente en la reseña. */
  aspectos_resena?: AspectosResena | null;
  // Sub-scores (0–100 cada uno, null si sin datos)
  score_tiempo_respuesta: number | null;
  score_calificacion_cliente: number | null;
  score_calidad_servicio?: number | null;
  score_checklist: number | null;
  score_tiempo_ejecucion: number | null;
  /** Racha de días consecutivos → 0–100. SIEMPRE incluido en score_rendimiento. */
  score_consistencia: number | null;
  /** Velocidad de arranque del checklist → 0–100. Incluido si hay datos. */
  score_inicio_checklist: number | null;
  // Score compuesto
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
