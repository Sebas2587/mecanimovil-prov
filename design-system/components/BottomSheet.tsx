import React, { useEffect } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDERS, SPACING, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useSheetDismissGesture } from '@/app/design-system/components/useSheetDismissGesture';

const C = COLORS;
const I = COLORS.institutional;
const IS_WEB = Platform.OS === 'web';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Menos padding inferior cuando el sheet incluye footer sticky (botonera). */
  stickyFooter?: boolean;
};

/**
 * Móvil: sheet inferior — tap en el scrim o swipe down cierra.
 * Web: diálogo centrado — click / tap fuera del paper cierra; swipe down también.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  style,
  stickyFooter = false,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panHandlers, reset } = useSheetDismissGesture(onClose);
  const bottomPad = IS_WEB
    ? SPACING.fixed.lg
    : stickyFooter
      ? Math.max(insets.bottom, SPACING.fixed.xxs)
      : Math.max(insets.bottom, SPACING.fixed.md);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={IS_WEB ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/*
        El scrim es hermano del paper, no su padre. En web Touchable/Pressable
        se vuelven <button>; si envuelven el sheet, anidan botones (switch, X, CTAs).
      */}
      <View
        pointerEvents="box-none"
        style={[styles.overlay, IS_WEB && styles.overlayWeb]}
      >
        <Pressable
          onPress={onClose}
          style={[styles.scrim, IS_WEB && styles.scrimWeb]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <Animated.View
          collapsable={false}
          style={[
            styles.sheet,
            stickyFooter && !IS_WEB && styles.sheetSticky,
            { paddingBottom: bottomPad, transform: [{ translateY }] },
            style,
            IS_WEB && styles.sheetWeb,
            stickyFooter && IS_WEB && styles.sheetWebSticky,
          ]}
          {...panHandlers}
        >
          {IS_WEB ? (
            <View style={styles.dialogBar}>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <X size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </Pressable>
            </View>
          ) : (
            <View
              style={styles.handleHit}
              accessibilityRole="adjustable"
              accessibilityLabel="Arrastra hacia abajo para cerrar"
            >
              <View style={styles.handle} />
            </View>
          )}
          {stickyFooter ? (
            <View style={styles.stickyInner}>{children}</View>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: C.background.overlay,
  },
  overlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    ...({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100vw',
      boxSizing: 'border-box',
    } as ViewStyle),
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimWeb: {
    cursor: 'pointer',
  } as ViewStyle,
  sheet: {
    zIndex: 1,
    backgroundColor: C.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.xl,
    borderTopRightRadius: BORDERS.radius.modal.xl,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.sm,
    maxHeight: '92%',
    width: '100%',
  },
  sheetWeb: {
    borderRadius: BORDERS.radius.modal.md,
    borderTopLeftRadius: BORDERS.radius.modal.md,
    borderTopRightRadius: BORDERS.radius.modal.md,
    maxWidth: 440,
    width: '92%',
    maxHeight: '85vh' as unknown as number,
    paddingTop: SPACING.fixed.xs,
    // @ts-expect-error web-only cursor
    cursor: 'default',
    ...SHADOWS.editorial,
  },
  sheetWebSticky: {
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  sheetSticky: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  stickyInner: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    width: '100%',
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: SPACING.fixed.xxs,
    paddingBottom: SPACING.fixed.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border.main,
  },
  dialogBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
    minHeight: 32,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
});

export default BottomSheet;
