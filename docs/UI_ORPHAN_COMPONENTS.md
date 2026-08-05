# Componentes UI huérfanos (embudo comercial)

Componentes existentes en el repo que **no están montados** en la navegación activa tras la arquitectura Hoy + Bandeja. No eliminar sin revisar producto; referencia para futuras limpiezas.

| Componente | Motivo |
|------------|--------|
| `components/commercial/MultiAgentKanban.tsx` | Kanban 4 columnas; duplica `PipelineSeguimientoSection` |
| `components/dashboard/HomeAtencionSection.tsx` | Reemplazado por `HomeAttentionFeed` |
| `components/dashboard/HomeSolicitudesSection.tsx` | Marketplace teaser; acceso vía `/solicitudes-disponibles` |
| `components/home/MarketplaceRequestsSection.tsx` | No cableado en Hoy |
| `components/dashboard/OportunidadesCarousel.tsx` | Radar B2C; no en feed Hoy |
| `components/home/IaActivityStrip.tsx` | Reemplazado por alerta inline + subtítulo en fila Cotizar |
| `components/home/FollowUpStrip.tsx` | Seguimiento vive en Bandeja |
| `components/home/NeedsAttentionList.tsx` | Atención vive en Bandeja / cotizar-ia |
| `components/home/HomeQuickActions.tsx` | Reemplazado por `HomeHubMenu` |
| `components/push/WebPushHomeBanner.tsx` | Reemplazado por `HomeInlineAlert` en feed |
| `components/home/CotizacionesEnviadasWidget.tsx` | Seguimiento vive en Bandeja |
| `components/home/CotizacionesPendientesSection.tsx` | HITL expandido vive en `/cotizar-ia` |
| `components/home/CitasHoySection.tsx` | Citas del día viven en tab Agenda |

**Fuentes de verdad actuales**

- Hub operativo: `components/home/HomeAttentionFeed.tsx` + `components/home/HomeHubMenu.tsx`
- Pipeline completo: `components/pipeline/PipelineSeguimientoSection.tsx` en `/(tabs)/bandeja`
- Editor cotización canal: `components/chats/CotizacionIaEditor.tsx`
