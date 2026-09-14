import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { HostPaperSection, InstitutionalTag } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { siguientePasoCotizacionEnviada } from '@/utils/cotizacionEnviadaSiguientePaso';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';

const I = COLORS.institutional;

type Props = {
  cotizacion: CotizacionCanal;
  loading?: boolean;
  onEscribir?: () => void;
  onRecordarWhatsApp?: () => void;
  onMarcarAceptada?: () => void;
  onCerrarCaso?: () => void;
};

export function CotizacionEnviadaSiguientePaso({
  cotizacion,
  loading,
  onEscribir,
  onRecordarWhatsApp,
  onMarcarAceptada,
  onCerrarCaso,
}: Props) {
  const paso = siguientePasoCotizacionEnviada(cotizacion);
  if (!paso) return null;

  return (
    <HostPaperSection style={styles.card}>
      <InstitutionalTag
        label={paso.kicker}
        variant={paso.urgencia === 'warning' ? 'warning' : 'info'}
        size="sm"
        uppercase={false}
      />
      <InstitutionalText role="h5">{paso.titulo}</InstitutionalText>
      <InstitutionalText role="caption" color={paso.urgencia === 'warning' ? 'body' : 'muted'}>
        {paso.cuerpo}
      </InstitutionalText>
      {paso.validezLabel ? (
        <InstitutionalText role="caption" color="muted">
          {paso.validezLabel}
        </InstitutionalText>
      ) : null}

      {onEscribir || onRecordarWhatsApp ? (
        <View style={styles.row}>
          {onEscribir ? (
            <InstitutionalButton
              label="Escribir"
              variant="primary"
              size="compact"
              style={styles.btn}
              leading={<MessageCircle size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={onEscribir}
            />
          ) : null}
          {onRecordarWhatsApp ? (
            <InstitutionalButton
              label="Recordar por WhatsApp"
              variant={onEscribir ? 'outline' : 'primary'}
              size="compact"
              style={styles.btn}
              leading={
                <Phone
                  size={16}
                  color={onEscribir ? I.primary : I.onPrimary}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              }
              onPress={onRecordarWhatsApp}
            />
          ) : null}
        </View>
      ) : null}

      {onMarcarAceptada || onCerrarCaso ? (
        <View style={styles.row}>
          {onCerrarCaso ? (
            <InstitutionalButton
              label="Cerrar caso"
              variant="destructiveOutline"
              size="compact"
              style={styles.btn}
              loading={loading}
              onPress={onCerrarCaso}
            />
          ) : null}
          {onMarcarAceptada ? (
            <InstitutionalButton
              label="Marcar aceptada"
              variant="success"
              size="compact"
              style={styles.btn}
              loading={loading}
              onPress={onMarcarAceptada}
            />
          ) : null}
        </View>
      ) : null}
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.fixed.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xs,
  },
  btn: {
    flex: 1,
    minWidth: 0,
  },
});
