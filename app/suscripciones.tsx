/**
 * Pantalla de Suscripciones Mensuales — MecaniMovil Proveedores
 *
 * Muestra los planes disponibles y permite al proveedor suscribirse
 * via MercadoPago Preapproval. También muestra la suscripción activa
 * con opción de cancelar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';

import suscripcionesService, {
    PlanSuscripcion,
    SuscripcionProveedor,
} from '@/services/suscripcionesService';
import MercadoPagoWebViewModal from '@/components/creditos/MercadoPagoWebViewModal';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
interface ModalState {
    visible: boolean;
    checkoutUrl: string;
    suscripcionId: number;
}

// ─────────────────────────────────────────────────────────────
// Componente de tarjeta de plan
// ─────────────────────────────────────────────────────────────
interface PlanCardProps {
    plan: PlanSuscripcion;
    suscripcionActual: SuscripcionProveedor | null;
    onSuscribirse: (plan: PlanSuscripcion) => void;
    cargando: boolean;
    colors: any;
}

const PlanCard: React.FC<PlanCardProps> = React.memo(
    ({ plan, suscripcionActual, onSuscribirse, cargando, colors }) => {
        const esPlanActual =
            suscripcionActual?.plan?.id === plan.id &&
            ['activa', 'pendiente'].includes(suscripcionActual?.estado ?? '');

        const estaEnCualquierPlan =
            suscripcionActual !== null &&
            ['activa', 'pendiente'].includes(suscripcionActual?.estado ?? '');

        return (
            <View
                style={[
                    styles.planCard,
                    {
                        backgroundColor: colors?.background?.paper ?? '#fff',
                        borderColor: plan.destacado
                            ? (colors?.primary?.['500'] ?? '#4E4FEB')
                            : (colors?.border?.main ?? '#E0E0E0'),
                        borderWidth: plan.destacado ? 2 : 1,
                    },
                ]}
            >
                {/* Badge DESTACADO */}
                {plan.destacado && (
                    <View
                        style={[
                            styles.badgeDestacado,
                            { backgroundColor: colors?.primary?.['500'] ?? '#4E4FEB' },
                        ]}
                    >
                        <Text style={styles.badgeDestacadoText}>⭐ MÁS POPULAR</Text>
                    </View>
                )}

                {/* Badge PLAN ACTUAL */}
                {esPlanActual && (
                    <View
                        style={[
                            styles.badgeActual,
                            { backgroundColor: '#22C55E' },
                        ]}
                    >
                        <Text style={styles.badgeActualText}>✓ TU PLAN ACTUAL</Text>
                    </View>
                )}

                {/* Header */}
                <Text style={[styles.planNombre, { color: colors?.text?.primary ?? '#111' }]}>
                    {plan.nombre}
                </Text>
                <Text style={[styles.planDescripcion, { color: colors?.text?.secondary ?? '#666' }]}>
                    {plan.descripcion}
                </Text>

                {/* Precio */}
                <View style={styles.precioContainer}>
                    <Text style={[styles.precioCurrency, { color: colors?.primary?.['500'] ?? '#4E4FEB' }]}>
                        $
                    </Text>
                    <Text style={[styles.precioValor, { color: colors?.primary?.['500'] ?? '#4E4FEB' }]}>
                        {Math.round(plan.precio).toLocaleString('es-CL')}
                    </Text>
                    <Text style={[styles.precioPeriodo, { color: colors?.text?.secondary ?? '#666' }]}>
                        /mes
                    </Text>
                </View>

                {/* Créditos */}
                <View style={styles.creditosRow}>
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#F59E0B" />
                    <Text style={[styles.creditosTexto, { color: colors?.text?.primary ?? '#111' }]}>
                        <Text style={{ fontWeight: '700' }}>{plan.creditos_mensuales} créditos</Text>
                        {' '}al mes
                    </Text>
                </View>

                {/* Separador */}
                <View
                    style={[
                        styles.separador,
                        { backgroundColor: colors?.border?.main ?? '#E5E7EB' },
                    ]}
                />

                {/* Beneficios estándar */}
                {[
                    'Créditos automáticos cada mes',
                    'Cancela cuando quieras',
                    'Soporte prioritario',
                ].map((beneficio) => (
                    <View key={beneficio} style={styles.beneficioRow}>
                        <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                        <Text style={[styles.beneficioText, { color: colors?.text?.secondary ?? '#555' }]}>
                            {beneficio}
                        </Text>
                    </View>
                ))}

                {/* Botón */}
                <TouchableOpacity
                    style={[
                        styles.botonSuscribirse,
                        {
                            backgroundColor: esPlanActual
                                ? (colors?.background?.default ?? '#F3F4F6')
                                : (colors?.primary?.['500'] ?? '#4E4FEB'),
                            opacity: cargando || (estaEnCualquierPlan && !esPlanActual) ? 0.6 : 1,
                        },
                    ]}
                    onPress={() => onSuscribirse(plan)}
                    disabled={cargando || esPlanActual || (estaEnCualquierPlan && !esPlanActual)}
                    activeOpacity={0.8}
                >
                    {cargando ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text
                            style={[
                                styles.botonSuscribirseTexto,
                                { color: esPlanActual ? (colors?.text?.secondary ?? '#666') : '#fff' },
                            ]}
                        >
                            {esPlanActual
                                ? 'Plan Activo'
                                : estaEnCualquierPlan
                                    ? 'Cambia tu plan actual primero'
                                    : 'Suscribirme'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }
);

// ─────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────
export default function SuscripcionesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const colors = theme?.colors ?? COLORS ?? {};

    const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);
    const [suscripcion, setSuscripcion] = useState<SuscripcionProveedor | null>(null);
    const [cargando, setCargando] = useState(true);
    const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
    const [actualizando, setActualizando] = useState(false);
    const [modal, setModal] = useState<ModalState>({
        visible: false,
        checkoutUrl: '',
        suscripcionId: 0,
    });

    const cargarDatos = useCallback(async () => {
        try {
            const [resPlanes, resSuscripcion] = await Promise.all([
                suscripcionesService.obtenerPlanes(),
                suscripcionesService.obtenerMiSuscripcion(),
            ]);

            if (resPlanes.success) setPlanes(resPlanes.planes);
            if (resSuscripcion.success) setSuscripcion(resSuscripcion.suscripcion);
        } catch (error) {
            console.error('[Suscripciones] Error cargando datos:', error);
        } finally {
            setCargando(false);
            setActualizando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const handleRefresh = useCallback(() => {
        setActualizando(true);
        cargarDatos();
    }, [cargarDatos]);

    const handleSuscribirse = useCallback(
        async (plan: PlanSuscripcion) => {
            setCargandoSuscripcion(true);
            try {
                const resultado = await suscripcionesService.suscribirse(plan.id);

                if (!resultado.success || !resultado.data) {
                    Alert.alert('Error', resultado.error ?? 'No se pudo iniciar la suscripción.');
                    return;
                }

                const { init_point, suscripcion_id } = resultado.data;

                if (!init_point) {
                    Alert.alert('Error', 'MercadoPago no retornó una URL de pago válida.');
                    return;
                }

                setModal({
                    visible: true,
                    checkoutUrl: init_point,
                    suscripcionId: suscripcion_id,
                });
            } catch (error) {
                Alert.alert('Error', 'Ocurrió un error inesperado. Intente nuevamente.');
            } finally {
                setCargandoSuscripcion(false);
            }
        },
        []
    );

    const handleCancelar = useCallback(() => {
        Alert.alert(
            'Cancelar Suscripción',
            '¿Estás seguro de que quieres cancelar tu suscripción mensual? Perderás los créditos automáticos al finalizar el mes en curso.',
            [
                { text: 'No, mantener suscripción', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        const resultado = await suscripcionesService.cancelarSuscripcion();
                        if (resultado.success) {
                            Alert.alert('Suscripción Cancelada', resultado.mensaje ?? 'Tu suscripción fue cancelada.');
                            setSuscripcion(null);
                        } else {
                            Alert.alert('Error', resultado.error ?? 'No se pudo cancelar la suscripción.');
                        }
                    },
                },
            ]
        );
    }, []);

    // ── Handlers del modal de MercadoPago ──────────────────────
    const handlePaymentSuccess = useCallback((_msg: string) => {
        setModal({ visible: false, checkoutUrl: '', suscripcionId: 0 });
        Alert.alert(
            '¡Suscripción Activada!',
            'Tu suscripción mensual fue autorizada correctamente. Los créditos se acreditarán automáticamente con cada cobro mensual.',
            [{ text: 'Entendido', onPress: cargarDatos }]
        );
    }, [cargarDatos]);

    const handlePaymentFailure = useCallback((_msg: string) => {
        setModal({ visible: false, checkoutUrl: '', suscripcionId: 0 });
        Alert.alert(
            'Suscripción No Completada',
            'No se pudo procesar la autorización. Intenta nuevamente o elige otro método de pago.',
        );
    }, []);

    const handlePaymentPending = useCallback(() => {
        setModal({ visible: false, checkoutUrl: '', suscripcionId: 0 });
        Alert.alert(
            'Suscripción Pendiente',
            'Tu suscripción está siendo procesada. Recibirás una confirmación pronto.',
            [{ text: 'OK', onPress: cargarDatos }]
        );
    }, [cargarDatos]);

    const handleModalClose = useCallback(() => {
        setModal({ visible: false, checkoutUrl: '', suscripcionId: 0 });
        cargarDatos();
    }, [cargarDatos]);

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    const backgroundDefault = colors?.background?.default ?? '#F9FAFB';
    const textPrimary = colors?.text?.primary ?? '#111';
    const textSecondary = colors?.text?.secondary ?? '#666';
    const primaryColor = colors?.primary?.['500'] ?? '#4E4FEB';
    const errorColor = colors?.error?.main ?? '#EF4444';

    if (cargando) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: backgroundDefault }]}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando planes...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: backgroundDefault }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: backgroundDefault }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Suscripciones</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={actualizando}
                        onRefresh={handleRefresh}
                        colors={[primaryColor]}
                        tintColor={primaryColor}
                    />
                }
            >
                {/* Suscripción actual */}
                {suscripcion && ['activa', 'pendiente', 'pausada'].includes(suscripcion.estado) && (
                    <View
                        style={[
                            styles.suscripcionActualCard,
                            {
                                backgroundColor: suscripcion.esta_activa ? '#F0FDF4' : '#FFFBEB',
                                borderColor: suscripcion.esta_activa ? '#22C55E' : '#F59E0B',
                            },
                        ]}
                    >
                        <View style={styles.suscripcionActualHeader}>
                            <MaterialCommunityIcons
                                name={suscripcion.esta_activa ? 'check-decagram' : 'clock-outline'}
                                size={22}
                                color={suscripcion.esta_activa ? '#22C55E' : '#F59E0B'}
                            />
                            <Text style={[styles.suscripcionActualTitulo, { color: textPrimary }]}>
                                {suscripcion.esta_activa ? 'Tu Suscripción Activa' : 'Suscripción Pendiente'}
                            </Text>
                        </View>
                        <Text style={[styles.suscripcionActualPlan, { color: primaryColor }]}>
                            {suscripcion.plan.nombre}
                        </Text>
                        <Text style={[styles.suscripcionActualDetalle, { color: textSecondary }]}>
                            {suscripcion.plan.creditos_mensuales} créditos/mes · $
                            {Math.round(suscripcion.plan.precio).toLocaleString('es-CL')}/mes
                        </Text>
                        {suscripcion.fecha_proximo_cobro && (
                            <Text style={[styles.suscripcionActualDetalle, { color: textSecondary, marginTop: 2 }]}>
                                Próximo cobro:{' '}
                                {new Date(suscripcion.fecha_proximo_cobro).toLocaleDateString('es-CL', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </Text>
                        )}
                        {suscripcion.estado === 'pendiente' && (
                            <Text style={[styles.pendienteNota, { color: '#B45309' }]}>
                                ⚠️ Aún no autorizaste el débito. Completa el proceso para activar tus créditos mensuales.
                            </Text>
                        )}
                        <TouchableOpacity
                            style={[styles.botonCancelar, { borderColor: errorColor }]}
                            onPress={handleCancelar}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.botonCancelarTexto, { color: errorColor }]}>
                                Cancelar Suscripción
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Hero subtitle */}
                <View style={styles.heroSection}>
                    <MaterialCommunityIcons name="lightning-bolt-circle" size={40} color={primaryColor} />
                    <Text style={[styles.heroTitulo, { color: textPrimary }]}>
                        Créditos Automáticos Cada Mes
                    </Text>
                    <Text style={[styles.heroSubtitulo, { color: textSecondary }]}>
                        Elige un plan y recibe créditos automáticamente cada mes. Cancela cuando quieras.
                    </Text>
                </View>

                {/* Lista de planes */}
                {planes.length === 0 ? (
                    <View style={styles.sinPlanesContainer}>
                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={textSecondary} />
                        <Text style={[styles.sinPlanesTexto, { color: textSecondary }]}>
                            No hay planes disponibles en este momento.
                        </Text>
                    </View>
                ) : (
                    planes.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            suscripcionActual={suscripcion}
                            onSuscribirse={handleSuscribirse}
                            cargando={cargandoSuscripcion}
                            colors={colors}
                        />
                    ))
                )}

                {/* Nota informativa */}
                <View
                    style={[
                        styles.notaContainer,
                        { backgroundColor: colors?.background?.paper ?? '#fff', borderColor: colors?.border?.main ?? '#E5E7EB' },
                    ]}
                >
                    <MaterialIcons name="info-outline" size={16} color={textSecondary} />
                    <Text style={[styles.notaTexto, { color: textSecondary }]}>
                        Los créditos mensuales son adicionales a tus recargas manuales. Los créditos de
                        compras únicas (Top-Up) no se ven afectados por la suscripción.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal de MercadoPago */}
            {modal.visible && (
                <MercadoPagoWebViewModal
                    visible={modal.visible}
                    checkoutUrl={modal.checkoutUrl}
                    compraId={modal.suscripcionId}
                    onClose={handleModalClose}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentFailure={handlePaymentFailure}
                    onPaymentPending={handlePaymentPending}
                />
            )}
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: TYPOGRAPHY.fontSize.md, marginTop: SPACING.sm },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backButton: { padding: SPACING.xs },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: '700',
    },

    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
    },

    // ─── Suscripción actual ────────────────────────────────────
    suscripcionActualCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    suscripcionActualHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    suscripcionActualTitulo: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600' },
    suscripcionActualPlan: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', marginTop: 4 },
    suscripcionActualDetalle: { fontSize: TYPOGRAPHY.fontSize.sm, marginTop: 2 },
    pendienteNota: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 8, lineHeight: 18 },
    botonCancelar: {
        marginTop: SPACING.md,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    botonCancelarTexto: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600' },

    // ─── Hero ─────────────────────────────────────────────────
    heroSection: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        gap: 8,
    },
    heroTitulo: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: '800',
        textAlign: 'center',
    },
    heroSubtitulo: {
        fontSize: TYPOGRAPHY.fontSize.md,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },

    // ─── PlanCard ─────────────────────────────────────────────
    planCard: {
        borderRadius: 20,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    badgeDestacado: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderBottomLeftRadius: 12,
    },
    badgeDestacadoText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    badgeActual: {
        position: 'absolute',
        top: 0,
        left: 0,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderBottomRightRadius: 12,
    },
    badgeActualText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    planNombre: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: '800',
        marginTop: SPACING.sm,
    },
    planDescripcion: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        marginTop: 4,
        lineHeight: 20,
    },
    precioContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: SPACING.md,
        gap: 2,
    },
    precioCurrency: { fontSize: 22, fontWeight: '700', paddingBottom: 4 },
    precioValor: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
    precioPeriodo: { fontSize: TYPOGRAPHY.fontSize.md, paddingBottom: 6 },

    creditosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        marginBottom: SPACING.md,
    },
    creditosTexto: { fontSize: TYPOGRAPHY.fontSize.md },

    separador: { height: 1, marginVertical: SPACING.sm },

    beneficioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    beneficioText: { fontSize: TYPOGRAPHY.fontSize.sm, flex: 1 },

    botonSuscribirse: {
        marginTop: SPACING.md,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    botonSuscribirseTexto: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },

    // ─── Sin planes ───────────────────────────────────────────
    sinPlanesContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    sinPlanesTexto: { fontSize: TYPOGRAPHY.fontSize.md, textAlign: 'center' },

    // ─── Nota informativa ─────────────────────────────────────
    notaContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        padding: SPACING.md,
        marginTop: SPACING.sm,
    },
    notaTexto: { fontSize: TYPOGRAPHY.fontSize.xs, flex: 1, lineHeight: 18 },
});
