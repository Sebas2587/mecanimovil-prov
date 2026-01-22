import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import connectionService from '@/services/connectionService';

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export default function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Obtener estado inicial
    setIsConnected(connectionService.getConnectionStatus());

    // Actualizar cada 5 segundos
    const interval = setInterval(() => {
      setIsConnected(connectionService.getConnectionStatus());
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <MaterialIcons
          name={isConnected ? 'wifi' : 'wifi-off'}
          size={16}
          color={isConnected ? '#4CAF50' : '#F44336'}
        />
        <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          {isConnected ? 'En línea' : 'Desconectado'}
        </Text>
      </View>
      
      {showDetails && lastUpdate && (
        <Text style={styles.detailsText}>
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
}); 