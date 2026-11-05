## ADDED Requirements

### Requirement: Respuesta tardía de otra cuenta
El POST iniciado por la cuenta A MUST guardarse bajo A. Si la pantalla ya muestra la cuenta B, MUST NOT pintar el intento, el fallo, el formulario ni el libro de ese POST. Al volver a A, un intento incierto MUST reaparecer con la misma clave. Un 200, 400 o 409 tardío MUST NOT pintarse en B. El costo MUST seguir la misma regla.

#### Scenario: 502 después del cambio
- GIVEN A envió un cobro y el POST sigue pendiente
- WHEN se cambia a B y el POST responde 502
- THEN B no ve el aviso, el monto ni el formulario de A
- AND al volver a A reaparece el intento con la misma clave

#### Scenario: Costo 502 después del cambio
- GIVEN A envió un costo y el POST sigue pendiente
- WHEN se cambia a B y el POST responde 502
- THEN B no ve ese fallo
- AND al volver a A el aviso del costo reaparece

#### Scenario: 200, 400 o 409 tardíos
- GIVEN A envió un cobro y la pantalla ya es B
- WHEN el POST responde 200, 400 o 409
- THEN B no muestra esa nota ni ese fallo
