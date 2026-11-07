import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SHADOWS, withOpacity } from '@/design-system/tokens';
import { ordenesProveedorService, type AsignacionTecnico } from '@/services/ordenesProveedor';
import logger from '@/utils/logger';
import { format } from 'date-fns';

const I = COLORS.institutional;

interface HistorialAsignacionesModalProps {
  visible: boolean;
  ordenId: number;
  onClose: () => void;
}

export function HistorialAsignacionesModal({
  visible,
  ordenId,
  onClose,
}: HistorialAsignacionesModalProps) {
  const [loading, setLoading] = useState(false);
  const [asignaciones, setAsignaciones] = useState<AsignacionTecnico[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelado = false;
    const cargar = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ordenesProveedorService.obtenerHistorialAsignaciones(ordenId);
        if (cancelado) return;
        if (response.success && response.data) {
          setAsignaciones(response.data.asignaciones);
        } else {
          setError(response.message || 'Error al cargar historial');
        }
      } catch (err) {
        logger.error('Error cargando historial:', err);
        if (!cancelado) setError('Error inesperado al cargar historial');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [visible, ordenId]);

  const reintentar = () => {
    setLoading(true);
    setError(null);
    void ordenesProveedorService.obtenerHistorialAsignaciones(ordenId).then((response) => {
      if (response.success && response.data) {
        setAsignaciones(response.data.asignaciones);
        setError(null);
      } else {
        setError(response.message || 'Error al cargar historial');
      }
    }).catch((err) => {
      logger.error('Error cargando historial:', err);
      setError('Error inesperado al cargar historial');
    }).finally(() => {
      setLoading(false);
    });
  };

  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), 'dd/MM/yyyy HH:mm');
    } catch {
      return fecha;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter>
      <InstitutionalText role="h3">Historial de asignaciones</InstitutionalText>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={I.primary} />
            <InstitutionalText role="body" style={styles.loadingText}>
              Cargando historial...
            </InstitutionalText>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <InstitutionalText role="body" color="semanticDown" style={styles.errorText}>
              {error}
            </InstitutionalText>
            <InstitutionalButton
              label="Reintentar"
              variant="secondary"
              onPress={reintentar}
              style={styles.retryButton}
            />
          </View>
        ) : asignaciones.length === 0 ? (
          <View style={styles.centerContent}>
            <InstitutionalText role="body" color="muted">
              No hay cambios de asignación registrados
            </InstitutionalText>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {asignaciones.map((asignacion, index) => (
              <View key={asignacion.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {index < asignaciones.length - 1 ? <View style={styles.timelineLine} /> : null}

                <View style={styles.asignacionCard}>
                  <View style={styles.asignacionHeader}>
                    <InstitutionalText role="bodyBold">
                      {formatearFecha(asignacion.fecha_cambio)}
                    </InstitutionalText>
                    <InstitutionalText role="caption" color="muted">
                      {asignacion.asignado_por}
                    </InstitutionalText>
                  </View>

                  <View style={styles.cambioContainer}>
                    <View style={styles.tecnicoBox}>
                      <InstitutionalText role="caption" color="muted">
                        Anterior
                      </InstitutionalText>
                      <InstitutionalText role="body">
                        {asignacion.tecnico_anterior?.nombre || 'Sin asignar'}
                      </InstitutionalText>
                    </View>

                    <Text style={styles.arrow}>→</Text>

                    <View style={styles.tecnicoBox}>
                      <InstitutionalText role="caption" color="muted">
                        Nuevo
                      </InstitutionalText>
                      <InstitutionalText role="bodyBold">
                        {asignacion.tecnico_nuevo?.nombre || 'Sin asignar'}
                      </InstitutionalText>
                    </View>
                  </View>

                  {asignacion.motivo ? (
                    <View style={styles.motivoContainer}>
                      <InstitutionalText role="caption" color="muted">
                        Motivo:
                      </InstitutionalText>
                      <InstitutionalText role="body">
                        {asignacion.motivo}
                      </InstitutionalText>
                    </View>
                  ) : null}

                  {asignacion.checklist_en_progreso ? (
                    <View style={styles.checklistWarning}>
                      <InstitutionalText role="caption" style={styles.warningText}>
                        Checklist en progreso ({asignacion.checklist_progreso_pct}% completado)
                      </InstitutionalText>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <InstitutionalButton label="Cerrar" variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    minWidth: 120,
  },
  timelineContainer: {
    paddingVertical: 16,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 32,
    marginBottom: 24,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: I.primary,
    borderWidth: 2,
    borderColor: I.paper,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    bottom: -24,
    width: 1,
    backgroundColor: I.hairline,
  },
  asignacionCard: {
    backgroundColor: I.paper,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.sm,
  },
  asignacionHeader: {
    marginBottom: 12,
  },
  cambioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tecnicoBox: {
    flex: 1,
  },
  arrow: {
    fontSize: 20,
    color: I.muted,
    marginHorizontal: 8,
  },
  motivoContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  checklistWarning: {
    marginTop: 8,
    padding: 8,
    backgroundColor: withOpacity(I.accentYellow, 0.1),
    borderRadius: 8,
  },
  warningText: {
    color: I.accentYellow,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
});
