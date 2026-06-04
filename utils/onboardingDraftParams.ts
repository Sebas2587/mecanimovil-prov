import type { OnboardingDraft, ServicioSeleccionadoDraft } from '@/context/OnboardingDraftContext';
import {
  parseMarcasIdsParam,
  parseMarcasMetaParam,
  readRouteParam,
} from '@/utils/extractApiList';

type RawParams = Record<string, string | string[] | undefined>;

function pickString(params: RawParams, key: string): string {
  const v = readRouteParam(params[key]);
  return v ?? '';
}

function parseJsonArray<T>(raw: string | undefined): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function parseEsMultimarcaParam(raw: string | undefined): boolean | null {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/** Borra selecciones de pasos posteriores al cambiar multimarca ↔ especialista. */
export function clearModalityDownstreamSelections(): Pick<
  OnboardingDraft,
  'marcas' | 'marcas_meta' | 'servicios_seleccionados'
> {
  return {
    marcas: [],
    marcas_meta: [],
    servicios_seleccionados: [],
  };
}

/** Params de URL pertenecen al mismo modo de cobertura que el borrador. */
export function routeParamsMatchDraftModality(
  draftModality: boolean | null,
  params: RawParams,
): boolean {
  if (draftModality === null) return true;
  const paramModality = parseEsMultimarcaParam(readRouteParam(params.es_multimarca));
  if (paramModality === null) return true;
  return paramModality === draftModality;
}

/** Fusiona query params de expo-router al borrador (sin borrar campos ya guardados). */
export function mergeRouteParamsIntoDraft(
  draft: OnboardingDraft,
  params: RawParams,
): Partial<OnboardingDraft> {
  const partial: Partial<OnboardingDraft> = {};

  const tipo = pickString(params, 'tipo');
  if ((tipo === 'taller' || tipo === 'mecanico') && !draft.tipo) partial.tipo = tipo;

  const nombre = pickString(params, 'nombre');
  if (nombre && !draft.nombre.trim()) partial.nombre = nombre;

  const descripcion = pickString(params, 'descripcion');
  if (descripcion && !draft.descripcion.trim()) partial.descripcion = descripcion;

  const telefono = pickString(params, 'telefono');
  if (telefono && !draft.telefono.trim()) partial.telefono = telefono;

  const rut = pickString(params, 'rut');
  if (rut && !draft.rut.trim()) partial.rut = rut;

  const dni = pickString(params, 'dni');
  if (dni && !draft.dni.trim()) partial.dni = dni;

  const direccion = pickString(params, 'direccion');
  if (direccion && !draft.direccion.trim()) partial.direccion = direccion;

  const lat = pickString(params, 'direccion_lat');
  if (lat && !draft.direccion_lat.trim()) partial.direccion_lat = lat;

  const lng = pickString(params, 'direccion_lng');
  if (lng && !draft.direccion_lng.trim()) partial.direccion_lng = lng;

  const comuna = pickString(params, 'comuna');
  if (comuna && !draft.comuna.trim()) partial.comuna = comuna;

  const region = pickString(params, 'region');
  if (region && !draft.region.trim()) partial.region = region;

  const exp = pickString(params, 'experiencia_anos');
  if (exp && !draft.experiencia_anos.trim()) partial.experiencia_anos = exp;

  const esMultimarcaRaw = readRouteParam(params.es_multimarca);
  if (draft.es_multimarca === null) {
    if (esMultimarcaRaw === 'true') partial.es_multimarca = true;
    if (esMultimarcaRaw === 'false') partial.es_multimarca = false;
  }

  const draftModality = partial.es_multimarca ?? draft.es_multimarca;
  const modalityAligned = routeParamsMatchDraftModality(draftModality, params);
  const isMultimarca = draftModality === true;

  const marcasFromParam = parseMarcasIdsParam(params.marcas);
  if (
    modalityAligned &&
    !isMultimarca &&
    marcasFromParam.length &&
    draft.marcas.length === 0
  ) {
    partial.marcas = marcasFromParam;
  }

  const marcasMetaFromParam = parseMarcasMetaParam(params.marcas_meta);
  if (
    modalityAligned &&
    !isMultimarca &&
    marcasMetaFromParam.length &&
    draft.marcas_meta.length === 0
  ) {
    partial.marcas_meta = marcasMetaFromParam;
  }

  const espRaw = readRouteParam(params.especialidades);
  const espParsed = parseJsonArray<number>(espRaw);
  if (espParsed?.length && draft.especialidades.length === 0) {
    partial.especialidades = espParsed;
  }

  const servRaw = readRouteParam(params.servicios_seleccionados);
  const servParsed = parseJsonArray<{ marcaId: number; servicioId: number }>(servRaw);
  if (
    modalityAligned &&
    servParsed?.length &&
    draft.servicios_seleccionados.length === 0
  ) {
    partial.servicios_seleccionados = servParsed;
  }

  return partial;
}

/** Serializa el borrador a params de navegación (strings). */
export function draftToRouteParams(draft: OnboardingDraft): Record<string, string> {
  const params: Record<string, string> = {};

  if (draft.tipo) params.tipo = draft.tipo;
  if (draft.nombre) params.nombre = draft.nombre;
  if (draft.descripcion) params.descripcion = draft.descripcion;
  if (draft.telefono) params.telefono = draft.telefono;
  if (draft.rut) params.rut = draft.rut;
  if (draft.dni) params.dni = draft.dni;
  if (draft.direccion) params.direccion = draft.direccion;
  if (draft.direccion_lat) params.direccion_lat = draft.direccion_lat;
  if (draft.direccion_lng) params.direccion_lng = draft.direccion_lng;
  if (draft.comuna) params.comuna = draft.comuna;
  if (draft.region) params.region = draft.region;
  if (draft.experiencia_anos) params.experiencia_anos = draft.experiencia_anos;

  if (draft.es_multimarca !== null) {
    params.es_multimarca = draft.es_multimarca ? 'true' : 'false';
  }

  if (draft.marcas.length) params.marcas = JSON.stringify(draft.marcas);
  if (draft.marcas_meta.length) params.marcas_meta = JSON.stringify(draft.marcas_meta);
  if (draft.especialidades.length) params.especialidades = JSON.stringify(draft.especialidades);
  if (draft.servicios_seleccionados.length) {
    params.servicios_seleccionados = JSON.stringify(draft.servicios_seleccionados);
  }

  return params;
}

export function buildOnboardingHref(path: string, draft: OnboardingDraft): string {
  const params = new URLSearchParams();
  Object.entries(draftToRouteParams(draft)).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function serviciosDraftToState(servicios: ServicioSeleccionadoDraft[], esMultimarca: boolean) {
  if (esMultimarca) {
    return {
      genericos: new Set(servicios.map((s) => s.servicioId)),
      porMarca: {} as Record<number, Set<number>>,
    };
  }
  const porMarca: Record<number, Set<number>> = {};
  for (const { marcaId, servicioId } of servicios) {
    if (!porMarca[marcaId]) porMarca[marcaId] = new Set();
    porMarca[marcaId].add(servicioId);
  }
  return { genericos: new Set<number>(), porMarca };
}

export function stateToServiciosDraft(
  esMultimarca: boolean,
  genericos: Set<number>,
  porMarca: Record<number, Set<number>>,
): ServicioSeleccionadoDraft[] {
  if (esMultimarca) {
    return Array.from(genericos).map((servicioId) => ({ marcaId: 0, servicioId }));
  }
  const out: ServicioSeleccionadoDraft[] = [];
  for (const [marcaIdStr, set] of Object.entries(porMarca)) {
    const marcaId = Number(marcaIdStr);
    for (const servicioId of Array.from(set)) {
      out.push({ marcaId, servicioId });
    }
  }
  return out;
}

export type FinalizarBasicoDatos = {
  tipo: 'taller' | 'mecanico' | '';
  nombre: string;
  telefono: string;
  descripcion: string;
  rut: string;
  direccion: string;
  direccion_lat?: number;
  direccion_lng?: number;
  comuna: string;
  region: string;
  dni: string;
  experiencia_anos: string;
  especialidades: number[];
  marcas: number[];
  es_multimarca: boolean;
  tipo_cobertura_marca: 'multimarca' | 'especialista';
  servicios_seleccionados: ServicioSeleccionadoDraft[];
};

/** Consolida borrador en memoria + query params para la pantalla de finalizar. */
export function buildFinalizarDatosFromDraft(
  draft: OnboardingDraft,
  params: RawParams,
): FinalizarBasicoDatos {
  const merged: OnboardingDraft = { ...draft, ...mergeRouteParamsIntoDraft(draft, params) };

  const tipoParam = pickString(params, 'tipo');
  const tipo: FinalizarBasicoDatos['tipo'] =
    merged.tipo ?? (tipoParam === 'taller' || tipoParam === 'mecanico' ? tipoParam : '');

  const esMultimarcaBool = merged.es_multimarca === true;

  const latRaw = merged.direccion_lat.trim();
  const lngRaw = merged.direccion_lng.trim();
  const lat = latRaw ? parseFloat(latRaw) : undefined;
  const lng = lngRaw ? parseFloat(lngRaw) : undefined;

  return {
    tipo,
    nombre: merged.nombre,
    telefono: merged.telefono,
    descripcion: merged.descripcion,
    rut: merged.rut,
    direccion: merged.direccion,
    direccion_lat: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
    direccion_lng: lng !== undefined && Number.isFinite(lng) ? lng : undefined,
    comuna: merged.comuna,
    region: merged.region,
    dni: merged.dni,
    experiencia_anos: merged.experiencia_anos,
    especialidades: merged.especialidades,
    marcas: merged.marcas,
    es_multimarca: esMultimarcaBool,
    tipo_cobertura_marca: esMultimarcaBool ? 'multimarca' : 'especialista',
    servicios_seleccionados: merged.servicios_seleccionados,
  };
}

