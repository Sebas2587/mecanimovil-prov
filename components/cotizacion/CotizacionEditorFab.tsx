import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MoreHorizontal, Package, Plus, Wrench, X, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH_EMPHASIS } from '@/app/design-system/iconography';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FAB_SIZE = 56;
const ACTION_SIZE = 44;

export type CotizacionFabAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  actions?: CotizacionFabAction[];
  variant?: 'plus' | 'more';
  canAddLabor?: boolean;
  bottomOffset?: number;
  onAddRepuesto?: () => void;
  onAddManoObra?: () => void;
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
  icon: LucideIcon;
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

function accionesAgregar(
  onAddRepuesto?: () => void,
  onAddManoObra?: () => void,
  canAddLabor = true,
): CotizacionFabAction[] {
  const items: CotizacionFabAction[] = [];
  if (onAddManoObra && canAddLabor) {
    items.push({ key: 'mano', label: 'Mano de obra', icon: Wrench, onPress: onAddManoObra });
  }
  if (onAddRepuesto) {
    items.push({ key: 'repuesto', label: 'Repuesto', icon: Package, onPress: onAddRepuesto });
  }
  return items;
}

export function CotizacionEditorFab({
  visible,
  actions,
  variant,
  canAddLabor = true,
  bottomOffset,
  onAddRepuesto,
  onAddManoObra,
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const bottom = bottomOffset ?? Math.max(insets.bottom, SPACING.fixed.md) + 96;
  const menu = actions?.length ? actions : accionesAgregar(onAddRepuesto, onAddManoObra, canAddLabor);
  const look = variant ?? (actions?.length ? 'more' : 'plus');

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback((action: CotizacionFabAction) => {
    action.onPress();
    setOpen(false);
  }, []);

  if (!visible || menu.length === 0) return null;

  const openLabel = look === 'plus' ? 'Agregar ítems a la cotización' : 'Más acciones';
  const closeLabel = 'Cerrar menú';

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {open ? (
        <Pressable
          style={styles.scrim}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      ) : null}
      <View style={[styles.cluster, { bottom, right: SPACING.fixed.lg }]} pointerEvents="box-none">
        {open ? (
          <View style={styles.actions}>
            {menu.map((action) => (
              <FabAction
                key={action.key}
                label={action.label}
                icon={action.icon}
                disabled={action.disabled}
                onPress={() => run(action)}
              />
            ))}
          </View>
        ) : null}
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={open ? closeLabel : openLabel}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          {open ? (
            <X size={24} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
          ) : look === 'plus' ? (
            <Plus size={26} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
          ) : (
            <MoreHorizontal size={26} color={COLORS.buttonSecondary.text} strokeWidth={ICON_STROKE_WIDTH_EMPHASIS} />
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
