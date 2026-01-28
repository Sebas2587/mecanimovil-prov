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
  Alert,
  Modal,
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
import * as ImagePicker from 'expo-image-picker';

export default function ChatOfertaScreen() {
  const { ofertaId } = useLocalSearchParams<{ ofertaId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const theme = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  // Obtener valores del sistema de diseño
  const designColors = theme?.colors || COLORS || {};

  // Valores específicos del sistema de diseño
  const bgDefault = designColors?.background?.default || '#EEEEEE';
  const bgPaper = designColors?.background?.paper || designColors?.base?.white || '#FFFFFF';
  const textPrimary = designColors?.text?.primary || '#000000';
  const textSecondary = designColors?.text?.secondary || '#666666';
  const textTertiary = designColors?.text?.tertiary || '#999999';
  const borderLight = designColors?.border?.light || '#EEEEEE';
  const secondaryColor = designColors?.secondary?.['500'] || '#068FFF';
  const white = designColors?.base?.white || '#FFFFFF';

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [oferta, setOferta] = useState<OfertaProveedor | null>(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [attachment, setAttachment] = useState<{ uri: string; type: 'image' | 'video'; name: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
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
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToEnd({ animated: true });
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

      const [ofertaResult, mensajesResult] = await Promise.all([
        solicitudesService.obtenerDetalleOferta(ofertaId),
        solicitudesService.obtenerChatOferta(ofertaId),
      ]);

      if (ofertaResult.success && ofertaResult.data) {
        setOferta(ofertaResult.data);
      }

      if (mensajesResult.success && mensajesResult.data) {
        setMensajes(mensajesResult.data);
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

    const unsubscribe = websocketService.onNuevoMensajeChat((event: NuevoMensajeChatEvent) => {
      console.log('📨 [CHAT PROVEEDOR] Evento recibido:', event);

      if (String(event.oferta_id) !== String(ofertaId)) {
        return;
      }

      if (mensajesEnviadosRef.current.has(event.mensaje_id)) {
        return;
      }

      setMensajes(prev => {
        if (prev.some(m => m.id === event.mensaje_id)) {
          return prev;
        }

        const nuevoMensajeObj: MensajeChat = {
          id: event.mensaje_id,
          oferta: event.oferta_id,
          mensaje: event.mensaje || event.message || event.content || '',
          enviado_por: 0,
          enviado_por_nombre: event.enviado_por,
          es_proveedor: event.es_proveedor,
          fecha_envio: event.timestamp || new Date().toISOString(),
          leido: false,
          fecha_lectura: null,
          archivo_adjunto: event.archivo_adjunto || null,
          solicitud_detail: prev[0]?.solicitud_detail || null,
        };

        return [...prev, nuevoMensajeObj];
      });

      if (!event.es_proveedor) {
        setTimeout(() => {
          solicitudesService.marcarMensajesComoLeidos(ofertaId);
        }, 1000);
      }
    });

    return unsubscribe;
  };

  const handlePickAttachment = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para enviar imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachment({
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || `image_${Date.now()}.jpg`
        });
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleEnviarMensaje = async () => {
    if ((!nuevoMensaje.trim() && !attachment) || !ofertaId || enviando) return;

    const mensajeTexto = nuevoMensaje.trim();
    const mensajeId = `temp-${Date.now()}`;
    const attachmentTemp = attachment;

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
      archivo_adjunto: attachmentTemp ? attachmentTemp.uri : null,
      solicitud_detail: mensajes[0]?.solicitud_detail || null,
    };

    setMensajes(prev => [...prev, mensajeOptimista]);
    setNuevoMensaje('');
    setAttachment(null);
    setEnviando(true);

    try {
      const result = await solicitudesService.enviarMensajeChat(
        ofertaId,
        mensajeTexto,
        attachmentTemp
      );

      if (result.success && result.data) {
        mensajesEnviadosRef.current.add(result.data.id);

        setMensajes(prev =>
          prev.map(m => m.id === mensajeId ? result.data! : m)
        );

        setTimeout(() => {
          mensajesEnviadosRef.current.delete(result.data!.id);
        }, 10000);
      } else {
        console.error('❌ [CHAT PROVEEDOR] Error respuesta:', result);
        setMensajes(prev => prev.filter(m => m.id !== mensajeId));
        setNuevoMensaje(mensajeTexto);
        setAttachment(attachmentTemp);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    } catch (error) {
      console.error('❌ [CHAT PROVEEDOR] Excepción envío:', error);
      setMensajes(prev => prev.filter(m => m.id !== mensajeId));
      setNuevoMensaje(mensajeTexto);
      setAttachment(attachmentTemp);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const renderMensaje = ({ item }: { item: MensajeChat }) => {
    const esPropio = item.es_proveedor === true;
    return (
      <ChatBubble
        mensaje={item}
        esPropio={esPropio}
        onImagePress={handleImagePress}
      />
    );
  };

  const clienteNombre = oferta?.solicitud_detail?.cliente_nombre || 'Cliente';
  const clienteFoto = oferta?.solicitud_detail?.cliente_foto;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
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
        {mensajes.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            renderItem={renderMensaje}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.mensajesList,
              { paddingBottom: keyboardHeight > 0 ? 80 : 80 }
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

        {/* Input area */}
        <View style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom || 8, keyboardHeight > 0 ? 8 : insets.bottom || 8),
            bottom: keyboardHeight
          }
        ]}>
          {/* Attachment Preview (Inside input container but above input) */}
          {attachment && (
            <View style={styles.previewContainerAbs}>
              <View style={styles.previewWrapper}>
                <Image source={{ uri: attachment.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={() => setAttachment(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={handlePickAttachment}>
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

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!nuevoMensaje.trim() && !attachment || enviando) && styles.sendButtonDisabled
            ]}
            onPress={handleEnviarMensaje}
            disabled={(!nuevoMensaje.trim() && !attachment) || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={white} />
            ) : (
              <Ionicons name="send" size={20} color={white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.modalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || '#FFFFFF';
  const textPrimary = COLORS?.text?.primary || '#000000';
  const textSecondary = COLORS?.text?.secondary || '#666666';
  const textTertiary = COLORS?.text?.tertiary || '#999999';
  const borderLight = COLORS?.border?.light || '#EEEEEE';
  const secondaryColor = COLORS?.secondary?.['500'] || '#068FFF';

  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingXl = SPACING?.xl || 32;

  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;

  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
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
    previewContainerAbs: {
      position: 'absolute',
      top: -110,
      left: spacingMd,
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: spacingSm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderLight,
    },
    previewWrapper: {
      position: 'relative',
    },
    imagePreview: {
      width: 100,
      height: 100,
      borderRadius: 8,
      backgroundColor: '#f0f0f0',
    },
    removePreviewButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: 'white',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#eee',
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
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
      padding: 10,
    },
    modalContent: {
      width: '100%',
      height: '80%',
    },
    fullScreenImage: {
      width: '100%',
      height: '100%',
    },
  });
};

const styles = createStyles();
