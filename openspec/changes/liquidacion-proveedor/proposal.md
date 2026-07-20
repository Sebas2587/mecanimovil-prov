# Change: liquidacion-proveedor

## Why
No existía trazabilidad de cuánto se le debe liquidar al taller tras cobrar al cliente vía Checkout Pro.

## What
- Modelo `LiquidacionProveedor` en `pagos`
- API `GET /api/mercadopago/liquidaciones-proveedor/` + `resumen/`
- UI `FinanzasLiquidacionSection` en créditos
