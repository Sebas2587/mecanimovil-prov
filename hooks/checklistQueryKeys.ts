export const checklistQueryKeys = {
  instance: (ordenId: number) => ['checklist-instance', ordenId] as const,
  template: (templateId: number) => ['checklist-template', templateId] as const,
  saludSnapshot: (instanceId: number) => ['checklist-salud-snapshot', instanceId] as const,
};
