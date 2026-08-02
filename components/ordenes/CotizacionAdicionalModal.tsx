import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
} from '@/app/design-system/components';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { Plus, Trash2, Wrench } from 'lucide-react-native';
import cotizacionCanalService, { type RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { showAlert } from '@/utils/platformAlert';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export interface CotizacionAdicionalModalProps {
  visible: boolean;
  onClose: () => void;
  citaId: number;
  cotizacionOriginalId: number;
  onCotizacionCreada?: () => void;
}

export function CotizacionAdicionalModal({
  visible,
  onClose,
  citaId,
  cotizacionOriginalId,
  onCotizacionCreada,
}: CotizacionAdicionalModalProps) {
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [manoObraClp, setManoObraClp] = useState('0');
  const [repuestos, setRepuestos] = useState<RepuestoCotizacion[]>([]);
  const [creando, setCreando] = useState(false);

  const agregarRepuesto = useCallback(() => {
    setRepuestos((prev) => [
      ...prev,
      {
        nombre: '',
        cantidad: 1,
        precio_unitario_clp: 0,
        fuente_repuesto: 'MercadoLibre / Casa de Repuestos',
      },
    ]);
  }, []);

  const eliminarRepuesto = useCallback((index: number) => {
    setRepuestos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const actualizarRepuesto = useCallback((index: number, patch: Partial<RepuestoCotizacion>) => {
    setRepuestos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }, []);

  const totalRepuestos = repuestos.reduce(
    (acc, r) => acc + (r.cantidad || 1) * (r.precio_unitario_clp || 0),
    0,
  );
  const manoObraNum = parseInt(manoObraClp.replace(/\D/g, ''), 10) || 0;
  const totalCotizacion = totalRepuestos + manoObraNum;

  const handleCrear = useCallback(async () => {
    if (!servicioNombre.trim()) {
      showAlert('Servicio requerido', 'Indica el nombre del trabajo adicional a cotizar.');
      return;
    }
    if (totalCotizacion <= 0) {
      showAlert('Monto invalido', 'El total de la cotización adicional debe ser mayor a $0.');
      return;
    }

    setCreando(true);
    try {
      await cotizacionCanalService.crearAdicional({
        cotizacion_original_id: cotizacionOriginalId,
        servicio_nombre: servicioNombre.trim(),
        descripcion_problema: descripcion.trim(),
        mano_obra_clp: manoObraNum,
        repuestos: repuestos.filter((r) => r.nombre.trim().length > 0),
      });

      showAlert(
        'Cotización adicional enviada',
        'El cliente recibirá la notificación de aprobación del trabajo adicional.',
      );
      onCotizacionCreada?.();
      onClose();
    } catch {
      showAlert('Error', 'No se pudo crear la cotización adicional.');
    } finally {
      setCreando(false);
    }
  }, [servicioNombre, totalCotizacion, cotizacionOriginalId, descripcion, manoObraNum, repuestos, onCotizacionCreada, onClose]);

  return (
    <InstitutionalModal
      visible={visible}
      onRequestClose={onClose}
      onClose={onClose}
      title="Proponer Trabajo Adicional"
      animationType="slide"
      footer={
        <View style={styles.footerRow}>
          <InstitutionalButton
            label={creando ? 'Creando...' : 'Enviar Cotización Adicional'}
            variant="primary"
            size="default"
            onPress={handleCrear}
            disabled={creando}
            style={styles.btnPrimary}
          />
          <InstitutionalButton
            label="Cancelar"
            variant="outline"
            size="default"
            onPress={onClose}
            disabled={creando}
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <HostSectionKicker label="HALLAZGO / REPARACIÓN COMPLEMENTARIA" />
        <InstitutionalText role="caption" color="muted">
          Propón un trabajo adicional para esta orden activa. El cliente recibirá una notificación in-app o enlace conversacional para su aprobación.
        </InstitutionalText>

        <Card elevated padding="host" style={styles.cardSection}>
          <InstitutionalText role="label" color="muted">Nombre del servicio adicional</InstitutionalText>
          <TextInput
            style={styles.input}
            value={servicioNombre}
            onChangeText={setServicioNombre}
            placeholder="ej. Cambio de pastillas delanteras"
            placeholderTextColor={I.mutedSoft}
          />

          <InstitutionalText role="label" color="muted">Detalle / Hallazgo en taller</InstitutionalText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Describe la necesidad o hallazgo durante la revisión"
            placeholderTextColor={I.mutedSoft}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card elevated padding="host" style={styles.cardSection}>
          <HostSectionKicker label="MANO DE OBRA (CLP)" />
          <TextInput
            style={styles.input}
            value={manoObraClp}
            onChangeText={setManoObraClp}
            keyboardType="numeric"
            placeholder="Monto mano de obra"
            placeholderTextColor={I.mutedSoft}
          />
        </Card>

        <View style={styles.repuestosHeader}>
          <HostSectionKicker label={`REPUESTOS (${repuestos.length})`} />
          <InstitutionalButton
            label="Agregar repuesto"
            variant="outline"
            size="compact"
            leading={<Plus size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={agregarRepuesto}
          />
        </View>

        {repuestos.map((rep, idx) => (
          <Card key={`rep-${idx}`} elevated padding="host" style={styles.repuestoCard}>
            <View style={styles.repuestoRowHeader}>
              <InstitutionalText role="captionBold">Repuesto {idx + 1}</InstitutionalText>
              <InstitutionalTag label={rep.fuente_repuesto || 'MercadoLibre / Derco'} variant="info" size="sm" />
              <InstitutionalButton
                label=""
                variant="outline"
                size="compact"
                leading={<Trash2 size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={() => eliminarRepuesto(idx)}
              />
            </View>
            <TextInput
              style={styles.input}
              value={rep.nombre}
              onChangeText={(t) => actualizarRepuesto(idx, { nombre: t })}
              placeholder="Nombre del repuesto"
              placeholderTextColor={I.mutedSoft}
            />
            <View style={styles.repuestoGrid}>
              <View style={styles.col}>
                <InstitutionalText role="small" color="muted">Cant.</InstitutionalText>
                <TextInput
                  style={styles.inputSmall}
                  value={String(rep.cantidad)}
                  onChangeText={(t) => actualizarRepuesto(idx, { cantidad: parseInt(t, 10) || 1 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.colFlex}>
                <InstitutionalText role="small" color="muted">Precio Unit. (CLP)</InstitutionalText>
                <TextInput
                  style={styles.inputSmall}
                  value={String(rep.precio_unitario_clp || 0)}
                  onChangeText={(t) => actualizarRepuesto(idx, { precio_unitario_clp: parseInt(t, 10) || 0 })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Card>
        ))}

        <Card elevated padding="host" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <InstitutionalText role="caption" color="muted">Total Estimado Trabajo Adicional</InstitutionalText>
            <InstitutionalText role="h4" color="primary">{formatearMontoCLP(totalCotizacion)}</InstitutionalText>
          </View>
        </Card>
      </ScrollView>
    </InstitutionalModal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
  },
  cardSection: {
    gap: SPACING.fixed.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  repuestosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.fixed.xs,
  },
  repuestoCard: {
    gap: SPACING.fixed.xs,
  },
  repuestoRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
  repuestoGrid: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  col: {
    width: 60,
    gap: 2,
  },
  colFlex: {
    flex: 1,
    gap: 2,
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 4,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  summaryCard: {
    marginTop: SPACING.fixed.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRow: {
    gap: SPACING.fixed.xs,
  },
  btnPrimary: {
    backgroundColor: I.primary,
  },
});
