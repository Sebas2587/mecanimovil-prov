import React, { useCallback, useEffect } from 'react';
import {
  Animated,
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  type GestureResponderEvent,
  type ModalProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useSheetDismissGesture } from '@/app/design-system/components/useSheetDismissGesture';

const C = COLORS;
const IS_WEB = Platform.OS === 'web';

export type InstitutionalModalProps = Pick<ModalProps, 'visible' | 'onRequestClose'> & {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  animationType?: 'none' | 'slide' | 'fade';
};

export function InstitutionalModal({
  visible,
  onRequestClose,
  onClose,
  title,
  children,
  footer,
  animationType = 'slide',
}: InstitutionalModalProps) {
  const handleClose = onClose ?? onRequestClose ?? (() => undefined);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, SPACING.fixed.md);
  const { translateY, panHandlers, reset } = useSheetDismissGesture(handleClose);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const absorbSheetPress = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation?.();
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={styles.overlay}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Animated.View
            collapsable={false}
            style={[
              styles.sheet,
              { paddingBottom: bottomPad, transform: [{ translateY }] },
            ]}
            {...panHandlers}
          >
            <TouchableOpacity activeOpacity={1} onPress={absorbSheetPress}>
              {!IS_WEB ? (
                <View
                  style={styles.handleHit}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Arrastra hacia abajo para cerrar"
                >
                  <View style={styles.handle} />
                </View>
              ) : null}
              <View style={styles.header}>
                {title ? (
                  <InstitutionalText role="h5" style={styles.title}>
                    {title}
                  </InstitutionalText>
                ) : (
                  <View style={styles.titleSpacer} />
                )}
                <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
                  <X size={22} color={C.text.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
              <View style={[styles.body, !footer && styles.bodySolo]}>{children}</View>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
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
  keyboardWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: C.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.xl,
    borderTopRightRadius: BORDERS.radius.modal.xl,
    maxHeight: '92%',
    width: '100%',
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border.main,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: IS_WEB ? SPACING.fixed.md : SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: C.border.light,
  },
  title: { flex: 1, paddingRight: SPACING.fixed.sm },
  titleSpacer: { flex: 1 },
  body: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
  },
  bodySolo: {
    paddingBottom: SPACING.fixed.md,
  },
  footer: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.xs,
    gap: SPACING.fixed.sm,
  },
});

export default InstitutionalModal;
