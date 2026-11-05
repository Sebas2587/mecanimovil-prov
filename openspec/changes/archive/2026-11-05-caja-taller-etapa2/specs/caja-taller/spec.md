## ADDED Requirements

### Requirement: Libro de caja en su ruta
La tarjeta Finanzas del mes MUST abrir `/caja-taller`. Recargar créditos y el plan MUST seguir en `/creditos`. La pantalla MUST pedir el período en America/Santiago, inclusive y de hasta 366 días, y MUST mostrar resumen, serie, movimientos y casos. El mecánico MUST NOT ver registrar cobro ni costo.

#### Scenario: La tarjeta abre la caja
- GIVEN un mandante con permiso de finanzas
- WHEN pulsa la tarjeta Finanzas del mes
- THEN entra a `/caja-taller`
- AND Recargar créditos sigue yendo a `/creditos`

#### Scenario: El servidor no publica la caja
- GIVEN `GET /ordenes/caja/` responde 404
- WHEN se abre el período
- THEN el mensaje dice que la caja no está publicada
- AND no se muestra un libro vacío

#### Scenario: El período no tiene movimientos
- GIVEN el API responde 200 con `results` vacío
- WHEN se muestra el libro
- THEN dice que no hay movimientos en el período

### Requirement: Neto sin ganancia y margen sin calcular
El neto MUST etiquetarse «Cobros menos devoluciones» y MUST NOT llamarse ganancia. `margen_real_clp` y `resultado_caja_clp` null MUST decir incompleto. `margen_contratado_clp` MUST NOT rotularse como caja. Si la clave no viene, la fila MUST NOT mostrarse. La app MUST NOT calcular esos números. Saldo null MUST NOT verse como cero.

#### Scenario: Abono y devolución
- GIVEN exigible 100, abono 30 y devolución 10 al día siguiente
- WHEN el API entrega neto 20 y saldo 80
- THEN el período muestra 20 como cobros menos devoluciones
- AND el caso muestra saldo 80
- AND el 100 no entra al libro

#### Scenario: Margen sin evidencia
- GIVEN `margen_real_clp` null y `margen_contratado_clp` 60
- WHEN se dibuja el caso
- THEN el margen real dice incompleto
- AND 60 se lee como margen contratado, no como caja

### Requirement: Alta manual con la misma clave
Registrar cobro o costo MUST pedir revisión antes del POST. Abrir el formulario MUST NOT enviar. El cobro MUST mandar `Idempotency-Key` y MUST usar el ancla de la respuesta. Un 409, incluido `reverso_ancla_distinta`, MUST mostrarse y MUST NOT lanzar otro POST. Mercado Pago MUST NOT anotarse ni recalcularse en este formulario.

#### Scenario: Doble toque
- GIVEN el taller ya confirmó un cobro
- WHEN el envío sigue en curso
- THEN no sale un segundo POST

#### Scenario: Reintento de red
- GIVEN el POST no tuvo respuesta
- WHEN el taller reintenta ese mismo cuerpo
- THEN la clave de idempotencia es la misma

#### Scenario: La solicitud se guarda en la oferta
- GIVEN un POST con ancla solicitud
- WHEN la respuesta trae ancla oferta
- THEN la pantalla nombra esa oferta
- AND no deja el cobro en la solicitud escrita

### Requirement: Caso sin nombre inventado
Sin `cliente_nombre`, `vehiculo_patente` o `folio`, la fila MUST mostrar ancla y ancla id. MUST NOT pedir cada caso por separado para ponerle nombre.

#### Scenario: Solo ancla
- GIVEN un caso cita 15 sin esos tres campos
- WHEN se lista el caso
- THEN se lee «Cita 15»
- AND no hay otra petición por ese id
