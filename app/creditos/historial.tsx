/**
 * Pantalla dedicada: Historial de créditos (compras / consumos).
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Receipt, ScrollText } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { HOST_GUTTER } from '@/app/design-system/components';
import { HistorialCompras, HistorialConsumos } from '@/components/creditos';
import { CreditosHostShell } from '@/components/creditos/CreditosHostShell';
import { useHistorialCreditosQuery } from '@/hooks/useCreditosQueries';

const I = COLORS.institutional;

type HistorialSubTab = 'compras' | 'consumos';

export default function HistorialCreditosScreen() {
  const [subTab, setSubTab] = useState<HistorialSubTab>('compras');
  const {
    compras,
    consumos,
    loading,
    isRefetching,
    refresh,
  } = useHistorialCreditosQuery(true);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <CreditosHostShell title="Historial" loading={loading}>
      <View style={styles.root}>
        <View style={[styles.tabsOuter, { paddingHorizontal: HOST_GUTTER }]}>
          <InstitutionalScreenTabs
            activeKey={subTab}
            onChange={(key) => setSubTab(key as HistorialSubTab)}
            tabs={[
              {
                key: 'compras',
                label: 'Compras',
                leading: (
                  <Receipt
                    size={14}
                    color={subTab === 'compras' ? I.onPrimary : I.muted}
                  />
                ),
                badge: compras.length > 0 ? compras.length : undefined,
              },
              {
                key: 'consumos',
                label: 'Consumos',
                leading: (
                  <ScrollText
                    size={14}
                    color={subTab === 'consumos' ? I.onPrimary : I.muted}
                  />
                ),
                badge: consumos.length > 0 ? consumos.length : undefined,
              },
            ]}
          />
        </View>
        <View style={styles.list}>
          {subTab === 'compras' ? (
            <HistorialCompras
              compras={compras}
              onRefresh={onRefresh}
              refreshing={isRefetching}
            />
          ) : (
            <HistorialConsumos
              consumos={consumos}
              onRefresh={onRefresh}
              refreshing={isRefetching}
            />
          )}
        </View>
      </View>
    </CreditosHostShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabsOuter: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  list: { flex: 1 },
});
