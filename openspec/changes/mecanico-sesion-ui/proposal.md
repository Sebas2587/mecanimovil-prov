# mecanico-sesion-ui

## Why

Los mecánicos del equipo no tienen interfaz en la app de proveedores. El mandante debe poder configurarles acceso (usuario/contraseña) y el mecánico debe ver solo sus órdenes asignadas, su calendario y completar checklist, con un menú reducido (Inicio + Configuración).

## What Changes

- Sección "Acceso del mecánico" en `app/gestion-equipo.tsx` (como supervisor, sin permisos).
- Extender `AuthContext` y tipos API con `rol_taller='mecanico'`, `esMecanicoEquipo`, `miembro_id`.
- Ocultar tabs Órdenes y Chats para mecánico en `app/(tabs)/_layout.tsx`.
- Nuevo `components/home/MecanicoHomeView.tsx` con órdenes asignadas y acceso a calendario/checklist.
- Configuración reducida en `app/(tabs)/perfil.tsx` (foto + cerrar sesión).
- Ocultar aceptar/rechazar en pantallas de detalle cuando `esMecanicoEquipo`.
- Deep link push `orden_asignada_mecanico` en `utils/push/navigateByPushNotification.ts`.

## Requirements

- REQ-UI-MECANICO-ACCESO: el formulario de mecánico SHALL permitir configurar usuario, correo y contraseña.
- REQ-UI-MECANICO-TABS: el mecánico SHALL ver solo tabs Inicio y Configuración.
- REQ-UI-MECANICO-HOME: Inicio SHALL listar solo órdenes asignadas al mecánico.
- REQ-UI-MECANICO-PERFIL: Configuración SHALL permitir cambiar foto de perfil y cerrar sesión.
