## ADDED Requirements

### Requirement: Editor de cotización en partes
El editor SHALL mostrar encabezado, repuestos, mano de obra y resumen como partes con las mismas props que ya tenía cada bloque. El cálculo de margen, el bloqueo de envío y la reapertura de un folio MUST permanecer en el padre. Una parte MUST NOT recalcular el total ni enviar el folio por su cuenta.

#### Scenario: El resumen pinta el total del padre
- **WHEN** el padre entrega un total incompleto
- **THEN** el resumen muestra «Incompleto» y no un monto inventado

#### Scenario: La validación sigue visible
- **WHEN** la cotización trae alertas o estado de validación
- **THEN** el editor sigue mostrando esa revisión en el mismo lugar

### Requirement: Accesibilidad del editor partido
Los controles movidos al partir el editor SHALL exponer un nombre accesible para el estado, el subtotal, la especificación y el total, sin agregar controles nuevos en pantalla.

#### Scenario: El total se anuncia
- **WHEN** el resumen muestra el total a pagar
- **THEN** ese monto tiene un nombre accesible con el mismo texto visible
