## ADDED Requirements

### Requirement: Confirmación de asignación desde catálogo
Cuando el cliente contrata un servicio publicado del proveedor (`origen=catalogo`, solicitud `pendiente_confirmacion`), el detalle de solicitud SHALL guiar al proveedor con jerarquía clara de acciones.

#### Scenario: Proveedor revisa asignación pendiente
- GIVEN una solicitud dirigida con oferta de catálogo en estado `pendiente_confirmacion`
- AND la oferta del proveedor autenticado es la preasignada (`oferta_seleccionada_detail` o equivalente en API)
- WHEN abre `solicitud-detalle/[id]`
- THEN ve contexto y precio en la tarjeta «Asignación desde catálogo»
- AND un único botón «Ver chat con cliente» en esa tarjeta (no duplicado en el pie)
- AND un enlace «Proponer otra fecha al cliente» bajo «Fecha y hora preferida»
- AND en el pie fijo solo «Rechazar» y «Aceptar asignación»
- AND no aparece «Crear oferta» para la solicitud primaria

#### Scenario: Proveedor acepta asignación
- GIVEN la misma asignación pendiente de confirmación
- WHEN toca «Aceptar asignación» en el pie y confirma el diálogo
- THEN el backend adjudica y descuenta créditos según reglas existentes (o deja reserva si faltan créditos)
- AND el cliente puede continuar al pago cuando corresponda

#### Scenario: Proveedor rechaza asignación
- GIVEN la asignación pendiente
- WHEN toca «Rechazar» en el pie y confirma
- THEN la solicitud se cancela para el cliente según flujo catálogo existente
- AND el proveedor vuelve al listado o estado coherente

#### Scenario: Proveedor propone otra fecha
- GIVEN la asignación pendiente de confirmación
- WHEN toca «Proponer otra fecha al cliente» en la sección de fecha
- THEN se abre el modal de fecha alternativa (no desde el pie)
- AND tras enviar, la oferta puede pasar a `en_chat` hasta respuesta del cliente

#### Scenario: Esperando respuesta del cliente a fecha alternativa
- GIVEN oferta catálogo en `en_chat` y solicitud aún `pendiente_confirmacion`
- WHEN el proveedor abre el detalle
- THEN no hay pie fijo de Rechazar/Aceptar (decisión bloqueada hasta respuesta del cliente)
- AND la tarjeta muestra mensaje de espera y el único CTA de chat
- AND puede seguir conversando por chat desde la tarjeta
