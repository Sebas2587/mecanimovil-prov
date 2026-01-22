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

interface SnackbarProps {
  visible: boolean;
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Snackbar({
  visible,
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
  actionLabel,
  onAction,
}: SnackbarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Obtener colores del sistema de diseño
  const safeColors = theme?.colors || COLORS || {};
  const safeSpacing = theme?.spacing || SPACING || {};
  const safeTypography = theme?.typography || TYPOGRAPHY || {};
  const safeShadows = theme?.shadows || SHADOWS || {};
  const safeBorders = theme?.borders || BORDERS || {};

  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;

  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#007EA7';
  const successColor = successObj?.main || successObj?.['500'] || '#00C9A7';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const primaryColor = primaryObj?.['500'] || accentObj?.['500'] || '#003459';

  const spacingMd = safeSpacing?.md || 16;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingXs = safeSpacing?.xs || 4;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeSm = safeTypography?.fontSize?.sm || 12;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const radiusLg = safeBorders?.radius?.lg || 12;
  const shadowMd = safeShadows?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: successColor,
          textColor: COLORS?.text?.onSuccess || COLORS?.base?.white || '#FFFFFF',
          icon: 'checkmark-circle' as const,
        };
      case 'warning':
        return {
          backgroundColor: warningColor,
          textColor: COLORS?.text?.onWarning || COLORS?.base?.white || '#FFFFFF',
          icon: 'warning' as const,
        };
      case 'error':
        return {
          backgroundColor: errorColor,
          textColor: COLORS?.text?.onError || COLORS?.base?.white || '#FFFFFF',
          icon: 'close-circle' as const,
        };
      default: // 'info'
        return {
          backgroundColor: infoColor,
          textColor: COLORS?.text?.onInfo || COLORS?.base?.white || '#FFFFFF',
          icon: 'information-circle' as const,
        };
    }
  };

  const variantColors = getVariantColors();

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

      // Auto-ocultar después de la duración
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible, duration]);

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
            backgroundColor: variantColors.backgroundColor,
            borderRadius: radiusLg,
            paddingHorizontal: spacingMd,
            paddingVertical: spacingMd - 2,
            ...shadowMd,
          },
        ]}
      >
        <Ionicons
          name={variantColors.icon}
          size={20}
          color={variantColors.textColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.message,
            {
              color: variantColors.textColor,
              fontSize: fontSizeBase,
              fontWeight: fontWeightMedium,
            },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {actionLabel && onAction && (
          <TouchableOpacity
            onPress={() => {
              onAction();
              handleDismiss();
            }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: variantColors.textColor,
                  fontSize: fontSizeSm,
                  fontWeight: fontWeightSemibold,
                },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={variantColors.textColor} />
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
    minHeight: 48,
  },
  icon: {
    marginRight: SPACING?.sm || 8,
  },
  message: {
    flex: 1,
    marginRight: SPACING?.sm || 8,
  },
  actionButton: {
    paddingHorizontal: SPACING?.sm || 8,
    paddingVertical: SPACING?.xs || 4,
    marginRight: SPACING?.xs || 4,
    borderRadius: (BORDERS?.radius?.sm || 4) + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: SPACING?.xs || 4,
  },
});

