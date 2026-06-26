import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;

interface SnackbarProps {
  visible: boolean;
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const variantToneMap: Record<NonNullable<SnackbarProps['variant']>, InstitutionalStatusTone> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const variantIconMap: Record<NonNullable<SnackbarProps['variant']>, string> = {
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'close-circle',
  info: 'information-circle',
};

export default function Snackbar({
  visible,
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
  actionLabel,
  onAction,
}: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const tone = variantToneMap[variant];
  const status = institutionalStatusColors(tone);
  const backgroundColor = status.icon;
  const textColor = I.onPrimary;
  const icon = variantIconMap[variant];

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
          bottom: insets.bottom + SPACING.md,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor,
          },
          SHADOWS.editorial,
        ]}
      >
        <InstitutionalIcon
          name={icon as any}
          size={20}
          color={textColor}
          style={styles.icon}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <InstitutionalText role="body" color={textColor} style={styles.message} numberOfLines={2}>
          {message}
        </InstitutionalText>
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={() => {
              onAction();
              handleDismiss();
            }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <InstitutionalText role="caption" color={textColor} style={styles.actionText}>
              {actionLabel}
            </InstitutionalText>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <InstitutionalIcon name="close" size={18} color={textColor} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    marginRight: SPACING.sm,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    borderRadius: BORDERS.radius.sm + 2,
    backgroundColor: withOpacity(I.onPrimary, 0.2),
  },
  actionText: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  closeButton: {
    padding: SPACING.xs,
  },
});
