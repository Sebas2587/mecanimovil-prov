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
import { X, Edit3, Send, Paperclip, Mic, MoreHorizontal, Check, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import chatService from '@/services/chatService';
import { OmnichannelChatHeader, OmnichannelChatActionBar } from '@/components/chats/OmnichannelChatHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import omnichannelService from '@/services/omnichannelService';
import proveedorRepuestosService from '@/services/proveedorRepuestosService';
import { showConfirm } from '@/utils/platformAlert';
import { useInvalidateChatInbox } from '@/hooks/useChatInboxQuery';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { CotizacionCanalBubble } from '@/components/chats/CotizacionCanalBubble';
import cotizacionCanalService, {
  cotizacionEsActualizacion,
  cotizacionPermiteEdicionCompleta,
  cotizacionPermiteEnviar,
  payloadEdicionCotizacion,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import type { CanalSlug } from '@/services/omnichannelService';
import { useOmnichannelConversationMeta } from '@/hooks/useOmnichannelConversationMeta';
import { useOmnichannelConnectionMap } from '@/hooks/useOmnichannelConnections';
import {
  mergeChatThreadRow,
  useChatMessagesQuery,
  useChatThreadCache,
  type ChatThreadRow,
} from '@/hooks/useChatMessagesQuery';
import { getChannelDisconnectedReason } from '@/utils/omnichannelConnection';
import { getMetaReplyBlockReason } from '@/utils/whatsappMessagingWindow';
import { OmnichannelChatRestrictionBanner } from '@/components/chats/OmnichannelChatRestrictionBanner';
import { AgenteIaChatBanner } from '@/components/chats/AgenteIaChatBanner';
import { useCasoCotizacionAcciones } from '@/components/chats/CasoCotizacionChatBar';
import { CotizacionEditorFab } from '@/components/cotizacion/CotizacionEditorFab';
import { AgenteIaChatToggleModal } from '@/components/chats/AgenteIaChatToggleModal';
import {
  ChatMessageComposer,
} from '@/components/chats/ChatMessageComposer';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { hostScreenStyles, HOST_GUTTER } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  normalizeChatMessage,
  normalizeMessageText,
} from '@/utils/chatAttachmentMedia';
import { AttachmentStagingTray, type StagedAttachment } from '@/components/chats/AttachmentStagingTray';
import { CotizacionIaEditor, type CotizacionIaEditorHandle } from '@/components/chats/CotizacionIaEditor';
import { VistaPreviaCotizacionClienteModal } from '@/components/chats/VistaPreviaCotizacionClienteModal';
import { InstitutionalButton, InstitutionalText, Card, HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalModal } from '@/design-system/components/InstitutionalModal';
import { showAlert } from '@/utils/platformAlert';
import { cuerpoEnvioExitoso, requiereEntregaManual, tituloEnvioExitoso } from '@/utils/entregaCotizacionCopy';
import { ofrecerEntregaCotizacionEnviada } from '@/utils/ofrecerEntregaCotizacion';

const I = COLORS.institutional;
const K = COLORS.kanban;
const STACK_OPTIONS = { headerShown: false } as const;

type AttachmentState = StagedAttachment & { mime: string };

type ChatRow = ChatThreadRow;

function resolveConversationId(params: Record<string, string | string[] | undefined>): string {
  const raw = params.conversationId || params.conversation_id || params.conversation || params.id;
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


export default function ChatOmnicanalScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const convId = resolveConversationId(params);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [agendarVisible, setAgendarVisible] = useState(false);
  const [cotizarVisible, setCotizarVisible] = useState(false);
  const [agenteIaVisible, setAgenteIaVisible] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingCotizacion, setEditingCotizacion] = useState<CotizacionCanal | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewEnviando, setPreviewEnviando] = useState(false);
  const [tipoPreview, setTipoPreview] = useState<'estimacion' | 'cotizacion'>('cotizacion');
  const tipoEnvioRef = useRef<'estimacion' | 'cotizacion'>('cotizacion');
  const editorRef = useRef<CotizacionIaEditorHandle>(null);

  const conversationMeta = useOmnichannelConversationMeta(convId);
  const invalidateChatInbox = useInvalidateChatInbox();
  const aceptarSoloConsulta = useCallback(async () => {
    if (!conversationMeta.contactId) return;
    try {
      await omnichannelService.fijarRolContacto(conversationMeta.contactId, 'solo_consulta');
      invalidateChatInbox();
    } catch {
      Alert.alert('No se pudo marcar', 'Intenta de nuevo.');
    }
  }, [conversationMeta.contactId, invalidateChatInbox]);
  const marcarOtro = useCallback(async () => {
    if (!conversationMeta.contactId) return;
    try {
      await omnichannelService.fijarRolContacto(conversationMeta.contactId, 'otro');
      invalidateChatInbox();
    } catch {
      Alert.alert('No se pudo marcar', 'Intenta de nuevo.');
    }
  }, [conversationMeta.contactId, invalidateChatInbox]);
  const marcarCasa = useCallback(async (confirmarRolCliente = false) => {
    const telefono = (conversationMeta.contactPhone || '').trim();
    if (!telefono) {
      Alert.alert('Falta el teléfono', 'Sin número no se puede marcar este chat como casa de repuestos.');
      return;
    }
    const nombre = (conversationMeta.contactName || '').trim() || 'Casa de repuestos';
    try {
      await proveedorRepuestosService.crearProveedor(
        { nombre, telefono, tipo: 'mostrador' },
        { confirmarRolCliente },
      );
      invalidateChatInbox();
    } catch (error) {
      const respuesta = (error as { response?: { status?: number; data?: { detail?: unknown; telefono?: string[] } } })?.response;
      const cuerpo = respuesta?.data?.detail;
      const texto = cuerpo && typeof cuerpo === 'object' && 'detail' in cuerpo
        ? String((cuerpo as { detail?: string }).detail || '')
        : '';
      if (respuesta?.status === 409) {
        showConfirm(
          'Este número ya es cliente',
          texto || 'Confirma para marcarlo como casa de repuestos. El historial del chat se conserva.',
          {
            confirmText: 'Marcar como casa',
            onConfirm: () => { void marcarCasa(true); },
          },
        );
        return;
      }
      Alert.alert('No se pudo marcar', respuesta?.data?.telefono?.[0] || 'Intenta de nuevo.');
    }
  }, [conversationMeta.contactName, conversationMeta.contactPhone, invalidateChatInbox]);
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

  const threadQuery = useChatMessagesQuery(convId, mapApiMessage);
  const { upsertRow, replaceMensajes, refetchSilent } = useChatThreadCache(convId);
  const mensajes = threadQuery.data?.mensajes ?? [];
  const cotizacionAceptadaId = threadQuery.data?.cotizacionAceptadaId;
  const cotizacionEnviadaId = threadQuery.data?.cotizacionEnviadaId;
  const casoCotizacion = useCasoCotizacionAcciones({
    cotizacionId: cotizacionEnviadaId ?? 0,
    onCerrado: () => void refetchSilent(),
    onAceptada: () => void refetchSilent(),
  });
  const loading = threadQuery.isPending && mensajes.length === 0;

  const channelWindowBlockReason = useMemo(() => {
    if (channelDisconnectedReason) return null;
    return getMetaReplyBlockReason(channelSlug, mensajes);
  }, [channelDisconnectedReason, channelSlug, mensajes]);

  const canSendMessages = !channelDisconnectedReason && !channelWindowBlockReason;
  const inputRestrictionMessage = channelDisconnectedReason || channelWindowBlockReason;

  useFocusEffect(
    useCallback(() => {
      if (!convId) {
        Alert.alert('Conversación no encontrada', 'Vuelve al listado de chats e intenta de nuevo.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      void chatService.markRead(convId);
    }, [convId]),
  );

  useEffect(() => {
    if (threadQuery.isError) {
      Alert.alert('Error', 'No se pudo cargar la conversación.');
    }
  }, [threadQuery.isError]);

  useEffect(() => {
    if (!convId) return;
    chatService.connect(convId, (data) => {
      const raw = data as Record<string, unknown>;
      // Socket ya es por conversación; solo filtrar si viene conversation_id distinto.
      if (
        raw.conversation_id != null
        && String(raw.conversation_id) !== ''
        && String(raw.conversation_id) !== convId
      ) {
        return;
      }
      upsertRow(mapWsEvent(raw));
    });
    return () => chatService.disconnect();
  }, [convId, mapWsEvent, upsertRow]);

  useEffect(() => {
    const unsub = websocketService.onNuevoMensajeChat((event: NuevoMensajeChatEvent) => {
      if (String(event.conversation_id ?? '') !== String(convId)) return;
      upsertRow(mapWsEvent(event));
    });
    return unsub;
  }, [convId, mapWsEvent, upsertRow]);

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
    replaceMensajes((prev) => [
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
        replaceMensajes((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempIds[i]);
          return mergeChatThreadRow(withoutTemp, mapped);
        });
      }
    } catch (error) {
      Alert.alert('No se puede enviar', extractSendMessageError(error));
      replaceMensajes((prev) => prev.filter((m) => !tempIds.includes(m.id)));
      setTexto(trimmed);
      if (!audioAttachment) setAttachments(queueSnapshot);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={STACK_OPTIONS} />

        <OmnichannelChatHeader
          channel={conversationMeta.channel}
          displayName={conversationMeta.displayName}
          hasKnownChannel={conversationMeta.hasKnownChannel}
          isMetaPending={conversationMeta.isMetaPending}
          paddingTop={insets.top + SPACING.sm}
          onBack={() => router.back()}
          contactoRol={conversationMeta.contactoRol}
        />
        {conversationMeta.rolSugerido === 'casa_repuestos'
          && conversationMeta.contactoRol !== 'casa_repuestos' ? (
          <View style={styles.sugerenciaRol}>
            <Text style={styles.sugerenciaRolText}>
              Este mensaje parece de una casa de repuestos. Márcalo para que el agente no le cotice un servicio.
            </Text>
            <View style={styles.sugerenciaRolAcciones}>
              <InstitutionalButton
                label="Casa de repuestos"
                variant="outline"
                size="compact"
                onPress={() => { void marcarCasa(false); }}
              />
              <InstitutionalButton
                label="No es cliente"
                variant="outline"
                size="compact"
                onPress={() => { void marcarOtro(); }}
              />
            </View>
          </View>
        ) : conversationMeta.rolSugerido === 'solo_consulta'
          && conversationMeta.contactoRol !== 'solo_consulta'
          && conversationMeta.contactoRol !== 'casa_repuestos' ? (
          <View style={styles.sugerenciaRol}>
            <Text style={styles.sugerenciaRolText}>
              Este contacto pregunta y no concreta. El agente puede bajar la insistencia.
            </Text>
            <InstitutionalButton
              label="Marcar solo consulta"
              variant="outline"
              size="compact"
              onPress={() => { void aceptarSoloConsulta(); }}
            />
          </View>
        ) : (conversationMeta.contactoRol === '' || conversationMeta.contactoRol === 'sin_clasificar')
          && conversationMeta.contactId ? (
          <View style={styles.sugerenciaRol}>
            <Text style={styles.sugerenciaRolText}>
              Si este número no es un cliente, márcalo para que el agente no le venda un servicio.
            </Text>
            <View style={styles.sugerenciaRolAcciones}>
              <InstitutionalButton
                label="Casa de repuestos"
                variant="outline"
                size="compact"
                onPress={() => { void marcarCasa(false); }}
              />
              <InstitutionalButton
                label="No es cliente"
                variant="outline"
                size="compact"
                onPress={() => { void marcarOtro(); }}
              />
            </View>
          </View>
        ) : null}

        <AgendarDesdeCanalModal
          visible={agendarVisible}
          onClose={() => setAgendarVisible(false)}
          channel={conversationMeta.channel || undefined}
          contactName={conversationMeta.nombreAgendable}
          contactPhone={conversationMeta.contactPhone}
          conversationId={convId}
          cotizacionAceptadaId={cotizacionAceptadaId}
        />

        <CotizacionLibreModal
          visible={cotizarVisible}
          onClose={() => setCotizarVisible(false)}
          conversationId={convId}
          channel={conversationMeta.channel || undefined}
          contactName={conversationMeta.nombreAgendable}
          contactPhone={conversationMeta.contactPhone}
          channelDisconnectedReason={channelDisconnectedReason}
          channelWindowClosedReason={channelWindowBlockReason}
          onEnviada={() => {
            void refetchSilent();
          }}
        />

        <AgenteIaChatToggleModal
          visible={agenteIaVisible}
          onClose={() => setAgenteIaVisible(false)}
          conversationId={convId}
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
                { paddingBottom: SPACING.lg },
              ]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item, index }) => {
                const meta = item.channel_metadata;
                const isLast = index === mensajes.length - 1;
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
                  const manoObraLineasRaw = meta.mano_obra_lineas;
                  const manoObraLineas = Array.isArray(manoObraLineasRaw)
                    ? manoObraLineasRaw.map((lin) => {
                        const row = lin as Record<string, unknown>;
                        return {
                          nombre: String(row.nombre || 'Mano de obra'),
                          monto_clp: Number(row.monto_clp || 0),
                        };
                      })
                    : [];
                  return (
                    <View style={item.es_proveedor ? styles.bubbleWrapOwn : styles.bubbleWrapOther}>
                      <CotizacionCanalBubble
                        servicioNombre={String(meta.servicio_nombre || 'Servicio')}
                        totalClp={Number(meta.total_clp || 0)}
                        manoObraClp={Number(meta.mano_obra_clp || 0)}
                        manoObraLineas={manoObraLineas}
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
                        onVerDetalle={() => {
                          // Construir objeto CotizacionCanal completo desde metadata
                          const cot: CotizacionCanal = {
                            id: meta.cotizacion_id ? Number(meta.cotizacion_id) : 0,
                            servicio_nombre: String(meta.servicio_nombre || 'Servicio'),
                            total_clp: Number(meta.total_clp || 0),
                            mano_obra_clp: Number(meta.mano_obra_clp || 0),
                            mano_obra_lineas: manoObraLineas,
                            costo_repuestos_clp: Number(meta.costo_repuestos_clp || 0),
                            estado: String(meta.estado || 'enviada'),
                            vehiculo_marca: String(meta.vehiculo_marca || ''),
                            vehiculo_modelo: String(meta.vehiculo_modelo || ''),
                            vehiculo_anio: meta.vehiculo_anio as number | string | null | undefined,
                            vehiculo_cilindraje: String(meta.vehiculo_cilindraje || ''),
                            vehiculo_patente: String(meta.vehiculo_patente || ''),
                            tipo_motor_label: String(meta.tipo_motor_label || ''),
                            modalidad: String(meta.modalidad || 'taller'),
                            descripcion_problema: String(meta.descripcion_problema || ''),
                            duracion_minutos: meta.duracion_minutos_estimada != null ? Number(meta.duracion_minutos_estimada) : null,
                            repuestos,
                            advertencias,
                            cliente_nombre: conversationMeta.contactName,
                            cliente_telefono: conversationMeta.contactPhone,
                          };
                          setEditingCotizacion(cot);
                        }}
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
                      attachment_mime: item.attachment_mime
                        || (
                          (item.channel_metadata?.media as { mime_type?: string } | undefined)
                            ?.mime_type
                        )
                        || null,
                      attachment_name: item.attachment_name || null,
                    }}
                    esPropio={item.es_proveedor}
                    tone="host"
                    peerName={conversationMeta.displayName}
                    showReadReceipt={isLast && item.es_proveedor}
                    onImagePress={(url) => setSelectedImage(url)}
                    sendError={
                      item.channel_metadata?.send_error
                        ? String(item.channel_metadata.send_error)
                        : null
                    }
                  />
                );
              }}
            />
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyHint}>Comienza la conversación enviando un mensaje</Text>
            </View>
          )}

          <AgenteIaChatBanner conversationId={convId} />

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
            onAudioRecorded={(att) => enviar({ ...att, mime: att.mime || att.mimeType || 'audio/m4a' })}
            editable={canSendMessages}
            sending={enviando}
            hasAttachment={attachments.length > 0}
            paddingBottom={Math.max(insets.bottom, SPACING.sm)}
            stripAttached={Boolean(inputRestrictionMessage)}
            placeholder="Escribe un mensaje…"
            attachmentPreview={
              attachments.length > 0 ? (
                <AttachmentStagingTray
                  attachments={attachments}
                  onRemove={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                />
              ) : null
            }
            footerAction={
              <OmnichannelChatActionBar
                cotizacionAceptada={Boolean(cotizacionAceptadaId)}
                conversationId={convId}
                onPressCotizar={() => setCotizarVisible(true)}
                onPressAgendar={() => setAgendarVisible(true)}
                onPressAgenteIa={() => setAgenteIaVisible(true)}
              />
            }
          />
        </View>

        <CotizacionEditorFab
          visible={Boolean(cotizacionEnviadaId && !cotizacionAceptadaId)}
          variant="more"
          bottomOffset={176}
          actions={cotizacionEnviadaId ? [
            {
              key: 'aceptar',
              label: 'Marcar aceptada',
              icon: Check,
              onPress: () => void casoCotizacion.marcarAceptada(),
            },
            {
              key: 'ver',
              label: 'Ver cotización',
              icon: FileText,
              onPress: casoCotizacion.abrirFolio,
            },
            {
              key: 'cerrar',
              label: 'Cerrar caso',
              icon: X,
              onPress: casoCotizacion.cerrarCaso,
            },
          ] : []}
        />

        <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
              <X size={28} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </Modal>

        {/* Modal flotante para editar cotización - Airbnb Host style */}
        <InstitutionalModal
          visible={!!editingCotizacion}
          onClose={() => setEditingCotizacion(null)}
          title="Editar Cotización"
        >
          {editingCotizacion && (
            <View style={styles.editorWrap}>
              <CotizacionIaEditor
                ref={editorRef}
                cotizacion={editingCotizacion}
                onChange={(updated) => setEditingCotizacion(updated)}
                onEnviar={async (tipo) => {
                  if (!editingCotizacion.id || !cotizacionPermiteEnviar(editingCotizacion)) return;
                  try {
                    const saved = await cotizacionCanalService.actualizar(
                      editingCotizacion.id,
                      payloadEdicionCotizacion(editingCotizacion),
                    );
                    const nextTipo = tipo
                      || (saved.puede_enviar_firme ? 'cotizacion' : 'estimacion');
                    tipoEnvioRef.current = nextTipo;
                    setTipoPreview(nextTipo);
                    setEditingCotizacion(saved);
                    setPreviewVisible(true);
                  } catch (e) {
                    Alert.alert('Error', 'No se pudo guardar la cotización');
                  }
                }}
                onGuardarPlantilla={async () => {
                  if (editingCotizacion.id) {
                    try {
                      await cotizacionCanalService.guardarPlantilla(editingCotizacion.id);
                      Alert.alert('Guardado', 'Plantilla guardada correctamente');
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo guardar la plantilla');
                    }
                  }
                }}
                onMarcarAceptada={async () => {
                  if (editingCotizacion.id) {
                    try {
                      await cotizacionCanalService.marcarAceptada(editingCotizacion.id);
                      setEditingCotizacion(null);
                      void refetchSilent();
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo marcar como aceptada');
                    }
                  }
                }}
                readonly={!cotizacionPermiteEdicionCompleta(editingCotizacion)}
              />
              {cotizacionPermiteEdicionCompleta(editingCotizacion)
                && (editingCotizacion.estado === 'borrador' || Boolean(editingCotizacion.emision_pendiente))
                && !previewVisible ? (
                <CotizacionEditorFab
                  visible
                  variant="plus"
                  bottomOffset={24}
                  onAddRepuesto={() => editorRef.current?.agregarRepuesto()}
                  onAddManoObra={() => editorRef.current?.agregarManoObra()}
                />
              ) : null}
            </View>
          )}
        </InstitutionalModal>

        <VistaPreviaCotizacionClienteModal
          visible={previewVisible}
          cotizacionId={editingCotizacion?.id}
          esActualizacion={cotizacionEsActualizacion(editingCotizacion)}
          tipoDocumento={tipoPreview}
          puedeEnviar={Boolean(editingCotizacion && cotizacionPermiteEnviar(editingCotizacion))}
          enviando={previewEnviando}
          onClose={() => setPreviewVisible(false)}
          onEnviar={async () => {
            if (!editingCotizacion?.id) return;
            setPreviewEnviando(true);
            try {
              const eraUpdate = cotizacionEsActualizacion(editingCotizacion);
              const res = await cotizacionCanalService.enviar(
                editingCotizacion.id,
                tipoEnvioRef.current,
              );
              const enviada = res.cotizacion;
              const url = res.share_url || enviada.share_url || enviada.url_publica;
              const entrega = res.entrega_via || enviada.entrega_via;
              const entregaManual = requiereEntregaManual({
                entregaVia: entrega,
                esLibre: Boolean(enviada.es_libre) || !enviada.conversation,
                conversationId: enviada.conversation,
                channelDisconnected: Boolean(channelDisconnectedReason),
              });
              if (entregaManual && url) {
                ofrecerEntregaCotizacionEnviada({
                  url,
                  cotizacion: enviada,
                  actualizada: eraUpdate,
                  esLibre: Boolean(enviada.es_libre) || !enviada.conversation,
                  channelDisconnected: Boolean(channelDisconnectedReason),
                });
              } else {
                showAlert(
                  tituloEnvioExitoso(enviada.numero_publico, { actualizada: eraUpdate }),
                  cuerpoEnvioExitoso({
                    entregaVia: entrega,
                    numeroPublico: enviada.numero_publico,
                    actualizada: eraUpdate,
                  }),
                );
              }
              setPreviewVisible(false);
              setEditingCotizacion(null);
              void refetchSilent();
            } catch {
              Alert.alert('Error', 'No se pudo enviar la cotización');
            } finally {
              setPreviewEnviando(false);
            }
          }}
        />
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
    backgroundColor: I.canvas,
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
  chatArea: {
    flex: 1,
    backgroundColor: I.canvas,
  },
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
  sugerenciaRol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: I.paper,
  },
  sugerenciaRolText: {
    flex: 1,
    minWidth: 160,
    ...TYPOGRAPHY.styles.caption,
    color: I.muted,
  },
  sugerenciaRolAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
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
    maxWidth: '85%',
  },
  bubbleWrapOther: {
    alignSelf: 'flex-start',
    marginVertical: SPACING.xs,
    maxWidth: '85%',
  },
  editorWrap: {
    position: 'relative',
    minHeight: 420,
  },
});
