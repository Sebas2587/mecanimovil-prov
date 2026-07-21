import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, Bookmark } from 'lucide-react-native';
import { showAlert } from '@/utils/platformAlert';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import {
  asistenteDiagnosticoService,
  type AsistenteDiagnosticoOrigen,
  type AsistenteDiagnosticoResponse,
} from '@/services/asistenteDiagnosticoService';
import { guiasReparacionService } from '@/services/guiasReparacionService';
import { GuiaReparacionContenido } from '@/components/orden-detalle/GuiaReparacionContenido';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/app/design-system/components';

const I = COLORS.institutional;

interface AsistenteDiagnosticoCardProps {
  origen: AsistenteDiagnosticoOrigen;
  entityId: number;
  /** Si false, no se muestra ni se consulta la API (evita gasto de tokens en otras sesiones). */
  habilitado?: boolean;
}

/** Compatibilidad con integraciones previas en detalle de orden. */
export function AsistenteDiagnosticoCardOrden({ ordenId }: { ordenId: number }) {
  return <AsistenteDiagnosticoCard origen="orden" entityId={ordenId} />;
}

export function AsistenteDiagnosticoCard({ origen, entityId, habilitado = true }: AsistenteDiagnosticoCardProps) {
  const { esMecanicoEquipo } = useAuth();
  const puedeGuardarGuia = esMecanicoEquipo;
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<AsistenteDiagnosticoResponse | null>(null);

  const cargar = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    try {
      const resp =
        origen === 'cita'
          ? await asistenteDiagnosticoService.obtenerCita(entityId)
          : await asistenteDiagnosticoService.obtenerOrden(entityId);
      setData(resp);
    } catch {
      setData({ disponible: false, contenido: null, error: 'No se pudo cargar el asistente.' });
    } finally {
      setLoading(false);
    }
  }, [origen, entityId, habilitado]);

  useEffect(() => {
    if (!habilitado) {
      setLoading(false);
      return;
    }
    void cargar();
  }, [cargar, habilitado]);

  const generar = async () => {
    if (!habilitado) return;
    setGenerating(true);
    setSaved(false);
    try {
      const resp =
        origen === 'cita'
          ? await asistenteDiagnosticoService.generarCita(entityId)
          : await asistenteDiagnosticoService.generarOrden(entityId);
      setData(resp);
    } catch {
      setData({ disponible: false, contenido: null, error: 'No se pudo generar la guía.' });
    } finally {
      setGenerating(false);
    }
  };

  const guardarGuia = async () => {
    if (!data?.contenido || !data.diagnostico_id) {
      showAlert('Guía incompleta', 'Genera la guía de nuevo antes de guardarla.');
      return;
    }
    setSaving(true);
    try {
      await guiasReparacionService.guardar({
        origen,
        origen_id: entityId,
        diagnostico_id: data.diagnostico_id,
      });
      setSaved(true);
      showAlert('Guía guardada', 'La guía quedó en tu biblioteca por marca y modelo.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la guía. Intenta de nuevo.';
      showAlert('Error al guardar', mensaje);
    } finally {
      setSaving(false);
    }
  };

  if (!habilitado) return null;

  const contenido = data?.contenido;
  const summaryCollapsed = loading
    ? 'Cargando…'
    : contenido
      ? 'Guía disponible · toca para ver'
      : 'Toca para generar o ver la guía';

  return (
    <Card elevated padding="host" style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Asistente de reparación IA. ${expanded ? 'Contraer sección' : 'Expandir sección'}`}
      >
        <View style={styles.iconWrap}>
          <Sparkles size={18} color={I.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Asistente de reparación IA</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {expanded ? 'Guía según vehículo y problema reportado' : summaryCollapsed}
          </Text>
        </View>
        <InstitutionalIcon
          name={expanded ? 'expand-less' : 'chevron-down'}
          size={22}
          color={I.muted}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={I.primary} style={{ marginVertical: SPACING.md }} />
          ) : (
            <>
              {!contenido ? (
                <Text style={styles.helper}>
                  {data?.error || 'Genera una guía con procedimiento sugerido y referencia de manual.'}
                </Text>
              ) : (
                <GuiaReparacionContenido contenido={contenido} />
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

              {contenido && data?.diagnostico_id && puedeGuardarGuia ? (
                <TouchableOpacity
                  style={[styles.saveButton, (saving || saved) && styles.buttonDisabled]}
                  onPress={() => void guardarGuia()}
                  disabled={saving || saved}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color={I.primary} size="small" />
                  ) : (
                    <>
                      <Bookmark size={16} color={saved ? I.muted : I.primary} strokeWidth={2} />
                      <Text style={[styles.saveButtonText, saved && { color: I.muted }]}>
                        {saved ? 'Guía guardada' : 'Guardar guía en mi biblioteca'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              <Text style={styles.disclaimer}>
                Guía generada por IA. Verifica procedimientos y especificaciones antes de aplicar en el taller.
              </Text>
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    gap: SPACING.md,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
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
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    marginTop: 2,
  },
  helper: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingVertical: SPACING.sm,
    minHeight: 44,
    backgroundColor: I.surfaceSoft,
  },
  saveButtonText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  disclaimer: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    lineHeight: 16,
  },
});
