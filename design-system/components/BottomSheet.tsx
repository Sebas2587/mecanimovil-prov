import React from 'react';
import {
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
 * Móvil: sheet inferior (Airbnb Hosts).
 * Web: diálogo centrado — no se pega ni se corta bajo el viewport.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  style,
  stickyFooter = false,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = IS_WEB
    ? SPACING.fixed.lg
    : stickyFooter
      ? Math.max(insets.bottom, SPACING.fixed.xxs)
      : Math.max(insets.bottom, SPACING.fixed.md);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={IS_WEB ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, IS_WEB && styles.overlayWeb]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View
          style={[
            styles.sheet,
            stickyFooter && !IS_WEB && styles.sheetSticky,
            { paddingBottom: bottomPad },
            style,
            IS_WEB && styles.sheetWeb,
          ]}
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
            <View style={styles.handle} />
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: C.background.overlay,
  },
  overlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.lg,
    // RN-web: el Modal no siempre llena el viewport; fixed evita que quede bajo la pantalla.
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: C.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.xl,
    borderTopRightRadius: BORDERS.radius.modal.xl,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.sm,
    maxHeight: '92%',
    width: '100%',
    zIndex: 1,
  },
  sheetWeb: {
    borderRadius: BORDERS.radius.modal.md,
    borderTopLeftRadius: BORDERS.radius.modal.md,
    borderTopRightRadius: BORDERS.radius.modal.md,
    maxWidth: 440,
    width: '100%',
    maxHeight: '85vh' as unknown as number,
    paddingTop: SPACING.fixed.xs,
    ...SHADOWS.editorial,
  },
  /** Sheet con footer fijo: ocupa hasta maxHeight y reparte scroll + botonera. */
  sheetSticky: {
    flexGrow: 1,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border.main,
    marginBottom: SPACING.fixed.md,
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
