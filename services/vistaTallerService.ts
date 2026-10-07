import api from './api';

export type AmbitoLimpiezaTaller =
  | 'cotizaciones_rechazadas'
  | 'cotizaciones_terminadas'
  | 'servicios_completados'
  | 'servicios_rechazados';

export type TipoFichaTaller = 'cotizacion' | 'cita' | 'orden' | 'oferta';

export async function limpiarVistaTaller(ambito: AmbitoLimpiezaTaller): Promise<number> {
  const response = await api.post('/ordenes/vista-taller/limpiar/', { ambito });
  return Number(response.data?.ocultos || 0);
}

export async function ocultarFichaTaller(tipo: TipoFichaTaller, id: number | string): Promise<number> {
  const response = await api.post('/ordenes/vista-taller/ocultar/', { tipo, id });
  return Number(response.data?.ocultos || 0);
}
