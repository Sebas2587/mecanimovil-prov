import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SolicitudPublica } from '@/services/solicitudesService';
import {
  INSTITUTIONAL_SEMANTIC,
  institutionalCardStyles,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import type { InstitutionalTagVariant } from '@/app/design-system/styles/institutionalTags';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

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
      <View style={[institutionalCardStyles.surface, styles.card]}>
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
            <InstitutionalTag label="Urgente" variant="error" size="sm" />
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touch: {
    marginBottom: 14,
  },
  card: {
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
