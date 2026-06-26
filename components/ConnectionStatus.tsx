import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import connectionService from '@/services/connectionService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const onlineStatus = institutionalStatusColors('success');
const offlineStatus = institutionalStatusColors('error');

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export default function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setIsConnected(connectionService.getConnectionStatus());

    const interval = setInterval(() => {
      setIsConnected(connectionService.getConnectionStatus());
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const statusColors = isConnected ? onlineStatus : offlineStatus;

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <InstitutionalIcon
          name={isConnected ? 'wifi' : 'wifi-off'}
          size={16}
          color={statusColors.icon}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <InstitutionalText
          role="caption"
          color={statusColors.text}
          style={styles.statusText}
        >
          {isConnected ? 'En línea' : 'Desconectado'}
        </InstitutionalText>
      </View>

      {showDetails && lastUpdate ? (
        <InstitutionalText role="small" color="muted" style={styles.detailsText}>
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.sm,
    backgroundColor: withOpacity(I.ink, 0.05),
    borderRadius: BORDERS.radius.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  detailsText: {
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
