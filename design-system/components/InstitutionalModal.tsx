import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type ModalProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const C = COLORS;

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
  const handleClose = onClose ?? onRequestClose;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, SPACING.fixed.md);

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityRole="button" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
            <View style={styles.header}>
              {title ? (
                <InstitutionalText role="h5" style={styles.title}>
                  {title}
                </InstitutionalText>
              ) : (
                <View style={styles.titleSpacer} />
              )}
              {handleClose ? (
                <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
                  <X size={22} color={C.text.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.body, !footer && styles.bodySolo]}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
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
