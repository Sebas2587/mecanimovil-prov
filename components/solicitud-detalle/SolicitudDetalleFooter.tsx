import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
  platformShadow,
  withOpacity,
} from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { SolicitudPublica, OfertaProveedor } from '@/services/solicitudesService';
import type { ChecklistInstance } from '@/services/checklistService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const shadowFooter = platformShadow({
  shadowColor: I.ink,
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
});

const footerBtn = { flex: 1, minWidth: 0 } as const;
const stackBtn = { marginBottom: SPACING.fixed.sm, alignSelf: 'stretch' as const };

type EjecucionFooterProps = {
  miOferta: OfertaProveedor;
  checklistInstance: ChecklistInstance | null;
  loadingChecklist: boolean;
  checklistLoadError: boolean;
  procesando: boolean;
  enEjecucionAbierto: boolean;
  servicioCompletadoUi: boolean;
  esperandoFirmaCliente: boolean;
  checklistCerrado: boolean;
  saldoManoObraPendiente: boolean;
  mostrarBotonIniciar: boolean;
  mostrarBotonTerminar: boolean;
  mostrarChatFijo: boolean;
  onIniciarServicio: () => void;
  onTerminarServicio: () => void;
  onOpenChecklist: () => void;
  onOpenCompletedChecklist: () => void;
  /** Declinar reserva pendiente_creditos (legado) sin obligar a comprar. */
  onLiberarReservaCreditos?: () => void;
  liberandoReservaCreditos?: boolean;
  bottomPad: number;
};

function CatalogFooter({
  onConfirm,
  onReject,
  confirmLoading,
  rejectLoading,
  bottomPad,
}: {
  onConfirm: () => void;
  onReject: () => void;
  confirmLoading: boolean;
  rejectLoading: boolean;
  bottomPad: number;
}) {
  return (
    <View style={[styles.negotiationFooter, { paddingBottom: bottomPad }]}>
      <View style={styles.negotiationRow}>
        <InstitutionalButton
          label="Rechazar"
          variant="outline"
          size="default"
          onPress={onReject}
          disabled={rejectLoading || confirmLoading}
          loading={rejectLoading}
          style={footerBtn}
        />
        <InstitutionalButton
          label="Aceptar asignación"
          variant="primary"
          size="default"
          onPress={onConfirm}
          disabled={confirmLoading || rejectLoading}
          loading={confirmLoading}
          style={footerBtn}
        />
      </View>
    </View>
  );
}

function NegotiationFooter({
  solicitudId,
  onReject,
  rejectLoading,
  bottomPad,
}: {
  solicitudId: string;
  onReject: () => void;
  rejectLoading: boolean;
  bottomPad: number;
}) {
  return (
    <View style={[styles.negotiationFooter, { paddingBottom: bottomPad }]}>
      <View style={styles.negotiationRow}>
        <InstitutionalButton
          label="Rechazar oferta"
          variant="outline"
          size="default"
          onPress={onReject}
          disabled={rejectLoading}
          loading={rejectLoading}
          style={footerBtn}
        />
        <InstitutionalButton
          label="Crear oferta"
          variant="primary"
          size="default"
          onPress={() => router.push(`/crear-oferta/${solicitudId}`)}
          style={footerBtn}
        />
      </View>
    </View>
  );
}

function EjecucionFooter(props: EjecucionFooterProps) {
  const {
    miOferta,
    checklistInstance,
    loadingChecklist,
    checklistLoadError,
    procesando,
    enEjecucionAbierto,
    servicioCompletadoUi,
    esperandoFirmaCliente,
    checklistCerrado,
    saldoManoObraPendiente,
    mostrarBotonIniciar,
    mostrarBotonTerminar,
    mostrarChatFijo,
    onIniciarServicio,
    onTerminarServicio,
    onOpenChecklist,
    onOpenCompletedChecklist,
    onLiberarReservaCreditos,
    liberandoReservaCreditos = false,
    bottomPad,
  } = props;

  const navigateCreditos = () => {
    const falt = miOferta.creditos_faltantes_para_confirmar;
    const nec = miOferta.creditos_necesarios_adjudicacion;
    const minCompra =
      typeof falt === 'number' && falt > 0
        ? falt
        : typeof nec === 'number' && nec > 0
          ? nec
          : 1;
    router.push(`/creditos?tab=tienda&minCreditos=${minCompra}`);
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fixedActionsContainer, { paddingBottom: bottomPad }]}>
      {mostrarBotonIniciar ? (
        <InstitutionalButton
          label={procesando ? 'Iniciando...' : 'Iniciar Servicio'}
          variant="primary"
          size="compact"
          onPress={onIniciarServicio}
          disabled={procesando}
          loading={procesando}
          leading={
            !procesando ? (
              <InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            ) : undefined
          }
          style={stackBtn}
        />
      ) : null}

      {enEjecucionAbierto ? (
        <>
          {checklistLoadError ? (
            <View style={[styles.waitingClosureCard, { borderColor: I.semanticDown, backgroundColor: withOpacity(I.semanticDown, 0.06) }]}>
              <InstitutionalIcon name="error-outline" size={22} color={I.semanticDown} />
              <Text style={[styles.waitingClosureText, { color: I.semanticDown }]}>
                No se pudo verificar el checklist. Recarga la pantalla antes de continuar.
              </Text>
            </View>
          ) : null}

          {!esperandoFirmaCliente && !checklistCerrado && !checklistLoadError
            && checklistInstance && checklistInstance.estado !== 'COMPLETADO' ? (
            <InstitutionalButton
              label={checklistInstance.estado === 'PENDIENTE' ? 'Iniciar Checklist' : 'Continuar Checklist'}
              variant="primary"
              size="compact"
              onPress={onOpenChecklist}
              leading={
                <InstitutionalIcon name="assignment" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={stackBtn}
            />
          ) : null}

          {mostrarBotonTerminar ? (
            <InstitutionalButton
              label={procesando ? 'Terminando...' : 'Terminar Servicio'}
              variant="success"
              size="compact"
              onPress={onTerminarServicio}
              disabled={procesando}
              loading={procesando}
              leading={
                !procesando ? (
                  <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : undefined
              }
              style={stackBtn}
            />
          ) : null}

          {!esperandoFirmaCliente && !checklistCerrado && !checklistInstance
            && !checklistLoadError && !loadingChecklist && saldoManoObraPendiente ? (
            <View style={[styles.waitingClosureCard, { borderColor: I.accentYellow, backgroundColor: withOpacity(I.accentYellow, 0.08) }]}>
              <InstitutionalIcon name="payment" size={22} color={I.accentYellow} />
              <Text style={[styles.waitingClosureText, { color: I.body }]}>
                El cliente debe pagar la mano de obra pendiente desde su app antes de que puedas cerrar la orden.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {miOferta.estado === 'pendiente_creditos' ? (
        <View style={styles.negotiationRow}>
          {onLiberarReservaCreditos ? (
            <InstitutionalButton
              label="Liberar reserva"
              variant="outline"
              size="default"
              onPress={onLiberarReservaCreditos}
              disabled={liberandoReservaCreditos}
              loading={liberandoReservaCreditos}
              style={footerBtn}
            />
          ) : null}
          <InstitutionalButton
            label="Comprar créditos"
            variant="primary"
            size="default"
            onPress={navigateCreditos}
            disabled={liberandoReservaCreditos}
            style={footerBtn}
          />
        </View>
      ) : null}

      {mostrarChatFijo && miOferta.estado !== 'pendiente_creditos' ? (
        <InstitutionalButton
          label="Abrir Chat"
          variant="outlineAccent"
          size="compact"
          onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
          leading={
            <InstitutionalIcon name="chat" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          }
          style={stackBtn}
        />
      ) : null}

      {servicioCompletadoUi && checklistInstance && miOferta.solicitud_servicio_id ? (
        <InstitutionalButton
          label="Ver Checklist Realizado"
          variant="success"
          size="compact"
          onPress={onOpenCompletedChecklist}
          leading={
            <InstitutionalIcon name="assignment" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          }
          style={stackBtn}
        />
      ) : null}

      {!miOferta.es_oferta_secundaria && enEjecucionAbierto ? (
        <InstitutionalButton
          label="Crear Oferta Secundaria"
          variant="outlineAccent"
          size="compact"
          onPress={() => {
            if (miOferta.solicitud) {
              router.push(`/crear-oferta-secundaria/${miOferta.solicitud}/${miOferta.id}`);
            } else {
              Alert.alert('Error', 'No se pudo obtener la información de la solicitud');
            }
          }}
          leading={
            <InstitutionalIcon name="add-circle" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          }
          style={stackBtn}
        />
      ) : null}
    </SafeAreaView>
  );
}

export type SolicitudDetalleFooterProps = {
  solicitud: SolicitudPublica;
  miOferta: OfertaProveedor | null;
  puedeGestionarCatalogo: boolean;
  onConfirmCatalogo: () => void;
  onRejectCatalogo: () => void;
  confirmandoCatalogo: boolean;
  rechazando: boolean;
  onRejectSolicitud: () => void;
  bottomPad: number;
  showEjecucionFooter?: boolean;
} & Partial<Omit<EjecucionFooterProps, 'miOferta' | 'bottomPad'>>;

export function SolicitudDetalleFooter(props: SolicitudDetalleFooterProps) {
  const {
    solicitud,
    miOferta,
    puedeGestionarCatalogo,
    onConfirmCatalogo,
    onRejectCatalogo,
    confirmandoCatalogo,
    rechazando,
    onRejectSolicitud,
    bottomPad,
    showEjecucionFooter,
    ...ejecucionProps
  } = props;

  if (puedeGestionarCatalogo) {
    return (
      <CatalogFooter
        onConfirm={onConfirmCatalogo}
        onReject={onRejectCatalogo}
        confirmLoading={confirmandoCatalogo}
        rejectLoading={rechazando}
        bottomPad={bottomPad}
      />
    );
  }

  if (!miOferta && solicitud.estado !== 'pendiente_confirmacion') {
    return (
      <NegotiationFooter
        solicitudId={solicitud.id}
        onReject={onRejectSolicitud}
        rejectLoading={rechazando}
        bottomPad={bottomPad}
      />
    );
  }

  if (showEjecucionFooter && miOferta) {
    return (
      <EjecucionFooter
        miOferta={miOferta}
        bottomPad={bottomPad}
        {...(ejecucionProps as Omit<EjecucionFooterProps, 'miOferta' | 'bottomPad'>)}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  negotiationFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    ...shadowFooter,
  },
  negotiationRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  fixedActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    ...shadowFooter,
  },
  fixedActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  primaryInRow: {
    flex: 2,
    marginBottom: 0,
  },
  chatInRow: {
    flex: 1,
    marginBottom: 0,
  },
  waitingClosureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
  },
  waitingClosureText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
});
