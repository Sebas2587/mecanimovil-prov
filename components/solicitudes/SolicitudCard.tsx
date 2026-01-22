import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SolicitudPublica } from '@/services/solicitudesService';

interface SolicitudCardProps {
  solicitud: SolicitudPublica;
  onPress: () => void;
  mostrarBadgeNuevo?: boolean;
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  onPress,
  mostrarBadgeNuevo = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Formatear tiempo restante
  const formatearTiempoRestante = (tiempoRestante?: string): string => {
    if (!tiempoRestante) return 'Tiempo no disponible';
    
    // El backend puede devolver en formato "X días, Y horas" o similar
    if (tiempoRestante.includes('día')) {
      return tiempoRestante;
    }
    
    // Intentar parsear si viene en otro formato
    return tiempoRestante;
  };

  // Obtener color de urgencia
  const getUrgenciaColor = (): string => {
    return solicitud.urgencia === 'urgente' ? '#FF3B30' : '#34C759';
  };

  // Obtener color de estado
  const getEstadoColor = (): string => {
    switch (solicitud.estado) {
      case 'publicada':
        return '#007AFF';
      case 'con_ofertas':
        return '#FF9500';
      case 'adjudicada':
        return '#34C759';
      case 'expirada':
        return '#8E8E93';
      case 'cancelada':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  // Obtener texto de estado
  const getEstadoTexto = (): string => {
    switch (solicitud.estado) {
      case 'publicada':
        return 'Publicada';
      case 'con_ofertas':
        return 'Con Ofertas';
      case 'adjudicada':
        return 'Adjudicada';
      case 'expirada':
        return 'Expirada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return solicitud.estado;
    }
  };

  // Truncar descripción
  const truncarDescripcion = (texto: string, maxLength: number = 100): string => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header con badge nuevo si aplica */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor() }]}>
            <Text style={styles.estadoTexto}>{getEstadoTexto()}</Text>
          </View>
          {mostrarBadgeNuevo && (
            <View style={styles.nuevoBadge}>
              <Text style={styles.nuevoTexto}>NUEVO</Text>
            </View>
          )}
        </View>
        {solicitud.urgencia === 'urgente' && (
          <View style={[styles.urgenciaBadge, { backgroundColor: getUrgenciaColor() }]}>
            <MaterialIcons name="priority-high" size={16} color="#FFFFFF" />
            <Text style={styles.urgenciaTexto}>URGENTE</Text>
          </View>
        )}
      </View>

      {/* Información del vehículo */}
      <View style={styles.vehiculoContainer}>
        <MaterialIcons name="directions-car" size={20} color={colors.text} />
        <Text style={[styles.vehiculoTexto, { color: colors.text }]}>
          {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
          {solicitud.vehiculo_info.año && ` ${solicitud.vehiculo_info.año}`}
        </Text>
      </View>

      {/* Descripción del problema */}
      <Text style={[styles.descripcion, { color: colors.text }]}>
        {truncarDescripcion(solicitud.descripcion_problema)}
      </Text>

      {/* Servicios solicitados */}
      {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 && (
        <View style={styles.serviciosContainer}>
          {solicitud.servicios_solicitados_detail.slice(0, 3).map((servicio, index) => (
            <View key={servicio.id || index} style={[styles.servicioBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.servicioTexto, { color: colors.tint }]}>
                {servicio.nombre}
              </Text>
            </View>
          ))}
          {solicitud.servicios_solicitados_detail.length > 3 && (
            <Text style={[styles.masServicios, { color: colors.text }]}>
              +{solicitud.servicios_solicitados_detail.length - 3} más
            </Text>
          )}
        </View>
      )}

      {/* Footer con información adicional */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <MaterialIcons name="access-time" size={16} color={colors.text} />
            <Text style={[styles.footerTexto, { color: colors.text }]}>
              {formatearTiempoRestante(solicitud.tiempo_restante)}
            </Text>
          </View>
          {solicitud.total_ofertas > 0 && (
            <View style={styles.footerItem}>
              <MaterialIcons name="local-offer" size={16} color={colors.tint} />
              <Text style={[styles.footerTexto, { color: colors.tint }]}>
                {solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  nuevoBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nuevoTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  urgenciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  urgenciaTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  vehiculoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  vehiculoTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviciosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  servicioBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  servicioTexto: {
    fontSize: 11,
    fontWeight: '500',
  },
  masServicios: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTexto: {
    fontSize: 12,
  },
});

