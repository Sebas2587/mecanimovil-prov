# asistente-ia — referencia de tienda en la línea

## ADDED Requirements

### Requirement: Referencia de tienda en la línea de repuesto
En `CotizacionIaEditor` y en el desglose del pipeline, cada línea de repuesto del taller MUST mostrar, sin abrir el precio, una referencia compacta cuando `url_referencia` no está vacío. El texto SHALL ser el `tienda_referencia` y el `precio_verificado_clp` formateado en pesos. MUST incluir un enlace «Ver en tienda» que abre `url_referencia`: en web en una pestaña nueva y en nativo con `Linking.openURL`. Si `url_referencia` está vacío, la referencia MUST permanecer oculta.

#### Scenario: Línea con ficha
- GIVEN un repuesto con `url_referencia` `https://tienda.cl/pieza`, `tienda_referencia` «TodoAuto Chile» y `precio_verificado_clp` 12990
- WHEN el taller ve la línea en el editor o el detalle
- THEN ve «TodoAuto Chile» y el precio `$12.990`
- AND ve el enlace «Ver en tienda» sin entrar al campo de precio

#### Scenario: Abrir en web
- GIVEN esa línea en web
- WHEN el taller pulsa «Ver en tienda»
- THEN la ficha se abre en una pestaña nueva

#### Scenario: Abrir en nativo
- GIVEN esa línea en iOS o Android
- WHEN el taller pulsa «Ver en tienda»
- THEN la app abre la URL con Linking

#### Scenario: Sin URL
- GIVEN un repuesto con `url_referencia` vacío
- WHEN se renderiza la línea
- THEN no aparece la referencia ni el enlace
