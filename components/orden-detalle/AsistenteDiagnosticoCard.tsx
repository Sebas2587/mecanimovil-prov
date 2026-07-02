import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Sparkles, ExternalLink, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  asistenteDiagnosticoService,
  type AsistenteDiagnosticoResponse,
} from '@/services/asistenteDiagnosticoService';

const I = COLORS.institutional;

interface AsistenteDiagnosticoCardProps {
  ordenId: number;
}

export function AsistenteDiagnosticoCard({ ordenId }: AsistenteDiagnosticoCardProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AsistenteDiagnosticoResponse | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await asistenteDiagnosticoService.obtener(ordenId);
      setData(resp);
    } catch {
      setData({ disponible: false, contenido: null, error: 'No se pudo cargar el asistente.' });
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const generar = async () => {
    setGenerating(true);
    try {
      const resp = await asistenteDiagnosticoService.generar(ordenId);
      setData(resp);
    } catch {
      setData({ disponible: false, contenido: null, error: 'No se pudo generar la guía.' });
    } finally {
      setGenerating(false);
    }
  };

  const contenido = data?.contenido;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Sparkles size={18} color={I.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Asistente de reparación IA</Text>
          <Text style={styles.subtitle}>Guía según vehículo y problema reportado</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={I.primary} style={{ marginVertical: SPACING.md }} />
      ) : (
        <>
          {!contenido ? (
            <Text style={styles.helper}>
              {data?.error || 'Genera una guía con procedimiento sugerido y referencia de manual.'}
            </Text>
          ) : (
            <View style={styles.body}>
              {contenido.causas_probables?.length ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Causas probables</Text>
                  {contenido.causas_probables.map((causa, idx) => (
                    <Text key={`causa-${idx}`} style={styles.bullet}>• {causa}</Text>
                  ))}
                </View>
              ) : null}

              {contenido.procedimiento_reparacion_detallado?.length ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Procedimiento sugerido</Text>
                  {contenido.procedimiento_reparacion_detallado.map((paso, idx) => (
                    <Text key={`paso-${idx}`} style={styles.step}>{paso}</Text>
                  ))}
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

              {contenido.advertencias_seguridad?.length ? (
                <View style={styles.warningBox}>
                  <AlertTriangle size={16} color={I.accentYellow} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    {contenido.advertencias_seguridad.map((adv, idx) => (
                      <Text key={`adv-${idx}`} style={styles.warningText}>{adv}</Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (generating || loading) && styles.buttonDisabled]}
            onPress={() => void generar()}
            disabled={generating || loading}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator color={I.onPrimary} size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {contenido ? 'Regenerar guía' : 'Generar guía de reparación'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Guía generada por IA. Verifica procedimientos y especificaciones antes de aplicar en el taller.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.editorial,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    marginTop: 2,
  },
  helper: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  body: {
    gap: SPACING.md,
  },
  block: {
    gap: SPACING.xs,
  },
  blockTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  bullet: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  step: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  linkText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
  },
  warningText: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 18,
  },
  button: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.onPrimary,
  },
  disclaimer: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    lineHeight: 16,
  },
});
