## Context

`/ordenes` arma el chip de una cita con `mapCitaEstadoOperativo(estado_operativo)`. Si el API manda `en_ejecucion`, la tarjeta dice «En ejecución» aunque `checklist_estado` sea `PENDIENTE_FIRMA_CLIENTE`.

En `/cita-agenda-personal/:id`, si hay `cotizacion_canal_origen_id`, `muestraDocumentoComercial` reemplaza `CitaCasoIdentidad` por `CotizacionIaEditor`. Ese editor muestra el estado comercial «Aceptada» y el tag «Estimación». El pie sigue siendo operativo: «Enviar enlace al cliente» solo aparece con `PENDIENTE_FIRMA_CLIENTE`. La cita 81, con checklist `EN_PROGRESO`, sí mostraba la ficha y «Continuar checklist».

No son dos recursos. Es la misma cita. La rama del documento tapa el avance.

## Goals / Non-Goals

**Goals:**

- Una función pura para lista y detalle.
- Firma pendiente, revisión y checklist en curso se distinguen.
- La cotización aceptada sigue visible, sin reemplazar el avance ni el cobro.
- No afirmar que no hubo pago: la cita sigue en «Pago sin información».

**Non-Goals:**

- No cambiar `estado_operativo` en el backend ni reescribir registros.
- No reordenar tabs ni el botón flotante. En 390 «Rechazadas» queda fuera de la pista hasta hacer scroll (`InstitutionalScreenTabs`, sin indicador). En 320 el CTA de `TallerChrome` tapa la tarjeta. Eso es etapa 3.
- No tocar el viewport ni el zoom.

## Decisions

1. El checklist manda sobre `estado_operativo`. Sin checklist iniciado, no hay ejecución.
2. `cerrada` o checklist `COMPLETADO` es Completado. `cancelada` es Cancelado.
3. Con documento comercial, `EstadoTrabajoCobro` va arriba del editor. Las acciones del pie no cambian.
4. El fondo del modal de nueva cotización es un hermano con `zIndex` 0. El panel, con `zIndex` 2, toma el toque. El ancho usa margen, no `width: 100%` más margen.

## Risks / Trade-offs

- [El API dice en ejecución y el checklist está vacío] → La ficha dice Agendado. No se inventa el trabajo.
- [El toque que cerraba el modal no se reprodujo aquí] → El arreglo es de capas. No hay sesión real de taller para repetir el clic en 320.
