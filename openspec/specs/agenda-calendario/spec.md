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
