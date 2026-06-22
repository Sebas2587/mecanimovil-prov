import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type MecanicoAsignadoInfo = {
  id: number;
  nombre: string;
  foto_url?: string | null;
  especialidades?: { id: number; nombre: string }[];
  modalidad_display?: string;
};

type Props = {
  mecanico: MecanicoAsignadoInfo | null | undefined;
  compact?: boolean;
};

export function MecanicoAsignadoCard({ mecanico, compact = false }: Props) {
  if (!mecanico) return null;

  const avatarSize = compact ? 40 : 48;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {mecanico.foto_url ? (
        <Image
          source={{ uri: mecanico.foto_url }}
          style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
      ) : (
        <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <InstitutionalIcon name="person" size={compact ? 18 : 22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.nombre, compact && styles.nombreCompact]} numberOfLines={1}>
          {mecanico.nombre}
        </Text>
        {mecanico.especialidades && mecanico.especialidades.length > 0 ? (
          <View style={styles.chipsRow}>
            {mecanico.especialidades.slice(0, compact ? 2 : 4).map((e) => (
              <View key={e.id} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {e.nombre}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.fixed.md,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  wrapCompact: {
    padding: SPACING.fixed.sm,
  },
  avatar: {
    backgroundColor: I.surfaceStrong,
  },
  avatarPlaceholder: {
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: 4,
  },
  nombreCompact: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
});
