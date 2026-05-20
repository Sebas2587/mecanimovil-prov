## ADDED Requirements

### Requirement: Pie fijo de decisión en detalle de solicitud (catálogo)
Las pantallas con decisión irreversible en marketplace SHALL limitar el sticky inferior a como máximo dos acciones de igual jerarquía visual (secundaria outline + primaria filled).

#### Scenario: Asignación catálogo pendiente
- GIVEN `solicitud-detalle` con flujo catálogo en estado decisorio
- WHEN se renderiza el pie fijo
- THEN contiene como máximo dos botones: rechazo (outline, `semanticDown`) y aceptación (filled, `primary`)
- AND no incluye chat ni acciones contextuales de fecha en el pie
- AND usa tokens `I.canvas`, `I.hairline`, `SHADOWS.editorial`, `BORDERS.radius.pill`

#### Scenario: Acciones contextuales fuera del pie
- GIVEN la misma pantalla
- WHEN el proveedor necesita chat o proponer fecha
- THEN esas acciones viven en el contenido scrolleable (tarjeta de oferta o sección de fecha)
- AND el pie no duplica ninguna de ellas
