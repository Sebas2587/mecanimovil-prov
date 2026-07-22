import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';

const CANVAS = COLORS.background.default;
const I = COLORS.institutional;

type CreditosHostShellProps = {
  title: string;
  loading?: boolean;
  children: React.ReactNode;
};

/** Shell Host compartido para pantallas de finanzas (canvas + Header back). */
export function CreditosHostShell({ title, loading = false, children }: CreditosHostShellProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.fill}>
        <Header title={title} showBack onBackPress={() => router.back()} />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : (
          children
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CANVAS },
  fill: { flex: 1, backgroundColor: CANVAS },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
});
