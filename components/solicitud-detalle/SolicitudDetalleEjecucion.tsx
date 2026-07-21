import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, withOpacity, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { HostPaperSection, HostSectionKicker } from '@/app/design-system/components';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { TipoPagoClienteChip } from '@/components/solicitudes/TipoPagoClienteChip';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { calcularDesgloseIvaOferta, resolverDesgloseIvaMostrado } from '@/utils/ofertaPrecioDesglose';
import { getResumenTipoPagoCliente } from '@/utils/tipoPagoClienteLabel';
import type { OfertaProveedor } from '@/services/solicitudesService';
import type { ChecklistInstance } from '@/services/checklistService';
import type { BannerConfig } from '@/utils/ofertaDetalleProveedorUi';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const ACCENT_BY_KEY = {
  primary: I.primary,
  semanticUp: I.semanticUp,
  accentYellow: I.accentYellow,
  muted: I.muted,
  semanticDown: I.semanticDown,
  primaryActive: I.primaryActive,
  body: I.body,
} as const;

type Props = {
  miOferta: OfertaProveedor;
  badgeEstado: { text: string; accentKey: keyof typeof ACCENT_BY_KEY; icon: string } | null;
  bannerPrincipal: BannerConfig | null;
  mostrarPlanPago: boolean;
  mostrarDetallePago: boolean;
  enEjecucionAbierto: boolean;
  servicioCompletadoUi: boolean;
  checklistInstance: ChecklistInstance | null;
  loadingChecklist: boolean;
  bannerChecklistAccion: BannerConfig | null;
  direccionServicio: string;
  detallesUbicacion?: string;
  mostrarDireccionMaps: boolean;
  onOpenChecklist: () => void;
  onOpenCompletedChecklist: () => void;
};

function openInGoogleMaps(address: string) {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedAddress}`,
    android: `geo:0,0?q=${encodedAddress}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
  });

  Linking.canOpenURL(url!).then((supported) => {
    if (supported) {
      Linking.openURL(url!);
    } else {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('Error', 'No se pudo abrir Google Maps');
      });
    }
  }).catch(() => {
    Alert.alert('Error', 'No se pudo abrir Google Maps');
  });
}

export function SolicitudDetalleEjecucion({
  miOferta,
  badgeEstado,
  bannerPrincipal,
  mostrarPlanPago,
  mostrarDetallePago,
  enEjecucionAbierto,
  servicioCompletadoUi,
  checklistInstance,
  loadingChecklist,
  bannerChecklistAccion,
  direccionServicio,
  detallesUbicacion,
  mostrarDireccionMaps,
  onOpenChecklist,
  onOpenCompletedChecklist,
}: Props) {
  const formatearPrecio = (precio: string | number) => formatearMontoCLP(precio);
  const estadoInfo = badgeEstado
    ? {
        accent: ACCENT_BY_KEY[badgeEstado.accentKey],
        text: badgeEstado.text,
        icon: badgeEstado.icon,
      }
    : null;

  const mo = parseFloat(String(miOferta.costo_mano_obra ?? '0')) || 0;
  const rep = parseFloat(String(miOferta.costo_repuestos ?? '0')) || 0;
  const gest = parseFloat(String(miOferta.costo_gestion_compra ?? '0')) || 0;
  const tieneMontosProveedor = mo > 0 || rep > 0 || gest > 0;
  const desgloseCalc = calcularDesgloseIvaOferta({
    costoManoObra: miOferta.costo_mano_obra,
    costoRepuestos: miOferta.costo_repuestos,
    costoGestionCompra: miOferta.costo_gestion_compra,
    precioTotalOfrecido: miOferta.precio_total_ofrecido,
  });
  const merged = resolverDesgloseIvaMostrado(miOferta.desglose_iva, desgloseCalc);

  return (
    <>
      {estadoInfo ? (
        <View style={styles.badgesContainer}>
          <View style={[styles.estadoBadge, { backgroundColor: withOpacity(estadoInfo.accent, 0.12) }]}>
            <InstitutionalIcon name={estadoInfo.icon} size={18} color={estadoInfo.accent} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.estadoBadgeText, { color: estadoInfo.accent }]}>{estadoInfo.text}</Text>
          </View>
          {miOferta.fecha_envio ? (
            <View style={styles.fechaBadge}>
              <InstitutionalIcon name="calendar-today" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.fechaBadgeText}>
                Enviada el {new Date(miOferta.fecha_envio).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {bannerPrincipal ? (
        <EstadoBanner
          type={bannerPrincipal.type}
          title={bannerPrincipal.title}
          message={bannerPrincipal.message}
          icon={bannerPrincipal.icon}
          action={
            miOferta.estado === 'en_chat'
              ? { text: 'Abrir Chat', onPress: () => router.push(`/chat-oferta/${miOferta.id}`) }
              : undefined
          }
        />
      ) : null}

      {mostrarPlanPago ? (
        <View style={styles.planPagoSection}>
          <Text style={styles.planPagoTitulo}>Plan de pago del cliente</Text>
          <TipoPagoClienteChip oferta={miOferta} />
        </View>
      ) : null}

      {mostrarDireccionMaps && direccionServicio ? (
        <>
          <HostSectionKicker label="Dirección de servicio" />
          <HostPaperSection style={styles.sectionGap}>
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <InstitutionalIcon name="location-on" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressText}>{direccionServicio}</Text>
                  {detallesUbicacion ? (
                    <Text style={styles.addressDetailsText}>{detallesUbicacion}</Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => openInGoogleMaps(direccionServicio)}
              >
                <InstitutionalIcon name="map" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.mapsButtonText}>Abrir en Google Maps</Text>
              </TouchableOpacity>
            </View>
          </HostPaperSection>
        </>
      ) : null}

      <HostSectionKicker label="Precio total" />
      <HostPaperSection style={styles.sectionGap}>
        <View style={styles.precioCard}>
          {tieneMontosProveedor ? (
            <>
              {mo > 0 ? (
                <View style={styles.precioDesgloseRow}>
                  <Text style={styles.precioDesgloseLabel}>Mano de obra (sin IVA)</Text>
                  <Text style={styles.precioDesgloseValue}>{formatearPrecio(mo)}</Text>
                </View>
              ) : null}
              {rep > 0 ? (
                <View style={styles.precioDesgloseRow}>
                  <Text style={styles.precioDesgloseLabel}>Repuestos (sin IVA)</Text>
                  <Text style={styles.precioDesgloseValue}>{formatearPrecio(rep)}</Text>
                </View>
              ) : null}
              {(miOferta.incluye_repuestos || gest > 0) ? (
                <View style={styles.precioDesgloseRow}>
                  <Text style={styles.precioDesgloseLabel}>Gestión de compra (sin IVA)</Text>
                  <Text style={styles.precioDesgloseValue}>{formatearPrecio(gest)}</Text>
                </View>
              ) : null}
              <View style={styles.precioDesgloseDivider} />
            </>
          ) : null}
          <View style={styles.precioDesgloseRow}>
            <Text style={styles.precioDesgloseLabelMuted}>Subtotal (sin IVA)</Text>
            <Text style={styles.precioDesgloseValueMuted}>{formatearPrecio(String(merged.subSinIva))}</Text>
          </View>
          <View style={styles.precioDesgloseRow}>
            <Text style={styles.precioDesgloseLabelMuted}>IVA (19%)</Text>
            <Text style={styles.precioDesgloseValueMuted}>{formatearPrecio(String(merged.iva))}</Text>
          </View>
          <View style={styles.precioDesgloseDivider} />
          <View style={styles.precioTotalDestacadoRow}>
            <Text style={styles.precioTotalDestacadoLabel}>Total a pagar</Text>
            <Text style={styles.precioTotalDestacadoValue}>
              {formatearPrecio(miOferta.precio_total_ofrecido)}
            </Text>
          </View>
        </View>

        {mostrarDetallePago ? (
          <View style={styles.pagoParcialInfoCard}>
            <View style={styles.pagoParcialHeader}>
              <InstitutionalIcon name="payment" size={20} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.pagoParcialTitulo}>Detalle del pago</Text>
            </View>
            {getResumenTipoPagoCliente(miOferta).metodo === 'cliente_compra_repuestos' ? (
              <Text style={styles.pagoParcialNota}>
                El cliente comprará los repuestos por su cuenta. Solo pagó mano de obra por la plataforma.
              </Text>
            ) : null}
            {getResumenTipoPagoCliente(miOferta).metodo === 'todo_adelantado'
              && miOferta.estado_pago_servicio === 'pagado' ? (
              <Text style={styles.pagoParcialNota}>
                El cliente pagó el total anticipado (repuestos, gestión y mano de obra).
              </Text>
            ) : null}
            {miOferta.estado_pago_repuestos === 'pagado' && miOferta.estado_pago_servicio === 'pendiente' ? (
              <>
                <View style={styles.pagoParcialRow}>
                  <Text style={styles.pagoParcialLabel}>Repuestos y gestión de compra</Text>
                  <Text style={styles.pagoParcialMonto}>
                    {formatearPrecio(
                      parseFloat(String(miOferta.costo_repuestos || '0'))
                      + parseFloat(String(miOferta.costo_gestion_compra || '0')) * 1.19,
                    )}
                  </Text>
                </View>
                {miOferta.costo_mano_obra && parseFloat(miOferta.costo_mano_obra) > 0 ? (
                  <View style={styles.pagoParcialRow}>
                    <Text style={styles.pagoParcialLabel}>Pendiente (mano de obra)</Text>
                    <Text style={[styles.pagoParcialMonto, { color: I.accentYellow }]}>
                      {formatearPrecio(parseFloat(String(miOferta.costo_mano_obra)) * 1.19)}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </HostPaperSection>

      {miOferta.estado === 'pendiente_creditos' ? (
        <>
          <HostSectionKicker label="Comunicación" />
          <HostPaperSection style={styles.sectionGap}>
            <View style={styles.serviceActionsContainer}>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
                activeOpacity={0.85}
              >
                <InstitutionalIcon name="chat" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.chatButtonText}>Abrir Chat con Cliente</Text>
              </TouchableOpacity>
            </View>
          </HostPaperSection>
        </>
      ) : null}

      {enEjecucionAbierto ? (
        <>
          <HostSectionKicker label="Servicio en ejecución" />
          <HostPaperSection style={styles.sectionGap}>
            <View style={styles.serviceActionsContainer}>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
              >
                <InstitutionalIcon name="chat" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.chatButtonText}>Abrir Chat con Cliente</Text>
              </TouchableOpacity>

              {loadingChecklist ? (
                <View style={styles.checklistStatusCard}>
                  <ActivityIndicator size="small" color={I.primary} />
                  <Text style={styles.checklistStatusText}>Cargando checklist…</Text>
                </View>
              ) : checklistInstance ? (
                checklistInstance.estado === 'COMPLETADO' ? (
                  <EstadoBanner
                    type="success"
                    title="Checklist completado"
                    message="El servicio tiene un checklist finalizado."
                    icon="check-circle"
                    action={{ text: 'Ver resumen', onPress: onOpenCompletedChecklist }}
                  />
                ) : bannerChecklistAccion ? (
                  <EstadoBanner
                    type={bannerChecklistAccion.type}
                    title={bannerChecklistAccion.title}
                    message={bannerChecklistAccion.message}
                    icon={bannerChecklistAccion.icon}
                    action={{
                      text: checklistInstance.estado === 'PENDIENTE' ? 'Iniciar checklist' : 'Continuar checklist',
                      onPress: onOpenChecklist,
                    }}
                  />
                ) : null
              ) : null}
            </View>
          </HostPaperSection>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  estadoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
  fechaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fechaBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  planPagoSection: {
    marginBottom: SPACING.fixed.md,
  },
  planPagoTitulo: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  sectionGap: {
    marginBottom: SPACING.fixed.md,
  },
  addressCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    ...SHADOWS.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  addressContent: { flex: 1 },
  addressText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  addressDetailsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xs,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  mapsButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  precioCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  precioDesgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  precioDesgloseLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  precioDesgloseValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  precioDesgloseLabelMuted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  precioDesgloseValueMuted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  precioDesgloseDivider: {
    height: 1,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.sm,
  },
  precioTotalDestacadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  precioTotalDestacadoLabel: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  precioTotalDestacadoValue: {
    fontSize: TS.h3.fontSize,
    fontFamily: FF.monoMedium,
    color: I.primary,
  },
  pagoParcialInfoCard: {
    marginTop: SPACING.fixed.md,
    backgroundColor: withOpacity(I.accentYellow, 0.08),
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.accentYellow, 0.35),
  },
  pagoParcialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  pagoParcialTitulo: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  pagoParcialNota: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    marginBottom: SPACING.fixed.sm,
  },
  pagoParcialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.fixed.xs,
  },
  pagoParcialLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    flex: 1,
  },
  pagoParcialMonto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  serviceActionsContainer: {
    gap: SPACING.fixed.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.lg,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    ...SHADOWS.editorial,
  },
  chatButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  checklistStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  checklistStatusText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
});
