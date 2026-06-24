import { useQuery } from '@tanstack/react-query';
import { documentosAPI, type DocumentoOnboarding, type TipoDocumento } from '@/services/api';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type DocumentoLocalRow = DocumentoOnboarding & {
  esObligatorio: boolean;
  icono: string;
  nombre_amigable: string;
  descripcion: string;
};

export type PerfilDocumentosData = {
  documentos: DocumentoLocalRow[];
  tiposDocumento: TipoDocumento[];
};

const tiposDocumentoInfo: Record<
  string,
  { nombre: string; icono: string; descripcion: string; esObligatorio: boolean }
> = {
  dni_frontal: {
    nombre: 'DNI/Cédula (Frontal)',
    icono: 'credit-card',
    descripcion: 'Documento de identidad lado frontal',
    esObligatorio: true,
  },
  dni_trasero: {
    nombre: 'DNI/Cédula (Trasero)',
    icono: 'credit-card',
    descripcion: 'Documento de identidad lado trasero',
    esObligatorio: true,
  },
  licencia_conducir: {
    nombre: 'Licencia de Conducir',
    icono: 'drive-eta',
    descripcion: 'Licencia de conducir vigente',
    esObligatorio: true,
  },
  rut_fiscal: {
    nombre: 'RUT/CUIT Fiscal',
    icono: 'business',
    descripcion: 'Documento fiscal del negocio',
    esObligatorio: true,
  },
  foto_fachada: {
    nombre: 'Foto de Fachada',
    icono: 'store',
    descripcion: 'Foto exterior del taller',
    esObligatorio: false,
  },
  foto_interior: {
    nombre: 'Foto Interior',
    icono: 'home',
    descripcion: 'Foto del interior del taller',
    esObligatorio: false,
  },
  foto_equipos: {
    nombre: 'Foto de Equipos',
    icono: 'build',
    descripcion: 'Foto de herramientas y equipos',
    esObligatorio: false,
  },
  foto_herramientas: {
    nombre: 'Foto de Herramientas',
    icono: 'build',
    descripcion: 'Herramientas portátiles de trabajo',
    esObligatorio: false,
  },
  foto_vehiculo: {
    nombre: 'Foto del Vehículo',
    icono: 'directions-car',
    descripcion: 'Vehículo de trabajo del mecánico',
    esObligatorio: false,
  },
};

export { tiposDocumentoInfo as perfilTiposDocumentoInfo };

function mapDocumentos(documentosData: DocumentoOnboarding[], tiposDocumento: TipoDocumento[]) {
  return (documentosData || []).map((doc) => {
    const tipoDoc = doc?.tipo_documento;
    const info = tipoDoc ? tiposDocumentoInfo[tipoDoc] : null;
    return {
      ...doc,
      ...(info || {}),
      nombre_amigable: info?.nombre || doc?.tipo_documento || 'Documento',
      icono: info?.icono || 'insert-drive-file',
      descripcion: info?.descripcion || '',
      esObligatorio: info?.esObligatorio || false,
    };
  });
}

export function perfilDocumentosQueryKey() {
  return ['perfil-documentos'] as const;
}

export function usePerfilDocumentosQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: perfilDocumentosQueryKey(),
    queryFn: async (): Promise<PerfilDocumentosData> => {
      const [documentosData, tiposData] = await Promise.all([
        documentosAPI.obtenerMisDocumentos(),
        documentosAPI.obtenerTiposDocumento(),
      ]);
      const tiposDocumento =
        tiposData?.tipos_documento || (Array.isArray(tiposData) ? tiposData : []) || [];
      return {
        documentos: mapDocumentos(documentosData || [], tiposDocumento),
        tiposDocumento,
      };
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    documentos: data?.documentos ?? [],
    tiposDocumento: data?.tiposDocumento ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
