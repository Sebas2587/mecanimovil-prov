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
