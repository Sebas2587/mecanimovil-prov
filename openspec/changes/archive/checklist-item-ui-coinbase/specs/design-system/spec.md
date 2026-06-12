## ADDED Requirements

### Requirement: Header compacto del checklist
The checklist modal header SHALL use compact density and institutional typography (`base`/`xs`).

#### Scenario: Header del modal checklist
- GIVEN el proveedor abre el checklist de una orden
- WHEN se renderiza el header del modal
- THEN el título usa tipografía `base` o menor en una sola línea preferente
- AND el padding vertical es compacto
- AND el estado se muestra inline en el subtítulo

### Requirement: Barra de progreso del checklist
The checklist progress bar SHALL be thin and SHALL NOT include per-item circular step indicators.

#### Scenario: Barra de progreso del checklist
- GIVEN un checklist en progreso
- WHEN se muestra el progreso
- THEN incluye porcentaje y contador de ítems en una fila
- AND la barra tiene altura de 4px o menos
- AND no muestra una fila de círculos numerados por ítem

### Requirement: Formularios de ítem del checklist
Checklist item forms SHALL use `COLORS.institutional` tokens without hardcoded hex colors.

#### Scenario: Formulario de ítem del checklist
- GIVEN el proveedor abre un ítem del checklist
- WHEN se renderizan inputs, botones y CTAs
- THEN usa `COLORS.institutional` para colores y tipografía
- AND los bordes usan `hairline` y radios del design system
- AND el CTA primario usa `primary` y `onPrimary`
