# Delta: ordenes-gestion

## ADDED Requirements

### Requirement: Calendario unificado proveedor
El proveedor SHALL ver en calendario eventos Mecanimovil y citas personales con etiquetas distintas.

#### Scenario: Badge Personal vs Mecanimovil
- GIVEN eventos de ambos orígenes en un día
- WHEN el proveedor abre calendario
- THEN cada card muestra chip Personal o Mecanimovil

### Requirement: Cerrar cita personal
El proveedor SHALL cerrar una cita personal activa desde calendario o detalle.

#### Scenario: Cierre mueve a completadas
- GIVEN cita personal activa
- WHEN confirma "Cerrar servicio"
- THEN desaparece del calendario activo
- AND aparece en Órdenes → Completadas con etiqueta Personal

### Requirement: Cancelar y eliminar cita personal
Las citas canceladas SHALL aparecer en Rechazadas y MAY eliminarse físicamente.

#### Scenario: Eliminar solo cancelada
- GIVEN cita cancelada en tab Rechazadas
- WHEN confirma eliminar
- THEN DELETE exitoso y desaparece de la lista
