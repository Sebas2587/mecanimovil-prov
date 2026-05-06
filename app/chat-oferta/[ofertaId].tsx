import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Keyboard,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, User, Send, X, MessageCircle,
} from 'lucide-react-native';
import solicitudesService, { type MensajeChat, type OfertaProveedor } from '@/services/solicitudesService';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import * as ImagePicker from 'expo-image-picker';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDERS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { formatVehiculoPillLabel } from '@/utils/formatVehiculoPillLabel';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

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
  const vehiculoPillText = useMemo(
    () => formatVehiculoPillLabel(oferta?.solicitud_detail?.vehiculo ?? null),
    [oferta],
  );

  if (loading) {
    return (
      <View style={styles.screenRoot}>
        <LinearGradient
          colors={BLANK_GLASS.gradient}
          locations={BLANK_GLASS.gradientLocations}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <Text style={styles.headerTitleCentered}>Chat</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingHint}>Cargando chat…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <LinearGradient
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerNameRow}>
            {clienteFoto ? (
              <Image source={{ uri: clienteFoto }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <User size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {clienteNombre}
            </Text>
          </View>
          {!!vehiculoPillText && (
            <View style={styles.vehiclePill}>
              <Text style={styles.vehiclePillText} numberOfLines={1}>
                {vehiculoPillText}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.chatArea}>
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
              <MessageCircle size={40} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.emptyTitle}>Sin mensajes</Text>
            <Text style={styles.centeredTextMuted}>Comienza la conversación enviando un mensaje</Text>
          </View>
        )}

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: Math.max(insets.bottom || SPACING.sm, keyboardHeight > 0 ? SPACING.sm : insets.bottom || SPACING.sm),
              bottom: keyboardHeight,
            },
          ]}
        >
          {attachment && (
            <View style={styles.attachPreview}>
              <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
              <TouchableOpacity style={styles.attachRemove} onPress={() => setAttachment(null)}>
                <X size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachment} accessibilityLabel="Adjuntar imagen">
              <InstitutionalIcon name="image" size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={I.muted}
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
                <ActivityIndicator size="small" color={I.onPrimary} />
              ) : (
                <Send size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
            <X size={28} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GLASS_INSET,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    ...SHADOWS.editorial,
  },
  backBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'flex-start',
  },
  headerSpacer: {
    width: 36,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm + 2,
    width: '100%',
  },
  vehiclePill: {
    marginTop: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    maxWidth: '92%',
  },
  vehiclePillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
    textAlign: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'left',
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h4.fontWeight as '600',
    lineHeight: Math.round(T.h4.fontSize * T.h4.lineHeight),
    color: I.ink,
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: 'center',
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h4.fontWeight as '600',
    lineHeight: Math.round(T.h4.fontSize * T.h4.lineHeight),
    color: I.ink,
  },
  chatArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesList: {
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.sm + 4,
    flexGrow: 1,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  centeredText: {
    marginTop: SPACING.sm,
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    color: I.body,
    textAlign: 'center',
  },
  centeredTextMuted: {
    marginTop: SPACING.sm,
    fontSize: T.small.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.small.fontWeight as '400',
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
    color: I.muted,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  loadingHint: {
    marginTop: SPACING.sm,
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    color: I.muted,
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm + 4,
  },
  emptyTitle: {
    fontSize: T.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h3.fontWeight as '600',
    lineHeight: Math.round(T.h3.fontSize * T.h3.lineHeight),
    color: I.ink,
    marginBottom: SPACING.xs,
  },

  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.sm + 2,
    backgroundColor: I.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    ...SHADOWS.editorial,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  attachBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    maxHeight: 120,
    color: I.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: I.primaryDisabled,
    opacity: 0.85,
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  attachThumb: {
    width: 60,
    height: 60,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  attachRemove: {
    marginLeft: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBg: {
    flex: 1,
    backgroundColor: withOpacity(I.surfaceDark, 0.94),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 56,
    right: GLASS_INSET,
    zIndex: 1,
    padding: SPACING.sm,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});
