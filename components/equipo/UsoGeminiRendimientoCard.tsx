import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import { HostMetricRow, HostPaperSection } from '@/app/design-system/components';
import type { UsoIaGemini } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function fmtTokens(n: number | undefined): string {
  if (n == null) return '0';
  return new Intl.NumberFormat('es-CL').format(n);
}

function fmtFecha(iso: string | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type Props = {
  uso: UsoIaGemini | undefined;
  titular?: string;
};

/** Lista Host de uso IA — una paper, filas hairline (sin tiles anidados). */
export function UsoGeminiRendimientoCard({ uso, titular }: Props) {
  if (!uso) return null;

  const alertaBg =
    uso.alerta_nivel === 'critical'
      ? withOpacity(I.semanticDown, 0.12)
      : uso.alerta_nivel === 'warning'
        ? withOpacity(I.accentYellow, 0.14)
        : I.surfaceSoft;

  const alertaBorder =
    uso.alerta_nivel === 'critical'
      ? I.semanticDown
      : uso.alerta_nivel === 'warning'
        ? I.accentYellow
        : I.hairline;

  const footerParts = [
    `Mes calendario: ${fmtTokens(uso.tokens_mes_calendario)} tokens`,
    uso.limite_mensual_tokens ? `límite ${fmtTokens(uso.limite_mensual_tokens)}` : null,
    uso.pct_limite_mensual != null ? `${uso.pct_limite_mensual}%` : null,
  ].filter(Boolean);

  return (
    <HostPaperSection>
      {titular ? <Text style={styles.subtitle}>{titular}</Text> : null}

      {!uso.gemini_configurado ? (
        <View
          style={[
            styles.alertBox,
            { backgroundColor: withOpacity(I.semanticDown, 0.1), borderColor: I.semanticDown },
          ]}
        >
          <Text style={styles.alertText}>
            GEMINI_API_KEY no está configurada en el servidor. El asistente no funcionará en
            producción.
          </Text>
        </View>
      ) : null}

      {uso.gemini_configurado && !uso.asistente_habilitado ? (
        <View
          style={[
            styles.alertBox,
            { backgroundColor: withOpacity(I.accentYellow, 0.12), borderColor: I.accentYellow },
          ]}
        >
          <Text style={styles.alertText}>
            El asistente está deshabilitado (ASISTENTE_DIAGNOSTICO_IA_ENABLED=false).
          </Text>
        </View>
      ) : null}

      {uso.alerta_mensaje ? (
        <View style={[styles.alertBox, { backgroundColor: alertaBg, borderColor: alertaBorder }]}>
          <Text style={styles.alertText}>{uso.alerta_mensaje}</Text>
        </View>
      ) : null}

      <HostMetricRow label="Consultas IA" value={fmtTokens(uso.consultas)} />
      <HostMetricRow label="Tokens periodo" value={fmtTokens(uso.tokens_total)} />
      <HostMetricRow label="Órdenes Mecanimovil" value={fmtTokens(uso.consultas_ordenes)} />
      <HostMetricRow label="Citas personales" value={fmtTokens(uso.consultas_citas_personales)} />
      <HostMetricRow label="Entrada" value={fmtTokens(uso.tokens_entrada)} />
      <HostMetricRow
        label="Salida"
        value={fmtTokens(uso.tokens_salida)}
        last
      />

      <Text style={styles.footerText}>
        {footerParts.join(' · ')}
        {'\n'}
        Renovación: {fmtFecha(uso.renovacion_tokens_en)}
        {uso.dias_hasta_renovacion != null ? ` (en ${uso.dias_hasta_renovacion} días)` : ''}
      </Text>
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...institutionalTextStyle('caption', I.body),
    fontFamily: FF.sansMedium,
    marginBottom: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
  },
  alertBox: {
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  alertText: {
    ...institutionalTextStyle('caption', I.ink),
    fontFamily: FF.sansMedium,
  },
  footerText: {
    ...institutionalTextStyle('small', I.muted),
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
    lineHeight: 16,
  },
});
