import {
  checklistService,
  type ChecklistInstance,
  type ChecklistTemplate,
} from '@/services/checklistService';

export interface ChecklistBundle {
  instance: ChecklistInstance | null;
  template: ChecklistTemplate | null;
  isOffline: boolean;
  fetchError: string | null;
}

function extractTemplateId(instance: ChecklistInstance): number {
  if (typeof instance.checklist_template === 'number') {
    return instance.checklist_template;
  }
  if (
    typeof instance.checklist_template === 'object' &&
    instance.checklist_template &&
    (instance.checklist_template as { id?: number }).id
  ) {
    return (instance.checklist_template as { id: number }).id;
  }
  throw new Error('Template ID inválido');
}

async function loadInstanceWithTemplate(
  instance: ChecklistInstance,
  isOffline: boolean,
): Promise<ChecklistBundle> {
  if (!Array.isArray(instance.respuestas)) {
    instance.respuestas = [];
  }

  try {
    const templateId = extractTemplateId(instance);
    const templateResponse = await checklistService.getTemplate(templateId);

    if (templateResponse.success && templateResponse.data) {
      return {
        instance,
        template: templateResponse.data,
        isOffline,
        fetchError: null,
      };
    }

    return {
      instance,
      template: null,
      isOffline,
      fetchError: `Error cargando template: ${templateResponse.message}`,
    };
  } catch {
    return {
      instance,
      template: null,
      isOffline,
      fetchError: 'Error cargando template del checklist',
    };
  }
}

async function tryAutoCreateChecklist(ordenId: number): Promise<ChecklistBundle | null> {
  const ordenResponse = await checklistService.getOrdenInfo(ordenId);

  if (!ordenResponse.success || !ordenResponse.data?.lineas.length) {
    return null;
  }

  const servicioId = ordenResponse.data.lineas[0]?.servicio_id;
  if (!servicioId) {
    return null;
  }

  const templateResponse = await checklistService.getTemplateByService(servicioId);
  if (!templateResponse.success || !templateResponse.data) {
    return null;
  }

  const createResult = await checklistService.createInstance(ordenId, templateResponse.data.id);
  if (!createResult.success || !createResult.data) {
    return null;
  }

  return {
    instance: createResult.data,
    template: templateResponse.data,
    isOffline: false,
    fetchError: null,
  };
}

export async function fetchChecklistInstance(ordenId: number): Promise<ChecklistInstance | null> {
  const instanceResponse = await checklistService.getInstanceByOrder(ordenId);

  if (instanceResponse.success && instanceResponse.data) {
    return instanceResponse.data;
  }

  if (
    instanceResponse.isEmpty ||
    instanceResponse.message?.includes('404') ||
    instanceResponse.message?.includes('No se encontraron datos')
  ) {
    try {
      const autoCreated = await tryAutoCreateChecklist(ordenId);
      return autoCreated?.instance ?? null;
    } catch {
      return null;
    }
  }

  throw new Error(instanceResponse.message || 'Error al cargar el checklist');
}

export async function fetchChecklistTemplate(
  templateId: number,
): Promise<ChecklistTemplate | null> {
  const templateResponse = await checklistService.getTemplate(templateId);
  if (templateResponse.success && templateResponse.data) {
    return templateResponse.data;
  }
  return null;
}

/** Carga instancia + template para orden marketplace. */
export async function fetchChecklistBundle(ordenId: number): Promise<ChecklistBundle> {
  try {
    const instanceResponse = await checklistService.getInstanceByOrder(ordenId);
    const isOffline = instanceResponse.message?.includes('local') || false;

    if (instanceResponse.success && instanceResponse.data) {
      return loadInstanceWithTemplate(instanceResponse.data, isOffline);
    }

    if (
      instanceResponse.isEmpty ||
      instanceResponse.message?.includes('404') ||
      instanceResponse.message?.includes('No se encontraron datos')
    ) {
      try {
        const autoCreated = await tryAutoCreateChecklist(ordenId);
        if (autoCreated) {
          return autoCreated;
        }
      } catch (autoCreateError) {
        console.warn('⚠️ Error en creación automática de checklist:', autoCreateError);
      }

      return {
        instance: null,
        template: null,
        isOffline: false,
        fetchError: null,
      };
    }

    return {
      instance: null,
      template: null,
      isOffline: false,
      fetchError: instanceResponse.message || 'Error al cargar el checklist',
    };
  } catch (error) {
    console.error('❌ Error inicializando checklist:', error);
    return {
      instance: null,
      template: null,
      isOffline: false,
      fetchError: 'Error al cargar el checklist',
    };
  }
}

/** Carga instancia + template para cita personal del taller. */
export async function fetchChecklistBundleForCita(citaPersonalId: number): Promise<ChecklistBundle> {
  try {
    const instanceResponse = await checklistService.getInstanceByCitaPersonal(citaPersonalId);

    if (instanceResponse.success && instanceResponse.data) {
      return loadInstanceWithTemplate(instanceResponse.data, false);
    }

    return {
      instance: null,
      template: null,
      isOffline: false,
      fetchError: instanceResponse.isEmpty ? null : instanceResponse.message || null,
    };
  } catch {
    return {
      instance: null,
      template: null,
      isOffline: false,
      fetchError: 'Error al cargar el checklist',
    };
  }
}

export function getTemplateIdFromInstance(instance: ChecklistInstance | null | undefined): number | null {
  if (!instance) return null;
  try {
    return extractTemplateId(instance);
  } catch {
    return null;
  }
}

/** Coincide item_template con id de template (API puede devolver number o string). */
export function respuestaCompletadaParaItem(
  respuestas: ChecklistInstance['respuestas'] | undefined,
  itemTemplateId: number,
): boolean {
  if (!Array.isArray(respuestas)) return false;
  const idStr = String(itemTemplateId);
  return respuestas.some(
    (r) =>
      r.completado &&
      (r.item_template === itemTemplateId || String(r.item_template) === idStr),
  );
}

export function calcProgreso(
  instance: ChecklistInstance | null,
  template: ChecklistTemplate | null,
): number {
  if (!instance) return 0;

  const totalItems =
    template?.items?.length ??
    template?.total_items ??
    0;

  // Tras reabrir checklist, progreso_porcentaje del servidor puede quedar en 0%
  // aunque las respuestas locales ya estén completas — calcular desde respuestas.
  if (template && Array.isArray(instance.respuestas) && totalItems > 0) {
    return checklistService.calcularProgreso(instance.respuestas, totalItems);
  }

  if (instance.progreso_calculado != null) return instance.progreso_calculado;
  if (instance.progreso_porcentaje != null) return instance.progreso_porcentaje;
  return 0;
}
