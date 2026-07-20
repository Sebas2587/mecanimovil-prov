export const checklistQueryKeys = {
  instance: (ordenId: number) => ['checklist-instance', 'orden', ordenId] as const,
  instanceCita: (citaId: number) => ['checklist-instance', 'cita', citaId] as const,
  template: (templateId: number) => ['checklist-template', templateId] as const,
  saludSnapshot: (instanceId: number) => ['checklist-salud-snapshot', instanceId] as const,
};
