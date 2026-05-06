# solicitudes-gestion Specification

## Purpose
Flujo para que el proveedor vea, filtre y responda a solicitudes de servicio
compatibles con sus especialidades. Una solicitud aceptada genera una orden.

## Requirements

### Requirement: Lista de solicitudes disponibles
El proveedor ve las solicitudes que puede aceptar según sus especialidades.

#### Scenario: Lista con solicitudes disponibles
- GIVEN un proveedor verificado y activo con especialidades configuradas
- CUANDO abre la sección de solicitudes
- THEN ve lista de solicitudes compatibles en estado=pendiente
- AND cada item muestra: tipo de servicio, vehículo, distancia y tiempo de publicación

#### Scenario: Sin solicitudes disponibles
- GIVEN no hay solicitudes compatibles con las especialidades del proveedor
- CUANDO abre la sección
- THEN ve estado vacío con mensaje "No hay solicitudes disponibles en este momento"

### Requirement: Aceptar solicitud
El proveedor acepta una solicitud consumiendo créditos.

#### Scenario: Aceptar solicitud con saldo suficiente
- GIVEN una solicitud disponible y el proveedor con créditos >= costo
- CUANDO el proveedor toca "Aceptar"
- THEN se descuentan los créditos
- AND se crea una orden asociada
- AND se notifica al usuario

#### Scenario: Aceptar sin créditos suficientes
- GIVEN el proveedor sin créditos
- CUANDO intenta aceptar una solicitud
- THEN ve modal "Saldo insuficiente" con CTA "Recargar créditos"

### Requirement: Rechazar solicitud
El proveedor puede rechazar solicitudes que no puede atender.

#### Scenario: Rechazar solicitud
- GIVEN una solicitud visible para el proveedor
- CUANDO el proveedor toca "Rechazar" y selecciona motivo
- THEN la solicitud desaparece de su lista
- AND se notifica al usuario con el motivo
