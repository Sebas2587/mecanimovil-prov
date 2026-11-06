## ADDED Requirements

### Requirement: Ficha de cita por URL

Abrir `/cita-agenda-personal/{id}` MUST seguir siendo un deep link con los mismos permisos de edición y borrado. La pantalla MUST salir de «Cargando…» cuando llega la cita, sin esperar el detalle del técnico ni un segundo intento silencioso de la misma petición. Si la cita no llega, MUST mostrar el error y un reintento. El técnico se completa después, sin tapar la ficha. La cotización de origen, si existe, carga aparte y MUST NOT reconsultar la búsqueda web del cotizador desde esta ficha.

#### Scenario: La cita llega y el técnico todavía no

- GIVEN la cita responde y el técnico todavía se está completando
- WHEN se abre `/cita-agenda-personal/85`
- THEN la ficha deja de decir «Cargando…»
- AND el enlace directo sigue abriendo esa cita

#### Scenario: La cita no responde

- GIVEN la petición de la cita falla
- WHEN se abre la ficha
- THEN no queda indefinidamente en «Cargando…»
- AND se puede reintentar
