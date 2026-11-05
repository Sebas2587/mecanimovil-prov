# Proposal

## Why

El taller recibe la cotización sin ver si el cotizador verificó la ficha, asumió el precio o pide revisión. Esos datos ya vienen en la respuesta del taller y hoy no se muestran.

## What Changes

- Cada línea de repuesto en el editor y en el desglose del pipeline muestra un badge según `validacion_estado`, con el motivo y las alertas.
- Si el texto es largo, el detalle se colapsa y se puede abrir.
- Arriba de la cotización, «Revisión del cotizador» lista `alertas_validacion`.
- Si el estado o la lista no vienen, no se muestra el badge ni el bloque.

## Capabilities

### New Capabilities

### Modified Capabilities

- `asistente-ia`: el editor y el desglose muestran la validación del cotizador por línea y el resumen de alertas.

## Impact

- Pantallas: editor compartido `CotizacionIaEditor` y desglose de `KanbanDetailModal`. No hay ruta nueva.
- Tokens: tags `success`, `neutral`, `warning` y `error` (verde, gris, ámbar, rojo). Sin hex nuevo.
- Backend: no. Solo se leen campos que ya envía `CotizacionCanalSerializer`.
