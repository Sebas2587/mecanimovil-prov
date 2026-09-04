import React, { useCallback, useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';
import {
  formatRangoClp,
  fuentesDe,
  lineaPendientePrecio,
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
  onAsumir: (ids: string[]) => void;
  onEspecificacion: (repuestoId: string, spec: string) => void;
  onAbrirDetalle: (rep: RepuestoCotizacion) => void;
  loading?: boolean;
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
        {pendientes.length} de {(cotizacion.repuestos ?? []).length} repuestos sin confirmar
      </InstitutionalText>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {pendientes.map((rep) => {
          const ops = opcionesFamilia(rep);
          const rango = formatRangoClp(rep.precio_min_clp, rep.precio_max_clp);
          const fuentes = fuentesDe(rep);
          return (
            <View key={rep.id || rep.nombre} style={styles.row}>
              <TouchableOpacity onPress={() => onAbrirDetalle(rep)}>
                <InstitutionalText role="body">{rep.nombre}</InstitutionalText>
                {rep.especificacion ? (
                  <InstitutionalText role="caption" color="muted">{rep.especificacion}</InstitutionalText>
                ) : null}
                <InstitutionalText role="caption" color="muted">
                  {[
                    rango || (rep.especificacion_pendiente ? 'Falta el tipo' : 'Sin referencia'),
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
              {(rep.precio_max_clp || 0) > 0 && rep.id ? (
                <InstitutionalButton
                  label={`Techo ${formatearMontoCLP(rep.precio_max_clp || 0)}`}
                  variant="outline"
                  size="compact"
                  onPress={() => onAsumir([rep.id as string])}
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
          label="Usar el techo en todas"
          onPress={() => onAsumir(ids)}
          loading={loading}
          disabled={!ids.length}
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
