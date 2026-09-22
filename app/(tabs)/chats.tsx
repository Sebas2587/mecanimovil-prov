import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  MessageCircle, Check, CheckCheck, Sparkles, Clock3, Search, Trash2,
} from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import solicitudesService from '@/services/solicitudesService';
import {
  useChatInboxQuery,
  useInvalidateChatInbox,
  applyChatInboxFromWs,
  CHAT_INBOX_QUERY_KEY,
} from '@/hooks/useChatInboxQuery';
import { useQueryClient } from '@tanstack/react-query';
import { ChatSwipeableRow, confirmChatDeletion } from '@/components/chats/ChatSwipeableRow';
import { showAlert } from '@/utils/platformAlert';
import chatService from '@/services/chatService';
import websocketService from '@/app/services/websocketService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { useChats } from '@/context/ChatsContext';
import { attachmentPreviewLabel, getMessageAttachmentUri } from '@/utils/chatAttachmentMedia';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  Card,
  hostScreenStyles,
  InstitutionalButton,
  InstitutionalScreenTabs,
  InstitutionalText,
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatVehiculoPillLabel } from '@/utils/formatVehiculoPillLabel';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { ChatInboxLinkRow } from '@/components/chats/ChatInboxLinkRow';
import { resolveChatHref } from '@/utils/chatRoutes';
import { useOmnichannelConnectionMap } from '@/hooks/useOmnichannelConnections';
import {
  getChannelDisconnectedReason,
} from '@/utils/omnichannelConnection';
import omnichannelService, { type CanalSlug } from '@/services/omnichannelService';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InboxAttentionCard } from '@/components/chats/InboxAttentionCard';
import { useCotizacionesCanalPendientesQuery } from '@/hooks/useCotizacionesCanalPendientesQuery';
import { useAgenteBorradoresPendientesQuery } from '@/hooks/useAgenteIaQueries';
import type { ChannelSlug } from '@/utils/channelVisuals';
import type { InboxChatItem } from '@/services/omnichannelService';
import {
  LEAD_CATEGORIA_LABELS,
  LEAD_CATEGORIA_VARIANT,
  type LeadCategoria,
} from '@/services/pipelineComercialService';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';

type ChatInboxFilter =
  | 'todos'
  | 'sin_responder'
  | 'cotizacion_enviada'
  | 'cotizacion_aceptada'
  | 'borrador'
  | 'calificados';

type AgendarContactoState = {
  channel?: ChannelSlug;
  contactName?: string;
  contactPhone?: string | null;
  conversationId?: string;
  channelDisconnectedReason?: string | null;
} | null;

const I = COLORS.institutional;
/** Tamaños Host desde `TYPOGRAPHY.styles`. */
const T = TYPOGRAPHY.styles;

const CHAT_FILTERS: { key: ChatInboxFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'sin_responder', label: 'Sin responder' },
  { key: 'calificados', label: 'Calificados' },
  { key: 'cotizacion_enviada', label: 'Enviadas' },
  { key: 'cotizacion_aceptada', label: 'Aceptadas' },
  { key: 'borrador', label: 'Borrador IA' },
];

function matchesChatFilter(chat: InboxChatItem, filter: ChatInboxFilter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'sin_responder') {
    return Boolean(chat.cliente_sin_responder) || (chat.mensajes_no_leidos || 0) > 0;
  }
  if (filter === 'cotizacion_enviada') return chat.cotizacion_estado === 'enviada';
  if (filter === 'cotizacion_aceptada') return chat.cotizacion_estado === 'aceptada';
  if (filter === 'borrador') return chat.cotizacion_estado === 'borrador';
  if (filter === 'calificados') {
    return (
      (chat.lead_categoria === 'interesado_calificado' || chat.lead_categoria === 'listo_agendar')
      && chat.lead_categoria !== 'cerrado_perdido'
      && chat.cotizacion_estado !== 'cancelada'
      && chat.cotizacion_estado !== 'rechazada'
    );
  }
  return true;
}

function cotizacionBadgeLabel(estado: string | null | undefined): string | null {
  if (estado === 'enviada') return 'Cotización enviada';
  if (estado === 'aceptada') return 'Cotización aceptada';
  if (estado === 'borrador') return 'Borrador IA';
  if (estado === 'rechazada') return 'Cotización rechazada';
  if (estado === 'cancelada') return 'Cotización cancelada';
  return null;
}

export default function ChatsScreen() {
  const { totalMensajesNoLeidos, actualizarTotal, decrementarNoLeidos, resetearNoLeidos } = useChats();
  const { isAuthenticated, usuario, estadoProveedor } = useAuth();
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const { data: cotizacionesCanalPendientes = 0 } = useCotizacionesCanalPendientesQuery(cuentaAprobada);
  const {
    data: borradoresAgente,
    refetch: refetchBorradoresAgente,
  } = useAgenteBorradoresPendientesQuery(cuentaAprobada);
  const borradoresAgenteCount = Math.max(0, Number(borradoresAgente?.count) || 0);
  const queryClient = useQueryClient();
  const invalidateChatInbox = useInvalidateChatInbox();
  const {
    data: chats = [],
    isPending,
    refetch,
  } = useChatInboxQuery(isAuthenticated && Boolean(usuario));
  const { map: channelConnections, featureEnabled, refetch: refetchConnections } =
    useOmnichannelConnectionMap(isAuthenticated && Boolean(usuario));
  const [refreshing, setRefreshing] = useState(false);
  const [chatFilter, setChatFilter] = useState<ChatInboxFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactoAccion, setContactoAccion] = useState<AgendarContactoState>(null);
  const [jobModal, setJobModal] = useState<'chooser' | 'agendar' | 'cotizar' | null>(null);
  const [chatHighlighted, setChatHighlighted] = useState<string | null>(null);
  /** Row en proceso de borrado: `oferta:{id}` o `omni:{conversationId}`. */
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const chatsVisibles = useMemo(() => {
    let filtered = chats.filter((c) => matchesChatFilter(c, chatFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((c) => {
        const nombre = (c.otra_persona?.nombre || c.external_contact_id || '').toString().toLowerCase();
        const tel = (c.otra_persona?.telefono || '').toString().toLowerCase();
        const patente = (c.vehiculo_patente || '').toLowerCase();
        const msg = (c.ultimo_mensaje?.mensaje || '').toLowerCase();
        return nombre.includes(q) || tel.includes(q) || patente.includes(q) || msg.includes(q);
      });
    }
    const ts = (c: InboxChatItem) => {
      const raw = c.ultimo_mensaje?.fecha_envio;
      if (!raw) return 0;
      const n = Date.parse(raw);
      return Number.isFinite(n) ? n : 0;
    };
    return [...filtered].sort((a, b) => {
      // WhatsApp-like: el chat con el mensaje más reciente va arriba.
      const diff = ts(b) - ts(a);
      if (diff !== 0) return diff;
      // Empate: en Calificados prioriza score; en el resto no mueve el orden.
      if (chatFilter === 'calificados') {
        return (b.lead_score ?? 0) - (a.lead_score ?? 0);
      }
      return 0;
    });
  }, [chats, chatFilter, searchQuery]);
  const loading = isPending && chats.length === 0;

  const totalNoLeidos = useMemo(
    () => chats.reduce((sum, chat) => sum + (chat.mensajes_no_leidos || 0), 0),
    [chats],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<ChatInboxFilter, number> = {
      todos: chats.length,
      sin_responder: 0,
      calificados: 0,
      cotizacion_enviada: 0,
      cotizacion_aceptada: 0,
      borrador: 0,
    };
    for (const chat of chats) {
      if (matchesChatFilter(chat, 'sin_responder')) counts.sin_responder += 1;
      if (matchesChatFilter(chat, 'calificados')) counts.calificados += 1;
      if (matchesChatFilter(chat, 'cotizacion_enviada')) counts.cotizacion_enviada += 1;
      if (matchesChatFilter(chat, 'cotizacion_aceptada')) counts.cotizacion_aceptada += 1;
      if (matchesChatFilter(chat, 'borrador')) counts.borrador += 1;
    }
    return counts;
  }, [chats]);

  const filterTabs = useMemo(
    () =>
      CHAT_FILTERS.map((f) => {
        const fromInbox = filterCounts[f.key];
        const badge =
          f.key === 'todos'
            ? undefined
            : f.key === 'borrador'
              ? (borradoresAgenteCount > 0 ? borradoresAgenteCount : fromInbox)
              : fromInbox;
        return {
          key: f.key,
          label: f.label,
          badge: badge && badge > 0 ? badge : undefined,
        };
      }),
    [borradoresAgenteCount, filterCounts],
  );

  const handleChatFilter = useCallback((key: ChatInboxFilter) => {
    setChatFilter(key);
  }, []);

  const abrirAgendarDesdeFila = useCallback((item: {
    channel?: string;
    conversation_id?: string;
    otra_persona?: { nombre?: string; telefono?: string | null };
  }) => {
    const channelSlug = (item.channel || '') as ChannelSlug;
    const channelDisconnectedReason = item.channel
      ? getChannelDisconnectedReason(
          channelConnections[channelSlug as CanalSlug],
          channelSlug as CanalSlug,
          featureEnabled,
          'inbox',
        )
      : null;
    setContactoAccion({
      channel: channelSlug || undefined,
      contactName: item.otra_persona?.nombre,
      contactPhone: item.otra_persona?.telefono ?? null,
      conversationId: item.conversation_id ? String(item.conversation_id) : undefined,
      channelDisconnectedReason,
    });
    setJobModal('chooser');
  }, [channelConnections, featureEnabled]);

  useEffect(() => {
    actualizarTotal(totalNoLeidos);
  }, [actualizarTotal, totalNoLeidos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const markAllAsRead = useCallback(async () => {
    if (markingAllRead || totalNoLeidos <= 0) return;
    const previous = queryClient.getQueryData<typeof chats>(CHAT_INBOX_QUERY_KEY);
    setMarkingAllRead(true);
    queryClient.setQueryData<typeof chats>(CHAT_INBOX_QUERY_KEY, (prev) => {
      if (!prev) return prev;
      return prev.map((c) => ({
        ...c,
        mensajes_no_leidos: 0,
        ultimo_mensaje:
          c.ultimo_mensaje && !c.ultimo_mensaje.es_propio
            ? { ...c.ultimo_mensaje, leido: true }
            : c.ultimo_mensaje,
      }));
    });
    resetearNoLeidos();
    try {
      await chatService.markAllRead();
    } catch {
      if (previous) {
        queryClient.setQueryData(CHAT_INBOX_QUERY_KEY, previous);
      } else {
        void refetch();
      }
      actualizarTotal(totalNoLeidos);
      showAlert('Error', 'No se pudieron marcar todos los mensajes como leídos.');
    } finally {
      setMarkingAllRead(false);
    }
  }, [
    actualizarTotal,
    markingAllRead,
    queryClient,
    refetch,
    resetearNoLeidos,
    totalNoLeidos,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !usuario) return;

    const unsubscribe = websocketService.onNuevoMensajeChat((event) => {
      const rowKey = event.oferta_id || event.conversation_id;
      if (!rowKey) return;
      applyChatInboxFromWs(queryClient, {
        conversation_id: event.conversation_id,
        oferta_id: event.oferta_id,
        mensaje_id: event.mensaje_id,
        mensaje: event.mensaje,
        timestamp: event.timestamp,
        es_proveedor: event.es_proveedor,
        channel: event.channel,
        external_contact_name: event.external_contact_name,
        external_contact_phone: event.external_contact_phone,
      });
      if (!event.es_proveedor) {
        setChatHighlighted(rowKey);
        setTimeout(() => setChatHighlighted(null), 2000);
      }
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated, usuario, queryClient]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !usuario) return;
      const updatedAt = queryClient.getQueryState(CHAT_INBOX_QUERY_KEY)?.dataUpdatedAt ?? 0;
      if (Date.now() - updatedAt > 15_000) {
        void refetch();
      }
      void refetchConnections();
      if (cuentaAprobada) {
        void refetchBorradoresAgente();
      }
    }, [
      isAuthenticated,
      usuario,
      cuentaAprobada,
      queryClient,
      refetch,
      refetchConnections,
      refetchBorradoresAgente,
    ]),
  );

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = parseISO(fechaStr);
      if (isToday(fecha)) return format(fecha, 'h:mm a', { locale: es });
      if (isYesterday(fecha)) return 'Ayer';
      return format(fecha, 'dd/MM/yy', { locale: es });
    } catch { return ''; }
  };

  const deleteChat = useCallback(
    async (ofertaId: string, unreadCount: number) => {
      const rowKey = `oferta:${ofertaId}`;
      setDeletingRowKey(rowKey);
      try {
        const result = await solicitudesService.eliminarChatPorOferta(ofertaId);
        if (!result.success) {
          showAlert('Error', result.error || 'No se pudo eliminar el chat');
          throw new Error(result.error || 'delete failed');
        }
        queryClient.setQueryData(CHAT_INBOX_QUERY_KEY, (prev: typeof chats | undefined) => {
          if (!prev) return prev;
          return prev.filter((c) => c.oferta_id !== ofertaId);
        });
        invalidateChatInbox();
        if (unreadCount > 0) {
          decrementarNoLeidos(unreadCount);
        }
      } finally {
        setDeletingRowKey(null);
      }
    },
    [decrementarNoLeidos, invalidateChatInbox, queryClient],
  );

  const deleteOmnichannelChat = useCallback(
    async (conversationId: string | number, unreadCount: number) => {
      const id = String(conversationId);
      const rowKey = `omni:${id}`;
      setDeletingRowKey(rowKey);
      try {
        await omnichannelService.eliminarConversacion(id);
        queryClient.setQueryData(CHAT_INBOX_QUERY_KEY, (prev: typeof chats | undefined) => {
          if (!prev) return prev;
          return prev.filter((c) => String(c.conversation_id) !== id);
        });
        invalidateChatInbox();
        if (unreadCount > 0) {
          decrementarNoLeidos(unreadCount);
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
            ?.detail
          || (err as { message?: string })?.message
          || 'No se pudo eliminar el chat';
        showAlert('Error', message);
        throw err;
      } finally {
        setDeletingRowKey(null);
      }
    },
    [decrementarNoLeidos, invalidateChatInbox, queryClient],
  );

  const renderChatItem = useCallback(({ item }: { item: any }) => {
    const {
      oferta_id,
      conversation_id,
      channel,
      kind,
      otra_persona,
      vehiculo,
      ultimo_mensaje,
      mensajes_no_leidos,
    } = item;
    const rowKey = oferta_id || conversation_id;
    const isOmnichannel = kind === 'omnichannel' || (!oferta_id && conversation_id);
    const channelSlug = (channel || '') as CanalSlug;
    const channelDisconnectedReason = isOmnichannel && channel
      ? getChannelDisconnectedReason(
          channelConnections[channelSlug],
          channelSlug,
          featureEnabled,
          'inbox',
        )
      : null;
    const isHighlighted = chatHighlighted === rowKey;
    const hasUnread = mensajes_no_leidos > 0;
    const vehiculoPill = formatVehiculoPillLabel(vehiculo);
    const cotizacionLabel = cotizacionBadgeLabel(item.cotizacion_estado);
    const leadCat = (item.lead_categoria || 'sin_calificar') as LeadCategoria;
    const showLeadTag = leadCat !== 'sin_calificar';
    const isDeleting = isOmnichannel
      ? deletingRowKey === `omni:${String(conversation_id)}`
      : deletingRowKey === `oferta:${String(oferta_id)}`;
    const chatHref = resolveChatHref(item);

    const markReadIfNeeded = () => {
      if (hasUnread) {
        queryClient.setQueryData(CHAT_INBOX_QUERY_KEY, (prev: typeof chats | undefined) => {
          if (!prev) return prev;
          return prev.map((c) => {
            const match = oferta_id
              ? c.oferta_id === oferta_id
              : c.conversation_id === conversation_id;
            return match ? { ...c, mensajes_no_leidos: 0 } : c;
          });
        });
        decrementarNoLeidos(mensajes_no_leidos);
      }
    };

    const showWebDelete = Platform.OS === 'web';
    const showCardFooter = isOmnichannel || showWebDelete;

    const inner = (
      <View style={styles.chatCardInner}>
        <View style={styles.chatAvatar}>
          <ChannelAvatar
            channel={isOmnichannel ? channel : 'app'}
            photoUrl={!isOmnichannel ? otra_persona?.foto : null}
          />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
              {otra_persona?.nombre || 'Cliente'}
            </Text>
            <Text style={[styles.chatDate, hasUnread && styles.chatDateUnread]}>
              {ultimo_mensaje?.fecha_envio ? formatearFecha(ultimo_mensaje.fecha_envio) : ''}
            </Text>
          </View>

          {isOmnichannel && channel ? (
            <View style={styles.channelRow}>
              <ChannelBadge channel={channel} compact />
            </View>
          ) : null}

          {channelDisconnectedReason ? (
            <Text style={styles.channelWarning} numberOfLines={1}>
              {channelDisconnectedReason}
            </Text>
          ) : null}

          {(!!vehiculoPill || !!cotizacionLabel || showLeadTag) ? (
            <View style={styles.tagsRow}>
              {!!cotizacionLabel ? (
                <InstitutionalTag
                  label={cotizacionLabel}
                  variant={
                    item.cotizacion_estado === 'aceptada' || item.cotizacion_estado === 'enviada'
                      ? 'primary'
                      : 'neutral'
                  }
                  size="sm"
                />
              ) : null}
              {showLeadTag ? (
                <InstitutionalTag
                  label={LEAD_CATEGORIA_LABELS[leadCat] || leadCat}
                  variant={LEAD_CATEGORIA_VARIANT[leadCat] || 'neutral'}
                  size="sm"
                />
              ) : null}
              {!!vehiculoPill ? (
                <InstitutionalTag label={vehiculoPill} variant="neutral" size="sm" />
              ) : null}
            </View>
          ) : null}

          <View style={styles.chatMessageRow}>
            {ultimo_mensaje?.es_propio && (
              <>
                {ultimo_mensaje.leido ? (
                  <CheckCheck size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 4 }} />
                ) : (
                  <Check size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 4 }} />
                )}
              </>
            )}
            <Text
              style={[styles.chatMessage, hasUnread && !ultimo_mensaje?.es_propio && styles.chatMessageUnread]}
              numberOfLines={2}
            >
              {ultimo_mensaje?.es_propio ? 'Tú: ' : ''}
              {ultimo_mensaje?.mensaje ||
                (getMessageAttachmentUri(ultimo_mensaje)
                  ? attachmentPreviewLabel(ultimo_mensaje)
                  : 'Sin mensajes')}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {mensajes_no_leidos > 99 ? '99+' : mensajes_no_leidos}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );

    const runRowDelete = () => {
      if (isOmnichannel) {
        return deleteOmnichannelChat(conversation_id, mensajes_no_leidos || 0);
      }
      return deleteChat(oferta_id, mensajes_no_leidos || 0);
    };

    const cardBody = (
      <Card
        elevated
        padding="host"
        style={[styles.chatCard, isHighlighted && styles.chatCardHighlighted]}
      >
        {chatHref ? (
          <ChatInboxLinkRow
            href={chatHref}
            onPress={markReadIfNeeded}
            highlighted={isHighlighted}
          >
            {inner}
          </ChatInboxLinkRow>
        ) : (
          inner
        )}
        {showCardFooter ? (
          <View style={[styles.cardFooter, !isOmnichannel && styles.cardFooterEnd]}>
            {isOmnichannel ? (
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => abrirAgendarDesdeFila(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Cotizar o agendar cita"
              >
                <Sparkles size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary">Cotizar</InstitutionalText>
              </TouchableOpacity>
            ) : null}
            {showWebDelete ? (
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => confirmChatDeletion(runRowDelete)}
                activeOpacity={0.75}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Eliminar conversación"
              >
                <Trash2 size={16} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="semanticDown">Eliminar</InstitutionalText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </Card>
    );

    if (!chatHref) {
      return <View style={styles.listItemFallback}>{cardBody}</View>;
    }

    return (
      <ChatSwipeableRow
        rowKey={isOmnichannel ? `omni:${String(conversation_id)}` : String(oferta_id)}
        disabled={isDeleting}
        onDelete={runRowDelete}
      >
        {cardBody}
      </ChatSwipeableRow>
    );
  }, [
    abrirAgendarDesdeFila,
    channelConnections,
    chatHighlighted,
    decrementarNoLeidos,
    deletingRowKey,
    deleteChat,
    deleteOmnichannelChat,
    featureEnabled,
    queryClient,
  ]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <MessageCircle size={48} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <Text style={styles.emptyTitle}>
        {chatFilter === 'todos' ? 'Sin conversaciones' : 'Sin resultados'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {chatFilter === 'todos'
          ? 'Tus conversaciones con clientes aparecerán aquí'
          : 'Ningún chat coincide con este filtro'}
      </Text>
    </View>
  );

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header
          title="Mensajes"
          badge={totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : undefined}
          rightComponent={
            totalNoLeidos > 0 || markingAllRead ? (
              <TouchableOpacity
                onPress={markAllAsRead}
                disabled={markingAllRead}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.headerReadAll}
                accessibilityRole="button"
                accessibilityLabel="Marcar todos los mensajes como leídos"
              >
                <CheckCheck size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary" numberOfLines={1}>
                  {markingAllRead ? 'Leyendo…' : 'Leer todo'}
                </InstitutionalText>
              </TouchableOpacity>
            ) : null
          }
        />

        <View style={[styles.searchBarWrap, hostScreenStyles.gutterX]}>
          <View style={institutionalInputStyles.inputRow}>
            <Search size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <TextInput
              style={institutionalInputStyles.inputRowField}
              placeholder="Cliente, teléfono, patente o mensaje"
              placeholderTextColor={institutionalInputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Buscar mensaje o cliente"
            />
          </View>
        </View>

        <View style={[styles.tabsOuter, hostScreenStyles.gutterX]}>
          <InstitutionalScreenTabs
            activeKey={chatFilter}
            onChange={handleChatFilter}
            tabs={filterTabs}
          />
        </View>

        {cotizacionesCanalPendientes > 0 ? (
          <InboxAttentionCard
            icon={Clock3}
            title="Sin respuesta +24h"
            subtitle="Cotizaciones de WhatsApp/canal esperando al cliente"
            count={cotizacionesCanalPendientes}
            tagVariant="warning"
            onPress={() => router.push('/(tabs)/bandeja?filtro=esperando_24h')}
            accessibilityLabel="Ver cotizaciones de canal sin respuesta hace más de 24 horas"
          />
        ) : null}

        {loading && chats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <InstitutionalText role="caption" color="muted">Cargando mensajes…</InstitutionalText>
          </View>
        ) : (
          <FlatList
            data={chatsVisibles}
            renderItem={renderChatItem}
            keyExtractor={(item) => String(item.conversation_id || item.oferta_id || item.kind)}
            style={hostScreenStyles.scroll}
            contentContainerStyle={[
              hostScreenStyles.scrollInner,
              styles.listContainer,
              chatsVisibles.length === 0 && styles.listContainerEmpty,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} colors={[I.primary]} />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}

        <BottomSheet
          visible={jobModal === 'chooser' && Boolean(contactoAccion)}
          onClose={() => {
            setJobModal(null);
            setContactoAccion(null);
          }}
        >
          <InstitutionalText role="h4">¿Qué quieres hacer?</InstitutionalText>
          <InstitutionalText role="caption" color="muted" style={styles.jobChooserHint}>
            Elige cotizar o agendar para este contacto.
          </InstitutionalText>
          <View style={styles.jobChooserActions}>
            <InstitutionalButton
              label="Cotizar"
              variant="outline"
              onPress={() => setJobModal('cotizar')}
            />
            <InstitutionalButton
              label="Agendar cita"
              variant="primary"
              onPress={() => setJobModal('agendar')}
            />
          </View>
        </BottomSheet>

        <AgendarDesdeCanalModal
          visible={jobModal === 'agendar' && Boolean(contactoAccion)}
          onClose={() => {
            setJobModal(null);
            setContactoAccion(null);
          }}
          channel={contactoAccion?.channel}
          contactName={contactoAccion?.contactName}
          contactPhone={contactoAccion?.contactPhone}
          conversationId={contactoAccion?.conversationId}
        />

        <CotizacionLibreModal
          visible={jobModal === 'cotizar' && Boolean(contactoAccion)}
          onClose={() => {
            setJobModal(null);
            setContactoAccion(null);
          }}
          conversationId={contactoAccion?.conversationId}
          channel={contactoAccion?.channel}
          contactName={contactoAccion?.contactName}
          contactPhone={contactoAccion?.contactPhone}
          channelDisconnectedReason={contactoAccion?.channelDisconnectedReason}
          onEnviada={() => {
            void refetch();
            invalidateProveedorComercialQueries(queryClient);
          }}
        />
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  headerReadAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  listContainer: {
    flexGrow: 1,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsOuter: {
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xs,
  },
  searchBarWrap: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginTop: 2,
    marginBottom: 2,
  },
  chatCard: {
    alignSelf: 'stretch',
    width: '100%',
  },
  chatCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm + 4,
  },
  chatAvatar: {
    flexShrink: 0,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    marginHorizontal: -SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    marginBottom: -SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
  },
  cardFooterEnd: {
    justifyContent: 'flex-end',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    minHeight: 36,
    paddingVertical: SPACING.fixed.xxs,
  },
  chatCardHighlighted: {
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
  },
  listItemFallback: {
    marginBottom: SPACING.sm,
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelRow: {
    marginTop: 2,
  },
  channelWarning: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: 14,
    color: I.mutedSoft,
    marginTop: 1,
  },
  chatName: {
    flex: 1,
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h4.fontWeight as '600',
    lineHeight: Math.round(T.h4.fontSize * T.h4.lineHeight),
    color: I.ink,
    marginRight: SPACING.sm,
  },
  chatNameUnread: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h4.fontWeight as '600',
    color: I.ink,
  },
  chatDate: {
    flexShrink: 0,
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    color: I.muted,
  },
  chatDateUnread: {
    color: I.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.captionBold.fontWeight as '600',
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  chatMessage: {
    flex: 1,
    minWidth: 0,
    fontSize: T.navLink.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.navLink.fontWeight as '400',
    lineHeight: Math.round(T.navLink.fontSize * T.navLink.lineHeight),
    color: I.muted,
  },
  chatMessageUnread: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.captionBold.fontWeight as '600',
    color: I.body,
  },
  unreadBadge: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
    minWidth: 22,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: I.onPrimary,
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: T.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h3.fontWeight as '600',
    lineHeight: Math.round(T.h3.fontSize * T.h3.lineHeight),
    color: I.ink,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: T.small.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.small.fontWeight as '400',
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
    color: I.muted,
    textAlign: 'center',
  },
  jobChooserHint: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  jobChooserActions: {
    gap: SPACING.sm,
  },
});
