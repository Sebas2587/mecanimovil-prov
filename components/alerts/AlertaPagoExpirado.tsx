/**
 * AlertaPagoExpirado Component - MecaniMóvil Proveedores
 * Componente snackbar para alertar al proveedor sobre pago expirado o cancelación
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

const { width: screenWidth } = Dimensions.get('window');

interface AlertaPagoExpiradoProps {
  visible: boolean;
  mensaje: string;
  tipo: 'expirado' | 'cancelado';
  ofertaId?: string;
  solicitudId?: string;
  creditosDevueltos?: boolean;
  onDismiss: () => void;
  duration?: number; // Duración en ms antes de auto-ocultar (0 = no auto-ocultar)
}

export default function AlertaPagoExpirado({
  visible,
  mensaje,
  tipo,
  ofertaId,
  solicitudId,
  creditosDevueltos = false,
  onDismiss,
  duration = 0, // Por defecto no auto-ocultar
}: AlertaPagoExpiradoProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Obtener colores del sistema de diseño
  const safeColors = theme?.colors || COLORS || {};
  const safeSpacing = theme?.spacing || SPACING || {};
  const safeTypography = theme?.typography || TYPOGRAPHY || {};
  const safeShadows = theme?.shadows || SHADOWS || {};
  const safeBorders = theme?.borders || BORDERS || {};

  const errorObj = safeColors?.error as any;
  const warningObj = safeColors?.warning as any;
  const successObj = safeColors?.success as any;

  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const successColor = successObj?.main || successObj?.['500'] || '#00C9A7';

  // Determinar color según tipo
  const backgroundColor = tipo === 'expirado' ? errorColor : warningColor;
  const iconName = tipo === 'expirado' ? 'close-circle-outline' : 'information-circle-outline';
  const textColor = '#FFFFFF';

  useEffect(() => {
    if (visible) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-ocultar si hay duración
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  if (!visible) {
    return null;
  }

  const spacingMd = safeSpacing?.md || 16;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingXs = safeSpacing?.xs || 4;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeSm = safeTypography?.fontSize?.sm || 12;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const radiusLg = safeBorders?.radius?.lg || 12;
  const shadowMd = safeShadows?.md || {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + spacingMd,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor: backgroundColor,
            borderRadius: radiusLg,
            paddingHorizontal: spacingMd,
            paddingVertical: spacingMd - 2,
            ...shadowMd,
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={24}
          color={textColor}
          style={styles.icon}
        />
        <View style={styles.content}>
          <Text
            style={[
              styles.message,
              {
                color: textColor,
                fontSize: fontSizeBase,
                fontWeight: fontWeightMedium,
              },
            ]}
            numberOfLines={2}
          >
            {mensaje}
          </Text>
          {creditosDevueltos && (
            <Text
              style={[
                styles.submessage,
                {
                  color: textColor,
                  fontSize: fontSizeSm,
                  opacity: 0.9,
                },
              ]}
            >
              Los créditos han sido devueltos a tu cuenta.
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING?.md || 16,
    right: SPACING?.md || 16,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  icon: {
    marginRight: SPACING?.sm || 8,
  },
  content: {
    flex: 1,
    marginRight: SPACING?.sm || 8,
  },
  message: {
    marginBottom: SPACING?.xs || 4,
  },
  submessage: {
    marginTop: SPACING?.xs || 4,
  },
  closeButton: {
    padding: SPACING?.xs || 4,
  },
});
