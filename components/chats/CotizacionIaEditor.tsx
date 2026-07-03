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
import {
  formatearMontoCLP,
  redondearCLP,
} from '@/utils/formatearMontoCLP';
import {
  formatMontoInputLocalized,
  parseMontoDecimal,
} from '@/utils/parseMontoDecimal';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function subtotalRepuesto(rep: RepuestoCotizacion): number {
  return redondearCLP(redondearCLP(rep.cantidad || 1) * redondearCLP(rep.precio_unitario_clp));
}

interface ClpMoneyInputProps {
  value: number;
  onChangeValue: (next: number) => void;
  editable: boolean;
  placeholder?: string;
  compact?: boolean;
}

function ClpMoneyInput({
  value,
  onChangeValue,
  editable,
  placeholder = '0',
  compact = false,
}: ClpMoneyInputProps) {
  const display = value > 0 ? formatMontoInputLocalized(value) : '';

  return (
    <View style={[styles.moneyInputRow, compact && styles.moneyInputRowCompact]}>
      <Text style={styles.moneyPrefix}>$</Text>
      <TextInput
        style={[styles.moneyInput, compact && styles.moneyInputCompact]}
        keyboardType="numeric"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={I.mutedSoft}
        value={display}
        onChangeText={(t) => onChangeValue(redondearCLP(parseMontoDecimal(t)))}
      />
    </View>
  );
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
  const manoObra = redondearCLP(cotizacion.mano_obra_clp);

  const totalRepuestos = useMemo(
    () => repuestos.reduce((acc, r) => acc + subtotalRepuesto(r), 0),
    [repuestos],
  );

  const totalCalculado = useMemo(
    () => totalRepuestos + manoObra,
    [totalRepuestos, manoObra],
  );

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
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Cotización IA</Text>
        <View style={styles.estadoBadge}>
          <Text style={styles.estadoBadgeText}>{cotizacion.estado}</Text>
        </View>
      </View>

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

      <View style={styles.section}>
        <Text style={styles.fieldLabel}>Mano de obra</Text>
        <ClpMoneyInput
          value={manoObra}
          editable={editable}
          onChangeValue={(next) => onChange({ ...cotizacion, mano_obra_clp: next })}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.repuestosHeader}>
          <Text style={styles.fieldLabel}>Repuestos</Text>
          {editable ? (
            <TouchableOpacity style={styles.addBtn} onPress={agregarRepuesto}>
              <Plus size={16} color={I.primary} />
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {repuestos.length === 0 ? (
          <Text style={styles.emptyRepuestos}>Sin repuestos listados</Text>
        ) : (
          <>
            <View style={styles.gridHeaderRow}>
              <View style={styles.gridColCant}>
                <Text style={styles.colLabel}>Cant.</Text>
              </View>
              <View style={styles.gridColPrecio}>
                <Text style={styles.colLabel}>Precio unit.</Text>
              </View>
              <View style={styles.gridColSubtotal}>
                <Text style={[styles.colLabel, styles.colLabelRight]}>Subtotal</Text>
              </View>
            </View>

            {repuestos.map((rep, idx) => {
              const subtotal = subtotalRepuesto(rep);
              return (
                <View key={rep.id ?? `rep-${idx}`} style={styles.repuestoCard}>
                  <View style={styles.repuestoTopRow}>
                    <TextInput
                      style={styles.nombreInput}
                      editable={editable}
                      placeholder="Nombre del repuesto"
                      placeholderTextColor={I.mutedSoft}
                      value={rep.nombre}
                      onChangeText={(t) => actualizarRepuesto(idx, { nombre: t })}
                    />
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

                  <View style={styles.repuestoGrid}>
                    <View style={styles.gridColCant}>
                      {editable ? (
                        <TextInput
                          style={styles.cantidadInput}
                          keyboardType="numeric"
                          value={String(redondearCLP(rep.cantidad || 1))}
                          onChangeText={(t) =>
                            actualizarRepuesto(idx, {
                              cantidad: Math.max(1, parseInt(t.replace(/\D/g, ''), 10) || 1),
                            })
                          }
                        />
                      ) : (
                        <Text style={styles.colValue}>{redondearCLP(rep.cantidad || 1)}</Text>
                      )}
                    </View>

                    <View style={styles.gridColPrecio}>
                      <ClpMoneyInput
                        compact
                        value={redondearCLP(rep.precio_unitario_clp)}
                        editable={editable}
                        onChangeValue={(next) =>
                          actualizarRepuesto(idx, { precio_unitario_clp: next })
                        }
                      />
                    </View>

                    <View style={styles.gridColSubtotal}>
                      <Text style={styles.subtotalValue} numberOfLines={1}>
                        {formatearMontoCLP(subtotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Repuestos</Text>
          <Text style={styles.summaryAmount}>{formatearMontoCLP(totalRepuestos)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mano de obra</Text>
          <Text style={styles.summaryAmount}>{formatearMontoCLP(manoObra)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total estimado</Text>
          <Text style={styles.totalValue}>{formatearMontoCLP(totalCalculado)}</Text>
        </View>
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
    gap: SPACING.md,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  estadoBadge: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  estadoBadgeText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    textTransform: 'capitalize',
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
  section: { marginBottom: SPACING.xs },
  fieldLabel: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    marginBottom: SPACING.xs,
  },
  moneyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    minHeight: 44,
  },
  moneyInputRowCompact: {
    minHeight: 40,
    paddingHorizontal: SPACING.xs + 2,
  },
  moneyPrefix: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    marginRight: SPACING.xs,
  },
  moneyInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: SPACING.sm,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  moneyInputCompact: {
    paddingVertical: 8,
  },
  repuestosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontFamily: FF.sansSemiBold, fontSize: TYPOGRAPHY.fontSize.sm, color: I.primary },
  emptyRepuestos: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    fontStyle: 'italic',
  },
  repuestoCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  repuestoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  nombreInput: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.xs,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xs,
  },
  repuestoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  gridColCant: {
    width: 64,
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  gridColPrecio: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  gridColSubtotal: {
    width: 100,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  colLabel: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  colLabelRight: {
    textAlign: 'right',
    width: '100%',
  },
  cantidadInput: {
    width: '100%',
    minHeight: 40,
    textAlign: 'center',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 8,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  colValue: {
    minHeight: 40,
    textAlign: 'center',
    lineHeight: 40,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  subtotalValue: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: SPACING.xs,
    flexShrink: 0,
  },
  summaryBox: {
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
  },
  summaryAmount: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: I.hairline,
    marginVertical: SPACING.xs,
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
