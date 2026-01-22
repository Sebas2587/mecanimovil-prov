import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { OfertaProveedor } from '@/services/solicitudesService';

interface OfertaCardProps {
  oferta: OfertaProveedor;
  onPress: () => void;
}

export const OfertaCard: React.FC<OfertaCardProps> = ({
  oferta,
  onPress,
}) => {

  // Obtener color, texto del estado y información adicional
  const getEstadoInfo = () => {
    switch (oferta.estado) {
      case 'enviada':
        return { 
          color: '#007AFF', 
          text: 'Enviada', 
          icon: 'send',
          canWork: false,
          subtitle: null
        };
      case 'vista':
        return { 
          color: '#5856D6', 
          text: 'Vista por Cliente', 
          icon: 'visibility',
          canWork: false,
          subtitle: 'Cliente revisando tu oferta'
        };
      case 'en_chat':
        return { 
          color: '#FF9500', 
          text: 'En Conversación', 
          icon: 'chat',
          canWork: false,
          subtitle: 'Conversando con el cliente'
        };
      case 'aceptada':
        return { 
          color: '#10B981', 
          text: '¡Aceptada!', 
          icon: 'check-circle',
          canWork: false,
          subtitle: '⏳ Esperando confirmación de pago',
          warning: true
        };
      case 'pendiente_pago':
        return { 
          color: '#F59E0B', 
          text: 'Cliente Pagando...', 
          icon: 'payment',
          canWork: false,
          subtitle: '💳 Pago en proceso',
          warning: true
        };
      case 'pagada_parcialmente':
        return { 
          color: '#F59E0B', 
          text: 'Pagada Parcialmente', 
          icon: 'payment',
          canWork: false,
          subtitle: '⏳ Cliente pagó repuestos, pendiente servicio',
          warning: true
        };
      case 'pagada':
        return { 
          color: '#059669', 
          text: '¡Pagada!', 
          icon: 'paid',
          canWork: true,
          subtitle: '✅ Listo para trabajar',
          success: true
        };
      case 'rechazada':
        return { 
          color: '#FF3B30', 
          text: 'Rechazada', 
          icon: 'cancel',
          canWork: false,
          subtitle: null
        };
      case 'retirada':
        return { 
          color: '#8E8E93', 
          text: 'Retirada', 
          icon: 'undo',
          canWork: false,
          subtitle: null
        };
      case 'expirada':
        return { 
          color: '#8E8E93', 
          text: 'Expirada', 
          icon: 'schedule',
          canWork: false,
          subtitle: null
        };
      default:
        return { 
          color: '#8E8E93', 
          text: oferta.estado, 
          icon: 'info',
          canWork: false,
          subtitle: null
        };
    }
  };

  const estadoInfo = getEstadoInfo();

  // Formatear fecha
  const formatearFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return fecha;
    }
  };

  // Formatear precio
  const formatearPrecio = (precio: string): string => {
    try {
      const num = parseFloat(precio);
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(num);
    } catch {
      return precio;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Badge para ofertas secundarias */}
      {oferta.es_oferta_secundaria && (
        <View style={styles.badgeSecundaria}>
          <MaterialIcons name="add-circle" size={14} color="#FFFFFF" />
          <Text style={styles.badgeSecundariaText}>SERVICIO ADICIONAL</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.estadoBadge, { backgroundColor: `${estadoInfo.color}15` }]}>
            <MaterialIcons 
              name={estadoInfo.icon as any} 
              size={14} 
              color={estadoInfo.color} 
            />
            <Text style={[styles.estadoText, { color: estadoInfo.color }]}>
              {estadoInfo.text}
            </Text>
          </View>
          {estadoInfo.subtitle && (
            <Text style={[
              styles.subtitle, 
              { color: estadoInfo.warning ? '#F59E0B' : estadoInfo.success ? '#059669' : '#6c757d' }
            ]}>
              {estadoInfo.subtitle}
            </Text>
          )}
        </View>
        <Text style={styles.fecha}>
          {formatearFecha(oferta.fecha_envio)}
        </Text>
      </View>

      {/* Banner informativo para estados críticos */}
      {(estadoInfo.warning || estadoInfo.success) && (
        <View style={[
          styles.infoBanner,
          { 
            backgroundColor: estadoInfo.success ? '#05966915' : '#F59E0B15',
            borderLeftColor: estadoInfo.success ? '#059669' : '#F59E0B'
          }
        ]}>
          <MaterialIcons 
            name={estadoInfo.success ? 'check-circle' : 'info'} 
            size={16} 
            color={estadoInfo.success ? '#059669' : '#F59E0B'} 
          />
          <Text style={[
            styles.infoBannerText,
            { color: estadoInfo.success ? '#059669' : '#F59E0B' }
          ]}>
            {estadoInfo.success 
              ? 'Puedes dirigirte al servicio en la fecha acordada' 
              : 'No te dirijas al servicio hasta confirmar el pago'}
          </Text>
        </View>
      )}

      {/* Información de pago parcial */}
      {oferta.estado === 'pagada_parcialmente' && (
        <View style={[styles.pagoParcialCard, { backgroundColor: '#FFF3E0', borderColor: '#F59E0B' }]}>
          <View style={styles.pagoParcialHeader}>
            <MaterialIcons name="payment" size={18} color="#F59E0B" />
            <Text style={[styles.pagoParcialTitulo, { color: '#F59E0B' }]}>
              Pago Parcial Realizado
            </Text>
          </View>
          
          {oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente' && (
            <>
              <View style={styles.pagoParcialInfoRow}>
                <Text style={styles.pagoParcialLabel}>✅ Repuestos y gestión de compra:</Text>
                <Text style={styles.pagoParcialMonto}>
                  ${(() => {
                    const costoRepuestos = parseFloat(oferta.costo_repuestos || '0');
                    const costoGestion = parseFloat(oferta.costo_gestion_compra || '0');
                    return Math.round(costoRepuestos + (costoGestion * 1.19)).toLocaleString('es-CL');
                  })()}
                </Text>
              </View>
              
              {oferta.costo_mano_obra && parseFloat(oferta.costo_mano_obra) > 0 && (
                <View style={styles.pagoParcialInfoRow}>
                  <Text style={styles.pagoParcialLabel}>⏳ Pendiente (mano de obra):</Text>
                  <Text style={[styles.pagoParcialMonto, { color: '#F59E0B' }]}>
                    ${Math.round(parseFloat(oferta.costo_mano_obra) * 1.19).toLocaleString('es-CL')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Información del Cliente y Vehículo */}
      {oferta.solicitud_detail && (
        <View style={styles.clientVehicleContainer}>
          <View style={styles.clientInfoRow}>
            {oferta.solicitud_detail.cliente_foto ? (
              <Image 
                source={{ uri: oferta.solicitud_detail.cliente_foto }} 
                style={styles.clientAvatar} 
              />
            ) : (
              <View style={styles.clientAvatarPlaceholder}>
                <MaterialIcons name="person" size={20} color="#FFF" />
              </View>
            )}
            <View style={styles.clientTextContainer}>
              <Text style={styles.clientName}>
                {oferta.solicitud_detail.cliente_nombre || 'Cliente'}
              </Text>
              {oferta.solicitud_detail.vehiculo && (
                <View style={styles.vehicleInfo}>
                  <MaterialIcons name="directions-car" size={14} color="#666" />
                  <Text style={styles.vehicleText}>
                    {oferta.solicitud_detail.vehiculo.marca} {oferta.solicitud_detail.vehiculo.modelo}
                    {oferta.solicitud_detail.vehiculo.año && ` ${oferta.solicitud_detail.vehiculo.año}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.precioContainer}>
          {/* Mostrar monto pagado si es pago parcial, o total si es completo */}
          {oferta.estado === 'pagada_parcialmente' && 
           oferta.estado_pago_repuestos === 'pagado' && 
           oferta.estado_pago_servicio === 'pendiente' ? (
            <View style={styles.precioParcialContainer}>
              <Text style={styles.precio}>
                {formatearPrecio((() => {
                  const costoRepuestos = parseFloat(oferta.costo_repuestos || '0');
                  const costoGestion = parseFloat(oferta.costo_gestion_compra || '0');
                  return Math.round(costoRepuestos + (costoGestion * 1.19));
                })())}
              </Text>
              <Text style={styles.precioParcialLabel}>Pagado (parcial)</Text>
              <Text style={styles.precioTotalLabel}>
                Total: {formatearPrecio(oferta.precio_total_ofrecido)}
              </Text>
            </View>
          ) : (
            <Text style={styles.precio}>
              {formatearPrecio(oferta.precio_total_ofrecido)}
            </Text>
          )}
          {oferta.incluye_repuestos && (
            <View style={[styles.repuestosBadge, { backgroundColor: '#34C75915' }]}>
              <MaterialIcons name="build" size={12} color="#34C759" />
              <Text style={[styles.repuestosText, { color: '#34C759' }]}>
                Incluye repuestos
              </Text>
            </View>
          )}
        </View>

        {oferta.descripcion_oferta && (
          <Text 
            style={styles.descripcion}
            numberOfLines={2}
          >
            {oferta.descripcion_oferta}
          </Text>
        )}

        <View style={styles.detalles}>
          {oferta.fecha_disponible && (
            <View style={styles.detalleItem}>
              <MaterialIcons name="calendar-today" size={14} color="#6c757d" />
              <Text style={styles.detalleText}>
                {new Date(oferta.fecha_disponible).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
                {oferta.hora_disponible && ` • ${oferta.hora_disponible.substring(0, 5)}`}
              </Text>
            </View>
          )}

          {oferta.tiempo_estimado_total && (
            <View style={styles.detalleItem}>
              <MaterialIcons name="schedule" size={14} color="#6c757d" />
              <Text style={styles.detalleText}>
                {oferta.tiempo_estimado_total}
              </Text>
            </View>
          )}

          {oferta.detalles_servicios_detail && oferta.detalles_servicios_detail.length > 0 && (
            <View style={styles.detalleItem}>
              <MaterialIcons name="build" size={14} color="#6c757d" />
              <Text style={styles.detalleText}>
                {oferta.detalles_servicios_detail.length} servicio{oferta.detalles_servicios_detail.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <MaterialIcons name="chevron-right" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeSecundaria: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeSecundariaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },
  fecha: {
    fontSize: 12,
    marginLeft: 8,
    color: '#6c757d',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 3,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  pagoParcialCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  pagoParcialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pagoParcialTitulo: {
    fontSize: 14,
    fontWeight: '600',
  },
  pagoParcialInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pagoParcialLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  pagoParcialMonto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    lineHeight: 16,
  },
  
  // Cliente y Vehículo
  clientVehicleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginBottom: 16,
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
  },
  clientAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0061FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientTextContainer: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  content: {
    marginBottom: 8,
  },
  precioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  precio: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  precioParcialContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  precioParcialLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  precioTotalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  repuestosText: {
    fontSize: 10,
    fontWeight: '600',
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6c757d',
    marginBottom: 12,
  },
  detalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detalleText: {
    fontSize: 12,
    color: '#6c757d',
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
});
