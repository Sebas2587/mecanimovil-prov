import React, { memo } from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Radar, Search, ChevronRight } from 'lucide-react-native';
import type { SolicitudPublica } from '@/services/solicitudesService';
import { HomeRadarSolicitudItem } from '@/components/solicitudes/HomeRadarSolicitudItem';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';

export type HomeSolicitudesSectionProps = {
  radarActivo: boolean;
  radarPreferenciaCargada: boolean;
  radarSwitchLoading: boolean;
  loadingSolicitudes: boolean;
  solicitudes: SolicitudPublica[];
  onToggleRadar: (value: boolean) => void;
  onOpenDetail: (solicitudId: string) => void;
  onVerTodas: () => void;
};

function HomeSolicitudesSectionInner({
  radarActivo,
  radarPreferenciaCargada,
  radarSwitchLoading,
  loadingSolicitudes,
  solicitudes,
  onToggleRadar,
  onOpenDetail,
  onVerTodas,
}: HomeSolicitudesSectionProps) {
  const renderList = () => {
    if (!radarPreferenciaCargada || loadingSolicitudes) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.institutional.primary} />
        </View>
      );
    }

    if (!radarActivo) {
      return (
        <View style={styles.emptyState}>
          <Radar size={20} color={COLORS.institutional.mutedSoft} strokeWidth={2} />
          <Text style={styles.emptyTitle}>Radar apagado</Text>
          <Text style={styles.emptySub}>
            Activa la disponibilidad para recibir solicitudes aquí.
          </Text>
        </View>
      );
    }

    if (solicitudes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Search size={20} color={COLORS.institutional.mutedSoft} strokeWidth={2} />
          <Text style={styles.emptyTitle}>Sin solicitudes por ahora</Text>
          <Text style={styles.emptySub}>Te avisaremos cuando haya nuevas oportunidades.</Text>
        </View>
      );
    }

    const visibles = solicitudes.slice(0, 3);

    return (
      <View style={styles.list}>
        {visibles.map((solicitud, index) => (
          <HomeRadarSolicitudItem
            key={solicitud.id}
            solicitud={solicitud}
            onOpenDetail={onOpenDetail}
            isLast={index === visibles.length - 1 && solicitudes.length <= 3}
          />
        ))}
        {solicitudes.length > 3 ? (
          <TouchableOpacity style={styles.seeAll} onPress={onVerTodas} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Ver todas ({solicitudes.length})</Text>
            <ChevronRight size={14} color={COLORS.institutional.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Solicitudes disponibles</Text>
          <Text style={styles.headerSub}>
            {radarActivo ? 'Conectado — recibes nuevas oportunidades' : 'Activa para conectarte'}
          </Text>
        </View>
        {radarSwitchLoading ? (
          <ActivityIndicator size="small" color={COLORS.institutional.primary} />
        ) : (
          <Switch
            value={radarActivo}
            onValueChange={onToggleRadar}
            disabled={!radarPreferenciaCargada}
            trackColor={{
              false: COLORS.institutional.hairlineSoft,
              true: COLORS.primary[100],
            }}
            thumbColor={
              radarActivo ? COLORS.institutional.primary : COLORS.institutional.mutedSoft
            }
          />
        )}
      </View>
      {renderList()}
    </View>
  );
}

export const HomeSolicitudesSection = memo(HomeSolicitudesSectionInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.fixed.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    lineHeight: TYPOGRAPHY.fontSize['2xl'] * TYPOGRAPHY.lineHeight.tight,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: COLORS.institutional.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  headerSub: {
    marginTop: SPACING.fixed.xxs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: COLORS.institutional.muted,
  },
  list: {
    marginTop: SPACING.fixed.xxs,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed.xl,
    paddingHorizontal: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.tight,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: COLORS.institutional.body,
  },
  emptySub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: COLORS.institutional.muted,
    textAlign: 'center',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xxs,
    gap: SPACING.fixed.xxs,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: COLORS.institutional.primary,
  },
});
