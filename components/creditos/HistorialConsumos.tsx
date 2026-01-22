import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ConsumoCredito } from '@/services/creditosService';

interface HistorialConsumosProps {
  consumos: ConsumoCredito[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const HistorialConsumos: React.FC<HistorialConsumosProps> = ({
  consumos,
  onRefresh,
  refreshing = false,
}) => {
  const theme = useTheme();
  
  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';
  
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);
  };
  
  const renderItem = ({ item }: { item: ConsumoCredito }) => (
    <View style={[styles.item, { backgroundColor: backgroundPaper, borderColor: borderMain }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <MaterialIcons 
            name="receipt" 
            size={20} 
            color={primaryColor} 
          />
          <View style={styles.itemInfo}>
            <Text style={[styles.itemServicio, { color: textPrimary }]}>
              {item.servicio_nombre}
            </Text>
            <Text style={[styles.itemFecha, { color: textSecondary }]}>
              {formatearFecha(item.fecha_consumo)}
            </Text>
          </View>
        </View>
        <View style={styles.creditosContainer}>
          <Text style={[styles.creditos, { color: primaryColor }]}>
            -{item.creditos_consumidos}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: textSecondary }]}>Precio crédito:</Text>
          <Text style={[styles.detailValue, { color: textPrimary }]}>
            {formatearPrecio(item.precio_credito)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: textSecondary }]}>Oferta ID:</Text>
          <Text style={[styles.detailValue, { color: textPrimary }]}>
            {item.oferta_id.substring(0, 8)}...
          </Text>
        </View>
      </View>
    </View>
  );
  
  if (consumos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="receipt" size={48} color={textSecondary} />
        <Text style={[styles.emptyText, { color: textSecondary }]}>
          No hay consumos registrados
        </Text>
      </View>
    );
  }
  
  return (
    <FlatList
      data={consumos}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      style={styles.flatList}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
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
  itemServicio: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: SPACING.xs / 2,
  },
  itemFecha: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  creditosContainer: {
    alignItems: 'flex-end',
  },
  creditos: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
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
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

