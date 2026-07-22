import React, { useCallback } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Bot, Settings2, X } from 'lucide-react-native';
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
  useActualizarAgenteConfigMutation,
  useAgenteIaConfigQuery,
} from '@/hooks/useAgenteIaQueries';

const I = COLORS.institutional;

export interface AgenteIaChatToggleModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AgenteIaChatToggleModal({ visible, onClose }: AgenteIaChatToggleModalProps) {
  const { data: config, isLoading } = useAgenteIaConfigQuery(visible);
  const updateConfig = useActualizarAgenteConfigMutation();

  const habilitado = Boolean(config?.habilitado);

  const handleToggle = useCallback(
    (value: boolean) => {
      updateConfig.mutate({ habilitado: value });
    },
    [updateConfig],
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

      {isLoading || !config ? (
        <ActivityIndicator color={I.primary} style={styles.loader} />
      ) : (
        <View style={styles.toggleRow}>
          <View style={styles.iconPlate}>
            <Bot size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.toggleCopy}>
            <View style={styles.titleRow}>
              <InstitutionalText role="body" style={styles.toggleTitle} numberOfLines={2}>
                Responder automáticamente
              </InstitutionalText>
              <InstitutionalTag
                label={habilitado ? 'Activo' : 'Apagado'}
                variant={habilitado ? 'primary' : 'neutral'}
                size="sm"
              />
            </View>
            <InstitutionalText role="caption" color="muted" style={styles.toggleHint}>
              Captura datos del cliente, consulta tu catálogo e historial, y prepara cotizaciones
              para que las revises.
            </InstitutionalText>
          </View>
          <Switch
            value={habilitado}
            onValueChange={handleToggle}
            disabled={updateConfig.isPending}
            {...institutionalSwitchProps}
            style={styles.switch}
          />
        </View>
      )}

      <InstitutionalButton
        label="Configurar Agente IA"
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
