import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Link2, MessageCircle, Phone } from 'lucide-react-native';
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
  onCopiarLink?: () => void;
  onRecordarWhatsApp?: () => void;
  onMarcarAceptada?: () => void;
  onCerrarCaso?: () => void;
};

export function CotizacionEnviadaSiguientePaso({
  cotizacion,
  loading,
  onEscribir,
  onCopiarLink,
  onRecordarWhatsApp,
  onMarcarAceptada,
  onCerrarCaso,
}: Props) {
  const paso = siguientePasoCotizacionEnviada(cotizacion);
  const { width } = useWindowDimensions();
  if (!paso) return null;
  const pendienteCompartir = Boolean(cotizacion.entrega_pendiente_compartir);
  const accionesVisibles = [onCopiarLink, onRecordarWhatsApp, onEscribir].filter(Boolean).length;
  const stackActions = width < 560 || accionesVisibles > 2;
  const rowStyle = [styles.row, stackActions && styles.rowStack];

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

      {onCopiarLink || onRecordarWhatsApp || onEscribir ? (
        <View style={rowStyle}>
          {onCopiarLink ? (
            <InstitutionalButton
              label="Copiar link"
              variant="primary"
              size="compact"
              style={styles.btn}
              leading={
                <Link2
                  size={16}
                  color={I.onPrimary}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              }
              onPress={onCopiarLink}
            />
          ) : null}
          {onRecordarWhatsApp ? (
            <InstitutionalButton
              label={pendienteCompartir ? 'Abrir WhatsApp' : 'Recordar por WhatsApp'}
              variant="secondary"
              size="compact"
              style={styles.btn}
              leading={
                <Phone
                  size={16}
                  color={COLORS.buttonSecondary.text}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              }
              onPress={onRecordarWhatsApp}
            />
          ) : null}
          {onEscribir ? (
            <InstitutionalButton
              label="Escribir"
              variant="outline"
              size="compact"
              style={styles.btn}
              leading={<MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={onEscribir}
            />
          ) : null}
        </View>
      ) : null}

      {onMarcarAceptada || onCerrarCaso ? (
        <View style={rowStyle}>
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
  rowStack: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
});
