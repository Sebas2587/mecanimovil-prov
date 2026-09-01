import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import cotizacionCanalService, {
  resolverManoObraLineas,
  type VistaPreviaPublica,
} from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const IS_WEB = Platform.OS === 'web';

export type { VistaPreviaPublica };

function tituloCorto(nombre?: string | null): string {
  const raw = String(nombre || '').trim();
  if (!raw) return 'Detalle del presupuesto';
  if (raw.length > 72) return 'Detalle del presupuesto';
  return raw;
}

function formatFecha(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Props = {
  visible: boolean;
  cotizacionId?: number | null;
  esActualizacion?: boolean;
  puedeEnviar?: boolean;
  enviando?: boolean;
  onClose: () => void;
  onEnviar: () => void;
};

export function VistaPreviaCotizacionClienteModal({
  visible,
  cotizacionId,
  esActualizacion = false,
  puedeEnviar = true,
  enviando = false,
  onClose,
  onEnviar,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<VistaPreviaPublica | null>(null);

  const cargar = useCallback(async () => {
    if (!cotizacionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cotizacionCanalService.vistaPrevia(cotizacionId);
      setDoc(data);
    } catch {
      setError('No se pudo armar la vista previa.');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [cotizacionId]);

  useEffect(() => {
    if (visible && cotizacionId) {
      void cargar();
    }
  }, [visible, cotizacionId, cargar]);

  const vehiculo = [doc?.vehiculo_marca, doc?.vehiculo_modelo, doc?.vehiculo_anio]
    .filter(Boolean)
    .join(' ');
  const moLineas = resolverManoObraLineas({
    mano_obra_lineas: doc?.mano_obra_lineas,
    mano_obra_clp: doc?.mano_obra_clp ?? 0,
    servicio_nombre: doc?.servicio_nombre,
  }).filter((lin) => lin.monto_clp > 0);
  const reps = Array.isArray(doc?.repuestos) ? doc.repuestos : [];
  const desc = Math.max(0, Math.round(Number(doc?.descuento_clp) || 0));
  const clienteNombre = doc?.cliente?.nombre || doc?.cliente_nombre || '';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      stickyFooter
      style={IS_WEB ? styles.sheetWide : undefined}
    >
      <InstitutionalText role="caption" color="muted">
        Así la ve el cliente
      </InstitutionalText>
      <InstitutionalText role="h5" style={styles.heading}>
        {esActualizacion ? 'Vista previa de la actualización' : 'Vista previa de la cotización'}
      </InstitutionalText>
      <InstitutionalText role="small" color="muted" style={styles.hint}>
        {esActualizacion
          ? 'El cliente todavía ve la versión anterior. Si te parece bien, envíasela y le llega el link actualizado.'
          : 'Así la verá el cliente. Si te parece bien, envíasela.'}
      </InstitutionalText>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={I.primary} />
          </View>
        ) : error ? (
          <InstitutionalText role="body" color="muted">{error}</InstitutionalText>
        ) : doc ? (
          <View style={styles.paper}>
            <View style={styles.paperHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <InstitutionalText role="caption" color="muted">Cotización de</InstitutionalText>
                <InstitutionalText role="h5" numberOfLines={2}>
                  {doc.taller?.nombre || 'Tu taller'}
                </InstitutionalText>
                {doc.taller?.telefono ? (
                  <InstitutionalText role="small" color="muted">{doc.taller.telefono}</InstitutionalText>
                ) : null}
              </View>
              {doc.numero_publico ? (
                <View style={styles.folio}>
                  <InstitutionalText role="captionBold">#{doc.numero_publico}</InstitutionalText>
                </View>
              ) : null}
            </View>

            {clienteNombre ? (
              <View style={styles.block}>
                <InstitutionalText role="caption" color="muted">Cliente</InstitutionalText>
                <InstitutionalText role="body">{clienteNombre}</InstitutionalText>
              </View>
            ) : null}

            <View style={styles.block}>
              <InstitutionalText role="caption" color="muted">Vehículo</InstitutionalText>
              <InstitutionalText role="body">
                {vehiculo || 'Vehículo'}
                {doc.vehiculo_patente ? ` · ${doc.vehiculo_patente}` : ''}
              </InstitutionalText>
              <InstitutionalText role="small" color="muted">
                {doc.modalidad === 'domicilio' ? 'A domicilio' : 'En taller'}
              </InstitutionalText>
            </View>

            {doc.es_trabajo_adicional ? (
              <View style={styles.tag}>
                <InstitutionalText role="captionBold">Trabajo adicional</InstitutionalText>
              </View>
            ) : null}

            <View style={styles.block}>
              <InstitutionalText role="caption" color="muted">Detalle</InstitutionalText>
              <InstitutionalText role="body">{tituloCorto(doc.servicio_nombre)}</InstitutionalText>
              {moLineas.map((lin) => (
                <View key={lin.id || lin.nombre} style={styles.lineRow}>
                  <InstitutionalText role="body" style={styles.lineName} numberOfLines={3}>
                    {lin.nombre}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="muted">Mano de obra</InstitutionalText>
                  <InstitutionalText role="bodyBold">{formatearMontoCLP(lin.monto_clp)}</InstitutionalText>
                </View>
              ))}
              {reps.map((rep, idx) => {
                const qty = Number(rep.cantidad) || 1;
                const unit = Number(rep.precio_unitario_clp) || 0;
                return (
                  <View key={`${rep.nombre}-${idx}`} style={styles.lineRow}>
                    <InstitutionalText role="body" style={styles.lineName} numberOfLines={3}>
                      {rep.nombre || 'Repuesto'}
                    </InstitutionalText>
                    <InstitutionalText role="caption" color="muted">
                      Repuesto · {qty} × {formatearMontoCLP(unit)}
                    </InstitutionalText>
                    <InstitutionalText role="bodyBold">{formatearMontoCLP(qty * unit)}</InstitutionalText>
                  </View>
                );
              })}
            </View>

            {doc.notas_cotizacion ? (
              <View style={styles.block}>
                <InstitutionalText role="caption" color="muted">Notas</InstitutionalText>
                <InstitutionalText role="small">{doc.notas_cotizacion}</InstitutionalText>
              </View>
            ) : null}

            <View style={styles.totals}>
              {Number(doc.costo_repuestos_clp) > 0 ? (
                <View style={styles.totalRow}>
                  <InstitutionalText role="small" color="muted">Repuestos</InstitutionalText>
                  <InstitutionalText role="small">{formatearMontoCLP(doc.costo_repuestos_clp)}</InstitutionalText>
                </View>
              ) : null}
              {Number(doc.mano_obra_clp) > 0 ? (
                <View style={styles.totalRow}>
                  <InstitutionalText role="small" color="muted">Mano de obra</InstitutionalText>
                  <InstitutionalText role="small">{formatearMontoCLP(doc.mano_obra_clp)}</InstitutionalText>
                </View>
              ) : null}
              {desc > 0 ? (
                <View style={styles.totalRow}>
                  <InstitutionalText role="small" color="muted">
                    {doc.descuento_etiqueta || 'Descuento'}
                  </InstitutionalText>
                  <InstitutionalText role="small">−{formatearMontoCLP(desc)}</InstitutionalText>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <InstitutionalText role="bodyBold">Total a pagar</InstitutionalText>
                <InstitutionalText role="h5">{formatearMontoCLP(doc.total_clp)}</InstitutionalText>
              </View>
            </View>

            <InstitutionalText role="caption" color="muted">
              {doc.fecha_expiracion_publica
                ? `Válida hasta el ${formatFecha(doc.fecha_expiracion_publica)}. `
                : ''}
              {doc.politicas_cotizacion || 'Los precios de línea ya incluyen IVA.'}
            </InstitutionalText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <InstitutionalButton
          label="Seguir editando"
          variant="outline"
          style={styles.footerBtn}
          onPress={onClose}
          disabled={enviando}
        />
        {puedeEnviar ? (
          <InstitutionalButton
            label={esActualizacion ? 'Enviar actualización' : 'Enviar al cliente'}
            variant="primary"
            style={styles.footerBtnGrow}
            onPress={onEnviar}
            loading={enviando}
            disabled={enviando || loading || !doc}
          />
        ) : (
          <InstitutionalButton
            label="Cerrar"
            variant="primary"
            style={styles.footerBtnGrow}
            onPress={onClose}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetWide: {
    maxWidth: 560,
  },
  heading: {
    marginTop: 2,
  },
  hint: {
    marginBottom: SPACING.fixed.sm,
  },
  scroll: {
    maxHeight: IS_WEB ? 420 : 460,
    flexGrow: 1,
  },
  scrollInner: {
    paddingBottom: SPACING.fixed.md,
  },
  centered: {
    paddingVertical: SPACING.fixed.xl,
    alignItems: 'center',
  },
  paper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.md,
    backgroundColor: COLORS.background.paper,
  },
  paperHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  folio: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.sm,
  },
  block: {
    gap: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  lineRow: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    gap: 2,
  },
  lineName: {
    flex: 1,
  },
  totals: {
    gap: 6,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
  },
  footerBtn: {
    flex: 1,
  },
  footerBtnGrow: {
    flex: 1.35,
  },
});
