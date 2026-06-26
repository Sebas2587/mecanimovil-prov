import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';

const warningStatus = institutionalStatusColors('warning');

interface AlertaCreditosBajosProps {
  saldo: number;
}

export const AlertaCreditosBajos: React.FC<AlertaCreditosBajosProps> = ({ saldo }) => {
  if (saldo >= 10) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: warningStatus.bg,
          borderColor: warningStatus.border,
        },
      ]}
    >
      <View style={styles.content}>
        <InstitutionalIcon
          name="warning"
          size={18}
          color={warningStatus.icon}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <View style={styles.textContainer}>
          <InstitutionalText role="body" color={warningStatus.text} style={styles.message}>
            {saldo === 0
              ? 'Sin créditos disponibles. Compra más para continuar.'
              : `Solo te quedan ${saldo} créditos. Compra más para no quedarte sin créditos.`}
          </InstitutionalText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    ...SHADOWS.editorial,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontWeight: '500',
  },
});
