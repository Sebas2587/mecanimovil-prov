## MODIFIED Requirements

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

## ADDED Requirements

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
