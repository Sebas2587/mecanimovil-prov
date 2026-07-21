import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ServicioConfiguradoParaOferta } from '@/services/serviciosApi';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { Card } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';

const I = COLORS.institutional;
const primaryStatus = institutionalStatusColors('primary');
const successStatus = institutionalStatusColors('success');
const neutralStatus = institutionalStatusColors('neutral');

interface ServicioConfiguradoSelectorProps {
  servicioConfigurado: ServicioConfiguradoParaOferta | null;
  loading?: boolean;
  onUsarServicioConfigurado: () => void;
  onCrearManual: () => void;
  usandoServicioConfigurado: boolean;
}

export const ServicioConfiguradoSelector: React.FC<ServicioConfiguradoSelectorProps> = ({
  servicioConfigurado,
  loading = false,
  onUsarServicioConfigurado,
  onCrearManual,
  usandoServicioConfigurado,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={I.primary} />
        <Text style={styles.loadingText}>Buscando servicio configurado...</Text>
      </View>
    );
  }

  if (!servicioConfigurado) {
    return (
      <View style={styles.infoCard}>
        <InstitutionalIcon name="info-outline" size={20} color={neutralStatus.icon} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.infoText}>
          No tienes un servicio configurado para esta marca. Puedes crear la oferta manualmente.
        </Text>
      </View>
    );
  }

  if (usandoServicioConfigurado) {
    return (
      <View style={styles.activoCard}>
        <View style={styles.activoHeader}>
          <InstitutionalIcon name="check-circle" size={20} color={successStatus.icon} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.activoTitle}>Usando servicio configurado</Text>
        </View>
        <Text style={styles.activoSubtitle}>
          {servicioConfigurado.servicio_info.nombre}
          {servicioConfigurado.marca_vehiculo_info && (
            <> - {servicioConfigurado.marca_vehiculo_info.nombre}</>
          )}
        </Text>
        <InstitutionalButton
          label="Cambiar a modo manual"
          variant="outlineAccent"
          size="compact"
          onPress={onCrearManual}
          style={styles.cambiarButton}
        />
      </View>
    );
  }

  return (
    <Card elevated padding={0} style={styles.card}>
      <View style={styles.cardHeader}>
        <InstitutionalIcon name="auto-fix-high" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>Servicio configurado disponible</Text>
          <Text style={styles.cardSubtitle}>
            Usa tu configuración guardada para crear la oferta rápidamente
          </Text>
        </View>
      </View>

      <View style={styles.servicioInfo}>
        <Text style={styles.servicioNombre}>
          {servicioConfigurado.servicio_info.nombre}
        </Text>
        {servicioConfigurado.marca_vehiculo_info && (
          <View style={styles.marcaInfo}>
            <InstitutionalIcon name="directions-car" size={16} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.marcaText}>
              {servicioConfigurado.marca_vehiculo_info.nombre}
            </Text>
          </View>
        )}
        <View style={styles.detallesRow}>
          <View style={styles.detalleItem}>
            <InstitutionalIcon name="build" size={16} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.detalleText}>
              {servicioConfigurado.tipo_servicio === 'con_repuestos'
                ? 'Con repuestos'
                : 'Solo mano de obra'}
            </Text>
          </View>
          {servicioConfigurado.repuestos_info_detallado &&
            servicioConfigurado.repuestos_info_detallado.length > 0 && (
              <View style={styles.detalleItem}>
                <InstitutionalIcon name="inventory-2" size={16} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.detalleText}>
                  {servicioConfigurado.repuestos_info_detallado.length} repuesto(s)
                </Text>
              </View>
            )}
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <InstitutionalButton
          label="Usar servicio configurado"
          variant="primary"
          onPress={onUsarServicioConfigurado}
          leading={
            <InstitutionalIcon name="auto-fix-high" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          }
        />
        <InstitutionalButton
          label="Crear manualmente"
          variant="outline"
          onPress={onCrearManual}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: I.surfaceSoft,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: I.body,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: I.surfaceSoft,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: I.body,
    lineHeight: 20,
  },
  card: {
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: I.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: I.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: I.body,
    lineHeight: 18,
  },
  servicioInfo: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  servicioNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: I.ink,
    marginBottom: 8,
  },
  marcaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  marcaText: {
    fontSize: 13,
    color: I.body,
  },
  detallesRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleText: {
    fontSize: 13,
    color: I.body,
  },
  buttonsContainer: {
    gap: 12,
  },
  activoCard: {
    backgroundColor: successStatus.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: successStatus.border,
  },
  activoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: successStatus.text,
  },
  activoSubtitle: {
    fontSize: 14,
    color: I.body,
    marginBottom: 12,
    marginLeft: 28,
  },
  cambiarButton: {
    alignSelf: 'flex-start',
  },
});
