import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Link2, MessageCircle, Trash2, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { InstitutionalButton, InstitutionalText } from '@/app/design-system/components';
import { COLORS, SPACING, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { AGENTE_IA_BORRADORES_KEY } from '@/hooks/useAgenteIaQueries';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;

export type HomeCotizacionRevisionModalProps = {
  visible: boolean;
  cotizacion: CotizacionCanal | null;
  onClose: () => void;
  onSuccess: () => void;
};

function snapshot(c: CotizacionCanal): string {
  return JSON.stringify({
    servicio_nombre: c.servicio_nombre,
    descripcion_problema: c.descripcion_problema,
    modalidad: c.modalidad,
    direccion_servicio: c.direccion_servicio,
    cliente_nombre: c.cliente_nombre,
    cliente_telefono: c.cliente_telefono,
    repuestos: c.repuestos,
    mano_obra_clp: c.mano_obra_clp,
    notas_internas: c.notas_internas,
    duracion_minutos_estimada: c.duracion_minutos_estimada,
  });
}

export function HomeCotizacionRevisionModal({
  visible,
  cotizacion,
  onClose,
  onSuccess,
}: HomeCotizacionRevisionModalProps) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CotizacionCanal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (visible && cotizacion) {
      setDraft({ ...cotizacion });
    }
    if (!visible) {
      setDraft(null);
    }
  }, [visible, cotizacion?.id]);

  const hayCambios = useMemo(() => {
    if (!draft || !cotizacion) return false;
    return snapshot(draft) !== snapshot(cotizacion);
  }, [draft, cotizacion]);

  const cliente = draft?.cliente_nombre || draft?.cliente_display || 'Cliente';
  const vehiculo = draft
    ? [draft.vehiculo_marca, draft.vehiculo_modelo, draft.vehiculo_patente]
        .filter(Boolean)
        .join(' · ')
    : '';

  const guardar = useCallback(async () => {
    if (!draft?.id) return;
    setGuardando(true);
    try {
      const actualizada = await cotizacionCanalService.actualizar(draft.id, {
        servicio_nombre: draft.servicio_nombre,
        descripcion_problema: draft.descripcion_problema,
        modalidad: draft.modalidad,
        direccion_servicio: draft.direccion_servicio,
        cliente_nombre: draft.cliente_nombre,
        cliente_telefono: draft.cliente_telefono,
        repuestos: draft.repuestos,
        mano_obra_clp: draft.mano_obra_clp,
        notas_internas: draft.notas_internas,
        duracion_minutos_estimada: draft.duracion_minutos_estimada,
      });
      setDraft({ ...actualizada });
      onSuccess();
    } catch {
      showAlert('Error', 'No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }, [draft, onSuccess]);

  const enviar = useCallback(async () => {
    if (!draft?.id) return;
    setEnviando(true);
    try {
      if (hayCambios) {
        await cotizacionCanalService.actualizar(draft.id, {
          servicio_nombre: draft.servicio_nombre,
          descripcion_problema: draft.descripcion_problema,
          modalidad: draft.modalidad,
          direccion_servicio: draft.direccion_servicio,
          cliente_nombre: draft.cliente_nombre,
          cliente_telefono: draft.cliente_telefono,
          repuestos: draft.repuestos,
          mano_obra_clp: draft.mano_obra_clp,
          notas_internas: draft.notas_internas,
          duracion_minutos_estimada: draft.duracion_minutos_estimada,
        });
      }
      await cotizacionCanalService.enviar(draft.id);
      qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
      invalidateProveedorComercialQueries(qc);
      onSuccess();
      onClose();
      showAlert(
        'Cotización enviada',
        'Pasó a tu Bandeja (enviadas). El cliente puede aceptar o rechazar el enlace.',
      );
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setEnviando(false);
    }
  }, [draft, hayCambios, onClose, onSuccess, qc]);

  const eliminar = useCallback(() => {
    if (!draft?.id) return;
    showConfirm('Eliminar cotización', 'Se cancelará y saldrá de pendientes.', {
      confirmText: 'Eliminar',
      onConfirm: async () => {
        setEliminando(true);
        try {
          await cotizacionCanalService.cancelar(draft.id);
          invalidateProveedorComercialQueries(qc);
          onSuccess();
          onClose();
        } catch {
          showAlert('Error', 'No se pudo eliminar.');
        } finally {
          setEliminando(false);
        }
      },
    });
  }, [draft?.id, onClose, onSuccess, qc]);

  const compartir = useCallback(async () => {
    const url = draft?.share_url || draft?.url_publica;
    if (!url) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Link copiado', 'Pégalo en WhatsApp u otro canal.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Link de cotización', url);
    }
  }, [draft]);

  if (!draft) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <InstitutionalText role="h3" numberOfLines={1}>
              {cliente}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body" numberOfLines={1}>
              {vehiculo || 'Revisar cotización IA'}
            </InstitutionalText>
          </View>
          {draft.conversation ? (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => {
                const id = draft.conversation;
                onClose();
                if (id) router.push(omnichannelChatHref(id));
              }}
              accessibilityLabel="Abrir chat"
            >
              <MessageCircle size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
            <X size={24} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CotizacionIaEditor cotizacion={draft} onChange={setDraft} />

          {(draft.share_url || draft.url_publica) ? (
            <InstitutionalButton
              label="Compartir link"
              variant="outline"
              leading={<Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={() => void compartir()}
            />
          ) : null}
        </ScrollView>

        {/* Footer sticky Host: secondary | outline | primary */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerGhost}
            onPress={eliminar}
            disabled={eliminando}
            accessibilityLabel="Eliminar"
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
            <InstitutionalText role="caption" style={styles.footerGhostLabel}>
              Eliminar
            </InstitutionalText>
          </TouchableOpacity>
          <InstitutionalButton
            label="Guardar"
            variant="outline"
            size="compact"
            loading={guardando}
            disabled={!hayCambios || guardando}
            style={styles.footerMid}
            onPress={() => void guardar()}
          />
          <InstitutionalButton
            label="Aprobar y enviar"
            variant="primary"
            size="compact"
            loading={enviando}
            style={styles.footerPrimary}
            onPress={() => void enviar()}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: I.paper,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollInner: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  footerGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 56,
    paddingVertical: 4,
  },
  footerGhostLabel: {
    color: I.semanticDown,
  },
  footerMid: {
    flex: 1,
  },
  footerPrimary: {
    flex: 1.35,
  },
});

export default HomeCotizacionRevisionModal;
