import { StyleSheet } from 'react-native';
import { platformShadow } from '@/app/design-system/tokens';

/**
 * Réplica numérica de `app/(tabs)/index.tsx` para radar y ticket.
 * Si cambias allí padding/radius/márgenes, actualiza aquí para evitar layout shift.
 */
export const dashboardMirrorStyles = StyleSheet.create({
  radarOffer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    ...platformShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    }),
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 198,
  },
  ticketTop: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
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
    borderColor: '#D1D5DB',
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
