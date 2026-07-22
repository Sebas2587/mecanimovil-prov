import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import {
  HostPaperSection,
  HostSectionKicker,
  HostMetricRow,
  InstitutionalButton,
  InstitutionalTag,
  hostScreenStyles,
} from '@/app/design-system/components';
import type { InstitutionalTagVariant } from '@/app/design-system/styles/institutionalTags';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import mercadoPagoProveedorService, {
  type EstadoCuentaMP,
  type PagoRecibido,
} from '@/services/mercadoPagoProveedorService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useMercadoPagoCuentaQuery } from '@/hooks/useMercadoPagoCuentaQuery';

const I = COLORS.institutional;
const CANVAS = COLORS.background.default;

// Necesario para que WebBrowser pueda completar la sesión de autenticación
WebBrowser.maybeCompleteAuthSession();

export default function ConfiguracionMercadoPagoScreen() {
  // Estados
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  const {
    cuenta,
    estadisticas,
    historialPagos,
    loading,
    isRefetching,
    error,
    refresh,
    invalidate,
  } = useMercadoPagoCuentaQuery(true);

  // Referencia para rastrear si estamos en proceso de conexión OAuth
  const oauthInProgress = useRef(false);
  const appState = useRef(AppState.currentState);

  // Listener para detectar cuando la app vuelve del background después de OAuth
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 AppState cambió: ${appState.current} → ${nextAppState}`);

      // Si la app estaba en background/inactive y ahora está activa
      if (
        (appState.current === 'background' || appState.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Si estábamos en proceso de OAuth, recargar datos
        if (oauthInProgress.current) {
          console.log('🔄 App volvió de OAuth, recargando datos de Mercado Pago...');
          oauthInProgress.current = false;
          setTimeout(() => {
            invalidate();
            void refresh();
          }, 1000);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [invalidate, refresh]);

  // Listener para el deep link callback
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('🔗 Deep link recibido:', event.url);

      if (event.url.includes('mercadopago/callback')) {
        console.log('✅ Callback de Mercado Pago recibido, recargando datos...');
        oauthInProgress.current = false;
        setTimeout(() => {
          invalidate();
          void refresh();
        }, 500);
      }
    };

    // Escuchar deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con un deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('mercadopago/callback')) {
        console.log('🔗 App iniciada con deep link de callback:', url);
        invalidate();
        void refresh();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [invalidate, refresh]);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  // Manejar conexión de cuenta
  const handleConectarCuenta = async () => {
    try {
      setConectando(true);

      const result = await mercadoPagoProveedorService.iniciarConexion();

      if (result.success && result.data?.auth_url) {
        // Marcar que estamos en proceso de OAuth para detectar cuando volvamos
        oauthInProgress.current = true;

        console.log('🔗 Abriendo navegador para OAuth...');
        console.log('🔗 Auth URL:', result.data.auth_url);

        // Usar Linking.openURL simple - es más predecible
        // Cuando el usuario complete el proceso y cierre el navegador,
        // el listener de AppState detectará que volvimos y recargará datos
        const canOpen = await Linking.canOpenURL(result.data.auth_url);

        if (canOpen) {
          await Linking.openURL(result.data.auth_url);

          // Mostrar alerta informativa
          Alert.alert(
            '📱 Conectar Mercado Pago',
            'Se abrió el navegador para conectar tu cuenta de Mercado Pago.\n\n' +
            '1️⃣ Completa el proceso en el navegador\n' +
            '2️⃣ Presiona "Cerrar y Volver" cuando termine\n' +
            '3️⃣ Los datos se actualizarán automáticamente',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else {
          oauthInProgress.current = false;
          Alert.alert('Error', 'No se pudo abrir el navegador. Por favor intenta de nuevo.');
        }
      } else {
        // Detectar si es un error de configuración del servidor
        const isConfigError = (result as any).isConfigurationError;

        if (isConfigError) {
          Alert.alert(
            '⚠️ Configuración Requerida',
            result.error || 'La integración con Mercado Pago no está configurada correctamente en el servidor.\n\n' +
            'Por favor, contacta al equipo de soporte para resolver este problema.',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else {
          Alert.alert('Error', result.error || 'No se pudo iniciar la conexión con Mercado Pago');
        }

        // Recargar datos para actualizar el estado de la cuenta
        // (por si el backend marcó la cuenta como pendiente antes del error)
        await refresh();
      }
    } catch (err: any) {
      console.error('Error conectando cuenta MP:', err);
      oauthInProgress.current = false;
      Alert.alert('Error', 'Ocurrió un error al conectar la cuenta. Por favor intenta de nuevo.');
    } finally {
      setConectando(false);
    }
  };

  // Manejar cancelación de conexión pendiente
  const handleCancelarConexion = () => {
    Alert.alert(
      'Cancelar Conexión',
      '¿Estás seguro de que deseas cancelar el proceso de conexión? Podrás intentarlo nuevamente después.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDesconectando(true);

              const result = await mercadoPagoProveedorService.desconectarCuenta();

              if (result.success) {
                Alert.alert('Proceso cancelado', 'Puedes intentar conectar tu cuenta nuevamente cuando lo desees.');
                invalidate();
                void refresh();
              } else {
                Alert.alert('Error', result.error || 'No se pudo cancelar el proceso');
              }
            } catch (err: any) {
              console.error('Error cancelando conexión MP:', err);
              Alert.alert('Error', 'Ocurrió un error al cancelar el proceso');
            } finally {
              setDesconectando(false);
            }
          }
        }
      ]
    );
  };

  // Manejar desconexión de cuenta
  const handleDesconectarCuenta = () => {
    Alert.alert(
      'Desconectar Mercado Pago',
      '¿Estás seguro de que deseas desconectar tu cuenta de Mercado Pago? No podrás recibir pagos directos de los clientes hasta que la vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDesconectando(true);

              const result = await mercadoPagoProveedorService.desconectarCuenta();

              if (result.success) {
                Alert.alert('Éxito', 'Cuenta de Mercado Pago desconectada correctamente');
                invalidate();
                void refresh();
              } else {
                Alert.alert('Error', result.error || 'No se pudo desconectar la cuenta');
              }
            } catch (err: any) {
              console.error('Error desconectando cuenta MP:', err);
              Alert.alert('Error', 'Ocurrió un error al desconectar la cuenta');
            } finally {
              setDesconectando(false);
            }
          }
        }
      ]
    );
  };

  const getEstadoPresentation = (estado: EstadoCuentaMP): {
    icon: string;
    label: string;
    tag: InstitutionalTagVariant;
    iconColor: string;
  } => {
    switch (estado) {
      case 'conectada':
        return {
          icon: 'check-circle',
          label: 'Conectada',
          tag: 'success',
          iconColor: I.semanticUp,
        };
      case 'pendiente':
        return {
          icon: 'schedule',
          label: 'Pendiente',
          tag: 'warning',
          iconColor: I.accentYellow,
        };
      case 'error':
      case 'suspendida':
        return {
          icon: 'error',
          label: estado === 'suspendida' ? 'Suspendida' : 'Error',
          tag: 'error',
          iconColor: I.semanticDown,
        };
      case 'desconectada':
        return {
          icon: 'link-off',
          label: 'Desconectada',
          tag: 'neutral',
          iconColor: I.muted,
        };
      case 'no_configurada':
      default:
        return {
          icon: 'add-circle-outline',
          label: 'Sin configurar',
          tag: 'primary',
          iconColor: I.primary,
        };
    }
  };

  const renderEstadoCuenta = () => {
    if (!cuenta) return null;

    const estado = getEstadoPresentation(cuenta.estado);

    return (
      <>
        <HostSectionKicker label="Estado de la cuenta" />
        <HostPaperSection style={styles.blockCard}>
          <View style={styles.estadoHeader}>
            <View style={styles.iconPlate}>
              <InstitutionalIcon
                name={estado.icon}
                size={20}
                color={estado.iconColor}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <View style={styles.estadoHeaderText}>
              <View style={styles.estadoTitleRow}>
                <Text style={styles.estadoTitulo} numberOfLines={2}>
                  {cuenta.estado_display || getEstadoDisplayText(cuenta.estado)}
                </Text>
                <InstitutionalTag label={estado.label} variant={estado.tag} size="sm" />
              </View>
              {cuenta.mensaje_estado ? (
                <Text style={styles.estadoSubtitulo}>{cuenta.mensaje_estado}</Text>
              ) : null}
            </View>
          </View>

          {cuenta.estado === 'conectada' && cuenta.email_mp ? (
            <View style={styles.cuentaInfo}>
              <HostMetricRow
                label="Email"
                value={cuenta.email_mp}
                last={!cuenta.nombre_cuenta && !cuenta.fecha_conexion}
              />
              {cuenta.nombre_cuenta ? (
                <HostMetricRow
                  label="Titular"
                  value={cuenta.nombre_cuenta}
                  last={!cuenta.fecha_conexion}
                />
              ) : null}
              {cuenta.fecha_conexion ? (
                <HostMetricRow
                  label="Conectada desde"
                  value={new Date(cuenta.fecha_conexion).toLocaleDateString('es-CL')}
                  last
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.accionesContainer}>
            {cuenta.estado === 'no_configurada' || cuenta.estado === 'desconectada' ? (
              <InstitutionalButton
                label={cuenta.estado === 'desconectada' ? 'Reconectar cuenta' : 'Conectar Mercado Pago'}
                variant="primary"
                size="compact"
                loading={conectando}
                onPress={handleConectarCuenta}
              />
            ) : null}

            {cuenta.estado === 'pendiente' || cuenta.estado === 'error' ? (
              <View style={styles.botonesMultiples}>
                <InstitutionalButton
                  label="Reintentar conexión"
                  variant="primary"
                  size="compact"
                  loading={conectando}
                  onPress={handleConectarCuenta}
                />
                <InstitutionalButton
                  label="Cancelar"
                  variant="outline"
                  size="compact"
                  loading={desconectando}
                  onPress={handleCancelarConexion}
                />
              </View>
            ) : null}

            {cuenta.estado === 'conectada' ? (
              <InstitutionalButton
                label="Desconectar cuenta"
                variant="destructiveOutline"
                size="compact"
                loading={desconectando}
                onPress={handleDesconectarCuenta}
              />
            ) : null}
          </View>
        </HostPaperSection>
      </>
    );
  };

  const renderEstadisticas = () => {
    if (cuenta?.estado !== 'conectada') return null;

    if (!estadisticas) {
      return (
        <>
          <HostSectionKicker label="Estadísticas de pagos" />
          <HostPaperSection>
            <View style={styles.emptyBlock}>
              <ActivityIndicator size="small" color={I.primary} />
              <Text style={styles.emptyTitle}>Cargando estadísticas…</Text>
            </View>
          </HostPaperSection>
        </>
      );
    }

    return (
      <>
        <HostSectionKicker label="Estadísticas de pagos" />
        <HostPaperSection>
          <HostMetricRow
            label="Recibido este mes"
            value={mercadoPagoProveedorService.formatearMonto(estadisticas.total_recibido_mes)}
          />
          <HostMetricRow
            label="Transacciones del mes"
            value={String(estadisticas.cantidad_transacciones_mes)}
          />
          <HostMetricRow
            label="Total recibido"
            value={mercadoPagoProveedorService.formatearMonto(estadisticas.total_recibido)}
          />
          <HostMetricRow
            label="Total transacciones"
            value={String(estadisticas.cantidad_transacciones)}
            last={!estadisticas.ultima_transaccion}
          />
          {estadisticas.ultima_transaccion ? (
            <HostMetricRow
              label="Última transacción"
              value={new Date(estadisticas.ultima_transaccion).toLocaleDateString('es-CL')}
              last
            />
          ) : null}
        </HostPaperSection>
      </>
    );
  };

  const renderPagoItem = ({ item, isLast }: { item: PagoRecibido; isLast: boolean }) => {
    const fechaFormateada = item.fecha
      ? new Date(item.fecha).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Fecha no disponible';

    const serviciosTexto = item.servicios || 'Servicio';
    const servicioBreve =
      serviciosTexto.length > 35 ? `${serviciosTexto.substring(0, 35)}…` : serviciosTexto;

    return (
      <View style={[styles.pagoListItem, !isLast && styles.pagoListItemBorder]}>
        <View style={styles.iconPlate}>
          <InstitutionalIcon
            name="payments"
            size={18}
            color={I.ink}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>
        <View style={styles.pagoListInfo}>
          <Text style={styles.pagoListCliente} numberOfLines={1}>
            {item.cliente_nombre || 'Cliente'}
          </Text>
          <Text style={styles.pagoListServicio} numberOfLines={1}>
            {servicioBreve}
          </Text>
          <Text style={styles.pagoListFecha}>{fechaFormateada}</Text>
        </View>
        <View style={styles.pagoListRight}>
          <Text style={styles.pagoListMonto}>
            {mercadoPagoProveedorService.formatearMonto(item.monto)}
          </Text>
          {item.estado_oferta === 'pagada_parcialmente' ? (
            <InstitutionalTag label="Parcial" variant="warning" size="sm" />
          ) : null}
        </View>
      </View>
    );
  };

  const renderHistorialPagos = () => {
    if (cuenta?.estado !== 'conectada') return null;

    const visible = historialPagos.slice(0, 10);

    return (
      <>
        <HostSectionKicker label="Pagos recibidos" />
        <HostPaperSection>
          {historialPagos.length > 0 ? (
            <View style={styles.countRow}>
              <InstitutionalTag
                label={`${historialPagos.length} pagos`}
                variant="neutral"
                size="sm"
              />
            </View>
          ) : null}

          {historialPagos.length === 0 ? (
            <View style={styles.emptyBlock}>
              <View style={styles.iconPlate}>
                <InstitutionalIcon
                  name="inbox"
                  size={18}
                  color={I.muted}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </View>
              <Text style={styles.emptyTitle}>Aún no has recibido pagos</Text>
              <Text style={styles.emptySubtitle}>
                Cuando los clientes paguen tus servicios, aparecerán aquí
              </Text>
            </View>
          ) : (
            <View>
              {visible.map((pago, index) => (
                <React.Fragment key={pago.id}>
                  {renderPagoItem({
                    item: pago,
                    isLast: index === visible.length - 1 && historialPagos.length <= 10,
                  })}
                </React.Fragment>
              ))}
              {historialPagos.length > 10 ? (
                <View style={styles.verMasWrap}>
                  <InstitutionalButton
                    label={`Ver más (${historialPagos.length - 10} restantes)`}
                    variant="tertiary"
                    size="compact"
                    onPress={() => Alert.alert('Info', 'Funcionalidad de ver más próximamente')}
                  />
                </View>
              ) : null}
            </View>
          )}
        </HostPaperSection>
      </>
    );
  };

  const renderInfoMercadoPago = () => (
    <>
      <HostSectionKicker label="¿Por qué conectar Mercado Pago?" />
      <HostPaperSection>
        <View style={styles.beneficiosList}>
          {(
            [
              {
                icon: 'payments' as const,
                title: 'Pagos directos',
                description: 'Recibe el pago de tus servicios directamente en tu cuenta',
              },
              {
                icon: 'speed' as const,
                title: 'Cobros inmediatos',
                description: 'Los clientes pagan al confirmar el servicio',
              },
              {
                icon: 'security' as const,
                title: 'Seguro y confiable',
                description: 'Respaldado por Mercado Pago con protección al vendedor',
              },
            ] as const
          ).map((item, index, arr) => (
            <View
              key={item.title}
              style={[styles.beneficioItem, index < arr.length - 1 && styles.beneficioItemBorder]}
            >
              <View style={styles.iconPlate}>
                <InstitutionalIcon
                  name={item.icon}
                  size={18}
                  color={I.ink}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </View>
              <View style={styles.beneficioTexto}>
                <Text style={styles.beneficioTitulo}>{item.title}</Text>
                <Text style={styles.beneficioDescripcion}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </HostPaperSection>
    </>
  );

  const handleGoBack = useCallback(() => {
    router.replace('/(tabs)/perfil');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Mercado Pago" showBack onBackPress={handleGoBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando configuración…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Mercado Pago" showBack onBackPress={handleGoBack} />

      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: SPACING.fixed['2xl'], gap: SPACING.fixed.sm },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[I.primary]}
            tintColor={I.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <HostPaperSection style={styles.errorCard}>
            <View style={styles.iconPlate}>
              <InstitutionalIcon
                name="error-outline"
                size={18}
                color={I.semanticDown}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <InstitutionalButton
              label="Reintentar"
              variant="tertiary"
              size="compact"
              onPress={() => {
                void refresh();
              }}
            />
          </HostPaperSection>
        ) : null}

        {renderEstadoCuenta()}
        {renderEstadisticas()}
        {renderHistorialPagos()}
        {renderInfoMercadoPago()}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function para obtener texto de estado
const getEstadoDisplayText = (estado: EstadoCuentaMP): string => {
  switch (estado) {
    case 'conectada':
      return 'Cuenta Conectada';
    case 'pendiente':
      return 'Conexión Pendiente';
    case 'error':
      return 'Error de Conexión';
    case 'suspendida':
      return 'Cuenta Suspendida';
    case 'desconectada':
      return 'Cuenta Desconectada';
    case 'no_configurada':
    default:
      return 'Sin Configurar';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CANVAS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.fixed.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
  blockCard: {
    gap: SPACING.fixed.md,
  },
  iconPlate: {
    ...hostIconPlateStyle,
  },
  estadoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  estadoHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xs,
  },
  estadoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  estadoTitulo: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  estadoSubtitulo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
  cuentaInfo: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.xs,
  },
  accionesContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  botonesMultiples: {
    gap: SPACING.fixed.sm,
  },
  countRow: {
    marginBottom: SPACING.fixed.sm,
  },
  pagoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
  },
  pagoListItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  pagoListInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pagoListCliente: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  pagoListServicio: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
  pagoListFecha: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  pagoListRight: {
    alignItems: 'flex-end',
    gap: SPACING.fixed.xs,
  },
  pagoListMonto: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    color: I.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    textAlign: 'center',
  },
  verMasWrap: {
    paddingTop: SPACING.fixed.sm,
    alignItems: 'center',
  },
  beneficiosList: {
    gap: 0,
  },
  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
  },
  beneficioItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  beneficioTexto: {
    flex: 1,
    gap: SPACING.fixed.xs,
  },
  beneficioTitulo: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  beneficioDescripcion: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  errorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
  },
});

