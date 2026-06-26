import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClipboardList, Landmark, ShoppingBag } from 'lucide-react-native';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
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
    <View style={styles.wrap}>
      <View style={styles.kickerPill}>
        <Text style={styles.kickerText}>CÓMO FUNCIONA</Text>
      </View>
      <InstitutionalSectionHeader title="Tu saldo en la app" />
      <Text style={styles.sectionLead}>
        Tres ideas clave para usar créditos y cobros sin fricción.
      </Text>

      <View style={styles.listCard}>
        {ITEMS.map(({ Icon, title, body }, index) => (
          <View
            key={title}
            style={[
              styles.row,
              index < ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: I.hairline },
            ]}
          >
            <View style={styles.iconPlate}>
              <Icon size={ICON_SIZE.md} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.lg,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    marginBottom: SPACING.xs,
  },
  kickerText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
    letterSpacing: 0.6,
  },
  sectionLead: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  listCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    overflow: 'hidden',
    ...SHADOWS.editorial,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceStrong,
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
