/**
 * AlertaPagoExpirado Component - MecaniMóvil Proveedores
 * Componente snackbar para alertar al proveedor sobre pago expirado o cancelación
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { Card, HOST_GUTTER } from '@/app/design-system/components';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;

interface AlertaPagoExpiradoProps {
  visible: boolean;
  mensaje: string;
  tipo: 'expirado' | 'cancelado';
  ofertaId?: string;
  solicitudId?: string;
  creditosDevueltos?: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function AlertaPagoExpirado({
  visible,
  mensaje,
  tipo,
  creditosDevueltos = false,
  onDismiss,
  duration = 0,
}: AlertaPagoExpiradoProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const statusTone = tipo === 'expirado' ? 'error' : 'warning';
  const status = institutionalStatusColors(statusTone);
  const backgroundColor = status.icon;
  const iconName = tipo === 'expirado' ? 'close-circle-outline' : 'information-circle-outline';
  const textColor = I.onPrimary;

  useEffect(() => {
    if (visible) {
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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + SPACING.md,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Card
        elevated
        padding="host"
        style={[styles.snackbar, { backgroundColor, borderColor: backgroundColor }]}
      >
        <InstitutionalIcon
          name={iconName}
          size={24}
          color={textColor}
          style={styles.icon}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <View style={styles.content}>
          <InstitutionalText role="body" color={textColor} numberOfLines={2}>
            {mensaje}
          </InstitutionalText>
          {creditosDevueltos ? (
            <InstitutionalText role="caption" color={textColor} style={styles.submessage}>
              Los créditos han sido devueltos a tu cuenta.
            </InstitutionalText>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <InstitutionalIcon name="close" size={20} color={textColor} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: HOST_GUTTER,
    right: HOST_GUTTER,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: BORDERS.radius.lg,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  content: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  submessage: {
    marginTop: SPACING.xs,
    opacity: 0.9,
  },
  closeButton: {
    padding: SPACING.xs,
  },
});
