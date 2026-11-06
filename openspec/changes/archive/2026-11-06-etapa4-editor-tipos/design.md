# Design

## Context

`CotizacionIaEditor` calcula totales, margen y el envío en el componente padre. Las piezas visuales (encabezado, fila de repuesto, fila de mano de obra y tarjeta de resumen) se pueden mover si el padre les pasa los mismos valores y callbacks.

El baseline de `tsc` en main, con `expo-env.d.ts`, es 147 errores. 14 están en `app/orden-detalle/[id].tsx` y 11 en `components/taller/AgendaComercial.tsx`. El resto no es de esta etapa.

`Orden.cliente_detail` es `ClienteProtegido | ClienteCompleto`. La dirección publicada en el contrato es `ubicacion_servicio_segura`.

## Goals / Non-Goals

**Goals:**

- Partir el editor sin recalcular margen, sin cambiar `envioTotalBloqueado` y sin cambiar la reapertura de un folio.
- Dejar el typecheck igual o mejor que el baseline. Solo se cierran los errores de esas dos pantallas.
- Avisar sin señal. No prometer una cotización sin red y no encolar envíos.
- Textos de dinero y de estado a 13 px o más en las superficies nombradas.

**Non-Goals:**

- Limpiar los demás errores del baseline.
- Resucitar `MultiAgentKanban`.
- Cambiar el checklist offline, el contrato de caja o la navegación de créditos y finanzas.

## Decisions

1. El padre conserva `totalesDesdeLineas`, `desgloseIvaDesdeTotal`, el descuento y el texto del total. El resumen solo pinta esos valores. `subtotalRepuesto` se mueve tal cual y el padre lo importa para la misma suma.
2. La ficha distingue cliente completo y ofuscado con `'nombre' in cliente`. La dirección usa `ubicacion_servicio_segura`. `response.data` se lee con optional chaining.
3. La agenda arma la lista con `flatMap` y un objeto anotado `EventoAgendaUnificado`. Un estado cerrado no entra a la lista.
4. `useSenalRed` mira `navigator.onLine` en web y `expo-network` en nativo. `null` no muestra el aviso. El aviso no bloquea el handler de envío: si no hay red, el envío existente falla y no se guarda una cola.
5. La franja de motivo de selección usaba `I.accentBlue`, que no existe en los tokens. La parte extraída usa tinta al 5% para que el estilo compile. El error viejo del archivo padre se deja, porque ya estaba en el baseline.
6. Al cerrar el teclado en la caja, `obscuredBottom` vuelve a 0 y el padding inferior vuelve al inset. No se usa `overflow: hidden` global ni se bloquea el zoom.

## Risks / Trade-offs

- Mover JSX puede desalinear una prop. El typecheck y los tests de margen y certeza cubren el cálculo; el envío y la reapertura no se reescribieron, pero un desajuste de callback seguiría siendo el riesgo medio de esta etapa.
- El aviso no impide pulsar enviar. Eso es deliberado: no se cambia la ruta de envío ni se inventa una cola.

## Migration Plan

No hay migración de datos. El cambio es de UI y de tipos.

## Open Questions

Ninguna.
