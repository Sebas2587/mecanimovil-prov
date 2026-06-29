import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Link2, X, Paperclip } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import chatService from '@/services/chatService';
import omnichannelService from '@/services/omnichannelService';
import { ChannelBadge, channelRespondLabel } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import { BLANK_GLASS } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { isChatAttachmentImage } from '@/utils/chatAttachmentMedia';

const I = COLORS.institutional;
const GLASS_INSET = SPACING.md;

type AttachmentState = {
  uri: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  mime: string;
};

type ChatRow = {
  id: string;
  mensaje: string;
  es_proveedor: boolean;
  fecha_envio: string;
  enviado_por_nombre: string;
  archivo_adjunto: string | null;
};

function resolveConversationId(params: Record<string, string | string[] | undefined>): string {
  const raw = params.conversationId;
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

function mergeChatRow(prev: ChatRow[], row: ChatRow): ChatRow[] {
  const idx = prev.findIndex((m) => m.id === row.id);
  if (idx >= 0) {
    return prev.map((m, i) => (i === idx ? { ...m, ...row } : m));
  }
  return [...prev, row];
}

export default function ChatOmnicanalScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const convId = resolveConversationId(params);

  const [mensajes, setMensajes] = useState<ChatRow[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [channel, setChannel] = useState('whatsapp');
  const [contactName, setContactName] = useState('Contacto');
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [vincularVisible, setVincularVisible] = useState(false);
  const [solicitudIdInput, setSolicitudIdInput] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [solicitudVinculada, setSolicitudVinculada] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const mapApiMessage = useCallback((row: Record<string, unknown>): ChatRow => {
    const direction = row.direction as string | undefined;
    const senderId = row.sender_id as number | null | undefined;
    const esPropio = direction === 'outbound' || (usuario?.id != null && senderId === usuario.id);
    const adjunto = (row.attachment ?? row.archivo_adjunto ?? null) as string | null;
    return {
      id: String(row.id),
      mensaje: String(row.content ?? row.mensaje ?? ''),
      es_proveedor: esPropio,
      fecha_envio: String(row.timestamp ?? new Date().toISOString()),
      enviado_por_nombre: String(row.sender_name ?? (esPropio ? 'Tú' : contactName)),
      archivo_adjunto: adjunto,
    };
  }, [contactName, usuario?.id]);

  const mapWsEvent = useCallback((event: NuevoMensajeChatEvent | Record<string, unknown>): ChatRow => {
    const raw = event as Record<string, unknown>;
    const esPropio = Boolean(raw.es_proveedor);
    return {
      id: String(raw.mensaje_id ?? raw.id ?? ''),
      mensaje: String(raw.mensaje ?? raw.message ?? raw.content ?? ''),
      es_proveedor: esPropio,
      fecha_envio: String(raw.timestamp ?? new Date().toISOString()),
      enviado_por_nombre: String(raw.enviado_por ?? (esPropio ? 'Tú' : contactName)),
      archivo_adjunto: (raw.archivo_adjunto ?? raw.attachment ?? null) as string | null,
    };
  }, [contactName]);

  const cargar = useCallback(async () => {
    if (!convId) return;
    try {
      setLoading(true);
      const rows = await chatService.getMessages(convId);
      const mapped = (rows as Record<string, unknown>[]).map(mapApiMessage);
      setMensajes(mapped);
      await chatService.markRead(convId);
    } catch (e) {
      console.error('[chat-omnicanal]', e);
      Alert.alert('Error', 'No se pudo cargar la conversación.');
    } finally {
      setLoading(false);
    }
  }, [convId, mapApiMessage]);

  useFocusEffect(
    useCallback(() => {
      if (!convId) {
        Alert.alert('Conversación no encontrada', 'Vuelve al listado de chats e intenta de nuevo.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      cargar();
    }, [cargar, convId]),
  );

  useEffect(() => {
    if (!convId) return;
    chatService.connect(convId, (data) => {
      const raw = data as Record<string, unknown>;
      if (String(raw.conversation_id) !== convId) return;
      const msg = mapWsEvent(raw);
      setMensajes((prev) => mergeChatRow(prev, msg));
    });
    return () => chatService.disconnect();
  }, [convId, mapWsEvent]);

  useEffect(() => {
    const unsub = websocketService.onNuevoMensajeChat((event: NuevoMensajeChatEvent) => {
      if (event.conversation_id !== convId) return;
      if (event.channel) setChannel(event.channel);
      if (event.external_contact_name) setContactName(event.external_contact_name);
      if (event.external_contact_phone) setContactPhone(event.external_contact_phone);
      const msg = mapWsEvent(event);
      setMensajes((prev) => mergeChatRow(prev, msg));
    });
    return unsub;
  }, [convId, mapWsEvent]);

  useEffect(() => {
    omnichannelService.obtenerInboxUnificado().then((items) => {
      const item = items.find((i) => i.conversation_id === convId);
      if (item) {
        setChannel(item.channel);
        setContactName(item.otra_persona.nombre);
        setContactPhone(item.otra_persona.telefono ?? null);
        if (item.solicitud_id) setSolicitudVinculada(item.solicitud_id);
      }
    }).catch(() => {});
  }, [convId]);

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para enviar fotos o videos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        setAttachment({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          name: asset.fileName || `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          mime: isVideo ? 'video/mp4' : 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setAttachment({
          uri: asset.uri,
          type: 'audio',
          name: asset.name || `audio_${Date.now()}.m4a`,
          mime: asset.mimeType || 'audio/m4a',
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el audio.');
    }
  };

  const handleAttachPress = () => {
    if (Platform.OS === 'web') {
      handlePickMedia();
      return;
    }
    Alert.alert('Adjuntar', 'Selecciona el tipo de archivo', [
      { text: 'Foto o video', onPress: handlePickMedia },
      { text: 'Audio', onPress: handlePickAudio },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const enviar = async () => {
    const trimmed = texto.trim();
    if ((!trimmed && !attachment) || !convId) return;
    setEnviando(true);
    setTexto('');
    const attachmentTemp = attachment;
    setAttachment(null);
    Keyboard.dismiss();
    const tempId = `temp-${Date.now()}`;
    setMensajes((prev) => [
      ...prev,
      {
        id: tempId,
        mensaje: trimmed,
        es_proveedor: true,
        fecha_envio: new Date().toISOString(),
        enviado_por_nombre: 'Tú',
        archivo_adjunto: attachmentTemp ? attachmentTemp.uri : null,
      },
    ]);
    try {
      const sent = await chatService.sendMessageHTTP(
        convId,
        {
          content: trimmed,
          attachment: attachmentTemp
            ? { uri: attachmentTemp.uri, name: attachmentTemp.name, type: attachmentTemp.mime }
            : null,
        },
        Boolean(attachmentTemp),
      );
      const mapped = mapApiMessage(sent as Record<string, unknown>);
      setMensajes((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return mergeChatRow(withoutTemp, mapped);
      });
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
      setMensajes((prev) => prev.filter((m) => m.id !== tempId));
      setTexto(trimmed);
      setAttachment(attachmentTemp);
    } finally {
      setEnviando(false);
    }
  };

  const vincularSolicitud = async () => {
    const sid = solicitudIdInput.trim();
    if (!sid || !convId) return;
    setVinculando(true);
    try {
      await omnichannelService.vincularSolicitud(convId, sid);
      setSolicitudVinculada(sid);
      setVincularVisible(false);
      setSolicitudIdInput('');
      Alert.alert('Listo', 'Conversación vinculada a la solicitud.');
    } catch {
      Alert.alert('Error', 'No se pudo vincular. Verifica el ID de solicitud.');
    } finally {
      setVinculando(false);
    }
  };

  const displayName =
    contactName.length > 28 && /^\d+$/.test(contactName.replace(/\s/g, ''))
      ? `Cliente ${contactName.slice(-6)}`
      : contactName;

  const banner = `Respondiendo por ${channelRespondLabel(channel)} · ${displayName}${
    contactPhone ? ` (${contactPhone})` : ''
  }`;

  return (
    <View style={styles.screenRoot}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerNameRow}>
              <ChannelAvatar channel={channel} size={34} />
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {displayName}
              </Text>
            </View>
            <ChannelBadge channel={channel} compact />
          </View>
          <TouchableOpacity onPress={() => setVincularVisible(true)} style={styles.linkBtn}>
            <Link2 size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={2}>{banner}</Text>
          {solicitudVinculada ? (
            <Text style={styles.bannerLinked}>Vinculada a solicitud {solicitudVinculada}</Text>
          ) : null}
        </View>

        <Modal visible={vincularVisible} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Vincular a solicitud</Text>
              <Text style={styles.modalHint}>Pega el ID de una solicitud activa de tu taller.</Text>
              <TextInput
                style={styles.modalInput}
                value={solicitudIdInput}
                onChangeText={setSolicitudIdInput}
                placeholder="UUID solicitud"
                placeholderTextColor={I.mutedSoft}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setVincularVisible(false)} style={styles.modalCancel}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={vincularSolicitud} style={styles.modalConfirm} disabled={vinculando}>
                  {vinculando ? (
                    <ActivityIndicator color={I.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Vincular</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={styles.chatArea}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={I.primary} />
            </View>
          ) : mensajes.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={mensajes}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[styles.listContent, { paddingBottom: 88 }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => (
                <ChatBubble
                  mensaje={{
                    id: item.id,
                    oferta: convId,
                    mensaje: item.mensaje,
                    enviado_por: 0,
                    enviado_por_nombre: item.enviado_por_nombre,
                    es_proveedor: item.es_proveedor,
                    fecha_envio: item.fecha_envio,
                    leido: true,
                    fecha_lectura: null,
                    archivo_adjunto: item.archivo_adjunto,
                  }}
                  esPropio={item.es_proveedor}
                  onImagePress={(url) => setSelectedImage(url)}
                />
              )}
            />
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyHint}>Comienza la conversación enviando un mensaje</Text>
            </View>
          )}

          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
            {attachment && (
              <View style={styles.attachPreview}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
                ) : (
                  <Text style={styles.attachLabel}>
                    {attachment.type === 'video' ? 'Video' : 'Audio'} · {attachment.name}
                  </Text>
                )}
                <TouchableOpacity style={styles.attachRemove} onPress={() => setAttachment(null)}>
                  <X size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={handleAttachPress} accessibilityLabel="Adjuntar">
                <Paperclip size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe un mensaje…"
                placeholderTextColor={I.mutedSoft}
                multiline
                maxLength={500}
                editable={!enviando}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={Platform.OS !== 'web' ? enviar : undefined}
                onKeyPress={
                  Platform.OS === 'web'
                    ? (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
                        if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                          e.preventDefault?.();
                          enviar();
                        }
                      }
                    : undefined
                }
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!texto.trim() && !attachment || enviando) && styles.sendBtnDisabled]}
                onPress={enviar}
                disabled={(!texto.trim() && !attachment) || enviando}
              >
                {enviando ? (
                  <ActivityIndicator color={I.onPrimary} size="small" />
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
            {selectedImage && isChatAttachmentImage(selectedImage) && (
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyHint: {
    ...TYPOGRAPHY.styles.body,
    color: I.muted,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GLASS_INSET,
    paddingBottom: SPACING.sm,
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
  headerCenter: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: SPACING.sm,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    minWidth: 0,
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: I.ink,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  linkBtn: {
    padding: SPACING.xs,
    minWidth: 36,
    alignItems: 'center',
  },
  banner: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: GLASS_INSET,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  bannerText: { ...TYPOGRAPHY.styles.caption, color: I.body },
  bannerLinked: { ...TYPOGRAPHY.styles.caption, color: I.primary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  modalTitle: { ...TYPOGRAPHY.styles.h3, color: I.ink, fontWeight: '600' },
  modalHint: { ...TYPOGRAPHY.styles.caption, color: I.muted, marginVertical: SPACING.sm },
  modalInput: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    color: I.ink,
    marginBottom: SPACING.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  modalCancel: { padding: SPACING.sm },
  modalCancelText: { ...TYPOGRAPHY.styles.button, color: I.muted },
  modalConfirm: {
    backgroundColor: I.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.md,
  },
  modalConfirmText: { ...TYPOGRAPHY.styles.button, color: I.onPrimary },
  chatArea: { flex: 1 },
  listContent: { padding: SPACING.md, flexGrow: 1 },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: I.canvas,
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.sm,
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  attachThumb: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  attachLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: I.body,
    flex: 1,
  },
  attachRemove: {
    padding: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...TYPOGRAPHY.styles.body,
    color: I.ink,
    maxHeight: 100,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 2,
    padding: SPACING.sm,
  },
  modalImage: {
    width: '92%',
    height: '70%',
  },
});
