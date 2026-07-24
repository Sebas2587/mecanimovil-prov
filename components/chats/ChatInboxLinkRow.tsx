import React from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Link, type Href } from 'expo-router';

type Props = {
  href: Href;
  onPress?: () => void;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function ChatInboxLinkRow({ href, onPress, highlighted, style, children }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.wrap,
          style,
          highlighted && styles.highlighted,
          pressed && styles.pressed,
          Platform.OS === 'web' && styles.web,
        ]}
      >
        {children}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // El espaciado entre filas lo controla el contenedor (ChatSwipeableRow / listItemFallback).
  },
  highlighted: {
    opacity: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  web: {
    cursor: 'pointer',
  },
});
