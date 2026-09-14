import React, { useCallback } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';
import {
  avisosFichaInterna,
  fichasInternasDe,
  type FichaInterna,
} from '@/components/cotizacion/repuestoCerteza';

const I = COLORS.institutional;

const FichaFuenteRow = React.memo(function FichaFuenteRow({ ficha }: { ficha: FichaInterna }) {
  const url = ficha.url.trim();
  const abrir = useCallback(() => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  }, [url]);

  return (
    <View style={styles.fichaRow}>
      <View style={styles.fichaCuerpo}>
        {ficha.tienda ? (
          <InstitutionalText role="captionBold" color="ink" numberOfLines={1}>
            {ficha.tienda}
          </InstitutionalText>
        ) : null}
        {ficha.titulo ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={2}>
            {ficha.titulo}
          </InstitutionalText>
        ) : null}
        {ficha.precio > 0 ? (
          <InstitutionalText role="caption" color="ink">
            Precio en ficha {formatearMontoCLP(ficha.precio)}
          </InstitutionalText>
        ) : null}
      </View>
      {url ? (
        <TouchableOpacity
          onPress={abrir}
          accessibilityRole="link"
          accessibilityLabel="Abrir ficha de la tienda"
          hitSlop={8}
          style={styles.abrirBtn}
        >
          <ExternalLink size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="captionBold" color="primary">
            Abrir ficha
          </InstitutionalText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

type Props = {
  rep: RepuestoCotizacion;
  vehiculoAnio?: number | string | null;
};

/** Trazabilidad interna: de qué ficha salió el precio. No viaja al cliente. */
export const FuenteFichaInterna = React.memo(function FuenteFichaInterna({
  rep,
  vehiculoAnio,
}: Props) {
  const fichas = fichasInternasDe(rep);
  if (!fichas.length) return null;
  const avisos = avisosFichaInterna(rep, fichas, vehiculoAnio);

  return (
    <View style={styles.box} accessibilityLabel="Fuente del precio, solo taller">
      <InstitutionalText role="caption" color="muted">
        Solo taller · origen del precio
      </InstitutionalText>
      {fichas.map((ficha) => (
        <FichaFuenteRow
          key={ficha.url || `${ficha.tienda}-${ficha.titulo}`}
          ficha={ficha}
        />
      ))}
      {avisos.map((aviso) => (
        <View key={aviso} style={styles.avisoRow}>
          <AlertTriangle size={14} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="caption" color="ink" style={styles.avisoTexto}>
            {aviso}
          </InstitutionalText>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  fichaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  fichaCuerpo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  abrirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  avisoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
  avisoTexto: {
    flex: 1,
    minWidth: 0,
  },
});
