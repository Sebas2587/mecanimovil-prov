# asistente-diagnostico-cita-personal-ui

## Why

Los técnicos en sesión de mecánico abren citas personales desde el home pero no tenían acceso al asistente IA, disponible solo en detalle de órdenes Mecanimovil.

## What Changes

- Extender `asistenteDiagnosticoService` con métodos para citas personales.
- Refactor `AsistenteDiagnosticoCard` con prop `origen: 'orden' | 'cita'`.
- Integrar card en `app/cita-agenda-personal/[id].tsx` para citas activas.

## Requirements

- REQ-UI-IA-CITA-VISIBLE: la card SHALL mostrarse en citas activas visibles al mecánico/taller.
- REQ-UI-IA-CITA-API: generar/obtener SHALL usar `/citas-agenda-personal/{id}/asistente-ia/`.
