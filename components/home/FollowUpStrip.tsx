import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Clock, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { PipelineComercialResponse } from '@/services/pipelineComercialService';

const I = COLORS.institutional;

interface FollowUpStripProps {
  pipeline?: PipelineComercialResponse | null;
}

export function FollowUpStrip({ pipeline }: FollowUpStripProps) {
  const resumen = pipeline?.resumen;
  const enviadas = resumen?.cotizacion_enviada ?? 0;
  const negociacion = resumen?.en_negociacion ?? 0;
  const esperando24h = pipeline?.esperando_respuesta_24h_count ?? 0;
  const totalSeguimiento = enviadas + negociacion;

  const previewItems = useMemo(() => {
    if (!pipeline?.results) return [];
    return pipeline.results
      .filter(
        (row) =>
          row.estado_normalizado === 'cotizacion_enviada'
          || row.estado_normalizado === 'en_negociacion'
          || row.esperando_respuesta_24h,
      )
      .slice(0, 3);
  }, [pipeline?.results]);

  const abrirBandeja = useCallback((filtro?: string) => {
    if (filtro) {
      router.push(`/(tabs)/bandeja?filtro=${filtro}` as any);
      return;
    }
    router.push('/(tabs)/bandeja');
  }, []);

  if (totalSeguimiento === 0 && esperando24h === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <HostSectionKicker label="Seguimiento comercial" />
        <TouchableOpacity onPress={() => abrirBandeja()} activeOpacity={0.7}>
          <InstitutionalText role="navLink" color="primary">
            Ver embudo
          </InstitutionalText>
        </TouchableOpacity>
      </View>

      <HostPaperSection style={styles.paper}>
        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricChip}
            onPress={() => abrirBandeja('cotizacion_enviada')}
            activeOpacity={0.8}
          >
            <View style={hostIconPlateStyle}>
              <Send size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View>
              <InstitutionalText role="h4">{enviadas}</InstitutionalText>
              <InstitutionalText role="caption" color="body">
                Enviadas
              </InstitutionalText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricChip}
            onPress={() => abrirBandeja('en_negociacion')}
            activeOpacity={0.8}
          >
            <View style={hostIconPlateStyle}>
              <Clock size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View>
              <InstitutionalText role="h4">{negociacion}</InstitutionalText>
              <InstitutionalText role="caption" color="body">
                En negociación
              </InstitutionalText>
            </View>
          </TouchableOpacity>

          {esperando24h > 0 ? (
            <TouchableOpacity
              style={styles.metricChip}
              onPress={() => abrirBandeja('esperando_24h')}
              activeOpacity={0.8}
            >
              <InstitutionalTag label={`+24h · ${esperando24h}`} variant="warning" size="sm" />
            </TouchableOpacity>
          ) : null}
        </View>

        {previewItems.length > 0 ? (
          <View style={styles.previewList}>
            {previewItems.map((item) => (
              <View key={`${item.tipo_entidad}-${item.entidad_id}`} style={styles.previewRow}>
                <View style={styles.previewBullet} />
                <View style={styles.previewCopy}>
                  <InstitutionalText role="caption" numberOfLines={1}>
                    {item.cliente_nombre || 'Cliente'} · {item.servicio_resumen || 'Servicio'}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body" numberOfLines={1}>
                    {item.estado_normalizado === 'en_negociacion' ? 'En negociación' : 'Enviada'}
                    {item.esperando_respuesta_24h ? ' · +24h sin respuesta' : ''}
                  </InstitutionalText>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.fullBtn} onPress={() => abrirBandeja()} activeOpacity={0.8}>
          <InstitutionalText role="caption">Abrir pipeline completo</InstitutionalText>
          <ChevronRight size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  paper: {
    gap: SPACING.fixed.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    minWidth: 120,
  },
  previewList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
    gap: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  previewBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.primary,
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
  },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
  },
});
