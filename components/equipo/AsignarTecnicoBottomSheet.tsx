import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/design-system/components/InstitutionalTag';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import equipoTallerService, {
  etiquetaModalidadMecanico,
  type MiembroTaller,
} from '@/services/equipoTallerService';
import { agendaProveedorService } from '@/services/agendaProveedorService';
import api from '@/services/api';
import { showAlert } from '@/utils/platformAlert';

export type AsignarTecnicoTarget =
  | { tipo: 'cita_personal'; citaId: number; miembroActualId?: number | null }
  | { tipo: 'orden'; ordenId: number; miembroActualId?: number | null }
  | { tipo: 'oferta'; ofertaId: string; miembroActualId?: number | null };

type Props = {
  visible: boolean;
  onClose: () => void;
  target: AsignarTecnicoTarget | null;
  /** miembroTallerId asignado; null = automático / sin técnico fijo. */
  onAsignado?: (miembroTallerId: number | null) => void;
};

export function AsignarTecnicoBottomSheet({ visible, onClose, target, onAsignado }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [miembros, setMiembros] = useState<MiembroTaller[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null | 'auto'>(null);

  useEffect(() => {
    if (!visible) return;
    setSeleccionado(target?.miembroActualId ?? 'auto');
    setLoading(true);
    equipoTallerService
      .listar()
      .then((lista) => setMiembros(lista.filter((m) => m.rol === 'mecanico' && m.activo)))
      .catch(() => setMiembros([]))
      .finally(() => setLoading(false));
  }, [visible, target?.miembroActualId]);

  const titulo = useMemo(() => {
    if (!target) return 'Asignar técnico';
    return target.miembroActualId ? 'Reasignar técnico' : 'Asignar técnico';
  }, [target]);

  const confirmar = useCallback(async () => {
    if (!target) return;
    setSaving(true);
    try {
      const miembroId = seleccionado === 'auto' ? null : seleccionado;

      if (target.tipo === 'cita_personal') {
        await agendaProveedorService.asignarMecanico(target.citaId, miembroId);
      } else if (target.tipo === 'orden') {
        await api.post(`/ordenes/proveedor-ordenes/${target.ordenId}/asignar-mecanico/`, {
          miembro_taller_id: miembroId,
        });
      } else {
        await api.post(`/ordenes/ofertas/${target.ofertaId}/asignar-mecanico/`, {
          miembro_taller_id: miembroId,
        });
      }

      onAsignado?.(miembroId);
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'No se pudo asignar el técnico';
      showAlert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [onAsignado, onClose, seleccionado, target]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.wrap}>
        <InstitutionalText role="h4">{titulo}</InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          Elige un técnico del equipo o deja en automático para que el sistema asigne.
        </InstitutionalText>

        {loading ? (
          <ActivityIndicator color={COLORS.institutional.primary} style={styles.loader} />
        ) : (
          <View style={styles.list}>
            <TouchableOpacity
              style={[styles.row, seleccionado === 'auto' && styles.rowSelected]}
              onPress={() => setSeleccionado('auto')}
            >
              <InstitutionalText role="bodyBold">Automático</InstitutionalText>
              <InstitutionalText role="caption" color="muted">
                Mejor técnico disponible según especialidad y horario
              </InstitutionalText>
            </TouchableOpacity>

            {miembros.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.row, seleccionado === m.id && styles.rowSelected]}
                onPress={() => setSeleccionado(m.id)}
              >
                <View style={styles.rowHeader}>
                  <InstitutionalText role="bodyBold">{m.nombre}</InstitutionalText>
                  <InstitutionalTag
                    label={etiquetaModalidadMecanico(m)}
                    variant="neutral"
                    size="sm"
                  />
                </View>
                {m.especialidades_detalle?.length ? (
                  <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                    {m.especialidades_detalle.map((e) => e.nombre).join(' · ')}
                  </InstitutionalText>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <InstitutionalButton
          label={saving ? 'Guardando…' : 'Confirmar'}
          onPress={() => void confirmar()}
          loading={saving}
          disabled={loading || seleccionado === null}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  loader: {
    marginVertical: SPACING.lg,
  },
  list: {
    gap: SPACING.sm,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.institutional.hairline,
    borderRadius: 12,
    padding: SPACING.md,
    gap: 4,
    backgroundColor: COLORS.background.paper,
  },
  rowSelected: {
    borderColor: COLORS.institutional.primary,
    backgroundColor: COLORS.institutional.surfaceStrong,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
});
