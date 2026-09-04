import React, { useState, type PropsWithChildren } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type Props = PropsWithChildren<{
  title: string;
  hint?: string;
  defaultOpen?: boolean;
}>;

/** Agrupa ajustes que el taller rara vez toca, para no llenar la pantalla de campos. */
export function SeccionOpcional({ title, hint, defaultOpen = false, children }: Props) {
  const [abierta, setAbierta] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setAbierta((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={title}
      >
        <View style={styles.headerText}>
          <InstitutionalText role="captionBold" color="ink">
            {title}
          </InstitutionalText>
          {hint && !abierta ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={1}>
              {hint}
            </InstitutionalText>
          ) : null}
        </View>
        {abierta ? (
          <ChevronDown size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </TouchableOpacity>

      {abierta ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  body: {
    gap: SPACING.fixed.sm,
  },
});

export default SeccionOpcional;
