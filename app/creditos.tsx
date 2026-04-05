/**
 * Pantalla unificada de Suscripciones & Créditos — MecaniMovil Proveedores
 *
 * Tabs:
 *   1. Saldo      – balance actual + banner de suscripción + estadísticas del mes
 *   2. Suscripción – planes MP + suscripción activa
 *   3. Tienda     – paquetes extra (visible solo si hay suscripción activa)
 *   4. Historial  – compras y consumos
 *
 * Reglas de negocio:
 *  - Si el proveedor NO tiene cuenta MP conectada → pantalla de bloqueo
 *  - La tab Tienda sólo aparece si hay suscripción activa
 *  - Si saldo = 0 con suscripción activa → banner destacado de compra extra
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { router, useLocalSearchParams } from 'expo-router';

import creditosService, {
  type CreditoProveedor,
  type PaqueteCreditos,
  type EstadisticasCreditos,
  type CompraCreditos,
  type ConsumoCredito,
} from '@/services/creditosService';
import suscripcionesService, {
  type PlanSuscripcion,
  type SuscripcionProveedor,
  type CobroMP,
} from '@/services/suscripcionesService';
import mercadoPagoProveedorService, {
  type EstadisticasPagosMP,
  type PagoRecibido,
} from '@/services/mercadoPagoProveedorService';
import {
  SaldoCreditos,
  PaqueteCard,
  HistorialCompras,
  HistorialConsumos,
} from '@/components/creditos';
import { InteractiveStatsChart } from '@/components/creditos/InteractiveStatsChart';
import MercadoPagoWebViewModal from '@/components/creditos/MercadoPagoWebViewModal';
import Header from '@/components/Header';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
type TabType = 'saldo' | 'suscripcion' | 'tienda' | 'historial';
type HistorialSubTabType = 'compras' | 'consumos';

interface ModalSuscripcion {
  visible: boolean;
  checkoutUrl: string;
  suscripcionId: number;
}

// ─────────────────────────────────────────────────────────────
// Componente PlanCard (suscripciones)
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
    const primaryColor = colors?.primary?.['500'] ?? '#4E4FEB';
    const textPrimary = colors?.text?.primary ?? '#111';
    const textSecondary = colors?.text?.secondary ?? '#666';

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
            borderColor: plan.destacado ? primaryColor : (colors?.border?.main ?? '#E0E0E0'),
            borderWidth: plan.destacado ? 2 : 1,
          },
        ]}
      >
        {plan.destacado && (
          <View style={[styles.badgeDestacado, { backgroundColor: primaryColor }]}>
            <Text style={styles.badgeSmallText}>⭐ MÁS POPULAR</Text>
          </View>
        )}
        {esPlanActual && (
          <View style={[styles.badgeActual, { backgroundColor: '#22C55E' }]}>
            <Text style={styles.badgeSmallText}>✓ TU PLAN ACTUAL</Text>
          </View>
        )}

        <Text style={[styles.planNombre, { color: textPrimary }]}>{plan.nombre}</Text>
        <Text style={[styles.planDescripcion, { color: textSecondary }]}>{plan.descripcion}</Text>

        <View style={styles.precioContainer}>
          <Text style={[styles.precioCurrency, { color: primaryColor }]}>$</Text>
          <Text style={[styles.precioValor, { color: primaryColor }]}>
            {Math.round(plan.precio).toLocaleString('es-CL')}
          </Text>
          <Text style={[styles.precioPeriodo, { color: textSecondary }]}>/mes</Text>
        </View>

        <View style={styles.creditosRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color="#F59E0B" />
          <Text style={[styles.creditosTexto, { color: textPrimary }]}>
            <Text style={{ fontWeight: '700' }}>{plan.creditos_mensuales} créditos</Text>
            {' '}al mes
          </Text>
        </View>

        <View style={[styles.separador, { backgroundColor: colors?.border?.main ?? '#E5E7EB' }]} />

        {['Créditos automáticos cada mes', 'Cancela cuando quieras', 'Soporte prioritario'].map(
          (b) => (
            <View key={b} style={styles.beneficioRow}>
              <MaterialIcons name="check-circle" size={16} color="#22C55E" />
              <Text style={[styles.beneficioText, { color: textSecondary }]}>{b}</Text>
            </View>
          )
        )}

        <TouchableOpacity
          style={[
            styles.botonSuscribirse,
            {
              backgroundColor: esPlanActual
                ? (colors?.background?.default ?? '#F3F4F6')
                : primaryColor,
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
                { color: esPlanActual ? (textSecondary) : '#fff' },
              ]}
            >
              {esPlanActual
                ? 'Plan Activo'
                : estaEnCualquierPlan
                  ? 'Cancela tu plan actual primero'
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
export default function CreditosScreen() {
  const theme = useTheme();
  const colors = theme?.colors ?? COLORS ?? {};

  const textPrimary = colors?.text?.primary ?? '#000';
  const textSecondary = colors?.text?.secondary ?? '#666';
  const primaryColor = colors?.primary?.['500'] ?? '#4E4FEB';
  const backgroundDefault = colors?.background?.default ?? '#F5F5F5';
  const backgroundPaper = colors?.background?.paper ?? '#fff';
  const borderMain = colors?.border?.main ?? '#D0D0D0';
  const errorColor = colors?.error?.main ?? '#EF4444';
  const successColor = colors?.success?.main ?? '#22C55E';

  // ── Estado de UI ──────────────────────────────────────────
  const { tab } = useLocalSearchParams<{ tab: TabType }>();
  const [activeTab, setActiveTab] = useState<TabType>('saldo');
  const [historialSubTab, setHistorialSubTab] = useState<HistorialSubTabType>('compras');

  // Manejar cambio de pestaña por parámetros (navegación profunda)
  useEffect(() => {
    if (tab && ['saldo', 'suscripcion', 'tienda', 'historial'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [tab]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
  const [cargandoSincronizar, setCargandoSincronizar] = useState(false);
  const [modalSuscripcion, setModalSuscripcion] = useState<ModalSuscripcion>({
    visible: false,
    checkoutUrl: '',
    suscripcionId: 0,
  });

  // ── Datos ─────────────────────────────────────────────────
  const [mpConectado, setMpConectado] = useState<boolean | null>(null); // null = cargando
  const [saldo, setSaldo] = useState<CreditoProveedor | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCreditos | null>(null);
  const [compras, setCompras] = useState<CompraCreditos[]>([]);
  const [consumos, setConsumos] = useState<ConsumoCredito[]>([]);
  const [suscripcion, setSuscripcion] = useState<SuscripcionProveedor | null>(null);
  const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);
  const [estadisticasMP, setEstadisticasMP] = useState<EstadisticasPagosMP | null>(null);
  const [historialPagos, setHistorialPagos] = useState<PagoRecibido[]>([]);
  const [cantidadComprar, setCantidadComprar] = useState<number>(5);
  const [cobrosMP, setCobrosMP] = useState<CobroMP[]>([]);
  const [cargandoCobros, setCargandoCobros] = useState(false);

  // ── Computed ──────────────────────────────────────────────
  const tieneSuscripcionActiva = useMemo(
    () => suscripcion !== null && ['activa', 'pendiente'].includes(suscripcion?.estado ?? ''),
    [suscripcion]
  );
  const saldoCero = useMemo(
    () => saldo !== null && saldo.saldo_creditos === 0,
    [saldo]
  );

  // Tabs visibles: Tienda solo si tiene suscripción activa
  const tabsVisibles: TabType[] = useMemo(
    () =>
      tieneSuscripcionActiva
        ? ['saldo', 'suscripcion', 'tienda', 'historial']
        : ['saldo', 'suscripcion', 'historial'],
    [tieneSuscripcionActiva]
  );

  // ── Carga de datos ────────────────────────────────────────
  const cargarDatos = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      // 1. Verificar estado MP
      const mpResult = await mercadoPagoProveedorService.obtenerEstadoCuenta();
      const conectada = mpResult.success && mpResult.data?.estado === 'conectada';
      setMpConectado(conectada);

      if (!conectada) return;

      // 2. Cargar todos los datos en paralelo
      const [
        saldoResult,
        estadisticasResult,
        comprasResult,
        consumosResult,
        suscripcionResult,
        planesResult,
        estadisticasMPResult,
        historialPagosResult,
        cobrosResult,
      ] = await Promise.all([
        creditosService.obtenerSaldo(),
        creditosService.obtenerEstadisticas(),
        creditosService.obtenerHistorialCompras(50),
        creditosService.obtenerHistorialConsumos(50),
        suscripcionesService.obtenerMiSuscripcion(),
        suscripcionesService.obtenerPlanes(),
        mercadoPagoProveedorService.obtenerEstadisticasPagos(),
        mercadoPagoProveedorService.obtenerHistorialPagos(),
        suscripcionesService.obtenerHistorialCobros(),
      ]);

      if (saldoResult.success && saldoResult.data) setSaldo(saldoResult.data);
      if (estadisticasResult.success && estadisticasResult.data) setEstadisticas(estadisticasResult.data);
      if (comprasResult.success && comprasResult.data) setCompras(comprasResult.data);
      if (consumosResult.success && consumosResult.data) setConsumos(consumosResult.data);
      if (suscripcionResult.success) setSuscripcion(suscripcionResult.suscripcion);
      if (planesResult.success) setPlanes(planesResult.planes);
      if (estadisticasMPResult && estadisticasMPResult.success && estadisticasMPResult.data) {
        setEstadisticasMP(estadisticasMPResult.data);
      }
      if (historialPagosResult?.success && historialPagosResult.data) {
        setHistorialPagos(historialPagosResult.data.historial);
      }
      if (cobrosResult?.success) {
        setCobrosMP(cobrosResult.cobros);
      }

      // 3. (Eliminado: Paquetes ya no se utilizan)
    } catch (err: any) {
      console.error('[CreditosScreen] Error cargando datos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos(true);
  }, [cargarDatos]);

  // ── Handlers suscripción ──────────────────────────────────
  const handleSuscribirse = useCallback(async (plan: PlanSuscripcion) => {
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
      setModalSuscripcion({ visible: true, checkoutUrl: init_point, suscripcionId: suscripcion_id });
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setCargandoSuscripcion(false);
    }
  }, []);

  const handleCancelarSuscripcion = useCallback(() => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que quieres cancelar tu suscripción mensual? Perderás los créditos automáticos al finalizar el mes.',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const resultado = await suscripcionesService.cancelarSuscripcion();
            if (resultado.success) {
              Alert.alert('Cancelada', resultado.mensaje ?? 'Tu suscripción fue cancelada.');
              setSuscripcion(null);
            } else {
              Alert.alert('Error', resultado.error ?? 'No se pudo cancelar.');
            }
          },
        },
      ]
    );
  }, []);

  const handleSincronizarSuscripcion = useCallback(async () => {
    setCargandoSincronizar(true);
    try {
      const resultado = await suscripcionesService.sincronizarSuscripcion();
      console.log('[handleSincronizarSuscripcion] Resultado:', JSON.stringify(resultado, null, 2));

      if (resultado.success && resultado.sincronizado) {
        // Verificar si se acreditaron cobros
        const cobrosProcesados = (resultado as any).cobros_procesados || [];
        const acreditados = cobrosProcesados.filter((c: any) => c.acreditado);

        let mensajeExito = resultado.mensaje ?? 'Tu suscripción fue sincronizada con Mercado Pago.';

        if (acreditados.length > 0) {
          const totalCreditos = acreditados.reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);
          mensajeExito = `¡Éxito! Se detectaron y acreditaron ${totalCreditos} créditos de tu suscripción.`;

          Alert.alert(
            '¡Créditos Acreditados!',
            mensajeExito,
            [{ text: 'Excelente', onPress: () => cargarDatos() }]
          );
        } else if (resultado.estado === 'activa') {
          Alert.alert(
            'Suscripción Activa',
            mensajeExito + (cobrosProcesados.length > 0 ? '\n\nLos cobros ya habían sido acreditados anteriormente.' : ''),
            [{ text: 'OK', onPress: () => cargarDatos() }]
          );
        } else {
          Alert.alert(
            'Verificado',
            mensajeExito,
            [{ text: 'OK', onPress: () => cargarDatos() }]
          );
        }
      } else {
        Alert.alert('No encontrado', resultado.error || 'No se encontró una suscripción autorizada en Mercado Pago para tu cuenta.');
      }
    } catch (error) {
      console.error('[handleSincronizarSuscripcion] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al verificar. Intenta nuevamente.');
    } finally {
      setCargandoSincronizar(false);
    }
  }, [cargarDatos]);

  const handlePaymentSuccess = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    // Inactivar el modal antes de disparar la alerta para evitar bloqueos
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handlePaymentFailure = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    Alert.alert('No Completado', 'No se pudo procesar la autorización. Intenta nuevamente.');
  }, []);

  const handlePaymentPending = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    // Probar sincronización por si el pago fue aprobado pero el WebView no se enteró
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handleModalClose = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handleComprarPaquete = useCallback((paquete: PaqueteCreditos) => {
    router.push({ pathname: '/creditos/comprar', params: { paqueteId: paquete.id.toString() } });
  }, []);

  // ── Loading inicial ───────────────────────────────────────
  if (loading || mpConectado === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: backgroundDefault }]} edges={['left', 'right', 'bottom']}>
        <Header title="Suscripción & Créditos" showBack onBackPress={() => router.back()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pantalla de bloqueo: MP no conectado ─────────────────
  if (!mpConectado) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: backgroundDefault }]} edges={['left', 'right', 'bottom']}>
        <Header title="Suscripción & Créditos" showBack onBackPress={() => router.back()} />
        <View style={styles.centerContainer}>
          <View style={[styles.bloqueoCard, { backgroundColor: backgroundPaper, borderColor: borderMain }]}>
            <MaterialCommunityIcons name="lock-outline" size={56} color="#009EE3" />
            <Text style={[styles.bloqueoTitulo, { color: textPrimary }]}>
              Cuenta MP requerida
            </Text>
            <Text style={[styles.bloqueoDescripcion, { color: textSecondary }]}>
              Para acceder a suscripciones y créditos necesitas conectar tu cuenta de Mercado Pago.
              {'\n\n'}
              Sin ella tampoco puedes recibir pagos de clientes ni postular a nuevas solicitudes.
            </Text>
            <TouchableOpacity
              style={[styles.botonBloqueo, { backgroundColor: '#009EE3' }]}
              onPress={() => router.push('/configuracion-mercadopago')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="link" size={20} color="#fff" />
              <Text style={styles.botonBloqueoTexto}>Conectar Mercado Pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Contenido por tab ─────────────────────────────────────
  const renderTabSaldo = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
    >
      {saldo && (
        <SaldoCreditos
          saldo={saldo.saldo_creditos}
          ganancias={estadisticasMP?.total_recibido_mes}
          titulo={suscripcion?.plan.nombre}
          disabled={true}
        />
      )}

      {/* Gráfica interactiva */}
      <InteractiveStatsChart
        ingresos={historialPagos}
        consumos={consumos}
      />

      {/* Banner saldo cero con suscripción activa → comprar extra */}
      {saldoCero && tieneSuscripcionActiva && (
        <TouchableOpacity
          style={[styles.bannerAlerta, { backgroundColor: '#FFF3E0', borderColor: '#F59E0B' }]}
          onPress={() => setActiveTab('tienda')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={22} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.bannerTitulo, { color: '#B45309' }]}>¡Sin créditos disponibles!</Text>
            <Text style={[styles.bannerSubtitulo, { color: '#92400E' }]}>
              Comprá un paquete extra para seguir postulando
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#F59E0B" />
        </TouchableOpacity>
      )}

      {/* Estadísticas del mes */}
      {estadisticas && (
        <View style={[styles.statsCard, { backgroundColor: backgroundPaper }]}>
          <Text style={[styles.statsTitle, { color: textPrimary }]}>Estadísticas del mes</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: primaryColor }]}>
                {estadisticas.creditos_consumidos_mes}
              </Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Consumidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: successColor }]}>
                {estadisticas.creditos_comprados_mes}
              </Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Comprados</Text>
            </View>
            {estadisticas.creditos_expirados > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: errorColor }]}>
                  {estadisticas.creditos_expirados}
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Expirados</Text>
              </View>
            )}
          </View>
          {/* Próxima expiración: solo mostrar si hay suscripción activa y una fecha próxima de cobro */}
          {tieneSuscripcionActiva && suscripcion?.fecha_proximo_cobro && (
            <View style={styles.expirationRow}>
              <MaterialIcons name="schedule" size={14} color={textSecondary} />
              <Text style={[styles.expirationText, { color: textSecondary }]}>
                Próx. recarga de créditos:{' '}
                {new Date(suscripcion.fecha_proximo_cobro).toLocaleDateString('es-CL')}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderTabSuscripcion = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
    >
      {/* Botón de sincronización manual (Sutil en la parte superior) */}
      <TouchableOpacity
        style={styles.topSyncContainer}
        onPress={handleSincronizarSuscripcion}
        disabled={cargandoSincronizar}
        activeOpacity={0.7}
      >
        {cargandoSincronizar ? (
          <ActivityIndicator size="small" color={primaryColor} />
        ) : (
          <View style={styles.topSyncContent}>
            <MaterialIcons name="sync" size={16} color={primaryColor} />
            <Text style={[styles.topSyncText, { color: primaryColor }]}>
              ¿Suscripción no aparece? Sincronizar
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Suscripción activa */}
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
            <View style={{ marginBottom: SPACING.md }}>
              <Text style={[styles.pendienteNota, { color: '#B45309' }]}>
                ⚠️ ¿Ya autorizaste el pago en Mercado Pago pero sigue apareciendo como pendiente?
              </Text>
              <TouchableOpacity
                style={[styles.botonVerificar, { borderColor: '#009EE3', backgroundColor: '#EFF8FF', marginTop: 8 }]}
                onPress={handleSincronizarSuscripcion}
                disabled={cargandoSincronizar}
                activeOpacity={0.8}
              >
                {cargandoSincronizar ? (
                  <ActivityIndicator size="small" color="#009EE3" />
                ) : (
                  <>
                    <MaterialIcons name="sync" size={16} color="#009EE3" />
                    <Text style={[styles.botonVerificarTexto, { color: '#009EE3' }]}>Verificar estado con MP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.botonCancelar, { borderColor: errorColor }]}
            onPress={handleCancelarSuscripcion}
            activeOpacity={0.8}
          >
            <Text style={[styles.botonCancelarTexto, { color: errorColor }]}>
              Cancelar Suscripción
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Historial de cobros reales de MercadoPago */}
      {suscripcion && suscripcion.estado === 'activa' && (
        <View style={[styles.cobrosSection, { backgroundColor: backgroundPaper }]}>
          <View style={styles.cobrosHeader}>
            <MaterialIcons name="receipt-long" size={20} color={primaryColor} />
            <Text style={[styles.cobrosTitle, { color: textPrimary }]}>Pagos Recurrentes MP</Text>
          </View>

          {cobrosMP.length === 0 ? (
            <View style={styles.cobrosEmpty}>
              <MaterialIcons name="info-outline" size={18} color={textSecondary} />
              <Text style={[styles.cobrosEmptyText, { color: textSecondary }]}>
                No se encontraron cobros recurrentes en MercadoPago para esta suscripción.
                {'\n'}Los créditos solo se acreditan cuando MP confirma un cobro real.
              </Text>
            </View>
          ) : (
            cobrosMP.map((cobro) => {
              const isApproved = ['approved', 'authorized', 'processed'].includes(cobro.status);
              const isRejected = ['rejected', 'cancelled'].includes(cobro.status);

              return (
                <View
                  key={cobro.id}
                  style={[
                    styles.cobroRow,
                    {
                      backgroundColor: isApproved ? '#F0FDF4' : isRejected ? '#FEF2F2' : '#FFFBEB',
                      borderColor: isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#FDE68A',
                    },
                  ]}
                >
                  <View style={styles.cobroLeft}>
                    <MaterialIcons
                      name={isApproved ? 'check-circle' : isRejected ? 'cancel' : 'schedule'}
                      size={20}
                      color={isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.cobroStatus, { color: isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706' }]}>
                        {isApproved ? 'Cobro Aprobado' : isRejected ? 'Cobro Rechazado' : `Estado: ${cobro.status}`}
                      </Text>
                      {cobro.fecha && (
                        <Text style={[styles.cobroDate, { color: textSecondary }]}>
                          {new Date(cobro.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cobroRight}>
                    {cobro.monto != null && (
                      <Text style={[styles.cobroMonto, { color: textPrimary }]}>
                        ${Math.round(cobro.monto).toLocaleString('es-CL')}
                      </Text>
                    )}
                    {cobro.acreditado && (
                      <View style={[styles.cobroAcreditadoBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700' }}>ACREDITADO</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Contenedor de Planes con espaciado superior consistente */}
      <View style={{ marginTop: suscripcion && ['activa', 'pendiente', 'pausada'].includes(suscripcion.estado) ? SPACING.sm : 0 }}>
        {/* Planes */}
        {planes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={48} color={textSecondary} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
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
      </View>

      <View style={[styles.notaContainer, { backgroundColor: backgroundPaper, borderColor: borderMain, marginTop: SPACING.md }]}>
        <MaterialIcons name="info-outline" size={16} color={textSecondary} />
        <Text style={[styles.notaTexto, { color: textSecondary }]}>
          Los créditos mensuales son adicionales a tus recargas manuales. Los créditos de compras únicas (Top-Up) no se ven afectados por la suscripción.
        </Text>
      </View>
    </ScrollView>
  );

  const renderTabTienda = () => {
    const PRECIO_BASE = 300;
    const PRECIO_TOTAL = cantidadComprar * PRECIO_BASE;
    const precioFormateado = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(PRECIO_TOTAL);

    const creditosDisponibles = saldo?.saldo_creditos || 0;
    const restringirCompra = tieneSuscripcionActiva && creditosDisponibles > 5;

    return (
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {/* Banner si saldo = 0 */}
        {saldoCero && (
          <View style={[styles.bannerAlerta, { backgroundColor: '#FFF3E0', borderColor: '#F59E0B', marginBottom: 12 }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.bannerTitulo, { color: '#B45309' }]}>Sin créditos disponibles</Text>
              <Text style={[styles.bannerSubtitulo, { color: '#92400E' }]}>
                Comprá créditos para seguir postulando a los trabajos disponibles.
              </Text>
            </View>
          </View>
        )}

        {restringirCompra ? (
          <View style={[styles.planCard, { backgroundColor: backgroundPaper, alignItems: 'center', paddingVertical: SPACING['2xl'] }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: successColor + '20', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
              <MaterialCommunityIcons name="shield-check" size={32} color={successColor} />
            </View>
            <Text style={[styles.planNombre, { color: textPrimary, textAlign: 'center', marginBottom: SPACING.sm }]}>
              Todo en orden
            </Text>
            <Text style={[styles.planDescripcion, { color: textSecondary, textAlign: 'center' }]}>
              Ya posees una suscripción activa y {creditosDisponibles} créditos disponibles. Podrás comprar más créditos de recarga cuando te queden 5 o menos créditos.
            </Text>
          </View>
        ) : (
          <View style={[styles.planCard, { backgroundColor: backgroundPaper }]}>
            <Text style={[styles.planNombre, { color: textPrimary, textAlign: 'center', marginBottom: SPACING.md }]}>
              Comprar Créditos
            </Text>
            <Text style={[styles.planDescripcion, { color: textSecondary, textAlign: 'center', marginBottom: SPACING.xl }]}>
              Ingresa la cantidad exacta de créditos que necesitas. Cada crédito tiene un valor base de $300 CLP.
            </Text>

            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: backgroundDefault, borderColor: borderMain }]}
                onPress={() => setCantidadComprar(prev => Math.max(1, prev - 1))}
              >
                <MaterialIcons name="remove" size={24} color={textPrimary} />
              </TouchableOpacity>

              <View style={styles.counterValueContainer}>
                <Text style={[styles.counterValue, { color: primaryColor }]}>{cantidadComprar}</Text>
                <Text style={[styles.counterLabel, { color: textSecondary }]}>créditos</Text>
              </View>

              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: backgroundDefault, borderColor: borderMain }]}
                onPress={() => setCantidadComprar(prev => prev + 1)}
              >
                <MaterialIcons name="add" size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickSelectContainer}>
              {[5, 10, 20, 50].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.quickSelectButton,
                    cantidadComprar === val ? { backgroundColor: primaryColor, borderColor: primaryColor } : { backgroundColor: backgroundDefault, borderColor: borderMain }
                  ]}
                  onPress={() => setCantidadComprar(val)}
                >
                  <Text style={[
                    styles.quickSelectText,
                    cantidadComprar === val ? { color: '#FFF' } : { color: textPrimary }
                  ]}>+{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.separador, { backgroundColor: borderMain }]} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
              <Text style={{ fontSize: TYPOGRAPHY.fontSize.lg, color: textSecondary, fontWeight: '600' }}>Total a pagar:</Text>
              <Text style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 'bold', color: textPrimary }}>{precioFormateado}</Text>
            </View>

            <TouchableOpacity
              style={[styles.botonSuscribirse, { backgroundColor: primaryColor }]}
              onPress={() => router.push(`/creditos/comprar?cantidadCreditos=${cantidadComprar}`)}
            >
              <Text style={[styles.botonSuscribirseTexto, { color: '#FFF' }]}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderTabHistorial = () => (
    <View style={styles.historialContainer}>
      <View style={[styles.historialTabs, { backgroundColor: backgroundPaper, borderBottomColor: borderMain }]}>
        {(['compras', 'consumos'] as HistorialSubTabType[]).map((sub) => (
          <TouchableOpacity
            key={sub}
            style={[
              styles.historialTab,
              { borderBottomColor: historialSubTab === sub ? primaryColor : 'transparent' },
            ]}
            onPress={() => setHistorialSubTab(sub)}
          >
            <Text
              style={[
                styles.historialTabText,
                { color: historialSubTab === sub ? primaryColor : textSecondary },
              ]}
            >
              {sub === 'compras' ? 'Compras' : 'Consumos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {historialSubTab === 'compras' ? (
          <HistorialCompras compras={compras} onRefresh={onRefresh} refreshing={refreshing} />
        ) : (
          <HistorialConsumos consumos={consumos} onRefresh={onRefresh} refreshing={refreshing} />
        )}
      </View>
    </View>
  );

  // ── Tab labels & icons ────────────────────────────────────
  const tabInfo: Record<TabType, { label: string; icon: string }> = {
    saldo: { label: 'Saldo', icon: 'account-balance-wallet' },
    suscripcion: { label: 'Suscripción', icon: 'card-membership' },
    tienda: { label: 'Tienda', icon: 'store' },
    historial: { label: 'Historial', icon: 'history' },
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: backgroundDefault }]}
      edges={['left', 'right', 'bottom']}
    >
      <Header title="Suscripción & Créditos" showBack onBackPress={() => router.back()} />

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: backgroundPaper, borderBottomColor: borderMain }]}>
        {tabsVisibles.map((tab) => {
          const info = tabInfo[tab];
          const esActivo = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, esActivo && { borderBottomColor: primaryColor }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={info.icon as any}
                size={18}
                color={esActivo ? primaryColor : textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: esActivo ? primaryColor : textSecondary,
                    fontWeight: esActivo ? '700' : '400',
                  },
                ]}
              >
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contenido */}
      {activeTab === 'saldo' && renderTabSaldo()}
      {activeTab === 'suscripcion' && renderTabSuscripcion()}
      {activeTab === 'tienda' && renderTabTienda()}
      {activeTab === 'historial' && renderTabHistorial()}

      {/* Modal MP Suscripción */}
      {modalSuscripcion.visible && (
        <MercadoPagoWebViewModal
          visible={modalSuscripcion.visible}
          checkoutUrl={modalSuscripcion.checkoutUrl}
          compraId={modalSuscripcion.suscripcionId}
          suscripcionId={modalSuscripcion.suscripcionId}
          verificarSuscripcion={suscripcionesService.verificarSuscripcion}
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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.md },

  // ─── Bloqueo MP ───────────────────────────────────────────
  bloqueoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    maxWidth: 340,
    width: '100%',
  },
  bloqueoTitulo: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', textAlign: 'center' },
  bloqueoDescripcion: { fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', lineHeight: 22 },
  botonBloqueo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    marginTop: SPACING.sm,
  },
  botonBloqueoTexto: { color: '#fff', fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },

  // ─── Tabs ─────────────────────────────────────────────────
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12 },

  // ─── Scroll ───────────────────────────────────────────────
  scrollContent: { flex: 1, padding: SPACING.md },

  // ─── Banners ──────────────────────────────────────────────
  bannerAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  bannerTitulo: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  bannerSubtitulo: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  suscripcionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  suscripcionBannerTitulo: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  suscripcionBannerSubtitulo: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 1 },

  // ─── Stats ────────────────────────────────────────────────
  statsCard: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '600', marginBottom: SPACING.md },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.sm },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: TYPOGRAPHY.fontSize.sm },
  expirationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  expirationText: { fontSize: TYPOGRAPHY.fontSize.sm },

  // ─── Suscripción tab ──────────────────────────────────────
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
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12,
  },
  badgeActual: {
    position: 'absolute', top: 0, left: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomRightRadius: 12,
  },
  badgeSmallText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planNombre: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', marginTop: SPACING.sm },
  planDescripcion: { fontSize: TYPOGRAPHY.fontSize.sm, marginTop: 4, lineHeight: 20 },
  precioContainer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: SPACING.md, gap: 2 },
  precioCurrency: { fontSize: 22, fontWeight: '700', paddingBottom: 4 },
  precioValor: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  precioPeriodo: { fontSize: TYPOGRAPHY.fontSize.md, paddingBottom: 6 },
  creditosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: SPACING.md },
  creditosTexto: { fontSize: TYPOGRAPHY.fontSize.md },
  separador: { height: 1, marginVertical: SPACING.sm },
  beneficioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  beneficioText: { fontSize: TYPOGRAPHY.fontSize.sm, flex: 1 },
  botonSuscribirse: { marginTop: SPACING.md, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  botonSuscribirseTexto: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },

  // ─── Nota / Empty ─────────────────────────────────────────
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
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.md, textAlign: 'center' },

  // ─── Historial ────────────────────────────────────────────
  historialContainer: { flex: 1 },
  historialTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  historialTab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 2 },
  botonVerificar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonVerificarTexto: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600' },
  historialTabText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '500' },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  syncButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
  },
  topSyncContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  topSyncContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0E7FF',
  },
  topSyncText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
  },
  // ─── Custom Counter ────────────────────────────────────────
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterValue: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  counterLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickSelectText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '700',
  },

  // ─── Cobros MP ─────────────────────────────────────────────
  cobrosSection: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cobrosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  cobrosTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
  },
  cobrosEmpty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: SPACING.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  cobrosEmptyText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
  cobroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: 8,
  },
  cobroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cobroStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
  },
  cobroDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  cobroRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  cobroMonto: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
  },
  cobroAcreditadoBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
