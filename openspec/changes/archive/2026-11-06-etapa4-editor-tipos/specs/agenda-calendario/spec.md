## ADDED Requirements

### Requirement: Cita descartada fuera de la agenda comercial
AgendaComercial SHALL armar sus carriles solo con eventos presentes. Una cita cerrada o cancelada que se descarta al cruzar el calendario MUST NOT quedar en la lista como un evento nulo.

#### Scenario: Cita cerrada
- **WHEN** el calendario marca la cita como cerrada o cancelada
- **THEN** esa cita no entra a próximas, taller ni firma
