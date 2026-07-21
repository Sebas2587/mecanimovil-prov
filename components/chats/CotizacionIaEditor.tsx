import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { AlertTriangle, Fuel, Plus, Trash2 } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { Card } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
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
const T = TYPOGRAPHY.styles;

function subtotalRepuesto(rep: RepuestoCotizacion): number {
  return redondearCLP(redondearCLP(rep.cantidad || 1) * redondearCLP(rep.precio_unitario_clp));
}

const ESTADO_VARIANT: Record<
  CotizacionCanal['estado'],
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  borrador: 'neutral',
  enviada: 'info',
  aceptada: 'success',
  rechazada: 'error',
  expirada: 'warning',
  cancelada: 'error',
};

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
    <View
      style={[
        institutionalInputStyles.inputRow,
        compact && styles.moneyRowCompact,
      ]}
    >
      <InstitutionalText role="body" color="muted" style={institutionalInputStyles.inputRowPrefix}>
        $
      </InstitutionalText>
      <TextInput
        style={[
          institutionalInputStyles.inputRowField,
          institutionalInputStyles.inputMono,
          compact && institutionalInputStyles.inputCompact,
        ]}
        keyboardType="numeric"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={institutionalInputPlaceholder}
        value={display}
        onChangeText={(t) => onChangeValue(redondearCLP(parseMontoDecimal(t)))}
      />
    </View>
  );
}

const RepuestoRow = React.memo(function RepuestoRow({
  rep,
  index,
  editable,
  onUpdate,
  onDelete,
}: {
  rep: RepuestoCotizacion;
  index: number;
  editable: boolean;
  onUpdate: (index: number, patch: Partial<RepuestoCotizacion>) => void;
  onDelete: (index: number) => void;
}) {
  const subtotal = subtotalRepuesto(rep);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Nombre"
            value={rep.nombre}
            onChangeText={(t) => onUpdate(index, { nombre: t })}
            placeholder="Nombre del repuesto"
            editable={editable}
          />
        </View>
        {editable ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(index)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar repuesto"
            hitSlop={8}
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.repuestoGrid}>
        <View style={styles.gridColCant}>
          <InstitutionalField
            label="Cant."
            compact
            mono
            value={String(redondearCLP(rep.cantidad || 1))}
            onChangeText={(t) =>
              onUpdate(index, {
                cantidad: Math.max(1, parseInt(t.replace(/\D/g, ''), 10) || 1),
              })
            }
            keyboardType="numeric"
            editable={editable}
            inputStyle={styles.cantidadAlign}
          />
        </View>

        <View style={styles.gridColPrecio}>
          <InstitutionalText role="label" color="muted" style={styles.colLabel}>
            Precio unit.
          </InstitutionalText>
          <ClpMoneyInput
            compact
            value={redondearCLP(rep.precio_unitario_clp)}
            editable={editable}
            onChangeValue={(next) => onUpdate(index, { precio_unitario_clp: next })}
          />
        </View>

        <View style={styles.gridColSubtotal}>
          <InstitutionalText role="label" color="muted" style={[styles.colLabel, styles.colLabelRight]}>
            Subtotal
          </InstitutionalText>
          <InstitutionalText role="numberDisplay" color="ink" style={styles.subtotalValue} numberOfLines={1}>
            {formatearMontoCLP(subtotal)}
          </InstitutionalText>
        </View>
      </View>
    </Card>
  );
});

interface CotizacionIaEditorProps {
  cotizacion: CotizacionCanal;
  onChange: (next: CotizacionCanal) => void;
  onEnviar?: () => void;
  onGuardarPlantilla?: () => void;
  onMarcarAceptada?: () => void;
  enviarLabel?: string;
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
  enviarLabel = 'Enviar cotización al cliente',
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
        <View style={styles.headerText}>
          <InstitutionalText role="h4">Cotización</InstitutionalText>
          {cotizacion.servicio_nombre ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={2}>
              {cotizacion.servicio_nombre}
            </InstitutionalText>
          ) : null}
        </View>
        <InstitutionalTag
          label={cotizacion.estado}
          variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
          size="sm"
        />
      </View>

      {cotizacion.tipo_motor_label || cotizacion.aviso_motor ? (
        <Card elevated padding="host" style={styles.motorCard}>
          <View style={styles.motorHeader}>
            <View style={hostIconPlateStyle}>
              <Fuel size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.motorCopy}>
              <InstitutionalText role="label" color="muted">
                MOTOR
              </InstitutionalText>
              {cotizacion.tipo_motor_label ? (
                <InstitutionalText role="h4" numberOfLines={2}>
                  {cotizacion.tipo_motor_label}
                </InstitutionalText>
              ) : (
                <InstitutionalText role="h5" color="muted">
                  Sin tipo de motor
                </InstitutionalText>
              )}
            </View>
            {cotizacion.tipo_motor ? (
              <InstitutionalTag
                label={cotizacion.tipo_motor}
                variant="primary"
                size="sm"
                uppercase
              />
            ) : null}
          </View>
          {cotizacion.aviso_motor ? (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="caption" color="body" style={styles.warningText}>
                {cotizacion.aviso_motor}
              </InstitutionalText>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card elevated padding="host" style={styles.sectionCard}>
        <InstitutionalSectionHeader title="Mano de obra" />
        <ClpMoneyInput
          value={manoObra}
          editable={editable}
          onChangeValue={(next) => onChange({ ...cotizacion, mano_obra_clp: next })}
        />
      </Card>

      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Repuestos"
          count={repuestos.length > 0 ? repuestos.length : undefined}
          actionLabel={editable ? 'Agregar' : undefined}
          onActionPress={editable ? agregarRepuesto : undefined}
        />

        {repuestos.length === 0 ? (
          <Card
            elevated
            padding="host"
            style={styles.emptyRepuestos}
            onPress={editable ? agregarRepuesto : undefined}
          >
            <InstitutionalText role="caption" color="muted">
              Sin repuestos listados
            </InstitutionalText>
            {editable ? (
              <View style={styles.emptyAdd}>
                <Plus size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary">
                  Agregar repuesto
                </InstitutionalText>
              </View>
            ) : null}
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {repuestos.map((rep, idx) => (
              <RepuestoRow
                key={rep.id ?? `rep-${idx}`}
                rep={rep}
                index={idx}
                editable={editable}
                onUpdate={actualizarRepuesto}
                onDelete={eliminarRepuesto}
              />
            ))}
          </View>
        )}
      </View>

      <Card elevated padding="host" style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Repuestos
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(totalRepuestos)}
          </InstitutionalText>
        </View>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Mano de obra
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(manoObra)}
          </InstitutionalText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <InstitutionalText role="h5" color="ink">
            Total estimado
          </InstitutionalText>
          <InstitutionalText role="numberDisplay" color="ink" style={styles.totalValue}>
            {formatearMontoCLP(totalCalculado)}
          </InstitutionalText>
        </View>
      </Card>

      {cotizacion.advertencias?.length ? (
        <View style={styles.advertenciasBox}>
          {cotizacion.advertencias.map((adv, i) => (
            <InstitutionalText key={`adv-${i}`} role="small" color="muted">
              • {adv}
            </InstitutionalText>
          ))}
        </View>
      ) : null}

      {editable && onEnviar ? (
        <InstitutionalButton
          label={enviarLabel}
          onPress={onEnviar}
          loading={enviando}
          disabled={enviando}
        />
      ) : null}

      {editable && onGuardarPlantilla ? (
        <InstitutionalButton
          label="Guardar como plantilla"
          variant="secondary"
          onPress={onGuardarPlantilla}
          loading={guardandoPlantilla}
          disabled={guardandoPlantilla}
        />
      ) : null}

      {cotizacion.estado === 'enviada' && onMarcarAceptada ? (
        <InstitutionalButton
          label="Cliente aceptó (manual)"
          variant="secondary"
          onPress={onMarcarAceptada}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  motorCard: { gap: SPACING.fixed.sm },
  motorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  motorCopy: { flex: 1, minWidth: 0, gap: 2 },
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.accentYellow, 0.1),
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
  },
  warningText: { flex: 1 },
  section: { gap: SPACING.fixed.sm },
  sectionCard: { gap: SPACING.fixed.sm },
  moneyRowCompact: {
    minHeight: 44,
    paddingVertical: 0,
  },
  emptyRepuestos: {
    gap: SPACING.fixed.sm,
    alignItems: 'flex-start',
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  repuestosList: {
    gap: SPACING.fixed.sm,
  },
  repuestoCard: {
    gap: SPACING.fixed.sm,
  },
  repuestoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
  nombreField: { flex: 1, minWidth: 0 },
  repuestoGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    gap: SPACING.fixed.sm,
  },
  gridColCant: {
    width: 72,
    flexShrink: 0,
  },
  gridColPrecio: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  gridColSubtotal: {
    width: 104,
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: SPACING.fixed.xxs,
  },
  colLabel: {
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  colLabelRight: {
    textAlign: 'right',
    width: '100%',
  },
  cantidadAlign: {
    textAlign: 'center',
  },
  subtotalValue: {
    minHeight: 44,
    textAlign: 'right',
    textAlignVertical: 'center',
    lineHeight: 44,
  },
  deleteBtn: {
    padding: SPACING.fixed.xs,
    flexShrink: 0,
    marginTop: SPACING.fixed.lg,
  },
  summaryBox: {
    gap: SPACING.fixed.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
  totalValue: {
    fontSize: T.h3.fontSize,
  },
  advertenciasBox: { gap: 4 },
});

export default CotizacionIaEditor;
