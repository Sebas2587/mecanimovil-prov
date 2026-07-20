# checklist-ordenes Specification

## Purpose
Checklist de servicio en órdenes directas y ofertas adjudicadas: instancia por orden, ítems configurables, fotos, firma cliente y progreso local.

## Requirements

### Requirement: Instancia de checklist por orden
Cada orden que requiere checklist SHALL tener una `ChecklistInstance` con estados PENDIENTE → EN_PROGRESO → COMPLETADO.

#### Scenario: Iniciar checklist desde OrdenCard
- GIVEN una orden aceptada que requiere checklist
- WHEN el proveedor toca «Iniciar Checklist»
- THEN se abre `ChecklistContainer` con el progreso persistido

### Requirement: Firma y cierre
El cierre de servicio SHALL requerir checklist completado y, cuando aplique, firma del cliente.

#### Scenario: Terminar servicio con checklist incompleto
- GIVEN checklist en progreso
- WHEN el proveedor intenta terminar el servicio
- THEN la UI bloquea el cierre hasta completar ítems obligatorios
