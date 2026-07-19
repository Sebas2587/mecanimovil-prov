import type { OfertaProveedor } from '@/services/solicitudesService';
import type { ChecklistInstance } from '@/services/checklistService';
import {
  puedeIniciarServicioOferta,
  puedeTerminarServicioManual,
  checklistEsperandoFirmaCliente,
  checklistCompletadoTotal,
  checklistBloqueaCierre,
  tieneManoObraPendientePago,
} from '@/utils/ofertaFlujoServicio';
import { isServicioCerradoProveedor } from '@/utils/estadoActividadProveedor';

export type FooterEjecucionParams = {
  oferta: OfertaProveedor | null;
  checklist: ChecklistInstance | null;
  loadingChecklist: boolean;
  checklistLoadError: boolean;
  bottomInset: number;
};

/** Altura reservada en ScrollView para el footer de ejecución (oferta post-negociación). */
export function calcularAlturaFooterEjecucion(params: FooterEjecucionParams): number {
  const { oferta, checklist, loadingChecklist, checklistLoadError, bottomInset } = params;
  if (!oferta) return 100;

  const servicioCerrado = isServicioCerradoProveedor({
    ofertaEstado: oferta.estado,
    estadoSolicitudServicio: oferta.estado_solicitud_servicio,
    checklistEstado: checklist?.estado,
  });
  const enEjecucionAbierto = oferta.estado === 'en_ejecucion' && !servicioCerrado;
  const servicioCompletadoUi = oferta.estado === 'completada' || servicioCerrado;
  const mostrarBotonIniciar = puedeIniciarServicioOferta(oferta);
  const mostrarBotonTerminar = puedeTerminarServicioManual(
    oferta,
    checklist,
    loadingChecklist,
    checklistLoadError,
  );
  const esperandoFirmaCliente = checklistEsperandoFirmaCliente(checklist);
  const checklistCerrado = checklistCompletadoTotal(checklist);
  const saldoManoObraPendiente = tieneManoObraPendientePago(oferta);
  const checklistPendienteCompletar = checklistBloqueaCierre(checklist);

  let altura = 12;

  if (mostrarBotonIniciar) {
    altura += 52 + 12;
  }

  if (enEjecucionAbierto) {
    if (mostrarBotonTerminar) {
      altura += 52 + 12;
    } else if (
      !esperandoFirmaCliente
      && !checklistCerrado
      && checklist
      && checklist.estado !== 'COMPLETADO'
    ) {
      altura += 52 + 12;
    } else if (
      !esperandoFirmaCliente
      && !checklistCerrado
      && !checklist
      && !checklistLoadError
      && !loadingChecklist
      && saldoManoObraPendiente
    ) {
      altura += 72 + 12;
    } else if (checklistLoadError) {
      altura += 72 + 12;
    }
  }

  if (oferta.estado === 'pendiente_creditos') {
    /** Solo Liberar + Comprar (Chat vive en el scroll del detalle). */
    altura += 52 + 12;
  } else if (oferta.estado === 'en_chat' || oferta.estado === 'aceptada') {
    altura += 52 + 12;
  }

  if (servicioCompletadoUi && checklist) {
    altura += 52 + 12;
  }

  if (
    !oferta.es_oferta_secundaria
    && enEjecucionAbierto
    && !servicioCompletadoUi
  ) {
    altura += 12 + 52 + 12;
  }

  altura += bottomInset + 36;
  return altura;
}
