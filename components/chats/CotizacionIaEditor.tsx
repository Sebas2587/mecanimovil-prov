import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, Fuel, Plus, Trash2 } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function formatearCLP(valor: number): string {
  return `$${Math.round(valor || 0).toLocaleString('es-CL')}`;
}

function parseCLPInput(texto: string): number {
  const digits = texto.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

interface CotizacionIaEditorProps {
  cotizacion: CotizacionCanal;
  onChange: (next: CotizacionCanal) => void;
  onEnviar?: () => void;
  onGuardarPlantilla?: () => void;
  onMarcarAceptada?: () => void;
  enviando?: boolean;
  guardandoPlantilla?: boolean;
  readonly?: boolean;
}

export function CotizacionIaEditor({
  cotizacion,
  onChange,
  onEnviar,
  onGuardarPlantilla,
  onMarcarAceptada,
  enviando = false,
  guardandoPlantilla = false,
  readonly = false,
}: CotizacionIaEditorProps) {
  const repuestos = cotizacion.repuestos ?? [];
  const editable = !readonly && cotizacion.estado === 'borrador';

  const totalCalculado = useMemo(() => {
    const rep = repuestos.reduce(
      (acc, r) => acc + (r.cantidad || 1) * (r.precio_unitario_clp || 0),
      0,
    );
    return rep + (cotizacion.mano_obra_clp || 0);
  }, [repuestos, cotizacion.mano_obra_clp]);

  const actualizarRepuesto = useCallback(
    (index: number, patch: Partial<RepuestoCotizacion>) => {
      const next = repuestos.map((r, i) => (i === index ? { ...r, ...patch } : r));
      onChange({ ...cotizacion, repuestos: next });
    },
    [cotizacion, onChange, repuestos],
  );

  const eliminarRepuesto = useCallback(
    (index: number) => {
      onChange({ ...cotizacion, repuestos: repuestos.filter((_, i) => i !== index) });
    },
    [cotizacion, onChange, repuestos],
  );

  const agregarRepuesto = useCallback(() => {
    onChange({
      ...cotizacion,
      repuestos: [
        ...repuestos,
        {
          id: `rep-${Date.now()}`,
          nombre: 'Repuesto',
          cantidad: 1,
          precio_unitario_clp: 0,
        },
      ],
    });
  }, [cotizacion, onChange, repuestos]);

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>Cotización IA</Text>

      {cotizacion.tipo_motor_label ? (
        <View style={styles.motorChip}>
          <Fuel size={14} color={I.primary} strokeWidth={2} />
          <Text style={styles.motorChipText}>Motor: {cotizacion.tipo_motor_label}</Text>
        </View>
      ) : null}

      {cotizacion.aviso_motor ? (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color={I.accentYellow} strokeWidth={2} />
          <Text style={styles.warningText}>{cotizacion.aviso_motor}</Text>
        </View>
      ) : null}

      <View style={styles.estadoRow}>
        <Text style={styles.estadoLabel}>Estado:</Text>
        <Text style={styles.estadoValue}>{cotizacion.estado}</Text>
      </View>

      <Text style={styles.fieldLabel}>Mano de obra (CLP)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        editable={editable}
        value={String(cotizacion.mano_obra_clp || 0)}
        onChangeText={(t) => onChange({ ...cotizacion, mano_obra_clp: parseCLPInput(t) })}
      />

      <View style={styles.repuestosHeader}>
        <Text style={styles.fieldLabel}>Repuestos</Text>
        {editable ? (
          <TouchableOpacity style={styles.addBtn} onPress={agregarRepuesto}>
            <Plus size={16} color={I.primary} />
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {repuestos.map((rep, idx) => (
        <View key={rep.id ?? `rep-${idx}`} style={styles.repuestoCard}>
          <TextInput
            style={styles.input}
            editable={editable}
            placeholder="Nombre repuesto"
            value={rep.nombre}
            onChangeText={(t) => actualizarRepuesto(idx, { nombre: t })}
          />
          <View style={styles.repuestoRow}>
            <View style={styles.repuestoField}>
              <Text style={styles.miniLabel}>Cant.</Text>
              <TextInput
                style={styles.inputSmall}
                keyboardType="numeric"
                editable={editable}
                value={String(rep.cantidad || 1)}
                onChangeText={(t) =>
                  actualizarRepuesto(idx, { cantidad: Math.max(1, parseInt(t, 10) || 1) })
                }
              />
            </View>
            <View style={styles.repuestoFieldFlex}>
              <Text style={styles.miniLabel}>Precio unit.</Text>
              <TextInput
                style={styles.inputSmall}
                keyboardType="numeric"
                editable={editable}
                value={String(rep.precio_unitario_clp || 0)}
                onChangeText={(t) =>
                  actualizarRepuesto(idx, { precio_unitario_clp: parseCLPInput(t) })
                }
              />
            </View>
            {editable ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => eliminarRepuesto(idx)}
                accessibilityLabel="Eliminar repuesto"
              >
                <Trash2 size={18} color="#C62828" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.subtotalRep}>
            Subtotal: {formatearCLP((rep.cantidad || 1) * (rep.precio_unitario_clp || 0))}
          </Text>
        </View>
      ))}

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Total estimado</Text>
        <Text style={styles.totalValue}>{formatearCLP(totalCalculado)}</Text>
      </View>

      {cotizacion.advertencias?.length ? (
        <View style={styles.advertenciasBox}>
          {cotizacion.advertencias.map((adv, i) => (
            <Text key={`adv-${i}`} style={styles.advertenciaText}>
              • {adv}
            </Text>
          ))}
        </View>
      ) : null}

      {editable && onEnviar ? (
        <TouchableOpacity
          style={[styles.primaryBtn, enviando && styles.btnDisabled]}
          onPress={onEnviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color={I.onPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Enviar cotización al cliente</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {editable && onGuardarPlantilla ? (
        <TouchableOpacity
          style={[styles.secondaryBtn, guardandoPlantilla && styles.btnDisabled]}
          onPress={onGuardarPlantilla}
          disabled={guardandoPlantilla}
        >
          <Text style={styles.secondaryBtnText}>Guardar como plantilla</Text>
        </TouchableOpacity>
      ) : null}

      {cotizacion.estado === 'enviada' && onMarcarAceptada ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onMarcarAceptada}>
          <Text style={styles.secondaryBtnText}>Cliente aceptó (manual)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  motorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
  },
  motorChipText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: '#FFF8E6',
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.accentYellow,
  },
  warningText: {
    flex: 1,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  estadoRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  estadoLabel: { fontFamily: FF.sansMedium, fontSize: TYPOGRAPHY.fontSize.sm, color: I.muted },
  estadoValue: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.ink },
  fieldLabel: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  input: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  repuestosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.primary },
  repuestoCard: {
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
  },
  repuestoRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  repuestoField: { width: 72 },
  repuestoFieldFlex: { flex: 1 },
  miniLabel: { fontFamily: FF.sansMedium, fontSize: TYPOGRAPHY.fontSize.xs, color: I.muted },
  inputSmall: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  deleteBtn: { padding: SPACING.xs },
  subtotalRep: { fontFamily: FF.sansMedium, fontSize: TYPOGRAPHY.fontSize.xs, color: I.muted },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  totalLabel: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.ink },
  totalValue: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.lg, color: I.primary },
  advertenciasBox: { gap: 4 },
  advertenciaText: { fontFamily: FF.sansRegular, fontSize: TYPOGRAPHY.fontSize.xs, color: I.muted },
  primaryBtn: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.onPrimary },
  secondaryBtn: {
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
  },
  secondaryBtnText: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.primary },
  btnDisabled: { opacity: 0.6 },
});
