import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { AlertTriangle, Car, MapPin, Phone, Plus, Trash2, UserRound } from 'lucide-react-native';
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
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value > 0 ? formatMontoInputLocalized(value) : '',
  );

  // Solo sincroniza desde props cuando no se está escribiendo (evita borrar el monto a mitad de tipeo).
  useEffect(() => {
    if (focused) return;
    setDraft(value > 0 ? formatMontoInputLocalized(value) : '');
  }, [value, focused]);

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
        keyboardType="number-pad"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={institutionalInputPlaceholder}
        value={draft}
        onFocus={() => {
          setFocused(true);
          // Editar en dígitos crudos evita pelear con puntos de miles (es-CL).
          setDraft(value > 0 ? String(Math.round(value)) : '');
        }}
        onBlur={() => {
          const next = redondearCLP(parseMontoDecimal(draft));
          onChangeValue(next);
          setDraft(next > 0 ? formatMontoInputLocalized(next) : '');
          setFocused(false);
        }}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^\d]/g, '');
          setDraft(cleaned);
          onChangeValue(redondearCLP(parseMontoDecimal(cleaned)));
        }}
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
  const [nombreFocused, setNombreFocused] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(rep.nombre);

  useEffect(() => {
    if (nombreFocused) return;
    setNombreDraft(rep.nombre);
  }, [rep.nombre, nombreFocused]);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Nombre"
            value={nombreDraft}
            onChangeText={(t) => {
              setNombreDraft(t);
              onUpdate(index, { nombre: t });
            }}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => {
              setNombreFocused(false);
              onUpdate(index, { nombre: nombreDraft.trim() || rep.nombre });
            }}
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

      {rep.fuente_repuesto ? (
        <View style={styles.fuenteBadgeRow}>
          <InstitutionalTag
            label={`Origen: ${rep.fuente_repuesto}`}
            variant="info"
            size="sm"
          />
        </View>
      ) : null}

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
  /** Oculta título/servicio cuando el host (modal) ya los muestra. */
  compactHeader?: boolean;
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
  compactHeader = false,
}: CotizacionIaEditorProps) {
  const { width } = useWindowDimensions();
  const stackedFacts = width < 520;
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

  const kmMeta = cotizacion.metadata?.vehiculo_kilometraje_actual;
  const vehiculoTitulo = [
    cotizacion.vehiculo_marca,
    cotizacion.vehiculo_modelo,
    cotizacion.vehiculo_anio ? String(cotizacion.vehiculo_anio) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const factsVehiculo = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    if (cotizacion.vehiculo_patente) {
      rows.push({ label: 'Patente', value: cotizacion.vehiculo_patente.toUpperCase() });
    }
    if (cotizacion.vehiculo_cilindraje) {
      rows.push({ label: 'Cilindraje', value: cotizacion.vehiculo_cilindraje });
    }
    if (cotizacion.tipo_motor_label || cotizacion.tipo_motor) {
      rows.push({
        label: 'Motor',
        value: cotizacion.tipo_motor_label || cotizacion.tipo_motor,
      });
    }
    if (cotizacion.vehiculo_vin) {
      rows.push({ label: 'VIN', value: cotizacion.vehiculo_vin.toUpperCase() });
    }
    if (kmMeta != null && kmMeta > 0) {
      rows.push({
        label: 'Kilometraje',
        value: `${kmMeta.toLocaleString('es-CL')} km`,
      });
    }
    return rows;
  }, [
    cotizacion.tipo_motor,
    cotizacion.tipo_motor_label,
    cotizacion.vehiculo_cilindraje,
    cotizacion.vehiculo_patente,
    cotizacion.vehiculo_vin,
    kmMeta,
  ]);

  const showVehiculoCard =
    factsVehiculo.length > 0
    || Boolean(vehiculoTitulo)
    || Boolean(cotizacion.modalidad);
  const showClienteCard = Boolean(
    cotizacion.cliente_nombre
    || cotizacion.cliente_telefono
    || cotizacion.direccion_servicio
    || editable,
  );

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        {compactHeader ? (
          <View style={styles.headerTags}>
            {cotizacion.metadata?.origen === 'agente_ia' ? (
              <InstitutionalTag label="IA" variant="warning" size="sm" />
            ) : null}
            <InstitutionalTag
              label={cotizacion.estado}
              variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
              size="sm"
              uppercase
            />
            {cotizacion.modalidad ? (
              <InstitutionalTag
                label={cotizacion.modalidad === 'domicilio' ? 'Domicilio' : 'Taller'}
                variant="neutral"
                size="sm"
              />
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.headerText}>
              <InstitutionalText role="h4">Cotización</InstitutionalText>
              {cotizacion.servicio_nombre ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                  {cotizacion.servicio_nombre}
                </InstitutionalText>
              ) : null}
            </View>
            <View style={styles.headerTags}>
              {cotizacion.metadata?.origen === 'agente_ia' ? (
                <InstitutionalTag
                  label="Generada por IA — revisa antes de enviar"
                  variant="warning"
                  size="sm"
                />
              ) : null}
              <InstitutionalTag
                label={cotizacion.estado}
                variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
                size="sm"
              />
            </View>
          </>
        )}
      </View>

      {(showVehiculoCard || showClienteCard) ? (
        <View style={[styles.factsColumns, stackedFacts && styles.factsColumnsStacked]}>
          {showVehiculoCard ? (
            <Card elevated padding="host" style={[styles.factsColCard, !stackedFacts && styles.factsColHalf]}>
              <View style={styles.factsHeader}>
                <View style={hostIconPlateStyle}>
                  <Car size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.motorCopy}>
                  <InstitutionalText role="label" color="muted">
                    VEHÍCULO
                  </InstitutionalText>
                  <InstitutionalText role="h5" numberOfLines={2}>
                    {vehiculoTitulo || cotizacion.vehiculo_patente?.toUpperCase() || 'Sin datos'}
                  </InstitutionalText>
                </View>
              </View>
              {factsVehiculo.length > 0 ? (
                <View style={styles.factsGrid}>
                  {factsVehiculo.map((row) => (
                    <View key={row.label} style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        {row.label}
                      </InstitutionalText>
                      <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
                        {row.value}
                      </InstitutionalText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {showClienteCard ? (
            <Card elevated padding="host" style={[styles.factsColCard, !stackedFacts && styles.factsColHalf]}>
              <View style={styles.factsHeader}>
                <View style={hostIconPlateStyle}>
                  <UserRound size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.motorCopy}>
                  <InstitutionalText role="label" color="muted">
                    CLIENTE
                  </InstitutionalText>
                  <InstitutionalText role="h5" numberOfLines={1}>
                    {cotizacion.cliente_nombre || 'Sin nombre'}
                  </InstitutionalText>
                </View>
              </View>
              {editable ? (
                <View style={styles.contactBlock}>
                  <InstitutionalField
                    label="Nombre del cliente"
                    value={cotizacion.cliente_nombre || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, cliente_nombre: t })}
                    placeholder="Nombre"
                    editable={editable}
                  />
                  <InstitutionalField
                    label="Teléfono"
                    value={cotizacion.cliente_telefono || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, cliente_telefono: t })}
                    placeholder="+56 9 ..."
                    keyboardType="phone-pad"
                    editable={editable}
                  />
                  <InstitutionalField
                    label="Dirección de servicio"
                    value={cotizacion.direccion_servicio || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, direccion_servicio: t })}
                    placeholder="Calle, comuna"
                    editable={editable}
                    multiline
                  />
                </View>
              ) : (
                <View style={styles.factsGrid}>
                  {cotizacion.cliente_telefono ? (
                    <View style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        Teléfono
                      </InstitutionalText>
                      <View style={styles.factValueRow}>
                        <Phone size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <InstitutionalText role="captionBold" color="ink" numberOfLines={1}>
                          {cotizacion.cliente_telefono}
                        </InstitutionalText>
                      </View>
                    </View>
                  ) : null}
                  {cotizacion.direccion_servicio ? (
                    <View style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        Dirección
                      </InstitutionalText>
                      <View style={styles.factValueRow}>
                        <MapPin size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
                          {cotizacion.direccion_servicio}
                        </InstitutionalText>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          ) : null}
        </View>
      ) : null}

      {cotizacion.descripcion_problema || cotizacion.aviso_motor ? (
        <Card elevated padding="host" style={styles.factsColCard}>
          {cotizacion.descripcion_problema ? (
            <View style={styles.problemaBox}>
              <InstitutionalText role="label" color="muted">
                PROBLEMA / SERVICIO
              </InstitutionalText>
              <InstitutionalText role="caption" color="body">
                {cotizacion.descripcion_problema}
              </InstitutionalText>
            </View>
          ) : null}
          {cotizacion.aviso_motor ? (
            <View style={[styles.warningBox, cotizacion.descripcion_problema ? styles.warningAfterProblema : null]}>
              <AlertTriangle size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="caption" color="body" style={styles.warningText}>
                {cotizacion.aviso_motor}
              </InstitutionalText>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card elevated padding="host" style={styles.sectionCard}>
        <InstitutionalSectionHeader title="Mano de obra (IVA incl.)" />
        <ClpMoneyInput
          value={manoObra}
          editable={editable}
          onChangeValue={(next) => onChange({ ...cotizacion, mano_obra_clp: next })}
        />
        <InstitutionalText role="caption" color="muted">
          Monto final al cliente con IVA 19% incluido.
          {cotizacion.metadata?.valores_estimativos || cotizacion.metadata?.precio_parcial_catalogo
            ? ' Valor estimativo precargado (catálogo / histórico / mercado): edítalo si hace falta.'
            : ''}
        </InstitutionalText>
      </Card>

      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Repuestos (IVA incl.)"
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
            Repuestos (IVA incl.)
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(totalRepuestos)}
          </InstitutionalText>
        </View>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Mano de obra (IVA incl.)
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(manoObra)}
          </InstitutionalText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <InstitutionalText role="h5" color="ink">
            Total estimado (IVA incluido)
          </InstitutionalText>
          <InstitutionalText role="numberDisplay" color="ink" style={styles.totalValue}>
            {formatearMontoCLP(totalCalculado)}
          </InstitutionalText>
        </View>
        <InstitutionalText role="caption" color="muted">
          No se suma IVA adicional: los montos ya son finales al cliente.
        </InstitutionalText>
      </Card>

      <Card elevated padding="host" style={styles.sectionCard}>
        <InstitutionalSectionHeader title="Notas de cotización" />
        <InstitutionalField
          label="Las genera el agente según el servicio; puedes editarlas"
          value={cotizacion.notas_internas || ''}
          onChangeText={(t) => onChange({ ...cotizacion, notas_internas: t })}
          placeholder={'1. Síntoma…\n2. Servicio propuesto…\n3. Consideraciones…'}
          editable={editable}
          multiline
        />
      </Card>

      {cotizacion.estado === 'borrador' ? (
        <Card elevated padding="host" style={styles.readinessCard}>
          {cotizacion.listo_para_enviar ? (
            <InstitutionalText role="captionBold" color="ink">
              Lista para enviar — revisa y envía al cliente con un clic.
            </InstitutionalText>
          ) : (cotizacion.pendientes_revision?.length ?? 0) > 0 ? (
            <View style={styles.advertenciasBox}>
              <InstitutionalText role="captionBold" color="ink">
                Pendiente antes de enviar
              </InstitutionalText>
              {(cotizacion.pendientes_revision || []).map((pend, i) => (
                <InstitutionalText key={`pend-${i}`} role="small" color="muted">
                  • {pend}
                </InstitutionalText>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {cotizacion.advertencias?.length ? (
        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="Alertas del sistema" />
          <View style={styles.advertenciasBox}>
            {cotizacion.advertencias.map((adv, i) => (
              <InstitutionalText key={`adv-${i}`} role="small" color="muted">
                • {adv}
              </InstitutionalText>
            ))}
          </View>
        </Card>
      ) : null}

      {(editable && (onEnviar || onGuardarPlantilla))
        || (cotizacion.estado === 'enviada' && onMarcarAceptada) ? (
        <View style={styles.actionsFooter}>
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
              variant="outline"
              onPress={onGuardarPlantilla}
              loading={guardandoPlantilla}
              disabled={guardandoPlantilla}
            />
          ) : null}
          {cotizacion.estado === 'enviada' && onMarcarAceptada ? (
            <InstitutionalButton
              label="Cliente aceptó (manual)"
              variant="success"
              onPress={onMarcarAceptada}
            />
          ) : null}
        </View>
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
  headerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, alignItems: 'center' },
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
  readinessCard: { gap: SPACING.fixed.xs },
  factsColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  factsColumnsStacked: {
    flexDirection: 'column',
  },
  factsColCard: {
    gap: SPACING.fixed.sm,
  },
  factsColHalf: {
    flex: 1,
    minWidth: 0,
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  factsGrid: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  factValue: {
    flex: 1,
    textAlign: 'right',
  },
  factValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
  contactBlock: {
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  problemaBox: {
    gap: 4,
  },
  warningAfterProblema: {
    marginTop: SPACING.fixed.xs,
  },
  fuenteBadgeRow: {
    marginBottom: SPACING.fixed.xs,
    alignSelf: 'flex-start',
  },
  actionsFooter: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
});

export default CotizacionIaEditor;
