import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';

const I = COLORS.institutional;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrada' }} />
      <View style={styles.container}>
        <InstitutionalText role="h4">Esta pantalla no existe.</InstitutionalText>
        <Link href="/" asChild>
          <InstitutionalButton
            label="Ir al inicio"
            variant="secondary"
            size="compact"
            onPress={() => {}}
            style={styles.link}
          />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
