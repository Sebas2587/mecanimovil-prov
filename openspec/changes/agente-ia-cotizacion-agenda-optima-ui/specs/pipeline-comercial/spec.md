# pipeline-comercial — delta readiness borrador agente

## ADDED Requirements

### Requirement: Señal de borrador listo en bandeja

La pestaña Bandeja (`app/(tabs)/bandeja.tsx`) SHALL mostrar en filas de borrador agente IA (`estado_raw=borrador`, origen canal):

- Badge **Lista para enviar** cuando `listo_para_enviar=true`
- Texto resumido de `pendientes_revision` cuando `listo_para_enviar=false`
- Orden visual coherente con el API (cotizaciones listas arriba)

#### Scenario: Borrador listo en bandeja
- GIVEN fila pipeline con `listo_para_enviar=true` y `cotizacion_id`
- WHEN el taller abre Bandeja
- THEN ve badge "Lista para enviar" en esa fila
- AND puede abrir Cotizar con IA en un tap

#### Scenario: Borrador con pendientes
- GIVEN `pendientes_revision=["Falta teléfono del cliente"]`
- WHEN se renderiza la fila
- THEN se muestra el pendiente principal sin abrir el detalle
