import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import solicitudesService, { type MensajeChat, type OfertaProveedor } from '@/services/solicitudesService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';

export default function ChatOfertaScreen() {
  const { ofertaId } = useLocalSearchParams<{ ofertaId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const theme = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  // Obtener valores del sistema de diseño
  const designColors = theme?.colors || COLORS || {};
  const designSpacing = theme?.spacing || SPACING || {};
  const designTypography = theme?.typography || TYPOGRAPHY || {};
  const designBorders = theme?.borders || BORDERS || {};

  // Valores específicos del sistema de diseño
  const bgDefault = designColors?.background?.default || '#EEEEEE';
  const bgPaper = designColors?.background?.paper || designColors?.base?.white || '#FFFFFF';
  const textPrimary = designColors?.text?.primary || '#000000';
  const textSecondary = designColors?.text?.secondary || '#666666';
  const textTertiary = designColors?.text?.tertiary || '#999999';
  const borderLight = designColors?.border?.light || '#EEEEEE';
  const borderMain = designColors?.border?.main || '#D0D0D0';
  const secondaryColor = designColors?.secondary?.['500'] || '#068FFF';
  const white = designColors?.base?.white || '#FFFFFF';

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [oferta, setOferta] = useState<OfertaProveedor | null>(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const ultimaActualizacionRef = useRef<number>(0);
  const mensajesEnviadosRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      let unsubscribe: (() => void) | undefined;

      if (ofertaId) {
        cargarDatos();
        unsubscribe = suscribirWebSocket();
      }

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [ofertaId])
  );

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    if (mensajes.length > 0) {
      // Usar requestAnimationFrame para asegurar que el scroll se ejecute después del render
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToEnd({ animated: true });
              console.log('📜 [CHAT PROVEEDOR] Scroll automático ejecutado');
            } catch (error) {
              console.error('❌ [CHAT PROVEEDOR] Error en scroll automático:', error);
            }
          }
        }, 100);
      });
    }
  }, [mensajes.length]);

  useEffect(() => {
    // Listeners del teclado
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const cargarDatos = async () => {
    if (!ofertaId) return;

    try {
      setLoading(true);

      // Cargar oferta y mensajes en paralelo
      const [ofertaResult, mensajesResult] = await Promise.all([
        solicitudesService.obtenerDetalleOferta(ofertaId),
        solicitudesService.obtenerChatOferta(ofertaId),
      ]);

      if (ofertaResult.success && ofertaResult.data) {
        setOferta(ofertaResult.data);
      }

      if (mensajesResult.success && mensajesResult.data) {
        setMensajes(mensajesResult.data);

        // Marcar mensajes como leídos
        await solicitudesService.marcarMensajesComoLeidos(ofertaId);
      }
    } catch (error) {
      console.error('Error cargando datos del chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const suscribirWebSocket = () => {
    if (!ofertaId) return;

    // Suscribirse a mensajes de chat en tiempo real
    const unsubscribe = websocketService.onNuevoMensajeChat((event: NuevoMensajeChatEvent) => {
      console.log('📨 [CHAT PROVEEDOR] Evento recibido:', event);
      console.log('🔍 [CHAT PROVEEDOR] Comparando IDs:', {
        eventOferta: event.oferta_id,
        currentOferta: ofertaId
      });

      // Solo procesar mensajes de esta oferta (Comparación segura con String)
      if (String(event.oferta_id) !== String(ofertaId)) {
        console.log('⚠️ [CHAT PROVEEDOR] Oferta ID no coincide, ignorando.');
        return;
      }

      // Evitar duplicados - si el mensaje ya fue enviado por nosotros, ignorarlo
      if (mensajesEnviadosRef.current.has(event.mensaje_id)) {
        console.log('💬 Mensaje ya procesado (enviado por nosotros), ignorando');
        return;
      }


      console.log('💬 [CHAT PROVEEDOR] Nuevo mensaje recibido por WebSocket:', event);


      // Agregar mensaje a la lista (actualización en tiempo real)
      setMensajes(prev => {
        // Verificar que el mensaje no exista ya
        if (prev.some(m => m.id === event.mensaje_id)) {
          console.log('💬 Mensaje ya existe en la lista, ignorando');
          return prev;
        }

        // Crear objeto de mensaje compatible con MensajeChat
        const nuevoMensaje: MensajeChat = {
          id: event.mensaje_id,
          oferta: event.oferta_id,
          mensaje: event.mensaje || event.message || event.content, // Handle variations
          enviado_por: 0, // Se actualizará con la recarga
          enviado_por_nombre: event.enviado_por,
          es_proveedor: event.es_proveedor,
          fecha_envio: event.timestamp || new Date().toISOString(),
          leido: false,
          fecha_lectura: null,
          archivo_adjunto: null,
          solicitud_detail: prev[0]?.solicitud_detail || null,
        };

        // El scroll automático se maneja en el useEffect que depende de mensajes.length
        return [...prev, nuevoMensaje];
      });

      // Marcar como leído si el mensaje no es del proveedor (es del cliente)
      if (!event.es_proveedor) {
        // Debounced: marcar como leído después de un delay
        setTimeout(() => {
          solicitudesService.marcarMensajesComoLeidos(ofertaId);
        }, 1000);
      }
    });

    // Guardar función de desuscripción
    return unsubscribe;
  };

  const desuscribirWebSocket = () => {
    // La función unsubscribe se llama automáticamente en el cleanup de useFocusEffect
  };

  const handleEnviarMensaje = async () => {
    console.log('📤 [CHAT PROVEEDOR] Enviando mensaje:', nuevoMensaje);
    if (!nuevoMensaje.trim() || !ofertaId || enviando) return;

    const mensajeTexto = nuevoMensaje.trim();
    const mensajeId = `temp-${Date.now()}`; // ID temporal para optimistic update

    // Actualización optimista - agregar mensaje inmediatamente a la UI
    const mensajeOptimista: MensajeChat = {
      id: mensajeId,
      oferta: ofertaId,
      mensaje: mensajeTexto,
      enviado_por: usuario?.id || 0,
      enviado_por_nombre: usuario?.first_name || 'Tú',
      es_proveedor: true,
      fecha_envio: new Date().toISOString(),
      leido: false,
      fecha_lectura: null,
      archivo_adjunto: null,
      solicitud_detail: mensajes[0]?.solicitud_detail || null,
    };

    setMensajes(prev => [...prev, mensajeOptimista]);
    setNuevoMensaje('');
    setEnviando(true);

    // El scroll automático se maneja en el useEffect que depende de mensajes.length

    try {
      const result = await solicitudesService.enviarMensajeChat(ofertaId, mensajeTexto);

      console.log('📤 [CHAT PROVEEDOR] Resultado envío:', result.success ? 'Éxito' : 'Fallo');

      if (result.success && result.data) {
        // Marcar el mensaje como enviado para evitar duplicados del WebSocket
        mensajesEnviadosRef.current.add(result.data.id);

        // Reemplazar mensaje optimista con el real
        setMensajes(prev =>
          prev.map(m => m.id === mensajeId ? result.data! : m)
        );

        // Limpiar el Set después de un tiempo (para evitar memory leaks)
        setTimeout(() => {
          mensajesEnviadosRef.current.delete(result.data!.id);
        }, 10000);
      } else {
        // Si falló, eliminar mensaje optimista y restaurar texto
        console.error('❌ [CHAT PROVEEDOR] Error respuesta:', result);
        setMensajes(prev => prev.filter(m => m.id !== mensajeId));
        setNuevoMensaje(mensajeTexto);
        console.error('Error enviando mensaje:', result.error);
      }
    } catch (error) {
      // Si hubo error, eliminar mensaje optimista y restaurar texto
      console.error('❌ [CHAT PROVEEDOR] Excepción envío:', error);
      setMensajes(prev => prev.filter(m => m.id !== mensajeId));
      setNuevoMensaje(mensajeTexto);
      console.error('Error enviando mensaje:', error);
    } finally {
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }: { item: MensajeChat }) => {
    // El proveedor es el que envía mensajes con es_proveedor = true
    const esPropio = item.es_proveedor === true;

    return (
      <ChatBubble
        mensaje={item}
        esPropio={esPropio}
      />
    );
  };

  // Obtener información del cliente
  const clienteNombre = oferta?.solicitud_detail?.cliente_nombre || 'Cliente';
  const clienteFoto = oferta?.solicitud_detail?.cliente_foto;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Header personalizado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={secondaryColor} />
          <Text style={styles.loadingText}>Cargando chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header personalizado con nombre y foto del cliente */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{clienteNombre}</Text>
        <View style={styles.headerRight}>
          {clienteFoto ? (
            <Image
              source={{ uri: clienteFoto }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <MaterialIcons name="person" size={20} color={textSecondary} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Lista de mensajes */}
        {mensajes.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            renderItem={renderMensaje}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.mensajesList,
              { paddingBottom: keyboardHeight > 0 ? 80 : 80 } // Espacio para el input
            ]}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="chat-bubble-outline" size={64} color={textTertiary} />
            <Text style={styles.emptyText}>No hay mensajes aún</Text>
            <Text style={styles.emptySubtext}>
              Comienza la conversación enviando un mensaje
            </Text>
          </View>
        )}

        {/* Input de mensaje */}
        <View style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom || 8, keyboardHeight > 0 ? 8 : insets.bottom || 8),
            bottom: keyboardHeight
          }
        ]}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle-outline" size={28} color={textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Mensaje"
            placeholderTextColor={textTertiary}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            multiline
            maxLength={500}
            editable={!enviando}
          />

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="mic-outline" size={28} color={textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!nuevoMensaje.trim() || enviando) && styles.sendButtonDisabled
            ]}
            onPress={handleEnviarMensaje}
            disabled={!nuevoMensaje.trim() || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={white} />
            ) : (
              <Ionicons name="send" size={20} color={white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  const secondaryColor = COLORS?.secondary?.['500'] || '#068FFF';
  const white = COLORS?.base?.white || '#FFFFFF';

  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingXl = SPACING?.xl || 32;

  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;

  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';

  const radiusFull = BORDERS?.radius?.full || 9999;
  const radiusXl = BORDERS?.radius?.xl || 20;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacingMd,
      paddingTop: spacingSm + spacingXs,
      paddingBottom: spacingSm + spacingXs,
      backgroundColor: bgPaper,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    backButton: {
      padding: spacingXs,
      marginRight: spacingSm,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSizeMd + 1,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      textAlign: 'center',
      marginHorizontal: spacingSm,
    },
    headerRight: {
      width: 36,
      alignItems: 'flex-end',
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingSm + spacingXs,
      fontSize: fontSizeMd,
      color: textSecondary,
    },
    mensajesList: {
      padding: spacingMd,
      flexGrow: 1,
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
      color: textPrimary,
    },
    emptySubtext: {
      fontSize: fontSizeBase,
      marginTop: spacingSm,
      textAlign: 'center',
      color: textTertiary,
    },
    inputContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingSm + spacingXs,
      paddingTop: spacingSm,
      backgroundColor: bgPaper,
      borderTopWidth: 1,
      borderTopColor: borderLight,
      gap: spacingSm,
    },
    actionButton: {
      padding: spacingXs,
    },
    input: {
      flex: 1,
      backgroundColor: borderLight,
      borderRadius: radiusXl,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      fontSize: fontSizeMd,
      maxHeight: 100,
      color: textPrimary,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: secondaryColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });
};

const styles = createStyles();

