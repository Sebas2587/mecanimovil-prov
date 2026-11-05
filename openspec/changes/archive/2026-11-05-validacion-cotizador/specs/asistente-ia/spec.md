## ADDED Requirements

### Requirement: Badge de validación por repuesto
En `CotizacionIaEditor` y en el desglose, una línea con `validacion_estado` MUST mostrar un badge: `ok` verde «Verificado», `asumido` gris «Precio asumido», `sin_referencia_valida` ámbar «Sin referencia válida» y `requiere_revision` rojo «Requiere revisión». El motivo y las alertas MUST verse. Si el texto es largo, MUST empezar colapsado y MUST poder abrirse. Si el estado falta, MUST NOT haber badge.

#### Scenario: Línea verificada
- GIVEN `validacion_estado` `ok` y `validacion_motivo` vacío
- WHEN el taller ve la línea
- THEN ve el badge verde «Verificado»
- AND no ve un motivo

#### Scenario: Precio asumido
- GIVEN `validacion_estado` `asumido` y un motivo que dice que no hay ficha
- WHEN el taller ve la línea
- THEN ve el badge gris «Precio asumido»
- AND ve ese motivo

#### Scenario: Sin referencia válida
- GIVEN `validacion_estado` `sin_referencia_valida`
- WHEN el taller ve la línea
- THEN ve el badge ámbar «Sin referencia válida»

#### Scenario: Requiere revisión
- GIVEN `validacion_estado` `requiere_revision` y una alerta
- WHEN el taller ve la línea
- THEN ve el badge rojo «Requiere revisión»
- AND ve la alerta

#### Scenario: Texto largo
- GIVEN un motivo y más de dos alertas
- WHEN se renderiza la línea
- THEN el detalle empieza colapsado
- AND se puede abrir para leer el motivo y todas las alertas

#### Scenario: Estado ausente
- GIVEN una línea sin `validacion_estado`
- WHEN se renderiza la línea
- THEN no hay badge de validación

### Requirement: Revisión del cotizador
Arriba de la cotización, en el editor y en el desglose, MUST aparecer «Revisión del cotizador» con cada ítem de `alertas_validacion`: repuesto, estado, motivo y alertas. Si la lista falta o está vacía, el bloque MUST NOT mostrarse.

#### Scenario: Lista de la cotización
- GIVEN `alertas_validacion` con un repuesto, su estado y su motivo
- WHEN el taller abre la cotización
- THEN arriba ve «Revisión del cotizador»
- AND esa fila nombra el repuesto, el estado y el motivo

#### Scenario: Lista ausente
- GIVEN una cotización sin `alertas_validacion`
- WHEN se abre el editor o el desglose
- THEN no aparece «Revisión del cotizador»
