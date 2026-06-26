import { StyleSheet } from 'react-native';
import { COLORS, platformShadow } from '@/app/design-system/tokens';

const I = COLORS.institutional;

/**
 * Réplica numérica de `app/(tabs)/index.tsx` para radar y ticket.
 * Si cambias allí padding/radius/márgenes, actualiza aquí para evitar layout shift.
 */
export const dashboardMirrorStyles = StyleSheet.create({
  radarOffer: {
    backgroundColor: I.canvas,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: I.hairlineSoft,
    gap: 10,
    minHeight: 126,
  },
  radarOfferTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  radarCTA: {
    borderRadius: 10,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ticketCard: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: I.canvas,
    ...platformShadow({
      shadowColor: COLORS.base.inkBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    }),
    borderWidth: 1,
    borderColor: I.hairlineSoft,
    minHeight: 198,
  },
  ticketTop: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: I.hairlineSoft,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  ticketDash: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: I.hairline,
    marginHorizontal: 16,
  },
  ticketBody: {
    padding: 16,
    gap: 10,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 34,
  },
});
