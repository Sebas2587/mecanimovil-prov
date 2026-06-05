import React, { createContext, useState, useContext, useEffect } from 'react';
import solicitudesService from '@/services/solicitudesService';
import websocketService from '@/app/services/websocketService';
import { useAuth } from './AuthContext';

interface ChatsContextType {
  totalMensajesNoLeidos: number;
  cargarTotalNoLeidos: () => Promise<void>;
  decrementarNoLeidos: (cantidad: number) => void;
  resetearNoLeidos: () => void;
  actualizarTotal: (nuevoTotal: number) => void;
}

const ChatsContext = createContext<ChatsContextType | undefined>(undefined);

export const ChatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalMensajesNoLeidos, setTotalMensajesNoLeidos] = useState(0);
  const { usuario, estadoProveedor } = useAuth();

  // Cargar el total inicial de mensajes no leídos
  const cargarTotalNoLeidos = async () => {
    try {
      if (!usuario) {
        setTotalMensajesNoLeidos(0);
        return;
      }
      
      console.log('📊 [CHATS CONTEXT PROVEEDOR] Cargando total de mensajes no leídos');
      const chats = await solicitudesService.obtenerListaChats();
      const total = chats.reduce((sum, chat) => sum + (chat.mensajes_no_leidos || 0), 0);
      setTotalMensajesNoLeidos(total);
      console.log(`📊 [CHATS CONTEXT PROVEEDOR] Total mensajes no leídos: ${total}`);
    } catch (error: any) {
      // Si es 401, no hay sesión - no es un error crítico
      if (error.response?.status === 401) {
        console.log('⚠️ [CHATS CONTEXT PROVEEDOR] No autenticado, estableciendo total en 0');
        setTotalMensajesNoLeidos(0);
        return;
      }
      console.error('❌ [CHATS CONTEXT PROVEEDOR] Error cargando total de no leídos:', error);
      setTotalMensajesNoLeidos(0);
    }
  };

  // Cargar al iniciar y cuando cambie el usuario autenticado (por id, no por objeto completo)
  const usuarioId = usuario?.id;
  const onboardingListo = estadoProveedor?.onboarding_completado === true;

  useEffect(() => {
    if (usuarioId && onboardingListo) {
      cargarTotalNoLeidos();
    } else {
      setTotalMensajesNoLeidos(0);
    }
  }, [usuarioId, onboardingListo]);

  // Suscribirse a WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (!usuarioId || !onboardingListo) return;

    console.log('📨 [CHATS CONTEXT PROVEEDOR] Suscribiendo a nuevo_mensaje_chat');
    
    const unsubscribe = websocketService.onNuevoMensajeChat((event) => {
      console.log('📨 [CHATS CONTEXT PROVEEDOR] Nuevo mensaje recibido:', event);
      
      // Si el mensaje es del cliente (no del proveedor), incrementar contador
      if (!event.es_proveedor) {
        setTotalMensajesNoLeidos(prev => {
          const nuevoTotal = prev + 1;
          console.log(`📊 [CHATS CONTEXT PROVEEDOR] Total incrementado a: ${nuevoTotal}`);
          return nuevoTotal;
        });
      }
    });

    return () => {
      console.log('📨 [CHATS CONTEXT PROVEEDOR] Desuscribiendo de nuevo_mensaje_chat');
      unsubscribe();
    };
  }, [usuarioId, onboardingListo]);

  // Función para decrementar el contador (cuando se leen mensajes)
  const decrementarNoLeidos = (cantidad: number) => {
    setTotalMensajesNoLeidos(prev => Math.max(0, prev - cantidad));
    console.log(`📊 [CHATS CONTEXT PROVEEDOR] Total decrementado en ${cantidad}`);
  };

  // Función para resetear el contador
  const resetearNoLeidos = () => {
    setTotalMensajesNoLeidos(0);
    console.log('📊 [CHATS CONTEXT PROVEEDOR] Total reseteado');
  };

  // Función para actualizar manualmente el total
  const actualizarTotal = (nuevoTotal: number) => {
    setTotalMensajesNoLeidos(nuevoTotal);
    console.log(`📊 [CHATS CONTEXT PROVEEDOR] Total actualizado a: ${nuevoTotal}`);
  };

  return (
    <ChatsContext.Provider
      value={{
        totalMensajesNoLeidos,
        cargarTotalNoLeidos,
        decrementarNoLeidos,
        resetearNoLeidos,
        actualizarTotal,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};

export const useChats = (): ChatsContextType => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error('useChats debe usarse dentro de ChatsProvider');
  }
  return context;
};

