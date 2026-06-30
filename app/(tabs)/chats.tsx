import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageCircle, Check, CheckCheck,
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
import { useAuth } from '@/context/AuthContext';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatVehiculoPillLabel } from '@/utils/formatVehiculoPillLabel';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { ChatInboxLinkRow } from '@/components/chats/ChatInboxLinkRow';
import { resolveChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;
/** Jerarquía tipo Coinbase / doc proveedores — tamaños desde `TYPOGRAPHY.styles`. */
const T = TYPOGRAPHY.styles;

export default function ChatsScreen() {
  const { totalMensajesNoLeidos, actualizarTotal, decrementarNoLeidos } = useChats();
  const { isAuthenticated, usuario } = useAuth();
  const queryClient = useQueryClient();
  const invalidateChatInbox = useInvalidateChatInbox();
  const {
    data: chats = [],
    isPending,
    refetch,
  } = useChatInboxQuery(isAuthenticated && Boolean(usuario));
  const [refreshing, setRefreshing] = useState(false);
  const [chatHighlighted, setChatHighlighted] = useState<string | null>(null);
  const [deletingOfertaId, setDeletingOfertaId] = useState<string | null>(null);

  const loading = isPending && chats.length === 0;

  const totalNoLeidos = useMemo(
    () => chats.reduce((sum, chat) => sum + (chat.mensajes_no_leidos || 0), 0),
    [chats],
  );

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
      }
    }, [isAuthenticated, usuario, refetch]),
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

          {!!vehiculoPill && (
            <View style={styles.vehiclePill}>
              <Text style={styles.vehiclePillText} numberOfLines={1}>
                {vehiculoPill}
              </Text>
            </View>
          )}

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
              {ultimo_mensaje?.es_propio ? 'Tú: ' : ''}{ultimo_mensaje?.mensaje || 'Sin mensajes'}
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
        <ChatInboxLinkRow
          href={chatHref}
          onPress={markReadIfNeeded}
          highlighted={isHighlighted}
        >
          {cardBody}
        </ChatInboxLinkRow>
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
  }, [chatHighlighted, decrementarNoLeidos, deletingOfertaId, deleteChat, queryClient]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <MessageCircle size={48} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <Text style={styles.emptyTitle}>Sin conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        Tus conversaciones con clientes aparecerán aquí
      </Text>
    </View>
  );

  return (
    <TabScreenWrapper>
      <LinearGradient
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <Header
          title="Chats"
          badge={totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : undefined}
        />

        {loading && chats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando chats…</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={(item) => String(item.conversation_id || item.oferta_id || item.kind)}
            contentContainerStyle={[styles.listContainer, chats.length === 0 && styles.listContainerEmpty]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} colors={[I.primary]} />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </LinearGradient>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.sm + 4,
  },
  chatCardHighlighted: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.primary,
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
  /** Coinbase-style small uppercase pill (section label) */
  vehiclePill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    maxWidth: '100%',
  },
  vehiclePillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
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
