import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components/Card';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { formatearMontoCLP, montoConocidoCLP } from '@/utils/formatearMontoCLP';
import {
  ETIQUETA_NETO,
  entradaManualDevolvible,
  notaExigible,
  textoMargenContratado,
  textoMargenEstimado,
  textoMargenReal,
  textoFaltantesResumen,
  textoFilasSinEfecto,
  textoPagosFuenteFuera,
  textoResultadoCaja,
  etiquetaTipoMovimiento,
  tituloHumano,
  type CasoCaja,
  type MovimientoCaja,
  type FalloCaja,
  type GranularidadCaja,
  type LibroCaja,
} from '@/utils/cajaTaller';

const I = COLORS.institutional;

type Props = {
  desde: string;
  hasta: string;
  granularidad: GranularidadCaja;
  onCambiarDesde: (valor: string) => void;
  onCambiarHasta: (valor: string) => void;
  onCambiarGranularidad: (valor: GranularidadCaja) => void;
  onConsultar: () => void;
  avisoPeriodo: string | null;
  /** Período que se pidió. No es el borrador del input. */
  periodoPedido?: { desde: string; hasta: string } | null;
  cargando: boolean;
  fallo: FalloCaja | null;
  libro: LibroCaja | null;
  onPaginaMovimientos: (pagina: number) => void;
  onPaginaCasos: (pagina: number) => void;
  puedeRegistrar: boolean;
  puedeCosto: boolean;
  onRegistrarCobro: () => void;
  onRegistrarCosto: () => void;
  onDevolverEntrada?: (movimiento: MovimientoCaja) => void;
  notaServidor?: string | null;
};

const GRANOS: { id: GranularidadCaja; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
];

function pesos(valor: number | null | undefined): string {
  return montoConocidoCLP(valor) ?? 'Sin dato';
}

function margenVisible(texto: string | null): string | null {
  if (texto == null) return null;
  if (texto.endsWith('incompleto')) return texto;
  const n = Number(texto);
  return Number.isFinite(n) ? formatearMontoCLP(n) : texto;
}

export function CajaLibro({
  desde,
  hasta,
  granularidad,
  onCambiarDesde,
  onCambiarHasta,
  onCambiarGranularidad,
  onConsultar,
  avisoPeriodo,
  periodoPedido = null,
  cargando,
  fallo,
  libro,
  onPaginaMovimientos,
  onPaginaCasos,
  puedeRegistrar,
  puedeCosto,
  onRegistrarCobro,
  onRegistrarCosto,
  onDevolverEntrada,
  notaServidor,
}: Props) {
  const resumen = libro?.resumen;
  const movimientos = libro?.movimientos;
  const casos = libro?.casos;
  const libroVacio = Boolean(libro && movimientos && movimientos.count === 0 && casos && casos.count === 0);
  const pagosFuente = resumen ? textoPagosFuenteFuera(resumen.legacy_no_contabilizado) : null;

  return (
    <View style={styles.marco}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <InstitutionalText role="caption" color="muted">
          Este libro es provisional. Cobros menos devoluciones no es ganancia.
        </InstitutionalText>
        {notaServidor ? (
          <InstitutionalText role="caption" color="ink">{notaServidor}</InstitutionalText>
        ) : null}

        <View style={styles.fechas}>
          <CampoFecha label="Desde" valor={desde} onChange={onCambiarDesde} />
          <CampoFecha label="Hasta" valor={hasta} onChange={onCambiarHasta} />
        </View>
        <View style={styles.granos} accessibilityRole="tablist">
          {GRANOS.map((grano) => {
            const activo = granularidad === grano.id;
            return (
              <Pressable
                key={grano.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                onPress={() => onCambiarGranularidad(grano.id)}
                style={[styles.grano, activo && styles.granoActivo]}
              >
                <InstitutionalText role="captionBold" color={activo ? 'onPrimary' : 'ink'}>
                  {grano.label}
                </InstitutionalText>
              </Pressable>
            );
          })}
        </View>
        {avisoPeriodo ? (
          <InstitutionalText role="caption" color="primary">{avisoPeriodo}</InstitutionalText>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Consultar período" onPress={onConsultar} style={styles.consultar}>
          <InstitutionalText role="captionBold" color="onPrimary">Consultar período</InstitutionalText>
        </Pressable>

        {cargando && periodoPedido ? (
          <View style={styles.estado}>
            <ActivityIndicator color={I.primary} />
            <InstitutionalText role="body" color="muted">
              {`Cargando ${periodoPedido.desde} a ${periodoPedido.hasta}`}
            </InstitutionalText>
          </View>
        ) : null}

        {fallo ? (
          <Card elevated padding="host">
            <InstitutionalText role="bodyBold" color="ink">{fallo.mensaje}</InstitutionalText>
            {fallo.code ? (
              <InstitutionalText role="caption" color="muted">{fallo.code}</InstitutionalText>
            ) : null}
          </Card>
        ) : null}

        {resumen && libro ? (
          <Card elevated padding="host" style={styles.bloque}>
            <InstitutionalText role="caption" color="muted">
              {`Libro ${libro.desde} a ${libro.hasta}`}
            </InstitutionalText>
            <Fila label="Cobros" valor={pesos(resumen.cobros_brutos_clp)} />
            <Fila label="Devoluciones" valor={pesos(resumen.reembolsos_clp)} />
            <Fila label={ETIQUETA_NETO} valor={pesos(resumen.neto_clp)} />
            <InstitutionalText role="caption" color="muted">No es ganancia ni el total del trabajo.</InstitutionalText>
            <Fila label="Pendientes sin confirmar" valor={pesos(resumen.pendientes_no_sumados_clp)} />
            <InstitutionalText role="caption" color="muted">Esos pendientes no suman al neto.</InstitutionalText>
            {resumen.conocido_parcial ? (
              <InstitutionalText role="caption" color="muted">
                La suma es solo el libro, no el total del negocio.
              </InstitutionalText>
            ) : null}
            {textoFaltantesResumen(resumen.faltantes) ? (
              <InstitutionalText role="caption" color="muted">
                {textoFaltantesResumen(resumen.faltantes)}
              </InstitutionalText>
            ) : null}
            {pagosFuente ? (
              <InstitutionalText role="caption" color="muted">
                {pagosFuente}
              </InstitutionalText>
            ) : null}
          </Card>
        ) : null}

        {libro && !fallo && libro.serie.length > 0 ? (
          <View style={styles.bloque}>
            <InstitutionalText role="h5" color="ink">Serie</InstitutionalText>
            {libro.serie.map((bucket) => (
              <Fila
                key={`${bucket.inicio}-${bucket.fin}`}
                label={`${bucket.inicio} a ${bucket.fin}`}
                valor={pesos(bucket.neto_clp)}
              />
            ))}
          </View>
        ) : null}

        {libroVacio && !fallo ? (
          <InstitutionalText role="body" color="muted">No hay movimientos en este período.</InstitutionalText>
        ) : null}

        {movimientos && !fallo && movimientos.results.length > 0 ? (
          <View style={styles.bloque}>
            <InstitutionalText role="h5" color="ink">Movimientos</InstitutionalText>
            {movimientos.results.map((movimiento) => {
              const titulo = tituloHumano(movimiento);
              return (
                <Card key={movimiento.id} elevated padding="host" style={styles.filaCaso}>
                  <InstitutionalText role="bodyBold" color="ink">{titulo.titulo}</InstitutionalText>
                  {titulo.sinNombre ? (
                    <InstitutionalText role="caption" color="muted">Sin nombre de cliente en la respuesta.</InstitutionalText>
                  ) : null}
                  <InstitutionalText role="caption" color="body">
                    {`${etiquetaTipoMovimiento(movimiento.tipo)} · ${movimiento.componente} · ${movimiento.estado}`}
                  </InstitutionalText>
                  {movimiento.tipo === 'contracargo' ? (
                    <InstitutionalText role="caption" color="muted">
                      El contracargo lo anotó el servidor. No se suma otro monto.
                    </InstitutionalText>
                  ) : null}
                  <InstitutionalText role="bodyBold" color="ink">{pesos(movimiento.monto_clp)}</InstitutionalText>
                  <InstitutionalText role="caption" color="muted">{movimiento.fecha_local}</InstitutionalText>
                  {entradaManualDevolvible(movimiento) && onDevolverEntrada ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Devolver el cobro del ${movimiento.fecha_local} por ${pesos(movimiento.monto_clp)}`}
                      onPress={() => onDevolverEntrada(movimiento)}
                      style={styles.accionSecundaria}
                    >
                      <InstitutionalText role="captionBold" color="ink">Devolver este cobro</InstitutionalText>
                    </Pressable>
                  ) : null}
                  {movimiento.tipo === 'entrada' && movimiento.origen && String(movimiento.origen).toLowerCase() !== 'manual' ? (
                    <InstitutionalText role="caption" color="muted">
                      La devolución de Mercado Pago la confirma el servidor.
                    </InstitutionalText>
                  ) : null}
                  {!movimiento.contabiliza_clp ? (
                    <InstitutionalText role="caption" color="muted">No entra a la suma CLP.</InstitutionalText>
                  ) : null}
                </Card>
              );
            })}
            <Paginador
              pagina={movimientos.page}
              hayAnterior={Boolean(movimientos.previous)}
              haySiguiente={Boolean(movimientos.next)}
              onAnterior={() => onPaginaMovimientos(movimientos.page - 1)}
              onSiguiente={() => onPaginaMovimientos(movimientos.page + 1)}
              etiqueta="movimientos"
            />
          </View>
        ) : null}

        {casos && !fallo && casos.results.length > 0 ? (
          <View style={styles.bloque}>
            <InstitutionalText role="h5" color="ink">Casos</InstitutionalText>
            {casos.results.map((caso) => (
              <CasoFila key={`${caso.ancla_tipo}-${caso.ancla_id}`} caso={caso} />
            ))}
            <Paginador
              pagina={casos.page}
              hayAnterior={Boolean(casos.previous)}
              haySiguiente={Boolean(casos.next)}
              onAnterior={() => onPaginaCasos(casos.page - 1)}
              onSiguiente={() => onPaginaCasos(casos.page + 1)}
              etiqueta="casos"
            />
          </View>
        ) : null}
      </ScrollView>

      {puedeRegistrar ? (
        <View style={styles.pie}>
          <Pressable accessibilityRole="button" accessibilityLabel="Registrar cobro" onPress={onRegistrarCobro} style={styles.accion}>
            <InstitutionalText role="captionBold" color="onPrimary">Registrar cobro</InstitutionalText>
          </Pressable>
          {puedeCosto ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Registrar costo" onPress={onRegistrarCosto} style={styles.accionSecundaria}>
              <InstitutionalText role="captionBold" color="ink">Registrar costo</InstitutionalText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CasoFila({ caso }: { caso: CasoCaja }) {
  const titulo = tituloHumano(caso);
  const margen = margenVisible(textoMargenReal(caso));
  const resultado = margenVisible(textoResultadoCaja(caso));
  const contratado = margenVisible(textoMargenContratado(caso));
  const estimado = margenVisible(textoMargenEstimado(caso));
  const saldo = !caso.saldo_conocido || caso.saldo_clp == null
    ? 'Sin saldo contable'
    : formatearMontoCLP(caso.saldo_clp);
  const exigible = caso.exigible_conocido && caso.monto_exigible_clp != null
    ? formatearMontoCLP(caso.monto_exigible_clp)
    : 'Exigible desconocido';
  const nota = notaExigible(caso);
  const faltantes = (caso.margen_faltantes || []).filter(Boolean).join(', ');
  return (
    <Card elevated padding="host" style={styles.filaCaso}>
      <InstitutionalText role="bodyBold" color="ink">{titulo.titulo}</InstitutionalText>
      {titulo.sinNombre ? (
        <InstitutionalText role="caption" color="muted">Sin nombre de cliente en la respuesta.</InstitutionalText>
      ) : null}
      <Fila label="Estado de pago" valor={caso.estado_pago || 'unknown'} />
      <Fila label="Exigible" valor={exigible} />
      {nota ? <InstitutionalText role="caption" color="muted">{nota}</InstitutionalText> : null}
      <Fila label={ETIQUETA_NETO} valor={pesos(caso.neto_acumulado_clp)} />
      <Fila label="Saldo" valor={saldo} />
      {textoFilasSinEfecto(caso.filas_sin_efecto_contable) ? (
        <InstitutionalText role="caption" color="muted">
          {textoFilasSinEfecto(caso.filas_sin_efecto_contable)}
        </InstitutionalText>
      ) : null}
      {caso.pendientes_no_sumados_clp != null ? (
        <Fila label="Pendientes sin confirmar" valor={pesos(caso.pendientes_no_sumados_clp)} />
      ) : null}
      {Object.prototype.hasOwnProperty.call(caso, 'costo_registrado_clp') ? (
        <Fila label="Costo registrado" valor={pesos(caso.costo_registrado_clp)} />
      ) : null}
      {Object.prototype.hasOwnProperty.call(caso, 'costo_estimado_clp') ? (
        <Fila label="Costo estimado" valor={pesos(caso.costo_estimado_clp)} />
      ) : null}
      {resultado ? <Fila label="Resultado de caja" valor={resultado} /> : null}
      {margen ? <Fila label="Margen real" valor={margen} /> : null}
      {contratado ? <Fila label="Margen contratado" valor={contratado} /> : null}
      {estimado ? <Fila label="Margen estimado" valor={estimado} /> : null}
      {contratado || estimado ? (
        <InstitutionalText role="caption" color="muted">El margen contratado y el estimado no son caja.</InstitutionalText>
      ) : null}
      {faltantes ? (
        <InstitutionalText role="caption" color="muted">{`Margen incompleto: ${faltantes}.`}</InstitutionalText>
      ) : null}
    </Card>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <InstitutionalText role="caption" color="muted" style={styles.filaLabel}>{label}</InstitutionalText>
      <InstitutionalText role="captionBold" color="ink">{valor}</InstitutionalText>
    </View>
  );
}

function CampoFecha({ label, valor, onChange }: { label: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <View style={styles.campo}>
      <InstitutionalText role="caption" color="muted">{label}</InstitutionalText>
      <TextInput
        accessibilityLabel={label}
        value={valor}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="text"
        style={styles.input}
      />
    </View>
  );
}

function Paginador({
  pagina,
  hayAnterior,
  haySiguiente,
  onAnterior,
  onSiguiente,
  etiqueta,
}: {
  pagina: number;
  hayAnterior: boolean;
  haySiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
  etiqueta: string;
}) {
  return (
    <View style={styles.paginas}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Página anterior de ${etiqueta}`}
        accessibilityState={{ disabled: !hayAnterior }}
        disabled={!hayAnterior}
        onPress={onAnterior}
        style={[styles.pagina, !hayAnterior && styles.paginaOff]}
      >
        <InstitutionalText role="captionBold" color="ink">Anterior</InstitutionalText>
      </Pressable>
      <InstitutionalText role="caption" color="muted">{`Página ${pagina}`}</InstitutionalText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Página siguiente de ${etiqueta}`}
        accessibilityState={{ disabled: !haySiguiente }}
        disabled={!haySiguiente}
        onPress={onSiguiente}
        style={[styles.pagina, !haySiguiente && styles.paginaOff]}
      >
        <InstitutionalText role="captionBold" color="ink">Siguiente</InstitutionalText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { flex: 1, backgroundColor: I.canvas },
  scroll: { flex: 1 },
  contenido: {
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  fechas: { flexDirection: 'row', gap: SPACING.fixed.sm },
  campo: { flex: 1, gap: SPACING.fixed.xs },
  input: {
    minHeight: 44,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.fixed.sm,
    color: I.ink,
    backgroundColor: I.paper,
    fontSize: 16,
  },
  granos: { flexDirection: 'row', gap: SPACING.fixed.xs },
  grano: {
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
  },
  granoActivo: { backgroundColor: I.primary },
  consultar: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.primary,
  },
  estado: { alignItems: 'center', gap: SPACING.fixed.sm, paddingVertical: SPACING.fixed.md },
  bloque: { gap: SPACING.fixed.xs },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.fixed.sm, alignItems: 'center' },
  filaLabel: { flex: 1 },
  filaCaso: { gap: SPACING.fixed.xs },
  paginas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.fixed.sm },
  pagina: {
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  paginaOff: { opacity: 0.4 },
  pie: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    backgroundColor: I.paper,
  },
  accion: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.primary,
  },
  accionSecundaria: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.paper,
  },
});
