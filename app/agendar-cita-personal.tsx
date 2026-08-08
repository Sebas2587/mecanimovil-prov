import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { COLORS } from '@/app/design-system/tokens';

/**
 * Ruta legacy → mismo modal de agenda personal (cliente manual, sin chat).
 */
export default function AgendarCitaPersonalScreen() {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  const [visible, setVisible] = useState(true);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/calendario');
    }
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <AgendarDesdeCanalModal
        visible={visible}
        onClose={handleClose}
        initialFecha={typeof fecha === 'string' ? fecha : undefined}
        subtitle="Agenda personal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
});
