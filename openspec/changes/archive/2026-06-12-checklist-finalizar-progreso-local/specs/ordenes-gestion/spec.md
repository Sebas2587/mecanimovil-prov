## ADDED Requirements

### Requirement: Finalización de checklist según progreso real de respuestas
La app proveedor SHALL habilitar el botón de finalizar cuando todos los ítems obligatorios estén completados y el progreso calculado desde las respuestas locales sea al menos 80%, sin depender únicamente de `progreso_porcentaje` desactualizado del servidor.

#### Scenario: Checklist reabierto con respuestas ya completas
- GIVEN un checklist en estado `EN_PROGRESO` reabierto desde operaciones
- AND el API devuelve `progreso_porcentaje` bajo pero las respuestas locales están completas
- WHEN el proveedor abre el checklist con todos los obligatorios marcados
- THEN ve el botón "Finalizar checklist" habilitado
