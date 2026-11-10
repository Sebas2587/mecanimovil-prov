import React from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  textoCasaSugeridaLinea,
  vistaReferenciaTienda,
  type ReferenciaTiendaInput,
} from '@/utils/referenciaTienda';

const I = COLORS.institutional;

type Props = {
  rep: ReferenciaTiendaInput;
};

export function abrirUrlReferenciaTienda(url: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => undefined);
}

/** Tienda real una vez, junto al precio y un enlace. Casa sugerida + nota en una línea. */
export const ReferenciaTiendaLinea = React.memo(function ReferenciaTiendaLinea({ rep }: Props) {
  const ref = vistaReferenciaTienda(rep);
  if (!ref) return null;
  const etiquetaLink = ref.tienda ? `Ver en ${ref.tienda}` : 'Ver en tienda';
  const casaNota = textoCasaSugeridaLinea(rep);

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
      {casaNota ? (
        <InstitutionalText role="caption" color="muted">
          {casaNota}
        </InstitutionalText>
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
});
