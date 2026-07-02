# asistente-diagnostico-ia-ui

## Why

Los técnicos necesitan una guía de reparación contextual en la pantalla de detalle de la orden, generada con IA a partir de marca/modelo/año/cilindraje y descripción del problema.

## What Changes

- `services/asistenteDiagnosticoService.ts`
- `components/orden-detalle/AsistenteDiagnosticoCard.tsx`
- Integración en `app/orden-detalle/[id].tsx` y `app/solicitud-detalle/[id].tsx`

## Requirements

- REQ-UI-IA-GENERAR: botón para generar/regenerar guía con estado de carga.
- REQ-UI-IA-MOSTRAR: render de causas, pasos, referencia manual y disclaimer.
- REQ-UI-IA-VISIBLE: visible para taller/supervisor/mecánico asignado cuando hay orden.
