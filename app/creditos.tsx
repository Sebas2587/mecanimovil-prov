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
import { router } from 'expo-router';

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
} from '@/services/suscripcionesService';
import mercadoPagoProveedorService from '@/services/mercadoPagoProveedorService';
import {
  SaldoCreditos,
  PaqueteCard,
  HistorialCompras,
  HistorialConsumos,
} from '@/components/creditos';
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
  const [activeTab, setActiveTab] = useState<TabType>('saldo');
  const [historialSubTab, setHistorialSubTab] = useState<HistorialSubTabType>('compras');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
  const [modalSuscripcion, setModalSuscripcion] = useState<ModalSuscripcion>({
    visible: false,
    checkoutUrl: '',
    suscripcionId: 0,
  });

  // ── Datos ─────────────────────────────────────────────────
  const [mpConectado, setMpConectado] = useState<boolean | null>(null); // null = cargando
  const [saldo, setSaldo] = useState<CreditoProveedor | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCreditos | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditos[]>([]);
  const [compras, setCompras] = useState<CompraCreditos[]>([]);
  const [consumos, setConsumos] = useState<ConsumoCredito[]>([]);
  const [suscripcion, setSuscripcion] = useState<SuscripcionProveedor | null>(null);
  const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);

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
      ] = await Promise.all([
        creditosService.obtenerSaldo(),
        creditosService.obtenerEstadisticas(),
        creditosService.obtenerHistorialCompras(50),
        creditosService.obtenerHistorialConsumos(50),
        suscripcionesService.obtenerMiSuscripcion(),
        suscripcionesService.obtenerPlanes(),
      ]);

      if (saldoResult.success && saldoResult.data) setSaldo(saldoResult.data);
      if (estadisticasResult.success && estadisticasResult.data) setEstadisticas(estadisticasResult.data);
      if (comprasResult.success && comprasResult.data) setCompras(comprasResult.data);
      if (consumosResult.success && consumosResult.data) setConsumos(consumosResult.data);
      if (suscripcionResult.success) setSuscripcion(suscripcionResult.suscripcion);
      if (planesResult.success) setPlanes(planesResult.planes);

      // 3. Paquetes (solo si la tab tienda es relevante)
      const paquetesResult = await creditosService.obtenerPaquetes();
      if (paquetesResult.success && paquetesResult.data) setPaquetes(paquetesResult.data);
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

  const handlePaymentSuccess = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    Alert.alert(
      '¡Suscripción Activada!',
      'Tu suscripción mensual fue autorizada. Los créditos se acreditarán automáticamente cada mes.',
      [{ text: 'Entendido', onPress: () => cargarDatos() }]
    );
  }, [cargarDatos]);

  const handlePaymentFailure = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    Alert.alert('No Completado', 'No se pudo procesar la autorización. Intenta nuevamente.');
  }, []);

  const handlePaymentPending = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    // "Pending" en el contexto de preapproval significa que el proveedor
    // NO completó la autorización del débito automático en el WebView de MP.
    // El registro de suscripción queda en estado 'pendiente' en la BD.
    Alert.alert(
      'Autorización no completada',
      'No completaste la autorización del débito automático. Tu suscripción quedó en estado pendiente.\n\nPuedes intentarlo nuevamente o cancelarla desde la pestaña Suscripción.',
      [{ text: 'Entendido', onPress: () => cargarDatos() }]
    );
  }, [cargarDatos]);

  const handleModalClose = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    cargarDatos();
  }, [cargarDatos]);

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
      {saldo && <SaldoCreditos saldo={saldo.saldo_creditos} />}

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

      {/* Banner de suscripción */}
      {tieneSuscripcionActiva ? (
        <TouchableOpacity
          style={[
            styles.suscripcionBanner,
            {
              backgroundColor: suscripcion?.esta_activa ? '#F0FDF4' : '#FFFBEB',
              borderColor: suscripcion?.esta_activa ? '#22C55E' : '#F59E0B',
            },
          ]}
          onPress={() => setActiveTab('suscripcion')}
          activeOpacity={0.8}
        >
          <View style={styles.bannerLeft}>
            <MaterialCommunityIcons
              name={suscripcion?.esta_activa ? 'check-decagram' : 'clock-outline'}
              size={20}
              color={suscripcion?.esta_activa ? '#22C55E' : '#F59E0B'}
            />
            <View>
              <Text style={[styles.suscripcionBannerTitulo, { color: textPrimary }]}>
                {suscripcion?.esta_activa ? 'Suscripción Activa' : 'Suscripción Pendiente'}
              </Text>
              <Text style={[styles.suscripcionBannerSubtitulo, { color: textSecondary }]}>
                {suscripcion?.plan.nombre} · {suscripcion?.plan.creditos_mensuales} créd/mes
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={textSecondary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.suscripcionBanner, { backgroundColor: backgroundPaper, borderColor: primaryColor }]}
          onPress={() => setActiveTab('suscripcion')}
          activeOpacity={0.8}
        >
          <View style={styles.bannerLeft}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={primaryColor} />
            <View>
              <Text style={[styles.suscripcionBannerTitulo, { color: textPrimary }]}>
                Créditos Automáticos Cada Mes
              </Text>
              <Text style={[styles.suscripcionBannerSubtitulo, { color: textSecondary }]}>
                Suscríbete y nunca te quedes sin créditos
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={primaryColor} />
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
            <Text style={[styles.pendienteNota, { color: '#B45309' }]}>
              ⚠️ Aún no autorizaste el débito. Completa el proceso para activar tus créditos mensuales.
            </Text>
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

      {/* Hero */}
      <View style={styles.heroSection}>
        <MaterialCommunityIcons name="lightning-bolt-circle" size={40} color={primaryColor} />
        <Text style={[styles.heroTitulo, { color: textPrimary }]}>Créditos Automáticos Cada Mes</Text>
        <Text style={[styles.heroSubtitulo, { color: textSecondary }]}>
          Elige un plan y recibe créditos automáticamente. Cancela cuando quieras.
        </Text>
      </View>

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

      <View style={[styles.notaContainer, { backgroundColor: backgroundPaper, borderColor: borderMain }]}>
        <MaterialIcons name="info-outline" size={16} color={textSecondary} />
        <Text style={[styles.notaTexto, { color: textSecondary }]}>
          Los créditos mensuales son adicionales a tus recargas manuales. Los créditos de compras únicas (Top-Up) no se ven afectados por la suscripción.
        </Text>
      </View>
    </ScrollView>
  );

  const renderTabTienda = () => (
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
              Comprá un paquete extra para seguir postulando antes de la recarga automática
            </Text>
          </View>
        </View>
      )}

      {paquetes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={48} color={textSecondary} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>No hay paquetes disponibles</Text>
        </View>
      ) : (
        <View style={{ gap: SPACING.md }}>
          {paquetes.map((paquete) => (
            <PaqueteCard
              key={paquete.id}
              paquete={paquete}
              destacado={paquete.destacado}
              onPress={() => handleComprarPaquete(paquete)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

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

  heroSection: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 8 },
  heroTitulo: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', textAlign: 'center' },
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
  historialTabText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '500' },
});
