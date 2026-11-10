import React from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { vistaReferenciaTienda } from '@/utils/referenciaTienda';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';

const I = COLORS.institutional;

type Props = {
  rep: Pick<
    RepuestoCotizacion,
    | 'url_referencia'
    | 'url_producto'
    | 'tienda_referencia'
    | 'proveedor_nombre'
    | 'tienda_ml'
    | 'precio_verificado_clp'
    | 'casa_sugerida'
    | 'casa_repuesto_nombre'
    | 'precio_verificado_en_casa'
    | 'nota_referencia'
  >;
};

export function abrirUrlReferenciaTienda(url: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => undefined);
}

/** Tienda real del link, casa sugerida aparte y aviso si el precio no es de esa casa. */
export const ReferenciaTiendaLinea = React.memo(function ReferenciaTiendaLinea({ rep }: Props) {
  const ref = vistaReferenciaTienda(rep);
  if (!ref) return null;
  const etiquetaLink = ref.tienda ? `Ver en ${ref.tienda}` : 'Ver en tienda';

  return (
    <View style={styles.bloque} accessibilityLabel="Referencia de la tienda">
      {ref.tienda || ref.url ? (
        <View style={styles.row}>
          {ref.tienda || ref.precio ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={1} style={styles.texto}>
              {[ref.tienda, ref.precio].filter(Boolean).join(' ')}
            </InstitutionalText>
          ) : null}
          {ref.url ? (
            <TouchableOpacity
              onPress={() => abrirUrlReferenciaTienda(ref.url as string)}
              accessibilityRole="link"
              accessibilityLabel={etiquetaLink}
              hitSlop={8}
              style={styles.link}
            >
              <ExternalLink size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="captionBold" color="primary">
                Ver en tienda
              </InstitutionalText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {ref.casaSugerida ? (
        <InstitutionalText role="caption" color="muted">
          Casa sugerida: {ref.casaSugerida}
        </InstitutionalText>
      ) : null}
      {ref.nota ? (
        <View style={styles.aviso}>
          <AlertTriangle size={14} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="caption" color="ink" style={styles.avisoTexto}>
            {ref.nota}
          </InstitutionalText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  bloque: {
    gap: SPACING.fixed.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  texto: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
    flexShrink: 0,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
  avisoTexto: {
    flex: 1,
    minWidth: 0,
  },
});
