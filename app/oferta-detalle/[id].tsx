import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { obtenerDetalleOferta, iniciarServicio, terminarServicio, type OfertaProveedor } from '@/services/solicitudesService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { Alert } from 'react-native';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';

export default function OfertaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Obtener valores del sistema de diseño
  const designColors = theme?.colors || COLORS || {};
  const designSpacing = theme?.spacing || SPACING || {};
  const designTypography = theme?.typography || TYPOGRAPHY || {};
  const designShadows = theme?.shadows || SHADOWS || {};
  const designBorders = theme?.borders || BORDERS || {};

  const [oferta, setOferta] = useState<OfertaProveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [checklistInstance, setChecklistInstance] = useState<ChecklistInstance | null>(null);
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);
  const [showCompletedChecklistModal, setShowCompletedChecklistModal] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  useEffect(() => {
    if (id) {
      cargarOferta();
    }
  }, [id]);

  const cargarOferta = async () => {
    try {
      setLoading(true);
      const result = await obtenerDetalleOferta(id);

      if (result.success && result.data) {
        setOferta(result.data);

        // Cargar checklist si la oferta está en ejecución o completada y tiene solicitud_servicio_id
        if ((result.data.estado === 'en_ejecucion' || result.data.estado === 'completada') &&
          (result.data as any).solicitud_servicio_id) {
          await cargarChecklist((result.data as any).solicitud_servicio_id);
        }
      }
    } catch (error) {
      console.error('Error cargando oferta:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarChecklist = async (solicitudServicioId: number) => {
    try {
      setLoadingChecklist(true);
      const result = await checklistService.getInstanceByOrder(solicitudServicioId);

      if (result.success && result.data) {
        setChecklistInstance(result.data);
      } else {
        // ✅ No hay checklist disponible - esto es normal, no es un error
        setChecklistInstance(null);
        console.log('ℹ️ No hay checklist disponible para solicitud:', solicitudServicioId);
      }
    } catch (error) {
      // ✅ Manejar error sin mostrar al usuario - simplemente no hay checklist
      console.log('ℹ️ No se encontró checklist para solicitud:', solicitudServicioId);
      setChecklistInstance(null);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleChecklistComplete = () => {
    setShowChecklistContainer(false);
    // Recargar oferta para obtener estado actualizado
    cargarOferta();
  };

  const handleChecklistCancel = () => {
    setShowChecklistContainer(false);
  };

  // Obtener información del estado usando tokens del sistema de diseño
  const getEstadoInfo = () => {
    if (!oferta) {
      const neutralGray = (designColors?.neutral?.gray as any)?.[500] || '#999999';
      return { color: neutralGray, text: 'Desconocido', icon: 'info' };
    }

    const primaryColor = designColors?.primary?.['500'] || '#4E4FEB';
    const secondaryColor = designColors?.secondary?.['500'] || '#068FFF';
    const accentColor = designColors?.accent?.['500'] || '#FF6B00';
    const successColor = (designColors?.success as any)?.['500'] || designColors?.success?.main || '#3DB6B1';
    const errorColor = (designColors?.error as any)?.['500'] || designColors?.error?.main || '#FF5555';
    const warningColor = (designColors?.warning as any)?.['500'] || designColors?.warning?.main || '#FFB84D';
    const neutralGray = (designColors?.neutral?.gray as any)?.[500] || '#999999';

    switch (oferta.estado) {
      case 'enviada':
        return { color: secondaryColor, text: 'Enviada', icon: 'send' };
      case 'vista':
        return { color: primaryColor, text: 'Vista por Cliente', icon: 'visibility' };
      case 'en_chat':
        return { color: accentColor, text: 'En Conversación', icon: 'chat' };
      case 'aceptada':
        return { color: successColor, text: '¡Aceptada!', icon: 'check-circle' };
      case 'pendiente_pago':
        return { color: warningColor, text: 'Cliente Pagando...', icon: 'payment' };
      case 'pagada':
        return { color: successColor, text: '¡Pagada!', icon: 'paid' };
      case 'en_ejecucion':
        return { color: secondaryColor, text: 'En Ejecución', icon: 'build' };
      case 'completada':
        return { color: successColor, text: 'Completada', icon: 'check-circle' };
      case 'rechazada':
        return { color: errorColor, text: 'Rechazada', icon: 'cancel' };
      case 'retirada':
        return { color: neutralGray, text: 'Retirada', icon: 'undo' };
      case 'expirada':
        return { color: neutralGray, text: 'Expirada', icon: 'schedule' };
      default:
        return { color: neutralGray, text: oferta.estado, icon: 'info' };
    }
  };

  // Formatear precio
  const formatearPrecio = (precio: string): string => {
    try {
      const num = parseFloat(precio);
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(num);
    } catch {
      return precio;
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  const formatearFechaCorta = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  const formatearHora = (hora: string): string => {
    try {
      return hora.substring(0, 5);
    } catch {
      return hora;
    }
  };

  // Función para abrir dirección en Google Maps
  const openInGoogleMaps = (address: string) => {
    if (!address) return;

    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    });

    Linking.canOpenURL(url!).then((supported) => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        // Fallback to web version
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        Linking.openURL(webUrl).catch(err => {
          console.error('Error opening maps:', err);
          Alert.alert('Error', 'No se pudo abrir Google Maps');
        });
      }
    }).catch(err => {
      console.error('Error checking URL:', err);
      Alert.alert('Error', 'No se pudo abrir Google Maps');
    });
  };

  const handleIniciarServicio = async () => {
    if (!oferta) return;

    Alert.alert(
      'Iniciar Servicio',
      '¿Estás seguro de que deseas iniciar el servicio? Esto cambiará el estado a "En Ejecución" y habilitará el checklist si está disponible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          style: 'default',
          onPress: async () => {
            try {
              setProcesando(true);
              const result = await iniciarServicio(oferta.id);

              if (result.success && result.data) {
                const ofertaActualizada = result.data;
                // Asegurar que solicitud_servicio_id esté en la oferta
                if ((result as any).solicitud_servicio_id) {
                  (ofertaActualizada as any).solicitud_servicio_id = (result as any).solicitud_servicio_id;
                }
                setOferta(ofertaActualizada);

                // Cargar checklist si existe solicitud_servicio_id
                if ((ofertaActualizada as any).solicitud_servicio_id) {
                  await cargarChecklist((ofertaActualizada as any).solicitud_servicio_id);
                }

                Alert.alert(
                  'Servicio Iniciado',
                  'El servicio ha sido iniciado exitosamente. El checklist está disponible si está configurado.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', result.error || 'No se pudo iniciar el servicio');
              }
            } catch (error) {
              console.error('Error iniciando servicio:', error);
              Alert.alert('Error', 'No se pudo iniciar el servicio');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const handleTerminarServicio = async () => {
    if (!oferta) return;

    Alert.alert(
      'Terminar Servicio',
      '¿Estás seguro de que deseas terminar el servicio? Asegúrate de haber completado el checklist si está disponible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar',
          style: 'default',
          onPress: async () => {
            try {
              setProcesando(true);
              const result = await terminarServicio(oferta.id);

              if (result.success && result.data) {
                setOferta(result.data);
                Alert.alert(
                  'Servicio Terminado',
                  'El servicio ha sido terminado exitosamente. El cliente será notificado.',
                  [{ text: 'OK' }]
                );
                // Recargar para obtener datos actualizados
                cargarOferta();
              } else {
                Alert.alert('Error', result.error || 'No se pudo terminar el servicio');
              }
            } catch (error) {
              console.error('Error terminando servicio:', error);
              Alert.alert('Error', 'No se pudo terminar el servicio');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const bgDefault = designColors?.background?.default || '#EEEEEE';
  const bgPaper = designColors?.background?.paper || designColors?.base?.white || '#FFFFFF';
  const textPrimary = designColors?.text?.primary || '#000000';
  const primaryColor = designColors?.primary?.['500'] || '#4E4FEB';
  const secondaryColor = designColors?.secondary?.['500'] || '#068FFF';
  const successColor = (designColors?.success as any)?.['500'] || designColors?.success?.main || '#3DB6B1';
  const errorColor = (designColors?.error as any)?.['500'] || designColors?.error?.main || '#FF5555';
  const warningColor = (designColors?.warning as any)?.['500'] || designColors?.warning?.main || '#FFB84D';
  const white = designColors?.base?.white || '#FFFFFF';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Stack.Screen
          options={{
            title: 'Detalle de Oferta',
            headerStyle: { backgroundColor: bgPaper },
            headerTintColor: textPrimary,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: textPrimary }]}>
            Cargando oferta...
          </Text>
        </View>
      </View>
    );
  }

  if (!oferta) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Stack.Screen
          options={{
            title: 'Detalle de Oferta',
            headerStyle: { backgroundColor: bgPaper },
            headerTintColor: textPrimary,
          }}
        />
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color={textPrimary + '60'} />
          <Text style={[styles.emptyText, { color: textPrimary }]}>
            No se pudo cargar la oferta
          </Text>
        </View>
      </View>
    );
  }

  const estadoInfo = getEstadoInfo();

  // Calcular altura dinámica del contenedor de botones fijos según el estado
  const calcularAlturaBotonesFijos = (): number => {
    if (!oferta) return 100;

    let altura = 0;

    // Altura base del contenedor
    altura += 12; // paddingTop del contenedor

    // Estado: pagada - 1 botón principal
    if (oferta.estado === 'pagada') {
      altura += 52; // botón principal (paddingVertical 16 * 2 + texto ~20px)
      altura += 12; // marginBottom del botón
    }

    // Estado: en_ejecucion - puede tener múltiples botones
    if (oferta.estado === 'en_ejecucion') {
      altura += 50; // botones secundarios row (paddingVertical 14 * 2 + contenido)

      // Botón principal o mensaje pendiente
      if (loadingChecklist) {
        // No mostrar botón mientras carga
      } else if (checklistInstance && checklistInstance.estado === 'COMPLETADO') {
        altura += 12; // marginTop
        altura += 52; // botón terminar
        altura += 12; // marginBottom
      } else if (checklistInstance || (oferta as any).solicitud_servicio_id) {
        altura += 12; // marginTop
        altura += 52; // mensaje pendiente
        altura += 12; // marginBottom
      } else {
        altura += 12; // marginTop
        altura += 52; // botón terminar (sin checklist)
        altura += 12; // marginBottom
      }
    }

    // Estado: en_chat o aceptada - 1 botón
    if (oferta.estado === 'en_chat' || oferta.estado === 'aceptada') {
      altura += 52; // botón chat
      altura += 12; // marginBottom
    }

    // Estado: completada - botón para ver checklist si está disponible
    if (oferta.estado === 'completada') {
      if (checklistInstance) {
        altura += 52; // botón ver checklist
        altura += 12; // marginBottom
      }
    }

    // Botón secundario (oferta secundaria) - puede aparecer en varios estados
    if (!oferta.es_oferta_secundaria &&
      (oferta.estado === 'pagada' || oferta.estado === 'en_ejecucion') &&
      oferta.estado !== 'completada') {
      altura += 12; // marginTop
      altura += 52; // botón oferta secundaria
      altura += 12; // marginBottom
    }

    // Agregar área segura inferior (SafeAreaView la maneja, pero necesitamos espacio en ScrollView)
    altura += insets.bottom;

    // Agregar margen extra para seguridad
    altura += 20;

    return altura;
  };

  // Si está mostrando checklist, renderizar ChecklistContainer como pantalla completa
  if (showChecklistContainer && oferta && (oferta as any).solicitud_servicio_id) {
    return (
      <ChecklistContainer
        ordenId={(oferta as any).solicitud_servicio_id}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  const alturaBotonesFijos = calcularAlturaBotonesFijos();

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen
        options={{
          title: 'Detalle de Oferta',
          headerStyle: { backgroundColor: bgPaper },
          headerTintColor: textPrimary,
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: alturaBotonesFijos }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge de Estado y Fecha de Envío */}
        <View style={styles.badgesContainer}>
          <View style={[styles.estadoBadge, { backgroundColor: `${estadoInfo.color}15` }]}>
            <MaterialIcons
              name={estadoInfo.icon as any}
              size={18}
              color={estadoInfo.color}
            />
            <Text style={[styles.estadoBadgeText, { color: estadoInfo.color }]}>
              {estadoInfo.text}
            </Text>
          </View>
          <View style={styles.fechaBadge}>
            <MaterialIcons name="calendar-today" size={16} color={designColors?.text?.secondary || '#666666'} />
            <Text style={styles.fechaBadgeText}>
              Enviada el {formatearFecha(oferta.fecha_envio)}
            </Text>
          </View>
        </View>

        {/* Banner informativo según el estado */}
        {oferta.estado === 'aceptada' && (
          <EstadoBanner
            type="warning"
            title="Esperando Confirmación de Pago"
            message="El cliente aceptó tu oferta. Te notificaremos cuando complete el pago para que puedas dirigirte al servicio. NO te dirijas hasta confirmar el pago."
            icon="info"
          />
        )}

        {oferta.estado === 'pendiente_pago' && (
          <EstadoBanner
            type="warning"
            title="Cliente Procesando el Pago"
            message="El pago está siendo procesado. Esto puede tomar algunos minutos. Te notificaremos inmediatamente cuando se confirme el pago."
            icon="payment"
          />
        )}

        {oferta.estado === 'pagada' && (
          <EstadoBanner
            type="success"
            title="¡Pago Confirmado! Listo para Iniciar"
            message="El cliente completó el pago exitosamente. Ahora puedes iniciar el servicio cuando estés listo para comenzar el trabajo."
            icon="check-circle"
          />
        )}

        {oferta.estado === 'pagada_parcialmente' && (
          <EstadoBanner
            type="warning"
            title="Pago Parcial Realizado"
            message={
              oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente'
                ? "El cliente pagó los repuestos y la gestión de compra. Puedes iniciar el servicio. El pago de la mano de obra se realizará al finalizar."
                : "El cliente realizó un pago parcial. Revisa los detalles del pago a continuación."
            }
            icon="payment"
          />
        )}

        {oferta.estado === 'en_ejecucion' && (
          <EstadoBanner
            type="info"
            title="🔧 Servicio en Progreso"
            message="El servicio está en ejecución. Completa el checklist asociado y luego podrás terminar el servicio."
            icon="build"
          />
        )}

        {oferta.estado === 'completada' && (
          <EstadoBanner
            type="success"
            title="Servicio Completado"
            message="El servicio ha sido completado exitosamente. El cliente podrá calificar tu trabajo."
            icon="check-circle"
          />
        )}

        {oferta.estado === 'vista' && (
          <EstadoBanner
            type="info"
            title="Cliente Revisando tu Oferta"
            message="El cliente ha visto tu oferta. Pronto recibirás una respuesta o podrías iniciar una conversación para aclarar dudas."
            icon="visibility"
          />
        )}

        {oferta.estado === 'en_chat' && (
          <EstadoBanner
            type="info"
            title="💬 En Conversación con el Cliente"
            message="Estás conversando con el cliente. Responde sus preguntas para que pueda tomar una decisión."
            icon="chat"
            action={{
              text: 'Abrir Chat',
              onPress: () => router.push(`/chat-oferta/${oferta.id}`),
            }}
          />
        )}

        {oferta.estado === 'rechazada' && (
          <EstadoBanner
            type="error"
            title="Oferta Rechazada"
            message={
              oferta.rechazada_por_expiracion
                ? "Esta oferta fue rechazada automáticamente porque el cliente no completó el pago dentro del plazo establecido (48 horas desde la aceptación). Sigue ofertando en otras solicitudes para conseguir más servicios."
                : "El cliente seleccionó otra oferta. Sigue ofertando en otras solicitudes para conseguir más servicios."
            }
            icon="cancel"
          />
        )}

        {oferta.estado === 'expirada' && (
          <EstadoBanner
            type="error"
            title="Oferta Expirada"
            message="Esta oferta expiró sin ser aceptada. Intenta responder más rápido en futuras solicitudes."
            icon="schedule"
          />
        )}

        {/* Información de la Solicitud */}
        {oferta.solicitud_detail && (
          <>
            {/* Información del Cliente y Vehículo */}
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Información del Cliente</Text>
              <View style={styles.clientInfoContainer}>
                {oferta.solicitud_detail.cliente_foto ? (
                  <Image
                    source={{ uri: oferta.solicitud_detail.cliente_foto }}
                    style={styles.clientAvatar}
                  />
                ) : (
                  <View style={styles.clientAvatarPlaceholder}>
                    <MaterialIcons name="person" size={40} color={white} />
                  </View>
                )}
                <Text style={styles.clientName}>
                  {oferta.solicitud_detail.cliente_nombre || 'Cliente'}
                </Text>
              </View>

              {oferta.solicitud_detail.vehiculo && (
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleCardHeader}>
                    <MaterialIcons name="directions-car" size={20} color={textPrimary} />
                    <Text style={styles.vehicleCardTitle}>Vehículo</Text>
                  </View>
                  <Text style={styles.vehicleText}>
                    <Text style={styles.vehicleHighlight}>{oferta.solicitud_detail.vehiculo.marca}</Text>{' '}
                    {oferta.solicitud_detail.vehiculo.modelo}
                  </Text>
                  {oferta.solicitud_detail.vehiculo.año && (
                    <Text style={styles.vehicleDetailText}>Año: {oferta.solicitud_detail.vehiculo.año}</Text>
                  )}
                  {oferta.solicitud_detail.vehiculo.patente && (
                    <Text style={styles.vehicleDetailText}>Patente: {oferta.solicitud_detail.vehiculo.patente}</Text>
                  )}
                  {oferta.solicitud_detail.vehiculo.kilometraje && (
                    <Text style={styles.vehicleDetailText}>
                      Kilometraje: {oferta.solicitud_detail.vehiculo.kilometraje.toLocaleString('es-CL')} km
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Dirección de Servicio - Solo mostrar si la oferta está pagada o en estados posteriores */}
            {(oferta.estado === 'pagada' ||
              oferta.estado === 'pagada_parcialmente' ||
              oferta.estado === 'en_ejecucion' ||
              oferta.estado === 'completada') &&
              oferta.solicitud_detail?.direccion_servicio_texto && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeaderTitle}>📍 Dirección de Servicio</Text>
                  <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                      <MaterialIcons name="location-on" size={24} color={primaryColor} />
                      <View style={styles.addressContent}>
                        <Text style={styles.addressText}>
                          {oferta.solicitud_detail.direccion_servicio_texto}
                        </Text>
                        {oferta.solicitud_detail.detalles_ubicacion && (
                          <Text style={styles.addressDetailsText}>
                            {oferta.solicitud_detail.detalles_ubicacion}
                          </Text>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.mapsButton}
                      onPress={() => openInGoogleMaps(oferta.solicitud_detail!.direccion_servicio_texto)}
                    >
                      <MaterialIcons name="map" size={20} color={white} />
                      <Text style={styles.mapsButtonText}>Abrir en Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            {/* Servicios Solicitados */}
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Servicios Solicitados</Text>
              <View style={styles.serviciosBadgesContainer}>
                {oferta.solicitud_detail.servicios_solicitados.map((servicio) => (
                  <View key={servicio.id} style={styles.servicioBadge}>
                    <Text style={styles.servicioBadgeText}>{servicio.nombre}</Text>
                  </View>
                ))}
              </View>
              {oferta.solicitud_detail.descripcion_problema && (
                <>
                  <Text style={[styles.sectionHeaderTitle, { marginTop: 16 }]}>Descripción del Problema</Text>
                  <Text style={styles.descriptionText}>
                    {oferta.solicitud_detail.descripcion_problema}
                  </Text>
                </>
              )}
            </View>
          </>
        )}

        {/* Disponibilidad y Detalles de la Oferta */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>Tu Oferta - Disponibilidad</Text>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <MaterialIcons name="calendar-today" size={20} color={primaryColor} />
              <Text style={styles.dateTimeText}>
                {formatearFechaCorta(oferta.fecha_disponible)}
              </Text>
            </View>
            {oferta.hora_disponible && (
              <View style={styles.dateTimeItem}>
                <MaterialIcons name="access-time" size={20} color={primaryColor} />
                <Text style={styles.dateTimeText}>
                  {formatearHora(oferta.hora_disponible)}
                </Text>
              </View>
            )}
          </View>

          {oferta.tiempo_estimado_total && (
            <View style={styles.detailRow}>
              <MaterialIcons name="timer" size={20} color={designColors?.text?.secondary || '#666666'} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Tiempo Estimado</Text>
                <Text style={styles.detailValue}>{oferta.tiempo_estimado_total}</Text>
              </View>
            </View>
          )}

          {oferta.garantia_ofrecida && (
            <View style={styles.detailRow}>
              <MaterialIcons name="verified" size={20} color={successColor} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Garantía Ofrecida</Text>
                <Text style={styles.detailValue}>{oferta.garantia_ofrecida}</Text>
              </View>
            </View>
          )}

          {oferta.descripcion_oferta && (
            <View style={styles.descripcionContainer}>
              <Text style={styles.descripcionLabel}>Descripción de tu Oferta</Text>
              <Text style={styles.descripcionText}>
                {oferta.descripcion_oferta}
              </Text>
            </View>
          )}
        </View>

        {/* Precio de la Oferta */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>Precio Total</Text>
          <View style={styles.precioContainer}>
            <Text style={styles.precioValue}>
              {formatearPrecio(oferta.precio_total_ofrecido)}
            </Text>
            {oferta.incluye_repuestos && (
              <View style={styles.repuestosBadge}>
                <MaterialIcons name="build" size={16} color={successColor} />
                <Text style={styles.repuestosText}>Incluye repuestos</Text>
              </View>
            )}
          </View>

          {/* Información de pago si es parcial */}
          {oferta.estado === 'pagada_parcialmente' && (
            <View style={styles.pagoParcialInfoCard}>
              <View style={styles.pagoParcialHeader}>
                <MaterialIcons name="payment" size={20} color={warningColor} />
                <Text style={styles.pagoParcialTitulo}>Estado de Pago</Text>
              </View>

              {oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente' && (
                <>
                  <View style={styles.pagoParcialRow}>
                    <Text style={styles.pagoParcialLabel}>✅ Repuestos y gestión de compra:</Text>
                    <Text style={styles.pagoParcialMonto}>
                      {formatearPrecio((() => {
                        const costoRepuestos = parseFloat(oferta.costo_repuestos || '0');
                        const costoGestion = parseFloat(oferta.costo_gestion_compra || '0');
                        return Math.round(costoRepuestos + (costoGestion * 1.19));
                      })())}
                    </Text>
                  </View>

                  {oferta.costo_mano_obra && parseFloat(oferta.costo_mano_obra) > 0 && (
                    <View style={styles.pagoParcialRow}>
                      <Text style={styles.pagoParcialLabel}>⏳ Pendiente (mano de obra):</Text>
                      <Text style={[styles.pagoParcialMonto, { color: warningColor }]}>
                        {formatearPrecio(Math.round(parseFloat(oferta.costo_mano_obra) * 1.19))}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Desglose de servicios si existe */}
          {oferta.detalles_servicios_detail && oferta.detalles_servicios_detail.length > 0 && (
            <View style={styles.desgloseContainer}>
              <Text style={styles.desgloseTitle}>Desglose por servicio</Text>
              {oferta.detalles_servicios_detail.map((detalle, index) => (
                <View key={index} style={styles.desgloseItem}>
                  <View style={styles.desgloseHeader}>
                    <Text style={styles.desgloseServicioNombre}>
                      {detalle.servicio_nombre || `Servicio ${index + 1}`}
                    </Text>
                    <Text style={styles.desgloseServicioPrecio}>
                      {formatearPrecio(detalle.precio_servicio)}
                    </Text>
                  </View>
                  {detalle.tiempo_estimado && (
                    <View style={styles.desgloseDetalle}>
                      <MaterialIcons name="schedule" size={14} color={designColors?.text?.secondary || '#666666'} />
                      <Text style={styles.desgloseTiempo}>
                        {detalle.tiempo_estimado}
                      </Text>
                    </View>
                  )}
                  {detalle.notas && (
                    <Text style={styles.desgloseNotas}>
                      {detalle.notas}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Sección de servicio en ejecución */}
          {oferta.estado === 'en_ejecucion' && (
            <View style={styles.serviceActionsContainer}>
              {/* Botón de Chat */}
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push(`/chat-oferta/${oferta.id}`)}
              >
                <MaterialIcons name="chat" size={20} color={white} />
                <Text style={styles.chatButtonText}>Abrir Chat con Cliente</Text>
              </TouchableOpacity>

              {/* Estado del Checklist */}
              {loadingChecklist ? (
                <View style={styles.checklistStatusCard}>
                  <ActivityIndicator size="small" color={secondaryColor} />
                  <Text style={styles.checklistStatusText}>Cargando checklist...</Text>
                </View>
              ) : checklistInstance ? (
                checklistInstance.estado === 'COMPLETADO' ? (
                  <TouchableOpacity
                    style={[styles.checklistStatusCard, styles.checklistCompletedCard]}
                    onPress={() => setShowChecklistContainer(true)}
                  >
                    <MaterialIcons name="check-circle" size={24} color={successColor} />
                    <Text style={[styles.checklistStatusText, { color: successColor }]}>
                      ✅ Checklist Completado
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.checklistStatusCard}
                    onPress={() => setShowChecklistContainer(true)}
                  >
                    <MaterialIcons name="assignment" size={24} color={secondaryColor} />
                    <Text style={styles.checklistStatusText}>
                      Checklist en progreso - Toca para continuar
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Botones fijos en la parte inferior */}
      <SafeAreaView edges={['bottom']} style={styles.fixedActionsContainer}>
        {/* Botón principal para estado pagada */}
        {(oferta.estado === 'pagada' ||
          (oferta.estado === 'pagada_parcialmente' &&
            oferta.estado_pago_repuestos === 'pagado' &&
            oferta.estado_pago_servicio === 'pendiente')) && (
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
              onPress={handleIniciarServicio}
              disabled={procesando}
            >
              <MaterialIcons name="play-arrow" size={20} color={white} />
              <Text style={styles.fixedActionButtonText}>
                {procesando ? 'Iniciando...' : 'Iniciar Servicio'}
              </Text>
            </TouchableOpacity>
          )}

        {oferta.estado === 'en_ejecucion' && (
          <>
            {/* Botón principal: Terminar Servicio - Solo mostrar si checklist está completado o no hay checklist */}
            {(() => {
              // Si está cargando el checklist, no mostrar nada
              if (loadingChecklist) {
                return null;
              }

              // Si hay checklist y está completado, mostrar botón de terminar
              if (checklistInstance && checklistInstance.estado === 'COMPLETADO') {
                return (
                  <TouchableOpacity
                    style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
                    onPress={handleTerminarServicio}
                    disabled={procesando}
                  >
                    <MaterialIcons name="check-circle" size={20} color={white} />
                    <Text style={styles.fixedActionButtonText}>
                      {procesando ? 'Terminando...' : 'Terminar Servicio'}
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Si hay checklist pero NO está completado, no mostrar botón (mensaje ya está en el contenido)
              if (checklistInstance && checklistInstance.estado !== 'COMPLETADO') {
                return null;
              }

              // Si NO hay checklist pero hay solicitud_servicio_id, esperar (mensaje en contenido)
              if (!checklistInstance && (oferta as any).solicitud_servicio_id) {
                return null;
              }

              // Si NO hay checklist y NO hay solicitud_servicio_id, permitir terminar
              return (
                <TouchableOpacity
                  style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
                  onPress={handleTerminarServicio}
                  disabled={procesando}
                >
                  <MaterialIcons name="check-circle" size={20} color={white} />
                  <Text style={styles.fixedActionButtonText}>
                    {procesando ? 'Terminando...' : 'Terminar Servicio'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </>
        )}

        {(oferta.estado === 'en_chat' || oferta.estado === 'aceptada') &&
          oferta.solicitud_estado &&
          oferta.solicitud_estado !== 'cancelada' &&
          oferta.solicitud_estado !== 'expirada' && (
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
              onPress={() => router.push(`/chat-oferta/${oferta.id}`)}
            >
              <MaterialIcons name="chat" size={20} color={white} />
              <Text style={styles.fixedActionButtonText}>Abrir Chat</Text>
            </TouchableOpacity>
          )}

        {/* Botón para ver checklist cuando la oferta está completada */}
        {oferta.estado === 'completada' && checklistInstance && (oferta as any).solicitud_servicio_id && (
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
            onPress={() => setShowCompletedChecklistModal(true)}
          >
            <MaterialIcons name="assignment" size={20} color={white} />
            <Text style={styles.fixedActionButtonText}>Ver Checklist Realizado</Text>
          </TouchableOpacity>
        )}

        {/* Botón para crear oferta secundaria en estado en_ejecucion */}
        {!oferta.es_oferta_secundaria &&
          oferta.estado === 'en_ejecucion' && (
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedActionButtonOutline]}
              onPress={() => {
                if (oferta.solicitud) {
                  router.push(`/crear-oferta-secundaria/${oferta.solicitud}/${oferta.id}`);
                } else {
                  Alert.alert('Error', 'No se pudo obtener la información de la solicitud');
                }
              }}
            >
              <MaterialIcons name="add-circle" size={20} color={primaryColor} />
              <Text style={[styles.fixedActionButtonText, { color: primaryColor }]}>Crear Oferta Secundaria</Text>
            </TouchableOpacity>
          )}
      </SafeAreaView>

      {/* Modal para ver checklist completado */}
      {oferta && (oferta as any).solicitud_servicio_id && (
        <ChecklistCompletedView
          visible={showCompletedChecklistModal}
          onClose={() => setShowCompletedChecklistModal(false)}
          ordenId={(oferta as any).solicitud_servicio_id}
        />
      )}
    </View>
  );
}

// Crear estilos dinámicos usando los tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || '#000000';
  const textSecondary = COLORS?.text?.secondary || '#666666';
  const textTertiary = COLORS?.text?.tertiary || '#999999';
  const borderLight = COLORS?.border?.light || '#EEEEEE';
  const borderMain = COLORS?.border?.main || '#D0D0D0';
  const white = COLORS?.base?.white || '#FFFFFF';

  const primaryColor = COLORS?.primary?.['500'] || '#4E4FEB';
  const secondaryColor = COLORS?.secondary?.['500'] || '#068FFF';
  const successColor = (COLORS?.success as any)?.['500'] || COLORS?.success?.main || '#3DB6B1';
  const accentColor = COLORS?.accent?.['500'] || '#FF6B00';
  const warningColor = (COLORS?.warning as any)?.['500'] || COLORS?.warning?.main || '#FFB84D';

  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const spacingXl = SPACING?.xl || 32;

  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontSize2xl = TYPOGRAPHY?.fontSize?.['2xl'] || 32;

  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const fontWeightExtrabold = TYPOGRAPHY?.fontWeight?.extrabold || '800';

  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radiusFull = BORDERS?.radius?.full || 9999;

  const shadowSm = SHADOWS?.sm || {};
  const shadowMd = SHADOWS?.md || {};

  // Success light background (15% opacity)
  const successLight = successColor + '15';
  const warningLight = (COLORS?.warning as any)?.['50'] || '#FFF8E6';
  const warningBorder = (COLORS?.warning as any)?.['200'] || '#FFE4B5';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacingMd,
      paddingTop: spacingSm + spacingXs,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingSm + spacingXs,
      fontSize: fontSizeMd,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacingXl,
    },
    emptyText: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginTop: spacingMd,
    },

    // Badges de estado
    badgesContainer: {
      flexDirection: 'row',
      gap: spacingSm,
      marginBottom: spacingMd,
      flexWrap: 'wrap',
    },
    estadoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacingSm + spacingXs,
      paddingVertical: spacingSm,
      borderRadius: radiusXl,
    },
    estadoBadgeText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    fechaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacingSm + spacingXs,
      paddingVertical: spacingSm,
      borderRadius: radiusXl,
      backgroundColor: borderLight,
    },
    fechaBadgeText: {
      fontSize: fontSizeSm,
      color: textSecondary,
    },

    // Secciones
    section: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
    },
    sectionHeaderTitle: {
      fontSize: fontSizeMd + 1,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm + spacingXs,
    },

    // Servicios solicitados
    serviciosBadgesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
    },
    servicioBadge: {
      backgroundColor: borderLight,
      paddingHorizontal: spacingSm + spacingXs,
      paddingVertical: 6,
      borderRadius: radiusMd + radiusMd,
    },
    servicioBadgeText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },
    descriptionText: {
      fontSize: fontSizeBase + 1,
      color: textPrimary,
      lineHeight: 22,
    },

    // Cliente info
    clientInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm + spacingXs,
      marginBottom: spacingMd,
    },
    clientAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: borderMain,
    },
    clientAvatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: secondaryColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clientName: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },

    // Vehículo card
    vehicleCard: {
      backgroundColor: borderLight,
      borderRadius: 10,
      padding: spacingSm + 6,
      borderWidth: 1,
      borderColor: borderMain,
    },
    vehicleCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      marginBottom: spacingSm,
    },
    vehicleCardTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textSecondary,
    },
    vehicleText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginBottom: 6,
    },
    vehicleHighlight: {
      fontWeight: fontWeightBold,
      color: secondaryColor,
    },
    vehicleDetailText: {
      fontSize: fontSizeBase,
      color: textSecondary,
      marginBottom: 2,
    },

    // Fecha y hora
    dateTimeContainer: {
      gap: spacingSm + spacingXs,
      marginBottom: spacingMd,
    },
    dateTimeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dateTimeText: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },

    // Detalles
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: spacingSm + spacingXs,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: fontSizeSm,
      color: textSecondary,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },

    // Descripción
    descripcionContainer: {
      marginTop: spacingMd,
      paddingTop: spacingMd,
      borderTopWidth: 1,
      borderTopColor: borderMain,
    },
    descripcionLabel: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textSecondary,
      marginBottom: spacingSm,
    },
    descripcionText: {
      fontSize: fontSizeBase + 1,
      color: textPrimary,
      lineHeight: 22,
    },

    // Precio
    precioContainer: {
      alignItems: 'center',
      paddingVertical: spacingSm,
    },
    precioValue: {
      fontSize: fontSize2xl,
      fontWeight: fontWeightExtrabold,
      color: secondaryColor,
      marginBottom: spacingSm,
    },
    repuestosBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: successLight,
      paddingHorizontal: spacingSm + spacingXs,
      paddingVertical: 6,
      borderRadius: radiusMd + radiusMd,
    },
    repuestosText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: successColor,
    },
    pagoParcialInfoCard: {
      marginTop: spacingMd,
      padding: spacingMd,
      backgroundColor: warningLight,
      borderRadius: radiusMd,
      borderWidth: 1,
      borderColor: warningColor,
    },
    pagoParcialHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
      marginBottom: spacingSm,
    },
    pagoParcialTitulo: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightBold,
      color: warningColor,
    },
    pagoParcialRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacingXs,
    },
    pagoParcialLabel: {
      fontSize: fontSizeSm,
      color: textSecondary,
      fontWeight: fontWeightMedium,
    },
    pagoParcialMonto: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },

    // Desglose
    desgloseContainer: {
      marginTop: spacingXl - spacingXs,
      paddingTop: spacingXl - spacingXs,
      borderTopWidth: 1,
      borderTopColor: borderMain,
    },
    desgloseTitle: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm + spacingXs,
    },
    desgloseItem: {
      backgroundColor: borderLight,
      borderRadius: 10,
      padding: spacingSm + spacingXs,
      marginBottom: 10,
    },
    desgloseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    desgloseServicioNombre: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      flex: 1,
    },
    desgloseServicioPrecio: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightBold,
      color: secondaryColor,
    },
    desgloseDetalle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacingXs,
    },
    desgloseTiempo: {
      fontSize: fontSizeSm,
      color: textSecondary,
    },
    desgloseNotas: {
      fontSize: fontSizeSm,
      color: textSecondary,
      marginTop: spacingXs,
      fontStyle: 'italic',
    },

    // Botones fijos en la parte inferior
    fixedActionsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: bgPaper,
      paddingHorizontal: spacingMd,
      paddingTop: spacingSm + spacingXs,
      borderTopWidth: 1,
      borderTopColor: borderMain,
      ...shadowMd,
    },
    fixedActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      marginBottom: 0,
    },
    fixedActionButtonPrimary: {
      backgroundColor: secondaryColor,
      marginBottom: spacingSm + spacingXs,
    },
    fixedActionButtonSuccess: {
      backgroundColor: successColor,
      marginTop: spacingSm + spacingXs,
      marginBottom: spacingSm + spacingXs,
    },
    fixedActionButtonSecondary: {
      backgroundColor: bgPaper,
      borderWidth: 1,
      borderColor: secondaryColor,
      marginBottom: spacingSm + spacingXs,
    },
    fixedActionButtonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: primaryColor,
      marginTop: spacingSm,
      marginBottom: spacingSm + spacingXs,
    },
    fixedActionButtonText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: white,
    },
    // Address card styles
    addressCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingMd,
      ...shadowMd,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
      marginBottom: spacingMd,
    },
    addressContent: {
      flex: 1,
    },
    addressText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightMedium,
      color: textPrimary,
      lineHeight: fontSizeMd * 1.5,
    },
    addressDetailsText: {
      fontSize: fontSizeSm,
      color: textSecondary,
      marginTop: spacingXs,
      lineHeight: fontSizeSm * 1.4,
    },
    mapsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      backgroundColor: primaryColor,
      borderRadius: radiusMd,
      paddingVertical: spacingSm + spacingXs,
      paddingHorizontal: spacingMd,
      marginTop: spacingXs,
    },
    mapsButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: white,
    },
    checklistPendingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingMd,
      backgroundColor: warningLight,
      borderRadius: radiusLg,
      marginTop: spacingSm + spacingXs,
      marginBottom: spacingSm + spacingXs,
      borderWidth: 1,
      borderColor: warningBorder,
    },
    checklistPendingText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: warningColor,
      flex: 1,
      textAlign: 'center',
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      gap: spacingSm + spacingXs,
      marginBottom: 0,
    },
    secondaryActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingSm + 6,
      borderRadius: radiusLg,
      backgroundColor: bgPaper,
      borderWidth: 2,
      borderColor: secondaryColor,
    },
    secondaryActionButtonLeft: {
      borderColor: secondaryColor,
    },
    secondaryActionButtonRight: {
      borderColor: secondaryColor,
    },
    secondaryActionButtonText: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      color: secondaryColor,
    },
    // Nuevos estilos para servicio en ejecución
    serviceActionsContainer: {
      marginTop: spacingMd,
      gap: spacingMd,
    },
    chatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingLg,
      backgroundColor: primaryColor,
      borderRadius: radiusLg,
    },
    chatButtonText: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      color: white,
    },
    checklistStatusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingLg,
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      borderWidth: 2,
      borderColor: secondaryColor,
    },
    checklistCompletedCard: {
      borderColor: successColor,
      backgroundColor: successLight,
    },
    checklistStatusText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: textPrimary,
    },
  });
};

const styles = createStyles();
