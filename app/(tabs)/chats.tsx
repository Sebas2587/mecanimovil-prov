import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  MessageCircle, Check, CheckCheck, Sparkles,
} from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import solicitudesService from '@/services/solicitudesService';
import {
  useChatInboxQuery,
  useInvalidateChatInbox,
  upsertChatInboxFromWs,
  CHAT_INBOX_QUERY_KEY,
} from '@/hooks/useChatInboxQuery';
import { useQueryClient } from '@tanstack/react-query';
import { ChatSwipeableRow } from '@/components/chats/ChatSwipeableRow';
import websocketService from '@/app/services/websocketService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { useChats } from '@/context/ChatsContext';
import { attachmentPreviewLabel, getMessageAttachmentUri } from '@/utils/chatAttachmentMedia';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
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
import type { CanalSlug } from '@/services/omnichannelService';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { SolicitudesDisponiblesContent } from '@/components/solicitudes/SolicitudesDisponiblesContent';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import { useSolicitudesDisponiblesQuery } from '@/hooks/useSolicitudesDisponiblesQuery';
import { useCotizacionesCanalPendientesQuery } from '@/hooks/useCotizacionesCanalPendientesQuery';
import type { ChannelSlug } from '@/utils/channelVisuals';

type MensajesTab = 'chats' | 'solicitudes';

type AgendarContactoState = {
  channel?: ChannelSlug;
  contactName?: string;
  contactPhone?: string | null;
  conversationId?: string;
  channelDisconnectedReason?: string | null;
} | null;

const I = COLORS.institutional;
/** Jerarquía tipo Coinbase / doc proveedores — tamaños desde `TYPOGRAPHY.styles`. */
const T = TYPOGRAPHY.styles;

/** Chats de canal (WhatsApp/Messenger/…): sí cotizan con IA. App Mecanimovil (oferta): no. */
function isCanalOmnichannelChat(item: {
  kind?: string;
  oferta_id?: string | null;
  conversation_id?: string | null;
}): boolean {
  if (item.kind === 'omnichannel') return true;
  if (item.oferta_id) return false;
  return Boolean(item.conversation_id);
}

export default function ChatsScreen() {
  const { totalMensajesNoLeidos, actualizarTotal, decrementarNoLeidos } = useChats();
  const { isAuthenticated, usuario, estadoProveedor } = useAuth();
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const params = useLocalSearchParams<{ intent?: string | string[] }>();
  const intentParam = Array.isArray(params.intent) ? params.intent[0] : params.intent;
  /** Desde Hoy → Cotizar con IA: solo canales, sin marketplace ni chats de app. */
  const cotizarIaMode = intentParam === 'cotizar-ia';
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const solicitudesQueryEnabled =
    cuentaAprobada
    && radarPreferenciaCargada
    && radarOportunidadesActivo
    && !cotizarIaMode;
  const { data: solicitudesDisponibles = [] } = useSolicitudesDisponiblesQuery(solicitudesQueryEnabled);
  const { data: cotizacionesCanalPendientes = 0 } = useCotizacionesCanalPendientesQuery(
    cuentaAprobada && !cotizarIaMode,
  );
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
  const [activeTab, setActiveTab] = useState<MensajesTab>('chats');
  const [agendarContacto, setAgendarContacto] = useState<AgendarContactoState>(null);
  const [cotizacionLibreVisible, setCotizacionLibreVisible] = useState(false);
  const [chatHighlighted, setChatHighlighted] = useState<string | null>(null);
  const [deletingOfertaId, setDeletingOfertaId] = useState<string | null>(null);

  const canalChats = useMemo(
    () => chats.filter(isCanalOmnichannelChat),
    [chats],
  );
  const chatsVisibles = cotizarIaMode ? canalChats : chats;

  const loading = isPending && chatsVisibles.length === 0;

  useEffect(() => {
    if (cotizarIaMode) setActiveTab('chats');
  }, [cotizarIaMode]);

  const totalNoLeidos = useMemo(
    () => chats.reduce((sum, chat) => sum + (chat.mensajes_no_leidos || 0), 0),
    [chats],
  );

  const mensajesTabs = useMemo(() => {
    const chatsTab = {
      key: 'chats' as const,
      label: cotizarIaMode ? 'Canales' : 'Chats',
      badge: cotizarIaMode
        ? (canalChats.reduce((s, c) => s + (c.mensajes_no_leidos || 0), 0) || null)
        : totalNoLeidos > 0
          ? totalNoLeidos
          : null,
    };
    if (cotizarIaMode) return [chatsTab];
    return [
      chatsTab,
      {
        key: 'solicitudes' as const,
        label: 'Solicitudes',
        badge: solicitudesDisponibles.length > 0 ? solicitudesDisponibles.length : null,
      },
    ];
  }, [canalChats, cotizarIaMode, solicitudesDisponibles.length, totalNoLeidos]);

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
    setAgendarContacto({
      channel: channelSlug || undefined,
      contactName: item.otra_persona?.nombre,
      contactPhone: item.otra_persona?.telefono ?? null,
      conversationId: item.conversation_id ? String(item.conversation_id) : undefined,
      channelDisconnectedReason,
    });
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

  useEffect(() => {
    if (!isAuthenticated || !usuario) return;

    const unsubscribe = websocketService.onNuevoMensajeChat((event) => {
      const rowKey = event.oferta_id || event.conversation_id;
      if (rowKey) {
        const cached = queryClient.getQueryData<typeof chats>(CHAT_INBOX_QUERY_KEY);
        const chatIndex = cached?.findIndex((chat) =>
          (event.oferta_id && chat.oferta_id === event.oferta_id)
          || (event.conversation_id && chat.conversation_id === event.conversation_id),
        ) ?? -1;

        if (chatIndex !== -1 && cached) {
          const chatActualizado = { ...cached[chatIndex] };
          chatActualizado.ultimo_mensaje = {
            id: event.mensaje_id,
            mensaje: event.mensaje,
            fecha_envio: event.timestamp,
            es_propio: event.es_proveedor,
            leido: false,
          };
          if (!event.es_proveedor) {
            chatActualizado.mensajes_no_leidos = (chatActualizado.mensajes_no_leidos || 0) + 1;
            setChatHighlighted(rowKey);
            setTimeout(() => setChatHighlighted(null), 2000);
          }
          upsertChatInboxFromWs(queryClient, rowKey, chatActualizado);
        } else {
          invalidateChatInbox();
        }
      }
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated, usuario, queryClient, invalidateChatInbox]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && usuario) {
        void refetch();
        void refetchConnections();
      }
    }, [isAuthenticated, usuario, refetch, refetchConnections]),
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
      setDeletingOfertaId(ofertaId);
      try {
        const result = await solicitudesService.eliminarChatPorOferta(ofertaId);
        if (!result.success) {
          Alert.alert('Error', result.error || 'No se pudo eliminar el chat');
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
        setDeletingOfertaId(null);
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
    const isDeleting = deletingOfertaId === oferta_id;
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

    const cardBody = (
      <View style={[styles.chatCard, isHighlighted && styles.chatCardHighlighted]}>
        <ChannelAvatar
          channel={isOmnichannel ? channel : 'app'}
          photoUrl={!isOmnichannel ? otra_persona?.foto : null}
        />

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

          {!!vehiculoPill ? (
            <InstitutionalTag label={vehiculoPill} variant="neutral" size="sm" />
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
              numberOfLines={1}
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

    if (isOmnichannel && chatHref) {
      return (
        <View style={styles.chatRowWithAction}>
          <View style={styles.chatRowMain}>
            <ChatInboxLinkRow
              href={chatHref}
              onPress={markReadIfNeeded}
              highlighted={isHighlighted}
            >
              {cardBody}
            </ChatInboxLinkRow>
          </View>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => abrirAgendarDesdeFila(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agendar cita y cotizar con IA"
          >
            <Sparkles size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>
      );
    }

    if (chatHref && !isOmnichannel) {
      return (
        <ChatSwipeableRow
          rowKey={String(oferta_id)}
          disabled={isDeleting}
          onDelete={() => deleteChat(oferta_id, mensajes_no_leidos || 0)}
        >
          <ChatInboxLinkRow href={chatHref} onPress={markReadIfNeeded} highlighted={isHighlighted}>
            {cardBody}
          </ChatInboxLinkRow>
        </ChatSwipeableRow>
      );
    }

    return <View style={styles.listItemFallback}>{cardBody}</View>;
  }, [
    abrirAgendarDesdeFila,
    channelConnections,
    chatHighlighted,
    decrementarNoLeidos,
    deletingOfertaId,
    deleteChat,
    featureEnabled,
    queryClient,
  ]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        {cotizarIaMode ? (
          <Sparkles size={48} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <MessageCircle size={48} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {cotizarIaMode ? 'Sin chats de canal' : 'Sin conversaciones'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {cotizarIaMode
          ? 'La cotización con IA es para WhatsApp, Messenger u otros canales. Las solicitudes de la app Mecanimovil ya traen servicios elegidos.'
          : 'Tus conversaciones con clientes aparecerán aquí'}
      </Text>
    </View>
  );

  const renderCotizarIaHeader = useCallback(
    () => (
      <TouchableOpacity
        style={styles.cotizacionLibreCard}
        activeOpacity={0.9}
        onPress={() => setCotizacionLibreVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Cotización libre sin chat"
      >
        <View style={styles.cotizacionLibreIconWrap}>
          <Sparkles size={22} color={COLORS.text.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.cotizacionLibreTextWrap}>
          <Text style={styles.cotizacionLibreTitle}>Cotización libre (sin chat)</Text>
          <Text style={styles.cotizacionLibreSubtitle}>
            Genera un link público para WhatsApp u otro canal
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Header
          title={cotizarIaMode ? 'Cotizar con IA' : 'Mensajes'}
          badge={!cotizarIaMode && totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : undefined}
        />

        {!cotizarIaMode ? (
          <View style={styles.tabsWrap}>
            <InstitutionalScreenTabs
              tabs={mensajesTabs}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          </View>
        ) : null}

        {!cotizarIaMode && activeTab === 'chats' && cotizacionesCanalPendientes > 0 ? (
          <TouchableOpacity
            style={styles.canalPendienteBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/bandeja?filtro=esperando_24h')}
            accessibilityRole="button"
            accessibilityLabel="Ver cotizaciones de canal sin respuesta hace más de 24 horas"
          >
            <Text style={styles.canalPendienteBannerText}>
              {cotizacionesCanalPendientes} cotización{cotizacionesCanalPendientes === 1 ? '' : 'es'} por
              WhatsApp/canal sin respuesta hace más de 24h
            </Text>
          </TouchableOpacity>
        ) : null}

        {activeTab === 'solicitudes' && !cotizarIaMode ? (
          <SolicitudesDisponiblesContent variant="embedded" />
        ) : loading && chatsVisibles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando mensajes…</Text>
          </View>
        ) : (
          <FlatList
            data={chatsVisibles}
            renderItem={renderChatItem}
            keyExtractor={(item) => String(item.conversation_id || item.oferta_id || item.kind)}
            ListHeaderComponent={cotizarIaMode ? renderCotizarIaHeader : undefined}
            contentContainerStyle={[
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

        <CotizacionLibreModal
          visible={cotizacionLibreVisible}
          onClose={() => setCotizacionLibreVisible(false)}
          onEnviada={() => {
            void refetch();
          }}
        />

        <AgendarDesdeCanalModal
          visible={Boolean(agendarContacto)}
          onClose={() => setAgendarContacto(null)}
          channel={agendarContacto?.channel}
          contactName={agendarContacto?.contactName}
          contactPhone={agendarContacto?.contactPhone}
          conversationId={agendarContacto?.conversationId}
          channelDisconnectedReason={agendarContacto?.channelDisconnectedReason}
          onCotizacionEnviada={() => {
            void refetch();
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    color: I.muted,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cotizacionLibreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.brand.magenta,
    ...SHADOWS.editorial,
  },
  cotizacionLibreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cotizacionLibreTextWrap: { flex: 1 },
  cotizacionLibreTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.onPrimary,
    marginBottom: 2,
  },
  cotizacionLibreSubtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.92)',
  },
  canalPendienteBanner: {
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.institutional.accentYellow,
  },
  canalPendienteBannerText: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: I.ink,
  },
  tabsWrap: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  chatRowWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chatRowMain: {
    flex: 1,
    minWidth: 0,
  },
  quickActionBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.sm + 4,
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
});
