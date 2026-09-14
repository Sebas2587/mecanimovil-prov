import React, { useCallback, useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';
import {
  calidadLabel,
  formatRangoClp,
  fuentesDe,
  lineaPendientePrecio,
  montosFichaYTecho,
  nombreFuente,
  opcionesFamilia,
} from '@/components/cotizacion/repuestoCerteza';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

type Props = {
  visible: boolean;
  onClose: () => void;
  cotizacion: CotizacionCanal;
  proveedores: ProveedorRepuestos[];
  onAsumir: (ids: string[], modo?: 'techo' | 'ficha') => void;
  onEspecificacion: (repuestoId: string, spec: string) => void;
  onAbrirDetalle: (rep: RepuestoCotizacion) => void;
  loading?: boolean;
  onEnviarEstimacion?: () => void;
};

export function ConfirmarPreciosSheet({
  visible,
  onClose,
  cotizacion,
  proveedores,
  onAsumir,
  onEspecificacion,
  onAbrirDetalle,
  loading,
  onEnviarEstimacion,
}: Props) {
  const pendientes = useMemo(
    () => (cotizacion.repuestos ?? []).filter(lineaPendientePrecio),
    [cotizacion.repuestos],
  );

  const ids = useMemo(() => pendientes.map((r) => r.id || '').filter(Boolean), [pendientes]);

  const pedirTodo = useCallback(() => {
    const pref = proveedores.find((p) => p.es_preferido) || proveedores[0];
    const tel = (pref?.telefono || '').replace(/\D/g, '');
    const vehiculo = [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_anio]
      .filter(Boolean)
      .join(' ');
    const lineas = pendientes.map((r) =>
      `• ${r.cantidad || 1} × ${r.nombre}${r.especificacion ? ` — ${r.especificacion}` : ''}`,
    );
    const texto = [
      `Hola, necesito precio para ${vehiculo}${cotizacion.vehiculo_patente ? ` (${cotizacion.vehiculo_patente})` : ''}:`,
      ...lineas,
      '¿Tienen stock y a qué precio con IVA?',
    ].join('\n');
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    Linking.openURL(url).catch(() => undefined);
  }, [cotizacion, pendientes, proveedores]);

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter>
      <InstitutionalText role="h3">Confirmar precios</InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        Elige ficha o techo. Esto no envía al cliente: después aparece Enviar cotización.
        {pendientes.length
          ? ` ${pendientes.length} de ${(cotizacion.repuestos ?? []).length} sin fijar.`
          : ''}
      </InstitutionalText>
      {onEnviarEstimacion ? (
        <InstitutionalButton
          label="Enviar estimación (el cliente ve rangos)"
          variant="tertiary"
          onPress={() => {
            onClose();
            onEnviarEstimacion();
          }}
          accessibilityLabel="Enviar estimación al cliente. Ve rangos y techo, no un precio cerrado."
        />
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {pendientes.map((rep) => {
          const ops = opcionesFamilia(rep);
          const rango = formatRangoClp(rep.precio_min_clp, rep.precio_max_clp);
          const fuentes = fuentesDe(rep);
          const { ficha, techo } = montosFichaYTecho(rep);
          const hayBanda = ficha > 0 && techo > 0 && ficha !== techo;
          return (
            <View key={rep.id || rep.nombre} style={styles.row}>
              <TouchableOpacity onPress={() => onAbrirDetalle(rep)}>
                <InstitutionalText role="body">{rep.nombre}</InstitutionalText>
                {rep.especificacion ? (
                  <InstitutionalText role="caption" color="muted">{rep.especificacion}</InstitutionalText>
                ) : null}
                {rep.seleccion_cliente && calidadLabel(rep) ? (
                  <InstitutionalTag
                    label={`Elegido por el cliente · ${calidadLabel(rep)}`}
                    variant="success"
                    size="sm"
                    uppercase={false}
                  />
                ) : calidadLabel(rep) ? (
                  <InstitutionalTag
                    label={calidadLabel(rep)}
                    variant="neutral"
                    size="sm"
                    uppercase={false}
                  />
                ) : null}
                <InstitutionalText role="caption" color="muted">
                  {[
                    hayBanda
                      ? `Ficha ${formatearMontoCLP(ficha)} · techo ${formatearMontoCLP(techo)}`
                      : (rango || (rep.especificacion_pendiente ? 'Falta el tipo' : 'Sin referencia')),
                    fuentes.length ? nombreFuente(fuentes[0]) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </InstitutionalText>
              </TouchableOpacity>
              {ops.length && !rep.especificacion ? (
                <View style={styles.chips}>
                  {ops.map((op) => (
                    <TouchableOpacity
                      key={op}
                      style={styles.chip}
                      onPress={() => rep.id && onEspecificacion(rep.id, op)}
                    >
                      <InstitutionalText role="caption">{op}</InstitutionalText>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {ficha > 0 && rep.id ? (
                <InstitutionalButton
                  label={hayBanda
                    ? `Ficha ${formatearMontoCLP(ficha)}`
                    : `Usar ${formatearMontoCLP(ficha)}`}
                  variant="outline"
                  size="compact"
                  onPress={() => onAsumir([rep.id as string], 'ficha')}
                />
              ) : null}
              {hayBanda && rep.id ? (
                <InstitutionalButton
                  label={`Techo ${formatearMontoCLP(techo)}`}
                  variant="tertiary"
                  size="compact"
                  onPress={() => onAsumir([rep.id as string], 'techo')}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <InstitutionalButton
          label="Pedir todo por WhatsApp"
          variant="outline"
          onPress={pedirTodo}
        />
        <InstitutionalButton
          label="Usar precio de ficha en todas"
          onPress={() => onAsumir(ids, 'ficha')}
          loading={loading}
          disabled={!ids.length}
        />
        <InstitutionalButton
          label="Usar el techo en todas"
          variant="outline"
          onPress={() => onAsumir(ids, 'techo')}
          disabled={!ids.length || loading}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 360, marginTop: SPACING.fixed.sm },
  list: { gap: SPACING.fixed.sm },
  row: {
    gap: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
  chip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: I.surfaceSoft,
  },
  footer: { gap: SPACING.fixed.xs, paddingTop: SPACING.fixed.sm },
});
