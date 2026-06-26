import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
  SHADOWS,
  withOpacity,
} from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { PaqueteCreditos } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { institutionalTagStyles } from '@/app/design-system/styles/institutionalTags';

const I = COLORS.institutional;
const TS = TYPOGRAPHY.styles;
const successTag = institutionalTagStyles('success', 'md', false);

interface PaqueteCardProps {
  paquete: PaqueteCreditos;
  destacado?: boolean;
  onPress: () => void;
}

export const PaqueteCard: React.FC<PaqueteCardProps> = ({
  paquete,
  destacado = false,
  onPress,
}) => {
  const precioFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(paquete.precio);

  const precioPorCreditoFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(paquete.precio_por_credito);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        destacado && styles.containerDestacado,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {destacado ? (
        <InstitutionalTag
          label="Recomendado"
          variant="primary"
          size="sm"
          uppercase={false}
          style={styles.badge}
        />
      ) : null}

      <View style={styles.header}>
        <InstitutionalText role="h4" style={styles.nombre}>
          {paquete.nombre}
        </InstitutionalText>
        {paquete.bonificacion_creditos > 0 ? (
          <InstitutionalTag
            label={`+${paquete.bonificacion_creditos} gratis`}
            variant="success"
            size="md"
            uppercase={false}
            leading={
              <InstitutionalIcon
                name="card-giftcard"
                size={16}
                color={successTag.iconColor}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
            style={styles.bonificacion}
          />
        ) : null}
      </View>

      <View style={styles.creditosContainer}>
        <InstitutionalText role="display" color="primary">
          {paquete.total_creditos}
        </InstitutionalText>
        <InstitutionalText role="body" color="body">
          créditos
        </InstitutionalText>
      </View>

      <View style={styles.precioContainer}>
        <InstitutionalText role="h3">{precioFormateado}</InstitutionalText>
        <InstitutionalText role="caption" color="body">
          {precioPorCreditoFormateado} por crédito
        </InstitutionalText>
      </View>

      <InstitutionalButton
        label="Comprar"
        variant="primary"
        size="compact"
        onPress={onPress}
        style={styles.buyButton}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.fixed.md,
    position: 'relative',
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  containerDestacado: {
    borderWidth: BORDERS.width.medium,
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.03),
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: SPACING.fixed.md,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  nombre: {
    flex: 1,
  },
  bonificacion: {
    marginLeft: SPACING.fixed.xs,
    flexShrink: 1,
  },
  creditosContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  precioContainer: {
    marginBottom: SPACING.fixed.md,
    gap: SPACING.fixed.xxs,
  },
  buyButton: {
    alignSelf: 'stretch',
  },
});
