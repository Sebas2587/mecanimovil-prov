# cotizar-vs-agendar (delta)

## ADDED Requirements

### Requirement: Jobs distintos
Cotizar and Agendar SHALL be separate product jobs with separate fullscreen modals:
- **Cotizar** (`CotizacionLibreModal`): commercial proposal (IA, repuestos, envío canal o link público).
- **Agendar** (`AgendarDesdeCanalModal`): operational slot reservation (catálogo o servicio libre, mecánico, fecha/hora).

Agendar MUST NOT embed cotización IA generation, plantillas, editor, envío, or marcar aceptada.

Cotizar MUST NOT request mecánico assignment or fecha/hora slot selection.

### Requirement: CTAs en chat omnicanal
The omnichannel chat action bar SHALL expose two distinct actions: **Cotizar** and **Agendar**.
When a cotización aceptada exists for the conversation, **Agendar** SHALL be the primary CTA.

### Requirement: Identidad de cliente
Contact names MUST use `nombreContactoAgendable`; Meta PSIDs and numeric-only placeholders MUST NOT appear in picker cards or selected contact chips.

When opened from chat with a known conversation, the client section SHALL show a fixed chip (Cambiar) without mode tabs (Desde mensajes / Cliente nuevo).

### Requirement: Pasos compartidos
Cliente and Vehículo sections MAY share components (`ClienteCanalPickerSection`, `VehiculoPatenteSection`) but MUST NOT merge the downstream job steps.

### Requirement: Vínculo cotización → cita
When creating a cita from an accepted cotización (`cotizacionAceptadaId`), the create payload MUST include `cotizacion_canal_origen_id` so pipeline and bandeja stay consistent.

### Requirement: UI Host
Both modals SHALL follow Airbnb Hosts density: `InstitutionalSectionHeader` kickers, paper sections, one primary CTA per modal footer, brand gradient only on primary actions.
