# configuracion-mercadopago Specification

## Purpose
Flujo de configuración de la cuenta MercadoPago del proveedor dentro de la app
(app/configuracion-mercadopago.tsx). Permite conectar/desconectar la cuenta MP
y verificar el estado de la integración.

## Requirements

### Requirement: Conectar cuenta MercadoPago
El proveedor vincula su cuenta MP para recibir pagos de órdenes completadas.

#### Scenario: Proveedor conecta cuenta MP por primera vez
- GIVEN un proveedor sin cuenta MP configurada
- CUANDO accede a "Configurar MercadoPago" desde su perfil
- THEN ve la pantalla de configuración con instrucciones claras
- AND puede iniciar el flujo OAuth de MercadoPago

#### Scenario: OAuth completado exitosamente
- GIVEN el proveedor completó el flujo OAuth de MP
- CUANDO regresa a la app con el authorization code
- THEN la app envía el code al backend para canjear el access_token
- AND se muestra confirmación "Cuenta MP conectada correctamente"
- AND el estado en la pantalla cambia a "Conectado"

#### Scenario: OAuth cancelado por el proveedor
- GIVEN el proveedor cerró el navegador de MP sin autorizar
- CUANDO regresa a la app
- THEN la pantalla mantiene el estado "Sin conectar"
- AND se muestra un mensaje informativo sin error

### Requirement: Ver estado de la integración MP
El proveedor puede verificar si su cuenta MP está activa y funcionando.

#### Scenario: Cuenta MP activa y válida
- GIVEN una cuenta MP configurada y con token válido
- CUANDO el proveedor abre la pantalla de configuración
- THEN ve el estado "Conectado" con el email/alias de la cuenta MP

#### Scenario: Token MP expirado o revocado
- GIVEN el access_token de MP fue revocado
- CUANDO el proveedor abre la pantalla
- THEN ve alerta "Tu cuenta MP necesita reconectarse"
- AND puede iniciar el flujo de re-autorización

### Requirement: Desconectar cuenta MP
El proveedor puede desvincular su cuenta MP (no podrá recibir pagos hasta reconectar).

#### Scenario: Desconexión con confirmación
- GIVEN un proveedor con cuenta MP conectada
- CUANDO toca "Desconectar cuenta"
- THEN se muestra un modal de confirmación advirtiendo que no recibirá pagos
- AND al confirmar, se elimina la integración en el backend

### Requirement: Liquidación al proveedor tras cobro MP
Cuando un pago Checkout Pro queda aprobado, el sistema SHALL registrar una liquidación con comisión de plataforma (20% + IVA) y monto neto transferible, consultable desde la app.

#### Scenario: Saldo pendiente de liquidación
- GIVEN pagos aprobados de ofertas del taller
- CUANDO el proveedor abre Finanzas en Créditos
- THEN ve liquidaciones pendientes y monto neto por cobrar
