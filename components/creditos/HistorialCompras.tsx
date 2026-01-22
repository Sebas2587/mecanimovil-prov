import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import creditosService, { CompraCreditos } from '@/services/creditosService';

interface HistorialComprasProps {
  compras: CompraCreditos[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const HistorialCompras: React.FC<HistorialComprasProps> = ({
  compras,
  onRefresh,
  refreshing = false,
}) => {
  const theme = useTheme();
  const [procesando, setProcesando] = useState<number | null>(null);
  
  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const successColor = colors?.success?.main || '#3DB6B1';
  const warningColor = colors?.warning?.main || '#FFB84D';
  const errorColor = colors?.error?.main || '#FF5555';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';
  
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatearFechaCompleta = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getMetodoPagoDisplay = (item: CompraCreditos) => {
    if (item.metodo_pago_display) {
      return item.metodo_pago_display;
    }
    switch (item.metodo_pago) {
      case 'mercadopago':
        return 'Mercado Pago';
      case 'transferencia':
        return 'Transferencia Bancaria';
      case 'migracion':
        return 'Migración de Suscripción';
      default:
        return item.metodo_pago || 'No especificado';
    }
  };
  
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);
  };
  
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return successColor;
      case 'pendiente':
        return warningColor;
      case 'cancelada':
      case 'reembolsada':
        return errorColor;
      default:
        return textSecondary;
    }
  };

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'mercadopago':
        return 'credit-card';
      case 'transferencia':
        return 'account-balance';
      case 'migracion':
        return 'swap-horiz';
      default:
        return 'payment';
    }
  };

  const getMetodoPagoColor = (metodo: string) => {
    switch (metodo) {
      case 'mercadopago':
        return primaryColor;
      case 'transferencia':
        return successColor;
      case 'migracion':
        return textSecondary;
      default:
        return textSecondary;
    }
  };
  
  // Verificar estado del pago
  const handleVerificarPago = async (compra: CompraCreditos) => {
    try {
      setProcesando(compra.id);
      const result = await creditosService.verificarPago(compra.id);
      
      if (result.success && result.data) {
        const { status, mensaje, creditos_acreditados } = result.data;
        
        if (creditos_acreditados) {
          Alert.alert(
            '¡Pago Confirmado!',
            mensaje,
            [{ text: 'Excelente', onPress: onRefresh }]
          );
        } else if (status === 'rejected' || status === 'cancelled') {
          Alert.alert(
            'Pago No Exitoso',
            mensaje,
            [{ text: 'Entendido', onPress: onRefresh }]
          );
        } else {
          Alert.alert('Estado del Pago', mensaje);
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo verificar el pago');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar el estado del pago');
    } finally {
      setProcesando(null);
    }
  };
  
  // Reintentar pago (genera nueva URL de MP)
  const handleReintentarPago = async (compra: CompraCreditos) => {
    try {
      setProcesando(compra.id);
      const result = await creditosService.reintentarPago(compra.id);
      
      if (result.success && result.data && result.data.mercadopago) {
        const urlPago = result.data.mercadopago.init_point || result.data.mercadopago.sandbox_init_point;
        
        if (urlPago) {
          const canOpen = await Linking.canOpenURL(urlPago);
          if (canOpen) {
            await Linking.openURL(urlPago);
          } else {
            Alert.alert('Error', 'No se pudo abrir Mercado Pago');
          }
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo generar el link de pago');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo reintentar el pago');
    } finally {
      setProcesando(null);
    }
  };
  
  // Cancelar compra pendiente
  const handleCancelarCompra = async (compra: CompraCreditos) => {
    Alert.alert(
      'Cancelar Compra',
      '¿Estás seguro de que deseas cancelar esta compra? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcesando(compra.id);
              const result = await creditosService.cancelarCompra(compra.id);
              
              if (result.success) {
                Alert.alert(
                  'Compra Cancelada',
                  'La compra ha sido cancelada exitosamente.',
                  [{ text: 'OK', onPress: onRefresh }]
                );
              } else {
                Alert.alert('Error', result.error || 'No se pudo cancelar la compra');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la compra');
            } finally {
              setProcesando(null);
            }
          },
        },
      ]
    );
  };
  
  const renderItem = ({ item }: { item: CompraCreditos }) => {
    const isPendiente = item.estado === 'pendiente';
    const isMercadoPago = item.metodo_pago === 'mercadopago';
    const isProcessing = procesando === item.id;
    
    return (
      <View style={[styles.item, { backgroundColor: backgroundPaper, borderColor: borderMain }]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <MaterialIcons 
              name="shopping-cart" 
              size={20} 
              color={getEstadoColor(item.estado)} 
            />
            <View style={styles.itemInfo}>
              <Text style={[styles.itemNombre, { color: textPrimary }]}>
                {item.paquete.nombre}
              </Text>
              <Text style={[styles.itemFecha, { color: textSecondary }]}>
                {formatearFecha(item.fecha_compra)}
              </Text>
            </View>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) + '20' }]}>
            <Text style={[styles.estadoText, { color: getEstadoColor(item.estado) }]}>
              {item.estado_display}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: textSecondary }]}>Créditos:</Text>
            <Text style={[styles.detailValue, { color: textPrimary }]}>
              {item.cantidad_creditos}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: textSecondary }]}>Precio:</Text>
            <Text style={[styles.detailValue, { color: textPrimary }]}>
              {formatearPrecio(item.precio_total)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
              <MaterialIcons 
                name={getMetodoPagoIcon(item.metodo_pago)} 
                size={16} 
                color={getMetodoPagoColor(item.metodo_pago)} 
              />
              <Text style={[styles.detailLabel, { color: textSecondary, marginLeft: SPACING.xs / 2 }]}>Método:</Text>
            </View>
            <View style={[styles.metodoBadge, { backgroundColor: getMetodoPagoColor(item.metodo_pago) + '20' }]}>
              <Text style={[styles.metodoText, { color: getMetodoPagoColor(item.metodo_pago) }]}>
                {getMetodoPagoDisplay(item)}
              </Text>
            </View>
          </View>
          {item.fecha_expiracion_creditos && item.estado === 'completada' && (
            <View style={styles.detailRow}>
              <View style={styles.detailRowLeft}>
                <MaterialIcons 
                  name="event" 
                  size={16} 
                  color={warningColor} 
                />
                <Text style={[styles.detailLabel, { color: textSecondary, marginLeft: SPACING.xs / 2 }]}>Expira:</Text>
              </View>
              <Text style={[styles.detailValue, { color: textPrimary }]}>
                {formatearFechaCompleta(item.fecha_expiracion_creditos)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Acciones para compras pendientes */}
        {isPendiente && (
          <View style={styles.actionsContainer}>
            {isProcessing ? (
              <View style={styles.loadingActions}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={[styles.loadingText, { color: textSecondary }]}>Procesando...</Text>
              </View>
            ) : (
              <>
                {/* Mensaje según método de pago */}
                <View style={[styles.pendingMessage, { backgroundColor: warningColor + '10' }]}>
                  <MaterialIcons name="info-outline" size={16} color={warningColor} />
                  <Text style={[styles.pendingMessageText, { color: textSecondary }]}>
                    {isMercadoPago 
                      ? 'Pago pendiente. Verifica el estado o reintenta el pago.'
                      : 'Esperando confirmación de transferencia.'}
                  </Text>
                </View>
                
                <View style={styles.actionsButtons}>
                  {isMercadoPago && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: primaryColor }]}
                        onPress={() => handleVerificarPago(item)}
                      >
                        <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Verificar Pago</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonOutline, { borderColor: primaryColor }]}
                        onPress={() => handleReintentarPago(item)}
                      >
                        <MaterialIcons name="payment" size={16} color={primaryColor} />
                        <Text style={[styles.actionButtonTextOutline, { color: primaryColor }]}>
                          Pagar
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger, { borderColor: errorColor }]}
                    onPress={() => handleCancelarCompra(item)}
                  >
                    <MaterialIcons name="close" size={16} color={errorColor} />
                    <Text style={[styles.actionButtonTextOutline, { color: errorColor }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };
  
  if (compras.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={48} color={textSecondary} />
        <Text style={[styles.emptyText, { color: textSecondary }]}>
          No hay compras registradas
        </Text>
      </View>
    );
  }
  
  // Separar compras pendientes y completadas
  const comprasPendientes = compras.filter(c => c.estado === 'pendiente');
  const comprasOtras = compras.filter(c => c.estado !== 'pendiente');
  const comprasOrdenadas = [...comprasPendientes, ...comprasOtras];
  
  return (
    <FlatList
      data={comprasOrdenadas}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      style={styles.flatList}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        comprasPendientes.length > 0 ? (
          <View style={[styles.pendingBanner, { backgroundColor: warningColor + '20', borderColor: warningColor }]}>
            <MaterialIcons name="pending-actions" size={20} color={warningColor} />
            <Text style={[styles.pendingBannerText, { color: textPrimary }]}>
              Tienes {comprasPendientes.length} compra{comprasPendientes.length > 1 ? 's' : ''} pendiente{comprasPendientes.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  list: {
    padding: SPACING.md,
  },
  item: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    marginBottom: SPACING.xs / 2,
  },
  itemFecha: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
  },
  estadoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  estadoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium as any,
  },
  itemDetails: {
    gap: SPACING.xs / 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium as any,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metodoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 6,
  },
  metodoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  // Estilos para acciones de compras pendientes
  actionsContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  loadingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  pendingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  pendingMessageText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  actionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonTextOutline: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  pendingBannerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium as any,
  },
});
