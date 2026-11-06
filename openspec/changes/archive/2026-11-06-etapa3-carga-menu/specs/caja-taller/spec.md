## ADDED Requirements

### Requirement: Concordancia del pago de fuente

Si `legacy_no_contabilizado` es 1, el libro MUST decir «1 pago de fuente no entra al libro.» Si es mayor que 1, MUST decir «N pagos de fuente no entran al libro.» Un resumen ya cargado con cobros, devoluciones, neto o pendientes en 0 MUST seguir mostrándose como $0 y MUST NOT etiquetarse «Incompleto» ni «Sin dato». Un monto null o ausente en caja sigue «Sin dato». Un total null de cotización sigue «Incompleto».

#### Scenario: Un solo pago de fuente

- GIVEN el resumen trae `legacy_no_contabilizado` 1 y el neto en 0
- WHEN se muestra el libro
- THEN el texto dice «1 pago de fuente no entra al libro.»
- AND el neto se ve como $0

#### Scenario: Varios pagos de fuente

- GIVEN el resumen trae `legacy_no_contabilizado` 3
- WHEN se muestra el libro
- THEN el texto dice «3 pagos de fuente no entran al libro.»
