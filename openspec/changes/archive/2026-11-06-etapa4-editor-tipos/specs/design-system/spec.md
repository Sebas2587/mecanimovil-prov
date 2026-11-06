## ADDED Requirements

### Requirement: Dinero y estado a 13 px
Los textos de dinero y de estado que estaban en 10 u 11 px en créditos, perfil y las etiquetas de pestaña SHALL renderizarse a 13 px o más. El kanban que no está en el camino del dueño MUST NOT reincorporarse para cumplir este tamaño.

#### Scenario: Etiqueta de estado en créditos
- **WHEN** se muestra una etiqueta de estado o un monto que antes usaba 10 u 11 px en créditos
- **THEN** ese texto usa al menos 13 px

#### Scenario: Pestañas
- **WHEN** se muestran las etiquetas de las pestañas
- **THEN** su tamaño es al menos 13 px
