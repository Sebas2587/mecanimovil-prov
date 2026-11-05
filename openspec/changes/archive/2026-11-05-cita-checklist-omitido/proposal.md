# Proposal

## Why

Si una lista no trae `checklist_estado`, el avance caía en «Agendado» aunque `estado_operativo` dijera `en_ejecucion`. El serializer completo sí manda el enum, pero el feed de calendario y cualquier payload resumido pueden omitirlo.

## What Changes

- Un checklist de enum conocido afina el avance. Firma, revisión, pausa, pendiente, completado y cancelado no se pierden.
- Si el campo viene omitido, null, vacío o desconocido, manda `estado_operativo`. No se esconde una ejecución real ni un cierre.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: el avance de la cita distingue checklist explícito de campo ausente.

## Impact

- `utils/presentacionCitaTrabajo.ts` y sus tests.
- No cambia el serializer ni escribe datos.
