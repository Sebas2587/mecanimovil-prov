import React from 'react';
import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { COLORS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { Card } from '@/app/design-system/components';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { TallerPildora } from '@/components/taller/TallerPildora';
import { CotizacionPreciosEstadoBanner } from '@/components/cotizacion/CotizacionPreciosEstadoBanner';
import { RepuestoRow } from '@/components/cotizacion/editor/CotizacionEditorRepuestos';
import { estilosPartes as styles } from '@/components/cotizacion/editor/estilosPartesEditor';
import { esLineaSugerida, sugerenciaEstado, type SugerenciaEstado } from '@/utils/decisionCotizador';
import {
  indiceLinea,
  type ServicioVista,
} from '@/utils/serviciosCotizacion';
import { textoPrecioVisible } from '@/utils/textoPrecioVisible';
import type { ManoObraLinea, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { redondearCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

function claveLinea(item: { id?: string | number | null; nombre?: string | null }): string {
  return String(item.id || '').trim() || String(item.nombre || '').trim();
}

export function CotizacionEditorServicios({
  grupos,
  lineasMo,
  repuestos,
  editable,
  vehiculoAnio,
  busquedaPendiente,
  resumenPrecios,
  cotizandoItems,
  onBuscar,
  respaldoSinGemini,
  avisoMargen,
  onUpdateManoObra,
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
  onAgregar,
  onAgregarManoObra,
}: {
  grupos: ServicioVista[];
  lineasMo: ManoObraLinea[];
  repuestos: RepuestoCotizacion[];
  editable: boolean;
  vehiculoAnio?: number | string | null;
  busquedaPendiente: boolean;
  resumenPrecios: { conTienda: number; total: number; sinTienda: number; fichaExigente: boolean };
  cotizandoItems: boolean;
  onBuscar?: () => void;
  respaldoSinGemini: boolean;
  avisoMargen: string;
  onUpdateManoObra: (index: number, patch: Partial<ManoObraLinea>) => void;
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
  onAgregar?: () => void;
  onAgregarManoObra?: () => void;
}) {
  const usadosRep = new Set<number>();

  const filaRepuesto = (rep: RepuestoCotizacion, index: number) => (
    <RepuestoRow
      key={rep.id ?? `rep-${index}-${rep.nombre}`}
      rep={rep}
      index={index}
      editable={editable && index >= 0}
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

  const resolverPedido = (pedido: RepuestoCotizacion) => {
    const index = indiceLinea(repuestos, pedido);
    if (index >= 0) usadosRep.add(index);
    return {
      rep: index >= 0 ? repuestos[index] : pedido,
      index,
    };
  };

  const gruposResueltos = grupos.map((grupo, grupoIndex) => {
    let moIndex = indiceLinea(lineasMo, {
      id: grupo.id,
      nombre: grupo.manoObra.nombre || grupo.nombre,
    });
    if (moIndex < 0 && lineasMo.length === grupos.length) moIndex = grupoIndex;
    return {
      grupo,
      moIndex,
      lineaMo: moIndex >= 0 ? lineasMo[moIndex] : null,
      pedidos: grupo.pedidos.map(resolverPedido),
    };
  });

  const sugeridos: { rep: RepuestoCotizacion; index: number }[] = [];
  const vistosSugeridos = new Set<string>();
  grupos.forEach((grupo) => {
    grupo.sugeridos.forEach((sugerido) => {
      const clave = claveLinea(sugerido);
      if (clave && vistosSugeridos.has(clave)) return;
      if (clave) vistosSugeridos.add(clave);
      sugeridos.push(resolverPedido(sugerido));
    });
  });
  repuestos.forEach((rep, index) => {
    if (!esLineaSugerida(rep)) return;
    const clave = claveLinea(rep);
    if (clave && vistosSugeridos.has(clave)) return;
    if (clave) vistosSugeridos.add(clave);
    usadosRep.add(index);
    sugeridos.push({ rep, index });
  });
  sugeridos.sort((a, b) => {
    const orden = { pendiente: 0, aceptada: 1, descartada: 2 } as const;
    return orden[sugerenciaEstado(a.rep)] - orden[sugerenciaEstado(b.rep)];
  });

  return (
    <View style={styles.section}>
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
      {gruposResueltos.map(({ grupo, moIndex, lineaMo, pedidos }) => {
        const horas = grupo.manoObra.horas;
        const estimada = grupo.manoObra.estimada || lineaMo?.estimada === true;
        const motivo = grupo.manoObra.motivo || lineaMo?.motivo;
        if (grupo.esOtros) {
          return pedidos.length > 0 ? (
            <View key={grupo.id} testID="servicio-grupo-otros" style={styles.section}>
              <InstitutionalSectionHeader title="Otros repuestos" count={pedidos.length} />
              <View style={styles.repuestosList}>
                {pedidos.map(({ rep, index }) => filaRepuesto(rep, index))}
              </View>
            </View>
          ) : null;
        }
        return (
          <View key={grupo.id} testID="servicio-grupo" style={styles.section}>
            <InstitutionalSectionHeader title={grupo.nombre} />
            <Card elevated padding="host" style={styles.repuestoCard}>
              <InstitutionalText role="label" color="muted" style={styles.colLabel}>
                Mano de obra
              </InstitutionalText>
              {horas != null && horas > 0 ? (
                <InstitutionalText role="caption" color="muted">
                  {horas} h
                </InstitutionalText>
              ) : null}
              {estimada ? (
                <InstitutionalTag label="Estimada" variant="neutral" size="sm" uppercase={false} />
              ) : null}
              {motivo ? (
                <InstitutionalText role="caption" color="muted">
                  {motivo}
                </InstitutionalText>
              ) : null}
              {lineaMo && moIndex >= 0 ? (
                <ClpMoneyInput
                  value={redondearCLP(lineaMo.monto_clp)}
                  editable={editable}
                  onChangeValue={(next) => onUpdateManoObra(moIndex, { monto_clp: next })}
                />
              ) : (
                <InstitutionalText role="bodyBold">
                  {textoPrecioVisible({
                    monto_clp: grupo.manoObra.monto_clp,
                    estimada: grupo.manoObra.estimada,
                  })}
                </InstitutionalText>
              )}
            </Card>
            {grupo.soloMano ? null : pedidos.length > 0 ? (
              <View style={styles.repuestosList}>
                {pedidos.map(({ rep, index }) => filaRepuesto(rep, index))}
              </View>
            ) : (
              <Card elevated padding="host" style={styles.emptyRepuestos}>
                <InstitutionalText role="caption" color="muted">
                  Sin repuestos pedidos en este servicio
                </InstitutionalText>
              </Card>
            )}
          </View>
        );
      })}
      {sugeridos.length > 0 ? (
        <View style={styles.section}>
          <InstitutionalSectionHeader
            title="Sugerencias por revisar"
            count={sugeridos.filter(({ rep }) => sugerenciaEstado(rep) === 'pendiente').length || sugeridos.length}
          />
          <InstitutionalText role="caption" color="muted">
            La IA las propone. Aceptar las suma al total. Descartar las deja fuera. Mientras estén pendientes no se cobran.
          </InstitutionalText>
          <View style={styles.repuestosList}>
            {sugeridos.map(({ rep, index }) => filaRepuesto(rep, index))}
          </View>
        </View>
      ) : null}
      <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
        {`Agregar ítem suma un repuesto. Pedir ayuda a la IA consulta catálogo, historial y tiendas. ${avisoMargen}`.trim()}
      </InstitutionalText>
      {editable && (onAgregar || onBuscar || onAgregarManoObra) ? (
        <View style={styles.accionesFila}>
          {onAgregarManoObra ? (
            <TallerPildora
              label="Agregar mano de obra"
              tono="suave"
              onPress={onAgregarManoObra}
            />
          ) : null}
          {onAgregar ? (
            <TallerPildora
              label="Agregar ítem"
              tono="suave"
              onPress={onAgregar}
            />
          ) : null}
          {onBuscar ? (
            <TallerPildora
              label="Pedir ayuda a la IA"
              tono="suave"
              onPress={onBuscar}
              loading={cotizandoItems}
              disabled={cotizandoItems || busquedaPendiente}
              leading={<Sparkles size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
