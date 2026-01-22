import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';

interface AlertaCreditosBajosProps {
  saldo: number;
}

export const AlertaCreditosBajos: React.FC<AlertaCreditosBajosProps> = ({
  saldo,
}) => {
  const theme = useTheme();
  
  // Solo mostrar si el saldo es bajo
  if (saldo >= 10) {
    return null;
  }
  
  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const warningColor = colors?.warning?.main || '#FFB84D';
  const warningText = colors?.warning?.text || '#664422';
  const warningLight = colors?.warning?.light || colors?.warning?.['50'] || '#FFF8E6';
  
  return (
    <View 
      style={[styles.container, { backgroundColor: warningLight, borderColor: warningColor }]}
    >
      <View style={styles.content}>
        <MaterialIcons 
          name="warning" 
          size={18} 
          color={warningText} 
        />
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: warningText }]}>
            {saldo === 0 
              ? 'Sin créditos disponibles. Compra más para continuar.'
              : `Solo te quedan ${saldo} créditos. Compra más para no quedarte sin créditos.`
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: TYPOGRAPHY.fontSize.sm * 1.4,
  },
});

