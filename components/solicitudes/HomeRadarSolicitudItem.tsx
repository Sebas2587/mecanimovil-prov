import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Car, ChevronRight } from 'lucide-react-native';
import type { SolicitudPublica } from '@/services/solicitudesService';
import { CountdownTimer } from './CountdownTimer';
import { resolveHomeSolicitudCardMeta } from '@/utils/homeSolicitudCard';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;

function lineHeight(fontSize: number, mult: number) {
  return Math.round(fontSize * mult);
}

export type HomeRadarSolicitudItemProps = {
  solicitud: SolicitudPublica;
  onOpenDetail: (solicitudId: string) => void;
  isLast?: boolean;
};

function AvatarCircle({
  uri,
  fallbackInitial,
  size = 40,
}: {
  uri?: string | null;
  fallbackInitial: string;
  size?: number;
}) {
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: radius }]}>
      <Text style={styles.avatarInitial}>{fallbackInitial.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function HomeRadarSolicitudItemInner({
  solicitud,
  onOpenDetail,
  isLast = false,
}: HomeRadarSolicitudItemProps) {
  const meta = useMemo(() => resolveHomeSolicitudCardMeta(solicitud), [solicitud]);

  const handleOpen = useCallback(() => {
    onOpenDetail(solicitud.id);
  }, [onOpenDetail, solicitud.id]);

  const vehiculoTexto = useMemo(() => {
    if (!meta.vehiculoLabel) return null;
    if (meta.servicioExtra > 0) {
      return `${meta.vehiculoLabel} · +${meta.servicioExtra} servicio${meta.servicioExtra > 1 ? 's' : ''}`;
    }
    return meta.vehiculoLabel;
  }, [meta]);

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowDivider]}
      onPress={handleOpen}
      activeOpacity={0.88}
    >
      {/* Header: cliente (izq) + countdown (der) — como referencia avatar + meta / acción */}
      <View style={styles.headerRow}>
        <View style={styles.clientBlock}>
          <AvatarCircle uri={meta.clienteFotoUrl} fallbackInitial={meta.clienteNombre} />
          <View style={styles.clientTextCol}>
            <Text style={styles.clientName} numberOfLines={1}>
              {meta.clienteNombre}
            </Text>
            {meta.clienteSubtitulo ? (
              <Text style={styles.clientSub} numberOfLines={1}>
                {meta.clienteSubtitulo}
              </Text>
            ) : null}
          </View>
        </View>
        {solicitud.fecha_expiracion ? (
          <View style={styles.timerSlot}>
            <CountdownTimer targetDate={solicitud.fecha_expiracion} compact />
          </View>
        ) : null}
      </View>

      {/* Hero: servicio */}
      <Text style={styles.servicioTitulo} numberOfLines={2}>
        {meta.servicioTitulo}
      </Text>

      {meta.descripcionResumen ? (
        <Text style={styles.descripcion} numberOfLines={2}>
          {meta.descripcionResumen}
        </Text>
      ) : null}

      {vehiculoTexto ? (
        <View style={styles.vehiculoMeta}>
          <Car size={12} color={COLORS.institutional.mutedSoft} />
          <Text style={styles.vehiculoMetaText} numberOfLines={1}>
            {vehiculoTexto}
          </Text>
        </View>
      ) : null}

      <View style={styles.dashedRule} />

      {/* Detalle secundario antes del CTA */}
      {meta.tecnicoNombre ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailPrimary} numberOfLines={1}>
            {meta.tecnicoNombre}
          </Text>
          <Text style={styles.detailSecondary} numberOfLines={1}>
            Técnico solicitado
          </Text>
        </View>
      ) : meta.badgeEstado ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailSecondary}>{meta.badgeEstado}</Text>
        </View>
      ) : null}

      {/* CTA ancho completo — patrón referencia */}
      <View style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>{meta.ctaLabel}</Text>
        <ChevronRight size={16} color={COLORS.institutional.onPrimary} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

HomeRadarSolicitudItemInner.displayName = 'HomeRadarSolicitudItem';

export const HomeRadarSolicitudItem = memo(HomeRadarSolicitudItemInner);

const styles = StyleSheet.create({
  row: {
    paddingVertical: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.institutional.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  clientBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    minWidth: 0,
  },
  clientTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  clientName: {
    fontSize: T.captionBold.fontSize,
    lineHeight: lineHeight(T.captionBold.fontSize, T.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.institutional.ink,
  },
  clientSub: {
    fontSize: T.small.fontSize,
    lineHeight: lineHeight(T.small.fontSize, T.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: COLORS.institutional.muted,
  },
  timerSlot: {
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  avatar: {
    borderWidth: 1,
    borderColor: COLORS.institutional.hairline,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.institutional.surfaceStrong,
    borderWidth: 1,
    borderColor: COLORS.institutional.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: T.caption.fontSize,
    fontFamily: FF.sansSemiBold,
    color: COLORS.institutional.primary,
  },
  servicioTitulo: {
    fontSize: T.h4.fontSize,
    lineHeight: lineHeight(T.h4.fontSize, T.h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.institutional.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  descripcion: {
    fontSize: T.caption.fontSize,
    lineHeight: lineHeight(T.caption.fontSize, T.caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: COLORS.institutional.body,
    marginTop: -SPACING.fixed.xxs,
  },
  vehiculoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  vehiculoMetaText: {
    flexShrink: 1,
    fontSize: T.small.fontSize,
    lineHeight: lineHeight(T.small.fontSize, T.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: COLORS.institutional.muted,
  },
  dashedRule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.institutional.hairline,
    marginVertical: SPACING.fixed.xxs,
  },
  detailBlock: {
    gap: 2,
  },
  detailPrimary: {
    fontSize: T.captionBold.fontSize,
    lineHeight: lineHeight(T.captionBold.fontSize, T.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.institutional.ink,
  },
  detailSecondary: {
    fontSize: T.small.fontSize,
    lineHeight: lineHeight(T.small.fontSize, T.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: COLORS.institutional.muted,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.institutional.primary,
    marginTop: SPACING.fixed.xxs,
  },
  ctaButtonText: {
    fontSize: T.button.fontSize,
    lineHeight: lineHeight(T.button.fontSize, T.button.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.institutional.onPrimary,
  },
});
