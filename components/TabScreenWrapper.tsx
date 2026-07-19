import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/app/design-system/tokens';

interface TabScreenWrapperProps {
  children: React.ReactNode;
  style?: any;
}

export default function TabScreenWrapper({ children, style }: TabScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const bgCanvas = COLORS.background.default;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgCanvas }, style]}
      edges={['left', 'right']}
    >
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}); 