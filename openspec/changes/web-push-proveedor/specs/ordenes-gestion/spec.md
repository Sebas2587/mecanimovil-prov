# ordenes-gestion — delta web-push-proveedor

## ADDED Requirements

### Requirement: Web Push checklist pendiente
Cuando se crea orden confirmada con checklist PENDIENTE, el proveedor SHALL recibir push web.

#### Scenario: Alerta llenar checklist
- GIVEN orden en estado `confirmado` con `ChecklistInstance` estado `PENDIENTE`
- WHEN backend encola push `checklist_pendiente`
- THEN proveedor web recibe «Completa el checklist del servicio»
- AND al tocar abre `/orden-detalle/{orden_id}`
