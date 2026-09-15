import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  registerPlatformAlertHost,
  type PlatformAlertRequest,
} from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export function PlatformAlertHost() {
  const [request, setRequest] = useState<PlatformAlertRequest | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 420;

  useEffect(() => registerPlatformAlertHost(setRequest), []);

  const close = (result?: boolean) => {
    const current = request;
    setRequest(null);
    if (!current) return;
    if (current.kind === 'confirm') {
      if (result) {
        Promise.resolve(current.onConfirm?.()).catch((e) => {
          if (__DEV__) console.error(e);
        });
      } else {
        current.onCancel?.();
      }
      return;
    }
    if (current.kind === 'buttons') {
      const cancel = current.buttons.find((b) => b.style === 'cancel');
      cancel?.onPress?.();
      return;
    }
    current.onDismiss?.();
  };

  if (!request) return null;

  const isConfirm = request.kind === 'confirm';
  const isButtons = request.kind === 'buttons';
  const buttons = isButtons
    ? request.buttons
    : [{ text: isConfirm ? (request.confirmText ?? 'Aceptar') : 'Entendido' }];
  const stackActions = isButtons || buttons.length > 2 || narrow;
  const primaryIndex = (() => {
    const idx = buttons.findIndex(
      (b) => b.style !== 'cancel' && b.style !== 'destructive',
    );
    return idx >= 0 ? idx : buttons.length - 1;
  })();

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => close(false)}
    >
      <Pressable
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(insets.top, SPACING.fixed.lg),
            paddingBottom: Math.max(insets.bottom, SPACING.fixed.lg),
          },
        ]}
        onPress={() => (isConfirm || isButtons ? close(false) : close(true))}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? (
            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageScrollContent}
              nestedScrollEnabled
            >
              <Text style={styles.message}>{request.message}</Text>
            </ScrollView>
          ) : null}
          <View
            style={[
              styles.actions,
              isConfirm && !stackActions && styles.actionsConfirm,
              stackActions && styles.actionsStack,
            ]}
          >
            {isConfirm && !isButtons ? (
              <InstitutionalButton
                label={request.kind === 'confirm' ? (request.cancelText ?? 'Cancelar') : 'Cancelar'}
                variant="outline"
                size="compact"
                style={stackActions ? styles.btnStack : styles.btnRow}
                onPress={() => close(false)}
              />
            ) : null}
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive && index === primaryIndex;
              const variant = isDestructive
                ? 'destructiveOutline'
                : isCancel
                  ? 'outline'
                  : isPrimary
                    ? 'primary'
                    : 'secondary';
              return (
                <InstitutionalButton
                  key={`${btn.text}-${index}`}
                  label={btn.text}
                  variant={variant}
                  size="compact"
                  style={stackActions ? styles.btnStack : styles.btnRow}
                  onPress={() => {
                    if (request.kind === 'buttons') {
                      setRequest(null);
                      btn.onPress?.();
                    } else {
                      close(true);
                    }
                  }}
                />
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.modal.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.lg,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
  },
  messageScroll: {
    maxHeight: 220,
    marginBottom: SPACING.fixed.lg,
  },
  messageScrollContent: {
    paddingBottom: SPACING.fixed.xxs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.fixed.sm,
  },
  actionsConfirm: {
    justifyContent: 'space-between',
  },
  actionsStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  btnRow: {
    minWidth: 96,
    flex: 1,
  },
  btnStack: {
    minWidth: 0,
    width: '100%',
  },
});
