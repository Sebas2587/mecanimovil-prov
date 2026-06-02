import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { TarifaPorMarca } from '@/utils/tarifasPorMarca';
import { formatearPrecioCLP, montoPrecioPublicoOferta } from '@/utils/tarifasPorMarca';
import type { ServicioOfertaLike } from '@/utils/agruparOfertasServicio';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TY = TYPOGRAPHY.styles;

type OfertaMarcaRef = ServicioOfertaLike & {
  id: number;
  marca_vehiculo_info?: { nombre?: string; logo?: string | null } | null;
};

function MarcaTarifaHeader({
  tarifa,
  oferta,
  size = 'md',
}: {
  tarifa: TarifaPorMarca;
  oferta?: OfertaMarcaRef;
  size?: 'md' | 'lg';
}) {
  const nombre = oferta?.marca_vehiculo_info?.nombre?.trim() || tarifa.marcaLabel;
  const logoUri = oferta?.marca_vehiculo_info?.logo?.trim();
  const esBase = tarifa.marcaId === 0;

  return (
    <View style={styles.marcaHeader}>
      <View
        style={[
          styles.marcaIconWrap,
          size === 'lg' && styles.marcaIconWrapLg,
          esBase && styles.marcaIconWrapBase,
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
        <Text
          style={[styles.marcaNombre, size === 'lg' && styles.marcaNombreLg]}
          numberOfLines={2}
        >
          {nombre}
        </Text>
        {esBase ? (
          <Text style={styles.marcaSub} numberOfLines={1}>
            Todas las marcas
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

  return (
    <View style={[styles.listaDestacada, unaSola && styles.listaDestacadaUna]}>
      {list.map((tarifa) => {
        const oferta = ofertaPorId.get(tarifa.ofertaId);
        return (
          <View
            key={tarifa.ofertaId}
            style={[styles.celdaTarifa, unaSola && styles.celdaTarifaUna]}
          >
            <MarcaTarifaHeader tarifa={tarifa} oferta={oferta} size={unaSola ? 'lg' : 'md'} />
            <View style={styles.precioCol}>
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
              <Text style={styles.precioEtiqueta} numberOfLines={1}>
                Precio al público
              </Text>
            </View>
            {!tarifa.disponible ? (
              <View style={styles.pausadoBadge}>
                <Text style={styles.pausadoText}>Pausado</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type ResumenOfertaProps = {
  oferta: OfertaMarcaRef;
  children: React.ReactNode;
};

/** Card institucional por marca/oferta (resumen del servicio). */
export function TarifaMarcaResumenCard({ oferta, children }: ResumenOfertaProps) {
  const tarifa: TarifaPorMarca = {
    ofertaId: oferta.id,
    marcaId: oferta.marca_vehiculo_seleccionada ?? 0,
    marcaLabel:
      oferta.marca_vehiculo_info?.nombre?.trim()
      || (oferta.marca_vehiculo_seleccionada == null ? 'Precio base' : `Marca #${oferta.marca_vehiculo_seleccionada}`),
    precioPublico: null,
    disponible: oferta.disponible !== false,
    costoManoObra: oferta.costo_mano_de_obra_sin_iva,
    costoRepuestos: oferta.costo_repuestos_sin_iva,
    desglose: oferta.desglose_precios,
    tipoServicio: oferta.tipo_servicio || 'sin_repuestos',
  };

  const precioHero = montoPrecioPublicoOferta(oferta);

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
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  marcaSub: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  precioCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '46%',
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
  pausadoBadge: {
    position: 'absolute',
    top: SPACING.fixed.xs,
    right: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: withOpacity(I.semanticDown, 0.12),
  },
  pausadoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.semanticDown,
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
