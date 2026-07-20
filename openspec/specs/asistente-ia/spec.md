# asistente-ia Specification

## Purpose
Asistente IA para diagnóstico en órdenes/solicitudes y cotización asistida en chat omnicanal (`AsistenteDiagnosticoCard`, `CotizacionIaEditor`).

## Requirements

### Requirement: Permisos por rol
Solo usuarios con permiso de IA (`puedeUsarAsistenteIaEnOrden`) SHALL ver acciones de cotización/diagnóstico IA.

#### Scenario: Mecánico de equipo sin permiso IA
- GIVEN un miembro con rol mecánico sin flag IA
- WHEN abre detalle de orden
- THEN no ve el card de asistente IA

### Requirement: Cotización IA en canal
En conversaciones omnicanal, el proveedor SHALL poder generar borrador de cotización con IA y editarlo antes de enviar.

#### Scenario: Generar cotización desde WhatsApp
- GIVEN una conversación con contexto de vehículo
- WHEN el proveedor usa cotización IA
- THEN se prellena `CotizacionCanal` editable en el modal del chat
