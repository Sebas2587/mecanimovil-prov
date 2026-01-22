import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
  AppState,
  Alert,
  AppStateStatus,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import creditosService from '@/services/creditosService';

const DEEP_LINK_SCHEME = 'mecanimovilproveedores://';

interface MercadoPagoWebViewModalProps {
  visible: boolean;
  checkoutUrl: string;
  compraId: number;
  onClose: () => void;
  onPaymentSuccess: (message: string) => void;
  onPaymentFailure: (message: string) => void;
  onPaymentPending: () => void;
}

/**
 * Modal con WebView para procesar pagos de Mercado Pago
 * 
 * IMPORTANTE: Este modal mantiene el contexto de la app y evita que se abran
 * múltiples instancias. El WebView intercepta las redirecciones de Mercado Pago
 * y captura el estado del pago automáticamente.
 */
const MercadoPagoWebViewModal: React.FC<MercadoPagoWebViewModalProps> = ({
  visible,
  checkoutUrl,
  compraId,
  onClose,
  onPaymentSuccess,
  onPaymentFailure,
  onPaymentPending,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageLoadedRef = useRef(false);
  const hasProcessedPaymentRef = useRef(false);

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (visible) {
      hasProcessedPaymentRef.current = false;
      setLoading(true);
      pageLoadedRef.current = false;
    }
  }, [visible]);

  // Listener para detectar cuando la app vuelve al foreground
  useEffect(() => {
    if (!visible) return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        !hasProcessedPaymentRef.current
      ) {
        console.log('📱 [MP WebView] App volvió al foreground');
        // Verificar estado del pago después de volver a la app
        await verificarEstadoPago();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [visible, compraId]);

  // Función para verificar estado del pago
  const verificarEstadoPago = useCallback(async () => {
    if (hasProcessedPaymentRef.current || verificando) return;

    try {
      setVerificando(true);
      console.log('🔍 [MP WebView] Verificando estado del pago para compra:', compraId);
      
      const result = await creditosService.verificarPago(compraId);
      
      if (result.success && result.data) {
        if (result.data.creditos_acreditados) {
          // Pago exitoso
          hasProcessedPaymentRef.current = true;
          await AsyncStorage.removeItem('compra_creditos_pendiente');
          onPaymentSuccess(result.data.mensaje);
          return;
        }
        
        if (result.data.status === 'rejected' || result.data.status === 'cancelled') {
          // Pago rechazado o cancelado
          hasProcessedPaymentRef.current = true;
          await AsyncStorage.removeItem('compra_creditos_pendiente');
          onPaymentFailure(result.data.mensaje);
          return;
        }
        
        // Pago aún pendiente
        console.log('⏳ [MP WebView] Pago aún pendiente');
      }
    } catch (error) {
      console.error('❌ [MP WebView] Error verificando estado del pago:', error);
    } finally {
      setVerificando(false);
    }
  }, [compraId, verificando, onPaymentSuccess, onPaymentFailure]);

  // Interceptar las redirecciones
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const { url } = request;
    
    console.log('🌐 [MP WebView] Intentando cargar URL:', url);
    
    // Si la URL es un deep link de nuestra app, interceptarla
    if (url.startsWith(DEEP_LINK_SCHEME) || url.startsWith('mecanimovil://')) {
      console.log('🔗 [MP WebView] Deep link detectado:', url);
      
      // Parsear parámetros
      try {
        const urlObj = new URL(url);
        const status = urlObj.searchParams.get('status') || 
                      urlObj.searchParams.get('collection_status');
        
        console.log('📊 [MP WebView] Status del pago:', status);
        
        // Verificar estado del pago desde el backend
        verificarEstadoPago();
      } catch (e) {
        console.warn('⚠️ [MP WebView] Error parseando URL:', e);
        verificarEstadoPago();
      }
      
      return false; // No permitir que el WebView cargue el deep link
    }
    
    // Detectar URLs de Mercado Pago que indican éxito/fallo
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/success') || urlLower.includes('status=approved')) {
      console.log('✅ [MP WebView] URL de éxito detectada');
      setTimeout(() => verificarEstadoPago(), 1500);
    } else if (urlLower.includes('/failure') || urlLower.includes('status=rejected')) {
      console.log('❌ [MP WebView] URL de fallo detectada');
      setTimeout(() => verificarEstadoPago(), 1500);
    } else if (urlLower.includes('/pending') || urlLower.includes('status=pending')) {
      console.log('⏳ [MP WebView] URL de pendiente detectada');
      setTimeout(() => verificarEstadoPago(), 1500);
    }
    
    return true;
  };

  // Manejar cambios en el estado de navegación
  const handleNavigationStateChange = (navState: any) => {
    console.log('📊 [MP WebView] Estado de navegación:', {
      url: navState.url,
      loading: navState.loading,
      title: navState.title
    });
    
    // Detectar si Mercado Pago muestra una página de éxito
    if (navState.url && navState.title) {
      const urlLower = navState.url.toLowerCase();
      const titleLower = navState.title.toLowerCase();
      
      if (
        urlLower.includes('success') || 
        urlLower.includes('approved') ||
        titleLower.includes('pago exitoso') ||
        titleLower.includes('pago aprobado') ||
        titleLower.includes('payment approved')
      ) {
        console.log('✅ [MP WebView] Página de éxito detectada');
        setTimeout(() => verificarEstadoPago(), 2000);
      }
    }
    
    // Actualizar estado de loading
    if (!navState.loading) {
      pageLoadedRef.current = true;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleLoadEnd = () => {
    console.log('✅ [MP WebView] Terminó de cargar');
    pageLoadedRef.current = true;
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setTimeout(() => setLoading(false), 300);
  };

  const handleLoadStart = () => {
    console.log('🔄 [MP WebView] Comenzando a cargar');
    pageLoadedRef.current = false;
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Timeout de seguridad
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ [MP WebView] Timeout de loading');
      setLoading(false);
      loadingTimeoutRef.current = null;
    }, 15000);
    
    setLoading(true);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ [MP WebView] Error:', nativeEvent);
    setLoading(false);
    
    Alert.alert(
      'Error de Conexión',
      'No se pudo cargar la página de pago. Por favor, verifica tu conexión a internet.',
      [
        { text: 'Reintentar', onPress: () => webViewRef.current?.reload() },
        { text: 'Cerrar', onPress: onClose },
      ]
    );
  };

  // Cerrar el modal
  const handleClose = async () => {
    console.log('🔙 [MP WebView] Usuario cerró el modal');
    
    if (!hasProcessedPaymentRef.current) {
      // Verificar estado antes de cerrar
      Alert.alert(
        '¿Cerrar Pago?',
        'El pago podría estar en proceso. ¿Deseas verificar el estado antes de cerrar?',
        [
          {
            text: 'Verificar Estado',
            onPress: async () => {
              await verificarEstadoPago();
              if (!hasProcessedPaymentRef.current) {
                onPaymentPending();
              }
            },
          },
          {
            text: 'Cerrar Sin Verificar',
            style: 'destructive',
            onPress: () => {
              onPaymentPending();
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } else {
      onClose();
    }
  };

  // JavaScript inyectado para detectar redirecciones
  const injectedJavaScript = `
    (function() {
      // Detectar redirecciones de Mercado Pago
      const originalLocationReplace = window.location.replace;
      const originalLocationAssign = window.location.assign;
      
      window.location.replace = function(url) {
        console.log('🔍 window.location.replace:', url);
        if (url && (url.startsWith('mecanimovilproveedores://') || url.startsWith('mecanimovil://'))) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'deep_link_detected',
            url: url
          }));
          return;
        }
        return originalLocationReplace.apply(this, arguments);
      };
      
      window.location.assign = function(url) {
        console.log('🔍 window.location.assign:', url);
        if (url && (url.startsWith('mecanimovilproveedores://') || url.startsWith('mecanimovil://'))) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'deep_link_detected',
            url: url
          }));
          return;
        }
        return originalLocationAssign.apply(this, arguments);
      };
      
      // Monitorear cambios en href
      let currentHref = window.location.href;
      const checkHref = setInterval(function() {
        if (window.location.href !== currentHref) {
          currentHref = window.location.href;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'url_changed',
            url: currentHref
          }));
          
          if (currentHref.startsWith('mecanimovilproveedores://') || currentHref.startsWith('mecanimovil://')) {
            clearInterval(checkHref);
          }
        }
      }, 100);
      
      // Detectar clics en deep links
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && (link.href.startsWith('mecanimovilproveedores://') || link.href.startsWith('mecanimovil://'))) {
          e.preventDefault();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'deep_link_detected',
            url: link.href
          }));
        }
      }, true);
      
      true;
    })();
  `;

  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📩 [MP WebView] Mensaje recibido:', message.type);
      
      if (message.type === 'deep_link_detected' && message.url) {
        console.log('🔗 [MP WebView] Deep link via JS:', message.url);
        verificarEstadoPago();
      } else if (message.type === 'url_changed') {
        const url = message.url.toLowerCase();
        if (url.includes('success') || url.includes('approved')) {
          setTimeout(() => verificarEstadoPago(), 1500);
        } else if (url.includes('failure') || url.includes('rejected')) {
          setTimeout(() => verificarEstadoPago(), 1500);
        }
      }
    } catch (e) {
      console.warn('⚠️ [MP WebView] Error procesando mensaje:', e);
    }
  }, [verificarEstadoPago]);

  if (!visible || !checkoutUrl) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: backgroundPaper }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderMain }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {verificando ? 'Verificando pago...' : 'Pagar con Mercado Pago'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadEnd={handleLoadEnd}
          onLoadStart={handleLoadStart}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          originWhitelist={['*']}
          allowsBackForwardNavigationGestures={true}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
        />

        {/* Loading indicator */}
        {(loading || verificando) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={[styles.loadingText, { color: textSecondary }]}>
              {verificando ? 'Verificando estado del pago...' : 'Cargando Mercado Pago...'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600' as const,
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});

export default MercadoPagoWebViewModal;

