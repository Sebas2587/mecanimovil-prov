/**
 * Tarifas publicadas por marca (oferta) — vista proveedor y resumen.
 */
import type { ServicioOfertaLike } from './agruparOfertasServicio';
import { formatearMontoCLP } from './formatearMontoCLP';
import { labelTipoMotor } from './tiposMotorCatalogo';

export type TarifaPorMarca = {
  ofertaId: number;
  marcaId: number;
  marcaLabel: string;
  modeloId: number | null;
  modeloLabel: string | null;
  motorCodigo: string | null;
  motorLabel: string | null;
  precioPublico: number | null;
  disponible: boolean;
  costoManoObra: string | number;
  costoRepuestos: string | number;
  desglose: ServicioOfertaLike['desglose_precios'];
  tipoServicio: string;
};

type BuildTarifasOptions = {
  /** Si true, rellena motorLabel en cada tarifa (útil cuando el grupo mezcla motores). */
  incluirMotor?: boolean;
};

export function montoPrecioPublicoOferta(o: ServicioOfertaLike): number | null {
  const d = o.desglose_precios?.precio_final_cliente;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
    return d;
  }
  const raw = String(o.precio_publicado_cliente ?? '').trim().replace(',', '.');
  const p = parseFloat(raw);
  if (!Number.isFinite(p) || p < 0) return null;
  return p;
}

export function etiquetaMarcaOferta(o: ServicioOfertaLike): string {
  const mid = o.marca_vehiculo_seleccionada;
  const modeloNombre = o.modelo_vehiculo_info?.nombre?.trim();
  if (mid == null || mid === 0) {
    return 'Precio base';
  }
  const nombre = o.marca_vehiculo_info?.nombre?.trim();
  const marcaLabel = nombre || `Marca #${mid}`;
  if (modeloNombre) {
    return `${marcaLabel} · ${modeloNombre}`;
  }
  return marcaLabel;
}

export function buildTarifasPorMarca<T extends ServicioOfertaLike>(
  ofertas: T[],
  opts: BuildTarifasOptions = {},
): TarifaPorMarca[] {
  const incluirMotor = opts.incluirMotor === true;
  const rows = ofertas.map((o) => {
    const motorCodigo = (o.tipo_motor ?? '').trim() || null;
    return {
      ofertaId: o.id,
      marcaId: o.marca_vehiculo_seleccionada ?? 0,
      marcaLabel: etiquetaMarcaOferta(o),
      modeloId: o.modelo_vehiculo_seleccionado ?? null,
      modeloLabel: o.modelo_vehiculo_info?.nombre?.trim() || null,
      motorCodigo,
      motorLabel: incluirMotor && motorCodigo ? labelTipoMotor(motorCodigo) : null,
      precioPublico: montoPrecioPublicoOferta(o),
      disponible: o.disponible !== false,
      costoManoObra: o.costo_mano_de_obra_sin_iva,
      costoRepuestos: o.costo_repuestos_sin_iva,
      desglose: o.desglose_precios,
      tipoServicio: o.tipo_servicio || 'sin_repuestos',
    };
  });

  return rows.sort((a, b) => {
    if (a.marcaId === 0 && b.marcaId !== 0) return -1;
    if (b.marcaId === 0 && a.marcaId !== 0) return 1;
    const marcaCmp = a.marcaLabel.localeCompare(b.marcaLabel, 'es', { sensitivity: 'base' });
    if (marcaCmp !== 0) return marcaCmp;
    const aMod = a.modeloLabel ?? '';
    const bMod = b.modeloLabel ?? '';
    return aMod.localeCompare(bMod, 'es', { sensitivity: 'base' });
  });
}

export function etiquetaCantidadTarifas(tarifas: TarifaPorMarca[]): string {
  if (tarifas.length <= 1) return 'Precio publicado';
  const marcasUnicas = new Set(tarifas.map((t) => t.marcaId));
  const hayModelos = tarifas.some((t) => t.modeloLabel);
  const tiposUnicos = new Set(tarifas.map((t) => t.tipoServicio));
  const hayVariasTipos = tiposUnicos.size > 1;
  
  if (hayVariasTipos) {
    return `${tarifas.length} configuraciones · precio por marca/modelo`;
  }
  if (hayModelos || marcasUnicas.size < tarifas.length) {
    return `${tarifas.length} tarifas · precio por marca/modelo`;
  }
  return `${tarifas.length} marcas · precio por marca`;
}

export function formatearPrecioCLP(valor: number | null | undefined): string {
  return formatearMontoCLP(valor);
}
