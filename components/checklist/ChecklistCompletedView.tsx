import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checklistService,
  ChecklistInstance,
  ChecklistItemResponse,
  ChecklistRecomendacion,
  ChecklistRecomendacionesResponse,
} from '@/services/checklistService';
import { signatureStoredToImageUri } from '@/utils/signatureImageUri';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/design-system/components/InstitutionalSectionHeader';
import { InstitutionalTag } from '@/design-system/components/InstitutionalTag';
import { institutionalCardStyles } from '@/design-system/styles/institutionalSemantic';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;
const INSET = SPACING.fixed.md;
const lh = (size: number, mult: number) => Math.round(size * mult);

const REC_COLORS: Record<string, string> = {
  URGENTE: I.semanticDown,
  ATENCION: COLORS.warning.dark,
  PROACTIVA: I.primary,
};

type SeveridadPct = 'ok' | 'atencion' | 'alerta' | 'critico';

const SEVERIDAD_COLOR: Record<SeveridadPct, string> = {
  ok: I.semanticUp,
  atencion: COLORS.warning.main,
  alerta: COLORS.warning.dark,
  critico: I.semanticDown,
};

function resolveTipoPregunta(response: ChecklistItemResponse): string {
  return (
    response.item_info?.tipo_pregunta
    || response.item_template_info?.tipo_pregunta
    || ''
  );
}

function resolvePreguntaTexto(response: ChecklistItemResponse): string {
  return (
    response.item_info?.pregunta_texto
    || response.item_template_info?.pregunta_texto
    || response.item_info?.nombre
    || 'Pregunta'
  );
}

function esPorcentajeVidaUtil(tipo: string, pregunta: string): boolean {
  if (tipo === 'COMPONENT_HEALTH') return true;
  const p = pregunta.toLowerCase();
  return p.includes('vida útil') || p.includes('vida util');
}

function severidadPorcentaje(pct: number): SeveridadPct {
  if (pct >= 80) return 'ok';
  if (pct >= 60) return 'atencion';
  if (pct >= 35) return 'alerta';
  return 'critico';
}

function formatKmDisplay(n: number): string {
  return `${Math.round(n).toLocaleString('es-CL')} km`;
}

interface ChecklistCompletedViewProps {
  visible: boolean;
  onClose: () => void;
  /** Marketplace: carga por orden. */
  ordenId?: number;
  /** Cita personal de taller/domicilio: carga por cita. */
  citaPersonalId?: number;
  /** Preferido si ya se conoce el id de instancia. */
  instanceId?: number | null;
}

export const ChecklistCompletedView: React.FC<ChecklistCompletedViewProps> = ({
  visible,
  onClose,
  ordenId,
  citaPersonalId,
  instanceId,
}) => {
  const insets = useSafeAreaInsets();
  const [instance, setInstance] = useState<ChecklistInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState<ChecklistRecomendacion[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (!instanceId && !ordenId && !citaPersonalId) {
      setInstance(null);
      return;
    }
    void loadChecklistData();
  }, [visible, ordenId, citaPersonalId, instanceId]);

  const loadChecklistData = async () => {
    setLoading(true);
    try {
      let result: Awaited<ReturnType<typeof checklistService.getInstance>>;
      if (instanceId) {
        result = await checklistService.getInstance(instanceId);
      } else if (citaPersonalId) {
        result = await checklistService.getInstanceByCitaPersonal(citaPersonalId);
      } else if (ordenId) {
        result = await checklistService.getInstanceByOrder(ordenId);
      } else {
        setInstance(null);
        return;
      }

      if (result.success && result.data) {
        setInstance(result.data);
        // Recomendaciones ML solo con vehículo/marketplace completado
        if (result.data.estado === 'COMPLETADO' && result.data.id && !citaPersonalId) {
          void loadRecomendaciones(result.data.id);
        }
      } else {
        setInstance(null);
        showAlert('Error', 'No se pudo cargar el checklist completado');
      }
    } catch (error) {
      console.error('Error loading completed checklist:', error);
      setInstance(null);
      showAlert('Error', 'Error al cargar el checklist');
    } finally {
      setLoading(false);
    }
  };

  const loadRecomendaciones = async (instanceId: number) => {
    setLoadingRec(true);
    try {
      const result = await checklistService.getRecomendaciones(instanceId);
      if (result.success && result.data?.recomendaciones) {
        setRecomendaciones(result.data.recomendaciones);
      }
    } catch (error) {
      console.warn('No se pudieron cargar las recomendaciones ML:', error);
    } finally {
      setLoadingRec(false);
    }
  };

  const formatearFechaHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copiarEnlaceInforme = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Enlace copiado', 'El enlace del informe quedó en el portapapeles.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Enlace del informe', url);
    }
  };

  const renderRespuesta = (response: ChecklistItemResponse) => {
    const {
      respuesta_texto,
      respuesta_numero,
      respuesta_booleana,
      respuesta_seleccion,
      respuesta_fecha,
      fotos,
    } = response;

    const tipo = resolveTipoPregunta(response);
    const pregunta = resolvePreguntaTexto(response);
    const num =
      respuesta_numero !== undefined && respuesta_numero !== null
        ? Number(respuesta_numero)
        : NaN;

    let valorMostrar = '';
    let formato: 'texto' | 'km' | 'porcentaje' = 'texto';
    let porcentaje: number | null = null;
    let severidad: SeveridadPct | null = null;

    if (tipo === 'KILOMETER_INPUT' && Number.isFinite(num)) {
      formato = 'km';
      valorMostrar = formatKmDisplay(num);
    } else if (esPorcentajeVidaUtil(tipo, pregunta) && Number.isFinite(num)) {
      formato = 'porcentaje';
      porcentaje = Math.max(0, Math.min(100, num));
      severidad = severidadPorcentaje(porcentaje);
      valorMostrar = `${Math.round(porcentaje)}%`;
    } else if (respuesta_seleccion) {
      if (Array.isArray(respuesta_seleccion)) {
        valorMostrar = respuesta_seleccion
          .map((item) => (typeof item === 'string' ? item : item.name || 'Item'))
          .join(', ');
      } else if (typeof respuesta_seleccion === 'object') {
        valorMostrar = JSON.stringify(respuesta_seleccion);
      } else {
        valorMostrar = String(respuesta_seleccion);
      }
    } else if (respuesta_booleana !== undefined && respuesta_booleana !== null) {
      valorMostrar = respuesta_booleana ? 'Sí' : 'No';
    } else if (respuesta_texto) {
      valorMostrar = respuesta_texto;
    } else if (Number.isFinite(num)) {
      valorMostrar = Number.isInteger(num)
        ? String(num)
        : num.toLocaleString('es-CL', { maximumFractionDigits: 2 });
    } else if (respuesta_fecha) {
      valorMostrar = formatearFechaHora(String(respuesta_fecha));
    }

    const sevColor = severidad ? SEVERIDAD_COLOR[severidad] : null;

    return (
      <View key={response.id} style={styles.amenityBlock}>
        <View style={styles.amenityRow}>
          <View style={styles.amenityLabelCol}>
            <Text style={styles.amenityLabel} numberOfLines={3}>
              {pregunta}
            </Text>
            {severidad && severidad !== 'ok' ? (
              <View style={[styles.severityChip, { backgroundColor: withOpacity(sevColor!, 0.12) }]}>
                <Text style={[styles.severityChipText, { color: sevColor! }]}>
                  {severidad === 'critico'
                    ? 'Crítico'
                    : severidad === 'alerta'
                      ? 'Alerta'
                      : 'Atención'}
                </Text>
              </View>
            ) : null}
          </View>

          {formato === 'porcentaje' && porcentaje != null && sevColor ? (
            <View style={styles.pctValueWrap}>
              <View style={styles.pctBarTrack}>
                <View
                  style={[
                    styles.pctBarFill,
                    { width: `${porcentaje}%`, backgroundColor: sevColor },
                  ]}
                />
              </View>
              <Text style={[styles.pctValueText, { color: sevColor }]}>{valorMostrar}</Text>
            </View>
          ) : (
            <Text style={styles.amenityValue} numberOfLines={3}>
              {valorMostrar || (response.completado ? '—' : 'Pendiente')}
            </Text>
          )}
        </View>

        {fotos && fotos.length > 0 ? (
          <View style={styles.photosBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fotos.map((foto, index) => {
                const uri =
                  typeof foto.imagen_url === 'string'
                    ? foto.imagen_url
                    : foto.imagen && typeof foto.imagen === 'string'
                      ? foto.imagen
                      : null;
                if (!uri) return null;
                const caption = (foto.descripcion || '').trim() || `Foto ${index + 1}`;
                return (
                  <View key={foto.id ?? `foto-${response.id}-${index}`} style={styles.photoCell}>
                    <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {caption}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {response.fecha_respuesta ? (
          <Text style={styles.responseMeta}>
            Registrado · {formatearFechaHora(response.fecha_respuesta)}
          </Text>
        ) : null}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screenRoot}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
              <InstitutionalIcon name="close" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <InstitutionalText role="h3" color="ink" style={styles.headerTitle}>
                Resumen del checklist
              </InstitutionalText>
              <InstitutionalTag
                label={
                  citaPersonalId
                    ? `Cita #${citaPersonalId}`
                    : ordenId
                      ? `Orden #${ordenId}`
                      : instanceId
                        ? `Checklist #${instanceId}`
                        : 'Checklist'
                }
                variant="neutral"
                size="sm"
              />
            </View>
            <View style={styles.headerIconBtn} />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={I.primary} />
              <InstitutionalText role="caption" color="muted" style={{ marginTop: SPACING.sm }}>
                Cargando checklist…
              </InstitutionalText>
            </View>
          ) : instance ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + SPACING.lg }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                <InstitutionalText role="h6" color="muted" style={styles.kicker}>
                  Servicio
                </InstitutionalText>
                <InstitutionalSectionHeader title="Resumen" level="h4" />
                <View style={styles.sectionRule} />

                <View style={styles.factRow}>
                  <InstitutionalText role="body" color="body">Estado</InstitutionalText>
                  <InstitutionalTag
                    label={instance.estado === 'COMPLETADO' ? 'Completado' : instance.estado}
                    variant={instance.estado === 'COMPLETADO' ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>
                <View style={styles.factRow}>
                  <InstitutionalText role="body" color="body">Progreso</InstitutionalText>
                  <InstitutionalText role="numberDisplay" color="ink">
                    {instance.progreso_porcentaje}%
                  </InstitutionalText>
                </View>
                {instance.fecha_inicio ? (
                  <View style={styles.factRow}>
                    <InstitutionalText role="body" color="body">Inicio</InstitutionalText>
                    <InstitutionalText role="captionBold" color="ink" style={styles.factValue}>
                      {formatearFechaHora(instance.fecha_inicio)}
                    </InstitutionalText>
                  </View>
                ) : null}
                {instance.fecha_finalizacion ? (
                  <View style={styles.factRow}>
                    <InstitutionalText role="body" color="body">Cierre</InstitutionalText>
                    <InstitutionalText role="captionBold" color="ink" style={styles.factValue}>
                      {formatearFechaHora(instance.fecha_finalizacion)}
                    </InstitutionalText>
                  </View>
                ) : null}
                {instance.tiempo_total_minutos != null ? (
                  <View style={[styles.factRow, styles.factRowLast]}>
                    <InstitutionalText role="body" color="body">Duración</InstitutionalText>
                    <InstitutionalText role="numberDisplay" color="ink">
                      {instance.tiempo_total_minutos} min
                    </InstitutionalText>
                  </View>
                ) : null}
              </View>

              {instance.informe_publico?.url ? (
                <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                  <InstitutionalText role="h6" color="muted" style={styles.kicker}>
                    Cliente
                  </InstitutionalText>
                  <InstitutionalSectionHeader title="Enlace del informe" level="h4" />
                  <View style={styles.sectionRule} />
                  <InstitutionalText role="body" color="body" style={styles.informeShareHint}>
                    {instance.estado === 'PENDIENTE_FIRMA_CLIENTE'
                      ? 'Comparte este enlace para que el cliente revise y certifique el servicio.'
                      : 'Puedes reenviar este enlace las veces que necesites para que el cliente vuelva a ver el informe.'}
                  </InstitutionalText>
                  <Text style={styles.informeShareUrl} numberOfLines={3}>
                    {instance.informe_publico.url}
                  </Text>
                  <TouchableOpacity
                    style={styles.informeShareBtn}
                    onPress={() => void copiarEnlaceInforme(instance.informe_publico!.url)}
                    accessibilityRole="button"
                    accessibilityLabel="Copiar o compartir enlace del informe"
                  >
                    <InstitutionalIcon name="link" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.informeShareBtnText}>Copiar / compartir enlace</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {(instance.firma_tecnico || instance.firma_cliente || instance.firma_supervisor) && (
                <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                  <InstitutionalText role="h6" color="muted" style={styles.kicker}>
                    Conformidad
                  </InstitutionalText>
                  <InstitutionalSectionHeader title="Firmas" level="h4" />
                  <View style={styles.sectionRule} />
                  <View style={styles.signaturesRow2}>
                    {instance.firma_tecnico ? (
                      <View
                        style={[
                          styles.sigCell,
                          !instance.firma_cliente && !instance.firma_supervisor ? styles.sigCellSingle : null,
                        ]}
                      >
                        <InstitutionalText role="caption" color="muted" style={styles.sigCaption}>
                          Técnico
                        </InstitutionalText>
                        <Image
                          source={{ uri: signatureStoredToImageUri(instance.firma_tecnico) || '' }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                    {instance.firma_supervisor ? (
                      <View style={styles.sigCell}>
                        <InstitutionalText role="caption" color="muted" style={styles.sigCaption}>
                          Supervisor
                        </InstitutionalText>
                        <Image
                          source={{ uri: signatureStoredToImageUri(instance.firma_supervisor) || '' }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                    {instance.firma_cliente ? (
                      <View
                        style={[
                          styles.sigCell,
                          !instance.firma_tecnico && !instance.firma_supervisor ? styles.sigCellSingle : null,
                        ]}
                      >
                        <InstitutionalText role="caption" color="muted" style={styles.sigCaption}>
                          Cliente
                        </InstitutionalText>
                        <Image
                          source={{ uri: signatureStoredToImageUri(instance.firma_cliente) || '' }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                <InstitutionalText role="h6" color="muted" style={styles.kicker}>
                  Inspección
                </InstitutionalText>
                <InstitutionalSectionHeader
                  title="Respuestas del técnico"
                  level="h4"
                  count={instance.respuestas?.length ?? 0}
                />
                <InstitutionalText role="caption" color="muted" style={{ marginTop: 4 }}>
                  {instance.respuestas?.filter((r) => r.completado).length ?? 0}
                  {' de '}
                  {instance.respuestas?.length ?? 0}
                  {' puntos revisados'}
                </InstitutionalText>
                <View style={styles.sectionRule} />

                {instance.respuestas && instance.respuestas.length > 0 ? (
                  instance.respuestas
                    .slice()
                    .sort((a, b) => {
                      const oa = a.item_template_info?.orden_visual ?? a.item_template ?? 0;
                      const ob = b.item_template_info?.orden_visual ?? b.item_template ?? 0;
                      return oa - ob;
                    })
                    .map(renderRespuesta)
                ) : (
                  <Text style={styles.emptyItems}>No hay respuestas registradas</Text>
                )}
              </View>

              {/* Sección de Recomendaciones ML */}
              {loadingRec ? (
                <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                  <ActivityIndicator color={I.primary} style={{ marginVertical: SPACING.md }} />
                  <InstitutionalText role="caption" color="muted" style={{ textAlign: 'center' }}>
                    Analizando checklist con IA…
                  </InstitutionalText>
                </View>
              ) : recomendaciones.length > 0 ? (
                <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
                  <InstitutionalText role="h6" color="muted" style={styles.kicker}>
                    Sugerencias
                  </InstitutionalText>
                  <InstitutionalSectionHeader
                    title="Recomendaciones para el cliente"
                    level="h4"
                    count={recomendaciones.length}
                  />
                  <InstitutionalText role="caption" color="muted" style={{ marginBottom: SPACING.sm, marginTop: 4 }}>
                    Generadas por análisis ML según el estado de los componentes evaluados.
                  </InstitutionalText>
                  {recomendaciones.map((rec, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.recCard,
                        { borderLeftColor: REC_COLORS[rec.prioridad] ?? I.muted },
                      ]}
                    >
                      <View style={styles.recHeader}>
                        <View
                          style={[
                            styles.recBadge,
                            { backgroundColor: REC_COLORS[rec.prioridad] ?? I.muted },
                          ]}
                        >
                          <Text style={styles.recBadgeText}>{rec.prioridad}</Text>
                        </View>
                        <Text style={styles.recComponente}>{rec.componente_nombre}</Text>
                      </View>
                      <Text style={styles.recRazon}>{rec.razon}</Text>
                      {rec.servicios_sugeridos.length > 0 && (
                        <Text style={styles.recServicio}>
                          Servicio sugerido: {rec.servicios_sugeridos[0].nombre}
                          {rec.servicios_sugeridos[0].precio_referencia
                            ? ` — $${rec.servicios_sugeridos[0].precio_referencia.toLocaleString('es-CL')}`
                            : ''}
                        </Text>
                      )}
                      <Text style={styles.recFuente}>
                        Fuente: {rec.fuente} · Confianza: {Math.round(rec.confianza * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.loadingBox}>
              <InstitutionalIcon name="error-outline" size={44} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.errorTitle}>Sin datos</Text>
              <Text style={styles.errorHint}>
                {citaPersonalId
                  ? 'No se pudo cargar el checklist de esta cita.'
                  : 'No se pudo cargar el checklist para esta orden.'}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
    paddingBottom: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
    ...SHADOWS.editorial,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    gap: SPACING.xs,
  },
  headerTitle: {
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: INSET,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: INSET,
  },
  errorTitle: {
    marginTop: SPACING.sm,
    fontSize: T.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  errorHint: {
    marginTop: SPACING.xs,
    fontSize: T.small.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: 2,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  factRowLast: {
    borderBottomWidth: 0,
  },
  factValue: {
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '58%',
  },
  informeShareHint: {
    marginBottom: SPACING.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, 1.4),
  },
  informeShareUrl: {
    ...T.caption,
    color: I.muted,
    marginBottom: SPACING.md,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, 1.35),
  },
  informeShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.primary,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.md,
  },
  informeShareBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },
  signaturesRow2: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  sigCell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  sigCellSingle: {
    maxWidth: '100%',
    flexGrow: 1,
  },
  sigCaption: {
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sigImage: {
    width: '100%',
    height: 88,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  amenityBlock: {
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    gap: SPACING.xs,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  amenityLabelCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  amenityLabel: {
    fontSize: T.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(T.body.fontSize, T.body.lineHeight),
    color: I.ink,
  },
  amenityValue: {
    flexShrink: 0,
    maxWidth: '42%',
    textAlign: 'right',
    fontSize: T.body.fontSize,
    fontFamily: FF.sansMedium,
    color: I.body,
    lineHeight: lh(T.body.fontSize, T.body.lineHeight),
  },
  severityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
  },
  severityChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  pctValueWrap: {
    width: 112,
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 6,
  },
  pctBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: I.surfaceStrong,
    overflow: 'hidden',
  },
  pctBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctValueText: {
    fontSize: T.body.fontSize,
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
  },
  photosBlock: {
    marginTop: SPACING.xs,
  },
  photoCell: {
    marginRight: SPACING.sm,
    width: 96,
  },
  photoThumb: {
    width: 96,
    height: 72,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  photoCaption: {
    fontSize: T.caption.fontSize,
    fontFamily: FF.sansMedium,
    color: I.ink,
    marginTop: SPACING.xs,
  },
  responseMeta: {
    fontSize: T.small.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: lh(T.small.fontSize, T.small.lineHeight),
  },
  emptyItems: {
    fontSize: T.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
    lineHeight: lh(T.caption.fontSize, T.caption.lineHeight),
  },
  // ── Estilos para cards de recomendaciones ML ─────────────────────────────
  recCard: {
    borderLeftWidth: 4,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
  },
  recBadgeText: {
    color: I.onPrimary,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  recComponente: {
    flex: 1,
    fontSize: T.bodyBold?.fontSize ?? T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  recRazon: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    lineHeight: Math.round(T.caption.fontSize * 1.5),
    marginBottom: SPACING.xs,
  },
  recServicio: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.primary,
    marginBottom: 2,
  },
  recFuente: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
});
