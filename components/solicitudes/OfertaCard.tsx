import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { OfertaProveedor } from '@/services/solicitudesService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  COLORS,
  BORDERS,
  SPACING,
  TYPOGRAPHY,
} from '@/app/design-system/tokens';
import { Card } from '@/design-system/components/Card';
import {
  INSTITUTIONAL_SEMANTIC,
  institutionalStatusColors,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import {
  institutionalTagIconColor,
  type InstitutionalTagVariant,
} from '@/app/design-system/styles/institutionalTags';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

interface OfertaCardProps {
  oferta: OfertaProveedor;
  onPress: () => void;
}

type EstadoInfo = {
  variant: InstitutionalTagVariant;
  text: string;
  icon: string;
  canWork: boolean;
  subtitle: string | null;
  warning?: boolean;
  success?: boolean;
};

export const OfertaCard: React.FC<OfertaCardProps> = ({
  oferta,
  onPress,
}) => {
  const getEstadoInfo = (): EstadoInfo => {
    switch (oferta.estado) {
      case 'enviada':
        return {
          variant: 'primary',
          text: 'Enviada',
          icon: 'send',
          canWork: false,
          subtitle: null,
        };
      case 'vista':
        return {
          variant: 'info',
          text: 'Vista por Cliente',
          icon: 'visibility',
          canWork: false,
          subtitle: 'Cliente revisando tu oferta',
        };
      case 'en_chat':
        return {
          variant: 'warning',
          text: 'En Conversación',
          icon: 'chat',
          canWork: false,
          subtitle: 'Conversando con el cliente',
        };
      case 'aceptada':
        return {
          variant: 'success',
          text: '¡Aceptada!',
          icon: 'check-circle',
          canWork: false,
          subtitle: '⏳ Esperando confirmación de pago',
          warning: true,
        };
      case 'pendiente_pago':
        return {
          variant: 'warning',
          text: 'Cliente Pagando...',
          icon: 'payment',
          canWork: false,
          subtitle: '💳 Pago en proceso',
          warning: true,
        };
      case 'pagada_parcialmente':
        return {
          variant: 'warning',
          text: 'Pagada Parcialmente',
          icon: 'payment',
          canWork: false,
          subtitle: '⏳ Cliente pagó repuestos, pendiente servicio',
          warning: true,
        };
      case 'pagada':
        return {
          variant: 'success',
          text: '¡Pagada!',
          icon: 'paid',
          canWork: true,
          subtitle: '✅ Listo para trabajar',
          success: true,
        };
      case 'rechazada':
        return {
          variant: 'error',
          text: 'Rechazada',
          icon: 'cancel',
          canWork: false,
          subtitle: null,
        };
      case 'retirada':
        return {
          variant: 'neutral',
          text: 'Retirada',
          icon: 'undo',
          canWork: false,
          subtitle: null,
        };
      case 'expirada':
        return {
          variant: 'neutral',
          text: 'Expirada',
          icon: 'schedule',
          canWork: false,
          subtitle: null,
        };
      default:
        return {
          variant: 'neutral',
          text: oferta.estado,
          icon: 'info',
          canWork: false,
          subtitle: null,
        };
    }
  };

  const estadoInfo = getEstadoInfo();
  const estadoTagIcon = institutionalTagIconColor(estadoInfo.variant);
  const successStatus = institutionalStatusColors('success');
  const warningStatus = institutionalStatusColors('warning');
  const repuestosStatus = institutionalStatusColors('success');

  const formatearFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return fecha;
    }
  };

  const formatearPrecio = (precio: string | number): string => formatearMontoCLP(precio);

  const bannerColors = estadoInfo.success ? successStatus : warningStatus;

  return (
    <Card onPress={onPress} style={styles.card} elevated>
      {oferta.es_oferta_secundaria ? (
        <InstitutionalTag label="Servicio adicional" variant="primary" size="sm" style={styles.badgeSecundaria} />
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <InstitutionalTag
            label={estadoInfo.text}
            variant={estadoInfo.variant}
            size="md"
            uppercase={false}
            leading={
              <InstitutionalIcon
                name={estadoInfo.icon as any}
                size={14}
                color={estadoTagIcon}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
          />
          {estadoInfo.subtitle && (
            <Text style={[
              styles.subtitle,
              {
                color: estadoInfo.warning
                  ? INSTITUTIONAL_SEMANTIC.warning
                  : estadoInfo.success
                    ? INSTITUTIONAL_SEMANTIC.success
                    : INSTITUTIONAL_SEMANTIC.body,
              },
            ]}>
              {estadoInfo.subtitle}
            </Text>
          )}
        </View>
        <Text style={styles.fecha}>
          {formatearFecha(oferta.fecha_envio)}
        </Text>
      </View>

      {(estadoInfo.warning || estadoInfo.success) && (
        <View style={[
          styles.infoBanner,
          {
            backgroundColor: bannerColors.bg,
            borderLeftColor: bannerColors.border,
          },
        ]}>
          <InstitutionalIcon
            name={estadoInfo.success ? 'check-circle' : 'info'}
            size={16}
            color={bannerColors.icon}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={[
            styles.infoBannerText,
            { color: bannerColors.text },
          ]}>
            {estadoInfo.success
              ? 'Puedes dirigirte al servicio en la fecha acordada'
              : 'No te dirijas al servicio hasta confirmar el pago'}
          </Text>
        </View>
      )}

      {oferta.estado === 'pagada_parcialmente' && (
        <View style={[
          styles.pagoParcialCard,
          {
            backgroundColor: warningStatus.bg,
            borderColor: warningStatus.border,
          },
        ]}>
          <View style={styles.pagoParcialHeader}>
            <InstitutionalIcon name="payment" size={18} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.pagoParcialTitulo}>
              Pago Parcial Realizado
            </Text>
          </View>

          {oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente' && (
            <>
              <View style={styles.pagoParcialInfoRow}>
                <Text style={styles.pagoParcialLabel}>✅ Repuestos y gestión de compra:</Text>
                <Text style={styles.pagoParcialMonto}>
                  {formatearPrecio(
                    parseFloat(String(oferta.costo_repuestos || '0'))
                    + parseFloat(String(oferta.costo_gestion_compra || '0')) * 1.19,
                  )}
                </Text>
              </View>

              {oferta.costo_mano_obra && parseFloat(oferta.costo_mano_obra) > 0 && (
                <View style={styles.pagoParcialInfoRow}>
                  <Text style={styles.pagoParcialLabel}>⏳ Pendiente (mano de obra):</Text>
                  <Text style={[styles.pagoParcialMonto, { color: I.accentYellow }]}>
                    {formatearPrecio(parseFloat(String(oferta.costo_mano_obra)) * 1.19)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {oferta.solicitud_detail && (
        <View style={styles.clientVehicleContainer}>
          <View style={styles.clientInfoRow}>
            {oferta.solicitud_detail.cliente_foto ? (
              <Image
                source={{ uri: oferta.solicitud_detail.cliente_foto }}
                style={styles.clientAvatar}
              />
            ) : (
              <View style={styles.clientAvatarPlaceholder}>
                <InstitutionalIcon name="person" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            )}
            <View style={styles.clientTextContainer}>
              <Text style={styles.clientName}>
                {oferta.solicitud_detail.cliente_nombre || 'Cliente'}
              </Text>
              {oferta.solicitud_detail.vehiculo && (
                <View style={styles.vehicleInfo}>
                  <InstitutionalIcon name="directions-car" size={14} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.vehicleText}>
                    {oferta.solicitud_detail.vehiculo.marca} {oferta.solicitud_detail.vehiculo.modelo}
                    {oferta.solicitud_detail.vehiculo.año && ` ${oferta.solicitud_detail.vehiculo.año}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.precioContainer}>
          {oferta.estado === 'pagada_parcialmente' &&
           oferta.estado_pago_repuestos === 'pagado' &&
           oferta.estado_pago_servicio === 'pendiente' ? (
            <View style={styles.precioParcialContainer}>
              <Text style={styles.precio}>
                {formatearPrecio(
                  parseFloat(String(oferta.costo_repuestos || '0'))
                  + parseFloat(String(oferta.costo_gestion_compra || '0')) * 1.19,
                )}
              </Text>
              <Text style={styles.precioParcialLabel}>Pagado (parcial)</Text>
              <Text style={styles.precioTotalLabel}>
                Total: {formatearPrecio(oferta.precio_total_ofrecido)}
              </Text>
            </View>
          ) : (
            <Text style={styles.precio}>
              {formatearPrecio(oferta.precio_total_ofrecido)}
            </Text>
          )}
          {oferta.incluye_repuestos && (
            <View style={[styles.repuestosBadge, { backgroundColor: repuestosStatus.bg }]}>
              <InstitutionalIcon name="build" size={12} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.repuestosText, { color: repuestosStatus.text }]}>
                Incluye repuestos
              </Text>
            </View>
          )}
        </View>

        {oferta.descripcion_oferta && (
          <Text
            style={styles.descripcion}
            numberOfLines={2}
          >
            {oferta.descripcion_oferta}
          </Text>
        )}

        <View style={styles.detalles}>
          {oferta.fecha_disponible && (
            <View style={styles.detalleItem}>
              <InstitutionalIcon name="calendar-today" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.detalleText}>
                {new Date(oferta.fecha_disponible).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
                {oferta.hora_disponible && ` • ${oferta.hora_disponible.substring(0, 5)}`}
              </Text>
            </View>
          )}

          {oferta.tiempo_estimado_total && (
            <View style={styles.detalleItem}>
              <InstitutionalIcon name="schedule" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.detalleText}>
                {oferta.tiempo_estimado_total}
              </Text>
            </View>
          )}

          {oferta.detalles_servicios_detail && oferta.detalles_servicios_detail.length > 0 && (
            <View style={styles.detalleItem}>
              <InstitutionalIcon name="build" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.detalleText}>
                {oferta.detalles_servicios_detail.length} servicio{oferta.detalles_servicios_detail.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <InstitutionalIcon name="chevron-right" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Card>
  );
};

const FS = TYPOGRAPHY.fontSize;

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
  },
  badgeSecundaria: {
    marginBottom: SPACING.fixed.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  headerLeft: {
    flex: 1,
  },
  subtitle: {
    fontSize: FS.xs,
    fontWeight: '500',
    marginTop: SPACING.fixed.xxs,
    marginLeft: 2,
  },
  fecha: {
    fontSize: FS.sm,
    marginLeft: SPACING.fixed.xs,
    color: I.muted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
    borderLeftWidth: 3,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FS.sm,
    fontWeight: '500',
  },
  pagoParcialCard: {
    padding: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    marginBottom: SPACING.fixed.sm,
  },
  pagoParcialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.xs,
  },
  pagoParcialTitulo: {
    fontSize: FS.base,
    fontWeight: '600',
    color: I.accentYellow,
  },
  pagoParcialInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.fixed.xxs,
  },
  pagoParcialLabel: {
    fontSize: FS.md,
    color: I.body,
    fontWeight: '500',
  },
  pagoParcialMonto: {
    fontSize: FS.md,
    fontWeight: '600',
    color: INSTITUTIONAL_SEMANTIC.ink,
    lineHeight: 16,
  },
  clientVehicleContainer: {
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: 10,
    marginBottom: SPACING.fixed.md,
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.surfaceStrong,
  },
  clientAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientTextContainer: {
    flex: 1,
  },
  clientName: {
    fontSize: FS.lg,
    fontWeight: '700',
    color: INSTITUTIONAL_SEMANTIC.ink,
    marginBottom: SPACING.fixed.xxs,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: FS.base,
    color: I.body,
    fontWeight: '500',
  },
  content: {
    marginBottom: SPACING.fixed.xs,
  },
  precioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
  },
  precio: {
    fontSize: FS.xl,
    fontWeight: '700',
    color: INSTITUTIONAL_SEMANTIC.ink,
  },
  precioParcialContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xxs,
  },
  precioParcialLabel: {
    fontSize: FS.sm,
    fontWeight: '500',
    color: I.accentYellow,
  },
  precioTotalLabel: {
    fontSize: FS.sm,
    fontWeight: '400',
    color: I.body,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    gap: SPACING.fixed.xxs,
  },
  repuestosText: {
    fontSize: FS.xs,
    fontWeight: '600',
  },
  descripcion: {
    fontSize: FS.base,
    lineHeight: 20,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  detalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
  detalleText: {
    fontSize: FS.sm,
    color: I.muted,
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: SPACING.fixed.xxs,
  },
});
