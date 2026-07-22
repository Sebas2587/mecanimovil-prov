import type { Router } from 'expo-router';
import type { CanalServiciosCompletados, MesServiciosCompletados } from '@/utils/serviciosCompletadosFiltro';

type OpcionesNavegacion = {
  canal?: CanalServiciosCompletados;
  mes?: MesServiciosCompletados;
};

export function navegarServiciosCompletados(router: Router, opts: OpcionesNavegacion = {}) {
  const canal = opts.canal ?? 'todos';
  const params: Record<string, string> = { tab: 'completadas' };
  if (canal !== 'todos') params.canal = canal;
  if (opts.mes === 'actual') params.mes = 'actual';

  router.push({
    pathname: '/(tabs)/ordenes',
    params,
  });
}
