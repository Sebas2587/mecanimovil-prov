import React from 'react';
import { View, Text, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import {
  institutionalSectionStyles,
  type InstitutionalSectionLevel,
} from '@/app/design-system/styles/institutionalSections';

export type InstitutionalSectionHeaderProps = {
  title: string;
  level?: InstitutionalSectionLevel;
  count?: number | string;
  actionLabel?: string;
  onActionPress?: () => void;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function InstitutionalSectionHeader({
  title,
  level = 'h4',
  count,
  actionLabel,
  onActionPress,
  leading,
  style,
}: InstitutionalSectionHeaderProps) {
  const styles = institutionalSectionStyles(level);
  const showCount = count != null && count !== '' && !(typeof count === 'number' && count <= 0);

  return (
    <View style={[styles.row, style]}>
      {leading}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {showCount ? (
        <Text style={styles.count}>
          {typeof count === 'number' && count > 99 ? '99+' : String(count)}
        </Text>
      ) : null}
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
