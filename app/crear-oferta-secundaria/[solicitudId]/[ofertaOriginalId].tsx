import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import solicitudesService, { 
  type SolicitudPublica, 
  type OfertaProveedorData, 
  type DetalleServicioOferta,
  type OfertaProveedor
} from '@/services/solicitudesService';
import { FormularioOferta } from '@/components/solicitudes/FormularioOferta';
import creditosService, { type VerificacionCreditosOferta } from '@/services/creditosService';
import { ModalCreditosInsuficientes } from '@/components/creditos';

export default function CrearOfertaSecundariaScreen() {
  const { solicitudId, ofertaOriginalId } = useLocalSearchParams<{ 
    solicitudId: string;
    ofertaOriginalId: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [solicitud, setSolicitud] = useState<SolicitudPublica | null>(null);
  const [ofertaOriginal, setOfertaOriginal] = useState<OfertaProveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [motivoServicioAdicional, setMotivoServicioAdicional] = useState('');
  
  // Estados para verificación de créditos
  const [verificandoCreditos, setVerificandoCreditos] = useState(false);
  const [verificacionCreditos, setVerificacionCreditos] = useState<VerificacionCreditosOferta | null>(null);
  const [mostrarModalCreditos, setMostrarModalCreditos] = useState(false);

  useEffect(() => {
    if (solicitudId && ofertaOriginalId) {
      cargarDatos();
    }
  }, [solicitudId, ofertaOriginalId]);
  
  // Verificar créditos cada vez que se enfoca la pantalla (por si compró créditos)
  useFocusEffect(
    useCallback(() => {
      if (solicitud && solicitudId) {
        verificarCreditos();
      }
    }, [solicitud, solicitudId])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar oferta original primero (más rápido y necesario para validar)
      const resultOferta = await solicitudesService.obtenerDetalleOferta(ofertaOriginalId);
      if (!resultOferta.success || !resultOferta.data) {
        Alert.alert('Error', resultOferta.error || 'No se pudo cargar la oferta original');
        router.back();
        return;
      }
      
      const oferta = resultOferta.data;
      
      // Validar que la oferta original está en un estado válido para crear ofertas secundarias
      // Según el backend: 'pagada' o 'en_ejecucion' (no 'completada')
      if (!['pagada', 'en_ejecucion'].includes(oferta.estado)) {
        Alert.alert(
          'Error',
          `Solo se pueden crear ofertas secundarias cuando la oferta original está pagada o en ejecución. Estado actual: ${oferta.estado}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      
      // No permitir si el servicio ya está completado
      if (oferta.estado === 'completada') {
        Alert.alert(
          'Error',
          'No se pueden crear ofertas secundarias para servicios ya completados',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      
      setOfertaOriginal(oferta);
      
      // Cargar solicitud después de validar la oferta
      // Usar el solicitud_id de la oferta si está disponible, o el solicitudId del parámetro
      const solicitudIdParaCargar = oferta.solicitud || solicitudId;
      const resultSolicitud = await solicitudesService.obtenerDetalleSolicitud(solicitudIdParaCargar);
      if (!resultSolicitud.success || !resultSolicitud.data) {
        console.error('Error obteniendo detalle de solicitud:', resultSolicitud.error);
        // No bloquear si no se puede cargar la solicitud, pero mostrar advertencia
        Alert.alert(
          'Advertencia', 
          'No se pudo cargar el detalle completo de la solicitud, pero puedes continuar con la oferta secundaria.',
          [{ text: 'Continuar' }]
        );
      } else {
        setSolicitud(resultSolicitud.data);
        // Verificar créditos después de cargar la solicitud
        await verificarCreditosParaSolicitud(resultSolicitud.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const verificarCreditosParaSolicitud = async (solicitudData: SolicitudPublica) => {
    try {
      setVerificandoCreditos(true);
      
      // Para ofertas secundarias, usamos los servicios de la solicitud
      const serviciosIds = solicitudData.servicios_solicitados_detail?.map(s => s.id) || [];
      
      const result = await creditosService.verificarCreditosOferta(solicitudId, serviciosIds);
      
      if (result.success && result.data) {
        setVerificacionCreditos(result.data);
        
        // Si no puede ofertar, mostrar modal
        if (!result.data.puede_ofertar) {
          setMostrarModalCreditos(true);
        }
      } else {
        console.error('Error verificando créditos:', result.error);
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
    setMostrarModalCreditos(false);
    router.push('/(tabs)/creditos');
  };
  
  const handleCerrarModalCreditos = () => {
    setMostrarModalCreditos(false);
    router.back();
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
  }) => {
    // Validar que el motivo esté presente
    if (!motivoServicioAdicional || motivoServicioAdicional.trim() === '') {
      Alert.alert('Error', 'Debes proporcionar el motivo del servicio adicional');
      return;
    }

    try {
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
        oferta_original: ofertaOriginalId,
        es_oferta_secundaria: true,
        motivo_servicio_adicional: motivoServicioAdicional.trim(),
      };

      const result = await solicitudesService.crearOfertaSecundaria(
        solicitudId!,
        ofertaOriginalId!,
        datosEnvio
      );
      
      if (result.success) {
        Alert.alert(
          'Oferta Secundaria Enviada',
          'Tu oferta de servicio adicional ha sido enviada exitosamente. El cliente será notificado.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        const errorMessage = result.error || 'No se pudo enviar la oferta secundaria';
        Alert.alert(
          'Error al Enviar Oferta',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error enviando oferta secundaria:', error);
      Alert.alert('Error', 'No se pudo enviar la oferta. Por favor, intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading || verificandoCreditos) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Servicio Adicional',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {verificandoCreditos ? 'Verificando créditos disponibles...' : 'Cargando información...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!solicitud || !ofertaOriginal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Servicio Adicional',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No se pudo cargar la información
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          title: 'Servicio Adicional',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Información de la oferta original */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="info-outline" size={24} color="#0061FF" />
              <Text style={styles.infoTitle}>Oferta Original</Text>
            </View>
            <Text style={styles.infoText}>
              Precio: ${parseFloat(ofertaOriginal.precio_total_ofrecido).toLocaleString('es-CL')}
            </Text>
            <Text style={styles.infoText}>
              Estado: {ofertaOriginal.estado === 'aceptada' ? 'Aceptada' : 'Pagada'}
            </Text>
          </View>

          {/* Campo obligatorio: Motivo del Servicio Adicional */}
          <View style={styles.motivoSection}>
            <Text style={styles.motivoLabel}>
              Motivo del Servicio Adicional <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.motivoDescripcion}>
              Explica por qué se requiere este servicio adicional. Esta información será visible para el cliente.
            </Text>
            <TextInput
              style={styles.motivoInput}
              placeholder="Ej: Durante la revisión se detectó que el sistema de frenos requiere mantenimiento adicional..."
              placeholderTextColor="#999"
              value={motivoServicioAdicional}
              onChangeText={setMotivoServicioAdicional}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {motivoServicioAdicional.length} caracteres
            </Text>
          </View>

          {/* Formulario de oferta */}
          <FormularioOferta
            solicitud={solicitud}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            loading={enviando}
            bottomInset={insets.bottom}
            esOfertaSecundaria={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Modal de créditos insuficientes */}
      <ModalCreditosInsuficientes
        visible={mostrarModalCreditos}
        onClose={handleCerrarModalCreditos}
        onComprarCreditos={handleIrAComprarCreditos}
        verificacion={verificacionCreditos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0061FF',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
  motivoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  motivoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#DC3545',
  },
  motivoDescripcion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  motivoInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
});

