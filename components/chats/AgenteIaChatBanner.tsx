import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Bot, Pause, Play } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  HostPaperSection,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import {
  sesionAgenteActiva,
  useAgenteSesionQuery,
  usePausarAgenteSesionMutation,
  useReanudarAgenteSesionMutation,
} from '@/hooks/useAgenteIaQueries';

const I = COLORS.institutional;

interface Props {
  conversationId: string | number | null | undefined;
}

export function AgenteIaChatBanner({ conversationId }: Props) {
  const { data: sesion, isLoading } = useAgenteSesionQuery(conversationId);
  const pausar = usePausarAgenteSesionMutation();
  const reanudar = useReanudarAgenteSesionMutation();

  if (isLoading || !sesion?.id) {
    return null;
  }

  const activa = sesionAgenteActiva(sesion);
  const esperandoRevision = sesion.estado === 'esperando_revision_taller';

  // Solo si sigue habilitado en el chat (opt-in). Apagado ≠ pausado.
  if (
    !activa
    && !esperandoRevision
    && sesion.pausado_por_taller
    && sesion.habilitado_en_chat
  ) {
    return (
      <HostPaperSection style={styles.banner}>
        <View style={styles.row}>
          <View style={hostIconPlateStyle}>
            <Bot size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <InstitutionalText role="caption" color="muted" style={styles.flex}>
            Agente IA pausado en esta conversación
          </InstitutionalText>
          <InstitutionalButton
            label="Reanudar"
            variant="outline"
            size="compact"
            leading={<Play size={14} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => conversationId && reanudar.mutate(conversationId)}
            disabled={reanudar.isPending}
          />
        </View>
      </HostPaperSection>
    );
  }

  if (!activa && !esperandoRevision) {
    return null;
  }

  return (
    <HostPaperSection style={styles.banner}>
      <View style={styles.row}>
        <View style={hostIconPlateStyle}>
          <Bot size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.flex}>
          <InstitutionalText role="caption" style={styles.label}>
            {esperandoRevision ? 'Cotización IA lista para revisar' : 'Agente IA respondiendo'}
          </InstitutionalText>
          {esperandoRevision ? (
            <InstitutionalTag label="Revisa precios antes de enviar" variant="warning" size="sm" />
          ) : (
            <InstitutionalTag label="Capturando información" variant="primary" size="sm" />
          )}
        </View>
        {activa ? (
          <InstitutionalButton
            label="Pausar"
            variant="outline"
            size="compact"
            leading={<Pause size={14} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => conversationId && pausar.mutate(conversationId)}
            disabled={pausar.isPending}
          />
        ) : null}
        {(pausar.isPending || reanudar.isPending) && (
          <ActivityIndicator size="small" color={I.primary} />
        )}
      </View>
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: BORDERS.radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: undefined,
  },
});
