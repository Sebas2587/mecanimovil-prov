import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageCircle, User, Check, CheckCheck,
} from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerListaChats } from '@/services/solicitudesService';
import websocketService from '../services/websocketService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { useChats } from '@/context/ChatsContext';
import { useAuth } from '@/context/AuthContext';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatVehiculoPillLabel } from '@/utils/formatVehiculoPillLabel';

const I = COLORS.institutional;
/** Jerarquía tipo Coinbase / doc proveedores — tamaños desde `TYPOGRAPHY.styles`. */
const T = TYPOGRAPHY.styles;

export default function ChatsScreen() {
  const { totalMensajesNoLeidos, actualizarTotal, decrementarNoLeidos } = useChats();
  const { isAuthenticated, usuario } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatHighlighted, setChatHighlighted] = useState<string | null>(null);

  const cargarChats = useCallback(async (isRefreshing = false) => {
    try {
      if (!isAuthenticated || !usuario) {
        setChats([]);
        actualizarTotal(0);
        return;
      }
      if (!isRefreshing) setLoading(true);
      const data = await obtenerListaChats();
      setChats(data);
      const total = data.reduce((sum: number, chat: any) => sum + (chat.mensajes_no_leidos || 0), 0);
      actualizarTotal(total);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setChats([]);
        actualizarTotal(0);
        return;
      }
      console.error('Error cargando chats:', error);
      setChats([]);
      actualizarTotal(0);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [isAuthenticated, usuario, actualizarTotal]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarChats(true);
  }, [cargarChats]);

  useEffect(() => {
    if (!isAuthenticated || !usuario) return;

    const unsubscribe = websocketService.onNuevoMensajeChat((event) => {
      if (event.oferta_id) {
        setChats(prevChats => {
          const chatIndex = prevChats.findIndex(chat => chat.oferta_id === event.oferta_id);
          if (chatIndex !== -1) {
            const chatActualizado = { ...prevChats[chatIndex] };
            chatActualizado.ultimo_mensaje = {
              id: event.mensaje_id,
              mensaje: event.mensaje,
              fecha_envio: event.timestamp,
              es_propio: event.es_proveedor,
              leido: false,
            };
            if (!event.es_proveedor) {
              chatActualizado.mensajes_no_leidos = (chatActualizado.mensajes_no_leidos || 0) + 1;
              setChatHighlighted(event.oferta_id);
              setTimeout(() => setChatHighlighted(null), 2000);
            }
            const nuevosChats = [chatActualizado, ...prevChats.filter((_, index) => index !== chatIndex)];
            const nuevoTotal = nuevosChats.reduce((sum: number, chat: any) => sum + chat.mensajes_no_leidos, 0);
            actualizarTotal(nuevoTotal);
            return nuevosChats;
          } else {
            cargarChats(true);
            return prevChats;
          }
        });
      }
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated, usuario]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && usuario) {
        cargarChats();
      } else {
        setChats([]);
        setLoading(false);
      }
    }, [isAuthenticated, usuario, cargarChats])
  );

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = parseISO(fechaStr);
      if (isToday(fecha)) return format(fecha, 'h:mm a', { locale: es });
      if (isYesterday(fecha)) return 'Ayer';
      return format(fecha, 'dd/MM/yy', { locale: es });
    } catch { return ''; }
  };

  const renderChatItem = useCallback(({ item }: { item: any }) => {
    const { oferta_id, otra_persona, vehiculo, ultimo_mensaje, mensajes_no_leidos } = item;
    const isHighlighted = chatHighlighted === oferta_id;
    const hasUnread = mensajes_no_leidos > 0;
    const vehiculoPill = formatVehiculoPillLabel(vehiculo);

    const handleOpenChat = () => {
      if (hasUnread) {
        setChats(prev => prev.map(c => c.oferta_id === oferta_id ? { ...c, mensajes_no_leidos: 0 } : c));
        decrementarNoLeidos(mensajes_no_leidos);
      }
      router.push(`/chat-oferta/${oferta_id}`);
    };

    return (
      <TouchableOpacity
        style={[styles.chatCard, isHighlighted && styles.chatCardHighlighted]}
        onPress={handleOpenChat}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {otra_persona?.foto ? (
          <Image source={{ uri: otra_persona.foto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={22} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        )}

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
              {otra_persona?.nombre || 'Cliente'}
            </Text>
            <Text style={[styles.chatDate, hasUnread && styles.chatDateUnread]}>
              {formatearFecha(ultimo_mensaje.fecha_envio)}
            </Text>
          </View>

          {!!vehiculoPill && (
            <View style={styles.vehiclePill}>
              <Text style={styles.vehiclePillText} numberOfLines={1}>
                {vehiculoPill}
              </Text>
            </View>
          )}

          <View style={styles.chatMessageRow}>
            {ultimo_mensaje.es_propio && (
              <>
                {ultimo_mensaje.leido ? (
                  <CheckCheck size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 4 }} />
                ) : (
                  <Check size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 4 }} />
                )}
              </>
            )}
            <Text
              style={[styles.chatMessage, hasUnread && !ultimo_mensaje.es_propio && styles.chatMessageUnread]}
              numberOfLines={1}
            >
              {ultimo_mensaje.es_propio ? 'Tú: ' : ''}{ultimo_mensaje.mensaje}
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
      </TouchableOpacity>
    );
  }, [chatHighlighted, decrementarNoLeidos]);

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
            keyExtractor={(item) => item.oferta_id}
            contentContainerStyle={[styles.listContainer, chats.length === 0 && styles.listContainerEmpty]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} colors={[I.primary]} />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  separator: {
    height: SPACING.sm,
  },

  // Chat card
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
