import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChecklistContainer } from '@/components/checklist';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { Card, hostScreenStyles, HOST_GUTTER } from '@/app/design-system/components';

const I = COLORS.institutional;

export default function ChecklistDemoScreen() {
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);

  // Órdenes de ejemplo para probar
  const ordenesEjemplo = [
    {
      id: 1,
      cliente: 'Juan Pérez',
      vehiculo: 'Toyota Corolla 2020',
      servicio: 'Cambio de Embrague',
      estado: 'aceptada_por_proveedor',
    },
    {
      id: 2,
      cliente: 'María González',
      vehiculo: 'Honda Civic 2019',
      servicio: 'Revisión General',
      estado: 'checklist_en_progreso',
    },
    {
      id: 3,
      cliente: 'Carlos López',
      vehiculo: 'Ford Focus 2021',
      servicio: 'Cambio de Frenos',
      estado: 'checklist_completado',
    },
  ];

  const handleIniciarChecklist = (ordenId: number) => {
    setSelectedOrdenId(ordenId);
    setShowChecklist(true);
  };

  const handleChecklistComplete = () => {
    Alert.alert(
      'Checklist Completado',
      'El checklist ha sido finalizado exitosamente',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowChecklist(false);
            setSelectedOrdenId(null);
          },
        },
      ]
    );
  };

  const handleChecklistCancel = () => {
    setShowChecklist(false);
    setSelectedOrdenId(null);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aceptada_por_proveedor':
        return I.primary;
      case 'checklist_en_progreso':
        return I.accentYellow;
      case 'checklist_completado':
        return I.semanticUp;
      default:
        return I.muted;
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'aceptada_por_proveedor':
        return 'Listo para checklist';
      case 'checklist_en_progreso':
        return 'Checklist en progreso';
      case 'checklist_completado':
        return 'Checklist completado';
      default:
        return estado;
    }
  };

  if (showChecklist && selectedOrdenId) {
    return (
      <ChecklistContainer
        ordenId={selectedOrdenId}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demo de Checklist</Text>
        <Text style={styles.headerSubtitle}>
          Sistema de checklist de pre-servicio
        </Text>
      </View>

      {/* Información del sistema */}
      <Card elevated padding="host" style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <InstitutionalIcon name="info" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.infoTitle}>Acerca del Sistema</Text>
        </View>
        <Text style={styles.infoText}>
          El sistema de checklist de pre-servicio es obligatorio para todas las órdenes.
          Incluye captura de fotos, firmas digitales y ubicación GPS.
        </Text>
      </Card>

      {/* Lista de órdenes */}
      <ScrollView style={hostScreenStyles.scroll} contentContainerStyle={hostScreenStyles.scrollInner}>
        <InstitutionalSectionHeader title="Órdenes Disponibles" level="h4" style={styles.sectionHeader} />

        {ordenesEjemplo.map((orden) => (
          <Card key={orden.id} elevated padding="host" style={styles.ordenCard}>
            <View style={styles.ordenHeader}>
              <Text style={styles.ordenId}>Orden #{orden.id}</Text>
              <View style={[
                styles.estadoBadge,
                { backgroundColor: getEstadoColor(orden.estado) }
              ]}>
                <Text style={styles.estadoText}>
                  {getEstadoTexto(orden.estado)}
                </Text>
              </View>
            </View>

            <View style={styles.ordenInfo}>
              <View style={styles.ordenInfoRow}>
                <InstitutionalIcon name="person" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.ordenInfoText}>{orden.cliente}</Text>
              </View>
              <View style={styles.ordenInfoRow}>
                <InstitutionalIcon name="directions-car" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.ordenInfoText}>{orden.vehiculo}</Text>
              </View>
              <View style={styles.ordenInfoRow}>
                <InstitutionalIcon name="build" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.ordenInfoText}>{orden.servicio}</Text>
              </View>
            </View>

            {orden.estado === 'aceptada_por_proveedor' && (
              <TouchableOpacity
                style={styles.iniciarButton}
                onPress={() => handleIniciarChecklist(orden.id)}
              >
                <InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.iniciarButtonText}>Iniciar Checklist</Text>
              </TouchableOpacity>
            )}

            {orden.estado === 'checklist_en_progreso' && (
              <TouchableOpacity
                style={styles.continuarButton}
                onPress={() => handleIniciarChecklist(orden.id)}
              >
                <InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.continuarButtonText}>Continuar Checklist</Text>
              </TouchableOpacity>
            )}

            {orden.estado === 'checklist_completado' && (
              <View style={styles.completadoIndicator}>
                <InstitutionalIcon name="check-circle" size={20} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.completadoText}>Checklist Completado</Text>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Información adicional */}
      <Card elevated padding="host" style={styles.footerInfo}>
        <Text style={styles.footerTitle}>Características del Sistema:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <InstitutionalIcon name="offline-bolt" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.featureText}>Funciona offline</Text>
          </View>
          <View style={styles.featureItem}>
            <InstitutionalIcon name="photo-camera" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.featureText}>Captura de fotos</Text>
          </View>
          <View style={styles.featureItem}>
            <InstitutionalIcon name="edit" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.featureText}>Firmas digitales</Text>
          </View>
          <View style={styles.featureItem}>
            <InstitutionalIcon name="location-on" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.featureText}>Ubicación GPS</Text>
          </View>
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  header: {
    backgroundColor: I.canvas,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: I.ink,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: I.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  infoContainer: {
    marginHorizontal: HOST_GUTTER,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: I.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: I.ink,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: I.muted,
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  ordenCard: {
    marginBottom: 12,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordenId: {
    fontSize: 16,
    fontWeight: '600',
    color: I.body,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '500',
    color: I.onPrimary,
  },
  ordenInfo: {
    gap: 8,
    marginBottom: 16,
  },
  ordenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ordenInfoText: {
    fontSize: 14,
    color: I.muted,
  },
  iniciarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  iniciarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: I.onPrimary,
  },
  continuarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.accentYellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  continuarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: I.onPrimary,
  },
  completadoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  completadoText: {
    fontSize: 14,
    fontWeight: '500',
    color: I.semanticUp,
  },
  footerInfo: {
    marginHorizontal: HOST_GUTTER,
    marginBottom: SPACING.md,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: I.body,
    marginBottom: 12,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  featureText: {
    fontSize: 12,
    color: I.muted,
  },
});
