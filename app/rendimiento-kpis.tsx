/**
 * Pantalla dedicada: Rendimiento / KPIs del taller (Host Detail).
 * Antes redirigía al tab dentro de /creditos.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';
import { CreditosHostShell } from '@/components/creditos/CreditosHostShell';
import { RendimientoKpisContent } from '@/components/rendimiento';

const CANVAS = COLORS.background.default;

export default function RendimientoKpisScreen() {
  return (
    <CreditosHostShell title="Rendimiento">
      <View style={styles.fill}>
        <RendimientoKpisContent />
      </View>
    </CreditosHostShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: CANVAS },
});
