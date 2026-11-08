import { Stack, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { AppHeader } from '@/app/design-system/components/AppHeader';

const I = COLORS.institutional;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'No encontrada' }} />
      <View style={styles.screen}>
        <AppHeader title="No encontrada" showBack onBackPress={() => router.replace('/')} />
        <View style={styles.container}>
          <InstitutionalText role="h4">Esta pantalla no existe.</InstitutionalText>
          <InstitutionalButton
            label="Ir al inicio"
            variant="secondary"
            size="compact"
            onPress={() => router.replace('/')}
            style={styles.link}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
    backgroundColor: I.canvas,
  },
  link: {
    marginTop: SPACING.fixed.md,
  },
});
