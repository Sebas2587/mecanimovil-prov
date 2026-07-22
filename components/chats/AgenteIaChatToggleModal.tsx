import React, { useCallback } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Bot, Lock, Settings2, X } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  BottomSheet,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
  institutionalSwitchProps,
} from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import {
  useActivarAgenteEnChatMutation,
  useAgenteIaConfigQuery,
  useAgenteSesionQuery,
  useReanudarAgenteSesionMutation,
} from '@/hooks/useAgenteIaQueries';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;

export interface AgenteIaChatToggleModalProps {
  visible: boolean;
  onClose: () => void;
  /** Obligatorio: el agente se activa/desactiva SOLO en este chat. */
  conversationId: string | number | null | undefined;
}

export function AgenteIaChatToggleModal({
  visible,
  onClose,
  conversationId,
}: AgenteIaChatToggleModalProps) {
  const { data: config, isLoading: loadingConfig } = useAgenteIaConfigQuery(visible);
  const { data: sesion, isLoading: loadingSesion } = useAgenteSesionQuery(conversationId, visible);
  const activarChat = useActivarAgenteEnChatMutation();
  const reanudarChat = useReanudarAgenteSesionMutation();

  const disponibleEnPlan =
    sesion?.agente_ia_disponible_en_plan !== false
    && config?.agente_ia_disponible_en_plan !== false;
  // El switch refleja SOLO el opt-in del chat. La pausa manual es un estado aparte
  // (si mezclamos pausa = apagado, el toggle “se apaga solo” al pausar).
  const switchOn = Boolean(sesion?.habilitado_en_chat);
  const pausado = switchOn && Boolean(sesion?.pausado_por_taller);
  const isLoading = (loadingConfig || loadingSesion) && !sesion && !config;
  const chatIdOk = conversationId != null && /^\d+$/.test(String(conversationId).trim());
  const busy = activarChat.isPending || reanudarChat.isPending;

  const handleToggle = useCallback(
    (value: boolean) => {
      if (!chatIdOk) {
        showAlert('Error', 'No se pudo identificar este chat. Cierra y vuelve a abrirlo.');
        return;
      }
      // Evita doble disparo del Switch en web (on/off inmediato).
      if (value === switchOn || busy) return;
      activarChat.mutate(
        { conversationId: String(conversationId).trim(), activo: value },
        {
          onError: (err: unknown) => {
            const detail =
              (err as { response?: { data?: { error?: string; detail?: string } } })?.response
                ?.data?.error
              || (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
              || 'No se pudo actualizar el Agente IA en este chat.';
            showAlert('No se pudo activar', String(detail));
          },
        },
      );
    },
    [activarChat, busy, chatIdOk, conversationId, switchOn],
  );

  const irAConfig = () => {
    onClose();
    router.push('/configuracion-agente-ia' as never);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} style={styles.sheet}>
      <View style={styles.header}>
        <InstitutionalText role="h5" style={styles.title}>
          Agente IA
        </InstitutionalText>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar" hitSlop={8}>
          <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={I.primary} style={styles.loader} />
      ) : (
        <View style={styles.toggleRow}>
          <View style={styles.iconPlate}>
            {disponibleEnPlan ? (
              <Bot size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            ) : (
              <Lock size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            )}
          </View>
          <View style={styles.toggleCopy}>
            <View style={styles.titleRow}>
              <InstitutionalText role="body" style={styles.toggleTitle} numberOfLines={2}>
                Responder en este chat
              </InstitutionalText>
              <InstitutionalTag
                label={
                  !disponibleEnPlan
                    ? 'No incluido'
                    : !chatIdOk
                      ? 'Sin chat'
                      : pausado
                        ? 'Pausado'
                        : switchOn
                          ? 'Activo'
                          : 'Apagado'
                }
                variant={
                  !disponibleEnPlan || !chatIdOk
                    ? 'neutral'
                    : switchOn
                      ? 'primary'
                      : 'neutral'
                }
                size="sm"
              />
            </View>
            <InstitutionalText role="caption" color="muted" style={styles.toggleHint}>
              {!chatIdOk
                ? 'No se identificó la conversación. Cierra el modal y vuelve a entrar al chat.'
                : disponibleEnPlan
                  ? 'Solo afecta este chat. Si el taller responde a mano, la IA se pausa y se reanuda sola después de un rato, o puedes reactivarla aquí.'
                  : 'Disponible desde el Plan Profesional. Sube de plan para activar la auto-respuesta.'}
            </InstitutionalText>
          </View>
          <Switch
            value={switchOn}
            onValueChange={handleToggle}
            disabled={busy || !disponibleEnPlan || !chatIdOk}
            {...institutionalSwitchProps}
            style={styles.switch}
          />
        </View>
      )}

      {pausado && chatIdOk ? (
        <InstitutionalButton
          label="Reanudar respuesta automática"
          variant="outline"
          size="compact"
          onPress={() => {
            reanudarChat.mutate(String(conversationId).trim(), {
              onError: () => showAlert('Error', 'No se pudo reanudar el Agente IA.'),
            });
          }}
          disabled={busy}
          style={styles.cta}
        />
      ) : null}

      <InstitutionalButton
        label={disponibleEnPlan ? 'Configurar Agente IA' : 'Ver planes con Agente IA'}
        variant="primary"
        size="compact"
        leading={<Settings2 size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
        onPress={irAConfig}
        style={styles.cta}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: SPACING.fixed.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  title: {
    flex: 1,
    paddingRight: SPACING.fixed.sm,
  },
  loader: {
    marginVertical: SPACING.fixed.lg,
    alignSelf: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.lg,
  },
  iconPlate: {
    ...hostIconPlateStyle,
    marginTop: 2,
    flexShrink: 0,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  toggleTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    flexShrink: 1,
  },
  toggleHint: {
    lineHeight: 18,
  },
  switch: {
    flexShrink: 0,
    marginTop: 2,
  },
  cta: {
    alignSelf: 'stretch',
  },
});

export default AgenteIaChatToggleModal;
