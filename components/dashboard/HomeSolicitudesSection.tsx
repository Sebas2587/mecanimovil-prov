import React, { memo } from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Radar, Inbox, ChevronRight } from 'lucide-react-native';
import type { SolicitudPublica } from '@/services/solicitudesService';
import { HomeRadarSolicitudItem } from '@/components/solicitudes/HomeRadarSolicitudItem';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

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
  const count = solicitudes.length;
  const urgentes = solicitudes.filter((s) => s.urgencia === 'urgente').length;

  const renderBody = () => {
    if (!radarPreferenciaCargada || loadingSolicitudes) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={I.primary} />
        </View>
      );
    }

    if (!radarActivo) {
      return (
        <View style={styles.emptyState}>
          <Radar size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <View style={styles.emptyTextCol}>
            <Text style={styles.emptyTitle}>Radar apagado</Text>
            <Text style={styles.emptySub}>
              Actívalo para recibir pedidos de clientes Mecanimovil.
            </Text>
          </View>
        </View>
      );
    }

    if (count === 0) {
      return (
        <View style={styles.emptyState}>
          <Inbox size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <View style={styles.emptyTextCol}>
            <Text style={styles.emptyTitle}>Sin solicitudes nuevas</Text>
            <Text style={styles.emptySub}>
              Cuando un cliente publique un pedido compatible, aparece aquí.
            </Text>
          </View>
        </View>
      );
    }

    const visibles = solicitudes.slice(0, 4);

    return (
      <View style={styles.list}>
        {visibles.map((solicitud, index) => (
          <HomeRadarSolicitudItem
            key={solicitud.id}
            solicitud={solicitud}
            onOpenDetail={onOpenDetail}
            isLast={index === visibles.length - 1 && count <= 4}
          />
        ))}
        {count > 4 ? (
          <TouchableOpacity style={styles.seeAll} onPress={onVerTodas} activeOpacity={0.75}>
            <Text style={styles.seeAllText}>Ver todas ({count})</Text>
            <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Solicitudes</Text>
            {radarActivo && count > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statusInline}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: radarActivo ? I.semanticUp : I.mutedSoft },
              ]}
            />
            <Text style={[styles.statusText, { color: radarActivo ? I.semanticUp : I.muted }]}>
              {radarActivo ? 'Disponible' : 'Pausado'}
            </Text>
            {radarActivo && urgentes > 0 ? (
              <Text style={styles.urgenteHint}>· {urgentes} urgentes</Text>
            ) : null}
          </View>
        </View>

        {radarSwitchLoading ? (
          <ActivityIndicator size="small" color={I.primary} />
        ) : (
          <Switch
            value={radarActivo}
            onValueChange={onToggleRadar}
            disabled={!radarPreferenciaCargada}
            trackColor={{
              false: I.hairlineSoft,
              true: COLORS.primary[100],
            }}
            thumbColor={radarActivo ? I.primary : I.mutedSoft}
            accessibilityLabel={radarActivo ? 'Pausar radar' : 'Activar radar'}
          />
        )}
      </View>

      {renderBody()}

      {radarActivo && count > 0 && count <= 4 ? (
        <TouchableOpacity style={styles.footerLink} onPress={onVerTodas} activeOpacity={0.75}>
          <Text style={styles.footerLinkText}>Ver bandeja completa</Text>
          <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const HomeSolicitudesSection = memo(HomeSolicitudesSectionInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: T.h3.fontSize,
    lineHeight: Math.round(T.h3.fontSize * T.h3.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h3.fontWeight as '600',
    color: I.ink,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.onPrimary,
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  },
  urgenteHint: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.semanticDown,
  },
  list: {
    marginTop: SPACING.xs,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  emptyTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  emptyTitle: {
    fontSize: T.h5.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.body,
  },
  emptySub: {
    fontSize: T.small.fontSize,
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.sm,
    gap: 4,
  },
  seeAllText: {
    fontSize: T.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.primary,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingTop: SPACING.xs,
  },
  footerLinkText: {
    fontSize: T.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.primary,
  },
});
