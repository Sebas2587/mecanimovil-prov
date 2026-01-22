import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type EstadisticasProveedor } from '@/services/ordenesProveedor';

interface EstadisticasOrdenesProps {
  estadisticas: EstadisticasProveedor;
}

export const EstadisticasOrdenes: React.FC<EstadisticasOrdenesProps> = ({ estadisticas }) => {
  const estadisticasItems = [
    {
      icon: 'assignment',
      label: 'Total',
      value: (estadisticas?.total_ordenes || 0).toString(),
      color: '#6c757d',
    },
    {
      icon: 'schedule',
      label: 'Pendientes',
      value: (estadisticas?.ordenes_pendientes || 0).toString(),
      color: '#ffc107',
    },
    {
      icon: 'verified',
      label: 'Completadas',
      value: (estadisticas?.ordenes_completadas || 0).toString(),
      color: '#28a745',
    },
    {
      icon: 'cancel',
      label: 'Rechazadas',
      value: (estadisticas?.ordenes_rechazadas || 0).toString(),
      color: '#dc3545',
    },
  ];

  // Calcular tasa de aceptación
  const totalOrdenes = estadisticas?.total_ordenes || 0;
  const ordenesRechazadas = estadisticas?.ordenes_rechazadas || 0;
  const tasaAceptacion = totalOrdenes > 0 ? ((totalOrdenes - ordenesRechazadas) / totalOrdenes * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Estadísticas principales */}
      <View style={styles.statsGrid}>
        {estadisticasItems.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <MaterialIcons name={item.icon as any} size={20} color={item.color} />
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Métricas adicionales */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Tasa de Aceptación</Text>
          <Text style={[styles.metricValue, { color: '#28a745' }]}>
            {tasaAceptacion.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Calificación Promedio</Text>
          <Text style={[styles.metricValue, { color: '#007bff' }]}>
            {Number(estadisticas?.calificacion_promedio || 0).toFixed(1)}★
          </Text>
        </View>
      </View>

      {/* Información de ingresos */}
      <View style={styles.ingresoContainer}>
        <Text style={styles.ingresoLabel}>Ingresos del Mes</Text>
        <Text style={styles.ingresoValue}>
          ${Number(estadisticas?.ingresos_mes_actual || 0).toLocaleString('es-CL')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A4065',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  ingresoContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  ingresoLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  ingresoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    textAlign: 'center',
  },
}); 