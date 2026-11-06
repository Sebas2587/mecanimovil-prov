## ADDED Requirements

### Requirement: Precio unitario legible en 320 px
La fila de cantidad, precio unitario y subtotal de un repuesto SHALL mantener el monto formateado dentro del campo a 320 px de ancho. La columna del precio MUST NOT encogerse hasta ocultar el monto. Si las tres columnas no caben, la fila MUST envolver en lugar de desbordar la página. El campo MUST seguir usando al menos 16 px de tamaño de texto en web.

#### Scenario: Monto visible a 320 px
- **WHEN** el viewport mide 320 px y la línea tiene un precio unitario de 67900
- **THEN** el campo muestra el monto formateado y no solo el signo «$»

#### Scenario: Ancho de escritorio
- **WHEN** el viewport deja sitio para las tres columnas
- **THEN** cantidad, precio unitario y subtotal siguen en la misma fila
