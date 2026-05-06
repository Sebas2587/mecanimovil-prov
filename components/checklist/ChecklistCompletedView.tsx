import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { checklistService, ChecklistInstance, ChecklistItemResponse } from '@/services/checklistService';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

interface ChecklistCompletedViewProps {
  visible: boolean;
  onClose: () => void;
  ordenId: number;
}

export const ChecklistCompletedView: React.FC<ChecklistCompletedViewProps> = ({
  visible,
  onClose,
  ordenId,
}) => {
  const insets = useSafeAreaInsets();
  const [instance, setInstance] = useState<ChecklistInstance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && ordenId) {
      loadChecklistData();
    }
  }, [visible, ordenId]);

  const loadChecklistData = async () => {
    setLoading(true);
    try {
      const result = await checklistService.getInstanceByOrder(ordenId);
      if (result.success) {
        setInstance(result.data);
      } else {
        Alert.alert('Error', 'No se pudo cargar el checklist completado');
      }
    } catch (error) {
      console.error('Error loading completed checklist:', error);
      Alert.alert('Error', 'Error al cargar el checklist');
    } finally {
      setLoading(false);
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

  const renderRespuesta = (response: ChecklistItemResponse) => {
    const { respuesta_texto, respuesta_numero, respuesta_booleana, respuesta_seleccion, fotos } = response;

    let valorMostrar = '';

    if (respuesta_texto) {
      valorMostrar = respuesta_texto;
    } else if (respuesta_numero !== undefined && respuesta_numero !== null) {
      valorMostrar = respuesta_numero.toString();
    } else if (respuesta_booleana !== undefined && respuesta_booleana !== null) {
      valorMostrar = respuesta_booleana ? 'Sí' : 'No';
    } else if (respuesta_seleccion) {
      if (Array.isArray(respuesta_seleccion)) {
        valorMostrar = respuesta_seleccion
          .map(item => (typeof item === 'string' ? item : item.name || 'Item'))
          .join(', ');
      } else if (typeof respuesta_seleccion === 'object') {
        valorMostrar = JSON.stringify(respuesta_seleccion, null, 2);
      } else {
        valorMostrar = String(respuesta_seleccion);
      }
    }

    return (
      <View key={response.id} style={styles.responseCard}>
        <View style={styles.responseHeader}>
          <Text style={styles.responseTitle} numberOfLines={4}>
            {response.item_info?.pregunta_texto || 'Pregunta'}
          </Text>
          <View
            style={[
              styles.itemStatusPill,
              response.completado ? styles.itemStatusPillDone : styles.itemStatusPillPending,
            ]}
          >
            <InstitutionalIcon
              name={response.completado ? 'check-circle' : 'radio-button-unchecked'}
              size={12}
              color={response.completado ? I.semanticUp : I.muted}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text style={[styles.itemStatusText, response.completado ? styles.itemStatusTextDone : styles.itemStatusTextPending]}>
              {response.completado ? 'Listo' : 'Pendiente'}
            </Text>
          </View>
        </View>

        {!!valorMostrar && <Text style={styles.responseValue}>{valorMostrar}</Text>}

        {fotos && fotos.length > 0 && (
          <View style={styles.photosBlock}>
            <Text style={styles.photosLabel}>Evidencia ({fotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fotos.map((foto, index) => {
                const uri =
                  typeof foto.imagen_url === 'string'
                    ? foto.imagen_url
                    : foto.imagen && typeof foto.imagen === 'string'
                      ? foto.imagen
                      : null;
                if (!uri) return null;
                return (
                  <View key={foto.id ?? `foto-${response.id}-${index}`} style={styles.photoCell}>
                    <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                    {foto.descripcion ? (
                      <Text style={styles.photoCaption} numberOfLines={2}>
                        {foto.descripcion}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {response.fecha_respuesta ? (
          <Text style={styles.responseMeta}>Registrado · {formatearFechaHora(response.fecha_respuesta)}</Text>
        ) : null}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screenRoot}>
        <LinearGradient
          colors={BLANK_GLASS.gradient}
          locations={BLANK_GLASS.gradientLocations}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
              <InstitutionalIcon name="close" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Checklist completado</Text>
              <View style={styles.orderPill}>
                <Text style={styles.orderPillText}>Orden #{ordenId}</Text>
              </View>
            </View>
            <View style={styles.headerIconBtn} />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={I.primary} />
              <Text style={styles.loadingHint}>Cargando checklist…</Text>
            </View>
          ) : instance ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + SPACING.lg }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.card}>
                <View style={styles.sectionPillWrap}>
                  <View style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>Resumen</Text>
                  </View>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryRow2}>
                    <View style={styles.summaryCell}>
                      <Text style={styles.fieldLabel}>Estado</Text>
                      <View style={styles.doneBadge}>
                        <InstitutionalIcon name="check-circle" size={14} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.doneBadgeText}>Completado</Text>
                      </View>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.fieldLabel}>Progreso</Text>
                      <Text style={styles.fieldValueMono}>{instance.progreso_porcentaje}%</Text>
                    </View>
                  </View>

                  {(instance.fecha_inicio || instance.fecha_finalizacion) && (
                    <View style={styles.summaryRow2}>
                      <View style={styles.summaryCell}>
                        <Text style={styles.fieldLabel}>Inicio</Text>
                        <Text style={styles.fieldValue}>
                          {instance.fecha_inicio ? formatearFechaHora(instance.fecha_inicio) : '—'}
                        </Text>
                      </View>
                      <View style={styles.summaryCell}>
                        <Text style={styles.fieldLabel}>Cierre</Text>
                        <Text style={styles.fieldValue}>
                          {instance.fecha_finalizacion ? formatearFechaHora(instance.fecha_finalizacion) : '—'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {instance.tiempo_total_minutos != null && (
                    <View style={styles.summaryRow2}>
                      <View style={[styles.summaryCell, styles.summaryCellGrow]}>
                        <Text style={styles.fieldLabel}>Duración</Text>
                        <Text style={styles.fieldValueMono}>{instance.tiempo_total_minutos} min</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {(instance.firma_tecnico || instance.firma_cliente) && (
                <View style={styles.card}>
                  <View style={styles.sectionPillWrap}>
                    <View style={styles.sectionPill}>
                      <Text style={styles.sectionPillText}>Firmas</Text>
                    </View>
                  </View>
                  <View style={styles.signaturesRow2}>
                    {instance.firma_tecnico ? (
                      <View
                        style={[
                          styles.sigCell,
                          !instance.firma_cliente ? styles.sigCellSingle : null,
                        ]}
                      >
                        <Text style={styles.sigCaption}>Técnico</Text>
                        <Image
                          source={{ uri: `data:image/png;base64,${instance.firma_tecnico}` }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                    {instance.firma_cliente ? (
                      <View
                        style={[
                          styles.sigCell,
                          !instance.firma_tecnico ? styles.sigCellSingle : null,
                        ]}
                      >
                        <Text style={styles.sigCaption}>Cliente</Text>
                        <Image
                          source={{ uri: `data:image/png;base64,${instance.firma_cliente}` }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <View style={styles.sectionPillWrap}>
                  <View style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>
                      Ítems ({instance.respuestas?.length ?? 0})
                    </Text>
                  </View>
                </View>

                {instance.respuestas && instance.respuestas.length > 0 ? (
                  instance.respuestas
                    .sort((a, b) => (a.item_template || 0) - (b.item_template || 0))
                    .map(renderRespuesta)
                ) : (
                  <Text style={styles.emptyItems}>No hay respuestas registradas</Text>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loadingBox}>
              <InstitutionalIcon name="error-outline" size={44} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.errorTitle}>Sin datos</Text>
              <Text style={styles.errorHint}>No se pudo cargar el checklist para esta orden.</Text>
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
    paddingHorizontal: GLASS_INSET,
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
  },
  headerTitle: {
    fontSize: T.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h3.fontWeight as '600',
    lineHeight: Math.round(T.h3.fontSize * T.h3.lineHeight),
    color: I.ink,
    textAlign: 'center',
  },
  orderPill: {
    marginTop: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
  },
  orderPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GLASS_INSET,
  },
  loadingHint: {
    marginTop: SPACING.sm,
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  errorTitle: {
    marginTop: SPACING.sm,
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.ink,
  },
  errorHint: {
    marginTop: SPACING.xs,
    fontSize: T.small.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  sectionPillWrap: {
    marginBottom: SPACING.sm,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
  },
  summaryGrid: {
    gap: SPACING.sm,
  },
  summaryRow2: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  summaryCell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  summaryCellGrow: {
    flexGrow: 1,
    flexBasis: '100%',
  },
  fieldLabel: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    color: I.muted,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  fieldValue: {
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    color: I.ink,
  },
  fieldValueMono: {
    fontSize: T.numberDisplay.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    color: I.ink,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  doneBadgeText: {
    fontSize: T.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.captionBold.fontWeight as '600',
    color: I.semanticUp,
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
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: I.muted,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sigImage: {
    width: '100%',
    height: 88,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  responseCard: {
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  /** Pregunta del ítem — jerarquía `h4` (doc proveedores / Coinbase). */
  responseTitle: {
    flex: 1,
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.h4.fontWeight as '600',
    lineHeight: Math.round(T.h4.fontSize * T.h4.lineHeight),
    color: I.ink,
  },
  itemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemStatusPillDone: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  itemStatusPillPending: {
    backgroundColor: I.surfaceSoft,
    borderColor: I.hairline,
  },
  itemStatusText: {
    fontSize: T.small.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
  },
  itemStatusTextDone: {
    color: I.semanticUp,
  },
  itemStatusTextPending: {
    color: I.muted,
  },
  /** Respuesta / detalle — cuerpo estándar. */
  responseValue: {
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    color: I.body,
    marginBottom: SPACING.sm,
  },
  photosBlock: {
    marginBottom: SPACING.sm,
  },
  photosLabel: {
    fontSize: T.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.captionBold.fontWeight as '600',
    color: I.muted,
    marginBottom: SPACING.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  photoCell: {
    marginRight: SPACING.sm,
    alignItems: 'center',
    maxWidth: 88,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  photoCaption: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    color: I.muted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  responseMeta: {
    fontSize: T.small.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
  },
  emptyItems: {
    fontSize: T.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
  },
});
