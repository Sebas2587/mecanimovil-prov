## Context

El contrato vive en el backend (`docs/caja-taller.md`, PR 41). Esa revisión encontró bloqueos de concurrencia, reembolsos de Mercado Pago, ancla canónica, deuda falsa legacy y margen calculado con el exigible. Esta app no corrige esos números en el cliente. Muestra el cuerpo y el código que devuelve el API.

La zona del período es America/Santiago, inclusive, máximo 366 días. El mecánico lee sus anclas y no registra cobros ni costos.

## Goals / Non-Goals

- Goals: libro, serie, movimientos y casos paginados; alta manual con revisión previa y la misma clave si el reintento es ambiguo; costo vigente solo para mandante y supervisor; cobro de ficha alineado a `estado_cobro_ui` cuando el campo existe.
- Non-Goals: no merge, no deploy, no pagos de prueba, no mensajes automáticos, no etapa 3/4, no cálculo local de margen ni de saldo, no un pedido HTTP por caso para ponerle nombre.

## Decisions

- 200 con `results` vacío es el libro vacío. 404 sin `ancla_ajena` es «la caja no está publicada». 404 `ancla_ajena` es «ese caso no es de este taller».
- La clave se crea al confirmar y se reutiliza solo con el mismo cuerpo. Abrir el formulario no hace POST. Un 409 no dispara otro POST con clave nueva.
- `margen_real_clp` ausente: no se muestra la fila. Null: «Margen real incompleto».
- Etiquetas humanas, si el API las agrega: `cliente_nombre`, `vehiculo_patente`, `folio`.

## Risks / Trade-offs

- Hasta el HEAD revisado del backend, un saldo o un margen mal calculados se ven como los envió el API. Cerrar la etapa espera ese contrato.
- La fila sin nombre es legible solo como «Cita 15». No se inventa el cliente.

## Migration Plan

Publicar esta app después de que la migración del backend quede revisada. No hay escritura productiva en este cambio.
