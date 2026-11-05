## ADDED Requirements

### Requirement: Costo ambiguo por cuenta
Cada costo ambiguo MUST guardarse bajo su usuario y taller. El resultado tardío de otra cuenta MUST NOT borrar ni reemplazar ese registro. Al volver a la cuenta, su aviso MUST reaparecer y el mismo cuerpo MUST NOT reenviarse. Un 200, 400 o 409 tardío MUST NOT cerrar ni alterar el formulario de la cuenta visible.

#### Scenario: Dos costos en vuelo
- GIVEN A envió un costo y el POST sigue pendiente
- WHEN B recibe 502 de su propio costo y después llega el 502 de A
- THEN reconfirmar el cuerpo de B no hace un segundo POST
- AND al volver a A su costo ambiguo sigue protegiendo su cuerpo

#### Scenario: Respuesta definitiva tardía
- GIVEN A envió un costo y B tiene el formulario abierto
- WHEN el POST de A responde 200, 400 o 409
- THEN el formulario de B sigue abierto con lo que B escribió
