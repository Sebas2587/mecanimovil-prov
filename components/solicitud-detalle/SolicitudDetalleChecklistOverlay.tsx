import React from 'react';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import type { OfertaProveedor } from '@/services/solicitudesService';

type Props = {
  miOferta: OfertaProveedor | null;
  showChecklistContainer: boolean;
  showCompletedChecklistModal: boolean;
  onChecklistComplete: () => void;
  onChecklistCancel: () => void;
  onCloseCompletedModal: () => void;
};

export function SolicitudDetalleChecklistOverlay({
  miOferta,
  showChecklistContainer,
  showCompletedChecklistModal,
  onChecklistComplete,
  onChecklistCancel,
  onCloseCompletedModal,
}: Props) {
  const ordenId = miOferta?.solicitud_servicio_id;

  if (showChecklistContainer && miOferta && ordenId) {
    return (
      <ChecklistContainer
        ordenId={ordenId}
        onComplete={onChecklistComplete}
        onCancel={onChecklistCancel}
      />
    );
  }

  if (!miOferta || !ordenId) return null;

  return (
    <ChecklistCompletedView
      visible={showCompletedChecklistModal}
      onClose={onCloseCompletedModal}
      ordenId={ordenId}
    />
  );
}

/** Modal de checklist completado (cuando no está activo el contenedor fullscreen). */
export function SolicitudDetalleChecklistCompletedModal({
  miOferta,
  visible,
  onClose,
}: {
  miOferta: OfertaProveedor | null;
  visible: boolean;
  onClose: () => void;
}) {
  const ordenId = miOferta?.solicitud_servicio_id;
  if (!ordenId) return null;
  return (
    <ChecklistCompletedView visible={visible} onClose={onClose} ordenId={ordenId} />
  );
}
