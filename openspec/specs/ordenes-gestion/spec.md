# ordenes-gestion Specification

## Purpose
Flujo del proveedor para gestionar sus órdenes activas e históricas: confirmar,
iniciar, completar y comunicarse con el usuario durante el servicio.

## Requirements

### Requirement: Lista de órdenes del proveedor
El proveedor MUST ver sus órdenes activas e históricas.

#### Scenario: Órdenes activas visibles
- GIVEN un proveedor con órdenes en estado=confirmada o en_progreso
- CUANDO abre la sección de órdenes
- THEN ve las órdenes activas con estado, nombre del usuario y vehículo

#### Scenario: Cita aceptada sin horario no es servicio activo
- GIVEN una cita personal activa con `horario_por_confirmar=true`
- WHEN el taller abre Servicios → Activas
- THEN esa cita no aparece en la lista
- AND aparece cuando el horario está confirmado

#### Scenario: Historial de órdenes completadas
- GIVEN un proveedor con órdenes completadas
- CUANDO cambia al filtro "Historial"
- THEN ve lista paginada de órdenes pasadas con fecha y monto cobrado

### Requirement: Avanzar estado de la orden
El proveedor MUST controlar el avance del estado de cada orden sin cerrar la oferta marketplace antes de la firma del cliente.

#### Scenario: Confirmar orden pendiente
- GIVEN una orden en estado=pendiente
- CUANDO el proveedor toca "Confirmar"
- THEN la orden pasa a estado=confirmada
- AND el usuario recibe notificación push

#### Scenario: Iniciar servicio desde oferta pagada (web)
- GIVEN una oferta en estado `pagada` o `pagada_parcialmente` con repuestos pagados
- WHEN el proveedor confirma «Iniciar servicio» en web
- THEN la app MUST ejecutar `POST /ordenes/ofertas/{id}/iniciar-servicio/` (confirmación compatible con web)
- AND la oferta pasa a `en_ejecucion`

#### Scenario: Checklist completado por técnico sin cerrar oferta
- GIVEN una oferta en `en_ejecucion` con checklist en `PENDIENTE_FIRMA_CLIENTE`
- WHEN el proveedor ve el detalle de oferta
- THEN MUST NOT mostrar «Terminar servicio» como acción principal
- AND MUST mostrar aviso de espera de firma del cliente

#### Scenario: Pago parcial mano de obra pendiente
- GIVEN oferta con `estado_pago_repuestos=pagado` y `estado_pago_servicio=pendiente`
- WHEN el servicio está en ejecución o esperando firma
- THEN MUST informar que el cliente debe pagar la mano de obra restante desde su app

#### Scenario: Completar servicio sin checklist
- GIVEN una orden en estado=en_progreso sin plantilla de checklist
- CUANDO el proveedor toca "Completar servicio" y confirma
- THEN la orden pasa a estado=completada

### Requirement: Finalización de checklist según progreso real de respuestas
La app proveedor SHALL habilitar el botón de finalizar cuando todos los ítems obligatorios estén completados y el progreso calculado desde las respuestas locales sea al menos 80%, sin depender únicamente de `progreso_porcentaje` desactualizado del servidor.

#### Scenario: Checklist reabierto con respuestas ya completas
- GIVEN un checklist en estado `EN_PROGRESO` reabierto desde operaciones
- AND el API devuelve `progreso_porcentaje` bajo pero las respuestas locales están completas
- WHEN el proveedor abre el checklist con todos los obligatorios marcados
- THEN ve el botón "Finalizar checklist" habilitado

### Requirement: Subida de fotos de checklist compatible con web
La app proveedor SHALL enviar las fotos de evidencia del checklist como archivo binario real tanto en nativo como en web, de modo que el backend reciba el archivo y el cliente pueda visualizar las imágenes.

#### Scenario: Subir foto desde la web
- GIVEN un proveedor usando la app en navegador web
- AND captura o selecciona una foto para un ítem PHOTO del checklist
- WHEN la app envía la foto al backend
- THEN el backend recibe el archivo en `FILES` (no vacío)
- AND la foto queda persistida con `imagen_url` accesible para el cliente

#### Scenario: Eliminar foto que falló en el servidor
- GIVEN una foto mostrada que no tiene registro válido en el backend
- WHEN el proveedor pulsa eliminar
- THEN la foto se quita de la lista local aunque el backend responda error

### Requirement: Comunicación durante la orden
El proveedor MUST poder enviar mensajes al usuario vía WebSocket.

#### Scenario: Enviar mensaje al usuario
- GIVEN una orden en_progreso con WebSocket activo
- CUANDO el proveedor escribe y envía un mensaje
- THEN el usuario recibe el mensaje en tiempo real

### Requirement: Avance y cobro en la ficha del trabajo
Si `estado_cobro_ui` falta, el cobro MUST ser «Pagado», «Por cobrar» o «Pago sin información». Cita y cotización sin ese campo MUST quedar en «Pago sin información». Si el campo viene, reembolsado MUST ganar a un pagado viejo. `pago_contabilizable` false MUST decir «Pagado según la fuente» y MUST NOT ser deuda ni saldo cero. Un pendiente 0 sin confirmados MUST NOT pisar ese pagado. La app MUST NOT reescribir un `por_cobrar` del API.

#### Scenario: Pago y pendiente no se ven igual
- GIVEN una orden `pagada` y otra `pendiente_pago` sin `estado_cobro_ui`
- WHEN el taller abre cualquiera de los dos detalles
- THEN el cobro dice «Pagado» en la primera y «Por cobrar» en la segunda

#### Scenario: La cita no se da por cobrada
- GIVEN una cita sin `estado_cobro_ui`
- WHEN el taller abre la cita
- THEN el cobro dice «Pago sin información»

#### Scenario: Las rutas no se cruzan
- GIVEN un id de cita y un id de orden distintos
- WHEN el taller entra desde Agenda o desde Servicios
- THEN la cita abre `/cita-agenda-personal/:id`
- AND la orden sin oferta abre `/servicio-detalle/:id`
- AND un enlace a `/orden-detalle/:id` sigue cargando esa orden

#### Scenario: Fuente legacy no es deuda
- GIVEN `estado_cobro_ui` pagado_segun_oferta, `pago_contabilizable` false y pendiente 0
- WHEN se lee el cobro
- THEN dice «Pagado según la fuente»
- AND no dice que haya deuda ni saldo cero

#### Scenario: El reembolso gana
- GIVEN `estado_cobro_ui` reembolsado y un flag pagado anterior
- WHEN se lee el cobro
- THEN dice «Reembolsado»

### Requirement: Sin ganancia inventada en la orden
Si una línea no trae desglose, o el desglose omite un importe que se muestra, el resumen MUST mostrar solo el total conocido y MUST NOT calcular IVA, comisión ni ganancia. Un campo ausente MUST NOT convertirse en cero. El cero MUST contarse solo cuando el backend lo envía.

#### Scenario: Falta el desglose
- GIVEN una línea con precio final y sin `desglose_precios`
- WHEN se arma el resumen
- THEN no hay comisión ni cifra después de comisión
- AND el total usa el precio final explícito de la línea

#### Scenario: Desglose parcial en todas las líneas
- GIVEN cada línea trae `desglose_precios` sin el importe de comisión
- WHEN se arma el resumen
- THEN la comisión y la ganancia quedan vacías
- AND no se muestra un cero inventado

### Requirement: El cobro no sigue al avance
La ficha de orden, de servicio y de la lista MUST leer `estado_pago_repuestos` y `estado_pago_servicio` si el registro los trae. `en_ejecucion`, `completado` y `aceptada` MUST NOT marcar Pagado ni Por cobrar. Un campo `reembolsado`, `fallido`, `cancelado` o un pago parcial MUST NOT terminar en Pagado aunque el estado siga en `pagada`. Sin evidencia, la etiqueta MUST ser «Pago sin información».

#### Scenario: Campos de pago sin estado
- GIVEN repuestos y servicio en `pagado` y sin estado
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pagado»

#### Scenario: Pago confirmado y orden completada
- GIVEN los dos campos en `pagado` y estado `completado`
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pagado»

#### Scenario: Reembolso junto a orden pagada
- GIVEN estado `pagada` y un campo `reembolsado` o `fallido`
- WHEN se resuelve el cobro
- THEN la etiqueta no es «Pagado»

#### Scenario: Orden completada sin campos
- GIVEN estado `completado` y sin campos de pago
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pago sin información»

### Requirement: Total nulo y color del avance
En el detalle de orden, el color del estado MUST seguir el avance normalizado. Un total `null` o vacío MUST NOT renderizarse como $0. El monto MUST aparecer una sola vez.

#### Scenario: Total nulo
- GIVEN una orden sin total
- WHEN se abre el detalle
- THEN no aparece un monto $0

### Requirement: La cita muestra el mismo avance en la lista y en el detalle
La lista y el detalle MUST usar la misma función, cada uno con los campos que recibió. Checklist explícito de firma MUST decir «Falta la firma» aunque `estado_operativo` sea `en_ejecucion`. `EN_PROGRESO` MUST decir «En ejecución». Cita `cerrada` o `cancelada` MUST ganar. La cotización MUST seguir visible. El cobro MUST seguir en «Pago sin información».

#### Scenario: Espera firma y el API dice en ejecución
- GIVEN una cita activa con `estado_operativo` `en_ejecucion` y checklist `PENDIENTE_FIRMA_CLIENTE`
- AND la cita tiene cotización de origen
- WHEN el taller la ve en Servicios y abre el detalle
- THEN ambos dicen «Falta la firma»
- AND el detalle sigue mostrando el documento
- AND el cobro dice «Pago sin información»

#### Scenario: Checklist en curso
- GIVEN una cita activa con checklist `EN_PROGRESO`
- WHEN se lee el avance para la lista y para el detalle
- THEN ambos dicen «En ejecución»

#### Scenario: Cita cerrada
- GIVEN una cita `cerrada` con `estado_operativo` `en_ejecucion`
- WHEN se lee el avance
- THEN lista y detalle dicen «Completado»

### Requirement: Checklist ausente no esconde el estado operativo
Si `checklist_estado` viene omitido, null, vacío o con un valor que no es enum conocido, el avance MUST usar `estado_operativo`. `en_ejecucion` MUST seguir «En ejecución». `completado`, `cerrado` y `cancelado` MUST NOT pasar a «Agendado». Sin ambos datos, MUST NOT decir «En ejecución». `PENDIENTE` explícito MUST decir «Agendado».

#### Scenario: Lista sin el campo y ejecución real
- GIVEN una cita activa con `estado_operativo` `en_ejecucion` y sin `checklist_estado`
- WHEN se lee el avance
- THEN dice «En ejecución»

#### Scenario: Valor desconocido
- GIVEN `checklist_estado` `EN_CURSO` y `estado_operativo` `en_ejecucion`
- WHEN se lee el avance
- THEN dice «En ejecución»

#### Scenario: Cierre sin checklist
- GIVEN `estado_operativo` `completado` o `cancelado` y sin checklist
- WHEN se lee el avance
- THEN no dice «Agendado»

### Requirement: Las acciones de la ficha y la lista quedan fuera del contenido
El botón de más acciones de la cita MUST estar en la cabecera, fuera del scroll, con pie y sin pie. MUST NOT flotar sobre el contenido. En Servicios, el marco de la lista MUST terminar encima de «Nueva cotización» usando el alto medido de ese control. MUST NOT ser un padding al final del scroll. Las acciones, el pie y el zoom MUST permanecer.

#### Scenario: Ficha sin pie
- GIVEN una cita sin pie fijo y con acciones
- WHEN se abre la ficha
- THEN «Más acciones» está en la cabecera
- AND no hay un botón absoluto sobre el scroll

#### Scenario: Lista de Servicios
- GIVEN «Nueva cotización» visible
- WHEN la lista mide el control
- THEN el marco usa ese alto como margen inferior
- AND el padding del contenido no incluye esa reserva

### Requirement: El menú de más acciones recibe el toque en su superficie
El menú abierto MUST renderizarse en un Modal de pantalla completa y MUST ser hijo de esa superficie. MUST NOT ser un absolute que desborda el botón de la cabecera. Abrir, cerrar por fondo, Escape en web o atrás MUST NOT ejecutar una acción. Una opción deshabilitada MUST NOT llamar su callback.

#### Scenario: Elegir una opción
- GIVEN el menú abierto con una opción habilitada
- WHEN se presiona esa opción
- THEN corre solo su callback y el menú se cierra

#### Scenario: Cerrar sin elegir
- GIVEN el menú abierto
- WHEN se cierra con el fondo o con atrás
- THEN ningún callback de acción corre

### Requirement: Cliente y dirección tipados en la ficha
La ficha de la orden SHALL leer el cliente completo cuando el objeto trae nombre, y el nombre y teléfono ofuscados cuando el cliente está protegido. La dirección MUST salir de `ubicacion_servicio_segura`. Un mensaje de éxito MUST leerse solo si la respuesta trae datos.

#### Scenario: Cliente protegido
- **WHEN** el cliente no trae nombre completo
- **THEN** la ficha muestra el nombre y el teléfono ofuscados y no exige email

#### Scenario: Dirección de domicilio
- **WHEN** la orden es a domicilio y trae dirección segura
- **THEN** la ficha muestra esa dirección y el mapa usa el mismo texto
