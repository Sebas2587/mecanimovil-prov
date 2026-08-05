import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { CalendarPlus, Plus, Radar } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface HomeQuickActionsProps {
  radarActivo?: boolean;
  onAgendar?: () => void;
}

export function HomeQuickActions({ radarActivo = false, onAgendar }: HomeQuickActionsProps) {
  const handleCotizar = useCallback(() => {
    router.push('/cotizar-ia');
  }, []);

  const handleAgendar = useCallback(() => {
    if (onAgendar) {
      onAgendar();
      return;
    }
    router.push('/agendar-cita-personal');
  }, [onAgendar]);

  const handleSolicitudes = useCallback(() => {
    router.push('/solicitudes-disponibles');
  }, []);

  return (
    <View style={styles.row}>
      <InstitutionalButton
        label="Cotizar"
        onPress={handleCotizar}
        variant="primary"
        size="compact"
        leading={<Plus size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
        style={styles.btn}
      />
      <InstitutionalButton
        label="Agendar"
        onPress={handleAgendar}
        variant="outline"
        size="compact"
        leading={<CalendarPlus size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
        style={styles.btn}
      />
      {radarActivo ? (
        <InstitutionalButton
          label="B2C"
          onPress={handleSolicitudes}
          variant="outline"
          size="compact"
          leading={<Radar size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.lg,
  },
  btn: {
    flexGrow: 1,
    minWidth: 96,
  },
});
