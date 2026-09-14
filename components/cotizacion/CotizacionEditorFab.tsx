import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Package, Plus, Wrench, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH_EMPHASIS } from '@/app/design-system/iconography';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FAB_SIZE = 56;
const ACTION_SIZE = 44;

type Props = {
  visible: boolean;
  canAddLabor?: boolean;
  bottomOffset?: number;
  onAddRepuesto: () => void;
  onAddManoObra: () => void;
};

function FabAction({
  label,
  onPress,
  disabled,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon: typeof Package;
}) {
  if (disabled) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <InstitutionalText role="captionBold" color="onPrimary" style={styles.actionLabel}>
        {label}
      </InstitutionalText>
      <View style={styles.actionDot}>
        <Icon size={18} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
      </View>
    </Pressable>
  );
}

export function CotizacionEditorFab({
  visible,
  canAddLabor = true,
  bottomOffset,
  onAddRepuesto,
  onAddManoObra,
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const bottom = bottomOffset ?? Math.max(insets.bottom, SPACING.fixed.md) + 96;

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const close = useCallback(() => setOpen(false), []);

  const addRepuesto = useCallback(() => {
    onAddRepuesto();
    setOpen(false);
  }, [onAddRepuesto]);

  const addManoObra = useCallback(() => {
    onAddManoObra();
    setOpen(false);
  }, [onAddManoObra]);

  if (!visible) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {open ? (
        <Pressable
          style={styles.scrim}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú agregar"
        />
      ) : null}
      <View style={[styles.cluster, { bottom, right: SPACING.fixed.lg }]} pointerEvents="box-none">
        {open ? (
          <View style={styles.actions}>
            <FabAction
              label="Mano de obra"
              icon={Wrench}
              disabled={!canAddLabor}
              onPress={addManoObra}
            />
            <FabAction
              label="Repuesto"
              icon={Package}
              onPress={addRepuesto}
            />
          </View>
        ) : null}
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Cerrar menú agregar' : 'Agregar ítems a la cotización'}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          {open ? (
            <X size={24} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
          ) : (
            <Plus size={26} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.overlay,
  },
  cluster: {
    position: 'absolute',
    alignItems: 'flex-end',
    gap: SPACING.fixed.sm,
  },
  actions: {
    alignItems: 'flex-end',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  actionLabel: {
    textShadowColor: I.ink,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionDot: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    backgroundColor: COLORS.buttonSecondary.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.buttonSecondary.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  pressed: {
    opacity: 0.88,
  },
});

export default CotizacionEditorFab;
