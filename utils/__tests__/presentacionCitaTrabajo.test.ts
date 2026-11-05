import { cobroVisiblePipeline } from '@/utils/cobroTrabajo';
import {
  lecturaCitaListaYDetalle,
  presentacionCitaTrabajo,
} from '@/utils/presentacionCitaTrabajo';

describe('presentacionCitaTrabajo', () => {
  it('no llama en ejecución a una cita que espera la firma', () => {
    const cita = {
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'PENDIENTE_FIRMA_CLIENTE',
      muestraDocumentoComercial: true,
    };
    const lectura = lecturaCitaListaYDetalle(cita);
    expect(lectura.lista).toBe('Falta la firma');
    expect(lectura.detalle).toBe(lectura.lista);
    expect(lectura.documentoVisible).toBe(true);
    expect(lectura.trabajoVisibleConDocumento).toBe(true);
    expect(lectura.explicacion).toMatch(/firme/i);
    expect(cobroVisiblePipeline({ tipo_entidad: 'cita_personal', estado: 'activa' }).etiqueta)
      .toBe('Pago sin información');
  });

  it('muestra en ejecución cuando el checklist está en curso', () => {
    const cita = {
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'EN_PROGRESO',
      muestraDocumentoComercial: true,
    };
    const lectura = lecturaCitaListaYDetalle(cita);
    expect(lectura.lista).toBe('En ejecución');
    expect(lectura.detalle).toBe('En ejecución');
    expect(lectura.fase).not.toBe('falta_firma');
  });

  it('no inventa ejecución si el checklist no empezó', () => {
    const presentacion = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'PENDIENTE',
    });
    expect(presentacion.trabajo).toBe('Agendado');
    expect(presentacion.fase).toBe('agendado');
  });

  it('horario por confirmar gana sobre un estado operativo de ejecución', () => {
    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      horario_por_confirmar: true,
      checklist_estado: null,
    }).trabajo).toBe('Horario por confirmar');
  });

  it('alineá lista y detalle en completadas y canceladas', () => {
    const cerrada = lecturaCitaListaYDetalle({
      estado: 'cerrada',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'EN_PROGRESO',
    });
    expect(cerrada.lista).toBe('Completado');
    expect(cerrada.detalle).toBe('Completado');

    const checklistListo = lecturaCitaListaYDetalle({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'COMPLETADO',
    });
    expect(checklistListo.lista).toBe('Completado');
    expect(checklistListo.detalle).toBe(checklistListo.lista);

    const cancelada = lecturaCitaListaYDetalle({
      estado: 'cancelada',
      estado_operativo: 'en_ejecucion',
    });
    expect(cancelada.lista).toBe('Cancelado');
    expect(cancelada.detalle).toBe('Cancelado');
  });

  it('la revisión del taller no se muestra como ejecución', () => {
    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'PENDIENTE_FIRMA_SUPERVISOR',
    }).trabajo).toBe('Falta la revisión');
  });
});
