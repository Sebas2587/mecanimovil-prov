# Proposal

## Why

Sumar padding al final del scroll no saca el botón del viewport. En la ficha el teléfono está a mitad de página y el toque queda debajo del botón. En Servicios la tarjeta queda bajo «Nueva cotización».

## What Changes

- «Más acciones» pasa a la cabecera de la cita. Cerrado, no cubre el scroll. No hay botón absoluto ni con pie ni sin pie.
- Servicios achica el marco de la pantalla con el alto medido del control, no con padding del contenido.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: las acciones dejan de flotar sobre el contenido.

## Impact

- Cabecera de la cita, shell de la lista y el control «Nueva cotización».
- No cambia el viewport ni el zoom.
