## ADDED Requirements

### Requirement: La cita muestra el mismo avance en la lista y en el detalle
La lista de Servicios y el detalle de la cita MUST usar el mismo avance. MUST salir del estado de la cita y del checklist. Si el checklist no está en curso, MUST NOT decir «En ejecución». Si espera la firma, ambos MUST decir «Falta la firma». La cotización de origen MUST seguir visible sin tapar el avance ni el cobro. El cobro MUST seguir en «Pago sin información». La ruta y las acciones MUST permanecer.

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
