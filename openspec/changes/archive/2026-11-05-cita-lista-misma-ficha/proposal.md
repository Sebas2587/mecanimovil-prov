# Proposal

## Why

En Servicios una cita sale «En ejecución» y, al abrirla, el encabezado solo dice «Aceptada» y «Estimación». La lista usa el estado operativo del API aunque el checklist ya espere la firma. El documento de la cotización tapa el avance del trabajo.

## What Changes

- Lista y detalle leen el mismo avance: checklist y estado de la cita. Esperar la firma no se muestra como ejecución.
- Si la cita trae cotización de origen, el documento sigue visible y el avance con el cobro queda arriba.
- El texto del margen dice precio de tienda frente a precio final, en una frase completa.
- El modal de nueva cotización no cierra al tocar un campo: el panel queda sobre el fondo.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: la cita propia muestra el mismo avance en la lista y en el detalle.

## Impact

- `utils/presentacionCitaTrabajo.ts`, lista de Servicios y `cita-agenda-personal`.
- No cambia enums, rutas, permisos ni acciones.
- No escribe datos. La pestaña Rechazadas y el botón flotante quedan para la etapa 3.
