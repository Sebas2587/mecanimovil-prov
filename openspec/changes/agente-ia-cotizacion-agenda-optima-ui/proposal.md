# agente-ia-cotizacion-agenda-optima-ui

## Why

El backend expone `listo_para_enviar` y `pendientes_revision` en borradores y pipeline; la app proveedor debe mostrar esa señal en Bandeja y en el editor de cotización para que el taller solo revise y envíe con un clic.

## What Changes

- Bandeja: badge "Lista para enviar" / pendientes en filas borrador agente IA.
- Cotizar con IA: checklist de pendientes antes de enviar (informativo, no bloqueante).
- Orden: filas listas primero (backend ya ordena; UI respeta).

## Pareja backend

`mecanimovil-backend/openspec/changes/agente-ia-cotizacion-agenda-optima/`
