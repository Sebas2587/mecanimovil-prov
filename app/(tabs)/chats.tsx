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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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

  // Cargar chats - memoizado para evitar recreaciones innecesarias
  const cargarChats = useCallback(async (isRefreshing = false) => {
    try {
      // Verificar autenticación antes de cargar
      if (!isAuthenticated || !usuario) {
        console.log('⚠️ [CHATS PROVEEDOR] No autenticado, no se pueden cargar chats');
        setChats([]);
        actualizarTotal(0);
        return;
      }
      
      if (!isRefreshing) setLoading(true);
      const data = await obtenerListaChats();
      setChats(data);
      
      // Calcular total de mensajes no leídos y actualizar contexto
      const total = data.reduce((sum: number, chat: any) => sum + (chat.mensajes_no_leidos || 0), 0);
      actualizarTotal(total);
    } catch (error: any) {
      // Si es 401, no hay sesión - no es un error crítico
      if (error.response?.status === 401) {
        console.log('⚠️ [CHATS PROVEEDOR] No autenticado (401), estableciendo lista vacía');
        setChats([]);
        actualizarTotal(0);
        return;
      }
      console.error('❌ [CHATS PROVEEDOR] Error cargando chats:', error);
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

  // Suscribirse a WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    // Solo suscribirse si está autenticado
    if (!isAuthenticated || !usuario) {
      console.log('⚠️ [CHATS LIST PROVEEDOR] No autenticado, no suscribiendo a WebSocket');
      return;
    }
    
    console.log('📨 [CHATS LIST PROVEEDOR] Suscribiendo a nuevo_mensaje_chat');
    
    const unsubscribe = websocketService.onNuevoMensajeChat((event) => {
      console.log('📨 [CHATS LIST PROVEEDOR] Nuevo mensaje recibido vía WebSocket:', event);
      
      if (event.oferta_id) {
        // Actualizar el chat específico en tiempo real
        setChats(prevChats => {
          const chatIndex = prevChats.findIndex(chat => chat.oferta_id === event.oferta_id);
          
          if (chatIndex !== -1) {
            // Chat ya existe, actualizarlo
            const chatActualizado = { ...prevChats[chatIndex] };
            
            // Actualizar último mensaje
            chatActualizado.ultimo_mensaje = {
              id: event.mensaje_id,
              mensaje: event.mensaje,
              fecha_envio: event.timestamp,
              es_propio: event.es_proveedor, // Si es del proveedor, es propio
              leido: false,
            };
            
            // Incrementar contador de no leídos si el mensaje es del cliente
            if (!event.es_proveedor) {
              chatActualizado.mensajes_no_leidos = (chatActualizado.mensajes_no_leidos || 0) + 1;
              console.log(`📨 [CHATS LIST PROVEEDOR] Incrementado contador: ${chatActualizado.mensajes_no_leidos}`);
              
              // Activar efecto de highlight para este chat
              setChatHighlighted(event.oferta_id);
              setTimeout(() => {
                setChatHighlighted(null);
              }, 2000); // Highlight por 2 segundos
            }
            
            // Crear nueva lista con el chat actualizado al principio
            const nuevosChats = [
              chatActualizado,
              ...prevChats.filter((_, index) => index !== chatIndex)
            ];
            
            // Recalcular total de no leídos y actualizar contexto
            const nuevoTotal = nuevosChats.reduce((sum: number, chat: any) => sum + chat.mensajes_no_leidos, 0);
            actualizarTotal(nuevoTotal);
            
            console.log(`✅ [CHATS LIST PROVEEDOR] Chat actualizado y movido al principio`);
            return nuevosChats;
          } else {
            // Chat nuevo, recargar toda la lista
            console.log('📨 [CHATS LIST PROVEEDOR] Chat nuevo detectado, recargando lista completa');
            cargarChats(true);
            return prevChats;
          }
        });
      }
    });

    return () => {
      console.log('📨 [CHATS LIST PROVEEDOR] Desuscribiendo de nuevo_mensaje_chat');
      unsubscribe();
    };
  }, [isAuthenticated, usuario]);

  // Cargar chats cuando la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      // Solo cargar si está autenticado
      if (isAuthenticated && usuario) {
        cargarChats();
      } else {
        setChats([]);
        setLoading(false);
      }
    }, [isAuthenticated, usuario, cargarChats])
  );

  // Formatear fecha del último mensaje
  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = parseISO(fechaStr);
      if (isToday(fecha)) {
        return format(fecha, 'h:mm a', { locale: es });
      } else if (isYesterday(fecha)) {
        return 'Ayer';
      } else {
        return format(fecha, 'dd/MM/yy', { locale: es });
      }
    } catch (error) {
      return '';
    }
  };

  // Renderizar un chat item
  const renderChatItem = ({ item }: { item: any }) => {
    const {
      oferta_id,
      otra_persona,
      vehiculo,
      ultimo_mensaje,
      mensajes_no_leidos,
      estado_oferta,
    } = item;
    
    // Verificar si este chat tiene un nuevo mensaje (highlight)
    const isHighlighted = chatHighlighted === oferta_id;
    
    // Handler para abrir el chat y resetear contador localmente
    const handleOpenChat = () => {
      // Resetear contador de no leídos localmente (feedback inmediato)
      if (mensajes_no_leidos > 0) {
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.oferta_id === oferta_id) {
              return { ...chat, mensajes_no_leidos: 0 };
            }
            return chat;
          });
        });
        
        // Decrementar en el contexto
        decrementarNoLeidos(mensajes_no_leidos);
      }
      
      // Navegar al chat
      router.push(`/chat-oferta/${oferta_id}`);
    };

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isHighlighted && styles.chatItemHighlighted
        ]}
        onPress={handleOpenChat}
        activeOpacity={0.7}
      >
        {/* Foto de perfil */}
        <View style={styles.avatarContainer}>
          {otra_persona?.foto ? (
            <Image source={{ uri: otra_persona.foto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={32} color="#999" />
            </View>
          )}
        </View>

        {/* Información del chat */}
        <View style={styles.chatInfo}>
          {/* Línea 1: Nombre y hora */}
          <View style={styles.chatHeader}>
            <Text style={styles.chatNombre} numberOfLines={1}>
              {otra_persona?.nombre || 'Cliente'}
            </Text>
            <Text style={styles.chatFecha}>
              {formatearFecha(ultimo_mensaje.fecha_envio)}
            </Text>
          </View>

          {/* Línea 2: Vehículo */}
          {vehiculo && (
            <Text style={styles.chatVehiculo} numberOfLines={1}>
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.year && `'${vehiculo.year.toString().slice(-2)}`}
              {vehiculo.patente && ` • ${vehiculo.patente}`}
            </Text>
          )}

          {/* Línea 3: Último mensaje */}
          <View style={styles.mensajeContainer}>
            {ultimo_mensaje.es_propio && (
              <Text style={styles.tuMensaje}>Tú: </Text>
            )}
            <Text
              style={[
                styles.chatUltimoMensaje,
                mensajes_no_leidos > 0 && !ultimo_mensaje.es_propio && styles.chatUltimoMensajeNoLeido
              ]}
              numberOfLines={1}
            >
              {ultimo_mensaje.mensaje}
            </Text>
            {mensajes_no_leidos > 0 && (
              <View style={styles.badgeNoLeidos}>
                <Text style={styles.badgeNoLeidosText}>
                  {mensajes_no_leidos > 99 ? '99+' : mensajes_no_leidos}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Indicador de check si el mensaje es propio */}
        {ultimo_mensaje.es_propio && (
          <Ionicons
            name={ultimo_mensaje.leido ? "checkmark-done" : "checkmark"}
            size={18}
            color={ultimo_mensaje.leido ? "#0061FF" : "#999"}
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#CCC" />
      <Text style={styles.emptyTitle}>No tienes mensajes</Text>
      <Text style={styles.emptySubtitle}>
        Tus conversaciones con clientes aparecerán aquí
      </Text>
    </View>
  );

  return (
    <TabScreenWrapper>
      {/* Header consistente del sistema de diseño */}
      <Header
        title="Chats"
        badge={totalMensajesNoLeidos > 0 ? totalMensajesNoLeidos : undefined}
        rightComponent={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => cargarChats()}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#0061FF" />
          </TouchableOpacity>
        }
      />

      {/* Lista de chats */}
      {loading && chats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
          <Text style={styles.loadingText}>Cargando chats...</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.oferta_id}
          contentContainerStyle={[
            styles.listContainer,
            chats.length === 0 && styles.listContainerEmpty
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0061FF"
              colors={['#0061FF']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
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
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flexGrow: 1,
  },
  listContainerEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  chatItemHighlighted: {
    backgroundColor: '#E6F2FF', // Azul muy claro para el highlight
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatNombre: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  chatFecha: {
    fontSize: 13,
    color: '#8E8E93',
  },
  chatVehiculo: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  mensajeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tuMensaje: {
    fontSize: 15,
    color: '#8E8E93',
  },
  chatUltimoMensaje: {
    flex: 1,
    fontSize: 15,
    color: '#8E8E93',
  },
  chatUltimoMensajeNoLeido: {
    fontWeight: '600',
    color: '#000',
  },
  badgeNoLeidos: {
    backgroundColor: '#0061FF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNoLeidosText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});

