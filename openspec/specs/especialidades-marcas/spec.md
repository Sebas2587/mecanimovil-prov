# especialidades-marcas Specification

## Purpose
Pantalla donde el proveedor configura sus especialidades de servicio y marcas de
vehículos que atiende (app/especialidades-marcas.tsx).

## Requirements

### Requirement: Selección de especialidades
El proveedor indica en qué tipos de servicio mecánico se especializa.

#### Scenario: Guardar especialidades
- GIVEN un proveedor en la pantalla de especialidades
- CUANDO selecciona una o más especialidades y confirma
- THEN las especialidades se guardan en el backend
- AND se usan para filtrar solicitudes compatibles con el proveedor

#### Scenario: Sin especialidades seleccionadas
- GIVEN el proveedor intenta guardar sin seleccionar nada
- CUANDO confirma
- THEN se muestra validación "Debes seleccionar al menos una especialidad"

### Requirement: Selección de marcas de vehículos
El proveedor indica qué marcas de autos atiende.

#### Scenario: Guardar marcas
- GIVEN un proveedor que selecciona marcas (ej. Toyota, Chevrolet, Ford)
- CUANDO guarda la selección
- THEN las marcas quedan asociadas al perfil del proveedor

### Requirement: Reflejo en el perfil público
Las especialidades y marcas configuradas se muestran en el perfil visible para usuarios.

#### Scenario: Usuario ve especialidades del proveedor
- GIVEN un proveedor con especialidades configuradas y estado=verificado
- CUANDO un usuario consulta su perfil
- THEN ve las especialidades y marcas del proveedor como chips/tags
