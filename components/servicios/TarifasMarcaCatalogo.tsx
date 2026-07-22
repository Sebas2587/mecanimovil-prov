import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Car, Layers } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  InstitutionalButton,
  InstitutionalTag,
} from '@/app/design-system/components';
import { hostIconPlateStyle, hostIconPlateColor } from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { TarifaPorMarca } from '@/utils/tarifasPorMarca';
import {
  formatearPrecioCLP,
  montoPrecioPublicoOferta,
  buildTarifasPorMarca,
  etiquetaMarcaOferta,
} from '@/utils/tarifasPorMarca';
import type { ServicioOfertaLike } from '@/utils/agruparOfertasServicio';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TY = TYPOGRAPHY.styles;

type OfertaMarcaRef = ServicioOfertaLike & {
  id: number;
  marca_vehiculo_info?: { nombre?: string; logo?: string | null } | null;
  modelo_vehiculo_info?: { nombre?: string } | null;
  modelo_vehiculo_seleccionado?: number | null;
};

function MarcaTarifaHeader({
  tarifa,
  oferta,
  size = 'md',
  showTipoServicio = false,
}: {
  tarifa: TarifaPorMarca;
  oferta?: OfertaMarcaRef;
  size?: 'md' | 'lg';
  showTipoServicio?: boolean;
}) {
  const nombre = oferta?.marca_vehiculo_info?.nombre?.trim() || tarifa.marcaLabel;
  const logoUri = oferta?.marca_vehiculo_info?.logo?.trim();
  const esBase = tarifa.marcaId === 0;
  const modeloSub =
    tarifa.modeloLabel?.trim() || oferta?.modelo_vehiculo_info?.nombre?.trim() || null;
  const motorSuffix = tarifa.motorLabel?.trim() || null;
  const tipoLabel = tarifa.tipoServicio === 'con_repuestos' ? 'Con repuestos' : 'Sin repuestos';
  const plateSize = size === 'lg' ? 40 : 36;

  return (
    <View style={styles.marcaHeader}>
      <View
        style={[
          hostIconPlateStyle,
          { width: plateSize, height: plateSize, borderRadius: plateSize / 2 },
          esBase && styles.marcaPlateMuted,
        ]}
      >
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.marcaLogo} contentFit="contain" />
        ) : esBase ? (
          <Layers size={size === 'lg' ? 18 : 16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Car size={size === 'lg' ? 18 : 16} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>
      <View style={styles.marcaTextCol}>
        <Text style={[styles.marcaNombre, size === 'lg' && styles.marcaNombreLg]} numberOfLines={2}>
          {nombre}
          {modeloSub && !esBase ? (
            <Text style={styles.marcaMetaInline}>{` · ${modeloSub}`}</Text>
          ) : null}
          {motorSuffix ? <Text style={styles.marcaMetaInline}>{` · ${motorSuffix}`}</Text> : null}
        </Text>
        {esBase ? (
          <Text style={styles.marcaMeta} numberOfLines={1}>
            Todas las marcas
          </Text>
        ) : showTipoServicio ? (
          <Text style={styles.marcaMeta} numberOfLines={1}>
            {tipoLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Lista marca · precio (filas hairline Host, sin cards anidadas). */
function TarifasMarcaListaDestacadaComponent({
  tarifas,
  ofertas,
}: {
  tarifas: TarifaPorMarca[];
  ofertas?: OfertaMarcaRef[];
}) {
  const list = tarifas?.length ? tarifas : [];
  const ofertaPorId = useMemo(() => {
    const map = new Map<number, OfertaMarcaRef>();
    for (const o of ofertas ?? []) {
      if (o?.id != null) map.set(o.id, o);
    }
    return map;
  }, [ofertas]);

  const tiposUnicos = useMemo(() => new Set(list.map((t) => t.tipoServicio)).size, [list]);
  const mostrarTipoServicio = tiposUnicos > 1;

  if (list.length === 0) return null;

  return (
    <View style={styles.listaDestacada}>
      {list.map((tarifa, index) => {
        const oferta = ofertaPorId.get(tarifa.ofertaId);
        const last = index === list.length - 1;
        return (
          <View key={tarifa.ofertaId} style={[styles.celdaTarifa, !last && styles.celdaBorder]}>
            <MarcaTarifaHeader
              tarifa={tarifa}
              oferta={oferta}
              size="md"
              showTipoServicio={mostrarTipoServicio}
            />
            <View style={styles.precioCol}>
              <Text
                style={[styles.precioMonto, !tarifa.disponible && styles.precioOff]}
                numberOfLines={1}
              >
                {formatearPrecioCLP(tarifa.precioPublico)}
              </Text>
              <Text style={styles.precioEtiqueta} numberOfLines={1}>
                {tarifa.disponible ? 'Al público' : 'Pausado'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const TarifasMarcaListaDestacada = memo(TarifasMarcaListaDestacadaComponent);

type ResumenOfertaProps = {
  oferta: OfertaMarcaRef;
  children: React.ReactNode;
  onToggleDisponibilidad?: () => void;
  togglingDisponibilidad?: boolean;
  onEditar?: () => void;
};

/** Paper Host por marca/oferta (resumen del servicio). */
function TarifaMarcaResumenCardComponent({
  oferta,
  children,
  onToggleDisponibilidad,
  togglingDisponibilidad = false,
  onEditar,
}: ResumenOfertaProps) {
  const tarifa =
    buildTarifasPorMarca([oferta as ServicioOfertaLike])[0] ?? {
      ofertaId: oferta.id,
      marcaId: oferta.marca_vehiculo_seleccionada ?? 0,
      marcaLabel: etiquetaMarcaOferta(oferta as ServicioOfertaLike),
      modeloId: oferta.modelo_vehiculo_seleccionado ?? null,
      modeloLabel: oferta.modelo_vehiculo_info?.nombre?.trim() || null,
      motorCodigo: (oferta.tipo_motor ?? '').trim() || null,
      motorLabel: null,
      precioPublico: montoPrecioPublicoOferta(oferta as ServicioOfertaLike),
      disponible: oferta.disponible !== false,
      costoManoObra: oferta.costo_mano_de_obra_sin_iva,
      costoRepuestos: oferta.costo_repuestos_sin_iva,
      desglose: oferta.desglose_precios,
      tipoServicio: oferta.tipo_servicio || 'sin_repuestos',
    };

  const precioHero = montoPrecioPublicoOferta(oferta as ServicioOfertaLike);
  const pausaLabel = tarifa.modeloLabel
    ? oferta.disponible
      ? 'Pausar modelo'
      : 'Activar modelo'
    : oferta.disponible
      ? 'Pausar marca'
      : 'Activar marca';
  const tipoLabel =
    oferta.tipo_servicio === 'con_repuestos' ? 'Con repuestos' : 'Sin repuestos';

  return (
    <HostPaperSection style={styles.resumenCard}>
      <View style={styles.resumenCardHeader}>
        <View style={styles.resumenHeaderMain}>
          <MarcaTarifaHeader tarifa={tarifa} oferta={oferta} size="lg" />
        </View>
        <View style={styles.resumenHeaderBadges}>
          <InstitutionalTag
            label={oferta.disponible ? 'Activo' : 'Pausado'}
            variant={oferta.disponible ? 'success' : 'error'}
            size="sm"
          />
          <InstitutionalTag label={tipoLabel} variant="neutral" size="sm" />
        </View>
      </View>

      {precioHero != null ? (
        <View style={styles.heroPrecioWrap}>
          <Text style={styles.heroPrecioLabel}>Precio al público</Text>
          <Text style={styles.heroPrecioMonto}>{formatearPrecioCLP(precioHero)}</Text>
        </View>
      ) : null}

      {children}

      {onEditar || onToggleDisponibilidad ? (
        <View style={styles.resumenCardActions}>
          {onEditar ? (
            <View style={styles.actionFlex}>
              <InstitutionalButton label="Editar" variant="outline" size="compact" onPress={onEditar} />
            </View>
          ) : null}
          {onToggleDisponibilidad ? (
            <View style={styles.actionFlex}>
              {togglingDisponibilidad ? (
                <View style={styles.actionLoading}>
                  <ActivityIndicator size="small" color={I.ink} />
                </View>
              ) : (
                <InstitutionalButton
                  label={pausaLabel}
                  variant={oferta.disponible ? 'secondary' : 'outline'}
                  size="compact"
                  onPress={onToggleDisponibilidad}
                />
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </HostPaperSection>
  );
}

export const TarifaMarcaResumenCard = memo(TarifaMarcaResumenCardComponent);

const styles = StyleSheet.create({
  listaDestacada: {
    marginTop: SPACING.fixed.xs,
  },
  celdaTarifa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    paddingVertical: 12,
  },
  celdaBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  marcaHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    minWidth: 0,
  },
  marcaPlateMuted: {
    backgroundColor: I.surfaceStrong,
  },
  marcaLogo: {
    width: 20,
    height: 20,
  },
  marcaTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  marcaNombre: {
    fontSize: TY.bodyBold.fontSize,
    fontFamily: FF.sansSemiBold,
    fontWeight: TY.bodyBold.fontWeight as '600',
    color: I.ink,
    lineHeight: Math.round(TY.bodyBold.fontSize * TY.bodyBold.lineHeight),
    letterSpacing: TY.bodyBold.letterSpacing ?? 0,
  },
  marcaNombreLg: {
    fontSize: TY.h4.fontSize,
    lineHeight: Math.round(TY.h4.fontSize * TY.h4.lineHeight),
    letterSpacing: TY.h4.letterSpacing ?? 0,
  },
  marcaMetaInline: {
    fontFamily: FF.sansRegular,
    fontWeight: '400',
    color: I.body,
  },
  marcaMeta: {
    fontSize: TY.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TY.caption.fontSize * TY.caption.lineHeight),
  },
  precioCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 104,
  },
  precioMonto: {
    fontSize: Math.max(TY.numberDisplay.fontSize, TY.bodyBold.fontSize),
    fontFamily: FF.monoMedium,
    fontWeight: TY.numberDisplay.fontWeight,
    color: I.ink,
    letterSpacing: TY.numberDisplay.letterSpacing,
    textAlign: 'right',
    lineHeight: Math.round(TY.bodyBold.fontSize * 1.3),
  },
  precioEtiqueta: {
    marginTop: 2,
    fontSize: TY.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'right',
    lineHeight: Math.round(TY.caption.fontSize * TY.caption.lineHeight),
  },
  precioOff: {
    color: I.mutedSoft,
    textDecorationLine: 'line-through',
  },
  resumenCard: {
    marginBottom: SPACING.fixed.md,
  },
  resumenCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  resumenHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  resumenHeaderBadges: {
    alignItems: 'flex-end',
    gap: SPACING.fixed.xs,
    flexShrink: 0,
  },
  heroPrecioWrap: {
    marginBottom: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  heroPrecioLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: SPACING.fixed.xxs,
  },
  heroPrecioMonto: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: TY.numberDisplay.letterSpacing,
  },
  resumenCardActions: {
    marginTop: SPACING.fixed.md,
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  actionFlex: {
    flex: 1,
    minWidth: 0,
  },
  actionLoading: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
});
