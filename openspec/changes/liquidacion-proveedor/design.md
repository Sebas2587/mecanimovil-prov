# Design: liquidacion-proveedor

## Modelo

`LiquidacionProveedor` registra por pago aprobado:

- `monto_cobrado_cliente`
- `comision_plataforma` (20% + IVA 19% sobre comisión)
- `monto_neto_proveedor`
- `estado`: pendiente → procesada → pagada

## Hook de negocio

`liquidacion_proveedor_service.registrar_liquidacion_desde_pago(pago)` se invoca al aprobar pagos MP (webhook oferta/carrito y verificación directa). Resuelve proveedor desde `external_reference` (`oferta_{uuid}`) o ítems del carrito.

## UI proveedor

`FinanzasLiquidacionSection` en `app/creditos.tsx` consume `GET /api/pagos/liquidaciones-proveedor/` y `/resumen/`.

## Créditos anticipados

`solicitud-detalle` verifica saldo antes de navegar a `crear-oferta` y muestra `ModalCreditosInsuficientes` + badge en footer.
