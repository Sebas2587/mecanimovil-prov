import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { certezaDe } from '@/components/cotizacion/repuestoCerteza';

const I = COLORS.institutional;

type Props = {
  repuestos: RepuestoCotizacion[];
  editable: boolean;
  onConfirmar: () => void;
};

export function ConfianzaPresupuestoCard({ repuestos, editable, onConfirmar }: Props) {
  const { ok, total } = useMemo(() => {
    const totalN = repuestos.length;
    const okN = repuestos.filter((r) => {
      const c = certezaDe(r);
      return c === 'confirmado' || c === 'asumido';
    }).length;
    return { ok: okN, total: totalN };
  }, [repuestos]);

  const dots = useMemo(() => {
    const n = Math.min(total, 8);
    return Array.from({ length: n }, (_, i) => i < ok);
  }, [ok, total]);

  const handlePress = useCallback(() => {
    onConfirmar();
  }, [onConfirmar]);

  if (total === 0) return null;

  if (ok === total) {
    return (
      <Card padding="host" style={styles.card}>
        <InstitutionalText role="caption" color="ink">
          Todos los precios confirmados
        </InstitutionalText>
      </Card>
    );
  }

  return (
    <Card padding="host" style={styles.card}>
      <View style={styles.dots}>
        {dots.map((filled, idx) => (
          <View
            key={`dot-${idx}`}
            style={[styles.dot, filled ? styles.dotOk : styles.dotPend]}
          />
        ))}
      </View>
      <InstitutionalText role="caption" color="ink">
        {ok} de {total} con precio confirmado
      </InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        Falta {total - ok} por confirmar
      </InstitutionalText>
      {editable ? (
        <InstitutionalButton
          label="Confirmar precios"
          variant="outline"
          size="compact"
          onPress={handlePress}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.fixed.xs },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOk: { backgroundColor: I.semanticUp },
  dotPend: { backgroundColor: I.accentYellow },
});
