import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import type { MecanicoKpis } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const PAPER = COLORS.background.paper;

type Props = {
  mecanicos: MecanicoKpis[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

export function MecanicoPickerHorizontal({ mecanicos, selectedId, onSelect }: Props) {
  if (mecanicos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sin mecánicos registrados</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {mecanicos.map((m) => {
        const active = m.mecanico_id === selectedId;
        return (
          <TouchableOpacity
            key={m.mecanico_id ?? 'taller'}
            style={[styles.chip, active && styles.chipActive, !m.activo && styles.chipOff]}
            onPress={() => onSelect(m.mecanico_id)}
            activeOpacity={0.88}
          >
            {m.foto_url ? (
              <Image source={{ uri: m.foto_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPh, active && styles.avatarPhActive]}>
                <InstitutionalIcon
                  name="person"
                  size={18}
                  color={active ? I.primary : I.muted}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </View>
            )}
            <Text style={[styles.nombre, active && styles.nombreActive]} numberOfLines={1}>
              {m.nombre.split(' ')[0]}
            </Text>
            {!m.activo ? (
              <Text style={[styles.off, active && styles.offActive]}>off</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SPACING.container.horizontal,
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
  },
  chip: {
    width: 72,
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: PAPER,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  chipActive: {
    backgroundColor: COLORS.selection.background,
    borderColor: I.primary,
  },
  chipOff: {
    opacity: 0.65,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    marginBottom: 6,
  },
  avatarPh: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarPhActive: {
    backgroundColor: PAPER,
    borderColor: COLORS.selection.border,
  },
  nombre: {
    ...institutionalTextStyle('caption', I.ink),
    fontFamily: FF.sansSemiBold,
    textAlign: 'center',
  },
  nombreActive: {
    color: COLORS.selection.text,
  },
  off: {
    fontSize: 9,
    fontFamily: FF.monoMedium,
    color: I.muted,
    marginTop: 2,
  },
  offActive: {
    color: COLORS.selection.text,
  },
  empty: {
    padding: SPACING.fixed.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...institutionalTextStyle('body', I.muted),
    fontFamily: FF.sansMedium,
  },
});
