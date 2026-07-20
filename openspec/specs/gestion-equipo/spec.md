# gestion-equipo Specification

## Purpose
Gestión del equipo del taller: mecánicos, supervisor, credenciales de acceso, permisos y estado activo/inactivo.

## Requirements

### Requirement: CRUD de mecánicos
El mandante (o supervisor con permiso `mecanicos`) SHALL poder crear, editar, habilitar/deshabilitar y eliminar mecánicos con nombre, especialidades, modalidad de atención y foto opcional.

#### Scenario: Alta de mecánico
- **WHEN** el usuario guarda un mecánico con al menos una especialidad
- **THEN** el backend crea `MiembroTaller` con rol `mecanico` y aparece en la lista

### Requirement: Supervisor único
El taller SHALL tener como máximo un supervisor con credenciales y permisos JSON configurables.

#### Scenario: Designar supervisor
- **WHEN** no existe supervisor y el mandante lo designa con usuario/contraseña
- **THEN** el supervisor puede iniciar sesión con permisos acotados

### Requirement: Acceso desde gestión del taller
La pantalla `app/gestionar-taller.tsx` SHALL incluir acceso directo a `app/gestion-equipo.tsx`.
