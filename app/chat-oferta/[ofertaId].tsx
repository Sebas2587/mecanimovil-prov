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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft, User, Send, Paperclip, X, MessageCircle, ImageIcon,
} from 'lucide-react-native';
import solicitudesService, { type MensajeChat, type OfertaProveedor } from '@/services/solicitudesService';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import * as ImagePicker from 'expo-image-picker';

export default function ChatOfertaScreen() {
  const { ofertaId } = useLocalSearchParams<{ ofertaId: string }>();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

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
      return () => { if (unsubscribe) unsubscribe(); };
    }, [ofertaId])
  );

  useEffect(() => {
    if (mensajes.length > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try { flatListRef.current?.scrollToEnd({ animated: true }); } catch {}
        }, 100);
      });
    }
  }, [mensajes.length]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const cargarDatos = async () => {
    if (!ofertaId) return;
    try {
      setLoading(true);
      const [ofertaResult, mensajesResult] = await Promise.all([
        solicitudesService.obtenerDetalleOferta(ofertaId),
        solicitudesService.obtenerChatOferta(ofertaId),
      ]);
      if (ofertaResult.success && ofertaResult.data) setOferta(ofertaResult.data);
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
      if (String(event.oferta_id) !== String(ofertaId)) return;
      if (mensajesEnviadosRef.current.has(event.mensaje_id)) return;
      setMensajes(prev => {
        if (prev.some(m => m.id === event.mensaje_id)) return prev;
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
        setTimeout(() => solicitudesService.marcarMensajesComoLeidos(ofertaId), 1000);
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
        setAttachment({ uri: asset.uri, type: 'image', name: asset.fileName || `image_${Date.now()}.jpg` });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleEnviarMensaje = async () => {
    if ((!nuevoMensaje.trim() && !attachment) || !ofertaId || enviando) return;
    const mensajeTexto = nuevoMensaje.trim();
    const mensajeId = `temp-${Date.now()}`;
    const attachmentTemp = attachment;

    const mensajeOptimista: MensajeChat = {
      id: mensajeId, oferta: ofertaId, mensaje: mensajeTexto,
      enviado_por: usuario?.id || 0, enviado_por_nombre: usuario?.first_name || 'Tú',
      es_proveedor: true, fecha_envio: new Date().toISOString(),
      leido: false, fecha_lectura: null,
      archivo_adjunto: attachmentTemp ? attachmentTemp.uri : null,
      solicitud_detail: mensajes[0]?.solicitud_detail || null,
    };

    setMensajes(prev => [...prev, mensajeOptimista]);
    setNuevoMensaje('');
    setAttachment(null);
    setEnviando(true);

    try {
      const result = await solicitudesService.enviarMensajeChat(ofertaId, mensajeTexto, attachmentTemp);
      if (result.success && result.data) {
        mensajesEnviadosRef.current.add(result.data.id);
        setMensajes(prev => prev.map(m => m.id === mensajeId ? result.data! : m));
        setTimeout(() => mensajesEnviadosRef.current.delete(result.data!.id), 10000);
      } else {
        setMensajes(prev => prev.filter(m => m.id !== mensajeId));
        setNuevoMensaje(mensajeTexto);
        setAttachment(attachmentTemp);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    } catch {
      setMensajes(prev => prev.filter(m => m.id !== mensajeId));
      setNuevoMensaje(mensajeTexto);
      setAttachment(attachmentTemp);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }: { item: MensajeChat }) => (
    <ChatBubble mensaje={item} esPropio={item.es_proveedor === true} onImagePress={setSelectedImage} />
  );

  const clienteNombre = oferta?.solicitud_detail?.cliente_nombre || 'Cliente';
  const clienteFoto = oferta?.solicitud_detail?.cliente_foto;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.centeredText}>Cargando chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Glass Header */}
      <BlurView intensity={50} tint="light" style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {clienteFoto ? (
            <Image source={{ uri: clienteFoto }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <User size={16} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{clienteNombre}</Text>
        </View>
        <View style={{ width: 36 }} />
      </BlurView>

      <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.15, 1]} style={styles.chatArea}>
        {mensajes.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            renderItem={renderMensaje}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messagesList, { paddingBottom: 80 }]}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          />
        ) : (
          <View style={styles.centeredState}>
            <View style={styles.emptyIconWrap}>
              <MessageCircle size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Sin mensajes</Text>
            <Text style={styles.centeredText}>Comienza la conversación enviando un mensaje</Text>
          </View>
        )}

        {/* Glass Input Bar */}
        <BlurView intensity={60} tint="light" style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom || 8, keyboardHeight > 0 ? 8 : insets.bottom || 8), bottom: keyboardHeight }
        ]}>
          {attachment && (
            <View style={styles.attachPreview}>
              <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
              <TouchableOpacity style={styles.attachRemove} onPress={() => setAttachment(null)}>
                <X size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachment}>
              <ImageIcon size={22} color="#6B7280" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9CA3AF"
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
              multiline
              maxLength={500}
              editable={!enviando}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!nuevoMensaje.trim() && !attachment || enviando) && styles.sendBtnDisabled]}
              onPress={handleEnviarMensaje}
              disabled={(!nuevoMensaje.trim() && !attachment) || enviando}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </LinearGradient>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 8,
    paddingTop: 12,
    flexGrow: 1,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  centeredText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },

  // Input bar
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1F2937',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  attachRemove: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});
