import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { Swipeable, type Swipeable as SwipeableType } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 56;

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
  children: React.ReactNode;
}

export function ChatSwipeableRow({ rowKey, onDelete, disabled, children }: ChatSwipeableRowProps) {
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
});
