import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, platformShadow, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { SolicitudPublica, OfertaProveedor } from '@/services/solicitudesService';
import type { ChecklistInstance } from '@/services/checklistService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const shadowFooter = platformShadow({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
});

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
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnOutline,
            (pressed || rejectLoading) && styles.footerBtnPressed,
            rejectLoading && styles.footerBtnDisabled,
          ]}
          onPress={onReject}
          disabled={rejectLoading || confirmLoading}
        >
          {rejectLoading ? (
            <ActivityIndicator color={I.semanticDown} size="small" />
          ) : (
            <>
              <InstitutionalIcon name="cancel" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerBtnOutlineText} numberOfLines={1}>Rechazar</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnPrimary,
            (pressed || confirmLoading) && styles.footerBtnPressed,
            confirmLoading && styles.footerBtnDisabled,
          ]}
          onPress={onConfirm}
          disabled={confirmLoading || rejectLoading}
        >
          {confirmLoading ? (
            <ActivityIndicator color={I.onPrimary} size="small" />
          ) : (
            <>
              <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>Aceptar asignación</Text>
            </>
          )}
        </Pressable>
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
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnOutline,
            (pressed || rejectLoading) && styles.footerBtnPressed,
            rejectLoading && styles.footerBtnDisabled,
          ]}
          onPress={onReject}
          disabled={rejectLoading}
        >
          {rejectLoading ? (
            <ActivityIndicator color={I.semanticDown} size="small" />
          ) : (
            <>
              <InstitutionalIcon name="cancel" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerBtnOutlineText} numberOfLines={1}>Rechazar oferta</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.footerBtnPrimary, pressed && styles.footerBtnPressed]}
          onPress={() => router.push(`/crear-oferta/${solicitudId}`)}
        >
          <InstitutionalIcon name="add-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>Crear oferta</Text>
        </Pressable>
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
        <TouchableOpacity
          style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
          onPress={onIniciarServicio}
          disabled={procesando}
        >
          <InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} />
          <Text style={styles.fixedActionButtonText}>
            {procesando ? 'Iniciando...' : 'Iniciar Servicio'}
          </Text>
        </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
              onPress={onOpenChecklist}
            >
              <InstitutionalIcon name="assignment" size={20} color={I.onPrimary} />
              <Text style={styles.fixedActionButtonText}>
                {checklistInstance.estado === 'PENDIENTE' ? 'Iniciar Checklist' : 'Continuar Checklist'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {mostrarBotonTerminar ? (
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
              onPress={onTerminarServicio}
              disabled={procesando}
            >
              <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} />
              <Text style={styles.fixedActionButtonText}>
                {procesando ? 'Terminando...' : 'Terminar Servicio'}
              </Text>
            </TouchableOpacity>
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

      {miOferta.estado === 'pendiente_creditos' && mostrarChatFijo ? (
        <View style={styles.fixedActionsRow}>
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonPrimary, styles.fixedActionButtonPrimaryInRow]}
            onPress={navigateCreditos}
          >
            <InstitutionalIcon name="account-balance-wallet" size={20} color={I.onPrimary} />
            <Text style={styles.fixedActionButtonText} numberOfLines={1}>Comprar créditos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fixedActionButton, styles.fixedActionButtonOutline, styles.fixedActionButtonChatInRow]}
            onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
          >
            <InstitutionalIcon name="chat" size={18} color={I.primary} />
            <Text style={[styles.fixedActionButtonTextCompact, { color: I.primary }]} numberOfLines={1}>Chat</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {miOferta.estado === 'pendiente_creditos' && !mostrarChatFijo ? (
        <TouchableOpacity
          style={[styles.fixedActionButton, styles.fixedActionButtonPrimary]}
          onPress={navigateCreditos}
        >
          <InstitutionalIcon name="account-balance-wallet" size={20} color={I.onPrimary} />
          <Text style={styles.fixedActionButtonText}>Comprar créditos</Text>
        </TouchableOpacity>
      ) : null}

      {mostrarChatFijo && miOferta.estado !== 'pendiente_creditos' ? (
        <TouchableOpacity
          style={[styles.fixedActionButton, styles.fixedActionButtonOutline]}
          onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
        >
          <InstitutionalIcon name="chat" size={20} color={I.primary} />
          <Text style={[styles.fixedActionButtonText, { color: I.primary }]}>Abrir Chat</Text>
        </TouchableOpacity>
      ) : null}

      {servicioCompletadoUi && checklistInstance && miOferta.solicitud_servicio_id ? (
        <TouchableOpacity
          style={[styles.fixedActionButton, styles.fixedActionButtonSuccess]}
          onPress={onOpenCompletedChecklist}
        >
          <InstitutionalIcon name="assignment" size={20} color={I.onPrimary} />
          <Text style={styles.fixedActionButtonText}>Ver Checklist Realizado</Text>
        </TouchableOpacity>
      ) : null}

      {!miOferta.es_oferta_secundaria && enEjecucionAbierto ? (
        <TouchableOpacity
          style={[styles.fixedActionButton, styles.fixedActionButtonOutline]}
          onPress={() => {
            if (miOferta.solicitud) {
              router.push(`/crear-oferta-secundaria/${miOferta.solicitud}/${miOferta.id}`);
            } else {
              Alert.alert('Error', 'No se pudo obtener la información de la solicitud');
            }
          }}
        >
          <InstitutionalIcon name="add-circle" size={20} color={I.primary} />
          <Text style={[styles.fixedActionButtonText, { color: I.primary }]}>Crear Oferta Secundaria</Text>
        </TouchableOpacity>
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
  footerBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticDown, 0.35),
    backgroundColor: I.canvas,
  },
  footerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  footerBtnOutlineText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.semanticDown,
  },
  footerBtnPrimaryText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  footerBtnPressed: { opacity: 0.85 },
  footerBtnDisabled: { opacity: 0.55 },

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
  fixedActionButtonPrimaryInRow: {
    flex: 2,
    minWidth: 0,
    marginBottom: 0,
  },
  fixedActionButtonChatInRow: {
    flex: 1,
    minWidth: 0,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    marginTop: 0,
    marginBottom: 0,
  },
  fixedActionButtonTextCompact: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  fixedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    marginBottom: SPACING.fixed.sm,
  },
  fixedActionButtonPrimary: {
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  fixedActionButtonSuccess: {
    backgroundColor: I.semanticUp,
    ...SHADOWS.editorial,
  },
  fixedActionButtonOutline: {
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fixedActionButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
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
