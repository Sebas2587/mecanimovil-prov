import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeTabViewProps {
  children: React.ReactNode;
  style?: any;
}

export default function SafeTabView({ children, style }: SafeTabViewProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
}); 