import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Car, ChevronRight } from 'lucide-react-native';
import type { SolicitudPublica } from '@/services/solicitudesService';
import { CountdownTimer } from './CountdownTimer';

export type HomeRadarSolicitudItemProps = {
  solicitud: SolicitudPublica;
  onOpenDetail: (solicitudId: string) => void;
};

function HomeRadarSolicitudItemInner({ solicitud, onOpenDetail }: HomeRadarSolicitudItemProps) {
  const solicitudId = solicitud.id;

  const handleOpen = useCallback(() => {
    onOpenDetail(solicitudId);
  }, [onOpenDetail, solicitudId]);

  const servicios = solicitud.servicios_solicitados_detail || [];
  const primerServicio = servicios[0]?.nombre || 'Servicio solicitado';
  const vehiculo = solicitud.vehiculo_info;
  const vehiculoText = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '';

  return (
    <TouchableOpacity style={styles.radarOffer} onPress={handleOpen} activeOpacity={0.8}>
      <View style={styles.radarOfferTop}>
        <View style={styles.flexOne}>
          <Text style={styles.radarOfferTitle} numberOfLines={1}>
            {primerServicio}
          </Text>
          {vehiculoText ? (
            <View style={styles.radarOfferMeta}>
              <Car size={13} color="#6B7280" />
              <Text style={styles.radarOfferMetaText}>{vehiculoText}</Text>
            </View>
          ) : null}
        </View>
        {solicitud.fecha_expiracion ? (
          <CountdownTimer targetDate={solicitud.fecha_expiracion} />
        ) : null}
      </View>
      <TouchableOpacity style={styles.radarCTA} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={styles.radarCTAText}>Cotizar Trabajo</Text>
        <ChevronRight size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

HomeRadarSolicitudItemInner.displayName = 'HomeRadarSolicitudItem';

export const HomeRadarSolicitudItem = memo(HomeRadarSolicitudItemInner);

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  radarOffer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  radarOfferTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  radarOfferTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  radarOfferMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radarOfferMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  radarCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  radarCTAText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
