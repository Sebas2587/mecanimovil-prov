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

  it('un checklist pausado sigue en ejecución', () => {
    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'agendado',
      checklist_estado: 'PAUSADO',
    }).trabajo).toBe('En ejecución');
  });

  it('un checklist cancelado no se muestra como agendado', () => {
    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'agendado',
      checklist_estado: 'CANCELADO',
    }).trabajo).toBe('Cancelado');
  });

  it('si la lista omite el checklist no esconde la ejecución ni el cierre', () => {
    const enCurso = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
    });
    expect(enCurso.trabajo).toBe('En ejecución');

    const sinInstanciaNula = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: null,
    });
    expect(sinInstanciaNula.trabajo).toBe('En ejecución');

    const desconocido = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'EN_CURSO',
    });
    expect(desconocido.trabajo).toBe('En ejecución');

    const vacio = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: '  ',
    });
    expect(vacio.trabajo).toBe('En ejecución');

    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'completado',
    }).trabajo).toBe('Completado');

    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'cerrado',
    }).trabajo).toBe('Completado');

    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'cancelado',
    }).trabajo).toBe('Cancelado');

    expect(presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'nuevo',
    }).trabajo).toBe('Nuevo');
  });

  it('sin checklist y sin estado operativo no inventa ejecución', () => {
    expect(presentacionCitaTrabajo({ estado: 'activa' }).trabajo).toBe('Agendado');
  });

  it('la misma función con datos distintos no iguala firma y ejecución', () => {
    const listaResumida = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
    });
    const detalleConFirma = presentacionCitaTrabajo({
      estado: 'activa',
      estado_operativo: 'en_ejecucion',
      checklist_estado: 'PENDIENTE_FIRMA_CLIENTE',
    });
    expect(listaResumida.trabajo).toBe('En ejecución');
    expect(detalleConFirma.trabajo).toBe('Falta la firma');
    expect(listaResumida.trabajo).not.toBe(detalleConFirma.trabajo);
  });
});
