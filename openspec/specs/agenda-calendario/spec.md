# agenda-calendario Specification

## Purpose
Calendario unificado del proveedor con órdenes Mecanimovil y citas personales, filtrable por mecánico.

## Requirements

### Requirement: Filtro por mecánico
El mandante/supervisor SHALL poder filtrar la agenda por `miembro_taller` desde `app/(tabs)/calendario.tsx`.

#### Scenario: Ver agenda de un mecánico
- **WHEN** selecciona un chip de mecánico
- **THEN** el feed `proveedor-agenda` filtra eventos por ese miembro

### Requirement: Auto-filtro mecánico de equipo
Un usuario con rol `mecanico` SHALL ver solo su propia agenda sin selector manual.

#### Scenario: El mecánico no elige otra agenda
- GIVEN un usuario con rol mecanico
- WHEN abre la agenda
- THEN ve solo sus citas
- AND no hay selector para cambiar de mecánico

### Requirement: Citas sin horario no son visitas
`GET /ordenes/proveedor-agenda/` SHALL omitir citas personales con `horario_por_confirmar=true`. Esas citas viven en Bandeja (Por agendar) hasta confirmar día y hora.

#### Scenario: Placeholder de cotización aceptada
- GIVEN una cita activa con `horario_por_confirmar=true`
- WHEN el taller abre Agenda
- THEN esa cita no aparece en el calendario
- AND aparece al confirmar horario (`horario_por_confirmar=false`)

### Requirement: Ficha de cita por URL

Abrir `/cita-agenda-personal/{id}` MUST seguir siendo un deep link con los mismos permisos de edición y borrado. La pantalla MUST salir de «Cargando…» cuando llega la cita, sin esperar el detalle del técnico ni un segundo intento silencioso de la misma petición. Si la cita no llega, MUST mostrar el error y un reintento. El técnico se completa después, sin tapar la ficha. La cotización de origen, si existe, carga aparte y MUST NOT reconsultar la búsqueda web del cotizador desde esta ficha.

#### Scenario: La cita llega y el técnico todavía no

- GIVEN la cita responde y el técnico todavía se está completando
- WHEN se abre `/cita-agenda-personal/85`
- THEN la ficha deja de decir «Cargando…»
- AND el enlace directo sigue abriendo esa cita

#### Scenario: La cita no responde

- GIVEN la petición de la cita falla
- WHEN se abre la ficha
- THEN no queda indefinidamente en «Cargando…»
- AND se puede reintentar

### Requirement: Cita descartada fuera de la agenda comercial
AgendaComercial SHALL armar sus carriles solo con eventos presentes. Una cita cerrada o cancelada que se descarta al cruzar el calendario MUST NOT quedar en la lista como un evento nulo.

#### Scenario: Cita cerrada
- **WHEN** el calendario marca la cita como cerrada o cancelada
- **THEN** esa cita no entra a próximas, taller ni firma
