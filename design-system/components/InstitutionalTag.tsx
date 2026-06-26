import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import {
  institutionalTagStyles,
  type InstitutionalTagSize,
  type InstitutionalTagVariant,
} from '@/app/design-system/styles/institutionalTags';

export type InstitutionalTagProps = {
  label: string;
  variant?: InstitutionalTagVariant;
  size?: InstitutionalTagSize;
  uppercase?: boolean;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function InstitutionalTag({
  label,
  variant = 'neutral',
  size = 'md',
  uppercase,
  leading,
  style,
}: InstitutionalTagProps) {
  const styles = institutionalTagStyles(variant, size, uppercase);

  return (
    <View style={[styles.tag, style]}>
      {leading}
      <Text style={styles.text} numberOfLines={3}>
        {label}
      </Text>
    </View>
  );
}
