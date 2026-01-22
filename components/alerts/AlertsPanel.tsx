import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlerts, Alerta } from '@/context/AlertsContext';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS } from '@/app/design-system/tokens';

interface AlertsPanelProps {
  variant?: 'floating' | 'header';
  iconColor?: string;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ variant = 'floating', iconColor }) => {
  const { alertas, alertasNoLeidas, marcarComoLeida, eliminarAlerta } = useAlerts();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current; // Inicia fuera de la pantalla (derecha)
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (modalVisible) {
      // Animar entrada desde la derecha
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Resetear posición cuando se cierra
      slideAnim.setValue(400);
    }
  }, [modalVisible]);

  const handleAbrirPanel = () => {
    setModalVisible(true);
  };

  const handleCerrarPanel = () => {
    // Animar salida hacia la derecha antes de cerrar
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleAlertaPress = (alerta: Alerta) => {
    marcarComoLeida(alerta.id);
    
    if (alerta.accion) {
      setModalVisible(false);
      router.push(alerta.accion.ruta as any);
    }
  };

  const handleEliminarAlerta = (id: string) => {
    eliminarAlerta(id);
  };

  const getIconoAlerta = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'mercado_pago_no_configurado':
        return 'card-outline';
      case 'zonas_cobertura_no_configuradas':
        return 'location-outline';
      case 'creditos_bajos':
        return 'wallet-outline';
      case 'pago_expirado':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getColorAlerta = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'mercado_pago_no_configurado':
        return '#009EE3';
      case 'zonas_cobertura_no_configuradas':
        return '#4E4FEB';
      case 'creditos_bajos':
        return '#FFA500';
      case 'pago_expirado':
        return '#E74C3C';
      default:
        return '#666666';
    }
  };

  const alertasOrdenadas = [...alertas].sort((a, b) => {
    // Ordenar por prioridad y luego por fecha
    const prioridadOrder = { alta: 3, media: 2, baja: 1 };
    if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
      return prioridadOrder[b.prioridad] - prioridadOrder[a.prioridad];
    }
    return b.fecha.getTime() - a.fecha.getTime();
  });

  // Renderizar lista de alertas (compartida entre ambos variants)
  const renderAlertsList = () => (
    <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
      {alertasOrdenadas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No hay alertas</Text>
          <Text style={styles.emptySubtext}>
            Todo está configurado correctamente
          </Text>
        </View>
      ) : (
        alertasOrdenadas.map((alerta) => {
          const color = getColorAlerta(alerta.tipo);
          const icono = getIconoAlerta(alerta.tipo);

          return (
            <TouchableOpacity
              key={alerta.id}
              style={[
                styles.alertaItem,
                alerta.leida && styles.alertaLeida,
              ]}
              onPress={() => handleAlertaPress(alerta)}
              activeOpacity={0.7}
            >
              <View style={[styles.alertaIconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icono as any} size={24} color={color} />
              </View>
              
              <View style={styles.alertaContent}>
                <View style={styles.alertaHeader}>
                  <Text style={[styles.alertaTitulo, alerta.leida && styles.alertaTituloLeida]}>
                    {alerta.titulo}
                  </Text>
                  {!alerta.leida && <View style={styles.unreadDot} />}
                </View>
                
                <Text style={[styles.alertaMensaje, alerta.leida && styles.alertaMensajeLeida]}>
                  {alerta.mensaje}
                </Text>

                {alerta.accion && (
                  <View style={styles.alertaAccion}>
                    <Ionicons name="arrow-forward-circle" size={16} color={color} />
                    <Text style={[styles.alertaAccionTexto, { color }]}>
                      {alerta.accion.texto}
                    </Text>
                  </View>
                )}

                <Text style={styles.alertaFecha}>
                  {alerta.fecha.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleEliminarAlerta(alerta.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#999999" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  // Renderizar modal (compartido entre ambos variants)
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCerrarPanel}
    >
      <View style={styles.modalContainer}>
        {/* Fondo oscuro que se puede tocar para cerrar */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleCerrarPanel}
        />
        
        <SafeAreaView edges={['top', 'right']} style={styles.modalSafeArea}>
          {/* Contenido del modal - previene que se cierre al tocar dentro */}
          <Animated.View
            style={[
              styles.modalContentWrapper,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alertas</Text>
              <TouchableOpacity
                onPress={handleCerrarPanel}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Lista de alertas */}
            {renderAlertsList()}
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  // Si es variant header, solo retornar el icono sin el botón flotante
  if (variant === 'header') {
    const textColor = iconColor || theme?.colors?.text?.primary || COLORS?.text?.primary || '#000000';
    
    return (
      <>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleAbrirPanel}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={textColor} />
          {alertasNoLeidas > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {renderModal()}
      </>
    );
  }

  // Variant floating (botón flotante original)
  return (
    <>
      {/* Botón flotante de alertas */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAbrirPanel}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications" size={24} color="#FFFFFF" />
        {alertasNoLeidas > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {renderModal()}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4E4FEB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerButton: {
    position: 'relative',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSafeArea: {
    width: '85%',
    maxWidth: 400,
    height: '100%',
    zIndex: 1,
  },
  modalContentWrapper: {
    width: '100%',
    height: '100%',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  alertsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  alertaItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertaLeida: {
    opacity: 0.6,
    backgroundColor: '#F9F9F9',
  },
  alertaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertaContent: {
    flex: 1,
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertaTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  alertaTituloLeida: {
    color: '#666666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4E4FEB',
    marginLeft: 8,
  },
  alertaMensaje: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertaMensajeLeida: {
    color: '#999999',
  },
  alertaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  alertaAccionTexto: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  alertaFecha: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

