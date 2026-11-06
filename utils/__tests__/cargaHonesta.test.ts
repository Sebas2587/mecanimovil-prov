import { consultaSinDatos, textoLista } from '@/utils/cargaHonesta';

describe('carga honesta', () => {
  it('no trata una consulta pendiente como vacía', () => {
    expect(consultaSinDatos({ isPending: true, isError: false, data: undefined })).toBe(true);
    expect(consultaSinDatos({ isPending: false, isError: false, data: [] })).toBe(false);
    expect(consultaSinDatos({ isPending: true, isError: true, data: undefined })).toBe(false);
  });

  it('muestra carga, luego el vacío real, y no esconde filas', () => {
    expect(textoLista(true, 0, 'Cargando lo que necesita tu atención.', 'Nada pendiente. Cuando entre una cotización o una aceptación, aparece aquí.'))
      .toBe('Cargando lo que necesita tu atención.');
    expect(textoLista(false, 0, 'Cargando la actividad reciente.', 'Todavía no hay cotizaciones en el taller.'))
      .toBe('Todavía no hay cotizaciones en el taller.');
    expect(textoLista(false, 3, 'Cargando.', 'Nada pendiente.')).toBeNull();
  });
});
