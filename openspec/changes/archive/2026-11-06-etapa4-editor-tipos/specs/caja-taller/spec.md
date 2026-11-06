## ADDED Requirements

### Requirement: Aviso sin señal en la caja
La caja SHALL mostrar un aviso cuando el dispositivo no tiene señal. El aviso MUST decir que no se consulta ni se registra hasta que vuelva la red. El checklist offline MUST permanecer igual.

#### Scenario: Sin señal
- **WHEN** el dispositivo informa que no hay señal
- **THEN** la caja muestra el aviso y no promete un registro local

#### Scenario: El teclado se cierra
- **WHEN** el teclado web se cierra
- **THEN** el pie de la caja vuelve al inset de la pantalla
