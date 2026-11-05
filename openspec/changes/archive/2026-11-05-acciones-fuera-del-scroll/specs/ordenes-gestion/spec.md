## REMOVED Requirements

### Requirement: Las acciones flotantes no tapan la última línea

## ADDED Requirements

### Requirement: Las acciones de la ficha y la lista quedan fuera del contenido
El botón de más acciones de la cita MUST estar en la cabecera, fuera del scroll, con pie y sin pie. MUST NOT flotar sobre el contenido. En Servicios, el marco de la lista MUST terminar encima de «Nueva cotización» usando el alto medido de ese control. MUST NOT ser un padding al final del scroll. Las acciones, el pie y el zoom MUST permanecer.

#### Scenario: Ficha sin pie
- GIVEN una cita sin pie fijo y con acciones
- WHEN se abre la ficha
- THEN «Más acciones» está en la cabecera
- AND no hay un botón absoluto sobre el scroll

#### Scenario: Lista de Servicios
- GIVEN «Nueva cotización» visible
- WHEN la lista mide el control
- THEN el marco usa ese alto como margen inferior
- AND el padding del contenido no incluye esa reserva
