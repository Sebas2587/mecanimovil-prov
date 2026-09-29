import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { PanelConsulta } from '@/components/asistente-taller/PanelConsulta';
import type { ResultadoConsulta } from '@/utils/asistenteTaller/agenteConsulta';

const I = COLORS.institutional;

export type TurnoAgente = {
  id: string;
  pregunta: string;
  haciendo: string | null;
  resultado: ResultadoConsulta | null;
};

type Props = {
  turnos: TurnoAgente[];
  onCerrar: () => void;
};

const BurbujaDueno = React.memo(function BurbujaDueno({ texto }: { texto: string }) {
  return (
    <View style={styles.dueno}>
      <InstitutionalText role="body">{texto}</InstitutionalText>
    </View>
  );
});

const EstadoAgente = React.memo(function EstadoAgente({ texto }: { texto: string }) {
  return (
    <View style={styles.estado}>
      <ActivityIndicator size="small" color={I.primary} />
      <InstitutionalText role="caption" color="muted">
        {texto}
      </InstitutionalText>
    </View>
  );
});

export const HiloAgente = React.memo(function HiloAgente({ turnos, onCerrar }: Props) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [turnos]);

  return (
    <View style={styles.lienzo}>
      <View style={styles.cabeza}>
        <InstitutionalText role="caption" color="muted">
          Agente del taller
        </InstitutionalText>
        <Pressable
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel="Volver a los leads"
          hitSlop={8}
          style={styles.cerrar}
        >
          <X size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      </View>
      <ScrollView
        ref={ref}
        style={styles.flex}
        contentContainerStyle={styles.hilo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {turnos.map((turno) => (
          <View key={turno.id} style={styles.turno}>
            <BurbujaDueno texto={turno.pregunta} />
            {turno.haciendo ? <EstadoAgente texto={turno.haciendo} /> : null}
            {turno.resultado ? <PanelConsulta resultado={turno.resultado} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  lienzo: {
    flex: 1,
    minHeight: 0,
    backgroundColor: I.paper,
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  cabeza: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.sm,
  },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
  },
  hilo: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.md,
  },
  turno: {
    gap: SPACING.fixed.sm,
  },
  dueno: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: I.surfaceSoft,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
});
