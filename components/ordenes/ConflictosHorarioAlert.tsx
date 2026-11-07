import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { COLORS, SHADOWS } from '@/app/design-system/tokens';
import type { ConflictoHorario } from '@/services/ordenesProveedor';

const I = COLORS.institutional;

function withOpacity(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

interface ConflictosHorarioAlertProps {
  visible: boolean;
  conflictos: ConflictoHorario[];
  capacidadDisponible: number;
  capacidadTotal: number;
  onDismiss: () => void;
  onVerAgenda?: () => void;
}

export function ConflictosHorarioAlert({
  visible,
  conflictos,
  capacidadDisponible,
  capacidadTotal,
  onDismiss,
  onVerAgenda,
}: ConflictosHorarioAlertProps) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title="⚠️ Conflictos de Horario Detectados"
      snapPoints={['60%']}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBanner}>
          <InstitutionalText variant="body" style={styles.warningText}>
            El técnico tiene {conflictos.length} {conflictos.length === 1 ? 'orden' : 'órdenes'} en el mismo horario.
          </InstitutionalText>
        </View>

        <View style={styles.capacidadContainer}>
          <InstitutionalText variant="caption" color="secondary">
            Capacidad disponible
          </InstitutionalText>
          <InstitutionalText variant="h3">
            {capacidadDisponible} / {capacidadTotal}
          </InstitutionalText>
        </View>

        <View style={styles.conflictosContainer}>
          <InstitutionalText variant="body-bold" style={styles.sectionTitle}>
            Órdenes en conflicto:
          </InstitutionalText>

          {conflictos.map((conflicto, index) => (
            <View key={`${conflicto.orden_id}-${index}`} style={styles.conflictoCard}>
              <View style={styles.conflictoHeader}>
                <InstitutionalText variant="body-bold">
                  Orden #{conflicto.orden_id}
                </InstitutionalText>
                <View style={[styles.estadoBadge, getEstadoBadgeStyle(conflicto.estado)]}>
                  <InstitutionalText variant="caption" style={styles.estadoText}>
                    {formatEstado(conflicto.estado)}
                  </InstitutionalText>
                </View>
              </View>

              <View style={styles.conflictoDetails}>
                <View style={styles.detailRow}>
                  <InstitutionalText variant="caption" color="secondary">
                    Fecha:
                  </InstitutionalText>
                  <InstitutionalText variant="body">
                    {formatearFecha(conflicto.fecha)}
                  </InstitutionalText>
                </View>

                <View style={styles.detailRow}>
                  <InstitutionalText variant="caption" color="secondary">
                    Hora:
                  </InstitutionalText>
                  <InstitutionalText variant="body">
                    {conflicto.hora_inicio}
                  </InstitutionalText>
                </View>

                <View style={styles.detailRow}>
                  <InstitutionalText variant="caption" color="secondary">
                    Técnico:
                  </InstitutionalText>
                  <InstitutionalText variant="body">
                    {conflicto.mecanico}
                  </InstitutionalText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <InstitutionalText variant="caption" style={styles.infoText}>
            💡 Este es un aviso informativo. Puedes continuar con la asignación, pero te recomendamos revisar la agenda del técnico para evitar sobrecarga.
          </InstitutionalText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {onVerAgenda && (
          <InstitutionalButton
            variant="secondary"
            onPress={onVerAgenda}
            style={styles.button}
          >
            Ver Agenda
          </InstitutionalButton>
        )}
        <InstitutionalButton
          variant="primary"
          onPress={onDismiss}
          style={styles.button}
        >
          Entendido
        </InstitutionalButton>
      </View>
    </BottomSheet>
  );
}

function formatearFecha(fecha: string): string {
  try {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
}

function formatEstado(estado: string): string {
  const estados: Record<string, string> = {
    'aceptada_por_proveedor': 'Aceptada',
    'servicio_iniciado': 'Iniciada',
    'checklist_en_progreso': 'En progreso',
    'en_proceso': 'En proceso',
  };
  return estados[estado] || estado;
}

function getEstadoBadgeStyle(estado: string) {
  const colors: Record<string, { backgroundColor: string }> = {
    'aceptada_por_proveedor': { backgroundColor: withOpacity(I.info, 0.15) },
    'servicio_iniciado': { backgroundColor: withOpacity(I.success, 0.15) },
    'checklist_en_progreso': { backgroundColor: withOpacity(I.warning, 0.15) },
    'en_proceso': { backgroundColor: withOpacity(I.warning, 0.15) },
  };
  return colors[estado] || { backgroundColor: withOpacity(I.secondary, 0.15) };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  warningBanner: {
    backgroundColor: withOpacity(I.warning, 0.1),
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: I.warning,
  },
  warningText: {
    color: I.warning,
  },
  capacidadContainer: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: I.surface,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  conflictosContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  conflictoCard: {
    backgroundColor: I.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: I.border,
    ...SHADOWS.small,
  },
  conflictoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontWeight: '600',
  },
  conflictoDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBox: {
    backgroundColor: withOpacity(I.info, 0.1),
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    color: I.info,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: I.border,
  },
  button: {
    flex: 1,
  },
});
