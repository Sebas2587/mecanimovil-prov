# asistente-ia — delta checklist envío

## ADDED Requirements

### Requirement: Checklist de pendientes en Cotizar con IA

El modal/pantalla `CotizacionIaEditor` (`app/cotizar-ia.tsx` o componente de chat) SHALL mostrar un banner con:

- Estado **Lista para enviar** si `listo_para_enviar=true`
- Lista de `pendientes_revision` si false

El botón **Enviar** SHALL permanecer habilitado (revisión humana final); el checklist es guía, no bloqueo duro.

#### Scenario: Editor con borrador listo
- GIVEN cotización borrador con `listo_para_enviar=true`
- WHEN el taller abre el editor
- THEN ve banner verde indicando que puede enviar con un clic
- AND totales/precios visibles como hoy

#### Scenario: Editor con pendientes
- GIVEN `pendientes_revision` con ítems de catálogo o patente
- WHEN abre el editor
- THEN ve lista de pendientes antes del formulario
- AND puede completar manualmente y enviar igual
