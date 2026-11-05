## Why

`costoAmbiguo` es una sola ranura. Si B ya guardó su 502 y después llega el 502 de A, A pisa esa ranura. B reconfirma el mismo cuerpo y el POST se repite.

## What Changes

- Los costos ambiguos se guardan en un mapa por usuario y taller.
- El resultado tardío de A no borra ni reemplaza el de B.
- Al volver a A, su costo reaparece y sigue bloqueando ese cuerpo.
- Un 200, 400 o 409 tardío de A no cierra ni cambia el formulario que B tiene abierto.

## Capabilities

### New Capabilities

- Ninguna. Ajusta `caja-taller`.

### Modified Capabilities

- `caja-taller`: el costo ambiguo queda aislado por cuenta.

## Impact

- `app/caja-taller.tsx` y el test de montaje. Sigue en el PR 15. No hay merge ni deploy.
