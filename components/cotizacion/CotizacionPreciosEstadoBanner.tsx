import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;

type Props = {
  pendiente: boolean;
  conTienda: number;
  total: number;
  sinTienda: number;
  buscando?: boolean;
  onBuscar?: () => void;
  respaldoSinGemini?: boolean;
};

/** Recuadro en Repuestos: la IA sigue en tiendas o faltan fichas. */
export function CotizacionPreciosEstadoBanner({
  pendiente,
  conTienda,
  total,
  sinTienda,
  buscando = false,
  onBuscar,
  respaldoSinGemini = false,
}: Props) {
  if (total <= 0 && !respaldoSinGemini) return null;
  if (!pendiente && sinTienda <= 0 && !respaldoSinGemini) return null;

  const titulo = respaldoSinGemini
    ? 'Borrador listo para completar'
    : pendiente
      ? (conTienda > 0
        ? `${conTienda} de ${total} con precio de tienda`
        : 'Buscando precios en casas de Chile')
      : `${sinTienda} pieza${sinTienda === 1 ? '' : 's'} sin ficha de tienda`;
  const cuerpo = respaldoSinGemini
    ? 'Usamos el catálogo y el historial del taller. Las piezas siguen buscando precio; revisa montos antes de enviar.'
    : pendiente
      ? 'Catálogo del taller, historial y tiendas .cl. No envíes todavía: el monto aparece en cada línea al llegar.'
      : 'La primera pasada no encontró ficha. Vuelve a buscar: a veces la casa responde en el segundo intento. Si hay rango de mercado, úsalo de guía.';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {pendiente ? <ActivityIndicator size="small" color={I.ink} /> : null}
        <View style={styles.copy}>
          <InstitutionalText role="captionBold" color="ink">
            {titulo}
          </InstitutionalText>
          <InstitutionalText role="caption" color="muted">
            {cuerpo}
          </InstitutionalText>
        </View>
      </View>
      {!pendiente && onBuscar ? (
        <InstitutionalButton
          label={sinTienda === 1 ? 'Buscar el precio que falta' : `Buscar los ${sinTienda} precios`}
          variant="secondary"
          size="compact"
          onPress={onBuscar}
          loading={buscando}
          disabled={buscando}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: withOpacity(I.ink, 0.04),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});

export default CotizacionPreciosEstadoBanner;
