import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClipboardList, Landmark, ShoppingBag } from 'lucide-react-native';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { HostSectionKicker, Card, hostScreenStyles } from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/app/design-system/iconography';

const I = COLORS.institutional;

const ITEMS = [
  {
    Icon: ClipboardList,
    title: 'Postulá con créditos',
    body: 'Cada oferta consume créditos según el tipo de servicio.',
  },
  {
    Icon: Landmark,
    title: 'Cobros en Mercado Pago',
    body: 'Los pagos de tus clientes se acreditan en tu cuenta MP.',
  },
  {
    Icon: ShoppingBag,
    title: 'Recargá cuando quieras',
    body: 'Tienda puntual o plan mensual con mejor precio por crédito.',
  },
] as const;

/**
 * Guía educativa a ancho completo (evita texto cortado en columnas estrechas).
 * Convive mejor al final del flujo, después del resumen numérico.
 */
export const SaldoBenefitGrid = memo(function SaldoBenefitGrid() {
  return (
    <View style={[hostScreenStyles.stretch, styles.wrap]}>
      <HostSectionKicker label="Cómo funciona" />
      <InstitutionalSectionHeader title="Tu saldo en la app" />
      <Text style={styles.sectionLead}>
        Tres ideas clave para usar créditos y cobros sin fricción.
      </Text>

      <Card elevated padding={0} style={styles.listCard}>
        {ITEMS.map(({ Icon, title, body }, index) => (
          <View
            key={title}
            style={[
              styles.row,
              index < ITEMS.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: I.hairline,
              },
            ]}
          >
            <View style={styles.iconPlate}>
              <Icon size={ICON_SIZE.md} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody}>{body}</Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  sectionLead: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  listCard: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.fixed.md,
  },
  iconPlate: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
    lineHeight: 20,
    marginBottom: 4,
  },
  rowBody: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    lineHeight: 20,
  },
});
