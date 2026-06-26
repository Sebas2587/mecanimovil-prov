import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { SolicitudPublica } from '@/services/solicitudesService';
import { COLORS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import {
  INSTITUTIONAL_SEMANTIC,
  institutionalCardStyles,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import type { InstitutionalTagVariant } from '@/app/design-system/styles/institutionalTags';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface SolicitudCardProps {
  solicitud: SolicitudPublica;
  onPress: () => void;
  mostrarBadgeNuevo?: boolean;
}

function resolveEstadoTag(
  estado: string,
  fallbackLabel: string,
): { variant: InstitutionalTagVariant; label: string } {
  switch (estado) {
    case 'publicada':
      return { variant: 'primary', label: 'Publicada' };
    case 'con_ofertas':
      return { variant: 'warning', label: 'Con ofertas' };
    case 'adjudicada':
      return { variant: 'success', label: 'Adjudicada' };
    case 'expirada':
      return { variant: 'neutral', label: 'Expirada' };
    case 'cancelada':
      return { variant: 'error', label: 'Cancelada' };
    default:
      return { variant: 'neutral', label: fallbackLabel };
  }
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  onPress,
  mostrarBadgeNuevo = false,
}) => {
  const blurTint = 'light' as const;
  const blurIntensity = Platform.OS === 'ios' ? 56 : 40;
  const estadoTag = resolveEstadoTag(solicitud.estado, solicitud.estado);
  const urgencia = solicitud.urgencia === 'urgente';

  const formatearTiempoRestante = (tiempoRestante?: string): string => {
    if (!tiempoRestante) return 'Tiempo no disponible';
    if (tiempoRestante.includes('día')) return tiempoRestante;
    return tiempoRestante;
  };

  const truncarDescripcion = (texto: string, maxLength: number = 110): string => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '…';
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.touch}>
      <View style={styles.glassOuter}>
        <BlurView intensity={blurIntensity} tint={blurTint} style={styles.glassBlur}>
          <View style={styles.glassContent}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <InstitutionalTag
                  label={estadoTag.label}
                  variant={estadoTag.variant}
                  size="sm"
                  uppercase={false}
                />
                {mostrarBadgeNuevo ? (
                  <InstitutionalTag label="NUEVO" variant="error" size="sm" />
                ) : null}
              </View>
              {urgencia ? (
                <View style={styles.urgenciaBadge}>
                  <InstitutionalIcon
                    name="priority-high"
                    size={14}
                    color={I.onPrimary}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <InstitutionalText role="small" color="onPrimary" style={styles.urgenciaTexto}>
                    URGENTE
                  </InstitutionalText>
                </View>
              ) : null}
            </View>

            <View style={styles.vehiculoContainer}>
              <InstitutionalIcon
                name="directions-car"
                size={20}
                color={INSTITUTIONAL_SEMANTIC.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <InstitutionalText role="bodyBold" color="ink" style={styles.vehiculoTexto} numberOfLines={1}>
                {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                {solicitud.vehiculo_info.año && ` ${solicitud.vehiculo_info.año}`}
              </InstitutionalText>
            </View>

            <InstitutionalText role="caption" color="muted" style={styles.descripcion}>
              {truncarDescripcion(solicitud.descripcion_problema)}
            </InstitutionalText>

            {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 && (
              <View style={styles.serviciosContainer}>
                {solicitud.servicios_solicitados_detail.slice(0, 3).map((servicio, index) => (
                  <InstitutionalTag
                    key={servicio.id || index}
                    label={servicio.nombre}
                    variant="info"
                    size="sm"
                    uppercase={false}
                    style={styles.servicioBadge}
                  />
                ))}
                {solicitud.servicios_solicitados_detail.length > 3 && (
                  <InstitutionalText role="small" color="mutedSoft" style={styles.masServicios}>
                    +{solicitud.servicios_solicitados_detail.length - 3} más
                  </InstitutionalText>
                )}
              </View>
            )}

            <View style={[styles.footer, institutionalCardStyles.divider]}>
              <View style={styles.footerLeft}>
                <View style={styles.footerItem}>
                  <InstitutionalIcon
                    name="access-time"
                    size={16}
                    color={INSTITUTIONAL_SEMANTIC.mutedSoft}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <InstitutionalText role="small" color="muted">
                    {formatearTiempoRestante(solicitud.tiempo_restante)}
                  </InstitutionalText>
                </View>
                {solicitud.total_ofertas > 0 && (
                  <View style={styles.footerItem}>
                    <InstitutionalIcon
                      name="local-offer"
                      size={16}
                      color={INSTITUTIONAL_SEMANTIC.primary}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                    <InstitutionalText role="small" color="primary">
                      {solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''}
                    </InstitutionalText>
                  </View>
                )}
              </View>
              <InstitutionalIcon
                name="chevron-right"
                size={22}
                color={INSTITUTIONAL_SEMANTIC.mutedSoft}
                strokeWidth={ICON_STROKE_WIDTH}
              />
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
    borderColor: withOpacity(I.onPrimary, 0.62),
    ...SHADOWS.editorial,
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
  urgenciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 3,
    backgroundColor: withOpacity(I.semanticDown, 0.92),
  },
  urgenciaTexto: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  vehiculoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  vehiculoTexto: {
    flex: 1,
  },
  descripcion: {
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
    maxWidth: '100%',
  },
  masServicios: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
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
});
