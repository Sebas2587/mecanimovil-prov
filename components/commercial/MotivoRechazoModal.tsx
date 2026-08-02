import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import {
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalText,
  Card,
} from '@/app/design-system/components';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type CategoriaRechazo =
  | 'precio_alto'
  | 'sin_stock_repuesto'
  | 'sin_cobertura_domicilio'
  | 'sin_horario_disponible'
  | 'cliente_desiste'
  | 'otro';

const MOTIVOS_OPCIONES: { key: CategoriaRechazo; label: string; desc: string }[] = [
  { key: 'precio_alto', label: 'Precio percibido como alto', desc: 'El cliente consideró elevado el monto total.' },
  { key: 'sin_stock_repuesto', label: 'Falta de repuestos / Stock', desc: 'No se encontró la pieza en distribuidores.' },
  { key: 'sin_cobertura_domicilio', label: 'Sin cobertura geográfica', desc: 'Comuna o zona fuera de alcance.' },
  { key: 'sin_horario_disponible', label: 'Sin disponibilidad horaria', desc: 'Agenda ocupada en la fecha solicitada.' },
  { key: 'cliente_desiste', label: 'Cliente desistió o resolvió por otro medio', desc: 'El usuario ya no requiere la atención.' },
  { key: 'otro', label: 'Otro motivo especificado', desc: 'Comentario personalizado.' },
];

export interface MotivoRechazoModalProps {
  visible: boolean;
  onClose: () => void;
  cotizacionId: number;
  onRechazadoExitoso?: () => void;
}

export function MotivoRechazoModal({
  visible,
  onClose,
  cotizacionId,
  onRechazadoExitoso,
}: MotivoRechazoModalProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaRechazo>('precio_alto');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleConfirmarRechazo = async () => {
    setEnviando(true);
    try {
      await cotizacionCanalService.marcarPerdida(cotizacionId);
      await cotizacionCanalService.actualizar(cotizacionId, {
        metadata: {
          motivo_rechazo_categoria: categoriaSeleccionada,
          motivo_rechazo_comentario: comentario.trim(),
        },
      });
      showAlert('Cotización archivada', 'El motivo de rechazo fue registrado para el aprendizaje de la IA.');
      onRechazadoExitoso?.();
      onClose();
    } catch {
      showAlert('Error', 'No se pudo guardar el motivo de rechazo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <InstitutionalModal
      visible={visible}
      onRequestClose={onClose}
      onClose={onClose}
      title="Registrar Motivo de Rechazo"
      animationType="slide"
      footer={
        <View style={styles.footerRow}>
          <InstitutionalButton
            label={enviando ? 'Guardando...' : 'Archivar con este motivo'}
            variant="destructiveOutline"
            size="default"
            onPress={handleConfirmarRechazo}
            disabled={enviando}
            style={styles.btnFull}
          />
          <InstitutionalButton
            label="Cancelar"
            variant="outline"
            size="default"
            onPress={onClose}
            disabled={enviando}
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <HostSectionKicker label="APRENDIZAJE ADAPTATIVO IA" />
        <InstitutionalText role="caption" color="muted">
          Indica la razón por la que no se concretó la cotización. La IA procesará este aprendizaje para futuras interacciones.
        </InstitutionalText>

        <View style={styles.optionsList}>
          {MOTIVOS_OPCIONES.map((opt) => {
            const isSelected = categoriaSeleccionada === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setCategoriaSeleccionada(opt.key)}
              >
                <View style={styles.radioCircle}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.optionTextCol}>
                  <InstitutionalText role="captionBold">{opt.label}</InstitutionalText>
                  <InstitutionalText role="small" color="muted">{opt.desc}</InstitutionalText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <HostSectionKicker label="COMENTARIO ADICIONAL (OPCIONAL)" />
        <Card elevated padding="host" style={styles.commentCard}>
          <TextInput
            style={styles.textArea}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Detalla cualquier observación relevante del cliente..."
            placeholderTextColor={I.mutedSoft}
            multiline
            numberOfLines={3}
          />
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
  optionsList: {
    gap: SPACING.fixed.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
  },
  optionCardSelected: {
    borderColor: I.primary,
    backgroundColor: I.canvas,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: I.primary,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  commentCard: {
    marginTop: 4,
  },
  textArea: {
    minHeight: 70,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    textAlignVertical: 'top',
  },
  footerRow: {
    gap: SPACING.fixed.xs,
  },
  btnFull: {
    width: '100%',
  },
});
