## Context

Hoy arma los contadores con `data ?? []`, así que una consulta pendiente se ve como cero y como «Nada pendiente». El «Por agendar» ya sale de las cotizaciones con estado aceptada (`page_size` 100, la misma lista que pinta la actividad). El pipeline de 100 filas no aporta ese número: solo alimenta acciones de casos que no están en esa lista, y la pantalla muestra como máximo 8. No hay un filtro de servidor por paso, así que pedir 100 filas solo para el número no aporta y se recorta a las acciones visibles.

El menú tiene la tarjeta «Tu rendimiento» y una fila «Rendimiento» hacia `/rendimiento-kpis`. Plan y créditos, Saldo e Historial viven al lado de esa fila, mientras la caja del mes es otra tarjeta.

El libro arma siempre «N pagos de fuente no entran al libro». Un 0 del resumen confirmado es el libro vacío y debe seguir en $0.

`/cita-agenda-personal/[id]` espera `obtenerCita` y después el técnico dentro de la misma consulta, con `retry: 1` y timeout de 30 s. Eso puede dejar «Cargando…» cerca de 60 s. El deep link y los permisos no cambian.

## Goals / Non-Goals

**Goals:**

- Carga visible y vacío solo con respuesta.
- Menú con un Rendimiento y los créditos separados de la caja, mismas rutas.
- Confirmación en borrar, limpiar y basurero. Cancelar no actúa.
- Filtro TEST reversible.
- Ficha de cita usable en cuanto llega el recurso.
- Plural del pago de fuente, sin tocar el neto.

**Non-Goals:**

- Partir el editor, tipos, accesibilidad amplia o la red (etapa 4).
- Cambiar el cerebro del cotizador o el contrato de caja, salvo el plural y la carga de la UI.
- Crear cobros, costos o cotizaciones. Inventar totales. Merge o deploy.

## Decisions

1. Una consulta sigue en curso solo si está pendiente, no falló y todavía no tiene datos. Un refetch con datos previos no vuelve a la pantalla vacía.
2. Hoy pide el pipeline con límite 8, que es el tope de «Siguiente acción», no 100. El número «Por agendar» no usa esas filas.
3. La cita se pinta con `obtenerCita`. El técnico se escribe en la caché cuando llega. `retry: false`. Si falla, hay reintento visible. La cotización de la ficha no sigue la búsqueda web.
4. El editor de la cita se carga aparte, después de la ficha, para no retrasar «Cargando…» con ese módulo.
5. TEST es la palabra completa en `servicio_nombre`, sin distinguir mayúsculas. No se borra nada.
6. La confirmación reutiliza `showConfirm`. Cancelar es el botón de estilo cancel.

## Risks / Trade-offs

- Con límite 8, una acción de pipeline más abajo de las primeras 8 filas no entra en Hoy. La bandeja sigue teniendo el caso. El número «Por agendar» no depende de ese corte.
- `retry: false` muestra el error a los 30 s en vez de insistir otros 30. El botón Reintentar queda en la ficha.
- El filtro TEST no mira el nombre del cliente, solo el título del servicio, que es el título visible de la fila.

## Migration Plan

Cambio solo de cliente. No hay datos que migrar ni pantallas que retirar.

## Open Questions

Ninguna. El $0 confirmado del libro no se convierte en «Incompleto».
