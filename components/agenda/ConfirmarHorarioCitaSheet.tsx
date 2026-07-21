import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import {
  obtenerDiasDisponiblesAgenda,
  obtenerDisponibilidadConDuracion,
} from '@/services/disponibilidadProveedorService';
import { agendaProveedorService, type CitaAgendaPersonal } from '@/services/agendaProveedorService';
import { calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
import { parseReferenciaDate } from '@/utils/fechaLocal';
import { showAlert } from '@/utils/platformAlert';

type Props = {
  visible: boolean;
  onClose: () => void;
  cita: CitaAgendaPersonal | null;
  /** Técnico ya asignado; null = agenda del taller (automático / sin equipo). */
  miembroTallerId?: number | null;
  onConfirmado?: (cita: CitaAgendaPersonal) => void;
};

export function ConfirmarHorarioCitaSheet({
  visible,
  onClose,
  cita,
  miembroTallerId,
  onConfirmado,
}: Props) {
  const modalidadApi = useMemo(
    () => (cita?.tipo_servicio === 'domicilio' ? 'a_domicilio' as const : 'en_taller' as const),
    [cita?.tipo_servicio],
  );
  const ofertaId = cita?.detalle?.oferta_servicio_id ?? undefined;
  const miembroId = miembroTallerId !== undefined ? miembroTallerId : cita?.miembro_taller;

  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(),
  );
  const [fechasDisponibles, setFechasDisponibles] = useState<string[] | null>(null);
  const [horasDisponibles, setHorasDisponibles] = useState<string[] | null>(null);
  const [slotsFinPorHora, setSlotsFinPorHora] = useState<Record<string, string>>({});
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [mensajeSinFechas, setMensajeSinFechas] = useState<string | undefined>();
  const [mensajeSinHoras, setMensajeSinHoras] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !cita) return;
    setFechaHora(
      resolveInitialPickerValue(
        undefined,
        undefined,
        cita.duracion_minutos ?? 60,
      ),
    );
    setFechasDisponibles(null);
    setHorasDisponibles(null);
    setSlotsFinPorHora({});
    setMensajeSinFechas(undefined);
    setMensajeSinHoras(undefined);
  }, [visible, cita?.id, miembroId]);

  useEffect(() => {
    if (!visible || !cita) return;
    let cancelled = false;
    setCargandoFechas(true);
    setMensajeSinFechas(undefined);
    obtenerDiasDisponiblesAgenda({
      ofertaServicioId: ofertaId,
      modalidad: modalidadApi,
      miembroTallerId: miembroId ?? undefined,
      dias: 21,
    })
      .then((data) => {
        if (cancelled) return;
        const fechas = [...(data.fechas_disponibles ?? [])].sort();
        setFechasDisponibles(fechas);
        setMensajeSinFechas(
          fechas.length > 0
            ? undefined
            : miembroId
              ? 'Este técnico no tiene fechas disponibles. Revisa su agenda en Horarios.'
              : 'No hay fechas disponibles según la agenda configurada.',
        );
        if (fechas.length > 0) {
          setFechaHora((prev) => ({
            ...prev,
            fecha: parseReferenciaDate(fechas[0]),
            hora: null,
            horaFin: null,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFechasDisponibles([]);
          setMensajeSinFechas('No se pudieron cargar las fechas disponibles.');
        }
      })
      .finally(() => {
        if (!cancelled) setCargandoFechas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, cita?.id, modalidadApi, ofertaId, miembroId]);

  useEffect(() => {
    if (!visible || !cita) return;
    if (cargandoFechas || fechasDisponibles === null) {
      setHorasDisponibles(null);
      return;
    }
    if (fechasDisponibles.length === 0) {
      setHorasDisponibles([]);
      setMensajeSinHoras('No hay horarios disponibles.');
      return;
    }
    const fechaKey = formatDateApi(fechaHora.fecha);
    if (!fechasDisponibles.includes(fechaKey)) {
      setHorasDisponibles([]);
      setMensajeSinHoras('Selecciona una fecha disponible.');
      return;
    }

    let cancelled = false;
    setCargandoHoras(true);
    setMensajeSinHoras(undefined);
    obtenerDisponibilidadConDuracion({
      fecha: fechaKey,
      ofertaServicioId: ofertaId,
      modalidad: modalidadApi,
      miembroTallerId: miembroId ?? undefined,
    })
      .then((data) => {
        if (cancelled) return;
        const finPorHora: Record<string, string> = {};
        const horas = (data.slots_disponibles ?? [])
          .map((slot) => {
            if (slot.hora && slot.hora_fin_estimada) {
              finPorHora[slot.hora] = slot.hora_fin_estimada;
            }
            return slot.hora;
          })
          .filter((h): h is string => Boolean(h));
        setSlotsFinPorHora(finPorHora);
        setHorasDisponibles(horas);
        setMensajeSinHoras(
          horas.length > 0
            ? undefined
            : (data.mensaje || 'No hay horarios disponibles para esta fecha.'),
        );
        setFechaHora((prev) => {
          if (prev.hora && horas.includes(prev.hora)) {
            const fin = finPorHora[prev.hora];
            return fin && prev.horaFin !== fin ? { ...prev, horaFin: fin } : prev;
          }
          const nextHora = horas[0] ?? null;
          return {
            ...prev,
            hora: nextHora,
            horaFin: nextHora ? finPorHora[nextHora] ?? null : null,
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setHorasDisponibles([]);
          setMensajeSinHoras('No se pudieron cargar los horarios.');
        }
      })
      .finally(() => {
        if (!cancelled) setCargandoHoras(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    visible,
    cita?.id,
    fechaHora.fecha,
    fechasDisponibles,
    cargandoFechas,
    modalidadApi,
    ofertaId,
    miembroId,
  ]);

  useEffect(() => {
    if (!fechaHora.hora) return;
    const fin = slotsFinPorHora[fechaHora.hora];
    if (fin && fechaHora.horaFin !== fin) {
      setFechaHora((prev) => ({ ...prev, horaFin: fin }));
    }
  }, [fechaHora.hora, fechaHora.horaFin, slotsFinPorHora]);

  const confirmar = useCallback(async () => {
    if (!cita) return;
    if (!fechaHora.hora || !fechaHora.horaFin) {
      showAlert('Horario', 'Selecciona hora de inicio y término.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fecha_servicio: formatDateApi(fechaHora.fecha),
        hora_servicio: `${fechaHora.hora}:00`,
        duracion_minutos: calcularDuracionMinutos(fechaHora.hora, fechaHora.horaFin),
        tipo_servicio: cita.tipo_servicio,
        miembro_taller: miembroId ?? null,
        detalle: {
          cliente_nombre: cita.detalle.cliente_nombre,
          cliente_telefono: cita.detalle.cliente_telefono,
          vehiculo_marca: cita.detalle.vehiculo_marca,
          vehiculo_modelo: cita.detalle.vehiculo_modelo,
          vehiculo_patente: cita.detalle.vehiculo_patente,
          servicio_nombre: cita.detalle.servicio_nombre || cita.detalle.servicio_nombre_resuelto,
          descripcion: cita.detalle.descripcion,
          direccion: cita.detalle.direccion,
          precio_referencia: cita.detalle.precio_referencia,
          oferta_servicio_id: cita.detalle.oferta_servicio_id,
        },
      };
      const validacion = await agendaProveedorService.validarSlot({
        ...payload,
        excluir_cita_id: cita.id,
      });
      if (!validacion.success || !validacion.data?.valido) {
        showAlert(
          'Horario no disponible',
          validacion.data?.error || validacion.message || 'Elige otro horario.',
        );
        return;
      }
      const res = await agendaProveedorService.actualizarCita(cita.id, payload);
      if (!res.success || !res.data) {
        showAlert('Error', res.message || 'No se pudo confirmar el horario.');
        return;
      }
      onConfirmado?.(res.data);
      onClose();
    } catch {
      showAlert('Error', 'No se pudo confirmar el horario.');
    } finally {
      setSaving(false);
    }
  }, [cita, fechaHora, miembroId, onClose, onConfirmado]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.wrap}>
        <InstitutionalText role="h4">Confirmar horario</InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          {miembroId
            ? 'Paso 2 de 2: elige día y hora según la agenda del técnico asignado.'
            : 'Paso 2 de 2: elige día y hora según la agenda del taller (asignación automática).'}
        </InstitutionalText>

        {cargandoFechas && fechasDisponibles === null ? (
          <ActivityIndicator color={COLORS.institutional.primary} style={styles.loader} />
        ) : (
          <CatalogoFechaHoraPickers
            value={fechaHora}
            onChange={setFechaHora}
            modo="rango"
            fechasDisponibles={fechasDisponibles}
            horasDisponibles={horasDisponibles}
            cargandoFechas={cargandoFechas}
            cargandoHoras={cargandoHoras}
            mensajeSinFechas={mensajeSinFechas}
            mensajeSinHoras={mensajeSinHoras}
          />
        )}

        <InstitutionalButton
          label={saving ? 'Guardando…' : 'Agendar cita'}
          onPress={() => void confirmar()}
          loading={saving}
          disabled={saving || !fechaHora.hora || !fechaHora.horaFin}
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
});
