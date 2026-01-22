import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { PaqueteCreditos } from '@/services/creditosService';

interface PaqueteCardProps {
  paquete: PaqueteCreditos;
  destacado?: boolean;
  onPress: () => void;
}

export const PaqueteCard: React.FC<PaqueteCardProps> = ({
  paquete,
  destacado = false,
  onPress,
}) => {
  const theme = useTheme();
  
  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const successColor = colors?.success?.main || '#3DB6B1';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';
  
  const precioFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(paquete.precio);
  
  const precioPorCreditoFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(paquete.precio_por_credito);
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: backgroundPaper,
          borderColor: destacado ? primaryColor : borderMain,
          borderWidth: destacado ? 2 : 1,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {destacado && (
        <View style={[styles.badge, { backgroundColor: primaryColor }]}>
          <Text style={styles.badgeText}>Recomendado</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={[styles.nombre, { color: textPrimary }]}>
          {paquete.nombre}
        </Text>
        {paquete.bonificacion_creditos > 0 && (
          <View style={[styles.bonificacion, { backgroundColor: successColor + '20' }]}>
            <MaterialIcons name="card-giftcard" size={16} color={successColor} />
            <Text style={[styles.bonificacionText, { color: successColor }]}>
              +{paquete.bonificacion_creditos} gratis
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.creditosContainer}>
        <Text style={[styles.creditos, { color: primaryColor }]}>
          {paquete.total_creditos}
        </Text>
        <Text style={[styles.creditosLabel, { color: textSecondary }]}>
          créditos
        </Text>
      </View>
      
      <View style={styles.precioContainer}>
        <Text style={[styles.precio, { color: textPrimary }]}>
          {precioFormateado}
        </Text>
        <Text style={[styles.precioPorCredito, { color: textSecondary }]}>
          {precioPorCreditoFormateado} por crédito
        </Text>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: primaryColor }]}
          onPress={onPress}
        >
          <Text style={styles.buttonText}>Comprar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  nombre: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
  },
  bonificacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
    marginLeft: SPACING.xs,
  },
  bonificacionText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  creditosContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  creditos: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.fontSize['3xl'] * 1.2,
  },
  creditosLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  precioContainer: {
    marginBottom: SPACING.md,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs / 2,
  },
  precioPorCredito: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  footer: {
    marginTop: SPACING.sm,
  },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

