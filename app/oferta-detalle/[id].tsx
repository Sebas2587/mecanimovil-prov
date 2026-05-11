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
  Modal,
  Pressable,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { obtenerDetalleOferta, iniciarServicio, terminarServicio, type OfertaProveedor } from '@/services/solicitudesService';
import { COLORS, withOpacity, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { Alert } from 'react-native';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { calcularDesgloseIvaOferta, resolverDesgloseIvaMostrado } from '@/utils/ofertaPrecioDesglose';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

export default function OfertaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [oferta, setOferta] = useState<OfertaProveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [checklistInstance, setChecklistInstance] = useState<ChecklistInstance | null>(null);
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);
  const [showCompletedChecklistModal, setShowCompletedChecklistModal] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);

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

  const getEstadoInfo = () => {
    if (!oferta) {
      return { accent: I.muted, text: 'Desconocido', icon: 'info' as const };
    }

    switch (oferta.estado) {
      case 'enviada':
        return { accent: I.primary, text: 'Enviada', icon: 'send' as const };
      case 'vista':
        return { accent: I.primary, text: 'Vista por cliente', icon: 'visibility' as const };
      case 'en_chat':
        return { accent: I.primaryActive, text: 'En conversación', icon: 'chat' as const };
      case 'pendiente_creditos':
        return {
          accent: I.accentYellow,
          text: 'Pendiente créditos',
          icon: 'account-balance-wallet' as const,
        };
      case 'aceptada':
        return { accent: I.semanticUp, text: 'Aceptada', icon: 'check-circle' as const };
      case 'pendiente_pago':
        return { accent: I.accentYellow, text: 'Cliente pagando…', icon: 'payment' as const };
      case 'pagada':
        return { accent: I.semanticUp, text: 'Pagada', icon: 'paid' as const };
      case 'en_ejecucion':
        return { accent: I.primary, text: 'En ejecución', icon: 'build' as const };
      case 'completada':
        return { accent: I.semanticUp, text: 'Completada', icon: 'check-circle' as const };
      case 'rechazada':
        return { accent: I.semanticDown, text: 'Rechazada', icon: 'cancel' as const };
      case 'retirada':
        return { accent: I.muted, text: 'Retirada', icon: 'undo' as const };
      case 'expirada':
        return { accent: I.muted, text: 'Expirada', icon: 'schedule' as const };
      default:
        return { accent: I.body, text: oferta.estado, icon: 'info' as const };
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Detalle de Oferta',
            headerBackTitle: '',
            headerBackTitleVisible: false,
            headerStyle: { backgroundColor: I.canvas },
            headerTintColor: I.ink,
          }}
        />
        <View style={styles.screenRoot}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando oferta…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!oferta) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Detalle de Oferta',
            headerBackTitle: '',
            headerBackTitleVisible: false,
            headerStyle: { backgroundColor: I.canvas },
            headerTintColor: I.ink,
          }}
        />
        <View style={styles.screenRoot}>
          <View style={styles.emptyContainer}>
            <InstitutionalIcon name="error-outline" size={64} color={I.muted} />
            <Text style={styles.emptyText}>No se pudo cargar la oferta</Text>
          </View>
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

    // pendiente_creditos: fila con 2 botones (comprar + chat)
    if (oferta.estado === 'pendiente_creditos') {
      altura += 56; // fila única ~padding 14*2 + texto
      altura += 12; // marginBottom del bloque
    } else if (oferta.estado === 'en_chat' || oferta.estado === 'aceptada') {
      altura += 52;
      altura += 12;
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

    // Margen extra para que la última card (precio) no quede tapada por el footer
    altura += 36;

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
  const scrollPaddingExtra = SPACING.fixed.md;

  const solicitudActivaParaChat =
    !!oferta?.solicitud_estado &&
    oferta.solicitud_estado !== 'cancelada' &&
    oferta.solicitud_estado !== 'expirada';
  const mostrarChatFijo =
    !!oferta &&
    (oferta.estado === 'en_chat' ||
      oferta.estado === 'aceptada' ||
      oferta.estado === 'pendiente_creditos') &&
    solicitudActivaParaChat;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Detalle de Oferta',
          headerBackTitle: '',
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: I.canvas },
          headerTintColor: I.ink,
        }}
      />
      <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: hx, paddingBottom: alturaBotonesFijos + scrollPaddingExtra },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge de Estado y Fecha de Envío */}
        <View style={styles.badgesContainer}>
          <View style={[styles.estadoBadge, { backgroundColor: withOpacity(estadoInfo.accent, 0.12) }]}>
            <InstitutionalIcon name={estadoInfo.icon} size={18} color={estadoInfo.accent} />
            <Text style={[styles.estadoBadgeText, { color: estadoInfo.accent }]}>
              {estadoInfo.text}
            </Text>
          </View>
          <View style={styles.fechaBadge}>
            <InstitutionalIcon name="calendar-today" size={16} color={I.muted} />
            <Text style={styles.fechaBadgeText}>
              Enviada el {formatearFecha(oferta.fecha_envio)}
            </Text>
          </View>
        </View>

        {/* Banner informativo según el estado */}
        {oferta.estado === 'pendiente_creditos' && (
          <EstadoBanner
            type="warning"
            title="Confirmá con créditos"
            message={(() => {
              const nec = oferta.creditos_necesarios_adjudicacion;
              const sal = oferta.saldo_creditos_proveedor;
              const falt = oferta.creditos_faltantes_para_confirmar;
              const plazo = oferta.fecha_limite_confirmacion_creditos;
              const partes: string[] = [];
              if (typeof nec === 'number' && nec > 0) {
                partes.push(`Requeridos: ${nec}`);
              }
              if (typeof sal === 'number') {
                partes.push(`Saldo: ${sal}`);
              }
              if (typeof falt === 'number' && falt > 0) {
                partes.push(`Comprá ≥${falt}`);
              }
              let plazoTxt = '';
              if (plazo) {
                try {
                  plazoTxt = new Date(plazo).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                } catch {
                  plazoTxt = plazo;
                }
              }
              const cuerpo =
                partes.length > 0
                  ? `${partes.join(' · ')}${plazoTxt ? ` · hasta ${plazoTxt}` : ''}.`
                  : plazoTxt
                    ? `Comprá en la tienda antes del ${plazoTxt}.`
                    : 'Comprá en la tienda los créditos necesarios antes del plazo.';
              return `${cuerpo} Usá el botón inferior.`;
            })()}
            icon="account-balance-wallet"
          />
        )}

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
            title="Servicio en progreso"
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
            title="En conversación con el cliente"
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
                    <InstitutionalIcon name="person" size={40} color={I.primary} />
                  </View>
                )}
                <Text style={styles.clientName}>
                  {oferta.solicitud_detail.cliente_nombre || 'Cliente'}
                </Text>
              </View>

              {oferta.solicitud_detail.vehiculo && (
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleCardHeader}>
                    <InstitutionalIcon name="directions-car" size={20} color={I.ink} />
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
                  <Text style={styles.sectionHeaderTitle}>Dirección de servicio</Text>
                  <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                      <InstitutionalIcon name="location-on" size={24} color={I.primary} />
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
                      <InstitutionalIcon name="map" size={20} color={I.onPrimary} />
                      <Text style={styles.mapsButtonText}>Abrir en Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            {/* Servicios Solicitados */}
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Servicios Solicitados</Text>
              <View style={styles.serviciosBadgesContainer}>
                {(oferta.solicitud_detail.servicios_solicitados || []).map((servicio) => (
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
              {Array.isArray(oferta.solicitud_detail.fotos_necesidad) &&
                oferta.solicitud_detail.fotos_necesidad.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeaderTitle, { marginTop: 16 }]}>Fotos del cliente</Text>
                    <Text style={styles.fotosClienteHint}>Toca una imagen para verla en grande antes de ofertar.</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.fotosClienteRow}
                    >
                      {oferta.solicitud_detail.fotos_necesidad.map((foto) => {
                        const url = foto?.imagen_url;
                        if (!url) return null;
                        return (
                          <TouchableOpacity
                            key={foto.id || url}
                            onPress={() => setFotoAmpliadaUrl(url)}
                            activeOpacity={0.85}
                            style={styles.fotosClienteThumbWrap}
                          >
                            <Image source={{ uri: url }} style={styles.fotosClienteThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
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
              <InstitutionalIcon name="calendar-today" size={20} color={I.primary} />
              <Text style={styles.dateTimeText}>
                {formatearFechaCorta(oferta.fecha_disponible)}
              </Text>
            </View>
            {oferta.hora_disponible && (
              <View style={styles.dateTimeItem}>
                <InstitutionalIcon name="access-time" size={20} color={I.primary} />
                <Text style={styles.dateTimeText}>
                  {formatearHora(oferta.hora_disponible)}
                </Text>
              </View>
            )}
          </View>

          {oferta.tiempo_estimado_total && (
            <View style={styles.detailRow}>
              <InstitutionalIcon name="timer" size={20} color={I.muted} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Tiempo Estimado</Text>
                <Text style={styles.detailValue}>{oferta.tiempo_estimado_total}</Text>
              </View>
            </View>
          )}

          {oferta.garantia_ofrecida && (
            <View style={styles.detailRow}>
              <InstitutionalIcon name="verified" size={20} color={I.semanticUp} />
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
          {(() => {
            const mo = parseFloat(String(oferta.costo_mano_obra ?? '0')) || 0;
            const rep = parseFloat(String(oferta.costo_repuestos ?? '0')) || 0;
            const gest = parseFloat(String(oferta.costo_gestion_compra ?? '0')) || 0;
            const tieneMontosProveedor = mo > 0 || rep > 0 || gest > 0;
            const desgloseCalc = calcularDesgloseIvaOferta({
              costoManoObra: oferta.costo_mano_obra,
              costoRepuestos: oferta.costo_repuestos,
              costoGestionCompra: oferta.costo_gestion_compra,
              precioTotalOfrecido: oferta.precio_total_ofrecido,
            });
            const merged = resolverDesgloseIvaMostrado(oferta.desglose_iva, desgloseCalc);
            const subSinIvaDisplay = merged.subSinIva;
            const ivaDisplay = merged.iva;
            const totalCliente = merged.total;
            const mostrarNotaReconciliacion = desgloseCalc.mostrarNotaReconciliacion;

            return (
              <View style={styles.precioCard}>
                {tieneMontosProveedor ? (
                  <>
                    {mo > 0 && (
                      <View style={styles.precioDesgloseRow}>
                        <Text style={styles.precioDesgloseLabel}>Mano de obra (sin IVA)</Text>
                        <Text style={styles.precioDesgloseValue}>{formatearPrecio(String(Math.round(mo)))}</Text>
                      </View>
                    )}
                    {rep > 0 && (
                      <View style={styles.precioDesgloseRow}>
                        <Text style={styles.precioDesgloseLabel}>Repuestos (sin IVA)</Text>
                        <Text style={styles.precioDesgloseValue}>{formatearPrecio(String(Math.round(rep)))}</Text>
                      </View>
                    )}
                    {(oferta.incluye_repuestos || gest > 0) && (
                      <View style={styles.precioDesgloseRow}>
                        <Text style={styles.precioDesgloseLabel}>Gestión de compra (sin IVA)</Text>
                        <Text style={styles.precioDesgloseValue}>{formatearPrecio(String(Math.round(gest)))}</Text>
                      </View>
                    )}
                    <View style={styles.precioDesgloseDivider} />
                  </>
                ) : null}
                <View style={styles.precioDesgloseRow}>
                  <Text style={styles.precioDesgloseLabelMuted}>Subtotal (sin IVA)</Text>
                  <Text style={styles.precioDesgloseValueMuted}>
                    {formatearPrecio(String(subSinIvaDisplay))}
                  </Text>
                </View>
                <View style={styles.precioDesgloseRow}>
                  <Text style={styles.precioDesgloseLabelMuted}>IVA (19%)</Text>
                  <Text style={styles.precioDesgloseValueMuted}>
                    {formatearPrecio(String(ivaDisplay))}
                  </Text>
                </View>
                <View style={styles.precioDesgloseDivider} />
                <View style={styles.precioTotalDestacadoRow}>
                  <Text style={styles.precioTotalDestacadoLabel}>Total a pagar</Text>
                  <Text style={styles.precioTotalDestacadoValue}>
                    {formatearPrecio(oferta.precio_total_ofrecido)}
                  </Text>
                </View>
                {mostrarNotaReconciliacion ? (
                  <Text style={styles.precioDesgloseNota}>
                    El total coincide con el precio de la oferta. Subtotal e IVA se reparten sobre ese monto; las
                    líneas superiores son el desglose declarado.
                  </Text>
                ) : null}
                {oferta.incluye_repuestos && (
                  <View
                    style={[
                      styles.repuestosBadge,
                      { alignSelf: 'center', marginTop: SPACING?.sm ?? 8 },
                    ]}
                  >
                    <InstitutionalIcon name="build" size={16} color={I.semanticUp} />
                    <Text style={styles.repuestosText}>Incluye repuestos</Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Información de pago si es parcial */}
          {oferta.estado === 'pagada_parcialmente' && (
            <View style={styles.pagoParcialInfoCard}>
              <View style={styles.pagoParcialHeader}>
                <InstitutionalIcon name="payment" size={20} color={I.accentYellow} />
                <Text style={styles.pagoParcialTitulo}>Estado de Pago</Text>
              </View>

              {oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente' && (
                <>
                  <View style={styles.pagoParcialRow}>
                    <Text style={styles.pagoParcialLabel}>Repuestos y gestión de compra</Text>
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
                      <Text style={styles.pagoParcialLabel}>Pendiente (mano de obra)</Text>
                      <Text style={[styles.pagoParcialMonto, { color: I.accentYellow }]}>
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
                      <InstitutionalIcon name="schedule" size={14} color={I.muted} />
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
                <InstitutionalIcon name="chat" size={20} color={I.onPrimary} />
                <Text style={styles.chatButtonText}>Abrir Chat con Cliente</Text>
              </TouchableOpacity>

              {/* Estado del Checklist */}
              {loadingChecklist ? (
                <View style={styles.checklistStatusCard}>
                  <ActivityIndicator size="small" color={I.primary} />
                  <Text style={styles.checklistStatusText}>Cargando checklist...</Text>
                </View>
              ) : checklistInstance ? (
                checklistInstance.estado === 'COMPLETADO' ? (
                  <TouchableOpacity
                    style={[styles.checklistStatusCard, styles.checklistCompletedCard]}
                    onPress={() => setShowChecklistContainer(true)}
                  >
                    <InstitutionalIcon name="check-circle" size={24} color={I.semanticUp} />
                    <Text style={[styles.checklistStatusText, { color: I.semanticUp }]}>
                      Checklist completado
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.checklistStatusCard}
                    onPress={() => setShowChecklistContainer(true)}
                  >
                    <InstitutionalIcon name="assignment" size={24} color={I.primary} />
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
              <InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} />
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
                    <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} />
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
                  <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} />
                  <Text style={styles.fixedActionButtonText}>
                    {procesando ? 'Terminando...' : 'Terminar Servicio'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </>
        )}

        {oferta.estado === 'pendiente_creditos' && mostrarChatFijo && (
          <View style={styles.fixedActionsRow}>
            <TouchableOpacity
              style={[
                styles.fixedActionButton,
                styles.fixedActionButtonPrimary,
                styles.fixedActionButtonPrimaryInRow,
              ]}
              onPress={() => {
                const falt = oferta.creditos_faltantes_para_confirmar;
                const nec = oferta.creditos_necesarios_adjudicacion;
                const minCompra =
                  typeof falt === 'number' && falt > 0
                    ? falt
                    : typeof nec === 'number' && nec > 0
                      ? nec
                      : 1;
                router.push(`/creditos?tab=tienda&minCreditos=${minCompra}`);
              }}
            >
              <InstitutionalIcon name="account-balance-wallet" size={20} color={I.onPrimary} />
              <Text style={styles.fixedActionButtonText} numberOfLines={1}>
                Comprar créditos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fixedActionButton,
                styles.fixedActionButtonOutline,
                styles.fixedActionButtonChatInRow,
              ]}
              onPress={() => router.push(`/chat-oferta/${oferta.id}`)}
            >
              <InstitutionalIcon name="chat" size={18} color={I.primary} />
              <Text style={[styles.fixedActionButtonTextCompact, { color: I.primary }]} numberOfLines={1}>
                Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {oferta.estado === 'pendiente_creditos' && !mostrarChatFijo && (
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
            onPress={() => {
              const falt = oferta.creditos_faltantes_para_confirmar;
              const nec = oferta.creditos_necesarios_adjudicacion;
              const minCompra =
                typeof falt === 'number' && falt > 0
                  ? falt
                  : typeof nec === 'number' && nec > 0
                    ? nec
                    : 1;
              router.push(`/creditos?tab=tienda&minCreditos=${minCompra}`);
            }}
          >
            <InstitutionalIcon name="account-balance-wallet" size={20} color={I.onPrimary} />
            <Text style={styles.fixedActionButtonText}>Comprar créditos</Text>
          </TouchableOpacity>
        )}

        {mostrarChatFijo && oferta.estado !== 'pendiente_creditos' && (
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonOutline]}
            onPress={() => router.push(`/chat-oferta/${oferta.id}`)}
          >
            <InstitutionalIcon name="chat" size={20} color={I.primary} />
            <Text style={[styles.fixedActionButtonText, { color: I.primary }]}>Abrir Chat</Text>
          </TouchableOpacity>
        )}

        {/* Botón para ver checklist cuando la oferta está completada */}
        {oferta.estado === 'completada' && checklistInstance && (oferta as any).solicitud_servicio_id && (
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
            onPress={() => setShowCompletedChecklistModal(true)}
          >
            <InstitutionalIcon name="assignment" size={20} color={I.onPrimary} />
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
              <InstitutionalIcon name="add-circle" size={20} color={I.primary} />
              <Text style={[styles.fixedActionButtonText, { color: I.primary }]}>Crear Oferta Secundaria</Text>
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

      <Modal visible={!!fotoAmpliadaUrl} transparent animationType="fade" onRequestClose={() => setFotoAmpliadaUrl(null)}>
        <Pressable style={styles.fotoLightboxBackdrop} onPress={() => setFotoAmpliadaUrl(null)}>
          {fotoAmpliadaUrl ? (
            <Image source={{ uri: fotoAmpliadaUrl }} style={styles.fotoLightboxImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
      </View>
    </View>
  );
}

const shadowFooterOferta = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.md,
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
    marginTop: SPACING.fixed.md,
    color: I.ink,
  },

  badgesContainer: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
    flexWrap: 'wrap',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  estadoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
  },
  fechaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fechaBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
  },

  section: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  sectionHeaderTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },

  serviciosBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  servicioBadge: {
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  servicioBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  descriptionText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  fotosClienteHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  fotosClienteRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingVertical: 4,
  },
  fotosClienteThumbWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fotosClienteThumb: {
    width: 96,
    height: 96,
  },
  fotoLightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.md,
  },
  fotoLightboxImage: {
    width: '100%' as const,
    height: '100%' as const,
    maxHeight: 640,
  },

  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: I.surfaceStrong,
  },
  clientAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(I.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
  },

  vehicleCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  vehicleCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.muted,
  },
  vehicleText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
    marginBottom: 6,
  },
  vehicleHighlight: {
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  vehicleDetailText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
    marginBottom: 2,
  },

  dateTimeContainer: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: SPACING.fixed.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },

  descripcionContainer: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  descripcionLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  descripcionText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },

  precioCard: {
    alignSelf: 'stretch',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  precioDesgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  precioDesgloseLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    flex: 1,
    paddingRight: SPACING.fixed.sm,
  },
  precioDesgloseValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    color: I.ink,
  },
  precioDesgloseLabelMuted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  precioDesgloseValueMuted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    color: I.ink,
  },
  precioDesgloseDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.sm,
  },
  precioTotalDestacadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  precioTotalDestacadoLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
    flex: 1,
    paddingRight: SPACING.fixed.sm,
  },
  precioTotalDestacadoValue: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.primary,
  },
  precioDesgloseNota: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginTop: SPACING.fixed.sm,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: withOpacity(I.semanticUp, 0.1),
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticUp, 0.25),
  },
  repuestosText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.semanticUp,
  },
  pagoParcialInfoCard: {
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    backgroundColor: withOpacity(I.accentYellow, 0.15),
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.accentYellow,
  },
  pagoParcialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  pagoParcialTitulo: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.body,
  },
  pagoParcialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.fixed.xs,
  },
  pagoParcialLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  pagoParcialMonto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    color: I.ink,
  },

  desgloseContainer: {
    marginTop: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.lg,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  desgloseTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  desgloseItem: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: 10,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  desgloseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  desgloseServicioNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
    flex: 1,
  },
  desgloseServicioPrecio: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.numberDisplay.lineHeight),
    color: I.primary,
  },
  desgloseDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.fixed.xs,
  },
  desgloseTiempo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  desgloseNotas: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    fontStyle: 'italic',
    color: I.muted,
    marginTop: SPACING.fixed.xs,
  },

  fixedActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    ...shadowFooterOferta,
  },
  fixedActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  fixedActionButtonPrimaryInRow: {
    flex: 2,
    minWidth: 0,
    marginBottom: 0,
    marginTop: 0,
  },
  fixedActionButtonChatInRow: {
    flex: 1,
    minWidth: 0,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    marginTop: 0,
    marginBottom: 0,
  },
  fixedActionButtonTextCompact: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.onPrimary,
  },
  fixedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    marginBottom: 0,
  },
  fixedActionButtonPrimary: {
    backgroundColor: I.primary,
    marginBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  fixedActionButtonSuccess: {
    backgroundColor: I.semanticUp,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  fixedActionButtonOutline: {
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  fixedActionButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },

  addressCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    ...SHADOWS.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  addressDetailsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginTop: SPACING.fixed.xs,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    marginTop: SPACING.fixed.xs,
    ...SHADOWS.editorial,
  },
  mapsButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.onPrimary,
  },

  checklistPendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    backgroundColor: withOpacity(I.accentYellow, 0.12),
    borderRadius: BORDERS.radius.lg,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.accentYellow,
  },
  checklistPendingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.body,
    flex: 1,
    textAlign: 'center',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginBottom: 0,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
  },
  secondaryActionButtonLeft: {
    borderColor: I.primary,
  },
  secondaryActionButtonRight: {
    borderColor: I.primary,
  },
  secondaryActionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.primary,
  },

  serviceActionsContainer: {
    marginTop: SPACING.fixed.md,
    gap: SPACING.fixed.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.lg,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    ...SHADOWS.editorial,
  },
  chatButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.onPrimary,
  },
  checklistStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  checklistCompletedCard: {
    borderColor: I.semanticUp,
    backgroundColor: withOpacity(I.semanticUp, 0.08),
  },
  checklistStatusText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.ink,
  },
});
