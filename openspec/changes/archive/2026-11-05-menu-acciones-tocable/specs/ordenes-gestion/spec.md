## ADDED Requirements

### Requirement: El menú de más acciones recibe el toque en su superficie
El menú abierto MUST renderizarse en un Modal de pantalla completa y MUST ser hijo de esa superficie. MUST NOT ser un absolute que desborda el botón de la cabecera. Abrir, cerrar por fondo, Escape en web o atrás MUST NOT ejecutar una acción. Una opción deshabilitada MUST NOT llamar su callback.

#### Scenario: Elegir una opción
- GIVEN el menú abierto con una opción habilitada
- WHEN se presiona esa opción
- THEN corre solo su callback y el menú se cierra

#### Scenario: Cerrar sin elegir
- GIVEN el menú abierto
- WHEN se cierra con el fondo o con atrás
- THEN ningún callback de acción corre
