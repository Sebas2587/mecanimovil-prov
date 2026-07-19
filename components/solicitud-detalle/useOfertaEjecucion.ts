import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  iniciarServicio,
  terminarServicio,
  type OfertaProveedor,
} from '@/services/solicitudesService';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import {
  puedeIniciarServicioOferta,
  tieneManoObraPendientePago,
  checklistEsperandoFirmaCliente,
  checklistCompletadoTotal,
  puedeTerminarServicioManual,
  checklistBloqueaCierre,
} from '@/utils/ofertaFlujoServicio';
import { isServicioCerradoProveedor } from '@/utils/estadoActividadProveedor';
import {
  resolverBadgeEstadoOferta,
  resolverBannerPrincipal,
  resolverBannerChecklistAccion,
  mostrarSeccionPlanPago,
  mostrarDetallePago,
  type OfertaDetalleUiContext,
} from '@/utils/ofertaDetalleProveedorUi';

const ESTADOS_CON_CHECKLIST = new Set(['en_ejecucion', 'completada']);

export function useOfertaEjecucion(options: {
  miOferta: OfertaProveedor | null;
  onOfertaUpdated: (oferta: OfertaProveedor) => void;
  onReload: () => void | Promise<void>;
}) {
  const { miOferta, onOfertaUpdated, onReload } = options;

  const [procesando, setProcesando] = useState(false);
  const [checklistInstance, setChecklistInstance] = useState<ChecklistInstance | null>(null);
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);
  const [showCompletedChecklistModal, setShowCompletedChecklistModal] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistLoadError, setChecklistLoadError] = useState(false);

  const cargarChecklist = useCallback(async (solicitudServicioId: number) => {
    try {
      setLoadingChecklist(true);
      setChecklistLoadError(false);
      const result = await checklistService.getInstanceByOrder(solicitudServicioId);

      if (result.success && result.data) {
        setChecklistInstance(result.data);
      } else {
        setChecklistInstance(null);
        setChecklistLoadError(false);
      }
    } catch (error) {
      console.warn('Error cargando checklist para solicitud:', solicitudServicioId, error);
      setChecklistInstance(null);
      setChecklistLoadError(true);
    } finally {
      setLoadingChecklist(false);
    }
  }, []);

  useEffect(() => {
    if (!miOferta) {
      setChecklistInstance(null);
      setChecklistLoadError(false);
      return;
    }

    const ordenId = miOferta.solicitud_servicio_id;
    if (
      ESTADOS_CON_CHECKLIST.has(miOferta.estado)
      && ordenId != null
      && ordenId > 0
    ) {
      void cargarChecklist(ordenId);
    } else {
      setChecklistInstance(null);
      setChecklistLoadError(false);
    }
  }, [miOferta?.id, miOferta?.estado, miOferta?.solicitud_servicio_id, cargarChecklist]);

  const uiCtx: OfertaDetalleUiContext | null = useMemo(() => {
    if (!miOferta) return null;
    return {
      oferta: miOferta,
      checklist: checklistInstance,
      loadingChecklist,
      checklistLoadError,
    };
  }, [miOferta, checklistInstance, loadingChecklist, checklistLoadError]);

  const servicioCerrado = miOferta
    ? isServicioCerradoProveedor({
        ofertaEstado: miOferta.estado,
        estadoSolicitudServicio: miOferta.estado_solicitud_servicio,
        checklistEstado: checklistInstance?.estado,
      })
    : false;

  const enEjecucionAbierto = miOferta?.estado === 'en_ejecucion' && !servicioCerrado;
  const servicioCompletadoUi = miOferta?.estado === 'completada' || servicioCerrado;
  const esperandoFirmaCliente = checklistEsperandoFirmaCliente(checklistInstance);
  const checklistCerrado = checklistCompletadoTotal(checklistInstance);
  const saldoManoObraPendiente = miOferta ? tieneManoObraPendientePago(miOferta) : false;
  const checklistPendienteCompletar = checklistBloqueaCierre(checklistInstance);
  const mostrarBotonTerminar = miOferta
    ? puedeTerminarServicioManual(
        miOferta,
        checklistInstance,
        loadingChecklist,
        checklistLoadError,
      )
    : false;
  const mostrarBotonIniciar = miOferta ? puedeIniciarServicioOferta(miOferta) : false;

  const solicitudActivaParaChat =
    !!miOferta?.solicitud_estado
    && miOferta.solicitud_estado !== 'cancelada'
    && miOferta.solicitud_estado !== 'expirada';

  const mostrarChatFijo =
    !!miOferta
    && (miOferta.estado === 'en_chat' || miOferta.estado === 'aceptada')
    && solicitudActivaParaChat;

  const handleChecklistComplete = useCallback(() => {
    setShowChecklistContainer(false);
    void onReload();
    showAlert(
      'Checklist registrado',
      'El cliente recibirá una notificación para firmar desde su app y cerrar la orden.',
    );
  }, [onReload]);

  const handleChecklistCancel = useCallback(() => {
    setShowChecklistContainer(false);
  }, []);

  const ejecutarIniciarServicio = useCallback(async () => {
    if (!miOferta) return;
    try {
      setProcesando(true);
      const result = await iniciarServicio(String(miOferta.id));

      if (result.success && result.data) {
        const ofertaActualizada = result.data;
        if (result.solicitud_servicio_id) {
          ofertaActualizada.solicitud_servicio_id = result.solicitud_servicio_id;
        }
        onOfertaUpdated(ofertaActualizada);

        const ordenId = ofertaActualizada.solicitud_servicio_id;
        if (ordenId) {
          await cargarChecklist(ordenId);
        }

        showAlert(
          'Servicio iniciado',
          'El servicio está en ejecución. Completa el checklist cuando corresponda.',
        );
      } else {
        showAlert('Error', result.error || 'No se pudo iniciar el servicio');
      }
    } catch (error) {
      console.error('Error iniciando servicio:', error);
      showAlert('Error', 'No se pudo iniciar el servicio');
    } finally {
      setProcesando(false);
    }
  }, [miOferta, onOfertaUpdated, cargarChecklist]);

  const handleIniciarServicio = useCallback(() => {
    if (!miOferta || procesando) return;
    showConfirm(
      'Iniciar Servicio',
      '¿Confirmas iniciar el servicio? Pasará a «En ejecución» y podrás usar el checklist si está configurado.',
      { confirmText: 'Iniciar', onConfirm: ejecutarIniciarServicio },
    );
  }, [miOferta, procesando, ejecutarIniciarServicio]);

  const ejecutarTerminarServicio = useCallback(async () => {
    if (!miOferta) return;
    try {
      setProcesando(true);
      const result = await terminarServicio(String(miOferta.id));

      if (result.success && result.data) {
        onOfertaUpdated(result.data);
        showAlert(
          'Servicio terminado',
          'El servicio fue marcado como terminado. El cliente será notificado.',
        );
        void onReload();
      } else {
        showAlert('Error', result.error || 'No se pudo terminar el servicio');
      }
    } catch (error) {
      console.error('Error terminando servicio:', error);
      showAlert('Error', 'No se pudo terminar el servicio');
    } finally {
      setProcesando(false);
    }
  }, [miOferta, onOfertaUpdated, onReload]);

  const handleTerminarServicio = useCallback(() => {
    if (!miOferta || procesando) return;
    showConfirm(
      'Terminar Servicio',
      'Este servicio no tiene checklist configurado. ¿Confirmas que el trabajo está completado y deseas cerrar la orden?',
      { confirmText: 'Terminar', onConfirm: ejecutarTerminarServicio },
    );
  }, [miOferta, procesando, ejecutarTerminarServicio]);

  return {
    uiCtx,
    checklistInstance,
    loadingChecklist,
    checklistLoadError,
    procesando,
    showChecklistContainer,
    setShowChecklistContainer,
    showCompletedChecklistModal,
    setShowCompletedChecklistModal,
    servicioCerrado,
    enEjecucionAbierto,
    servicioCompletadoUi,
    esperandoFirmaCliente,
    checklistCerrado,
    saldoManoObraPendiente,
    checklistPendienteCompletar,
    mostrarBotonTerminar,
    mostrarBotonIniciar,
    mostrarChatFijo,
    solicitudActivaParaChat,
    handleChecklistComplete,
    handleChecklistCancel,
    handleIniciarServicio,
    handleTerminarServicio,
    badgeEstado: uiCtx ? resolverBadgeEstadoOferta(uiCtx) : null,
    bannerPrincipal: uiCtx ? resolverBannerPrincipal(uiCtx) : null,
    bannerChecklistAccion: uiCtx ? resolverBannerChecklistAccion(uiCtx) : null,
    mostrarPlanPago: uiCtx ? mostrarSeccionPlanPago(uiCtx) : false,
    mostrarDetallePago: uiCtx ? mostrarDetallePago(uiCtx) : false,
  };
}
