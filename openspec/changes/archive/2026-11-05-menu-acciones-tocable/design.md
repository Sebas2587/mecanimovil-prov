## Context

React Native resuelve el toque con el rectángulo de cada padre. `zIndex` no lo agranda. Un menú `position: 'absolute'` con `top: 44` dentro de un ancla de 44 px queda fuera de ese rectángulo.

## Goals / Non-Goals

**Goals:**

- La opción habilitada recibe el toque en web y en nativo.
- Cerrar no dispara callbacks. Abrir tampoco.
- El foco vuelve al botón al cerrar.

**Non-Goals:**

- No mover «Nueva cotización».
- No tratar un `press` sin coordenadas de Testing Library como prueba de hit-test nativo.

## Decisions

1. El menú usa `Modal` transparente, el mismo mecanismo que `InstitutionalModal`. El fondo y el menú son hermanos. El menú es flujo dentro de la capa a pantalla completa, no un hijo que desborda el botón.
2. `onRequestClose` cubre atrás. En web, Escape escucha `keydown` y solo cierra.

## Risks / Trade-offs

- [Jest no tiene runner nativo] → El test afirma que las opciones son hijas del Modal. El hit-test real queda descrito, no simulado.
