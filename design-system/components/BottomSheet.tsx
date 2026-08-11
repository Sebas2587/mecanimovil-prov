import React from 'react';
import { Modal, Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDERS, SPACING } from '@/app/design-system/tokens';

const C = COLORS;

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Menos padding inferior cuando el sheet incluye footer sticky (botonera). */
  stickyFooter?: boolean;
};

/** Sheet modal estilo Airbnb Hosts (radius top 24). */
export function BottomSheet({
  visible,
  onClose,
  children,
  style,
  stickyFooter = false,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = stickyFooter
    ? Math.max(insets.bottom, SPACING.fixed.xxs)
    : Math.max(insets.bottom, SPACING.fixed.md);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            stickyFooter && styles.sheetSticky,
            { paddingBottom: bottomPad },
            style,
          ]}
        >
          <View style={styles.handle} />
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
});

export default BottomSheet;
