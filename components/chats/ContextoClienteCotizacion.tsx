import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import chatService from '@/services/chatService';
import { resumenVehiculoChat, vehiculoDesdeMensajesCliente, type LineaChat } from '@/utils/extraerVehiculoDesdeChat';

const I = COLORS.institutional;

function lineaChat(row: unknown): LineaChat | null {
  if (!row || typeof row !== 'object') return null;
  const raw = row as Record<string, unknown>;
  const texto = String(raw.mensaje ?? raw.message ?? raw.content ?? '').trim();
  if (!texto) return null;
  return {
    texto,
    propio: Boolean(raw.es_proveedor ?? raw.es_propio),
  };
}

type Props = {
  conversationId: number;
  patenteActual: string;
  onUsarPatente: (patente: string) => void;
};

/** Una fila: patente del chat y, si viene en el mensaje, marca, modelo, año, cilindraje o 4x2/4x4. */
export function ContextoClienteCotizacion({
  conversationId,
  patenteActual,
  onUsarPatente,
}: Props) {
  const { data, isError } = useQuery({
    queryKey: ['chat-contexto-cotizacion', conversationId],
    queryFn: () => chatService.getMessages(String(conversationId)),
    enabled: true,
    staleTime: 30_000,
  });

  const vehiculo = useMemo(() => {
    try {
      const lineas = (Array.isArray(data) ? data : [])
        .map(lineaChat)
        .filter((item): item is LineaChat => item != null);
      return vehiculoDesdeMensajesCliente(lineas);
    } catch {
      return vehiculoDesdeMensajesCliente([]);
    }
  }, [data]);

  if (isError || !vehiculo.patente) return null;

  const usada = vehiculo.patente === patenteActual.trim().toUpperCase();
  const detalle = resumenVehiculoChat(vehiculo);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.plate, usada && styles.plateOn]}
        onPress={() => onUsarPatente(vehiculo.patente as string)}
        accessibilityRole="button"
        accessibilityLabel={`Usar patente ${vehiculo.patente} del chat`}
      >
        <InstitutionalText role="captionBold" color={usada ? 'onPrimary' : 'ink'}>
          {vehiculo.patente}
        </InstitutionalText>
      </TouchableOpacity>
      {detalle ? (
        <InstitutionalText role="caption" color="muted" numberOfLines={1} style={styles.detalle}>
          {detalle}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  plate: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  plateOn: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
  detalle: {
    flex: 1,
    minWidth: 0,
  },
});
