## MODIFIED Requirements

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
