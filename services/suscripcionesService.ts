/**
 * Servicio para el sistema de Suscripciones Mensuales de MecaniMovil.
 * Gestiona la comunicación con:
 *   - GET  /api/suscripciones/planes/               → lista planes activos
 *   - POST /api/suscripciones/planes/{id}/suscribirse/ → crea suscripción MP Preapproval
 *   - GET  /api/suscripciones/mi-suscripcion/mi_suscripcion/ → suscripción activa
 *   - POST /api/suscripciones/mi-suscripcion/cancelar/       → cancelar
 */
import apiClient from '@/services/api';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface PlanSuscripcion {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    creditos_mensuales: number;
    destacado: boolean;
    orden: number;
    fecha_creacion: string;
}

export interface SuscripcionProveedor {
    id: number;
    plan: PlanSuscripcion;
    estado: 'pendiente' | 'activa' | 'pausada' | 'cancelada' | 'expirada';
    estado_display: string;
    esta_activa: boolean;
    mp_preapproval_id: string | null;
    mp_init_point: string | null;
    fecha_inicio: string;
    fecha_proximo_cobro: string | null;
    fecha_cancelacion: string | null;
    fecha_actualizacion: string;
}

export interface SuscribirseResult {
    suscripcion_id: number;
    init_point: string;
    estado: string;
    plan: {
        id: number;
        nombre: string;
        descripcion: string;
        precio: number;
        creditos_mensuales: number;
        destacado: boolean;
    };
    ya_existia: boolean;
}

// ─────────────────────────────────────────────────────────────
// Funciones del servicio
// ─────────────────────────────────────────────────────────────

/**
 * Lista todos los planes de suscripción activos.
 * Disponible para cualquier proveedor autenticado.
 */
const obtenerPlanes = async (): Promise<{ success: boolean; planes: PlanSuscripcion[]; error?: string }> => {
    try {
        const response = await apiClient.get('/suscripciones/planes/');
        const planes = response.data?.results ?? response.data ?? [];
        return { success: true, planes };
    } catch (error: any) {
        console.error('[suscripcionesService] Error obteniendo planes:', error?.response?.data || error);
        return {
            success: false,
            planes: [],
            error: error?.response?.data?.error || 'No se pudieron cargar los planes de suscripción',
        };
    }
};

/**
 * Crea una suscripción mensual en MercadoPago Preapproval.
 * Retorna el init_point para abrir el WebView de autorización.
 */
const suscribirse = async (
    planId: number
): Promise<{ success: boolean; data?: SuscribirseResult; error?: string }> => {
    try {
        const response = await apiClient.post(`/suscripciones/planes/${planId}/suscribirse/`);
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('[suscripcionesService] Error suscribiéndose:', error?.response?.data || error);
        return {
            success: false,
            error: error?.response?.data?.error || 'No se pudo iniciar la suscripción. Intente nuevamente.',
        };
    }
};

/**
 * Obtiene la suscripción activa/pendiente del proveedor autenticado.
 * Retorna null si no tiene suscripción.
 */
const obtenerMiSuscripcion = async (): Promise<{
    success: boolean;
    suscripcion: SuscripcionProveedor | null;
    error?: string;
}> => {
    try {
        const response = await apiClient.get('/suscripciones/mi-suscripcion/mi_suscripcion/');
        return { success: true, suscripcion: response.data?.suscripcion ?? null };
    } catch (error: any) {
        console.error('[suscripcionesService] Error obteniendo suscripción:', error?.response?.data || error);
        return {
            success: false,
            suscripcion: null,
            error: error?.response?.data?.error || 'No se pudo obtener tu suscripción actual.',
        };
    }
};

/**
 * Cancela la suscripción activa del proveedor autenticado.
 */
const cancelarSuscripcion = async (): Promise<{ success: boolean; mensaje?: string; error?: string }> => {
    try {
        const response = await apiClient.post('/suscripciones/mi-suscripcion/cancelar/');
        return { success: true, mensaje: response.data?.mensaje };
    } catch (error: any) {
        console.error('[suscripcionesService] Error cancelando suscripción:', error?.response?.data || error);
        return {
            success: false,
            error: error?.response?.data?.error || 'No se pudo cancelar la suscripción. Intente nuevamente.',
        };
    }
};

const suscripcionesService = {
    obtenerPlanes,
    suscribirse,
    obtenerMiSuscripcion,
    cancelarSuscripcion,
};

export default suscripcionesService;
