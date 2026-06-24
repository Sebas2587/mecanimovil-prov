import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  registerPlatformAlertHost,
  type PlatformAlertRequest,
} from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export function PlatformAlertHost() {
  const [request, setRequest] = useState<PlatformAlertRequest | null>(null);

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
      const btn = current.buttons[current.buttonIndex ?? 0];
      btn?.onPress?.();
      return;
    }
    current.onDismiss?.();
  };

  if (!request) return null;

  const isConfirm = request.kind === 'confirm';
  const buttons =
    request.kind === 'buttons'
      ? request.buttons
      : [{ text: isConfirm ? (request.confirmText ?? 'Aceptar') : 'Entendido' }];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => (isConfirm ? close(false) : close(true))}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}
          <View style={[styles.actions, isConfirm && styles.actionsConfirm]}>
            {isConfirm ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => close(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
            ) : null}
            {buttons.map((btn, index) => {
              const isPrimary = !isConfirm || index === buttons.length - 1;
              return (
                <TouchableOpacity
                  key={`${btn.text}-${index}`}
                  style={[styles.btn, isPrimary ? styles.btnPrimary : styles.btnSecondary]}
                  onPress={() => {
                    if (request.kind === 'buttons') {
                      setRequest(null);
                      btn.onPress?.();
                    } else {
                      close(true);
                    }
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={isPrimary ? styles.btnPrimaryText : styles.btnSecondaryText}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(10, 11, 13, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.lg,
    ...SHADOWS.editorial,
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
    marginBottom: SPACING.fixed.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.fixed.sm,
  },
  actionsConfirm: {
    justifyContent: 'space-between',
  },
  btn: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    minWidth: 96,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: I.primary,
  },
  btnSecondary: {
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  btnSecondaryText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
});
