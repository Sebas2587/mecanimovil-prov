import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Swipeable, type Swipeable as SwipeableType } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 56;
const IS_WEB = Platform.OS === 'web';

const openRowRegistry = new Map<string, SwipeableType | null>();

function closeOtherRows(activeKey: string) {
  openRowRegistry.forEach((ref, key) => {
    if (key !== activeKey && ref?.close) {
      ref.close();
    }
  });
}

interface ChatSwipeableRowProps {
  rowKey: string;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
  /** Acciones extra (ej. Agendar) apiladas con Eliminar en la misma columna de 48px en web. */
  webSideActions?: React.ReactNode;
  children: React.ReactNode;
}

export function ChatSwipeableRow({
  rowKey,
  onDelete,
  disabled,
  webSideActions,
  children,
}: ChatSwipeableRowProps) {
  const swipeRef = useRef<SwipeableType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const runDelete = useCallback(async () => {
    if (disabled || deleting) return;
    setDeleting(true);
    swipeRef.current?.close();
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }, [disabled, deleting, onDelete]);

  const confirmAndDelete = useCallback(() => {
    if (disabled || deleting) return;
    const mensaje = 'Se borrará esta conversación y sus mensajes. Esta acción no se puede deshacer.';
    if (IS_WEB && typeof window !== 'undefined') {
      if (window.confirm(`Eliminar chat\n\n${mensaje}`)) void runDelete();
      return;
    }
    Alert.alert('Eliminar chat', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void runDelete(); } },
    ]);
  }, [disabled, deleting, runDelete]);

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const translateX = dragX.interpolate({
        inputRange: [-ACTION_WIDTH, 0],
        outputRange: [0, ACTION_WIDTH],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.actionContainer, { transform: [{ translateX }] }]}>
          <Pressable
            style={styles.actionPressable}
            onPress={runDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar conversación"
          >
            <Trash2 size={22} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.actionLabel}>Eliminar</Text>
          </Pressable>
        </Animated.View>
      );
    },
    [runDelete],
  );

  const setRef = useCallback(
    (ref: SwipeableType | null) => {
      swipeRef.current = ref;
      if (ref) {
        openRowRegistry.set(rowKey, ref);
      } else {
        openRowRegistry.delete(rowKey);
      }
    },
    [rowKey],
  );

  // En web: una sola columna de acciones (48px) para no estrechar la card.
  // Sparkles + Eliminar van apilados verticalmente, no lado a lado.
  if (IS_WEB) {
    return (
      <View style={styles.webRow}>
        <View style={styles.webMain}>
          <View style={styles.rowContent}>
            {children}
            {deleting ? (
              <View style={styles.deletingOverlay}>
                <ActivityIndicator size="small" color={I.primary} />
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.webActionsColumn}>
          {webSideActions}
          <Pressable
            style={[styles.webActionBtn, (disabled || deleting) && styles.webActionBtnDisabled]}
            onPress={confirmAndDelete}
            disabled={disabled || deleting}
            accessibilityRole="button"
            accessibilityLabel="Eliminar conversación"
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Swipeable
      ref={setRef}
      friction={2}
      overshootRight={false}
      rightThreshold={OPEN_THRESHOLD}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => closeOtherRows(rowKey)}
      onSwipeableOpen={runDelete}
      enabled={!disabled && !deleting}
      containerStyle={styles.swipeContainer}
    >
      <View style={styles.rowContent}>
        {children}
        {deleting ? (
          <View style={styles.deletingOverlay}>
            <ActivityIndicator size="small" color={I.primary} />
          </View>
        ) : null}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: SPACING.sm,
  },
  rowContent: {
    position: 'relative',
  },
  actionContainer: {
    width: ACTION_WIDTH,
  },
  actionPressable: {
    flex: 1,
    backgroundColor: I.semanticDown,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.sm,
    gap: 4,
  },
  actionLabel: {
    color: I.onPrimary,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: BORDERS.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  webMain: {
    flex: 1,
    minWidth: 0,
  },
  webActionsColumn: {
    width: 48,
    flexShrink: 0,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  webActionBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only cursor
    cursor: 'pointer',
  },
  webActionBtnDisabled: {
    opacity: 0.5,
  },
});
