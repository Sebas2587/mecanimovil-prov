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
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Link2 } from 'lucide-react-native';
import chatService from '@/services/chatService';
import omnichannelService from '@/services/omnichannelService';
import { ChannelBadge, channelRespondLabel } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { ChatBubble } from '@/components/solicitudes/ChatBubble';
import { useAuth } from '@/context/AuthContext';
import websocketService, { type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import { BLANK_GLASS } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type ChatRow = {
  id: string;
  mensaje: string;
  es_proveedor: boolean;
  fecha_envio: string;
  enviado_por_nombre: string;
};

export default function ChatOmnicanalScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const convId = String(conversationId || '');

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

  const flatListRef = useRef<FlatList>(null);

  const mapApiMessage = useCallback((row: Record<string, unknown>): ChatRow => {
    const direction = row.direction as string | undefined;
    const senderId = row.sender_id as number | null | undefined;
    const esPropio = direction === 'outbound' || (usuario?.id != null && senderId === usuario.id);
    return {
      id: String(row.id),
      mensaje: String(row.content ?? row.mensaje ?? ''),
      es_proveedor: esPropio,
      fecha_envio: String(row.timestamp ?? new Date().toISOString()),
      enviado_por_nombre: String(row.sender_name ?? (esPropio ? 'Tú' : contactName)),
    };
  }, [contactName, usuario?.id]);

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
      cargar();
    }, [cargar]),
  );

  useEffect(() => {
    if (!convId) return;
    chatService.connect(convId, (data) => {
      const raw = data as Record<string, unknown>;
      if (String(raw.conversation_id) !== convId) return;
      const msg = mapApiMessage(raw);
      setMensajes((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => chatService.disconnect();
  }, [convId, mapApiMessage]);

  useEffect(() => {
    const unsub = websocketService.onNuevoMensajeChat((event: NuevoMensajeChatEvent) => {
      if (event.conversation_id !== convId) return;
      if (event.channel) setChannel(event.channel);
      if (event.external_contact_name) setContactName(event.external_contact_name);
      if (event.external_contact_phone) setContactPhone(event.external_contact_phone);
      const msg: ChatRow = {
        id: event.mensaje_id,
        mensaje: event.mensaje || event.message || '',
        es_proveedor: event.es_proveedor,
        fecha_envio: event.timestamp,
        enviado_por_nombre: event.enviado_por,
      };
      setMensajes((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [convId]);

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

  const enviar = async () => {
    const trimmed = texto.trim();
    if (!trimmed || !convId) return;
    setEnviando(true);
    setTexto('');
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
      },
    ]);
    try {
      const sent = await chatService.sendMessageHTTP(convId, { content: trimmed });
      const mapped = mapApiMessage(sent as Record<string, unknown>);
      setMensajes((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === mapped.id)) return withoutTemp;
        return [...withoutTemp, mapped];
      });
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
      setMensajes((prev) => prev.filter((m) => m.id !== tempId));
      setTexto(trimmed);
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

  const banner = `Respondiendo por ${channelRespondLabel(channel)} · ${contactName}${
    contactPhone ? ` (${contactPhone})` : ''
  }`;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <LinearGradient style={StyleSheet.absoluteFill} colors={BLANK_GLASS.gradient} locations={BLANK_GLASS.gradientLocations} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{contactName}</Text>
          <ChannelBadge channel={channel} compact />
        </View>
        <TouchableOpacity onPress={() => setVincularVisible(true)} style={styles.linkBtn}>
          <Link2 size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
        <ChannelAvatar channel={channel} size={36} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{banner}</Text>
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
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
                archivo_adjunto: null,
              }}
              esPropio={item.es_proveedor}
            />
          )}
        />
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={I.mutedSoft}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={enviar} disabled={enviando || !texto.trim()}>
          {enviando ? (
            <ActivityIndicator color={I.onPrimary} size="small" />
          ) : (
            <Send size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: I.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  backBtn: { padding: SPACING.xs, marginRight: SPACING.sm },
  headerCenter: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.styles.h3, color: I.ink, fontWeight: '600' },
  banner: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  bannerText: { ...TYPOGRAPHY.styles.caption, color: I.body },
  bannerLinked: { ...TYPOGRAPHY.styles.caption, color: I.primary, marginTop: 4 },
  linkBtn: { padding: SPACING.xs, marginRight: SPACING.sm },
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
  listContent: { padding: SPACING.md, flexGrow: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
    backgroundColor: I.canvas,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.styles.body,
    color: I.ink,
    maxHeight: 100,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
