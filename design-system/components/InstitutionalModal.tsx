import React, { useEffect } from 'react';
import {
  Animated,
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ModalProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useSheetDismissGesture } from '@/app/design-system/components/useSheetDismissGesture';
import { estiloCotizacionDialogo } from '@/app/design-system/layout/cotizacionDialogo';

const C = COLORS;
const IS_WEB = Platform.OS === 'web';

export type InstitutionalModalProps = Pick<ModalProps, 'visible' | 'onRequestClose'> & {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  animationType?: 'none' | 'slide' | 'fade';
  /** `wide`: cotización — diálogo amplio en web, hoja alta en mobile. */
  size?: 'default' | 'wide';
};

export function InstitutionalModal({
  visible,
  onRequestClose,
  onClose,
  title,
  children,
  footer,
  animationType = 'slide',
  size = 'default',
}: InstitutionalModalProps) {
  const handleClose = onClose ?? onRequestClose ?? (() => undefined);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const bottomPad = Math.max(insets.bottom, SPACING.fixed.md);
  const sheetMaxHeight = Math.round(windowHeight * 0.92);
  const { translateY, panHandlers, reset } = useSheetDismissGesture(handleClose);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

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
      <View style={[styles.overlay, size === 'wide' && IS_WEB && styles.overlayWide]}>
        {/* Fondo hermano del sheet: en web un role="button" no puede envolver los botones del contenido. */}
        <Pressable
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboardWrap, size === 'wide' && IS_WEB && styles.keyboardWrapWide]}
        >
          <Animated.View
            collapsable={false}
            testID={size === 'wide' ? 'cotizacion-dialogo' : undefined}
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeight,
                paddingBottom: bottomPad,
                transform: [{ translateY }],
              },
              size === 'wide' && estiloCotizacionDialogo(windowWidth),
              size === 'wide' && styles.sheetWide,
            ]}
            {...panHandlers}
          >
            <View style={size === 'wide' ? styles.wideInner : undefined}>
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
              {size === 'wide' ? (
                <ScrollView
                  style={styles.bodyWide}
                  contentContainerStyle={[styles.body, !footer && styles.bodySolo]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={[styles.body, !footer && styles.bodySolo]}>{children}</View>
              )}
              {footer ? <View style={styles.footer} testID={size === 'wide' ? 'cotizacion-dialogo-acciones' : undefined}>{footer}</View> : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardWrap: {
    width: '100%',
  },
  keyboardWrapWide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: C.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.xl,
    borderTopRightRadius: BORDERS.radius.modal.xl,
    width: '100%',
    overflow: 'hidden',
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  overlayWide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetWide: {
    overflow: 'hidden',
    flexDirection: 'column',
  },
  wideInner: {
    flex: 1,
    minHeight: 0,
  },
  bodyWide: {
    flex: 1,
    minHeight: 0,
  },
});

export default InstitutionalModal;
