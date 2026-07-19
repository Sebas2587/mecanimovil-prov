import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SolicitudesDisponiblesContent } from '@/components/solicitudes/SolicitudesDisponiblesContent';
import { useColorScheme } from '@/hooks/useColorScheme';
import { COLORS } from '@/app/design-system/tokens';

const I = COLORS.institutional;

const GRADIENT_LIGHT = [I.surfaceStrong, I.hairlineSoft, I.canvas] as const;
const GRADIENT_DARK = [I.surfaceDark, I.surfaceDarkElevated, I.ink] as const;

export default function SolicitudesDisponiblesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const gradientColors = isDark ? GRADIENT_DARK : GRADIENT_LIGHT;
  const headerBg = isDark ? I.surfaceDarkElevated : I.surfaceStrong;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={isDark ? [0, 0.45, 1] : [0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Solicitudes disponibles',
            headerBackTitle: '',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: headerBg,
            },
            headerTintColor: isDark ? I.onDark : I.ink,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
              color: isDark ? I.onDark : I.ink,
            },
          }}
        />
        <SolicitudesDisponiblesContent variant="screen" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
