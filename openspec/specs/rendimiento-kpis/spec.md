# rendimiento-kpis Specification

## Purpose
Pantalla de rendimiento y KPIs del proveedor (app/components/rendimiento/).
Muestra métricas de ingresos, órdenes completadas, calificación y tendencias.

## Requirements

### Requirement: KPIs principales
El proveedor ve sus indicadores clave en la pantalla de rendimiento.

#### Scenario: KPIs cargados correctamente
- GIVEN un proveedor con historial de órdenes
- WHEN navega a la pestaña de Rendimiento
- THEN ve: ingresos totales del período, órdenes completadas, calificación promedio, tasa de aceptación
- AND los datos corresponden al período seleccionado (semana, mes, año)

#### Scenario: Cambio de período
- GIVEN el proveedor en la pantalla de rendimiento
- CUANDO cambia el filtro de período (semana/mes/año)
- THEN los KPIs se actualizan con los datos del nuevo período
- AND la actualización es fluida sin saltar la pantalla

#### Scenario: Sin órdenes en el período
- GIVEN un proveedor nuevo o sin actividad en el período seleccionado
- WHEN carga los KPIs
- THEN muestra ceros en los indicadores y un mensaje de "Sin actividad en este período"

### Requirement: Gráfico de ingresos
Se muestra un gráfico de línea/barras con la evolución de ingresos.

#### Scenario: Gráfico renderizado
- GIVEN datos de ingresos diarios/semanales disponibles
- WHEN se carga el componente de gráfico
- THEN el gráfico se renderiza correctamente con los datos del período
- AND no bloquea el scroll de la pantalla (memoizado con React.memo)

### Requirement: Historial de transacciones
El proveedor puede ver el desglose de cada ingreso.

#### Scenario: Lista de transacciones
- GIVEN un proveedor con pagos procesados
- WHEN hace scroll hasta el historial de transacciones
- THEN ve una FlatList paginada con: fecha, servicio, monto bruto, comisión, monto neto
- AND la lista soporta scroll sin jank (optimización FlatList configurada)
