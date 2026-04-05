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
import { BlurView } from 'expo-blur';
import {
  MessageCircle, RefreshCw, User, Car, Check, CheckCheck,
} from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerListaChats } from '@/services/solicitudesService';
import websocketService from '../services/websocketService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { useChats } from '@/context/ChatsContext';
import { useAuth } from '@/context/AuthContext';

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
            <User size={22} color="#FFFFFF" />
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

          {vehiculo && (
            <View style={styles.chatVehicleRow}>
              <Car size={12} color="#9CA3AF" />
              <Text style={styles.chatVehicle} numberOfLines={1}>
                {vehiculo.marca} {vehiculo.modelo}
                {vehiculo.year && ` '${vehiculo.year.toString().slice(-2)}`}
                {vehiculo.patente && ` · ${vehiculo.patente}`}
              </Text>
            </View>
          )}

          <View style={styles.chatMessageRow}>
            {ultimo_mensaje.es_propio && (
              <>
                {ultimo_mensaje.leido ? (
                  <CheckCheck size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                ) : (
                  <Check size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
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
        <MessageCircle size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>Sin conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        Tus conversaciones con clientes aparecerán aquí
      </Text>
    </View>
  );

  return (
    <TabScreenWrapper>
      <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.3, 1]} style={styles.gradient}>
        <Header
          title="Chats"
          badge={totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : undefined}
          rightComponent={
            <TouchableOpacity style={styles.refreshBtn} onPress={() => cargarChats()} activeOpacity={0.7}>
              <RefreshCw size={20} color="#3B82F6" />
            </TouchableOpacity>
          }
        />

        {loading && chats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Cargando chats...</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.oferta_id}
            contentContainerStyle={[styles.listContainer, chats.length === 0 && styles.listContainerEmpty]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59,130,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 8,
  },

  // Chat card
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  chatCardHighlighted: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.2)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContent: {
    flex: 1,
    gap: 3,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  chatNameUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  chatDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chatDateUnread: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  chatVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatVehicle: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  chatMessage: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  chatMessageUnread: {
    fontWeight: '600',
    color: '#374151',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
