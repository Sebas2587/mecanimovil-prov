import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import solicitudesService, { type SolicitudPublica, type OfertaProveedorData, type DetalleServicioOferta } from '@/services/solicitudesService';
import { FormularioOferta } from '@/components/solicitudes/FormularioOferta';
import creditosService, { type VerificacionCreditosOferta } from '@/services/creditosService';
import { useAuth } from '@/context/AuthContext';
import { obtenerEstadoCuenta } from '@/services/mercadoPagoProveedorService';
import serviceAreasApi from '@/services/serviceAreasApi';
import { useAlerts } from '@/context/AlertsContext';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const stackScreenOptions = {
  title: 'Crear Oferta',
  headerBackTitle: '',
  headerBackTitleVisible: false as const,
  headerStyle: { backgroundColor: I.canvas },
  headerTintColor: I.ink,
};

export default function CrearOfertaScreen() {
  const { solicitudId } = useLocalSearchParams<{ solicitudId: string }>();
  const insets = useSafeAreaInsets();
  const { estadoProveedor, usuario } = useAuth();
  const { agregarAlerta } = useAlerts();

  const [solicitud, setSolicitud] = useState<SolicitudPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  // Estados para verificación de créditos
  const [verificandoCreditos, setVerificandoCreditos] = useState(true);
  const [verificacionCreditos, setVerificacionCreditos] = useState<VerificacionCreditosOferta | null>(null);

  useEffect(() => {
    if (solicitudId) {
      cargarSolicitud();
    }
  }, [solicitudId]);
  
  // Verificar créditos cada vez que se enfoca la pantalla (por si compró créditos)
  useFocusEffect(
    useCallback(() => {
      if (solicitud && solicitudId) {
        verificarCreditos();
      }
    }, [solicitud, solicitudId])
  );

  const cargarSolicitud = async () => {
    try {
      setLoading(true);
      const result = await solicitudesService.obtenerDetalleSolicitud(solicitudId);
      
      if (result.success && result.data) {
        setSolicitud(result.data);
        // Verificar créditos después de cargar la solicitud
        await verificarCreditosParaSolicitud(result.data);
      } else {
        Alert.alert('Error', result.error || 'No se pudo cargar la solicitud');
        router.back();
      }
    } catch (error) {
      console.error('Error cargando solicitud:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const verificarCreditosParaSolicitud = async (solicitudData: SolicitudPublica) => {
    try {
      setVerificandoCreditos(true);
      
      // Obtener IDs de servicios de la solicitud
      const serviciosIds = solicitudData.servicios_solicitados_detail?.map(s => s.id) || [];
      
      const result = await creditosService.verificarCreditosOferta(solicitudId, serviciosIds);
      
      if (result.success && result.data) {
        setVerificacionCreditos(result.data);
      } else {
        console.error('Error verificando créditos:', result.error);
        // No bloquear si hay error en verificación, continuar
        setVerificacionCreditos(null);
      }
    } catch (error) {
      console.error('Error verificando créditos:', error);
      setVerificacionCreditos(null);
    } finally {
      setVerificandoCreditos(false);
    }
  };
  
  const verificarCreditos = async () => {
    if (solicitud) {
      await verificarCreditosParaSolicitud(solicitud);
    }
  };
  
  const handleIrAComprarCreditos = () => {
    const min = verificacionCreditos?.creditos_necesarios;
    const q =
      min != null && min > 0
        ? `?tab=tienda&minCreditos=${encodeURIComponent(String(min))}`
        : '?tab=tienda';
    router.push(`/creditos${q}`);
  };

  const handleSubmit = async (datosOferta: {
    servicios_ofertados: number[];
    detalles_servicios: DetalleServicioOferta[];
    precio_total_ofrecido: string;
    incluye_repuestos: boolean;
    tiempo_estimado_total: string;
    descripcion_oferta: string;
    garantia_ofrecida?: string;
    fecha_disponible: string;
    hora_disponible: string;
    es_fecha_alternativa?: boolean;
    motivo_fecha_alternativa?: string;
    // Campos de desglose de costos
    costo_repuestos?: string;
    costo_mano_obra?: string;
    costo_gestion_compra?: string;
    foto_cotizacion_repuestos?: string;
  }) => {
    try {
      // Validar cuenta de Mercado Pago
      const estadoMP = await obtenerEstadoCuenta();
      if (estadoMP.success && estadoMP.data) {
        const puedeRecibirPagos = estadoMP.data.puede_recibir_pagos;
        const estado = estadoMP.data.estado;

        if (!puedeRecibirPagos || estado !== 'conectada') {
          agregarAlerta({
            tipo: 'mercado_pago_no_configurado',
            titulo: 'Cuenta de Mercado Pago no configurada',
            mensaje: 'Para realizar ofertas a solicitudes, necesitas conectar tu cuenta de Mercado Pago. Configúrala ahora para recibir pagos directos de los clientes.',
            accion: {
              texto: 'Configurar Mercado Pago',
              ruta: '/(tabs)/configuracion-mercadopago',
            },
            prioridad: 'alta',
          });
          
          Alert.alert(
            'Cuenta de Mercado Pago requerida',
            'Para realizar ofertas a solicitudes, necesitas conectar tu cuenta de Mercado Pago. Por favor, configúrala en tu perfil.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Configurar',
                onPress: () => router.push('/(tabs)/configuracion-mercadopago'),
              },
            ]
          );
          return;
        }
      }

      // Validar zonas de cobertura (solo para mecánicos a domicilio)
      // EXCEPCIÓN: Si el proveedor fue seleccionado directamente por el cliente, NO validar zonas
      const proveedoresDirigidos = solicitud?.proveedores_dirigidos || [];
      const esProveedorDirigido = usuario?.id && proveedoresDirigidos.includes(usuario.id);
      const esSolicitudDirigida = solicitud?.tipo_solicitud === 'dirigida';
      const fueSeleccionadoDirectamente = esSolicitudDirigida || esProveedorDirigido;
      
      if (__DEV__) {
        console.log('🔍 Validación de zonas:', {
          tipoProveedor: estadoProveedor?.tipo_proveedor,
          usuarioId: usuario?.id,
          tipoSolicitud: solicitud?.tipo_solicitud,
          proveedoresDirigidos,
          esProveedorDirigido,
          esSolicitudDirigida,
          fueSeleccionadoDirectamente,
          omitirValidacionZonas: fueSeleccionadoDirectamente
        });
      }
      
      if (estadoProveedor?.tipo_proveedor === 'mecanico' && !fueSeleccionadoDirectamente) {
        try {
          const zonas = await serviceAreasApi.getServiceAreas();
          const zonasActivas = zonas.filter(z => z.is_active);

          if (zonasActivas.length === 0) {
            agregarAlerta({
              tipo: 'zonas_cobertura_no_configuradas',
              titulo: 'Zonas de cobertura no configuradas',
              mensaje: 'Como mecánico a domicilio, necesitas definir al menos una zona de cobertura activa para estar disponible para los clientes. Configura tus zonas de servicio ahora.',
              accion: {
                texto: 'Configurar Zonas',
                ruta: '/(tabs)/zonas-servicio',
              },
              prioridad: 'alta',
            });

            Alert.alert(
              'Zonas de cobertura requeridas',
              'Como mecánico a domicilio, necesitas definir al menos una zona de cobertura activa para estar disponible para los clientes. Por favor, configura tus zonas de servicio.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Configurar',
                  onPress: () => router.push('/(tabs)/zonas-servicio'),
                },
              ]
            );
            return;
          }
        } catch (error) {
          console.error('Error verificando zonas de cobertura:', error);
          Alert.alert(
            'Error',
            'No se pudo verificar tus zonas de cobertura. Por favor, intenta nuevamente.'
          );
          return;
        }
      }

      setEnviando(true);
      
      // Preparar datos para enviar
      const datosEnvio: OfertaProveedorData = {
        solicitud: solicitudId!,
        servicios_ofertados: datosOferta.servicios_ofertados,
        detalles_servicios: datosOferta.detalles_servicios,
        precio_total_ofrecido: datosOferta.precio_total_ofrecido,
        incluye_repuestos: datosOferta.incluye_repuestos,
        tiempo_estimado_total: datosOferta.tiempo_estimado_total,
        descripcion_oferta: datosOferta.descripcion_oferta,
        garantia_ofrecida: datosOferta.garantia_ofrecida,
        fecha_disponible: datosOferta.fecha_disponible,
        hora_disponible: datosOferta.hora_disponible,
        es_fecha_alternativa: datosOferta.es_fecha_alternativa,
        motivo_fecha_alternativa: datosOferta.motivo_fecha_alternativa,
        // Campos de desglose de costos
        costo_repuestos: datosOferta.costo_repuestos,
        costo_mano_obra: datosOferta.costo_mano_obra,
        costo_gestion_compra: datosOferta.costo_gestion_compra,
        foto_cotizacion_repuestos: datosOferta.foto_cotizacion_repuestos,
      };

      const result = await solicitudesService.crearOferta(datosEnvio);
      
      if (result.success) {
        Alert.alert(
          'Oferta Enviada',
          'Tu oferta ha sido enviada exitosamente. El cliente será notificado.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/'),
            },
          ]
        );
      } else {
        // Mostrar mensaje de error más descriptivo
        const errorMessage = result.error || 'No se pudo enviar la oferta';
        Alert.alert(
          'Error al Enviar Oferta',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error enviando oferta:', error);
      Alert.alert('Error', 'No se pudo enviar la oferta. Por favor, intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeRoot} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando solicitud…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!solicitud) {
    return (
      <SafeAreaView style={styles.safeRoot} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Solicitud no encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeRoot} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={stackScreenOptions} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FormularioOferta
          solicitud={solicitud}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          loading={enviando}
          bottomInset={insets.bottom}
          verificacionCreditos={verificacionCreditos}
          verificandoCreditos={verificandoCreditos}
          onPressComprarCreditos={handleIrAComprarCreditos}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
  },
  emptyText: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    textAlign: 'center',
  },
});

