import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { Card } from '@/app/design-system/components';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import type { ManoObraLinea } from '@/services/cotizacionCanalService';
import { MAX_MANO_OBRA_LINEAS } from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';
import { showConfirm } from '@/utils/platformAlert';
import { estilosPartes as styles } from '@/components/cotizacion/editor/estilosPartesEditor';

const I = COLORS.institutional;

const ManoObraLineaRow = React.memo(function ManoObraLineaRow({
  line,
  index,
  editable,
  onUpdate,
  onDelete,
}: {
  line: ManoObraLinea;
  index: number;
  editable: boolean;
  onUpdate: (index: number, patch: Partial<ManoObraLinea>) => void;
  onDelete: (index: number) => void;
}) {
  const nombreGuardado = (line.nombre || '').trim();
  const [nombreFocused, setNombreFocused] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(nombreGuardado);

  useEffect(() => {
    if (nombreFocused) return;
    setNombreDraft(nombreGuardado);
  }, [nombreGuardado, nombreFocused]);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Trabajo"
            value={nombreDraft}
            onChangeText={(t) => {
              setNombreDraft(t);
              onUpdate(index, { nombre: t });
            }}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => {
              const next = nombreDraft.trim();
              onUpdate(index, { nombre: next });
              setNombreDraft(next);
              setNombreFocused(false);
            }}
            placeholder="Ej. Diagnóstico, cambio de pastillas"
            editable={editable}
          />
        </View>
        {editable ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => showConfirm(
              'Eliminar mano de obra',
              'Se quita de esta cotización. Cancelar lo deja como está.',
              { confirmText: 'Eliminar', cancelText: 'Cancelar', onConfirm: () => onDelete(index) },
            )}
            accessibilityRole="button"
            accessibilityLabel="Eliminar mano de obra"
            hitSlop={8}
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View>
        <InstitutionalText role="label" color="muted" style={styles.colLabel}>
          Precio
        </InstitutionalText>
        <ClpMoneyInput
          value={redondearCLP(line.monto_clp)}
          editable={editable}
          onChangeValue={(next) => onUpdate(index, { monto_clp: next })}
        />
      </View>
    </Card>
  );
});


export function CotizacionEditorManoObra({
  lineasMo,
  editable,
  valoresEstimados,
  onUpdate,
  onDelete,
}: {
  lineasMo: ManoObraLinea[];
  editable: boolean;
  valoresEstimados: boolean;
  onUpdate: (index: number, patch: Partial<ManoObraLinea>) => void;
  onDelete: (index: number) => void;
}) {
  return (
      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Mano de obra"
          count={lineasMo.length > 0 ? lineasMo.length : undefined}
        />
        <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
          Precio final al cliente (el IVA se desglosa en el resumen).
          {valoresEstimados ? ' Valores estimados: confirma precios y marcas antes de enviar.' : ''}
        </InstitutionalText>
        {lineasMo.length >= MAX_MANO_OBRA_LINEAS ? (
          <InstitutionalText role="caption" color="muted">
            Máximo {MAX_MANO_OBRA_LINEAS} líneas de mano de obra.
          </InstitutionalText>
        ) : null}
        {lineasMo.length === 0 ? (
          <Card elevated padding="host" style={styles.emptyRepuestos}>
            <InstitutionalText role="caption" color="muted">
              Sin líneas de trabajo
            </InstitutionalText>
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {lineasMo.map((line, idx) => (
              <ManoObraLineaRow
                key={line.id ?? `mo-${idx}`}
                line={line}
                index={idx}
                editable={editable}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </View>
        )}
      </View>
  );
}
