## Why

Si A confirma un cobro y el POST sigue pendiente, cambiar a B limpia la pantalla. Cuando el POST de A termina, el callback igual hace `setIntentoIncierto` y `setFalloAlta`. B ve el aviso y el monto de A. Lo mismo puede pasar con el costo y con un 200, 400 o 409 tardío.

## What Changes

- El resultado se guarda bajo la cuenta que envió.
- Si la pantalla ya es otra cuenta, no se pintan intento, fallo, formulario ni libro.
- Al volver, el intento incierto de A reaparece con la misma clave. El costo ambiguo también reaparece en A.

## Capabilities

### New Capabilities

- Ninguna. Ajusta `caja-taller`.

### Modified Capabilities

- `caja-taller`: una respuesta tardía no se dibuja en otra cuenta.

## Impact

- `app/caja-taller.tsx` y el test de montaje. Sigue en el PR 15. No hay merge ni deploy.
