## ADDED Requirements

### Requirement: Las acciones flotantes no tapan la última línea
En pantallas estrechas, la ficha de la cita MUST reservar el alto del botón de más acciones más un hueco, por encima del pie. La lista de Servicios MUST reservar el alto de «Nueva cotización» cuando esa acción flota. El contenido MUST terminar por encima del botón. Las acciones, el pie y el scroll MUST permanecer.

#### Scenario: Ficha con pie y botón de más acciones
- GIVEN una ficha con pie fijo y el botón de más acciones
- WHEN se calcula el padding del scroll
- THEN el padding es mayor que el ancla del botón más su alto
- AND el ancla queda por encima del pie

#### Scenario: Lista de Servicios
- GIVEN la acción «Nueva cotización» flotando sobre la barra
- WHEN se muestra la lista
- THEN el padding inferior incluye el alto de esa acción y un hueco
