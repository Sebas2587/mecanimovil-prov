import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FileText, History } from 'lucide-react-native';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { HistorialPatenteSheet } from '@/components/vehiculos/HistorialPatenteSheet';
import { PlantillasModeloSheet } from '@/components/chats/PlantillasModeloSheet';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { patenteHistorialValida } from '@/services/vehiculoService';

const I = COLORS.institutional;

type Props = {
  patente: string;
  marca?: string;
  modelo?: string;
  plantillas?: CotizacionPlantilla[];
  onUsarPlantilla?: (plantilla: CotizacionPlantilla) => void;
  disabled?: boolean;
};

/** Acciones Host al lado de la patente: historial de la red + cotizaciones del modelo. */
export function VehiculoPatenteAcciones({
  patente,
  marca,
  modelo,
  plantillas = [],
  onUsarPlantilla,
  disabled = false,
}: Props) {
  const [historialVisible, setHistorialVisible] = useState(false);
  const [plantillasVisible, setPlantillasVisible] = useState(false);

  const showHistorial = patenteHistorialValida(patente);
  const showPlantillas = Boolean(onUsarPlantilla && plantillas.length > 0);
  const ambos = showHistorial && showPlantillas;

  const abrirHistorial = useCallback(() => {
    if (!showHistorial || disabled) return;
    setHistorialVisible(true);
  }, [disabled, showHistorial]);

  const abrirPlantillas = useCallback(() => {
    if (!showPlantillas || disabled) return;
    setPlantillasVisible(true);
  }, [disabled, showPlantillas]);

  if (!showHistorial && !showPlantillas) return null;

  const labelPlantillas = plantillas.length === 1
    ? 'Histórico de cotizaciones'
    : `Histórico de cotizaciones (${plantillas.length})`;

  return (
    <>
      <View style={styles.row}>
        {showHistorial ? (
          <InstitutionalButton
            label="Ver historial"
            variant="outline"
            size="compact"
            onPress={abrirHistorial}
            disabled={disabled}
            leading={<History size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            style={ambos ? styles.btnGrow : styles.btnAuto}
          />
        ) : null}
        {showPlantillas ? (
          <InstitutionalButton
            label={labelPlantillas}
            variant="outline"
            size="compact"
            onPress={abrirPlantillas}
            disabled={disabled}
            accessibilityLabel="Ver histórico de cotizaciones de este modelo"
            leading={<FileText size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            style={ambos ? styles.btnGrow : styles.btnAuto}
          />
        ) : null}
      </View>
      {showHistorial ? (
        <HistorialPatenteSheet
          visible={historialVisible}
          onClose={() => setHistorialVisible(false)}
          patente={patente}
        />
      ) : null}
      {showPlantillas && onUsarPlantilla ? (
        <PlantillasModeloSheet
          visible={plantillasVisible}
          onClose={() => setPlantillasVisible(false)}
          plantillas={plantillas}
          marca={marca}
          modelo={modelo}
          disabled={disabled}
          onUsar={onUsarPlantilla}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  btnGrow: {
    flex: 1,
    minWidth: 148,
    minHeight: 48,
  },
  btnAuto: {
    alignSelf: 'flex-start',
  },
});

export default VehiculoPatenteAcciones;
