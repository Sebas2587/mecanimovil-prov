import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { TarifaPorMarca } from '@/utils/tarifasPorMarca';
import { formatearPrecioCLP, montoPrecioPublicoOferta, buildTarifasPorMarca, etiquetaMarcaOferta } from '@/utils/tarifasPorMarca';
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
    tarifa.modeloLabel?.trim()
    || oferta?.modelo_vehiculo_info?.nombre?.trim()
    || null;
  const motorSuffix = tarifa.motorLabel?.trim() || null;
  const tipoLabel = tarifa.tipoServicio === 'con_repuestos' ? 'Con repuestos' : 'Sin repuestos';

  return (
    <View style={[styles.marcaHeader, esBase && styles.marcaHeaderStacked]}>
      <View
        style={[
          styles.marcaIconWrap,
          size === 'lg' && styles.marcaIconWrapLg,
          esBase && styles.marcaIconWrapBase,
          esBase && styles.marcaIconWrapTop,
        ]}
      >
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.marcaLogo} contentFit="contain" />
        ) : (
          <InstitutionalIcon
            name={esBase ? 'albums-outline' : 'car-sport-outline'}
            size={size === 'lg' ? 18 : 14}
            color={esBase ? I.muted : I.primary}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        )}
      </View>
      <View style={styles.marcaTextCol}>
        {modeloSub && !esBase ? (
          <Text
            style={[styles.marcaNombre, size === 'lg' && styles.marcaNombreLg]}
            numberOfLines={2}
          >
            {nombre}
            <Text style={[styles.marcaModeloInline, size === 'lg' && styles.marcaModeloInlineLg]}>
              {' · '}
              {modeloSub}
            </Text>
            {motorSuffix ? (
              <Text style={[styles.marcaMotorInline, size === 'lg' && styles.marcaMotorInlineLg]}>
                {' · '}
                {motorSuffix}
              </Text>
            ) : null}
          </Text>
        ) : (
          <Text
            style={[styles.marcaNombre, size === 'lg' && styles.marcaNombreLg]}
            numberOfLines={1}
          >
            {nombre}
          </Text>
        )}
        {esBase ? (
          <Text
            style={[styles.marcaMeta, size === 'lg' && styles.marcaMetaLg]}
            numberOfLines={1}
          >
            Todas las marcas
          </Text>
        ) : showTipoServicio ? (
          <Text
            style={[styles.marcaMeta, size === 'lg' && styles.marcaMetaLg]}
            numberOfLines={1}
          >
            {tipoLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Lista destacada marca + precio (Mis servicios). */
export function TarifasMarcaListaDestacada({
  tarifas,
  ofertas,
}: {
  tarifas: TarifaPorMarca[];
  ofertas?: OfertaMarcaRef[];
}) {
  const list = tarifas?.length ? tarifas : [];
  if (list.length === 0) return null;

  const ofertaPorId = useMemo(() => {
    const map = new Map<number, OfertaMarcaRef>();
    for (const o of ofertas ?? []) {
      if (o?.id != null) map.set(o.id, o);
    }
    return map;
  }, [ofertas]);

  const unaSola = list.length === 1;
  
  // Detectar si hay mezcla de tipos de servicio (con/sin repuestos)
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(list.map((t) => t.tipoServicio));
    return tipos.size;
  }, [list]);
  const mostrarTipoServicio = tiposUnicos > 1;

  return (
    <View style={[styles.listaDestacada, unaSola && styles.listaDestacadaUna]}>
      {list.map((tarifa) => {
        const oferta = ofertaPorId.get(tarifa.ofertaId);
        return (
          <View
            key={tarifa.ofertaId}
            style={[styles.celdaTarifa, unaSola && styles.celdaTarifaUna]}
          >
            <MarcaTarifaHeader 
              tarifa={tarifa} 
              oferta={oferta} 
              size={unaSola ? 'lg' : 'md'} 
              showTipoServicio={mostrarTipoServicio}
            />
            <View style={styles.precioCol}>
              <View style={styles.precioTopRow}>
                <Text
                  style={[
                    styles.precioMonto,
                    unaSola && styles.precioMontoUna,
                    !tarifa.disponible && styles.precioOff,
                  ]}
                  numberOfLines={1}
                >
                  {formatearPrecioCLP(tarifa.precioPublico)}
                </Text>
                {!tarifa.disponible ? (
                  <View style={styles.pausadoBadgeInline}>
                    <Text style={styles.pausadoText}>Pausado</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.precioEtiqueta} numberOfLines={1}>
                {tarifa.disponible ? 'Precio al público' : 'No visible para clientes'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

type ResumenOfertaProps = {
  oferta: OfertaMarcaRef;
  children: React.ReactNode;
  onToggleDisponibilidad?: () => void;
  togglingDisponibilidad?: boolean;
  onEditar?: () => void;
};

/** Card institucional por marca/oferta (resumen del servicio). */
export function TarifaMarcaResumenCard({
  oferta,
  children,
  onToggleDisponibilidad,
  togglingDisponibilidad = false,
  onEditar,
}: ResumenOfertaProps) {
  const tarifa =
    buildTarifasPorMarca([oferta as ServicioOfertaLike])[0]
    ?? {
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
    ? (oferta.disponible ? 'Pausar este modelo' : 'Activar este modelo')
    : (oferta.disponible ? 'Pausar esta marca' : 'Activar esta marca');

  const tipoLabel =
    oferta.tipo_servicio === 'con_repuestos' ? 'Con repuestos' : 'Sin repuestos';

  return (
    <View style={styles.resumenCard}>
      <View style={styles.resumenCardHeader}>
        <MarcaTarifaHeader tarifa={tarifa} oferta={oferta} size="lg" />
        <View style={styles.resumenHeaderBadges}>
          <View
            style={[
              styles.miniPill,
              oferta.disponible ? styles.miniPillOn : styles.miniPillOff,
            ]}
          >
            <Text
              style={[
                styles.miniPillText,
                oferta.disponible ? styles.miniPillTextOn : styles.miniPillTextOff,
              ]}
            >
              {oferta.disponible ? 'Activo' : 'Pausado'}
            </Text>
          </View>
          <View style={styles.tipoPill}>
            <Text style={styles.tipoPillText}>{tipoLabel}</Text>
          </View>
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
            <TouchableOpacity
              style={[styles.toggleMarcaBtn, styles.toggleMarcaEdit]}
              onPress={onEditar}
              activeOpacity={0.88}
            >
              <InstitutionalIcon name="edit" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.toggleMarcaBtnText, styles.toggleMarcaEditText]}>Editar</Text>
            </TouchableOpacity>
          ) : null}
          {onToggleDisponibilidad ? (
            <TouchableOpacity
              style={[
                styles.toggleMarcaBtn,
                styles.toggleMarcaBtnFlex,
                oferta.disponible ? styles.toggleMarcaPause : styles.toggleMarcaPlay,
              ]}
              onPress={onToggleDisponibilidad}
              disabled={togglingDisponibilidad}
              activeOpacity={0.88}
            >
              {togglingDisponibilidad ? (
                <ActivityIndicator size="small" color={oferta.disponible ? I.accentYellow : I.semanticUp} />
              ) : (
                <>
                  <InstitutionalIcon
                    name={oferta.disponible ? 'pause' : 'play-arrow'}
                    size={18}
                    color={oferta.disponible ? I.accentYellow : I.semanticUp}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <Text
                    style={[
                      styles.toggleMarcaBtnText,
                      oferta.disponible ? styles.toggleMarcaPauseText : styles.toggleMarcaPlayText,
                    ]}
                  >
                    {pausaLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listaDestacada: {
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xs,
  },
  listaDestacadaUna: {
    marginTop: SPACING.fixed.sm,
  },
  celdaTarifa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    position: 'relative',
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingVertical: SPACING.fixed.sm + 2,
    paddingHorizontal: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  celdaTarifaUna: {
    paddingVertical: SPACING.fixed.md,
  },
  marcaHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    minWidth: 0,
  },
  marcaHeaderStacked: {
    alignItems: 'flex-start',
  },
  marcaIconWrapTop: {
    marginTop: 2,
  },
  marcaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaIconWrapLg: {
    width: 40,
    height: 40,
  },
  marcaIconWrapBase: {
    backgroundColor: I.canvas,
    borderColor: I.hairline,
  },
  marcaLogo: {
    width: 22,
    height: 22,
  },
  marcaTextCol: {
    flex: 1,
    minWidth: 0,
  },
  marcaNombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.35),
  },
  marcaNombreLg: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.tight),
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  marcaModeloInline: {
    fontFamily: FF.sansMedium,
    color: I.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  marcaModeloInlineLg: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  marcaMotorInline: {
    fontFamily: FF.sansRegular,
    color: I.muted,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  marcaMotorInlineLg: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  marcaMeta: {
    marginTop: SPACING.fixed.xxs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal),
  },
  marcaMetaLg: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  precioCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '48%',
    minWidth: 108,
  },
  precioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    maxWidth: '100%',
  },
  precioMonto: {
    fontSize: TY.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    fontWeight: TY.numberDisplay.fontWeight,
    color: I.ink,
    letterSpacing: TY.numberDisplay.letterSpacing,
    textAlign: 'right',
  },
  precioMontoUna: {
    fontSize: TYPOGRAPHY.fontSize.xl,
  },
  precioEtiqueta: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'right',
  },
  precioOff: {
    color: I.mutedSoft,
    textDecorationLine: 'line-through',
  },
  pausadoBadgeInline: {
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: withOpacity(I.semanticDown, 0.12),
    flexShrink: 0,
  },
  pausadoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.semanticDown,
  },
  resumenCardActions: {
    marginTop: SPACING.fixed.md,
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  toggleMarcaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
  },
  toggleMarcaBtnFlex: {
    flex: 1,
  },
  toggleMarcaEdit: {
    flex: 1,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderColor: withOpacity(I.primary, 0.25),
  },
  toggleMarcaEditText: {
    color: I.primary,
  },
  toggleMarcaPause: {
    backgroundColor: withOpacity(I.accentYellow, 0.12),
    borderColor: withOpacity(I.accentYellow, 0.35),
  },
  toggleMarcaPlay: {
    backgroundColor: withOpacity(I.semanticUp, 0.1),
    borderColor: withOpacity(I.semanticUp, 0.3),
  },
  toggleMarcaBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
  },
  toggleMarcaPauseText: {
    color: I.ink,
  },
  toggleMarcaPlayText: {
    color: I.semanticUp,
  },
  resumenCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  resumenCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  resumenHeaderBadges: {
    alignItems: 'flex-end',
    gap: SPACING.fixed.xs,
    flexShrink: 0,
  },
  miniPill: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs + 2,
    borderRadius: BORDERS.radius.pill,
  },
  miniPillOn: {
    backgroundColor: withOpacity(I.semanticUp, 0.14),
  },
  miniPillOff: {
    backgroundColor: withOpacity(I.semanticDown, 0.1),
  },
  miniPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  miniPillTextOn: { color: I.semanticUp },
  miniPillTextOff: { color: I.semanticDown },
  tipoPill: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  tipoPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  heroPrecioWrap: {
    marginBottom: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  heroPrecioLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: SPACING.fixed.xxs,
  },
  heroPrecioMonto: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    color: I.primary,
    letterSpacing: TY.numberDisplay.letterSpacing,
  },
});
