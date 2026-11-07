import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { COLORS, SHADOWS, withOpacity } from '@/design-system/tokens';
import type { ConflictoHorario } from '@/services/ordenesProveedor';

const I = COLORS.institutional;

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
    <BottomSheet visible={visible} onClose={onDismiss} stickyFooter>
      <InstitutionalText role="h3">Conflictos de horario</InstitutionalText>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBanner}>
          <InstitutionalText role="body" style={styles.warningText}>
            El técnico tiene {conflictos.length} {conflictos.length === 1 ? 'orden' : 'órdenes'} en el mismo horario.
          </InstitutionalText>
        </View>

        <View style={styles.capacidadContainer}>
          <InstitutionalText role="caption" color="muted">
            Capacidad disponible
          </InstitutionalText>
          <InstitutionalText role="h3">
            {capacidadDisponible} / {capacidadTotal}
          </InstitutionalText>
        </View>

        <View style={styles.conflictosContainer}>
          <InstitutionalText role="bodyBold" style={styles.sectionTitle}>
            Órdenes en conflicto:
          </InstitutionalText>

          {conflictos.map((conflicto) => (
            <View key={`${conflicto.orden_id}-${conflicto.fecha}-${conflicto.hora_inicio}`} style={styles.conflictoCard}>
              <View style={styles.conflictoHeader}>
                <InstitutionalText role="bodyBold">
                  Orden #{conflicto.orden_id}
                </InstitutionalText>
                <View style={[styles.estadoBadge, getEstadoBadgeStyle(conflicto.estado)]}>
                  <InstitutionalText role="caption" style={styles.estadoText}>
                    {formatEstado(conflicto.estado)}
                  </InstitutionalText>
                </View>
              </View>

              <View style={styles.conflictoDetails}>
                <View style={styles.detailRow}>
                  <InstitutionalText role="caption" color="muted">
                    Fecha:
                  </InstitutionalText>
                  <InstitutionalText role="body">
                    {formatearFecha(conflicto.fecha)}
                  </InstitutionalText>
                </View>

                <View style={styles.detailRow}>
                  <InstitutionalText role="caption" color="muted">
                    Hora:
                  </InstitutionalText>
                  <InstitutionalText role="body">
                    {conflicto.hora_inicio}
                  </InstitutionalText>
                </View>

                <View style={styles.detailRow}>
                  <InstitutionalText role="caption" color="muted">
                    Técnico:
                  </InstitutionalText>
                  <InstitutionalText role="body">
                    {conflicto.mecanico}
                  </InstitutionalText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <InstitutionalText role="caption" style={styles.infoText}>
            Este es un aviso informativo. Puedes continuar con la asignación, pero te recomendamos revisar la agenda del técnico para evitar sobrecarga.
          </InstitutionalText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {onVerAgenda ? (
          <InstitutionalButton
            label="Ver Agenda"
            variant="secondary"
            onPress={onVerAgenda}
            style={styles.button}
          />
        ) : null}
        <InstitutionalButton
          label="Entendido"
          variant="primary"
          onPress={onDismiss}
          style={styles.button}
        />
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
    aceptada_por_proveedor: 'Aceptada',
    servicio_iniciado: 'Iniciada',
    checklist_en_progreso: 'En progreso',
    en_proceso: 'En proceso',
  };
  return estados[estado] || estado;
}

function getEstadoBadgeStyle(estado: string) {
  const colors: Record<string, { backgroundColor: string }> = {
    aceptada_por_proveedor: { backgroundColor: withOpacity(I.primary, 0.15) },
    servicio_iniciado: { backgroundColor: withOpacity(I.semanticUp, 0.15) },
    checklist_en_progreso: { backgroundColor: withOpacity(I.accentYellow, 0.15) },
    en_proceso: { backgroundColor: withOpacity(I.accentYellow, 0.15) },
  };
  return colors[estado] || { backgroundColor: withOpacity(I.muted, 0.15) };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  warningBanner: {
    backgroundColor: withOpacity(I.accentYellow, 0.1),
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: I.accentYellow,
  },
  warningText: {
    color: I.accentYellow,
  },
  capacidadContainer: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: I.paper,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  conflictosContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  conflictoCard: {
    backgroundColor: I.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: I.hairline,
    ...SHADOWS.sm,
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
    backgroundColor: withOpacity(I.primary, 0.1),
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    color: I.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  button: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 140,
  },
});
