# asistente-ia — PDF orden de compra y origen del precio

## ADDED Requirements

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
