# asistente-ia — casa sugerida y margen

## MODIFIED Requirements

### Requirement: Referencia de tienda en la línea de repuesto
En `CotizacionIaEditor` y en el desglose del pipeline, cada línea MUST mostrar la referencia cuando `url_referencia` no está vacío, sin abrir el precio. El nombre junto a «Ver en tienda» SHALL ser `tienda_referencia` y el precio verificado. El enlace abre esa URL en una pestaña nueva en web y con `Linking.openURL` en nativo. Si hay `casa_sugerida`, MUST mostrarla aparte. Si `precio_verificado_en_casa` es false, MUST mostrar `nota_referencia` como aviso. MUST NOT presentar el link como la casa sugerida cuando no lo es. Si `url_referencia` está vacío, la referencia y el enlace MUST permanecer ocultos.

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

#### Scenario: Link de otra tienda
- GIVEN `tienda_referencia` «TodoAuto Chile», `casa_sugerida` «Adriazola», `precio_verificado_en_casa` false y una nota que dice que el precio no está verificado en Adriazola
- WHEN el taller ve la línea
- THEN el enlace nombra TodoAuto Chile
- AND ve «Casa sugerida: Adriazola» en otra línea
- AND ve la nota de aviso
- AND el enlace no se llama Adriazola

#### Scenario: Link de la casa
- GIVEN `precio_verificado_en_casa` true y `nota_referencia` vacía
- WHEN el taller ve la línea
- THEN no aparece el aviso

## ADDED Requirements

### Requirement: Margen de repuestos en vivo
Cada línea del editor y del desglose MUST mostrar costo, cobrado y margen en CLP y el % sobre el cobrado. Al cambiar el precio cobrado, el margen MUST recalcularse como `(cobrado − costo) × cantidad`. Si el costo es null, MUST decir «sin costo» y MUST NOT inventar un margen. El resumen MUST mostrar costo total, cobrado total, ganancia y %. Ganancia positiva MUST ir en verde y la negativa en rojo.

#### Scenario: Precio editado
- GIVEN costo unitario 6000, cantidad 2 y cobrado unitario 10000
- WHEN el taller cambia el cobrado unitario a 8000
- THEN el margen de la línea es $4.000 y 25%
- AND el resumen de ganancia usa ese cobrado

#### Scenario: Sin costo
- GIVEN `costo_unitario_clp` null
- WHEN se ve la línea y el resumen
- THEN el costo se lee «sin costo»
- AND no hay un margen en pesos inventado
