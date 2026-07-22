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
    cotizaciones_ia_mensuales: number;
    diagnosticos_ia_mensuales: number;
    consultas_patente_mensuales: number;
    canales_mensajeria_max: number;
    conversaciones_salientes_max: number;
    overage_cotizaciones_por_credito: number;
    overage_diagnosticos_por_credito: number;
    overage_patentes_por_credito: number;
    acceso_endpoints_patente_pro: boolean;
    agente_ia_incluido: boolean;
    conversaciones_agente_ia_max: number;
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
        const code = error?.response?.data?.code;
        const status = error?.response?.status;
        if (status === 503 && code === 'database_unavailable') {
            if (__DEV__) console.warn('[suscripcionesService] API temporalmente no disponible (BD)');
        } else {
            console.error('[suscripcionesService] Error obteniendo suscripción:', error?.response?.data || error);
        }
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
        const data = response.data ?? {};
        if (data.cancelada === false) {
            return {
                success: false,
                error: data.error || data.mensaje || 'No se pudo cancelar la suscripción.',
            };
        }
        return { success: true, mensaje: data.mensaje || 'Suscripción cancelada exitosamente' };
    } catch (error: any) {
        const data = error?.response?.data;
        console.error('[suscripcionesService] Error cancelando suscripción:', data || error);
        return {
            success: false,
            error:
                data?.error ||
                data?.mensaje ||
                'No se pudo cancelar la suscripción. Intente nuevamente.',
        };
    }
};

/**
 * Verifica si el proveedor tiene una suscripción activa (post-autorización del preapproval).
 * Usado por el WebView modal para confirmar el éxito sin depender del webhook.
 */
const verificarSuscripcion = async (suscripcionId: number): Promise<{
    success: boolean;
    activa: boolean;
    estado?: string;
    mensaje?: string;
}> => {
    try {
        const result = await obtenerMiSuscripcion();
        if (!result.success) {
            return { success: false, activa: false };
        }
        const sus = result.suscripcion;
        if (sus && sus.id === suscripcionId && sus.esta_activa) {
            return { success: true, activa: true, estado: sus.estado, mensaje: '¡Suscripción autorizada correctamente!' };
        }
        if (sus && sus.id === suscripcionId && sus.estado === 'pendiente') {
            return { success: true, activa: false, estado: 'pendiente' };
        }
        return { success: true, activa: false, estado: sus?.estado };
    } catch (error: any) {
        console.error('[suscripcionesService] Error verificando suscripción:', error);
        return { success: false, activa: false };
    }
};

/**
 * Sincroniza el estado de la suscripción del proveedor consultando MercadoPago
 * directamente por el email de su cuenta MP conectada.
 * Útil cuando el webhook no llegó pero el proveedor ya autorizó el preapproval.
 */
const sincronizarSuscripcion = async (): Promise<{
    success: boolean;
    sincronizado: boolean;
    estado?: string;
    mensaje?: string;
    suscripcion_id?: number | null;
    error?: string;
}> => {
    try {
        const response = await apiClient.post('/suscripciones/mi-suscripcion/sincronizar/');
        return { success: true, ...response.data };
    } catch (error: any) {
        console.error('[suscripcionesService] Error sincronizando suscripción:', error?.response?.data || error);
        return {
            success: false,
            sincronizado: false,
            error: error?.response?.data?.error || 'No se pudo sincronizar la suscripción.',
        };
    }
};

export type EstadoSaludSuscripcion = 'ok' | 'por_vencer' | 'pago_fallido' | 'vencida' | 'sin_suscripcion';

export interface SaludSuscripcion {
    estado_salud: EstadoSaludSuscripcion;
    puede_ofertar: boolean;
    saldo_creditos: number;
    suscripcion_estado: string | null;
    plan_nombre: string | null;
    fecha_proximo_cobro: string | null;
    mensaje: string | null;
    accion: string | null;
}

export interface UsoFeatureResumen {
    feature: string;
    label: string;
    limite: number;
    usados: number;
    restantes: number;
    creditos_overage_gastados: number;
    overage_por_credito: number;
}

export interface UsoFeaturesMes {
    periodo: string;
    plan: {
        id: number;
        nombre: string;
        canales_mensajeria_max: number;
        acceso_endpoints_patente_pro: boolean;
    } | null;
    features: UsoFeatureResumen[];
    canales_mensajeria_max: number;
    canales_conectados: number;
}

export interface CobroMP {
    id: string;
    status: string;
    monto: number | null;
    moneda: string;
    fecha: string | null;
    acreditado: boolean;
    verificado: boolean;
    payment_id: number | null;
    card_last_four: string | null;
    payment_status: string | null;
    payment_status_detail: string | null;
    net_received: number | null;
    date_approved: string | null;
    payer_email: string | null;
    payment_method: string | null;
}

/**
 * Obtiene el historial de cobros reales de MercadoPago para la suscripción
 * del proveedor. Consulta directamente la API de MP.
 */
const obtenerHistorialCobros = async (): Promise<{
    success: boolean;
    cobros: CobroMP[];
    total: number;
    error?: string;
}> => {
    try {
        const response = await apiClient.get('/suscripciones/mi-suscripcion/historial-cobros/');
        return {
            success: true,
            cobros: response.data?.cobros ?? [],
            total: response.data?.total ?? 0,
        };
    } catch (error: any) {
        console.error('[suscripcionesService] Error obteniendo historial cobros:', error?.response?.data || error);
        return {
            success: false,
            cobros: [],
            total: 0,
            error: error?.response?.data?.error || 'No se pudo obtener el historial de cobros.',
        };
    }
};

/**
 * Obtiene el estado de salud de la suscripción del proveedor.
 * Indica si está ok, por vencer, con pago fallido, vencida, o sin suscripción.
 */
const obtenerEstadoSalud = async (): Promise<{
    success: boolean;
    data: SaludSuscripcion | null;
    error?: string;
}> => {
    try {
        const response = await apiClient.get('/suscripciones/mi-suscripcion/estado-salud/');
        return { success: true, data: response.data };
    } catch (error: any) {
        const code = error?.response?.data?.code;
        const status = error?.response?.status;
        if (status === 503 && code === 'database_unavailable') {
            if (__DEV__) {
                console.warn('[suscripcionesService] API temporalmente no disponible (BD)');
            }
        } else {
            console.error('[suscripcionesService] Error obteniendo estado salud:', error?.response?.data || error);
        }
        return {
            success: false,
            data: null,
            error: error?.response?.data?.error || 'No se pudo obtener el estado de la suscripción.',
        };
    }
};

/**
 * Consumo mensual de features incluidas en el plan (IA, patente, mensajería).
 */
const obtenerUsoFeatures = async (): Promise<{
    success: boolean;
    data: UsoFeaturesMes | null;
    error?: string;
}> => {
    try {
        const response = await apiClient.get('/suscripciones/mi-suscripcion/uso-features/');
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('[suscripcionesService] Error obteniendo uso features:', error?.response?.data || error);
        return {
            success: false,
            data: null,
            error: error?.response?.data?.error || 'No se pudo obtener el uso del plan.',
        };
    }
};

const suscripcionesService = {
    obtenerPlanes,
    suscribirse,
    obtenerMiSuscripcion,
    cancelarSuscripcion,
    verificarSuscripcion,
    sincronizarSuscripcion,
    obtenerHistorialCobros,
    obtenerEstadoSalud,
    obtenerUsoFeatures,
};

export default suscripcionesService;
