import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import chatService from '@/services/chatService';
import { OmnichannelChatHeader, OmnichannelChatActionBar } from '@/components/chats/OmnichannelChatHeader';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { CotizacionCanalBubble } from '@/components/chats/CotizacionCanalBubble';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import type { CanalSlug } from '@/services/omnichannelService';
import { useOmnichannelConversationMeta } from '@/hooks/useOmnichannelConversationMeta';
import { useOmnichannelConnectionMap } from '@/hooks/useOmnichannelConnections';
import { getChannelDisconnectedReason } from '@/utils/omnichannelConnection';
import { getWhatsAppReplyBlockReason } from '@/utils/whatsappMessagingWindow';
import { OmnichannelChatRestrictionBanner } from '@/components/chats/OmnichannelChatRestrictionBanner';
import {
  ChatMessageComposer,
} from '@/components/chats/ChatMessageComposer';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { hostScreenStyles } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  isChatAttachmentImage,
  normalizeChatMessage,
  normalizeMessageText,
} from '@/utils/chatAttachmentMedia';
import { AttachmentStagingTray, type StagedAttachment } from '@/components/chats/AttachmentStagingTray';
import { AudioRecorderBar } from '@/components/chats/AudioRecorderBar';

const I = COLORS.institutional;

type AttachmentState = StagedAttachment & { mime: string };

type ChatRow = {
  id: string;
  mensaje: string;
  es_proveedor: boolean;
  fecha_envio: string;
  enviado_por_nombre: string;
  archivo_adjunto: string | null;
  attachment_mime?: string | null;
  attachment_name?: string | null;
  channel_metadata?: Record<string, unknown>;
};

function resolveConversationId(params: Record<string, string | string[] | undefined>): string {
  const raw = params.conversationId;
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

function extractSendMessageError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (typeof data?.error === 'string' && data.error.length > 0 && !data.error.includes('_')) {
      return data.error;
    }
  }
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string; error?: string };
      if (parsed.message) return parsed.message;
    } catch {
      if (!error.message.startsWith('{')) return error.message;
    }
  }
  return 'No se pudo enviar el mensaje.';
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
  const [agendarVisible, setAgendarVisible] = useState(false);
  const [cotizacionAceptadaId, setCotizacionAceptadaId] = useState<number | undefined>();
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const conversationMeta = useOmnichannelConversationMeta(convId);
  const { map: channelConnections, featureEnabled } = useOmnichannelConnectionMap(Boolean(convId));

  const channelSlug = conversationMeta.channel as CanalSlug;
  const channelDisconnectedReason = useMemo(
    () => (conversationMeta.hasKnownChannel
      ? getChannelDisconnectedReason(
          channelConnections[channelSlug],
          channelSlug,
          featureEnabled,
        )
      : null),
    [channelConnections, channelSlug, conversationMeta.hasKnownChannel, featureEnabled],
  );

  const whatsappWindowBlockReason = useMemo(() => {
    if (channelSlug !== 'whatsapp' || channelDisconnectedReason) return null;
    return getWhatsAppReplyBlockReason(mensajes);
  }, [channelDisconnectedReason, channelSlug, mensajes]);

  const canSendMessages = !channelDisconnectedReason && !whatsappWindowBlockReason;
  const inputRestrictionMessage = channelDisconnectedReason || whatsappWindowBlockReason;

  const flatListRef = useRef<FlatList>(null);

  const mapApiMessage = useCallback((row: Record<string, unknown>): ChatRow => {
    const direction = row.direction as string | undefined;
    const senderId = row.sender_id as number | null | undefined;
    const esPropio = direction === 'outbound' || (usuario?.id != null && senderId === usuario.id);
    const normalized = normalizeChatMessage(row);
    return {
      id: String(row.id),
      mensaje: normalizeMessageText(normalized.content ?? normalized.mensaje),
      es_proveedor: esPropio,
      fecha_envio: String(row.timestamp ?? new Date().toISOString()),
      enviado_por_nombre: String(row.sender_name ?? (esPropio ? 'Tú' : conversationMeta.contactName)),
      archivo_adjunto: normalized.archivo_adjunto,
      attachment_mime: normalized.attachment_mime as string | null | undefined,
      attachment_name: normalized.attachment_name as string | null | undefined,
      channel_metadata: (row.channel_metadata as Record<string, unknown>) ?? undefined,
    };
  }, [conversationMeta.contactName, usuario?.id]);

  const mapWsEvent = useCallback((event: NuevoMensajeChatEvent | Record<string, unknown>): ChatRow => {
    const raw = event as Record<string, unknown>;
    const esPropio = Boolean(raw.es_proveedor);
    const normalized = normalizeChatMessage(raw);
    return {
      id: String(raw.mensaje_id ?? raw.id ?? ''),
      mensaje: normalizeMessageText(raw.mensaje ?? raw.message ?? normalized.content),
      es_proveedor: esPropio,
      fecha_envio: String(raw.timestamp ?? new Date().toISOString()),
      enviado_por_nombre: String(raw.enviado_por ?? (esPropio ? 'Tú' : conversationMeta.contactName)),
      archivo_adjunto: normalized.archivo_adjunto,
      attachment_mime: normalized.attachment_mime as string | null | undefined,
      attachment_name: normalized.attachment_name as string | null | undefined,
      channel_metadata: (raw.channel_metadata as Record<string, unknown>) ?? undefined,
    };
  }, [conversationMeta.contactName]);

  const cargar = useCallback(async () => {
    if (!convId) return;
    try {
      setLoading(true);
      const rows = await chatService.getMessages(convId);
      const mapped = (rows as Record<string, unknown>[]).map(mapApiMessage);
      setMensajes(mapped);
      await chatService.markRead(convId);
      try {
        const cotizaciones = await cotizacionCanalService.listarPorConversacion(parseInt(convId, 10));
        const aceptada = cotizaciones.find((c) => c.estado === 'aceptada');
        setCotizacionAceptadaId(aceptada?.id);
      } catch {
        setCotizacionAceptadaId(undefined);
      }
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
      const msg = mapWsEvent(event);
      setMensajes((prev) => mergeChatRow(prev, msg));
    });
    return unsub;
  }, [convId, mapWsEvent]);

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para enviar fotos o videos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        allowsEditing: false,
        quality: 0.8,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (!result.canceled && result.assets?.length) {
        const mapped = result.assets.map((asset) => {
          const isVideo = asset.type === 'video';
          return {
            uri: asset.uri,
            type: isVideo ? 'video' as const : 'image' as const,
            name: asset.fileName || `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
            mime: isVideo ? 'video/mp4' : 'image/jpeg',
          };
        });
        setAttachments((prev) => [...prev, ...mapped].slice(0, 10));
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
        setAttachments((prev) => [
          ...prev,
          {
            uri: asset.uri,
            type: 'audio' as const,
            name: asset.name || `audio_${Date.now()}.m4a`,
            mime: asset.mimeType || 'audio/m4a',
          },
        ].slice(0, 10));
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

  const enviar = async (audioAttachment?: AttachmentState) => {
    const trimmed = texto.trim();
    const queue = audioAttachment ? [audioAttachment] : [...attachments];
    if ((!trimmed && queue.length === 0) || !convId || !canSendMessages) return;
    setEnviando(true);
    setTexto('');
    const queueSnapshot = [...queue];
    if (!audioAttachment) setAttachments([]);
    Keyboard.dismiss();

    const payloads = queueSnapshot.length
      ? queueSnapshot.map((att, index) => ({
          attachment: att,
          content: index === queueSnapshot.length - 1 ? trimmed : '',
        }))
      : [{ attachment: null as AttachmentState | null, content: trimmed }];

    const tempIds = payloads.map((_, i) => `temp-${Date.now()}-${i}`);
    setMensajes((prev) => [
      ...prev,
      ...payloads.map((p, i) => ({
        id: tempIds[i],
        mensaje: typeof p.content === 'string' ? p.content : '',
        es_proveedor: true,
        fecha_envio: new Date().toISOString(),
        enviado_por_nombre: 'Tú',
        archivo_adjunto: p.attachment?.uri ?? null,
        attachment_mime: p.attachment?.mime || p.attachment?.mimeType || null,
        attachment_name: p.attachment?.name || null,
      })),
    ]);

    try {
      for (let i = 0; i < payloads.length; i += 1) {
        const sent = await chatService.sendMessageHTTP(
          convId,
          {
            content: payloads[i].content,
            attachment: payloads[i].attachment
              ? {
                  uri: payloads[i].attachment!.uri,
                  name: payloads[i].attachment!.name,
                  type: payloads[i].attachment!.mime,
                }
              : null,
          },
          Boolean(payloads[i].attachment),
        );
        const mapped = mapApiMessage(sent as Record<string, unknown>);
        setMensajes((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempIds[i]);
          return mergeChatRow(withoutTemp, mapped);
        });
      }
    } catch (error) {
      Alert.alert('No se puede enviar', extractSendMessageError(error));
      setMensajes((prev) => prev.filter((m) => !tempIds.includes(m.id)));
      setTexto(trimmed);
      if (!audioAttachment) setAttachments(queueSnapshot);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <OmnichannelChatHeader
          channel={conversationMeta.channel}
          displayName={conversationMeta.displayName}
          hasKnownChannel={conversationMeta.hasKnownChannel}
          isMetaPending={conversationMeta.isMetaPending}
          paddingTop={insets.top + SPACING.sm}
          onBack={() => router.back()}
        />

        <OmnichannelChatActionBar
          cotizacionAceptada={Boolean(cotizacionAceptadaId)}
          onPress={() => setAgendarVisible(true)}
        />

        <AgendarDesdeCanalModal
          visible={agendarVisible}
          onClose={() => setAgendarVisible(false)}
          channel={conversationMeta.channel || undefined}
          contactName={conversationMeta.nombreAgendable}
          contactPhone={conversationMeta.contactPhone}
          conversationId={convId}
          cotizacionAceptadaId={cotizacionAceptadaId}
          channelDisconnectedReason={channelDisconnectedReason}
          onCotizacionEnviada={() => {
            void cargar();
          }}
        />

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
              contentContainerStyle={[
                hostScreenStyles.scrollInner,
                styles.listContent,
                { paddingBottom: 88 },
              ]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const meta = item.channel_metadata;
                if (meta?.tipo === 'cotizacion_canal') {
                  const repuestosRaw = meta.repuestos;
                  const repuestos = Array.isArray(repuestosRaw)
                    ? repuestosRaw.map((r) => {
                        const row = r as Record<string, unknown>;
                        return {
                          nombre: String(row.nombre || 'Repuesto'),
                          cantidad: Number(row.cantidad || 1),
                          precio_unitario_clp: Number(row.precio_unitario_clp || 0),
                        };
                      })
                    : [];
                  const advertenciasRaw = meta.advertencias;
                  const advertencias = Array.isArray(advertenciasRaw)
                    ? advertenciasRaw.map((a) => String(a))
                    : [];
                  return (
                    <View style={item.es_proveedor ? styles.bubbleWrapOwn : styles.bubbleWrapOther}>
                      <CotizacionCanalBubble
                        servicioNombre={String(meta.servicio_nombre || 'Servicio')}
                        totalClp={Number(meta.total_clp || 0)}
                        manoObraClp={Number(meta.mano_obra_clp || 0)}
                        costoRepuestosClp={Number(meta.costo_repuestos_clp || 0)}
                        estado={String(meta.estado || 'enviada')}
                        esPropio={item.es_proveedor}
                        vehiculoMarca={String(meta.vehiculo_marca || '')}
                        vehiculoModelo={String(meta.vehiculo_modelo || '')}
                        vehiculoAnio={meta.vehiculo_anio as number | string | null | undefined}
                        vehiculoCilindraje={String(meta.vehiculo_cilindraje || '')}
                        vehiculoPatente={String(meta.vehiculo_patente || '')}
                        tipoMotorLabel={String(meta.tipo_motor_label || '')}
                        modalidad={String(meta.modalidad || 'taller')}
                        descripcionProblema={String(meta.descripcion_problema || '')}
                        duracionMinutos={
                          meta.duracion_minutos_estimada != null
                            ? Number(meta.duracion_minutos_estimada)
                            : null
                        }
                        repuestos={repuestos}
                        advertencias={advertencias}
                        fallbackDetalle={item.mensaje}
                      />
                    </View>
                  );
                }
                return (
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
                );
              }}
            />
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyHint}>Comienza la conversación enviando un mensaje</Text>
            </View>
          )}

          {inputRestrictionMessage ? (
            <OmnichannelChatRestrictionBanner
              message={inputRestrictionMessage}
              actionLabel={channelDisconnectedReason ? 'Conectar' : undefined}
              onActionPress={
                channelDisconnectedReason
                  ? () => router.push('/configuracion-canales' as never)
                  : undefined
              }
              variant="strip"
            />
          ) : null}

          <ChatMessageComposer
            value={texto}
            onChangeText={setTexto}
            onSend={() => enviar()}
            onAttachPress={handleAttachPress}
            editable={canSendMessages}
            sending={enviando}
            hasAttachment={attachments.length > 0}
            paddingBottom={Math.max(insets.bottom, SPACING.sm)}
            stripAttached={Boolean(inputRestrictionMessage)}
            voiceSlot={
              <AudioRecorderBar
                disabled={enviando || !canSendMessages}
                onRecorded={(att) => enviar({ ...att, mime: att.mime || 'audio/m4a' })}
              />
            }
            attachmentPreview={
              attachments.length > 0 ? (
                <AttachmentStagingTray
                  attachments={attachments}
                  onRemove={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                />
              ) : null
            }
          />
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
  chatArea: { flex: 1 },
  listContent: { paddingVertical: SPACING.md, flexGrow: 1 },
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
  cotizacionAceptadaBanner: {
    backgroundColor: I.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: BORDERS.radius.md,
  },
  cotizacionAceptadaText: {
    ...TYPOGRAPHY.styles.body,
    color: I.onPrimary,
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  bubbleWrapOwn: {
    alignSelf: 'flex-end',
    marginVertical: SPACING.xs,
  },
  bubbleWrapOther: {
    alignSelf: 'flex-start',
    marginVertical: SPACING.xs,
  },
});
