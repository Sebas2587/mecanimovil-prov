import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/app/design-system/theme/useTheme';
import {COLORS, SPACING, TYPOGRAPHY, SHADOWS} from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import creditosService, {
  type PaqueteCreditos,
  type CompraCreditos,
} from '@/services/creditosService';
import MercadoPagoWebViewModal from '@/components/creditos/MercadoPagoWebViewModal';
import Header from '@/components/Header';
import { FALLBACK_PRECIO_CREDITO_BRUTO_CLP } from '@/constants/mercadoPagoPricing';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const COMPRA_PENDIENTE_KEY = 'compra_creditos_pendiente';

const I = COLORS.institutional;

export default function ComprarCreditosScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const cantidadCreditosParams = params.cantidadCreditos ? parseInt(params.cantidadCreditos as string, 10) : null;

  const [cantidad, setCantidad] = useState<number | null>(null);
  const [precioTotal, setPrecioTotal] = useState<number>(0);
  const [precioUnitarioClp, setPrecioUnitarioClp] = useState(FALLBACK_PRECIO_CREDITO_BRUTO_CLP);

  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'mercadopago'>('mercadopago');
  const [compraRealizada, setCompraRealizada] = useState<CompraCreditos | null>(null);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [verificacionAutomatica, setVerificacionAutomatica] = useState(false);

  // Estado para el WebView modal de Mercado Pago
  const [showMPWebView, setShowMPWebView] = useState(false);
  const [mpCheckoutUrl, setMPCheckoutUrl] = useState<string>('');
  const [mpCompraId, setMPCompraId] = useState<number>(0);

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || I.ink;
  const textSecondary = colors?.text?.secondary || I.body;
  const primaryColor = colors?.primary?.['500'] || I.primary;
  const backgroundDefault = colors?.background?.default || I.surfaceSoft;
  const backgroundPaper = colors?.background?.paper || I.canvas;
  const borderMain = colors?.border?.main || I.hairline;
  const successColor = colors?.success?.main || I.semanticUp;
  const warningColor = colors?.warning?.main || I.accentYellow;

  useEffect(() => {
    cargarDatos();
    verificarCompraPendiente();
  }, [cantidadCreditosParams]);

  // Verificar el estado del pago cuando la pantalla vuelve a estar en foco
  useFocusEffect(
    useCallback(() => {
      if (!loading && !comprando) {
        verificarCompraPendiente();
      }
    }, [loading, comprando])
  );

  // Verificar si hay una compra pendiente guardada
  const verificarCompraPendiente = async () => {
    try {
      const compraPendienteStr = await AsyncStorage.getItem(COMPRA_PENDIENTE_KEY);
      if (compraPendienteStr) {
        const compraPendiente = JSON.parse(compraPendienteStr);

        // Verificar que sea del mismo paquete o que el usuario volvió de MP
        if (compraPendiente.compraId) {
          setVerificacionAutomatica(true);

          // Verificar estado del pago automáticamente
          const result = await creditosService.verificarPago(compraPendiente.compraId);

          if (result.success && result.data) {
            if (result.data.creditos_acreditados) {
              // Pago exitoso - limpiar y mostrar mensaje
              await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);
              Alert.alert(
                '¡Pago Confirmado!',
                result.data.mensaje,
                [
                  {
                    text: 'Ver Mis Créditos',
                    onPress: () => router.replace('/creditos'),
                  },
                ]
              );
            } else if (result.data.status === 'rejected' || result.data.status === 'cancelled') {
              // Pago rechazado - limpiar
              await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);
              Alert.alert('Pago No Exitoso', result.data.mensaje);
            }
            // Si está pendiente, no hacer nada - el usuario puede verificar manualmente
          } else if (result.isNotFound) {
            // Error 404, la compra no existe en el origen (ej. cambio a BD Prod) - limpiar localmente
            await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);
            console.log('Compra no encontrada (404). Se limpió el registro pendiente.');
          }

          setVerificacionAutomatica(false);
        }
      }
    } catch (error) {
      console.error('Error verificando compra pendiente:', error);
      setVerificacionAutomatica(false);
    }
  };

  const cargarDatos = async () => {
    let unitBruto = Number(FALLBACK_PRECIO_CREDITO_BRUTO_CLP);
    try {
      const statsRes = await creditosService.obtenerEstadisticas();
      if (statsRes.success && statsRes.data?.precio_credito_unitario_clp != null) {
        unitBruto = Number(statsRes.data.precio_credito_unitario_clp);
      }
    } catch (e) {
      if (__DEV__) console.warn('[ComprarCreditos] precio desde API:', e);
    }
    setPrecioUnitarioClp(unitBruto);

    if (!cantidadCreditosParams || isNaN(cantidadCreditosParams) || cantidadCreditosParams <= 0) {
      Alert.alert('Error', 'Cantidad de créditos inválida');
      router.back();
      return;
    }

    setCantidad(cantidadCreditosParams);
    setPrecioTotal(Math.round(cantidadCreditosParams * unitBruto));
    setLoading(false);
  };

  const handleComprar = async () => {
    if (!cantidad) return;

    try {
      setComprando(true);
      const result = await creditosService.comprarCreditos(cantidad, metodoPago);

      if (result.success && result.data) {
        setCompraRealizada(result.data);

        if (metodoPago === 'mercadopago' && result.data.mercadopago) {
          // Guardar información de la compra para verificar al volver
          await AsyncStorage.setItem(COMPRA_PENDIENTE_KEY, JSON.stringify({
            compraId: result.data.id,
            cantidad: cantidad,
            timestamp: Date.now(),
          }));

          // Obtener URL de pago
          const urlPago = result.data.mercadopago.init_point || result.data.mercadopago.sandbox_init_point;

          if (urlPago) {
            // Abrir el WebView modal de Mercado Pago (in-app)
            setMPCheckoutUrl(urlPago);
            setMPCompraId(result.data.id);
            setShowMPWebView(true);
            return;
          } else {
            Alert.alert(
              'Error',
              'No se pudo obtener la URL de pago. La compra quedó pendiente en tu historial.'
            );
            router.replace('/creditos');
            return;
          }
        }
      } else {
        Alert.alert('Error', result.error || 'Error al realizar la compra');
      }
    } catch (error: any) {
      console.error('Error comprando créditos:', error);
      Alert.alert('Error', 'Error al realizar la compra');
    } finally {
      setComprando(false);
    }
  };

  // Handlers para el WebView modal de Mercado Pago
  const handleMPClose = useCallback(() => {
    setShowMPWebView(false);
    setMPCheckoutUrl('');
    setMPCompraId(0);
  }, []);

  const handleMPPaymentSuccess = useCallback(async (message: string) => {
    setShowMPWebView(false);
    setMPCheckoutUrl('');
    setMPCompraId(0);
    await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);

    Alert.alert(
      '¡Pago Exitoso!',
      message,
      [
        {
          text: 'Ver Mis Créditos',
          onPress: () => router.replace('/creditos'),
        },
      ]
    );
  }, []);

  const handleMPPaymentFailure = useCallback(async (message: string) => {
    setShowMPWebView(false);
    setMPCheckoutUrl('');
    setMPCompraId(0);
    await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);

    Alert.alert('Pago No Exitoso', message, [
      { text: 'Intentar de nuevo', onPress: () => { } },
      { text: 'Ir a Créditos', onPress: () => router.replace('/creditos') },
    ]);
  }, []);

  const handleMPPaymentPending = useCallback(() => {
    setShowMPWebView(false);
    setMPCheckoutUrl('');
    setMPCompraId(0);

    Alert.alert(
      'Pago Pendiente',
      'Tu pago está siendo procesado. Puedes verificar el estado en el historial de compras.',
      [
        {
          text: 'Ver Historial',
          onPress: () => router.replace('/creditos'),
        },
      ]
    );
  }, []);


  const handleCancelarCompra = async () => {
    if (!compraRealizada) return;

    Alert.alert(
      'Cancelar Compra',
      '¿Estás seguro de que deseas cancelar esta compra?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await creditosService.cancelarCompra(compraRealizada.id);
              if (result.success) {
                await AsyncStorage.removeItem(COMPRA_PENDIENTE_KEY);
                Alert.alert('Compra Cancelada', 'La compra ha sido cancelada exitosamente.');
                router.back();
              } else {
                Alert.alert('Error', result.error || 'No se pudo cancelar la compra');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la compra');
            }
          },
        },
      ]
    );
  };

  // Función para manejar el retroceso - siempre navegar a créditos para asegurar que funcione
  const handleGoBack = useCallback(() => {
    router.replace('/creditos');
  }, []);

  if (loading || verificacionAutomatica) {
    return (
      <View style={[styles.container, { backgroundColor: backgroundDefault }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <Header
          title="Comprar Créditos"
          showBack={true}
          onBackPress={handleGoBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            {verificacionAutomatica ? 'Verificando pago...' : 'Cargando...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!cantidad) {
    return (
      <View style={[styles.container, { backgroundColor: backgroundDefault }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <Header
          title="Comprar Créditos"
          showBack={true}
          onBackPress={handleGoBack}
        />
        <View style={styles.errorContainer}>
          <InstitutionalIcon name="error-outline" size={48} color={colors?.error?.main || I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={[styles.errorText, { color: textPrimary }]}>
            Información de compra inválida
          </Text>
        </View>
      </View>
    );
  }

  const precioFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(precioTotal);

  const precioPorCreditoFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(precioUnitarioClp);

  // Pantalla principal de compra
  return (
    <View style={[styles.container, { backgroundColor: backgroundDefault }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header
        title="Comprar Créditos"
        showBack={true}
        onBackPress={handleGoBack}
      />
      <ScrollView style={styles.content}>
        <View style={[styles.paqueteCard, { backgroundColor: backgroundPaper }]}>
          <Text style={[styles.paqueteNombre, { color: textPrimary }]}>
            Recarga a medida
          </Text>

          <View style={styles.creditosContainer}>
            <Text style={[styles.creditos, { color: primaryColor }]}>
              {cantidad}
            </Text>
            <Text style={[styles.creditosLabel, { color: textSecondary }]}>
              créditos a comprar
            </Text>
          </View>

          <View style={styles.precioContainer}>
            <Text style={[styles.precio, { color: textPrimary }]}>
              {precioFormateado}
            </Text>
            <Text style={[styles.precioPorCredito, { color: textSecondary }]}>
              {precioPorCreditoFormateado} por crédito
            </Text>
          </View>
        </View>


        <InstitutionalButton
          label={`Pagar ${precioFormateado} con Mercado Pago`}
          variant="primary"
          onPress={handleComprar}
          disabled={comprando}
          loading={comprando}
          leading={
            !comprando ? (
              <InstitutionalIcon name="payment" size={24} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            ) : undefined
          }
          style={styles.comprarButton}
        />

        {/* Información de seguridad */}
        <View style={styles.securityInfo}>
          <InstitutionalIcon name="lock" size={16} color={textSecondary}  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={[styles.securityText, { color: textSecondary }]}>
            Pago seguro procesado por Mercado Pago
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Mercado Pago in-app */}
      <MercadoPagoWebViewModal
        visible={showMPWebView}
        checkoutUrl={mpCheckoutUrl}
        compraId={mpCompraId}
        onClose={handleMPClose}
        onPaymentSuccess={handleMPPaymentSuccess}
        onPaymentFailure={handleMPPaymentFailure}
        onPaymentPending={handleMPPaymentPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
  },
  paqueteCard: {
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.editorial,
  },
  paqueteNombre: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    marginBottom: SPACING.sm,
  },
  bonificacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  bonificacionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium as any,
  },
  creditosContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  creditos: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    lineHeight: TYPOGRAPHY.fontSize['4xl'] * 1.2,
  },
  creditosLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
  },
  precioContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: I.hairlineSoft,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    marginBottom: SPACING.xs / 2,
  },
  precioPorCredito: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
  },
  metodoPagoContainer: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.editorial,
  },
  metodoPagoTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    marginBottom: SPACING.md,
  },
  metodoPagoOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  metodoPagoInfo: {
    flex: 1,
  },
  metodoPagoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs / 2,
  },
  metodoPagoNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
  },
  metodoPagoDescripcion: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
  },
  recomendadoBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recomendadoText: {
    color: I.onPrimary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
  },
  comprarButton: {
    marginTop: SPACING.md,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  securityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  // Estilos para pantalla de datos bancarios
  successIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCentered: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitleCentered: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
});
