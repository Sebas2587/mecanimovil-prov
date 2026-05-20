import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { GLASS_INSET } from '@/app/design-system/blankGlass';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;

const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

type Props = {
  visible: boolean;
  fechaReferencia?: string;
  horaReferencia?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (fecha: string, hora: string, motivo: string) => void;
};

export function ProponerFechaCatalogoModal({
  visible,
  fechaReferencia = '',
  horaReferencia = '',
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [pickerValue, setPickerValue] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(fechaReferencia, horaReferencia),
  );
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (visible) {
      setPickerValue(resolveInitialPickerValue(fechaReferencia, horaReferencia));
      setMotivo('');
    }
  }, [visible, fechaReferencia, horaReferencia]);

  const handleSubmit = useCallback(() => {
    if (loading) return;
    const fecha = formatDateApi(pickerValue.fecha);
    const hora = pickerValue.hora ?? '';
    onConfirm(fecha, hora, motivo.trim());
  }, [pickerValue, motivo, loading, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismissHit} onPress={onClose} accessibilityLabel="Cerrar" />
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) },
            SHADOWS.editorial,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleCol}>
              <View style={styles.kickerPill}>
                <Text style={styles.kickerText}>PROPUESTA</Text>
              </View>
              <Text style={styles.title}>Proponer otra fecha</Text>
              <Text style={styles.subtitle}>
                El cliente deberá aceptarla antes de confirmar la asignación.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closePlate}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <InstitutionalIcon name="close" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <CatalogoFechaHoraPickers value={pickerValue} onChange={setPickerValue} />

            <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
            <TextInput
              style={styles.motivoInput}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej: agenda completa ese día"
              placeholderTextColor={I.muted}
              maxLength={160}
              returnKeyType="done"
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.88}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={I.onPrimary} />
              ) : (
                <Text style={styles.confirmText}>Enviar propuesta</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: withOpacity(I.ink, 0.48),
  },
  dismissHit: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderBottomWidth: 0,
    borderColor: I.hairline,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: SPACING.fixed.sm,
    gap: 4,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
  },
  kickerText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    letterSpacing: 0.6,
    color: I.muted,
  },
  title: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  closePlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.md,
    gap: SPACING.fixed.xs,
  },
  fieldLabel: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.xs,
  },
  motivoInput: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
    minHeight: 44,
    ...SHADOWS.editorial,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    paddingHorizontal: GLASS_INSET,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    backgroundColor: I.canvas,
  },
  cancelBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.ink,
  },
  confirmBtn: {
    flex: 1.35,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm + 2,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  confirmDisabled: {
    opacity: 0.55,
  },
  confirmText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },
});
