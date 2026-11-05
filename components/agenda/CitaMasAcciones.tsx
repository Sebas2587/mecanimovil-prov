import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MoreHorizontal, X } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import type { CotizacionFabAction } from '@/components/cotizacion/CotizacionEditorFab';

const I = COLORS.institutional;

type Props = {
  actions: CotizacionFabAction[];
};

/**
 * Más acciones de la cita, dentro de la cabecera.
 * Cerrado no cubre el scroll. Abierto, el menú cuelga de la cabecera.
 */
export function CitaMasAcciones({ actions }: Props) {
  const [abierto, setAbierto] = useState(false);
  if (actions.length === 0) return null;

  return (
    <View style={styles.ancla}>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={abierto ? 'Cerrar menú' : 'Más acciones'}
        accessibilityState={{ expanded: abierto }}
        hitSlop={8}
        style={styles.boton}
      >
        {abierto ? (
          <X size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <MoreHorizontal size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </Pressable>
      {abierto ? (
        <View style={styles.menu}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              disabled={action.disabled}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                setAbierto(false);
                action.onPress();
              }}
              style={styles.item}
            >
              <InstitutionalText role="body">{action.label}</InstitutionalText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ancla: {
    alignItems: 'flex-end',
  },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    top: 44,
    right: 0,
    minWidth: 220,
    zIndex: 30,
    backgroundColor: I.paper,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    ...SHADOWS.editorial,
  },
  item: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.fixed.md,
  },
});
