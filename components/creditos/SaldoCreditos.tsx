import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { router } from 'expo-router';

interface SaldoCreditosProps {
  saldo: number;
  ganancias?: number;
  onPress?: () => void;
}

export const SaldoCreditos: React.FC<SaldoCreditosProps> = ({
  saldo,
  ganancias,
  onPress,
}) => {
  const theme = useTheme();

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const successColor = colors?.success?.main || '#3DB6B1';
  const warningColor = colors?.warning?.main || '#FFB84D';
  const errorColor = colors?.error?.main || '#FF5555';
  const neutralGray = colors?.neutral?.gray?.['200'] || '#EEEEEE';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';

  // Determinar color según el saldo
  const getColorEstado = () => {
    if (saldo === 0) return errorColor;
    if (saldo < 10) return warningColor;
    return successColor;
  };

  const colorEstado = getColorEstado();

  // Determinar icono según el estado
  const getIcono = () => {
    if (saldo === 0) return 'error-outline';
    if (saldo < 10) return 'warning';
    return 'account-balance-wallet';
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/creditos');
    }
  };

  // Obtener color de fondo suave según el estado
  const getBackgroundColor = () => {
    if (saldo === 0) return errorColor + '15';
    if (saldo < 10) return warningColor + '15';
    return successColor + '15';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: backgroundPaper,
        borderColor: colorEstado + '30',
        borderWidth: 1,
      }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        {/* Sección de Créditos */}
        <View style={styles.section}>
          <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor() }]}>
            <MaterialIcons
              name={getIcono() as any}
              size={24}
              color={colorEstado}
            />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.title, { color: textSecondary }]}>
              Créditos
            </Text>
            <View style={styles.valueContainer}>
              <Text style={[styles.saldo, { color: colorEstado }]}>
                {saldo}
              </Text>
              <Text style={[styles.unitLabel, { color: textSecondary }]}>disp.</Text>
            </View>
          </View>
        </View>

        {/* Separador vertical si hay ganancias */}
        {ganancias !== undefined && (
          <View style={[styles.separator, { backgroundColor: neutralGray }]} />
        )}

        {/* Sección de Ganancias (si existe) */}
        {ganancias !== undefined && (
          <View style={styles.section}>
            <View style={[styles.iconContainer, { backgroundColor: successColor + '15' }]}>
              <MaterialIcons
                name="attach-money"
                size={24}
                color={successColor}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.title, { color: textSecondary }]}>
                Ganancias
              </Text>
              <View style={styles.valueContainer}>
                <Text style={[styles.gananciasValue, { color: textPrimary }]}>
                  {formatCurrency(ganancias)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Flecha indicadora */}
        <View style={styles.arrowContainer}>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={textSecondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  separator: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  saldo: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  gananciasValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  unitLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  arrowContainer: {
    marginLeft: SPACING.xs,
    justifyContent: 'center',
  },
});

