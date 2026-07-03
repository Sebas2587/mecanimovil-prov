# Changelog — App Proveedores (mecanimovil-prov)

Registro de cambios relevantes para la app de talleres y mecánicos. Incluye dependencias de backend cuando aplica.

---

## 2026-07-03 — Asignaciones en tiempo real (mecánico)

### App proveedores
- **Home del mecánico se actualiza solo** al recibir una orden o cita asignada, sin recargar manualmente.
- WebSocket **siempre activo** en sesión de mecánico de equipo (no depende del radar de oportunidades).
- Hook `useAsignacionesMecanicoRealtime`: escucha eventos WS, push en primer plano y polling cada 45 s con la app activa.
- Push `orden_asignada_mecanico` / `checklist_pendiente` invalida la lista de asignaciones al llegar.

**Commits:** `3758d8c`

### Backend
- WebSocket `orden_asignada_mecanico` y `cita_asignada_mecanico` al grupo `proveedor_{usuario_mecanico}`.
- Push al crear cita personal asignada a un miembro del equipo.

**Commits:** `345b399`

---

## 2026-07-03 — Guía IA: presentación y tipo de motor

### App proveedores
- Componente **`GuiaReparacionContenido`**: causas con bullets, pasos numerados tipográficos, advertencias resaltadas, chip de tipo de motor.
- Integrado en tarjeta de asistente IA y biblioteca de guías guardadas.
- Botón **Guardar guía** solo visible para mecánicos de equipo.

**Commits:** `9194435`

### Backend
- Resolución de combustible desde **patente (GetAPI)**, vehículo registrado, oferta y nombre del servicio.
- Prompt IA con reglas estrictas: no mezclar procedimientos diésel / bencina / eléctrico / híbrido.
- **Mandante (taller unipersonal)** puede usar IA si no hay mecánico asignado; supervisor nunca.
- Cada perfil solo ve guías generadas en su propia sesión (`generado_por` / mandante sin FK).
- Tests de contexto motor y permisos en citas.

**Commits:** `7cc610a`

---

## 2026-07-02 — Permisos asistente IA y biblioteca de guías

### App proveedores
- Asistente IA visible solo para **mecánico asignado** o mandante sin asignación (taller unipersonal).
- Pantalla **Guías de reparación** (`/guias-reparacion`) agrupada por marca/modelo; enlace desde perfil mecánico.
- Utilidades `asistenteIaPermisos.ts` alineadas con backend.

**Commits:** `20d6557`

### Backend
- Modelo `GuiaReparacionGuardada`, API `/api/ordenes/guias-reparacion-guardadas/`.
- Permisos asistente IA: mecánico asignado, mandante sin mecánico, bloqueo supervisor.

**Commits:** `546d56f`

---

## 2026-07-02 — Perfil según rol de sesión

### App proveedores
- Nombre y etiquetas del **usuario en sesión** (mandante, supervisor, mecánico), no siempre el nombre del taller.
- Mecánico: modalidad técnica y especialidades en perfil.
- Estado “Validando documentación” solo para mandante.

**Commits:** `9dc032f`

### Backend
- `EstadoProveedorView` expone `miembro_modalidad_tecnico`, `miembro_modalidad_display`, `miembro_especialidades`.

**Commits:** `aa47235`

---

## 2026-07 — Asistente IA en citas personales

### App proveedores
- Tarjeta `AsistenteDiagnosticoCard` en detalle de **cita agenda personal**.
- Servicio y pantallas conectados al endpoint de cita.

**Commits:** `49b6cc2`, backend `eb9d110`

### Backend
- Endpoint `GET/POST .../citas-agenda-personal/{id}/asistente-ia/`.
- Modelo `DiagnosticoAsistidoCitaPersonal`.

---

## 2026-07 — Sesión mecánico de equipo

### App proveedores
- **`MecanicoHomeView`**: órdenes y citas asignadas al mecánico en Inicio.
- Tabs Órdenes/Chats ocultos para rol mecánico; acceso a calendario y checklist desde home.
- Deep link push `orden_asignada_mecanico`.
- Alertas filtradas: mecánico solo ve alertas de asignación/checklist.
- Header de taller en home del mecánico; login con usuario en web.

**Commits:** `37c0759`, `fe82a1d`, merge PR #4

### Backend
- Scoping: mecánico solo ve órdenes con `mecanico_asignado` propio.
- Push `orden_asignada_mecanico` al asignar.
- WebSocket autentica supervisores y mecánicos de equipo.

**Commits:** `c465bcc`, openspec mecanico-sesion-api

---

## 2026-07 — Citas personales: VIN

### App proveedores
- Captura y visualización de **VIN** en citas personales.

**Commits:** `ca1847b`

### Backend
- Campo `vehiculo_vin` en detalle de cita personal.

**Commits:** `e3e7738`

---

## 2026-07 — Infraestructura push e IA

### App proveedores
- `PushNotificationSetup` dentro de `AlertsProvider` (fix contexto).
- Web push en proveedor; listeners nativos para tipos de mecánico.
- Documentación: `docs/PUSH_NOTIFICATIONS.md`.

### Backend
- Gemini: modelo `gemini-3.1-flash-lite`, manejo HTTP 429, tracking de tokens en rendimiento del taller.
- Variables `GEMINI_API_KEY` documentadas para Render.

**Commits:** `54a1fab`, `b7e120e`

---

## Despliegue

Tras push a `main`, Render despliega backend automáticamente. La app proveedor (Expo/Vercel) requiere rebuild o recarga con caché limpia (`npx expo start -c`) para ver cambios de UI.
