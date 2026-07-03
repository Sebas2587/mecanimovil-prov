import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { MecanicoKpis } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

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
            style={[styles.card, active && styles.cardActive, !m.activo && styles.cardOff]}
            onPress={() => onSelect(m.mecanico_id)}
            activeOpacity={0.88}
          >
            {m.foto_url ? (
              <Image source={{ uri: m.foto_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPh}>
                <InstitutionalIcon name="person" size={20} color={active ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            )}
            <Text style={[styles.nombre, active && styles.nombreActive]} numberOfLines={1}>
              {m.nombre.split(' ')[0]}
            </Text>
            {!m.activo ? <Text style={[styles.off, active && styles.offActive]}>off</Text> : null}
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
  card: {
    width: 72,
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  cardActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  cardOff: {
    opacity: 0.65,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
  },
  avatarPh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nombre: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
  },
  nombreActive: {
    color: I.onPrimary,
  },
  off: {
    fontSize: 9,
    fontFamily: FF.monoMedium,
    color: I.muted,
    marginTop: 2,
  },
  offActive: {
    color: I.onPrimary,
  },
  empty: {
    padding: SPACING.fixed.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
});
