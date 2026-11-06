import React from 'react';
import { View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { estilosPartes as styles } from '@/components/cotizacion/editor/estilosPartesEditor';

const ESTADO_VARIANT: Record<
  CotizacionCanal['estado'],
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  borrador: 'neutral',
  enviada: 'info',
  aceptada: 'success',
  rechazada: 'error',
  expirada: 'warning',
  cancelada: 'error',
};

const ESTADO_LABEL: Record<CotizacionCanal['estado'], string> = {
  borrador: 'Por revisar',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
};

export function CotizacionEditorEncabezado({
  cotizacion,
  compactHeader = false,
  vehiculoTitulo,
}: {
  cotizacion: CotizacionCanal;
  compactHeader?: boolean;
  vehiculoTitulo: string;
}) {
  return (
      <View style={styles.headerRow}>
        {compactHeader ? (
          <View style={styles.headerTagsCol}>
            <InstitutionalText role="h3" numberOfLines={3}>
              {(cotizacion.servicio_nombre || '').trim()
                || (cotizacion.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización')}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {[
                vehiculoTitulo,
                cotizacion.vehiculo_patente ? `Patente ${cotizacion.vehiculo_patente.toUpperCase()}` : '',
                cotizacion.modalidad === 'domicilio' ? 'A domicilio' : cotizacion.modalidad ? 'En el taller' : '',
              ].filter(Boolean).join(' · ')}
            </InstitutionalText>
            <View
              style={styles.estadoQuieto}
              accessibilityRole="text"
              accessibilityLabel={`Estado ${ESTADO_LABEL[cotizacion.estado] || cotizacion.estado}`}
            >
              <View
                style={[
                  styles.estadoPunto,
                  (cotizacion.estado === 'cancelada' || cotizacion.estado === 'rechazada') && styles.estadoPuntoBaja,
                  cotizacion.estado === 'aceptada' && styles.estadoPuntoAlta,
                ]}
              />
              <InstitutionalText role="captionBold">
                {ESTADO_LABEL[cotizacion.estado] || cotizacion.estado}
              </InstitutionalText>
            </View>
            <View style={styles.headerTags}>
              {cotizacion.metadata?.origen === 'agente_ia' ? (
                <InstitutionalTag label="IA" variant="neutral" size="sm" />
              ) : null}
              {cotizacion.es_cotizacion_adicional ? (
                <InstitutionalTag label="Adicional" variant="neutral" size="sm" />
              ) : null}
              {cotizacion.estado !== 'borrador'
                && (cotizacion.tipo_documento === 'estimacion'
                  || cotizacion.tipo_documento_emitido === 'estimacion') ? (
                <InstitutionalTag label="Estimación" variant="neutral" size="sm" />
              ) : null}
            </View>
            {cotizacion.es_cotizacion_adicional && cotizacion.servicio_principal_nombre ? (
              <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                Desde: {cotizacion.servicio_principal_nombre}
              </InstitutionalText>
            ) : null}
            {cotizacion.es_cotizacion_adicional && cotizacion.motivo_servicio_adicional ? (
              <InstitutionalText role="caption" color="muted" numberOfLines={3}>
                Motivo: {cotizacion.motivo_servicio_adicional}
              </InstitutionalText>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.headerText}>
              <InstitutionalText role="h4">
                {(cotizacion.servicio_nombre || '').trim()
                  || (cotizacion.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización')}
              </InstitutionalText>
              {cotizacion.es_cotizacion_adicional && cotizacion.servicio_principal_nombre ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                  Desde: {cotizacion.servicio_principal_nombre}
                </InstitutionalText>
              ) : cotizacion.numero_publico ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                  #{cotizacion.numero_publico}
                </InstitutionalText>
              ) : null}
              {cotizacion.es_cotizacion_adicional && cotizacion.motivo_servicio_adicional ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={3}>
                  Motivo: {cotizacion.motivo_servicio_adicional}
                </InstitutionalText>
              ) : null}
            </View>
            <View style={styles.headerTags}>
              {cotizacion.metadata?.origen === 'agente_ia' ? (
                <InstitutionalTag
                  label="Generada por IA — revisa antes de enviar"
                  variant="warning"
                  size="sm"
                />
              ) : null}
              {cotizacion.metadata?.respaldo_sin_gemini ? (
                <InstitutionalTag label="Completar precios" variant="info" size="sm" />
              ) : null}
              {cotizacion.es_cotizacion_adicional ? (
                <InstitutionalTag label="Adicional" variant="adicional" size="sm" />
              ) : null}
              <InstitutionalTag
                label={cotizacion.estado}
                variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
                size="sm"
              />
            </View>
          </>
        )}
      </View>
  );
}
