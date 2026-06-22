# taller-gestion-equipo-ui

## Why

El dueño del taller necesita administrar su equipo desde la app: mecánicos, especialidades,
modalidad por mecánico, supervisor y habilitar/deshabilitar.

## What Changes

- Nueva pantalla "Gestión de Equipo" (acceso desde Inicio → Gestión del Taller, junto a `app/gestionar-taller.tsx`).
- CRUD de mecánicos: nombre, especialidades (multi-select de categorías), `modalidad_tecnico`.
- Alta/edición de supervisor (máx. 1).
- Toggle habilitar/deshabilitar mecánico.
- Nuevo `services/equipoTallerService.ts` siguiendo el patrón de `services/api.ts`.

## Requirements

- REQ-UI-EQUIPO-LISTA: SHALL listar el equipo del taller con estado activo/inactivo.
- REQ-UI-EQUIPO-CRUD: SHALL permitir crear/editar/eliminar mecánicos.
- REQ-UI-EQUIPO-TOGGLE: SHALL permitir habilitar/deshabilitar un mecánico.
- REQ-UI-EQUIPO-SUPERVISOR: SHALL permitir designar un supervisor (máx. 1).
