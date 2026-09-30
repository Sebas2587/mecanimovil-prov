import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { FilaConsulta, ResultadoConsulta } from '@/utils/asistenteTaller/agenteConsulta';

const I = COLORS.institutional;

type Props = {
  resultado: ResultadoConsulta;
  onCerrar?: () => void;
  onConfirmar?: () => void;
  onElegirFila?: (fila: FilaConsulta) => void;
};

function filaElegible(id: string): boolean {
  return id.startsWith('dest:') || id.startsWith('persona:') || id.startsWith('chat:') || id.startsWith('cotizacion:');
}

const FilaResultado = React.memo(function FilaResultado({
  fila,
  onElegir,
}: {
  fila: FilaConsulta;
  onElegir?: (fila: FilaConsulta) => void;
}) {
  const elegible = filaElegible(fila.id) && (fila.id.startsWith('chat:') || fila.id.startsWith('cotizacion:') || Boolean(onElegir));
  const onPress = useCallback(() => {
    if (fila.id.startsWith('chat:')) {
      router.push(`/chat-omnicanal?conversationId=${fila.id.slice(5)}`);
      return;
    }
    if (fila.id.startsWith('cotizacion:')) {
      router.push(`/cotizacion-canal/${fila.id.slice('cotizacion:'.length)}`);
      return;
    }
    onElegir?.(fila);
  }, [fila, onElegir]);
  const cuerpo = (
    <>
      <View style={styles.texto}>
        <InstitutionalText role="bodyBold">{fila.titulo}</InstitutionalText>
        {fila.detalle ? (
          <InstitutionalText role="caption">{fila.detalle}</InstitutionalText>
        ) : null}
      </View>
      {fila.meta ? (
        <InstitutionalText role="caption" color="muted">
          {fila.meta}
        </InstitutionalText>
      ) : null}
    </>
  );
  if (!elegible) {
    return <View style={styles.fila}>{cuerpo}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fila.titulo}
      style={styles.fila}
    >
      {cuerpo}
    </Pressable>
  );
});

export const PanelConsulta = React.memo(function PanelConsulta({
  resultado,
  onCerrar,
  onConfirmar,
  onElegirFila,
}: Props) {
  const borradorId = resultado.enlace?.cotizacion_id || 0;
  const confirmar = useCallback(() => {
    onConfirmar?.();
  }, [onConfirmar]);
  const abrirBorrador = useCallback(() => {
    if (!borradorId) return;
    router.push(`/cotizacion-canal/${borradorId}`);
  }, [borradorId]);

  return (
    <View style={styles.panel}>
      <View style={styles.cabeza}>
        <InstitutionalText role="h4" style={styles.titulo}>
          {resultado.titulo}
        </InstitutionalText>
        {onCerrar ? (
          <Pressable
            onPress={onCerrar}
            accessibilityRole="button"
            accessibilityLabel="Volver a los leads"
            hitSlop={8}
            style={styles.cerrar}
          >
            <X size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        ) : null}
      </View>
      <InstitutionalText role="body">{resultado.resumen}</InstitutionalText>
      {(resultado.pasos || []).map((paso) => (
        <InstitutionalText
          key={`${paso.estado}-${paso.texto}`}
          role="caption"
          color={paso.estado === 'ahora' ? 'primary' : 'muted'}
        >
          {paso.estado === 'ahora' ? 'Ahora' : 'Listo'} · {paso.texto}
        </InstitutionalText>
      ))}
      {resultado.siguiente ? (
        <InstitutionalText role="captionBold">
          Siguiente: {resultado.siguiente}
        </InstitutionalText>
      ) : null}
      {resultado.confirmacion && onConfirmar ? (
        <Pressable
          onPress={confirmar}
          accessibilityRole="button"
          accessibilityLabel={resultado.confirmacion.etiqueta}
          style={styles.confirmar}
        >
          <InstitutionalText role="captionBold" color="primary">
            {resultado.confirmacion.etiqueta}
          </InstitutionalText>
        </Pressable>
      ) : null}
      {resultado.filas.map((fila, index) => (
        <FilaResultado
          key={`${fila.id}-${index}`}
          fila={fila}
          onElegir={onElegirFila}
        />
      ))}
      {borradorId ? (
        <Pressable
          onPress={abrirBorrador}
          accessibilityRole="button"
          accessibilityLabel="Abrir borrador"
          style={styles.confirmar}
        >
          <InstitutionalText role="captionBold" color="primary">
            Abrir borrador
          </InstitutionalText>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: SPACING.fixed.sm,
  },
  cabeza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  titulo: {
    flex: 1,
  },
  confirmar: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: I.surfaceSoft,
  },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  texto: {
    flex: 1,
    gap: 2,
  },
});
