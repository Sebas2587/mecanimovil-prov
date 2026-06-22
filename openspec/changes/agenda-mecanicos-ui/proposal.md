# agenda-mecanicos-ui

## Why

Con agenda por mecánico, el calendario y la configuración de horarios deben poder
filtrarse y administrarse por mecánico, y las citas personales deben poder asignarse a un
mecánico específico.

## What Changes

- `app/configuracion-horarios.tsx`: configurar horario por mecánico (selector de mecánico).
- `app/(tabs)/calendario.tsx`: filtro por mecánico.
- `app/agendar-cita-personal.tsx`: selector de mecánico para la cita.

## Requirements

- REQ-UI-HORARIO-MECANICO: SHALL permitir configurar horario por mecánico.
- REQ-UI-CALENDARIO-FILTRO: SHALL permitir filtrar el calendario por mecánico.
- REQ-UI-CITA-MECANICO: SHALL permitir asignar la cita personal a un mecánico.
