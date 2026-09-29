import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { LeadCard } from '@/components/asistente-taller/LeadCard';
import { InstitutionalText } from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { SKELETON_BASE, SKELETON_MUTED } from '@/components/ui/Skeleton/skeletonTokens';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';
import type { LeadDecision } from '@/utils/asistenteTaller/verboLead';

const I = COLORS.institutional;
const HUESOS = [0, 1, 2, 3] as const;

type Props = {
  leads: LeadDecision[];
  anclaId: string | null;
  onAnclar: (id: string) => void;
  /** Con un caso anclado, el resto queda a un lado y más chico. */
  compacta?: boolean;
  /** Mientras el pipeline no tiene datos, la fila muestra tarjetas que se revelan en orden. */
  cargando?: boolean;
};

const ChipLead = React.memo(function ChipLead({
  lead,
  onPress,
}: {
  lead: LeadDecision;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(lead.id), [lead.id, onPress]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${lead.quien}. ${lead.verboLabel}`}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
    >
      <InstitutionalText role="captionBold">{lead.quien}</InstitutionalText>
      <InstitutionalText role="caption" color="primary">{lead.verboLabel}</InstitutionalText>
    </Pressable>
  );
});

const EsqueletoLead = React.memo(function EsqueletoLead({ index }: { index: number }) {
  return (
    <Animated.View entering={FadeIn.delay(index * 90).duration(320)} style={styles.card}>
      <View style={styles.lineas}>
        <SkeletonPulse style={styles.linea}><View /></SkeletonPulse>
        <SkeletonPulse style={styles.lineaCorta}><View /></SkeletonPulse>
      </View>
      <SkeletonPulse style={styles.verbo}><View /></SkeletonPulse>
    </Animated.View>
  );
});

export const FilaLeads = React.memo(function FilaLeads({
  leads,
  anclaId,
  onAnclar,
  compacta = false,
  cargando = false,
}: Props) {
  const visibles = useMemo(
    () => (anclaId ? leads.filter((lead) => lead.id !== anclaId) : leads),
    [anclaId, leads],
  );

  if (cargando && !compacta) {
    return (
      <View style={styles.huesos}>
        {HUESOS.map((index) => (
          <EsqueletoLead key={index} index={index} />
        ))}
      </View>
    );
  }

  if (visibles.length === 0) return null;

  if (compacta) {
    return (
      <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.duration(280)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lateral}
        >
          {visibles.map((lead) => (
            <ChipLead key={lead.id} lead={lead} onPress={onAnclar} />
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <View style={styles.flujo}>
      {visibles.map((item, index) => (
        <Animated.View key={item.id} entering={FadeIn.delay(Math.min(index, 6) * 70).duration(280)}>
          <LeadCard
            id={item.id}
            quien={item.quien}
            telefono={item.telefono}
            auto={item.auto}
            pedido={item.pedido}
            verboLabel={item.verboLabel}
            estado={item.estado}
            activo={false}
            primero={index === 0}
            onPress={onAnclar}
          />
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  flujo: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.lg,
  },
  huesos: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
  },
  lateral: {
    gap: SPACING.fixed.sm,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: I.surfaceSoft,
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: I.paper,
  },
  lineas: {
    flex: 1,
    gap: 8,
  },
  linea: {
    height: 14,
    width: '62%',
    borderRadius: 7,
    backgroundColor: SKELETON_BASE,
  },
  lineaCorta: {
    height: 12,
    width: '40%',
    borderRadius: 6,
    backgroundColor: SKELETON_MUTED,
  },
  verbo: {
    height: 12,
    width: 72,
    borderRadius: 6,
    backgroundColor: SKELETON_MUTED,
  },
});
