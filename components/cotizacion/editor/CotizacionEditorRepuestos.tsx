import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, TouchableOpacity, View } from 'react-native';
import { Sparkles, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { Card } from '@/app/design-system/components';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { CotizacionPreciosEstadoBanner } from '@/components/cotizacion/CotizacionPreciosEstadoBanner';
import { FuenteFichaInterna } from '@/components/cotizacion/FuenteFichaInterna';
import { ReferenciaTiendaLinea } from '@/components/cotizacion/ReferenciaTiendaLinea';
import { MargenRepuestoLinea } from '@/components/cotizacion/MargenRepuestos';
import { ValidacionRepuestoLinea } from '@/components/cotizacion/ValidacionCotizacion';
import { SugerenciaLinea } from '@/components/cotizacion/SugerenciaLinea';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { TallerPildora } from '@/components/taller/TallerPildora';
import { esLineaSugerida, sugerenciaEstado, type SugerenciaEstado } from '@/utils/decisionCotizador';
import {
  badgeConsolidacion,
  casaRepuestosLabel,
  certezaDe,
  estadoLinea,
  etiquetaBanda,
  formatRangoClp,
  labelFamilia,
  metaLineaTexto,
  motivoSeleccionCasa,
  motivoSinPrecio,
  opcionesFamilia,
} from '@/components/cotizacion/repuestoCerteza';
import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { patchPrecioEscritoPorTaller } from '@/services/cotizacionCanalService';
import { showConfirm } from '@/utils/platformAlert';
import { estilosPartes as styles } from '@/components/cotizacion/editor/estilosPartesEditor';

const I = COLORS.institutional;

export function subtotalRepuesto(rep: RepuestoCotizacion): number {
  return redondearCLP(redondearCLP(rep.cantidad || 1) * redondearCLP(rep.precio_unitario_clp));
}

function proveedorLabel(rep: RepuestoCotizacion): string | null {
  const nombre = (rep.proveedor_nombre || '').trim();
  if (nombre) return nombre;
  const tienda = (rep.tienda_ml || '').trim();
  if (tienda) return tienda;
  return null;
}

/** Una sola etiqueta de origen (tienda, proveedor o canal). */
function origenTagLabel(rep: RepuestoCotizacion): string | null {
  const nombre = proveedorLabel(rep);
  if (nombre) return nombre;
  const key = (rep.fuente_marketplace || rep.fuente_repuesto || '').trim().toLowerCase();
  if (key === 'web') return 'Búsqueda web';
  if (key === 'catalogo' || key === 'catálogo') return 'Catálogo del taller';
  if (key === 'historial') return 'Historial del taller';
  if (key === 'mercadolibre') return 'Mercado Libre';
  return null;
}

const RepuestoRow = React.memo(function RepuestoRow({
  rep,
  index,
  editable,
  buscandoPrecio = false,
  vehiculoAnio,
  onUpdate,
  onDelete,
  onConfirmar,
  onEspecificacion,
  onBuscarIa,
  puedeBuscarIa = false,
  rangoCliente = null,
  onConsultarCasas,
  consultandoCasas = false,
  onDecidirSugerencia,
}: {
  rep: RepuestoCotizacion;
  index: number;
  editable: boolean;
  buscandoPrecio?: boolean;
  vehiculoAnio?: number | string | null;
  onUpdate: (index: number, patch: Partial<RepuestoCotizacion>) => void;
  onDelete: (index: number) => void;
  onConfirmar: (rep: RepuestoCotizacion) => void;
  onEspecificacion: (rep: RepuestoCotizacion, spec: string) => void;
  onBuscarIa?: (rep: RepuestoCotizacion) => void;
  puedeBuscarIa?: boolean;
  rangoCliente?: string | null;
  onConsultarCasas?: (rep: RepuestoCotizacion, soloRestantes?: boolean) => void;
  consultandoCasas?: boolean;
  onDecidirSugerencia?: (rep: RepuestoCotizacion, estado: SugerenciaEstado) => void;
}) {
  const precioUnit = redondearCLP(rep.precio_unitario_clp);
  const subtotal = subtotalRepuesto(rep);
  const precioPendiente = buscandoPrecio && precioUnit <= 0;
  const origenLabel = origenTagLabel(rep);
  const urlProducto = (rep.url_producto || '').trim();
  const certeza = certezaDe(rep);
  const specOps = opcionesFamilia(rep);
  const rango = formatRangoClp(rep.precio_min_clp, rep.precio_max_clp);
  const minP = Math.round(Number(rep.precio_min_clp) || 0);
  const maxP = Math.round(Number(rep.precio_max_clp) || 0);
  const mostrarRango = Boolean(rango) && (
    certeza === 'sin_precio' || (minP > 0 && maxP > 0 && minP !== maxP)
  );
  const fichaClp = Math.round(Number(rep.precio_marketplace_clp) || 0);
  const hayPrecioParaConfirmar = Boolean(
    editable
    && certeza !== 'confirmado'
    && certeza !== 'asumido'
    && (precioUnit > 0 || minP > 0 || maxP > 0 || fichaClp > 0),
  );
  const estado = estadoLinea(rep);
  const metaTexto = metaLineaTexto(rep);
  const casaLabel = casaRepuestosLabel(rep);
  const motivo = motivoSinPrecio(rep);
  const motivoSeleccion = motivoSeleccionCasa(rep);
  const consolidacionBadge = badgeConsolidacion(rep);
  const nombreGuardado = (rep.nombre || '').trim();

  const [nombreFocused, setNombreFocused] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(nombreGuardado);
  const cantidadGuardada = Math.max(1, Math.round(Number(rep.cantidad) || 1));
  const [cantFocused, setCantFocused] = useState(false);
  const [cantDraft, setCantDraft] = useState(String(cantidadGuardada));

  useEffect(() => {
    if (nombreFocused) return;
    setNombreDraft(nombreGuardado);
  }, [nombreGuardado, nombreFocused]);

  useEffect(() => {
    if (cantFocused) return;
    setCantDraft(String(cantidadGuardada));
  }, [cantidadGuardada, cantFocused]);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Nombre"
            value={nombreDraft}
            onChangeText={(t) => {
              setNombreDraft(t);
              onUpdate(index, { nombre: t });
            }}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => {
              const next = nombreDraft.trim();
              onUpdate(index, { nombre: next });
              setNombreDraft(next);
              setNombreFocused(false);
            }}
            placeholder="Nombre del repuesto"
            editable={editable}
          />
        </View>
        {editable ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => showConfirm(
              'Eliminar repuesto',
              'Se quita de esta cotización. Cancelar lo deja como está.',
              { confirmText: 'Eliminar', cancelText: 'Cancelar', onConfirm: () => onDelete(index) },
            )}
            accessibilityRole="button"
            accessibilityLabel="Eliminar repuesto"
            hitSlop={8}
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>

      {esLineaSugerida(rep) ? (
        <SugerenciaLinea
          rep={rep}
          editable={editable}
          onDecidir={(estadoSugerencia) => (
            onDecidirSugerencia
              ? onDecidirSugerencia(rep, estadoSugerencia)
              : onUpdate(index, { estado_sugerencia: estadoSugerencia })
          )}
        />
      ) : (
        <InstitutionalTag label="Pedido" variant="neutral" size="sm" uppercase={false} />
      )}

      <ValidacionRepuestoLinea rep={rep} />

      <View style={styles.repuestoGrid}>
        <View style={styles.gridColCant}>
          <InstitutionalField
            label="Cant."
            compact
            mono
            value={cantDraft}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '');
              setCantDraft(digits);
              const n = parseInt(digits, 10);
              if (n >= 1) onUpdate(index, { cantidad: n });
            }}
            onFocus={() => setCantFocused(true)}
            onBlur={() => {
              const n = Math.max(1, parseInt(cantDraft, 10) || 1);
              onUpdate(index, { cantidad: n });
              setCantDraft(String(n));
              setCantFocused(false);
            }}
            keyboardType="numeric"
            editable={editable}
            inputStyle={styles.cantidadAlign}
          />
        </View>

        <View style={styles.gridColPrecio}>
          <InstitutionalText role="label" color="muted" style={styles.colLabel}>
            Precio unit.
          </InstitutionalText>
          <ClpMoneyInput
            key={`precio-${rep.id ?? index}`}
            compact
            value={precioUnit}
            editable={editable && !precioPendiente}
            placeholder={
              precioPendiente
                ? 'Buscando'
                : (certeza === 'sin_precio'
                  ? (rango || 'Buscar')
                  : '0')
            }
            onChangeValue={(next) => onUpdate(index, patchPrecioEscritoPorTaller(next))}
          />
        </View>

        <View style={styles.gridColSubtotal}>
          <InstitutionalText role="label" color="muted" style={[styles.colLabel, styles.colLabelRight]}>
            Subtotal
          </InstitutionalText>
          <View
            key={`sub-${rep.id ?? index}-${subtotal}`}
            style={styles.subtotalBox}
          >
            {precioPendiente ? (
              <ActivityIndicator size="small" color={I.muted} />
            ) : (
              <InstitutionalText
                role="numberDisplay"
                color="ink"
                style={styles.subtotalValue}
                accessibilityLabel={subtotal > 0 ? `Subtotal ${formatearMontoCLP(subtotal)}` : 'Subtotal sin precio'}
              >
                {subtotal > 0 ? formatearMontoCLP(subtotal) : '—'}
              </InstitutionalText>
            )}
          </View>
        </View>
      </View>
      {cantidadGuardada > 1 && precioUnit > 0 && !precioPendiente ? (
        <InstitutionalText role="caption" color="muted">
          {cantidadGuardada} × {formatearMontoCLP(precioUnit)} = {formatearMontoCLP(subtotal)}
        </InstitutionalText>
      ) : null}
      {rangoCliente ? (
        <InstitutionalText role="caption" color="muted">
          {rangoCliente}
        </InstitutionalText>
      ) : null}
      {editable && puedeBuscarIa && onBuscarIa && !precioPendiente ? (
        <TallerPildora
          label="Pedir precio a la IA"
          tono="suave"
          onPress={() => onBuscarIa?.(rep)}
          leading={<Sparkles size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
        />
      ) : null}
      {mostrarRango || hayPrecioParaConfirmar ? (
        <View style={styles.precioMetaRow}>
          {mostrarRango ? (
            <InstitutionalText role="caption" color="muted" style={styles.precioMetaTexto}>
              {etiquetaBanda(rep)} {rango}
            </InstitutionalText>
          ) : (
            <View style={styles.precioMetaTexto} />
          )}
          {hayPrecioParaConfirmar ? (
            <TallerPildora
              label="Confirmar precio"
              tono="coral"
              onPress={() => onConfirmar(rep)}
            />
          ) : null}
        </View>
      ) : null}
      {motivo ? (
        <InstitutionalText role="caption" color="muted">
          {motivo}
        </InstitutionalText>
      ) : null}
      <SeccionOpcional
        title="Costo, tienda y margen"
        hint={[casaLabel, origenLabel, consolidacionBadge].filter(Boolean).join(' · ') || 'Detalle de la línea'}
      >
        <View style={styles.estadoRow}>
          <InstitutionalTag label={estado.label} variant={estado.variant} size="md" />
          {consolidacionBadge ? (
            <InstitutionalTag
              label={consolidacionBadge}
              variant="info"
              size="sm"
              uppercase={false}
            />
          ) : null}
          {metaTexto ? (
            <InstitutionalText
              role="caption"
              color="muted"
              numberOfLines={1}
              style={styles.metaTexto}
            >
              {metaTexto}
            </InstitutionalText>
          ) : null}
          {rep.seleccion_cliente ? (
            <InstitutionalTag
              label="Elegido por el cliente"
              variant="success"
              size="sm"
              uppercase={false}
            />
          ) : null}
          {casaLabel ? (
            urlProducto ? (
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(urlProducto).catch(() => undefined);
                }}
                accessibilityRole="link"
                accessibilityLabel={`Abrir fuente en ${origenLabel || casaLabel}`}
                hitSlop={6}
              >
                <InstitutionalTag
                  label={casaLabel}
                  variant="neutral"
                  size="sm"
                  uppercase={false}
                />
              </TouchableOpacity>
            ) : (
              <InstitutionalTag
                label={casaLabel}
                variant="neutral"
                size="sm"
                uppercase={false}
              />
            )
          ) : null}
        </View>
        {motivoSeleccion ? (
          <View style={styles.motivoSeleccionRow}>
            <InstitutionalText
              role="caption"
              color="muted"
              style={styles.motivoSeleccionTexto}
            >
              {motivoSeleccion}
            </InstitutionalText>
          </View>
        ) : null}
        <ReferenciaTiendaLinea rep={rep} />
        <MargenRepuestoLinea rep={rep} />
        <FuenteFichaInterna rep={rep} vehiculoAnio={vehiculoAnio} />
        {editable && onConsultarCasas && !precioPendiente && (certeza === 'sin_precio' || rep.consulta_casas?.puede_consultar_otras) ? (
          <TallerPildora
            label={rep.consulta_casas?.puede_consultar_otras ? 'Consultar otras casas' : 'Consultar casas'}
            tono="suave"
            loading={consultandoCasas}
            disabled={consultandoCasas}
            onPress={() => onConsultarCasas(rep, Boolean(rep.consulta_casas?.puede_consultar_otras))}
          />
        ) : null}
        {rep.fuente_marketplace === 'casa_repuestos' && rep.proveedor_nombre ? (
          <InstitutionalText role="caption" color="muted">
            Precio de {rep.proveedor_nombre}
          </InstitutionalText>
        ) : null}
        {rep.consulta_casas?.estado === 'sin_respuesta' && rep.consulta_casas.casa ? (
          <InstitutionalText role="caption" color="muted">
            {rep.consulta_casas.casa} no respondió. La cotización sigue en espera.
          </InstitutionalText>
        ) : null}
      </SeccionOpcional>
      {rep.especificacion_pendiente && specOps.length && editable ? (
        <View style={styles.specBlock}>
          <InstitutionalText role="caption" color="muted">
            {labelFamilia(rep)}
          </InstitutionalText>
          <View style={styles.specChips}>
            {specOps.map((op) => (
              <TouchableOpacity
                key={op}
                style={styles.specChip}
                onPress={() => onEspecificacion(rep, op)}
                accessibilityRole="button"
                accessibilityLabel={`Especificación ${op}`}
              >
                <InstitutionalText role="caption" color="ink">{op}</InstitutionalText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
});


export function CotizacionEditorRepuestos({
  repuestos,
  editable,
  vehiculoAnio,
  busquedaPendiente,
  resumenPrecios,
  cotizandoItems,
  onBuscar,
  respaldoSinGemini,
  avisoMargen,
  onUpdate,
  onDelete,
  onConfirmar,
  onEspecificacion,
  onBuscarIa,
  lineaEnBusquedaWeb,
  lineaNecesitaBusquedaPrecio,
  captionRango,
  onConsultarCasas,
  consultandoRepuestoId,
  onDecidirSugerencia,
}: {
  repuestos: RepuestoCotizacion[];
  editable: boolean;
  vehiculoAnio?: number | string | null;
  busquedaPendiente: boolean;
  resumenPrecios: { conTienda: number; total: number; sinTienda: number; fichaExigente: boolean };
  cotizandoItems: boolean;
  onBuscar?: () => void;
  respaldoSinGemini: boolean;
  avisoMargen: string;
  onUpdate: (index: number, patch: Partial<RepuestoCotizacion>) => void;
  onDelete: (index: number) => void;
  onConfirmar: (rep: RepuestoCotizacion) => void;
  onEspecificacion: (rep: RepuestoCotizacion, spec: string) => void;
  onBuscarIa?: (rep: RepuestoCotizacion) => void;
  lineaEnBusquedaWeb: (rep: RepuestoCotizacion) => boolean;
  lineaNecesitaBusquedaPrecio: (rep: RepuestoCotizacion) => boolean;
  captionRango: (rep: RepuestoCotizacion) => string | null;
  onConsultarCasas?: (rep: RepuestoCotizacion, soloRestantes?: boolean) => void;
  consultandoRepuestoId: string | null;
  onDecidirSugerencia?: (rep: RepuestoCotizacion, estado: SugerenciaEstado) => void;
}) {
  const pedidos = repuestos
    .map((rep, index) => ({ rep, index }))
    .filter(({ rep }) => !esLineaSugerida(rep));
  const sugeridos = repuestos
    .map((rep, index) => ({ rep, index }))
    .filter(({ rep }) => esLineaSugerida(rep))
    .sort((a, b) => {
      const orden = { pendiente: 0, aceptada: 1, descartada: 2 } as const;
      return orden[sugerenciaEstado(a.rep)] - orden[sugerenciaEstado(b.rep)];
    });
  const pendientes = sugeridos.filter(({ rep }) => sugerenciaEstado(rep) === 'pendiente').length;

  const renderFila = ({ rep, index }: { rep: RepuestoCotizacion; index: number }) => (
    <RepuestoRow
      key={rep.id ?? `rep-${index}`}
      rep={rep}
      index={index}
      editable={editable}
      buscandoPrecio={lineaEnBusquedaWeb(rep)}
      vehiculoAnio={vehiculoAnio}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onConfirmar={onConfirmar}
      onEspecificacion={onEspecificacion}
      onBuscarIa={onBuscarIa}
      puedeBuscarIa={lineaNecesitaBusquedaPrecio(rep)}
      rangoCliente={captionRango(rep)}
      onConsultarCasas={onConsultarCasas}
      consultandoCasas={consultandoRepuestoId === String(rep.id || '')}
      onDecidirSugerencia={onDecidirSugerencia}
    />
  );

  return (
      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Ítems pedidos"
          count={pedidos.length > 0 ? pedidos.length : undefined}
        />
        <CotizacionPreciosEstadoBanner
          pendiente={busquedaPendiente}
          conTienda={resumenPrecios.conTienda}
          total={resumenPrecios.total}
          sinTienda={resumenPrecios.sinTienda}
          buscando={cotizandoItems}
          onBuscar={onBuscar}
          respaldoSinGemini={respaldoSinGemini}
          fichaExigente={resumenPrecios.fichaExigente}
        />
        <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
          {`El + pide un ítem. Pedir ayuda a la IA consulta catálogo, historial y tiendas. ${avisoMargen}`.trim()}
        </InstitutionalText>
        {editable && onBuscar ? (
          <TallerPildora
            label="Pedir ayuda a la IA"
            tono="suave"
            onPress={onBuscar}
            loading={cotizandoItems}
            disabled={cotizandoItems || busquedaPendiente}
            leading={<Sparkles size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
        ) : null}
        {pedidos.length === 0 ? (
          <Card elevated padding="host" style={styles.emptyRepuestos}>
            <InstitutionalText role="caption" color="muted">
              Aún no hay ítems pedidos. Súmelos con + o pida ayuda a la IA.
            </InstitutionalText>
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {pedidos.map(renderFila)}
          </View>
        )}
        {sugeridos.length > 0 ? (
          <View style={styles.section}>
            <InstitutionalSectionHeader
              title="Sugerencias por revisar"
              count={pendientes > 0 ? pendientes : sugeridos.length}
            />
            <InstitutionalText role="caption" color="muted">
              La IA las propone. Aceptar las suma al total. Descartar las deja fuera. Mientras estén pendientes no se cobran.
            </InstitutionalText>
            <View style={styles.repuestosList}>
              {sugeridos.map(renderFila)}
            </View>
          </View>
        ) : null}
      </View>
  );
}
