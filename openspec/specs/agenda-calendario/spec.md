# agenda-calendario Specification

## Purpose
Calendario unificado del proveedor con órdenes Mecanimovil y citas personales, filtrable por mecánico.

## Requirements

### Requirement: Filtro por mecánico
El mandante/supervisor SHALL poder filtrar la agenda por `miembro_taller` desde `app/(tabs)/calendario.tsx`.

#### Scenario: Ver agenda de un mecánico
- **WHEN** selecciona un chip de mecánico
- **THEN** el feed `proveedor-agenda` filtra eventos por ese miembro

### Requirement: Auto-filtro mecánico de equipo
Un usuario con rol `mecanico` SHALL ver solo su propia agenda sin selector manual.

### Requirement: Citas sin horario no son visitas
`GET /ordenes/proveedor-agenda/` SHALL omitir citas personales con `horario_por_confirmar=true`. Esas citas viven en Bandeja (Por agendar) hasta confirmar día y hora.

#### Scenario: Placeholder de cotización aceptada
- GIVEN una cita activa con `horario_por_confirmar=true`
- WHEN el taller abre Agenda
- THEN esa cita no aparece en el calendario
- AND aparece al confirmar horario (`horario_por_confirmar=false`)
