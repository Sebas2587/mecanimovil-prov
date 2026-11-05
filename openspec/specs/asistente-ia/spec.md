# asistente-ia Specification

## Purpose
Asistente IA para diagnóstico en órdenes/solicitudes y cotización asistida en chat omnicanal (`AsistenteDiagnosticoCard`, `CotizacionIaEditor`).

## Requirements

### Requirement: Permisos por rol
Solo usuarios con permiso de IA (`puedeUsarAsistenteIaEnOrden`) SHALL ver acciones de cotización/diagnóstico IA.

#### Scenario: Mecánico de equipo sin permiso IA
- GIVEN un miembro con rol mecánico sin flag IA
- WHEN abre detalle de orden
- THEN no ve el card de asistente IA

### Requirement: Cotización IA en canal
En conversaciones omnicanal, el proveedor SHALL poder generar borrador de cotización con IA y editarlo antes de enviar.

#### Scenario: Generar cotización desde WhatsApp
- GIVEN una conversación con contexto de vehículo
- WHEN el proveedor usa cotización IA
- THEN se prellena `CotizacionCanal` editable en el modal del chat

### Requirement: PDF para casa de repuestos
`CotizacionIaEditor` MUST mostrar «PDF para casa de repuestos» solo si la cotización tiene id guardado (`id > 0`). El botón SHALL llamar `GET /ordenes/cotizaciones-canal/{id}/orden-compra-pdf/` con la misma autenticación que el resto de la API. En web MUST descargar el PDF. En nativo MUST escribirlo con `expo-file-system` y MUST abrirlo con `expo-sharing`. Si falla, MUST avisar y MUST dejar el botón listo para reintentar.

#### Scenario: Cotización guardada en web
- GIVEN una cotización con id positivo abierta en el editor
- WHEN el taller pulsa «PDF para casa de repuestos» en web
- THEN la app llama al endpoint autenticado de orden de compra
- AND el navegador descarga el PDF

#### Scenario: Cotización guardada en nativo
- GIVEN una cotización con id positivo abierta en iOS o Android
- WHEN el taller pulsa «PDF para casa de repuestos»
- THEN la app guarda el PDF con expo-file-system
- AND abre la hoja de compartir con expo-sharing

#### Scenario: Vista previa de plantilla
- GIVEN la vista previa de una plantilla (sin id de cotización guardado)
- WHEN se renderiza `CotizacionIaEditor`
- THEN el botón «PDF para casa de repuestos» no está

#### Scenario: Descarga fallida
- GIVEN una cotización con id positivo
- WHEN el endpoint falla o el dispositivo no puede compartir
- THEN el taller ve un aviso breve
- AND el botón vuelve a quedar disponible

### Requirement: Origen del precio con nombre de tienda
La línea «Solo taller · origen del precio» MUST mostrar el nombre humano de la tienda que envía el backend. MUST NOT concatenar slugs ni dominios crudos (`todoautochile.cl`, `Comercialramirezspa`) a ese nombre. Si no hay nombre humano, MAY mostrar el dominio como único identificador.

#### Scenario: Nombre humano y slug
- GIVEN una ficha con tienda «Comercial Ramírez» y dominio `Comercialramirezspa`
- WHEN el taller ve el origen del precio
- THEN la línea muestra «Comercial Ramírez»
- AND no muestra `Comercialramirezspa`

#### Scenario: Sin nombre humano
- GIVEN una ficha sin nombre de tienda y con dominio `todoautochile.cl`
- WHEN el taller ve el origen del precio
- THEN la línea muestra `todoautochile.cl`

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

### Requirement: Total nulo no es cero
Lista, detalle, burbuja y editor MUST mostrar «Incompleto» cuando `total_clp` es null o cuando `totales_completos` es false. Un `total_clp` 0 MUST seguir viéndose como $0. El total guardado MUST NOT reemplazar un total canónico null. Enviar MUST NOT salir si falta el precio de una línea. Guardar un borrador MUST seguir permitido.

#### Scenario: Precio ausente
- GIVEN una línea sin `precio_unitario_clp` y otra de 1000
- WHEN se muestra el total
- THEN dice «Incompleto»
- AND el envío no sale

#### Scenario: Cero explícito
- GIVEN `total_clp` 0 y `totales_completos` true
- WHEN se muestra el total
- THEN se ve $0
- AND el envío no queda bloqueado por ese cero

#### Scenario: Backend sin el campo nuevo
- GIVEN una cotización vieja con `total_clp` 2500 y sin `totales_completos`
- WHEN se muestra el total
- THEN se ve 2500

#### Scenario: Guardado distinto de las líneas
- GIVEN líneas que suman 2500 y `total_persistido_clp` 1000
- WHEN el editor arma la vista
- THEN el total mostrado es 2500
- AND 1000 no se presenta como el total ni como cero
