import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = COLORS.institutional.primary,
  text = 'Cargando...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {text ? (
        <InstitutionalText role="body" color="body" style={styles.text}>
          {text}
        </InstitutionalText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.lg,
  },
  text: {
    marginTop: SPACING.fixed.sm,
    textAlign: 'center',
  },
});
