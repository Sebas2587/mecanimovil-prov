import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
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

export function UsoGeminiRendimientoCard({ uso, titular }: Props) {
  if (!uso) return null;

  const alertaBg =
    uso.alerta_nivel === 'critical'
      ? withOpacity(I.semanticDown, 0.12)
      : uso.alerta_nivel === 'warning'
        ? withOpacity(I.accentYellow, 0.14)
        : I.surfaceStrong;

  const alertaBorder =
    uso.alerta_nivel === 'critical'
      ? I.semanticDown
      : uso.alerta_nivel === 'warning'
        ? I.accentYellow
        : I.hairline;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Asistente IA (Gemini)</Text>
      {titular ? <Text style={styles.subtitle}>{titular}</Text> : null}

      {!uso.gemini_configurado ? (
        <View style={[styles.alertBox, { backgroundColor: withOpacity(I.semanticDown, 0.1), borderColor: I.semanticDown }]}>
          <Text style={styles.alertText}>
            GEMINI_API_KEY no está configurada en el servidor. El asistente no funcionará en producción.
          </Text>
        </View>
      ) : null}

      {uso.gemini_configurado && !uso.asistente_habilitado ? (
        <View style={[styles.alertBox, { backgroundColor: withOpacity(I.accentYellow, 0.12), borderColor: I.accentYellow }]}>
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

      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{fmtTokens(uso.consultas)}</Text>
          <Text style={styles.tileLabel}>Consultas IA</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{fmtTokens(uso.tokens_total)}</Text>
          <Text style={styles.tileLabel}>Tokens periodo</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{fmtTokens(uso.consultas_ordenes)}</Text>
          <Text style={styles.tileLabel}>Órdenes Mecanimovil</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{fmtTokens(uso.consultas_citas_personales)}</Text>
          <Text style={styles.tileLabel}>Citas personales</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Entrada</Text>
        <Text style={styles.detailValue}>{fmtTokens(uso.tokens_entrada)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Salida</Text>
        <Text style={styles.detailValue}>{fmtTokens(uso.tokens_salida)}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Mes calendario: {fmtTokens(uso.tokens_mes_calendario)} tokens
          {uso.limite_mensual_tokens
            ? ` · límite ${fmtTokens(uso.limite_mensual_tokens)}`
            : ''}
          {uso.pct_limite_mensual != null ? ` (${uso.pct_limite_mensual}%)` : ''}
        </Text>
        <Text style={styles.footerText}>
          Renovación cuota: {fmtFecha(uso.renovacion_tokens_en)}
          {uso.dias_hasta_renovacion != null ? ` (en ${uso.dias_hasta_renovacion} días)` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xxs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.regular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  alertBox: {
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  alertText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  tile: {
    flex: 1,
    padding: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.bold,
    color: I.primary,
  },
  tileLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.regular,
    color: I.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.regular,
    color: I.muted,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  footer: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: 4,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.regular,
    color: I.muted,
  },
});
