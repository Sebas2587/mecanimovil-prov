import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SolicitudPublica } from '@/services/solicitudesService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import {COLORS, platformShadow} from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

interface SolicitudCardProps {
  solicitud: SolicitudPublica;
  onPress: () => void;
  mostrarBadgeNuevo?: boolean;
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  onPress,
  mostrarBadgeNuevo = false,
}) => {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const isDark = colorScheme === 'dark';

  const palette = useMemo(() => {
    const ink = isDark ? '#F9FAFB' : '#111827';
    const muted = isDark ? 'rgba(249,250,251,0.65)' : '#6B7280';
    const subtle = isDark ? 'rgba(249,250,251,0.45)' : '#9CA3AF';
    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
    const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37, 99, 235, 0.1)';
    const chipText = isDark ? '#93C5FD' : '#1D4ED8';
    return { ink, muted, subtle, border, chipBg, chipText };
  }, [isDark]);

  const blurTint = isDark ? ('dark' as const) : ('light' as const);
  const blurIntensity = Platform.OS === 'ios' ? (isDark ? 42 : 56) : isDark ? 28 : 40;

  const primary500 =
    (theme?.colors?.primary as Record<string, string> | undefined)?.['500'] ||
    (COLORS?.primary as Record<string, string> | undefined)?.['500'] ||
    '#2563EB';

  const formatearTiempoRestante = (tiempoRestante?: string): string => {
    if (!tiempoRestante) return 'Tiempo no disponible';
    if (tiempoRestante.includes('día')) return tiempoRestante;
    return tiempoRestante;
  };

  const estadoPill = (estado: string): { bg: string; fg: string; label: string } => {
    switch (estado) {
      case 'publicada':
        return { bg: 'rgba(37, 99, 235, 0.18)', fg: isDark ? '#BFDBFE' : '#1E40AF', label: 'Publicada' };
      case 'con_ofertas':
        return { bg: 'rgba(245, 158, 11, 0.2)', fg: isDark ? '#FDE68A' : '#B45309', label: 'Con ofertas' };
      case 'adjudicada':
        return { bg: 'rgba(16, 185, 129, 0.18)', fg: isDark ? '#A7F3D0' : '#047857', label: 'Adjudicada' };
      case 'expirada':
        return { bg: 'rgba(107, 114, 128, 0.2)', fg: isDark ? '#E5E7EB' : '#4B5563', label: 'Expirada' };
      case 'cancelada':
        return { bg: 'rgba(239, 68, 68, 0.18)', fg: isDark ? '#FECACA' : '#B91C1C', label: 'Cancelada' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.15)', fg: palette.muted, label: solicitud.estado };
    }
  };

  const urgencia = solicitud.urgencia === 'urgente';
  const pill = estadoPill(solicitud.estado);

  const truncarDescripcion = (texto: string, maxLength: number = 110): string => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '…';
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.touch}>
      <View style={[styles.glassOuter, isDark && styles.glassOuterDark]}>
        <BlurView intensity={blurIntensity} tint={blurTint} style={styles.glassBlur}>
          <View style={styles.glassContent}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.estadoBadge, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.estadoTexto, { color: pill.fg }]}>{pill.label}</Text>
                </View>
                {mostrarBadgeNuevo && (
                  <View style={styles.nuevoBadge}>
                    <Text style={styles.nuevoTexto}>NUEVO</Text>
                  </View>
                )}
              </View>
              {urgencia && (
                <View style={styles.urgenciaBadge}>
                  <InstitutionalIcon name="priority-high" size={14} color="#FFFFFF"  strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.urgenciaTexto}>URGENTE</Text>
                </View>
              )}
            </View>

            <View style={styles.vehiculoContainer}>
              <InstitutionalIcon name="directions-car" size={20} color={palette.muted}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.vehiculoTexto, { color: palette.ink }]} numberOfLines={1}>
                {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                {solicitud.vehiculo_info.año && ` ${solicitud.vehiculo_info.año}`}
              </Text>
            </View>

            <Text style={[styles.descripcion, { color: palette.muted }]}>
              {truncarDescripcion(solicitud.descripcion_problema)}
            </Text>

            {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 && (
              <View style={styles.serviciosContainer}>
                {solicitud.servicios_solicitados_detail.slice(0, 3).map((servicio, index) => (
                  <View key={servicio.id || index} style={[styles.servicioBadge, { backgroundColor: palette.chipBg }]}>
                    <Text style={[styles.servicioTexto, { color: palette.chipText }]} numberOfLines={1}>
                      {servicio.nombre}
                    </Text>
                  </View>
                ))}
                {solicitud.servicios_solicitados_detail.length > 3 && (
                  <Text style={[styles.masServicios, { color: palette.subtle }]}>
                    +{solicitud.servicios_solicitados_detail.length - 3} más
                  </Text>
                )}
              </View>
            )}

            <View style={[styles.footer, { borderTopColor: palette.border }]}>
              <View style={styles.footerLeft}>
                <View style={styles.footerItem}>
                  <InstitutionalIcon name="access-time" size={16} color={palette.subtle}  strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={[styles.footerTexto, { color: palette.muted }]}>
                    {formatearTiempoRestante(solicitud.tiempo_restante)}
                  </Text>
                </View>
                {solicitud.total_ofertas > 0 && (
                  <View style={styles.footerItem}>
                    <InstitutionalIcon name="local-offer" size={16} color={primary500}  strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={[styles.footerTexto, { color: primary500 }]}>
                      {solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              <InstitutionalIcon name="chevron-right" size={22} color={palette.subtle}  strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          </View>
        </BlurView>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touch: {
    marginBottom: 14,
  },
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    ...platformShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 4,
    }),
  },
  glassOuterDark: {
    borderColor: 'rgba(255,255,255,0.1)',
    ...platformShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    }),
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nuevoBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nuevoTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  urgenciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 3,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
  },
  urgenciaTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  vehiculoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  vehiculoTexto: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviciosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  servicioBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: '100%',
  },
  servicioTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  masServicios: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerTexto: {
    fontSize: 12,
    fontWeight: '500',
  },
});
