import React from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { textoReferenciaTienda } from '@/utils/referenciaTienda';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';

const I = COLORS.institutional;

type Props = {
  rep: Pick<RepuestoCotizacion, 'url_referencia' | 'tienda_referencia' | 'precio_verificado_clp'>;
};

export function abrirUrlReferenciaTienda(url: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => undefined);
}

/** Referencia compacta de la ficha. Visible en la línea, sin abrir el precio. */
export const ReferenciaTiendaLinea = React.memo(function ReferenciaTiendaLinea({ rep }: Props) {
  const ref = textoReferenciaTienda(rep);
  if (!ref) return null;

  return (
    <View style={styles.row} accessibilityLabel="Referencia de la tienda">
      {ref.texto ? (
        <InstitutionalText role="caption" color="muted" numberOfLines={1} style={styles.texto}>
          {ref.texto}
        </InstitutionalText>
      ) : null}
      <TouchableOpacity
        onPress={() => abrirUrlReferenciaTienda(ref.url)}
        accessibilityRole="link"
        accessibilityLabel="Ver en tienda"
        hitSlop={8}
        style={styles.link}
      >
        <ExternalLink size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <InstitutionalText role="captionBold" color="primary">
          Ver en tienda
        </InstitutionalText>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
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
});
