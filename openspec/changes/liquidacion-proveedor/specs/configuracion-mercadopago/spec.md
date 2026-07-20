## ADDED Requirements

### Requirement: Liquidación al proveedor tras cobro MP
Cuando un pago Checkout Pro queda `approved`, el sistema SHALL registrar una `LiquidacionProveedor` con comisión de plataforma y monto neto transferible.

#### Scenario: Pago de oferta aprobado vía webhook
- GIVEN una oferta con pago MP aprobado
- WHEN el webhook confirma `status=approved`
- THEN se crea liquidación en estado `pendiente` visible en la app del proveedor

#### Scenario: Consulta de saldo pendiente
- GIVEN un proveedor con liquidaciones pendientes
- WHEN abre la sección Finanzas en Créditos
- THEN ve saldo neto pendiente e historial

### Requirement: Validación anticipada de créditos
Antes de crear una oferta desde detalle de solicitud, la app SHALL verificar saldo de créditos y bloquear la navegación si `puede_ofertar=false`.

#### Scenario: Saldo insuficiente al crear oferta
- GIVEN un proveedor sin créditos suficientes
- WHEN toca «Crear oferta» en solicitud-detalle
- THEN ve modal de créditos insuficientes sin entrar al formulario
