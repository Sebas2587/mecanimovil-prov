## ADDED Requirements

### Requirement: Diálogo de botones libera la cola
`PlatformAlertHost` SHALL dequeue the visible `showAlertButtons` dialog when any of its buttons is pressed, then run that button's `onPress`. A later dialog SHALL become visible.

#### Scenario: Segundo Ahora no
- WHEN the taller dismisses «Ahora no» on a sent quote
- AND another `showAlertButtons` runs
- THEN that second dialog is visible with «Ahora no»

#### Scenario: Guardado tras Reintentar
- WHEN the checklist shows «Sin conexión» with «Reintentar»
- AND Reintentar opens the success dialog
- THEN «Tu respuesta ha sido guardada exitosamente.» is visible
