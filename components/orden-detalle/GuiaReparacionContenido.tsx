import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ExternalLink, AlertTriangle, Wrench, Fuel } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import type { ContenidoAsistenteDiagnostico } from '@/services/asistenteDiagnosticoService';

const I = COLORS.institutional;

function normalizarLineas(items: string[] | undefined): string[] {
  if (!items?.length) return [];
  return items
    .flatMap((item) => item.split(/\n+/))
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

function formatearPaso(paso: string, index: number): { numero: number; texto: string } {
  const match = paso.match(/^(\d+)[.)]\s*(.*)$/);
  if (match) {
    return { numero: Number(match[1]), texto: match[2].trim() || paso };
  }
  return { numero: index + 1, texto: paso };
}

interface GuiaReparacionContenidoProps {
  contenido: ContenidoAsistenteDiagnostico;
}

export function GuiaReparacionContenido({ contenido }: GuiaReparacionContenidoProps) {
  const causas = normalizarLineas(contenido.causas_probables);
  const pasos = normalizarLineas(contenido.procedimiento_reparacion_detallado);
  const advertencias = normalizarLineas(contenido.advertencias_seguridad);

  return (
    <View style={styles.root}>
      {contenido.tipo_motor ? (
        <View style={styles.motorChip}>
          <Fuel size={14} color={I.primary} strokeWidth={2} />
          <Text style={styles.motorChipText}>Motor: {contenido.tipo_motor}</Text>
        </View>
      ) : null}

      {contenido.aviso_motor ? (
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={16} color={I.accentYellow} strokeWidth={2} />
            <Text style={styles.warningTitle}>
              {contenido.servicio_motor_incoherente
                ? 'Servicio no concuerda con el vehículo'
                : 'Datos de motor inconsistentes'}
            </Text>
          </View>
          <Text style={styles.warningText}>{contenido.aviso_motor}</Text>
        </View>
      ) : null}

      {contenido.problema_reportado ? (
        <View style={styles.problemaBox}>
          <Text style={styles.problemaLabel}>Problema reportado</Text>
          <Text style={styles.problemaText}>{contenido.problema_reportado}</Text>
        </View>
      ) : null}

      {causas.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Causas probables</Text>
          <View style={styles.sectionBody}>
            {causas.map((causa, idx) => (
              <View key={`causa-${idx}`} style={styles.causaRow}>
                <View style={styles.causaDot} />
                <Text style={styles.causaText}>{causa}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {pasos.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Wrench size={16} color={I.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Procedimiento sugerido</Text>
          </View>
          <View style={styles.sectionBody}>
            {pasos.map((paso, idx) => {
              const { numero, texto } = formatearPaso(paso, idx);
              return (
                <View
                  key={`paso-${idx}`}
                  style={[styles.pasoRow, idx > 0 ? styles.pasoRowBorder : null]}
                >
                  <Text style={styles.pasoNumero}>{numero}.</Text>
                  <Text style={styles.pasoText}>{texto}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {contenido.referencia_manual?.url ? (
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(contenido.referencia_manual.url!)}
          activeOpacity={0.85}
        >
          <ExternalLink size={16} color={I.primary} strokeWidth={2} />
          <Text style={styles.linkText}>
            {contenido.referencia_manual.titulo || 'Abrir referencia de manual'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {advertencias.length > 0 ? (
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={18} color={I.accentYellow} strokeWidth={2} />
            <Text style={styles.warningTitle}>Advertencias de seguridad</Text>
          </View>
          {advertencias.map((adv, idx) => (
            <View key={`adv-${idx}`} style={styles.warningRow}>
              <Text style={styles.warningBullet}>!</Text>
              <Text style={styles.warningText}>{adv}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.md,
  },
  motorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  motorChipText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  problemaBox: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: I.primary,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  problemaLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  problemaText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    lineHeight: 20,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  sectionBody: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  causaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  causaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.primary,
    marginTop: 7,
  },
  causaText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  pasoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  pasoRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.sm,
  },
  pasoNumero: {
    minWidth: 22,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    lineHeight: 21,
  },
  pasoText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    lineHeight: 21,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  linkText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  warningBox: {
    backgroundColor: '#FFF8E6',
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.accentYellow,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  warningTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  warningBullet: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.accentYellow,
    lineHeight: 20,
  },
  warningText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
});
