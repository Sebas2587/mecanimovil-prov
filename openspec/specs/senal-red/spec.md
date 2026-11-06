# senal-red Specification

## Purpose
TBD - created by archiving change etapa4-editor-tipos. Update Purpose after archive.

## Requirements

### Requirement: Aviso sin señal en la cotización
La cotización SHALL mostrar un aviso cuando el dispositivo no tiene señal. El aviso MUST decir que no se cotiza, no se guarda y no se envía hasta que vuelva la red, y que no hay una cola local.

#### Scenario: Sin señal en el editor
- **WHEN** el dispositivo informa que no hay señal
- **THEN** el editor muestra ese aviso

#### Scenario: Señal desconocida
- **WHEN** todavía no se conoce el estado de la red
- **THEN** el editor no muestra el aviso de sin señal
