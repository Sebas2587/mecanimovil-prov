import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Check,
  Edit3,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  Car,
  Building2,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  HostSectionKicker,
  HostPaperSection,
  InstitutionalTag,
  InstitutionalButton,
  InstitutionalText,
  hostIconPlateStyle,
  hostIconPlateColor,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { router } from 'expo-router';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { ModalAjusteBorrador } from './ModalAjusteBorrador';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert } from '@/utils/platformAlert';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;

interface CotizacionesPendientesSectionProps {
  cotizaciones: CotizacionCanal[];
  loading?: boolean;
  onRefresh: () => void;
}

export function CotizacionesPendientesSection({
  cotizaciones,
  loading = false,
  onRefresh,
}: CotizacionesPendientesSectionProps) {
  const [selectedBorrador, setSelectedBorrador] = useState<CotizacionCanal | null>(null);
  const [modalAjusteVisible, setModalAjusteVisible] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const borradores = useMemo(() => {
    return cotizaciones.filter(
      (c) => c.estado === 'borrador' && !c.enviada_en && Boolean(c.id)
    );
  }, [cotizaciones]);

  const handleAprobarRapido = useCallback(async (cotizacion: CotizacionCanal) => {
    try {
      setApprovingId(cotizacion.id);
      await cotizacionCanalService.enviar(cotizacion.id);
      showAlert('Cotización Enviada', `La cotización para ${cotizacion.cliente_nombre || 'el cliente'} ha sido aprobada y enviada.`);
      onRefresh();
    } catch (error: any) {
      console.error('Error al aprobar cotización:', error);
      showAlert('Error', error?.message || 'No se pudo enviar la cotización.');
    } finally {
      setApprovingId(null);
    }
  }, [onRefresh]);

  const handleAbrirAjuste = useCallback((cotizacion: CotizacionCanal) => {
    setSelectedBorrador(cotizacion);
    setModalAjusteVisible(true);
  }, []);

  const handleIrAlChat = useCallback((item: CotizacionCanal) => {
    if (item.conversation) {
      router.push(
        omnichannelChatHref(item.conversation, {
          channel: item.canal,
          name: item.cliente_nombre,
          phone: item.cliente_telefono,
        })
      );
    } else {
      router.push('/chats');
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <HostSectionKicker label="Acción Requerida — Cotizaciones IA" />
        <HostPaperSection style={styles.loadingBox}>
          <ActivityIndicator color={I.primary} size="small" />
          <InstitutionalText role="caption" color="body" style={styles.loadingText}>
            Buscando borradores pendientes...
          </InstitutionalText>
        </HostPaperSection>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <HostSectionKicker label="Acción Requerida — Cotizaciones IA" />
        {borradores.length > 0 ? (
          <InstitutionalTag
            label={`${borradores.length} pendientes`}
            variant="primary"
            size="sm"
          />
        ) : null}
      </View>

      {borradores.length === 0 ? (
        <HostPaperSection style={styles.zeroStateBox}>
          <View style={styles.zeroStateHeader}>
            <View style={hostIconPlateStyle}>
              <Sparkles size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={{ flex: 1 }}>
              <InstitutionalText role="bodyBold">IA Activa y Atendiendo</InstitutionalText>
              <InstitutionalText role="caption" color="body" style={styles.zeroStateSub}>
                Tus canales omnicanal están siendo gestionados automáticamente. No hay cotizaciones pendientes de tu aprobación en este momento.
              </InstitutionalText>
            </View>
          </View>
        </HostPaperSection>
      ) : (
        borradores.map((item, index) => {
          const esUltimo = index === borradores.length - 1;
          const esAprobando = approvingId === item.id;
          const requiereValidacionRepuesto = item.advertencias && item.advertencias.length > 0;

          return (
            <HostPaperSection key={item.id} style={!esUltimo ? styles.cardMargin : undefined}>
              <View style={styles.cardHeader}>
                <InstitutionalTag
                  label={(item.canal || 'WhatsApp').toUpperCase()}
                  variant="neutral"
                  size="sm"
                  uppercase
                />
                {requiereValidacionRepuesto ? (
                  <InstitutionalTag
                    label="Validar Repuesto"
                    variant="warning"
                    size="sm"
                    leading={
                      <AlertTriangle
                        size={12}
                        color={I.accentYellow}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    }
                  />
                ) : (
                  <InstitutionalTag
                    label="Precios Catálogo IA"
                    variant="success"
                    size="sm"
                    leading={
                      <Sparkles
                        size={12}
                        color={I.semanticUp}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    }
                  />
                )}
              </View>

              <View style={styles.infoRow}>
                <View style={hostIconPlateStyle}>
                  <Car size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={{ flex: 1 }}>
                  <InstitutionalText role="bodyBold" numberOfLines={1}>
                    {item.cliente_nombre || 'Cliente sin nombre'}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body" numberOfLines={1}>
                    {item.vehiculo_marca} {item.vehiculo_modelo} {item.vehiculo_anio ? `(${item.vehiculo_anio})` : ''} • {item.vehiculo_patente || 'Sin patente'}
                  </InstitutionalText>
                </View>
              </View>

              <View style={styles.servicioBox}>
                <InstitutionalText role="caption">{item.servicio_nombre || 'Servicio Mecánico'}</InstitutionalText>
                {item.descripcion_problema ? (
                  <InstitutionalText role="caption" color="body" numberOfLines={2} style={styles.servicioDesc}>
                    "{item.descripcion_problema}"
                  </InstitutionalText>
                ) : null}
              </View>

              {(() => {
                const meta = (item.metadata || {}) as Record<string, any>;
                const tiendasRepuestos = item.repuestos
                  ?.map((r: any) => r.fuente_repuesto || r.fuente || r.proveedor || r.tienda || r.origen || r.vendedor)
                  .filter((f): f is string => Boolean(f && typeof f === 'string' && f.trim()));

                const tiendaMeta = meta.vehiculo_fuente || meta.casa_repuestos || meta.proveedor || meta.tienda || meta.origen || meta.fuente_repuestos;

                const tiendaReal = tiendasRepuestos && tiendasRepuestos.length > 0
                  ? Array.from(new Set(tiendasRepuestos)).join(' • ')
                  : (typeof tiendaMeta === 'string' && tiendaMeta.trim() ? tiendaMeta.trim() : 'MercadoLibre Chile');

                return (
                  <View style={styles.sourceBox}>
                    <Building2 size={14} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 6 }} />
                    <InstitutionalText role="caption" color="body" style={styles.sourceLabel}>
                      Casa de Repuestos:
                    </InstitutionalText>
                    <InstitutionalText role="caption" numberOfLines={1} style={styles.sourceVal}>
                      {tiendaReal}
                    </InstitutionalText>
                  </View>
                );
              })()}

              {(() => {
                const manoObra = Number(item.mano_obra_clp) || 0;
                const repuestos = Number(item.costo_repuestos_clp) || 0;
                const totalFinal = item.total_clp || (manoObra + repuestos);

                return (
                  <View style={styles.montoBox}>
                    <View style={styles.montoRowMini}>
                      <InstitutionalText role="caption" color="body">Mano de Obra:</InstitutionalText>
                      <InstitutionalText role="caption">{formatearMontoCLP(manoObra)}</InstitutionalText>
                    </View>
                    <View style={styles.montoRowMini}>
                      <InstitutionalText role="caption" color="body">Repuestos:</InstitutionalText>
                      <InstitutionalText role="caption">{formatearMontoCLP(repuestos)}</InstitutionalText>
                    </View>
                    <View style={[styles.montoRowMini, styles.totalRowBorder]}>
                      <InstitutionalText role="caption">TOTAL FINAL (IVA incl.):</InstitutionalText>
                      <InstitutionalText role="bodyBold" color="primary">
                        {formatearMontoCLP(totalFinal)}
                      </InstitutionalText>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[hostIconPlateStyle, styles.chatBtn]}
                  onPress={() => handleIrAlChat(item)}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={18} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>

                <InstitutionalButton
                  label="Ajustar"
                  onPress={() => handleAbrirAjuste(item)}
                  variant="outline"
                  size="compact"
                  leading={<Edit3 size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
                  style={styles.editBtn}
                />

                <InstitutionalButton
                  label="Aprobar y Enviar"
                  onPress={() => handleAprobarRapido(item)}
                  disabled={esAprobando}
                  loading={esAprobando}
                  variant="primary"
                  size="compact"
                  leading={<Check size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                  style={styles.approveBtn}
                />
              </View>
            </HostPaperSection>
          );
        })
      )}

      <ModalAjusteBorrador
        visible={modalAjusteVisible}
        cotizacion={selectedBorrador}
        onClose={() => setModalAjusteVisible(false)}
        onSuccess={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.xs,
  },
  zeroStateBox: {},
  zeroStateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  zeroStateSub: {
    marginTop: 2,
  },
  cardMargin: {
    marginBottom: SPACING.fixed.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  servicioBox: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  servicioDesc: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    marginBottom: SPACING.fixed.xs,
  },
  sourceLabel: {
    marginRight: 4,
  },
  sourceVal: {
    flex: 1,
  },
  montoBox: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  montoRowMini: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalRowBorder: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  editBtn: {
    flexShrink: 0,
  },
  approveBtn: {
    flex: 1,
  },
});
