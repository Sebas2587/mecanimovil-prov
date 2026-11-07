import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SHADOWS, withOpacity } from '@/design-system/tokens';
import { ordenesProveedorService, type AsignacionTecnico } from '@/services/ordenesProveedor';
import logger from '@/utils/logger';
import { format } from 'date-fns';

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
    if (visible) {
      cargarHistorial();
    }
  }, [visible, ordenId]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ordenesProveedorService.obtenerHistorialAsignaciones(ordenId);
      
      if (response.success && response.data) {
        setAsignaciones(response.data.asignaciones);
      } else {
        setError(response.message || 'Error al cargar historial');
      }
    } catch (err) {
      logger.error('Error cargando historial:', err);
      setError('Error inesperado al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy HH:mm");
    } catch {
      return fecha;
    }
  };

// withOpacity imported from tokens

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onClose}
      title="Historial de Asignaciones"
      snapPoints={['70%']}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.institutional.primary} />
            <InstitutionalText style={styles.loadingText}>
              Cargando historial...
            </InstitutionalText>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <InstitutionalText variant="body" color="error" style={styles.errorText}>
              {error}
            </InstitutionalText>
            <InstitutionalButton
              variant="secondary"
              onPress={cargarHistorial}
              style={styles.retryButton}
            >
              Reintentar
            </InstitutionalButton>
          </View>
        ) : asignaciones.length === 0 ? (
          <View style={styles.centerContent}>
            <InstitutionalText variant="body" color="secondary">
              No hay cambios de asignación registrados
            </InstitutionalText>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {asignaciones.map((asignacion, index) => (
              <View key={asignacion.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {index < asignaciones.length - 1 && <View style={styles.timelineLine} />}
                
                <View style={styles.asignacionCard}>
                  <View style={styles.asignacionHeader}>
                    <InstitutionalText variant="body-bold">
                      {formatearFecha(asignacion.fecha_cambio)}
                    </InstitutionalText>
                    <InstitutionalText variant="caption" color="secondary">
                      {asignacion.asignado_por}
                    </InstitutionalText>
                  </View>

                  <View style={styles.cambioContainer}>
                    <View style={styles.tecnicoBox}>
                      <InstitutionalText variant="caption" color="secondary">
                        Anterior
                      </InstitutionalText>
                      <InstitutionalText variant="body">
                        {asignacion.tecnico_anterior?.nombre || 'Sin asignar'}
                      </InstitutionalText>
                    </View>

                    <Text style={styles.arrow}>→</Text>

                    <View style={styles.tecnicoBox}>
                      <InstitutionalText variant="caption" color="secondary">
                        Nuevo
                      </InstitutionalText>
                      <InstitutionalText variant="body-bold">
                        {asignacion.tecnico_nuevo?.nombre || 'Sin asignar'}
                      </InstitutionalText>
                    </View>
                  </View>

                  {asignacion.motivo && (
                    <View style={styles.motivoContainer}>
                      <InstitutionalText variant="caption" color="secondary">
                        Motivo:
                      </InstitutionalText>
                      <InstitutionalText variant="body">
                        {asignacion.motivo}
                      </InstitutionalText>
                    </View>
                  )}

                  {asignacion.checklist_en_progreso && (
                    <View style={styles.checklistWarning}>
                      <InstitutionalText variant="caption" color="warning">
                        ⚠️ Checklist en progreso ({asignacion.checklist_progreso_pct}% completado)
                      </InstitutionalText>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <InstitutionalButton variant="secondary" onPress={onClose}>
          Cerrar
        </InstitutionalButton>
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
    backgroundColor: COLORS.institutional.primary,
    borderWidth: 2,
    borderColor: COLORS.institutional.background,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    bottom: -24,
    width: 1,
    backgroundColor: COLORS.institutional.border,
  },
  asignacionCard: {
    backgroundColor: COLORS.institutional.surface,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
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
    color: COLORS.institutional.secondary,
    marginHorizontal: 8,
  },
  motivoContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.institutional.border,
  },
  checklistWarning: {
    marginTop: 8,
    padding: 8,
    backgroundColor: withOpacity(COLORS.institutional.warning, 0.1),
    borderRadius: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.institutional.border,
  },
});
