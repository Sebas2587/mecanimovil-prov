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
import { SafeAreaView } from 'react-native-safe-area-context';
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

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onRequestClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['bottom']}>
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
              <View style={styles.body}>{children}</View>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: { width: '100%' },
  sheet: {
    backgroundColor: C.background.paper,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    maxHeight: '92%',
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
    paddingVertical: SPACING.fixed.md,
  },
  footer: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
});

export default InstitutionalModal;
