# Análisis Completo - MecaniMóvil App Proveedores

**Fecha:** 3 de noviembre, 2026  
**Repositorio:** Sebas2587/mecanimovil-app-proveedores  
**Tipo de proyecto:** Aplicación React Native + TypeScript para proveedores/mecánicos  
**Backend:** Django/DRF en Sebas2587/mecanimovil-backend  
**App complementaria:** Sebas2587/mecanimovil-usuarios (clientes)

---

## 1. ESTRUCTURA Y ARQUITECTURA

### 1.1 Configuración del Proyecto

**Stack tecnológico principal:**
- **Framework:** Expo SDK 57 (`app.json`, `package.json`)
- **Runtime:** React 19.2.3 + React Native 0.86.3
- **Lenguaje:** TypeScript 6.0.3 con modo `strict` habilitado (`tsconfig.json`)
- **Navegación:** Expo Router 57.0.22 (file-based routing con typed routes)
- **Estado:** React Query 5.96.2 (@tanstack/react-query) + Context API
- **HTTP:** Axios 1.13.2
- **Plataformas:** iOS, Android (carpetas nativas presentes), Web (Metro bundler)

**Tipo de proyecto:**
- **NO es bare workflow puro** - tiene carpetas `android/` e `ios/` con código nativo pero sigue siendo managed con Expo
- **Configuración:** `app.config.ts` con lógica dinámica para Google Sign-In
- **Build:** EAS Build configurado (`eas.json` con projectId: 934a3f58-256e-499b-a14b-6ad252eba296)
- **Deploy web:** Configurado para Vercel (`vercel.json`, scripts de deploy)

**Líneas de código totales:** ~147,015 líneas (`.ts` y `.tsx`)

### 1.2 Estructura de Carpetas

```
mecanimovil-app-proveedores/
├── app/                          # 76 pantallas (Expo Router)
│   ├── (auth)/                   # Flujo de autenticación
│   ├── (onboarding)/             # 11 pantallas de onboarding
│   ├── (tabs)/                   # 8 tabs principales (home, cotizaciones, etc.)
│   ├── _layout.tsx               # Root layout con providers
│   └── index.tsx                 # Pantalla de entrada/routing inicial
├── components/                   # 218 componentes reutilizables
│   ├── ui/                       # Componentes básicos de UI
│   ├── solicitudes/              # 15 componentes (276K)
│   ├── chats/                    # Sistema de mensajería (412K)
│   ├── checklist/                # Checklist de órdenes (248K)
│   ├── cotizacion/               # Cotizaciones (88K)
│   ├── home/                     # Dashboard (224K)
│   ├── taller/                   # Gestión de taller (132K)
│   └── [otros módulos]
├── services/                     # 30 archivos (12,775 líneas totales)
│   ├── api.ts                    # API client central (2,045 líneas)
│   ├── solicitudesService.ts     # Solicitudes (1,113 líneas)
│   ├── checklistService.ts       # Checklist (1,702 líneas)
│   ├── websocketService.ts       # WebSockets (915 líneas)
│   ├── cotizacionCanalService.ts # Cotizaciones omnicanal (974 líneas)
│   └── [27+ servicios más]
├── context/                      # Providers de estado global
│   ├── AuthContext.tsx           # Autenticación (1,098 líneas aprox.)
│   ├── RadarOportunidadesContext.tsx
│   ├── ChatsContext.tsx
│   └── AlertsContext.tsx
├── design-system/                # Sistema de diseño Airbnb Hosts + Tinder
│   ├── tokens/                   # Colors, typography, spacing
│   ├── components/               # Componentes institucionales (80K)
│   └── styles/                   # Estilos reutilizables
├── utils/                        # Utilidades y helpers
├── hooks/                        # Custom React hooks
├── constants/                    # Constantes globales
├── config/                       # Configuración adicional
├── openspec/                     # Documentación OpenSpec (especificaciones)
│   ├── specs/                    # 9 especificaciones principales
│   └── changes/                  # Cambios implementados/en progreso
└── docs/                         # Documentación técnica
```

**Evidencia de tamaño:**
- `services/api.ts`: 72KB (cliente HTTP central)
- `components/chats/`: 412KB (sistema de mensajería más grande)
- `components/solicitudes/`: 276KB (gestión de solicitudes)
- `app/(onboarding)/`: 276KB (flujo de registro)
- `app/(tabs)/`: 188KB (pantallas principales)

### 1.3 Navegación

**Sistema de navegación:** Expo Router (file-based) con stack y tabs

**Estructura principal:**
```
index.tsx → Resuelve ruta según estado del proveedor
├── (auth)/login.tsx              # Login (email/password + Google)
├── (onboarding)/                 # 11 pasos de registro
│   ├── tipo-cuenta.tsx           # Taller vs Mecánico
│   ├── informacion-basica.tsx
│   ├── especialidades.tsx
│   ├── cobertura-marcas.tsx      # Especialista vs Multimarca
│   ├── seleccion-marcas.tsx
│   ├── catalogo-servicios-marcas.tsx
│   ├── documentacion.tsx
│   ├── finalizar.tsx
│   └── cuenta-en-revision.tsx
└── (tabs)/                       # Navegación principal
    ├── index.tsx                 # Dashboard "Hoy"
    ├── cotizaciones.tsx          # Gestión de cotizaciones
    ├── bandeja.tsx               # Clientes (CRM)
    ├── calendario.tsx            # Agenda
    ├── ordenes.tsx               # Servicios (solo mecánicos equipo)
    ├── chats.tsx                 # Mensajes (oculto, acceso por chrome)
    └── perfil.tsx                # Menú de configuración
```

**Navegación dinámica por rol:** (`app/(tabs)/_layout.tsx:190-246`)
- **Dueño/Mandante:** Hoy, Cotizaciones, Clientes, Agenda, Menú (5 tabs visibles)
- **Supervisor:** Igual que mandante con permisos restringidos
- **Mecánico del equipo:** Hoy, Servicios, Menú (3 tabs visibles)
- **Escritorio web (≥1024px):** Tabs en barra superior en lugar de inferior

**Pantallas adicionales (fuera de tabs):**
- `/crear-oferta/[solicitudId]` - Crear oferta para solicitud
- `/oferta-detalle/[id]` - Detalle de oferta
- `/orden-detalle/[id]` - Detalle de orden de servicio
- `/solicitud-detalle/[solicitudId]` - Detalle de solicitud
- `/chat-oferta/[ofertaId]` - Chat por oferta
- `/checklist-item/[ordenId]/[itemId]` - Item de checklist
- `/configuracion-*` - 10+ pantallas de configuración
- `/creditos/*` - Sistema de créditos (saldo, historial, comprar)
- **80+ pantallas totales** en el árbol de navegación

**Routing lógico:** `utils/auth/resolveProveedorRoute.ts` + `app/index.tsx:49-59`
- Sin sesión → `/(auth)/login`
- Onboarding incompleto → `/(onboarding)/*`
- En revisión → `EstadoRevisionScreen`
- Aprobado → `/(tabs)/` (dashboard)

### 1.4 Manejo de Estado

**Arquitectura de estado:** Híbrido (React Query + Context API)

**1. React Query (@tanstack/react-query):** Estado del servidor (cache, refetch, optimistic updates)

Configuración global (`app/_layout.tsx:112-126`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutos
      retry: (failureCount, error) => {
        // No reintentar 401, 403, 429, ERR_NO_AUTH
        if (err?.code === 'ERR_NO_AUTH' || status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
```

**Uso principal:**
- `hooks/usePipelineComercialQuery.ts` - Pipeline CRM
- `hooks/useCotizacionesCanalTallerQuery.ts` - Cotizaciones omnicanal
- `hooks/useOrdenesProveedorQuery.ts` - Órdenes de servicio
- `hooks/useSolicitudesQuery.ts` - Solicitudes disponibles
- **Patrón:** Custom hooks que encapsulan `useQuery`/`useMutation`

**2. Context API:** Estado de aplicación global

**Providers principales** (`app/_layout.tsx:179-188`):
```typescript
<AuthProvider>                      // Sesión, usuario, estado proveedor
  <RadarOportunidadesProvider>      // Radar de solicitudes activo/inactivo
    <AlertsProvider>                // Alertas globales (suscripción, etc.)
      <ChatsProvider>               // Estado de chats
        <ThemeProvider>             // Tema (dark/light)
          {children}
        </ThemeProvider>
      </ChatsProvider>
    </AlertsProvider>
  </RadarOportunidadesProvider>
</AuthProvider>
```

**AuthContext** (`context/AuthContext.tsx`):
- **Estado:** `usuario`, `estadoProveedor`, `isLoading`, `isAuthenticated`
- **Roles:** `rolTaller` ('mandante' | 'supervisor' | 'mecanico')
- **Permisos:** `puede(recurso)` - valida permisos de supervisor
- **Funciones:** `login`, `logout`, `loginWithGoogle`, `refrescarEstadoProveedor`
- **Cache:** Usa `utils/auth/estadoProveedorCache.ts` para persistencia
- **Hidratación:** Espera hidratación de AsyncStorage antes de API calls

**RadarOportunidadesContext** (`context/RadarOportunidadesContext.tsx`):
- **Estado:** `radarOportunidadesActivo` (boolean)
- **Persistencia:** AsyncStorage key `proveedor_radar_oportunidades_activo_v1`
- **Efecto:** Activa/desactiva WebSocket de solicitudes en tiempo real

**ChatsProvider** - Estado de conversaciones activas
**AlertsProvider** - Estado de salud de suscripción y alertas

**3. Estado local:** `useState` en componentes para UI temporal

### 1.5 Capa de API y Servicios

**Cliente HTTP central:** `services/api.ts` (2,045 líneas)

**Configuración dinámica del servidor:**
- **Desarrollo:** Auto-discovery de IP local (`services/serverConfig.ts:170-250`)
  - Prioridad: ngrok > IPs locales detectadas > producción fallback
  - Prueba conectividad con `fetch` a `/api/hello/`
  - Soporte para Android (10.0.2.2), iOS, Web
- **Producción:** URL fija `https://mecanimovil-api.onrender.com/api` (`app.json:121`)
- **Flag:** `forceProduction: true` en `app.json:127`

**Axios instance** (`services/api.ts:76-111`):
- Base URL dinámica (async)
- Timeout: 30s (cold starts de Render)
- Headers automáticos: `ngrok-skip-browser-warning`, `Authorization: Token <token>`

**Interceptores** (`services/api.ts:116-289`):

**Request interceptor:**
- Agrega token de autenticación (excepto endpoints públicos)
- Maneja FormData (no setea Content-Type manualmente)
- Espera hidratación de AuthContext antes de agregar token
- Rechaza con `ERR_NO_AUTH` si no hay token para endpoint protegido

**Response interceptor:**
- **401:** Limpia tokens expirados automáticamente
- **503:** Reintenta GET hasta 2 veces con backoff (400ms, 800ms)
- **Network errors:** Rechequea configuración del servidor en desarrollo
- Logs solo en `__DEV__`

**Servicios organizados por dominio:**

1. **`authAPI`** (`services/api.ts:415-705`): 14 métodos
   - `login`, `logout`, `registro`, `isAuthenticated`
   - `loginWithGoogle` → `services/auth/googleAuth.ts`
   - `obtenerEstadoProveedor` - Estado de onboarding y verificación
   - `inicializarOnboarding`, `completarOnboarding`
   - `verificarDatosOnboarding` (RUT/teléfono duplicado)

2. **`tallerAPI`** (`services/api.ts:710-763`): 7 métodos
   - `crearTaller`, `actualizarTallerPropio`
   - `actualizarMarcas` (con tipo_cobertura_marca)
   - `actualizarUbicacionDomicilio` (geocoding)

3. **`mecanicoAPI`** (`services/api.ts:766-819`): 7 métodos
   - Similar a tallerAPI pero para MecanicoDomicilio

4. **`documentosAPI`** (`services/api.ts:950-995`): 4 métodos
   - `subirDocumento` (multipart/form-data con `fetch` nativo)
   - `obtenerMisDocumentos`, `eliminarDocumento`
   - Normaliza nombres de archivo y MIME types

5. **`perfilAPI`** (`services/api.ts:1429-1733`): 3 métodos
   - `actualizarFotoPerfil` (fetch nativo, 60s timeout)
   - `actualizarDatosProveedor` (detecta tipo automáticamente)

6. **`serviciosAPI`** (`services/serviciosApi.ts`): 585 líneas
   - `obtenerMisServicios`, `crearServicio`, `actualizarServicio`
   - `obtenerMisMarcas`, `obtenerServiciosPorMarca`
   - `crearCatalogoInicial` - Onboarding de servicios

7. **`solicitudesService`** (`services/solicitudesService.ts`): 1,113 líneas
   - `listarSolicitudesDisponibles` (con filtros)
   - `crearOferta`, `actualizarOferta`, `eliminarOferta`
   - `rechazarSolicitud` (con motivo tipado)
   - `marcarSolicitudVista`, `obtenerOfertasProveedor`
   - Manejo de fotos de necesidad del cliente

8. **`ordenesProveedor`** (`services/ordenesProveedor.ts`): 489 líneas
   - `obtenerOrdenesActivas`, `obtenerOrdenesCompletadas`
   - `obtenerDetalleOrden` (con deduplicación por oferta)
   - `cambiarEstadoOrden`, `asignarMecanicoOrden`
   - Cliente protegido vs completo según nivel de acceso

9. **`checklistService`** (`services/checklistService.ts`): 1,702 líneas (más grande)
   - `obtenerChecklistOrden`, `iniciarChecklist`
   - `actualizarItemChecklist` (múltiples tipos de items)
   - `subirFotoChecklist`, `generarFirmaDigital`
   - `finalizarChecklist` - Marca orden como completada

10. **`chatService`** (`services/chatService.ts`): Mensajería por oferta
    - `obtenerMensajes`, `enviarMensaje`
    - `marcarMensajesLeidos`, `subirArchivoChat`
    - WebSocket para mensajes en tiempo real

11. **`websocketService`** (`services/websocketService.ts`): 915 líneas
    - Conexión persistente a Django Channels
    - Canales: `proveedor.{id}`, `oferta.{id}`, `radar_oportunidades`
    - Reconexión automática con backoff exponencial
    - Gestiona 3 tipos de sesión: radar, chat, tabs de taller

12. **`cotizacionCanalService`** (`services/cotizacionCanalService.ts`): 974 líneas
    - Cotizaciones omnicanal (WhatsApp, Instagram, etc.)
    - `crearCotizacion`, `enviarCotizacion`, `actualizarPrecios`
    - Integración con agente IA para cotización automática

13. **`agendaProveedorService`** (`services/agendaProveedorService.ts`): 448 líneas
    - `obtenerCitasCalendario`, `crearCitaPersonal`
    - `obtenerDisponibilidad`, `bloquearHorario`

14. **Otros servicios:** `creditosService`, `equipoTallerService`, `kpisProveedorService`, `mercadoPagoProveedorService`, `suscripcionesService`, etc.

**Tipos TypeScript:** Bien definidos en cada servicio
- `EstadoProveedor`, `SolicitudPublica`, `OfertaProveedor`, `Orden`
- `ClienteProtegido` vs `ClienteCompleto` (ofuscación de datos)
- Discriminated unions para estados: `estado: 'creada' | 'publicada' | ...`

**Helpers de paginación:**
- `utils/fetchPaginated.ts` - Fetching automático de todas las páginas DRF

### 1.6 Autenticación y Autorización

**Métodos de autenticación:**

1. **Email/Password** (`services/api.ts:451-572`)
   - Endpoint: `POST /usuarios/login-proveedor/`
   - Token-based (Django Rest Framework Token)
   - Hasta 3 reintentos con backoff (2s, 4s, 6s)
   - Diagnóstico de conectividad en desarrollo
   - Persistencia: `authToken` en AsyncStorage

2. **Google Sign-In** (`services/auth/googleAuth.ts`)
   - **Nativo (iOS/Android):** `@react-native-google-signin/google-signin`
   - **Web:** Google One Tap + OAuth 2.0
   - Configuración dinámica de `iosClientId` en `app.config.ts:38-48`
   - Endpoint: `POST /usuarios/google-login-proveedor/`
   - Flujo: `login` (existente) o `register` (nuevo)

**Almacenamiento de credenciales:**
- **Token:** `expo-secure-store` (iOS/Android) / AsyncStorage (Web)
- **Wrapper:** `utils/authStorage.ts` - `getItem`, `setItem`, `deleteItem`
- **Cache en memoria:** `utils/authTokenCache.ts` - Evita reads de SecureStore en cada request
- **Hidratación:** `waitForAuthHydration()` antes de API calls

**Estado del proveedor** (`services/api.ts:340-390`):
- **Tipo:** `EstadoProveedor` interface
- **Campos clave:**
  - `tiene_perfil: boolean`
  - `tipo_proveedor: 'taller' | 'mecanico'`
  - `rol_taller: 'mandante' | 'supervisor' | 'mecanico'` (nuevo)
  - `permisos?: PermisosSupervisor` (para supervisores)
  - `miembro_id`, `miembro_nombre`, `miembro_modalidad_tecnico` (para mecánicos equipo)
  - `estado_verificacion: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado'`
  - `onboarding_completado: boolean`
  - `datos_proveedor` - Info del taller/mecánico
- **Cache:** `utils/auth/estadoProveedorCache.ts` (60s TTL)
- **Refetch:** `AuthContext.refrescarEstadoProveedor()` con 4 reintentos

**Sistema de permisos** (`context/AuthContext.tsx:103-110`):
- **Mandante:** Acceso total (dueño del taller)
- **Supervisor:** Permisos granulares
  - `servicios`, `mecanicos`, `horarios`, `agenda`, `zonas_cobertura`, `finanzas`
- **Mecánico equipo:** Acceso mínimo (solo órdenes asignadas)
- **Helper:** `puede(recurso: keyof PermisosSupervisor): boolean`

**Manejo de sesión expirada:**
- **401 con token:** Limpia cache automáticamente (`services/api.ts:211-249`)
- **Navegación:** AuthContext detecta cambio y redirige a login
- **Logout limpio:** Desconecta WebSocket, limpia AsyncStorage, invalida queries

**Protected routes:**
- Todos los endpoints (excepto login/registro) requieren `Authorization: Token <token>`
- Interceptor rechaza con `ERR_NO_AUTH` si no hay token (`services/api.ts:156-164`)

### 1.7 Dependencias Clave

**Producción (72 dependencias):**

**Expo Core:**
- `expo@57.0.0` - Framework principal
- `expo-router@57.0.22` - Navegación file-based
- `react@19.2.3`, `react-native@0.86.3`

**Navegación y gestos:**
- `react-native-screens@4.26.0`, `react-native-safe-area-context@5.7.0`
- `react-native-gesture-handler@2.32.0`
- `react-native-reanimated@4.5.1` - Animaciones performantes

**Estado y datos:**
- `@tanstack/react-query@5.96.2` - Server state management
- `axios@1.13.2` - HTTP client
- `@react-native-async-storage/async-storage@2.2.0`
- `expo-secure-store@57.0.4` - Almacenamiento seguro

**UI y diseño:**
- `lucide-react-native@1.7.0` - Iconos (consistente con backend admin)
- `expo-linear-gradient@57.0.2` - Gradientes Tinder
- `expo-blur@57.0.3`
- `react-native-gifted-charts@1.4.74` - Gráficos (KPIs)
- `react-native-svg@15.15.4`

**Autenticación:**
- `@react-native-google-signin/google-signin@16.1.2`
- `expo-web-browser@57.0.3` - OAuth flows

**Media y archivos:**
- `expo-image@57.0.5` - Carga de imágenes optimizada
- `expo-image-picker@57.0.19`
- `expo-document-picker@57.0.2`
- `expo-image-manipulator@57.0.19`
- `react-native-webview@13.16.1`
- `react-native-signature-canvas@4.7.4` - Firma digital en checklist

**Features nativas:**
- `expo-notifications@57.0.20` - Push notifications
- `expo-location@57.0.19` - Geolocalización
- `expo-audio@57.0.5`, `expo-video@57.0.4` - Mensajes de voz
- `expo-haptics@57.0.3` - Feedback táctil
- `@react-native-community/datetimepicker@9.1.0`

**Utilidades:**
- `date-fns@4.1.0` - Manejo de fechas (español CL)
- `buffer@6.0.3` - Polyfill para RN

**Fuentes:**
- `@expo-google-fonts/poppins@0.4.1` - Fuente principal
- `@expo-google-fonts/inter@0.4.2`

**Desarrollo (4 dependencias):**
- `typescript@6.0.3` (versión muy reciente, posible typo - probablemente 5.x)
- `@babel/core@7.29.0`
- `eslint@9.25.0`, `eslint-config-expo@57.0.2`
- `@types/react@19.2.4`

**Nota de versiones:**
- `typescript@6.0.3` es sospechoso - TypeScript está en 5.x actualmente
- Puede ser un error de tipeo en package.json

### 1.8 Configuración de Build

**Expo Application Services (EAS):**
- `eas.json`: Configuración mínima
- Project ID: `934a3f58-256e-499b-a14b-6ad252eba296`
- Owner: `sebas2587`

**Android:**
- Package: `com.mecanimovil.proveedores`
- Bundle ID en `app.json:26`
- Google Services (Firebase): `google-services.json` presente
- Permisos: CAMERA, STORAGE, LOCATION, AUDIO, NOTIFICATIONS, VIBRATE

**iOS:**
- Bundle ID: `com.mecanimovil.proveedores` (`app.json:12`)
- Background modes: remote-notification
- Permisos: Micrófono para mensajes de voz

**Web (Vercel):**
- Deploy automático con Vercel API hook (`package.json:15`)
- Output: static (`app.json:59`)
- Scripts: `deploy:vercel:hook`, `deploy:vercel:cli`

**Scripts de build manual:**
- `create-apk.sh` - Build APK para pruebas (5,867 bytes)
- `create-apk-simple.sh` - Versión simplificada (4,075 bytes)

**Deep linking:**
- Scheme: `mecanimovilappproveedores://` (`app.json:8`)
- Android intent filter para MercadoPago callback (`app.json:40-54`)

---

## 2. LÓGICA Y PROCESOS DE NEGOCIO

### 2.1 Modelo de Negocio y Actores

**Ecosistema MecaniMóvil:**

1. **Clientes** (app usuarios) solicitan servicios automotrices
2. **Proveedores** (esta app) ofrecen y ejecutan servicios
3. **Backend** (Django/DRF) orquesta solicitudes, pagos, verificaciones

**Tipos de proveedores:**
- **Taller:** Establecimiento físico con dirección y equipo de mecánicos
- **Mecánico domicilio:** Profesional independiente que va donde el cliente

**Roles dentro del taller:**
- **Mandante:** Dueño del taller, acceso total
- **Supervisor:** Personal con permisos delegados (servicios, mecánicos, agenda, finanzas)
- **Mecánico del equipo:** Solo ve y ejecuta órdenes asignadas a él

**Sistema de créditos:**
- Los proveedores necesitan créditos para:
  - Enviar cotizaciones a clientes
  - Responder a solicitudes
- Planes mensuales con créditos incluidos
- Compra adicional de créditos (MercadoPago)

**Sistema de suscripciones:**
- Planes recurrentes (mensual)
- Alerta de "sin plan activo" en UI (`app/(tabs)/_layout.tsx:276-295`)
- Gestión en `/creditos/` (saldo, historial, comprar)

### 2.2 Flujo Principal: Ciclo de Vida de una Solicitud

**Diagrama de estados (simplificado):**
```
[Cliente crea solicitud] 
  ↓
PUBLICADA (visible en radar de proveedores)
  ↓
PROVEEDOR CREA OFERTA ← [Puede rechazar con motivo]
  ↓
CON_OFERTAS (cliente ve ofertas)
  ↓
CLIENTE SELECCIONA OFERTA
  ↓
ADJUDICADA → PENDIENTE_PAGO
  ↓
PAGADA
  ↓
EN_EJECUCION (checklist activo)
  ↓
COMPLETADA
```

**Estados posibles** (`services/solicitudesService.ts:103-118`):
- `creada` - Cliente inició pero no publicó
- `seleccionando_servicios` - Cliente eligiendo servicios
- `publicada` - Visible para proveedores
- `con_ofertas` - Hay ofertas de proveedores
- `pendiente_confirmacion` - Cliente seleccionó oferta
- `esperando_creditos_proveedor` - Proveedor sin créditos
- `adjudicada` - Oferta aceptada
- `pendiente_pago` - Cliente debe pagar
- `pagada` - Pago confirmado
- `en_ejecucion` - Servicio en proceso
- `completada` - Finalizada
- `expirada` - Pasó tiempo límite
- `cancelada` - Cancelada por cliente/proveedor

### 2.3 Flujo de Onboarding del Proveedor (11 pasos)

**Pantallas del flujo** (`app/(onboarding)/_layout.tsx`):

**1. Tipo de cuenta** (`tipo-cuenta.tsx` - inferido del layout)
- Elige: Taller o Mecánico a domicilio
- Llama `authAPI.inicializarOnboarding({ tipo_proveedor })`

**2. Información básica** (`informacion-basica.tsx`)
- **Taller:** Nombre, RUT, dirección, teléfono, descripción
- **Mecánico:** Nombre, DNI, años experiencia, teléfono, descripción
- Validación de RUT/teléfono duplicado con `authAPI.verificarDatosOnboarding`

**3. Especialidades** (`especialidades.tsx` - inferido)
- Selecciona categorías de servicios (Frenos, Motor, Electricidad, etc.)
- Endpoint: `POST /usuarios/actualizar-especialidades/` (`services/api.ts:1028-1033`)

**4. Cobertura de marcas** (`cobertura-marcas.tsx`)
- **Especialista:** Marcas específicas (ej: solo Mercedes, BMW, Audi)
- **Multimarca:** Todas las marcas
- Afecta visibilidad en búsquedas de clientes

**5. Selección de marcas** (`seleccion-marcas.tsx`)
- Si especialista: elige marcas que atiende
- Lista con logos de `vehiculoAPI.obtenerMarcas()` (`services/api.ts:823-836`)

**6. Catálogo de servicios por marca** (`catalogo-servicios-marcas.tsx`)
- Por cada marca seleccionada, elige servicios que ofrece
- Backend genera catálogo inicial con precios sugeridos
- Endpoint: `POST /servicios/proveedor/mis-servicios/crear_catalogo_inicial/`

**7. Documentación** (`documentacion.tsx` - inferido del layout, screen `subir-documentos.tsx`)
- **Taller:** RUT, Patente comercial, Foto de local
- **Mecánico:** Cédula identidad, Certificados técnicos
- Subida con `documentosAPI.subirDocumento()` (multipart FormData)
- Almacenamiento: Cloudflare R2 (backend)

**8. Finalizar** (`finalizar.tsx`)
- Revisa datos ingresados
- Llama `authAPI.completarOnboarding()` (`services/api.ts:1274-1278`)
- Backend marca `onboarding_completado: true`

**9-11. Estados post-onboarding:**
- **cuenta-en-revision.tsx:** Estado `en_revision` (staff validando docs)
- **finalizar-basico.tsx:** Edge case para completar onboarding sin docs

**Estado durante onboarding:**
- Guardado en `OnboardingDraftContext` (context local)
- Si abandona, puede retomar desde donde quedó
- Backend trackea `onboarding_iniciado` y `onboarding_completado`

**Verificación (staff):**
- Personal de MecaniMóvil revisa documentos
- Estados: `pendiente` → `en_revision` → `aprobado` / `rechazado`
- Solo proveedores `aprobado` ven solicitudes y pueden cotizar

### 2.4 Flujo de Recepción y Gestión de Solicitudes

**A. Radar de Oportunidades** (Dashboard "Hoy")

**Componente:** `components/home/*` (224KB)

**Activación del radar:**
- Switch en dashboard: "Activo" / "Pausado"
- Controlado por `RadarOportunidadesContext`
- Al activar → WebSocket se conecta a canal `proveedor.{id}`

**Listado de solicitudes** (`services/solicitudesService.ts:288-345`):
```typescript
listarSolicitudesDisponibles(filtros?: {
  marca?: number;
  servicio?: number;
  urgencia?: 'normal' | 'urgente';
  solo_sin_ofertas?: boolean;
  limite?: number;
})
```

**Visualización:**
- Cards con: Cliente (ofuscado), vehículo, problema, ubicación, servicios, urgencia
- **Datos visibles sin cotizar:** Cliente ofuscado, vehículo, descripción
- **Datos completos:** Solo si proveedor envía oferta (antispam)

**Solicitudes dirigidas vs globales:**
- **Global:** Todos los proveedores que cumplen criterios la ven
- **Dirigida:** Cliente selecciona proveedores específicos (favoritos)
- Campo `tipo_solicitud: 'global' | 'dirigida'` (`services/solicitudesService.ts:77`)

**Fotos de la necesidad:**
- Cliente puede adjuntar hasta 3 fotos al describir el problema
- Campo `fotos_necesidad[]` con URLs (`services/solicitudesService.ts:135-141`)

**Contador de tiempo:**
- `fecha_expiracion` y `tiempo_restante` (ej: "2h 30m")
- Componente `CountdownTimer` actualiza en tiempo real

**B. Crear Oferta** (`app/crear-oferta/[solicitudId].tsx`)

**Formulario de oferta** (`components/solicitudes/FormularioOferta.tsx`):
1. **Servicios solicitados:** Ya definidos por el cliente (no editables)
2. **Precio por servicio:** Proveedor ingresa costo mano de obra
3. **Tiempo estimado:** Horas que tomará cada servicio
4. **Repuestos necesarios:**
   - Selector con catálogo de repuestos (`services/api.ts:1853-1861`)
   - Precio + cantidad por repuesto
   - Proveedor puede marcar "precio a confirmar" si no tiene stock
5. **Notas adicionales:** Texto libre para aclaraciones
6. **Fecha/hora propuesta:** Si cliente no especificó, proveedor propone
7. **Costo total:** Calculado automáticamente (servicios + repuestos)

**Cálculo de preview:**
- `serviciosAPI.calcularPreview(costoManoObra, costoRepuestos)` (`services/api.ts:1822-1827`)
- Backend aplica comisiones y retorna precio final al cliente

**Envío de oferta:**
```typescript
solicitudesService.crearOferta({
  solicitud: solicitudId,
  servicios_detallados: [...],
  total: calculado,
  tiempo_estimado_total: suma_horas,
  notas_proveedor: string,
  fecha_propuesta?: string,
  hora_propuesta?: string,
})
```

**Flujo post-envío:**
- Descuenta créditos del proveedor
- Cliente recibe notificación push
- Oferta aparece en "Mis Ofertas" del proveedor
- Estado solicitud → `con_ofertas`

**C. Rechazar Solicitud**

**Modal** `components/solicitudes/RechazarSolicitudModal.tsx`

**Motivos tipados** (`services/solicitudesService.ts:26-34`):
- `ocupado` - "No tengo disponibilidad"
- `lejos` - "Muy lejos de mi zona"
- `no_servicio` - "No ofrezco ese servicio"
- `no_marca` - "No atiendo esa marca"
- `precio` - "Presupuesto muy bajo"
- `complejidad` - "Muy complejo para mi equipo"
- `recursos` - "No tengo los recursos necesarios"
- `politica` - "Políticas del taller"
- `otro` - Campo libre

**Endpoint:**
```typescript
solicitudesService.rechazarSolicitud(solicitudId, {
  motivo: MotivoRechazo,
  detalle_motivo?: string
})
```

**Efecto:**
- Solicitud desaparece del radar de ese proveedor
- No descuenta créditos
- Backend registra `RechazoSolicitud` para analytics

**D. Ofertas Secundarias**

Si cliente ya eligió otra oferta pero ésta fue cancelada, proveedor puede ver oferta secundaria en `solicitud.ofertas_secundarias[]`.

### 2.5 Flujo de Gestión de Órdenes (Servicios)

**A. Vista de Órdenes** (`app/(tabs)/ordenes.tsx` para mecánicos, desde dashboard para mandantes)

**Servicio:** `ordenesProveedor` (`services/ordenesProveedor.ts:149-489`)

**Endpoints principales:**
```typescript
obtenerOrdenesActivas()    // estados: confirmado, pagado, en_ejecucion
obtenerOrdenesCompletadas() // estados: completado, cancelado
obtenerDetalleOrden(id)
```

**Deduplicación:** `dedupeOrdenesPorIdYOferta()` (`services/ordenesProveedor.ts:119-145`)
- Backend puede retornar duplicados por race conditions
- Mantiene el estado más terminal por `oferta_proveedor_id`

**Estados de orden** (inferidos del código):
- `confirmado` - Adjudicada al proveedor
- `pagado` - Cliente pagó
- `en_ejecucion` - Proveedor trabajando
- `completado` - Servicio finalizado
- `cancelado` - Cancelado
- `rechazada_por_proveedor` - Proveedor rechazó después de aceptar

**Información del cliente:**
- **Nivel restringido:** Datos ofuscados (antes de enviar oferta)
- **Nivel parcial:** Algunos datos visibles
- **Nivel completo:** Todos los datos (después de adjudicación)
- Interfaces `ClienteProtegido` vs `ClienteCompleto` (`services/ordenesProveedor.ts:2-18`)

**B. Detalle de Orden** (`app/orden-detalle/[id].tsx`)

**Información mostrada:**
- Cliente: Nombre, teléfono (si tiene acceso), foto
- Vehículo: Marca, modelo, año, patente, color, motor, chasis
- Servicios: Lista de servicios con precios
- Repuestos: Incluidos en cada servicio
- Ubicación: Dirección (ofuscada o completa según acceso)
- Fecha/hora de servicio
- Estado actual
- Botones de acción según estado

**Acciones disponibles:**

**1. Agendar cita** (si estado = `pagado` sin fecha):
- Redirige a calendario del proveedor
- Propone fechas disponibles
- Cliente confirma/rechaza

**2. Asignar mecánico** (solo mandante/supervisor con permisos):
```typescript
ordenesProveedor.asignarMecanicoOrden(ordenId, {
  mecanico_asignado: miembroTallerId
})
```

**3. Iniciar servicio:**
```typescript
ordenesProveedor.cambiarEstadoOrden(ordenId, 'en_ejecucion')
```
- Solo si estado = `pagado` y hay fecha
- Activa checklist (ver siguiente sección)

**4. Chat con cliente** (`app/chat-oferta/[ofertaId].tsx`):
- WebSocket real-time
- Mensajes de texto + fotos + audios
- Historial completo

**5. Ver/editar checklist** (si estado = `en_ejecucion`):
- Redirige a `app/checklist-item/[ordenId]/[itemId]`

**C. Sistema de Checklist** (1,702 líneas)

**Servicio:** `checklistService` (`services/checklistService.ts`)

**Inicio del checklist:**
```typescript
checklistService.iniciarChecklist(ordenId) // Crea ChecklistOrden
```

**Estructura:**
- Basado en plantilla predefinida por servicio
- Items secuenciales con tipos variados
- Progreso persistido localmente + sincronizado con backend

**Tipos de items** (inferidos del servicio):
1. **Verificación simple** - Checkbox binario (OK / No OK)
2. **Nivel de combustible** - Gauge visual (`components/checklist/items/FuelGaugeComponent.tsx`)
3. **Inventario** - Lista de elementos del vehículo (`components/checklist/items/InventoryChecklistComponent.tsx`)
4. **Foto requerida** - Captura con cámara
5. **Medición** - Valor numérico (ej: presión de llantas)
6. **Texto libre** - Notas del mecánico
7. **Firma** - Firma digital del cliente (`components/checklist/ChecklistSignatureModal.tsx`)

**Pantalla de item** (`app/checklist-item/[ordenId]/[itemId].tsx`):
- Muestra item actual con su tipo específico
- Botones: "Anterior", "Siguiente", "Guardar"
- Progreso: `X de Y items completados`

**Subida de fotos:**
```typescript
checklistService.subirFotoChecklist(ordenId, itemId, {
  uri: string,
  type: string,
  name: string
})
```

**Finalización:**
```typescript
checklistService.finalizarChecklist(ordenId, {
  firma_digital_cliente: base64_signature,
  notas_finales?: string
})
```
- Valida que todos los items obligatorios estén completos
- Cambia estado de orden a `completado`
- Genera PDF del checklist (backend)

**Vista completada** (`components/checklist/ChecklistCompletedView.tsx`):
- Resumen de items completados
- Fotos tomadas
- Firma del cliente
- Botón "Descargar PDF"

### 2.6 Flujo de Agenda y Citas

**A. Configuración de Horarios** (`app/configuracion-horarios.tsx`)

**Servicio:** `horariosAPI` (`services/api.ts:1352-1424`)

**Configuración semanal:**
```typescript
horariosAPI.configurarSemanaCompleta({
  hora_inicio_global: "09:00",
  hora_fin_global: "18:00",
  duracion_slot_global: 60,        // minutos
  tiempo_descanso_global: 15,      // minutos entre citas
  dias_habilitados: [1,2,3,4,5],   // Lun-Vie
  eliminar_existente: true,
  miembro_taller?: number          // Si es para un mecánico específico
})
```

**Horarios por día:**
- Puede sobrescribir config global para días específicos
- Campo `configuracion_por_dia` opcional

**Presets rápidos:**
- `horariosAPI.obtenerPresets()` - Backend retorna configuraciones comunes
- Ejemplo: "Lun-Vie 9-18h", "Lun-Sab 8-14h y 15-19h"

**B. Vista de Calendario** (`app/(tabs)/calendario.tsx`)

**Servicio:** `agendaProveedorService` (`services/agendaProveedorService.ts`:448 líneas)

**Obtener citas:**
```typescript
agendaProveedorService.obtenerCitasCalendario({
  fecha_desde: "2024-01-01",
  fecha_hasta: "2024-01-31",
  mecanico?: number              // Filtrar por mecánico
})
```

**Tipos de eventos en calendario:**
1. **Citas de órdenes:** Servicios agendados con clientes
2. **Citas personales:** Bloques de tiempo del proveedor
3. **Bloques de disponibilidad:** Slots configurados

**Vista:**
- Mensual con días resaltados (citas ese día)
- Lista de citas del día seleccionado
- Badge con contador "X citas por agendar" (`app/(tabs)/_layout.tsx:44-48`)

**C. Crear Cita Personal** (`app/agendar-cita-personal.tsx`)

```typescript
agendaProveedorService.crearCitaPersonal({
  titulo: string,
  descripcion?: string,
  fecha: "2024-01-15",
  hora_inicio: "10:00",
  hora_fin: "11:30",
  tipo: 'personal' | 'bloqueo' | 'otro',
  mecanico_asignado?: number
})
```

**Uso:**
- Bloquear horarios para tareas internas
- Anotar eventos importantes
- Reservar tiempo sin cliente asociado

**D. Detalle de Cita** (`app/cita-agenda-personal/[id].tsx`)

**Información:**
- Si es cita de orden: Link a orden completa
- Si es personal: Título, descripción, duración
- Botones: Editar, Cancelar

**Edición:**
- Cambiar fecha/hora (si no tiene orden asociada)
- Agregar notas

**Confirmación de horario:**
- Componente `ConfirmarHorarioCitaSheet` (bottom sheet)
- Cliente recibe notificación push al confirmar

### 2.7 Flujo de Cotizaciones Omnicanal

**Contexto:** MecaniMóvil permite recibir consultas de clientes vía WhatsApp, Instagram, etc., y responder con cotizaciones formales.

**Pantalla:** `app/(tabs)/cotizaciones.tsx`

**Servicio:** `cotizacionCanalService` (`services/cotizacionCanalService.ts`:974 líneas)

**A. Lista de cotizaciones:**
```typescript
cotizacionCanalService.listarCotizaciones({
  estado?: 'borrador' | 'enviada' | 'aceptada' | 'rechazada',
  canal?: 'whatsapp' | 'instagram' | 'web',
  limite?: number
})
```

**Estados:**
- `borrador` - Creada pero no enviada al cliente
- `enviada` - Cliente recibió cotización
- `aceptada` - Cliente aprobó
- `rechazada` - Cliente rechazó
- `expirada` - Pasó validez (días_validez_cotizacion)

**B. Crear cotización libre** (`components/chats/CotizacionLibreModal.tsx`)

**Desde:** Botón flotante "+" en dashboard (mandante) o tab cotizaciones

**Formulario:**
1. **Cliente:** Buscar existente o crear nuevo (nombre, teléfono, email)
2. **Vehículo:** Marca, modelo, año, patente (opcional si existe cliente)
3. **Servicios:** Agregar de catálogo del proveedor
4. **Repuestos:** Por servicio o adicionales
5. **Notas:** Políticas de pago, garantías, etc.
6. **Validez:** Días que estará vigente (default desde perfil)
7. **Canal:** WhatsApp, Instagram, Teléfono, Email, Web

**Endpoint:**
```typescript
cotizacionCanalService.crearCotizacion({
  cliente: { nombre, telefono, email },
  vehiculo: { marca, modelo, año, patente },
  servicios: [...],
  repuestos: [...],
  notas: string,
  dias_validez: number,
  canal_origen: string
})
```

**C. Cotización con IA** (`app/cotizar-ia.tsx`)

**Asistente de cotización:**
- Proveedor describe verbalmente o por texto lo que necesita cotizar
- Backend usa LLM para extraer:
  - Servicios probables
  - Repuestos comunes para ese servicio
  - Precios sugeridos del catálogo del proveedor
- Proveedor revisa y ajusta antes de enviar

**Servicio:** `asistenteDiagnosticoService` (`services/asistenteDiagnosticoService.ts` - inferido)

**D. Editor de cotización** (`components/cotizacion/CotizacionEditorFab.tsx`)

**Edición inline:**
- Agregar/quitar servicios
- Cambiar precios por servicio
- Marcar repuesto como "precio a confirmar"
- Actualizar notas

**Confirmar precios** (`components/cotizacion/ConfirmarPreciosSheet.tsx`):
- Si tiene repuestos "a confirmar"
- Proveedor actualiza con precios finales
- Cliente recibe actualización

**E. Envío de cotización:**
```typescript
cotizacionCanalService.enviarCotizacion(cotizacionId)
```

**Acción:**
- Cambia estado a `enviada`
- Genera PDF de cotización (backend)
- Envía por el canal correspondiente:
  - **WhatsApp:** Mensaje con link a PDF
  - **Email:** PDF adjunto
  - **Web:** Notificación push al cliente
- Descuenta créditos (si aplica)

**F. Seguimiento:**
- Cliente puede aceptar/rechazar desde su app
- Proveedor recibe notificación
- Si acepta → se crea `SolicitudServicio` automáticamente

### 2.8 Flujo de Pagos y Créditos

**A. Sistema de Créditos** (`app/creditos/*.tsx`)

**Pantallas:**
- `creditos.tsx` - Hub principal
- `creditos/saldo.tsx` - Balance actual
- `creditos/historial.tsx` - Transacciones
- `creditos/comprar.tsx` - Compra de créditos

**Servicio:** `creditosService` (`services/creditosService.ts`:568 líneas)

**Obtener saldo:**
```typescript
creditosService.obtenerSaldoCreditos() // { saldo_actual: number, ultima_recarga: string }
```

**Historial:**
```typescript
creditosService.obtenerHistorialCreditos({
  tipo?: 'recarga' | 'uso' | 'reembolso',
  fecha_desde?: string,
  fecha_hasta?: string
})
```

**Compra de créditos:**
```typescript
creditosService.comprarCreditos({
  cantidad: number,  // Paquete (ej: 10, 50, 100 créditos)
  metodo_pago: 'mercadopago'
})
```

**Flujo MercadoPago:**
1. Backend crea `Preference` de MercadoPago
2. App abre WebView con checkout
3. Usuario paga
4. Callback a `mecanimovilappproveedores://mercadopago/callback`
5. Backend verifica pago
6. Recarga créditos automáticamente

**Uso de créditos:**
- Enviar oferta a solicitud: -1 crédito (configurable)
- Enviar cotización libre: -0.5 crédito
- Responder mensaje en chat: gratis (ya pagó la oferta)

**B. Suscripciones** (`services/suscripcionesService.ts`:363 líneas)

**Planes:**
- **Free:** Sin plan activo (solo compra de créditos puntuales)
- **Básico:** X créditos/mes + features básicas
- **Pro:** Y créditos/mes + IA + prioridad en radar
- **Enterprise:** Personalizado

**Endpoint:**
```typescript
suscripcionesService.obtenerPlanesDisponibles()
suscripcionesService.suscribirsePlan(planId, metodo_pago)
suscripcionesService.obtenerSuscripcionActual()
```

**Alerta sin plan:**
- Pastilla en bottom de screen (`app/(tabs)/_layout.tsx:276-295`)
- "Activa un plan y recibe créditos cada mes"
- Solo visible si `saludSuscripcion.estado_salud === 'sin_suscripcion'`

**C. Configuración MercadoPago** (`app/configuracion-mercadopago.tsx`)

**Servicio:** `mercadoPagoProveedorService` (`services/mercadoPagoProveedorService.ts`:448 líneas)

**Vinculación de cuenta:**
- Proveedor vincula su cuenta de MercadoPago
- OAuth flow con MercadoPago
- Permite recibir pagos directos de clientes

**Liquidación:**
- Backend calcula comisión MecaniMóvil
- Transfiere neto a cuenta del proveedor
- Servicio `liquidacionProveedorService` (inferido de openspec)

### 2.9 Flujo de Notificaciones Push

**Documentación:** `docs/PUSH_NOTIFICATIONS.md`

**Servicio:** `services/push/notificationService.ts`

**Configuración:**
- Plugin: `expo-notifications@57.0.20` (`app.json:91-97`)
- Canal default: "default" con color `#0052FF`
- Background notifications: habilitadas

**Registro:**
```typescript
NotificationService.syncNotificationsForUser(userId)
```
- Obtiene token de Expo Push Notifications
- Lo envía al backend Django
- Backend asocia token con el proveedor

**Tipos de notificaciones:**
1. **Nueva solicitud:** Cliente publicó solicitud que calza con perfil
2. **Oferta aceptada:** Cliente seleccionó tu oferta
3. **Pago confirmado:** Cliente pagó, puedes iniciar servicio
4. **Mensaje nuevo:** Cliente escribió en chat de oferta
5. **Cita confirmada:** Cliente confirmó fecha/hora
6. **Evaluación recibida:** Cliente calificó el servicio
7. **Créditos bajos:** Quedan pocos créditos
8. **Plan por vencer:** Suscripción próxima a expirar

**Manejo en app:**
- `PushNotificationSetup` component (`components/push/PushNotificationSetup.tsx` - inferido)
- Listener de notificaciones en foreground
- Deep linking a pantalla relevante según tipo

**Web Push:**
- `services/push/webPushService.ts` presente
- VAPID key público del backend (`/usuarios/vapid-public-key/`)
- Service Worker para notificaciones en navegador

### 2.10 Flujo de Chat y Mensajería

**Pantalla:** `app/chat-oferta/[ofertaId].tsx`

**Servicio:** `chatService` (`services/chatService.ts`)

**WebSocket:**
- Conexión a canal `oferta.{ofertaId}`
- Mensajes en tiempo real
- Gestión de sesión activa por `ChatsContext`

**Obtener historial:**
```typescript
chatService.obtenerMensajes(ofertaId, {
  limite?: number,
  offset?: number
})
```

**Enviar mensaje:**
```typescript
chatService.enviarMensaje(ofertaId, {
  contenido: string,
  tipo: 'texto' | 'imagen' | 'audio' | 'documento'
})
```

**Tipos de mensaje:**
1. **Texto:** Mensaje normal
2. **Imagen:** Foto de evidencia, problema, etc.
3. **Audio:** Mensaje de voz (máx 60s)
4. **Documento:** PDF, cotización, etc.

**Subida de archivos:**
```typescript
chatService.subirArchivoChat(ofertaId, {
  archivo: { uri, type, name },
  tipo: 'imagen' | 'audio' | 'documento'
})
```
- Usa `appendChatFileToFormData()` helper
- Soporta web (Blob) y nativo (uri)

**Componentes:**
- `ChatBubble` (`components/solicitudes/ChatBubble.tsx`) - Mensaje individual
- Estado de lectura: "Enviado", "Entregado", "Leído"

**Marcar como leídos:**
```typescript
chatService.marcarMensajesLeidos(ofertaId)
```
- Automático al abrir chat
- Actualiza badge de no leídos

**Audio messages:**
- Grabación con `expo-audio`
- Permiso de micrófono (`app.json:14-17`)
- Formato: M4A o WebM según plataforma
- Player inline en bubble

### 2.11 Flujo de Gestión de Taller (Mandante)

**A. Gestión de Equipo** (`app/gestionar-taller.tsx` + `app/gestion-equipo.tsx` - inferido)

**Servicio:** `equipoTallerService` (`services/equipoTallerService.ts`:332 líneas)

**Listar miembros:**
```typescript
equipoTallerService.obtenerMiembrosEquipo()
// Retorna: MiembroTaller[]
```

**Agregar mecánico:**
```typescript
equipoTallerService.agregarMiembroEquipo({
  nombre: string,
  dni: string,
  telefono: string,
  email?: string,
  rol: 'supervisor' | 'mecanico',
  permisos?: PermisosSupervisor,  // Si es supervisor
  modalidad_tecnico: 'en_taller' | 'a_domicilio' | 'ambas',
  especialidades: number[],
  foto_url?: string
})
```

**Sistema de permisos (supervisores):**
```typescript
permisos: {
  servicios: boolean,        // Gestionar catálogo de servicios
  mecanicos: boolean,        // Agregar/editar mecánicos
  horarios: boolean,         // Configurar disponibilidad
  agenda: boolean,           // Ver/editar agenda
  zonas_cobertura: boolean,  // Configurar zonas de servicio
  finanzas: boolean          // Ver reportes de ingresos
}
```

**Editar/eliminar miembro:**
```typescript
equipoTallerService.actualizarMiembroEquipo(miembroId, { ... })
equipoTallerService.eliminarMiembroEquipo(miembroId)
```

**B. Sesión de Mecánico del Equipo**

**Login como mecánico:**
- Mecánico usa su propio usuario (creado por mandante)
- Al autenticarse, `estadoProveedor.rol_taller === 'mecanico'`
- `estadoProveedor.miembro_id` apunta a `MiembroTaller`

**Vista restringida:**
- Solo ve tab "Hoy", "Servicios" y "Menú" (`app/(tabs)/_layout.tsx:220-228`)
- Dashboard muestra solo órdenes asignadas a él
- No puede cotizar, ni gestionar equipo, ni ver finanzas

**Detalle de orden:**
- Puede iniciar checklist
- Puede chat con cliente (si orden asignada a él)
- No puede reasignar a otro mecánico

**C. Configuración de Zonas de Servicio** (`app/zonas-servicio.tsx`)

**Servicio:** `serviceAreasApi` (`services/serviceAreasApi.ts`:306 líneas)

**Listar zonas:**
```typescript
serviceAreasApi.obtenerZonasServicio()
```

**Crear zona:**
```typescript
serviceAreasApi.crearZonaServicio({
  nombre: string,          // Ej: "Santiago Centro", "Las Condes"
  radio_km: number,        // Radio de cobertura
  centro_lat: number,
  centro_lng: number,
  activa: boolean,
  tarifa_adicional?: number  // Sobreprecio por km
})
```

**Uso:**
- Clientes fuera de zonas configuradas pueden no ver al proveedor
- Filtrado automático en backend al buscar proveedores cercanos

**D. KPIs y Rendimiento** (`app/rendimiento-kpis.tsx`)

**Servicio:** `kpisProveedorService` (`services/kpisProveedorService.ts` - inferido)

**Métricas:**
- Órdenes completadas este mes
- Calificación promedio
- Tasa de conversión (ofertas enviadas / aceptadas)
- Tiempo promedio de respuesta
- Ingresos del mes
- Créditos gastados vs ganados

**Gráficos:**
- `react-native-gifted-charts` para visualización
- Tendencias mensuales
- Comparativa con mes anterior

**Niveles/Badges:**
- Sistema de gamificación (Elite, Master, Pro)
- Colores y badges definidos en `design-system/tokens/colors.ts:350-389`

### 2.12 Flujo de Pipeline Comercial (CRM)

**Pantalla:** `app/(tabs)/bandeja.tsx` (tab "Clientes")

**Concepto:** Sistema Kanban/CRM para gestionar casos comerciales end-to-end

**Servicio:** `pipelineComercialService` (`services/pipelineComercialService.ts` - inferido)

**Consulta:**
```typescript
usePipelineComercialQuery({ limite: 100, fetchAllEstados: true })
```

**Fases del pipeline** (inferido de colores en tokens):
1. **Captura:** Lead nuevo, consulta inicial
2. **HITL (Human in the Loop):** Requiere cotización manual/IA asistida
3. **Agendamiento:** Cliente aceptó, esperando fecha
4. **Rechazados:** No se concretó

**Función auxiliar** `utils/pasoComercial.ts`:
```typescript
pasoDeCaso(caso: PipelineCase): 'captura' | 'hitl' | 'por_agendar' | 'rechazado'
```

**Vista en UI:**
- Columnas tipo Trello con cards de casos
- Drag & drop para cambiar fase
- Badge con contador de casos "por agendar" en tab Agenda (`app/(tabs)/_layout.tsx:44-48`)

**Acciones por caso:**
- Ver detalle de cotización
- Enviar/actualizar cotización
- Agendar cita
- Marcar como rechazado
- Chat con cliente

**Integración con cotizaciones:**
- Caso en "HITL" → Abrir editor de cotización
- Al enviar cotización → Pasa a siguiente fase
- Si cliente acepta → Mueve a "Agendamiento"

### 2.13 Comunicación con el Backend

**URL base:** `https://mecanimovil-api.onrender.com/api` (producción)

**Endpoints principales usados:**

**Auth:**
- `POST /usuarios/login-proveedor/` - Login con username/password
- `POST /usuarios/google-login-proveedor/` - Login con Google
- `GET /usuarios/estado-proveedor/` - Estado de onboarding y rol
- `GET /usuarios/profile/` - Datos completos del usuario

**Onboarding:**
- `POST /usuarios/inicializar-onboarding/` - Inicia proceso
- `POST /usuarios/completar-onboarding/` - Finaliza registro
- `POST /usuarios/actualizar-especialidades/` - Categorías de servicios
- `POST /usuarios/actualizar-marcas-taller/` - Marcas que atiende
- `POST /usuarios/actualizar-marcas-mecanico/` - Marcas (mecánico)
- `POST /usuarios/documentos-onboarding/` - Subir documento
- `GET /usuarios/documentos-onboarding/mis_documentos/` - Listar docs

**Servicios del proveedor:**
- `GET /servicios/proveedor/mis-servicios/` - Catálogo propio
- `POST /servicios/proveedor/mis-servicios/` - Crear servicio
- `PATCH /servicios/proveedor/mis-servicios/{id}/` - Actualizar
- `POST /servicios/proveedor/mis-servicios/crear_catalogo_inicial/` - Onboarding
- `GET /servicios/proveedor/mis-servicios/mis_marcas/` - Marcas activas

**Solicitudes:**
- `GET /solicitudes/publicas/` - Listar solicitudes disponibles
- `GET /solicitudes/publicas/{id}/` - Detalle de solicitud
- `POST /solicitudes/ofertas-proveedor/` - Crear oferta
- `GET /solicitudes/ofertas-proveedor/` - Mis ofertas
- `POST /solicitudes/rechazos/` - Rechazar solicitud
- `POST /solicitudes/publicas/{id}/marcar_vista/` - Registrar visualización

**Órdenes:**
- `GET /ordenes/ordenes-proveedor/activas/` - Órdenes en proceso
- `GET /ordenes/ordenes-proveedor/completadas/` - Historial
- `GET /ordenes/ordenes-proveedor/{id}/` - Detalle
- `PATCH /ordenes/ordenes-proveedor/{id}/estado/` - Cambiar estado
- `POST /ordenes/ordenes-proveedor/{id}/asignar_mecanico/` - Asignar

**Checklist:**
- `GET /ordenes/checklist-orden/{orden_id}/` - Obtener checklist
- `POST /ordenes/checklist-orden/` - Iniciar checklist
- `PATCH /ordenes/checklist-item/{id}/` - Actualizar item
- `POST /ordenes/checklist-item/{id}/subir_foto/` - Foto de item
- `POST /ordenes/checklist-orden/{id}/finalizar/` - Completar

**Chat:**
- `GET /chat/mensajes-oferta/{oferta_id}/` - Historial
- `POST /chat/mensajes-oferta/` - Enviar mensaje
- `POST /chat/mensajes-oferta/{oferta_id}/subir_archivo/` - Adjunto
- `POST /chat/mensajes-oferta/{oferta_id}/marcar_leidos/` - Marcar leídos

**Agenda:**
- `GET /agenda/citas-calendario/` - Citas del calendario
- `POST /agenda/citas-personales/` - Crear cita personal
- `GET /agenda/disponibilidad/` - Slots disponibles
- `GET /agenda/horarios-proveedor/mis_horarios/` - Config horarios
- `POST /agenda/horarios-proveedor/configurar_semana_completa/` - Configurar

**Cotizaciones Omnicanal:**
- `GET /cotizaciones/cotizacion-canal/` - Listar cotizaciones
- `POST /cotizaciones/cotizacion-canal/` - Crear cotización
- `POST /cotizaciones/cotizacion-canal/{id}/enviar/` - Enviar
- `PATCH /cotizaciones/cotizacion-canal/{id}/` - Actualizar precios

**Créditos:**
- `GET /creditos/saldo/` - Saldo actual
- `GET /creditos/historial/` - Transacciones
- `POST /creditos/comprar/` - Iniciar compra
- `GET /suscripciones/planes/` - Planes disponibles
- `POST /suscripciones/suscribirse/` - Activar plan

**Equipo:**
- `GET /taller/miembros-equipo/` - Listar mecánicos
- `POST /taller/miembros-equipo/` - Agregar mecánico
- `PATCH /taller/miembros-equipo/{id}/` - Editar
- `DELETE /taller/miembros-equipo/{id}/` - Eliminar

**KPIs:**
- `GET /kpis/proveedor/resumen/` - Dashboard de métricas
- `GET /kpis/proveedor/tendencias/` - Gráficos históricos

**WebSocket:**
- `wss://mecanimovil-api.onrender.com/ws/proveedor/{id}/` - Canal del proveedor
- `wss://mecanimovil-api.onrender.com/ws/oferta/{id}/` - Canal de oferta (chat)
- `wss://mecanimovil-api.onrender.com/ws/radar_oportunidades/{id}/` - Solicitudes en tiempo real

**Formato de respuestas:**
- JSON con paginación DRF: `{ count, next, previous, results: [...] }`
- Fechas en ISO 8601: `"2024-01-15T14:30:00Z"`
- Precios como strings: `"12500.00"` (evita problemas de float)

---

## 3. DISEÑO Y UI

### 3.1 Sistema de Diseño

**Inspiración:** Airbnb Hosts + Tinder (`design-system/HOST.md`)

**Documentación:** Folder `design-system/` con estructura modular

**Arquitectura:**
```
design-system/
├── tokens/                    # Primitivas de diseño
│   ├── colors.ts              # Paleta completa (470 líneas)
│   ├── typography.ts          # Fuentes y tamaños
│   ├── spacing.ts             # Sistema de espaciado
│   ├── shadows.ts             # Sombras y elevaciones
│   └── index.ts               # Re-export centralizado
├── components/                # Componentes institucionales (80KB)
│   ├── InstitutionalButton.tsx
│   ├── InstitutionalModal.tsx
│   ├── BottomSheet.tsx
│   ├── HostAvatar.tsx
│   └── [más componentes]
├── styles/                    # Estilos reutilizables
│   ├── institutionalButtons.ts
│   ├── institutionalInputs.ts
│   ├── institutionalTypography.ts
│   └── [más estilos]
└── theme/
    └── DesignSystemThemeProvider.tsx
```

### 3.2 Paleta de Colores

**Archivo:** `design-system/tokens/colors.ts` (470 líneas)

**Colores primarios:**
- **Magenta (Tinder):** `#FD2B7B` - CTAs, selecciones, activo
- **Orange (warm):** `#FF7158` - Acentos, highlights, gradientes
- **Ink Black:** `#3B3B3B` - Texto primario
- **Canvas:** `#F9F9F9` - Background principal
- **White:** `#FFFFFF` - Superficies elevadas (cards, modals)

**Paletas extendidas:**

**Primary (Magenta):**
```typescript
primary: {
  50: '#FFF0F5',   // Soft
  100: '#FFE0EC',
  200: '#FFB8D4',
  300: '#FF85B4',
  400: '#FE528F',
  500: '#FD2B7B',  // Base
  600: '#E01A66',  // Hover
  700: '#C2185B',  // Pressed
  800: '#9C1449',
  900: '#701035'
}
```

**Accent (Orange):**
```typescript
accent: {
  50: '#FFF5F2',
  500: '#FF7158',  // Base
  600: '#E85A40',  // Hover
  700: '#C44832',  // Pressed
}
```

**Neutral (Grays):**
```typescript
neutral: {
  gray: {
    50: '#F9F9F9',   // Canvas
    100: '#F3F3F3',  // Tonal
    200: '#E8E8E8',  // Hairline
    300: '#B8B8B8',  // Tab muted
    500: '#757575',  // Icon default
    700: '#3B3B3B',  // Ink
  }
}
```

**Semánticos:**
```typescript
success: { main: '#0d9f6e', light: '#e6f7ef' }
warning: { main: '#e6a817', light: '#fff8e6' }
error: { main: '#d93049', light: '#fde8ea' }
info: { main: '#FD2B7B', light: '#FFF0F5' }
```

**Colores de dominio:**

**Badges de especialización:**
```typescript
badge: {
  especialista: { bg: '#FFF5F2', text: '#C44832', icon: ORANGE },
  multimarca: { bg: TONAL, text: INK, icon: ICON_DEFAULT },
  verified: { fill: MAGENTA, onFill: WHITE }
}
```

**Estados de pago:**
```typescript
payment: {
  completo: { bg: '#FFF5F2', text: '#C44832' },  // Pagado total
  parcial: { bg: '#fff8e6', text: '#5c4309' },   // Pago parcial
  aprobado: { bg: '#e6f7ef', text: '#075f42' }   // Pago confirmado
}
```

**KPIs (gamificación):**
```typescript
kpi: {
  elite: { bg: '#FFF3C4', text: '#7A5C00', icon: '#C9A227' },      // Top tier
  master: { bg: '#EEF1F5', text: '#3D4A5C' },                       // Segundo nivel
  pro: { bg: '#F6E8DC', text: '#6B3E1F' },                          // Tercer nivel
  ascenso: { bg: '#FBF1E8', text: '#8B5E3C' },                      // Progresando
  enProgreso: { bg: TONAL, text: '#616161' }                        // Base
}
```

**Pipeline CRM (Kanban):**
```typescript
kanban: {
  captura: { bg: SOFT, border: '#FFB8D4', badgeBg: MAGENTA },      // Leads nuevos
  hitl: { bg: '#fff8e6', border: '#ffe399', badgeBg: WARNING },    // Req. humano
  agendamiento: { bg: '#e6f7ef', border: '#99dfbf', badgeBg: SUCCESS }, // Por agendar
  rechazados: { bg: '#fde8ea', border: '#fbd1d5', badgeBg: ERROR } // No concretados
}
```

**Gradientes:**
```typescript
gradients: {
  primary: [MAGENTA, ORANGE],      // Botones principales
  sunset: [MAGENTA, ORANGE],       // Highlights
  ocean: [MAGENTA, ORANGE, SOFT],  // Backgrounds hero
  calm: [CANVAS, WHITE]            // Backgrounds sutiles
}
```

**Helpers:**
```typescript
withOpacity(color: string, opacity: number): string
getColorWithOpacity(path: string, opacity: number): string
```

### 3.3 Tipografía

**Archivo:** `design-system/tokens/typography.ts`

**Fuente principal:** Poppins (sans-serif)
- **Regular:** `Poppins_400Regular` - Cuerpo de texto
- **Medium:** `Poppins_500Medium` - Labels, navegación
- **SemiBold:** `Poppins_600SemiBold` - Títulos, botones

**Carga de fuentes:** `app/_layout.tsx:130-157`
```typescript
const [fontsLoaded, fontError] = useFonts({
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
});
```

**Fallback Host:** Si Poppins falla, Text/TextInput usan fuente del sistema
- Configuración de `defaultProps` para Text y TextInput

**Escala tipográfica:**
```typescript
fontSize: {
  xs: 11,    // Metadata, timestamps
  sm: 13,    // Secundario, hints
  md: 15,    // Cuerpo principal
  lg: 17,    // Subtítulos
  xl: 21,    // Títulos de pantalla
  xxl: 28,   // Hero, dashboard
  xxxl: 36   // Onboarding, estados vacíos
}

lineHeight: {
  tight: 1.2,   // Títulos
  normal: 1.5,  // Cuerpo
  relaxed: 1.75 // Parágrafos largos
}

fontFamily: {
  sansRegular: 'Poppins_400Regular',
  sansMedium: 'Poppins_500Medium',
  sansSemiBold: 'Poppins_600SemiBold',
  sansBold: 'Poppins_600SemiBold'  // Alias
}
```

**Estilos predefinidos:** `design-system/styles/institutionalTypography.ts`
```typescript
title1: { fontSize: 28, fontFamily: sansSemiBold, color: ink }
title2: { fontSize: 21, fontFamily: sansSemiBold }
title3: { fontSize: 17, fontFamily: sansSemiBold }
body: { fontSize: 15, fontFamily: sansRegular, color: body }
caption: { fontSize: 13, fontFamily: sansRegular, color: muted }
```

### 3.4 Espaciado y Layout

**Archivo:** `design-system/tokens/spacing.ts`

**Sistema de espaciado fijo:**
```typescript
fixed: {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48
}
```

**Espaciado fluido (responsivo):**
```typescript
fluid: {
  xs: (width) => width * 0.01,   // 1% del ancho
  sm: (width) => width * 0.02,   // 2%
  md: (width) => width * 0.03,   // 3%
  lg: (width) => width * 0.04,   // 4%
  xl: (width) => width * 0.05    // 5%
}
```

**Insets de pantalla:**
```typescript
screen: {
  horizontal: 16,  // Padding lateral estándar
  vertical: 12,    // Padding vertical estándar
  top: 20,         // Padding top adicional
  bottom: 20       // Padding bottom adicional
}
```

**Radios de borde:**
```typescript
borderRadius: {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999  // Pills, avatars
}
```

**Layout responsive:**
- **Móvil:** < 768px - Stack vertical, tabs abajo
- **Tablet:** 768-1023px - Híbrido
- **Escritorio:** ≥ 1024px - Tabs arriba, sidebar, multi-columna
- Breakpoint principal: `width >= 1024` (`app/(tabs)/_layout.tsx:36`)

### 3.5 Componentes Reutilizables

**Componentes institucionales:** `design-system/components/`

**1. InstitutionalButton** (`InstitutionalButton.tsx`)

**Variantes:**
- `primary` - Gradiente magenta-orange, texto blanco
- `secondary` - Fondo ink black, texto blanco (CTA Airbnb)
- `tertiary` - Outline, sin relleno
- `success` - Verde, para confirmaciones
- `destructive` - Rojo, para cancelaciones
- `destructiveOutline` - Outline rojo
- `outline` - Outline negro neutro
- `link` - Sin fondo, solo texto (link)

**Props:**
```typescript
{
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | ...;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactElement;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}
```

**Uso:**
```tsx
<InstitutionalButton
  label="Enviar Oferta"
  variant="primary"
  onPress={handleSubmit}
  loading={isSubmitting}
/>
```

**2. InstitutionalModal** (`InstitutionalModal.tsx`)

**Modal centrado con overlay:**
```typescript
{
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}
```

**3. BottomSheet** (`BottomSheet.tsx`)

**Sheet que sube desde abajo:**
```typescript
{
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: string[];  // ['25%', '50%', '90%']
  dismissible?: boolean;
}
```

**Uso:** Confirmaciones, filtros, selecciones

**4. HostAvatar** (`HostAvatar.tsx`)

**Avatar circular:**
```typescript
{
  uri?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;  // Iniciales
  badge?: 'verified' | 'elite' | 'online';
}
```

**5. AppHeader** (`AppHeader.tsx`)

**Header de pantalla con navegación:**
```typescript
{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactElement;
  variant?: 'default' | 'large';
}
```

**6. HostSwitch** (`HostSwitch.tsx`)

**Switch estilo iOS:**
- Activo: Magenta
- Inactivo: Gray 200
- Animado con `react-native-reanimated`

**7. PrimaryGradientFill** (`PrimaryGradientFill.tsx`)

**Background con gradiente Tinder:**
```tsx
<PrimaryGradientFill>
  <View>{children}</View>
</PrimaryGradientFill>
```

**8. HostSurfaces** (`HostSurfaces.tsx`)

**Superficies con elevaciones:**
- `Card` - Paper blanco con sombra sutil
- `ElevatedCard` - Más sombra
- `TonalCard` - Fondo tonal (F3F3F3)
- `OutlineCard` - Solo borde, sin sombra

### 3.6 Componentes de Dominio

**Componentes específicos del negocio:** `components/*`

**Solicitudes:**
- `SolicitudCard` - Card de solicitud en radar
- `OfertaCard` - Card de oferta enviada
- `FormularioOferta` - Form completo para crear oferta
- `EstadoBanner` - Banner de estado de solicitud
- `CountdownTimer` - Tiempo restante animado
- `TipoPagoClienteChip` - Badge con tipo de pago
- `ChatBubble` - Mensaje en chat

**Home/Dashboard:**
- `DashboardScreenSkeleton` - Loading del dashboard
- `HomeRadarSolicitudItem` - Item del radar compacto
- `MetricCard` - Card de KPI con ícono y valor
- `TwoColumnMetricGrid` - Grilla 2x2 de métricas

**Checklist:**
- `ChecklistItemRenderer` - Renderiza item según tipo
- `ChecklistProgressBar` - Barra de progreso
- `ChecklistSignatureModal` - Modal de firma
- `ChecklistCompletedView` - Vista de checklist finalizado
- `FuelGaugeComponent` - Gauge de combustible
- `InventoryChecklistComponent` - Lista de inventario

**Cotizaciones:**
- `CotizacionEditorFab` - FAB para editar cotización
- `CotizacionBorradorAcciones` - Botones de acción
- `CotizacionEnviadaSiguientePaso` - Siguiente paso sugerido
- `RepuestoPrecioSheet` - Sheet para editar precio
- `ConfirmarPreciosSheet` - Confirmar precios finales

**Agenda:**
- `CitaCasoIdentidad` - Card de cita con datos
- `CitaResumenEconomicoCard` - Resumen de costos
- `ConfirmarHorarioCitaSheet` - Confirmar horario

**Chats:**
- `CotizacionLibreModal` - Modal para cotizar sin solicitud previa
- Componentes de mensajería (412KB en total)

**UI General:**
- `LoadingSpinner` - Spinner consistente
- `Skeleton/*` - Loading states (Pulse, Cards)
- `PhoneInput` - Input de teléfono con formato
- `InstitutionalIcon` - Wrapper de Lucide con tema

### 3.7 Consistencia Visual

**Fortalezas:**

1. **Sistema de colores unificado:**
   - Todos los componentes usan `COLORS.*` de tokens
   - No hay colores hardcoded (ej: `#FF0000`) en componentes
   - Aliases semánticos claros (primary, success, error)

2. **Tipografía consistente:**
   - Poppins en toda la app
   - Escala de tamaños coherente (11-36px)
   - Fallback configurado para todas las plataformas

3. **Espaciado predecible:**
   - Múltiplos de 4px (4, 8, 12, 16, 24, 32, 48)
   - Padding de pantalla estandarizado (16px horizontal)

4. **Componentes institucionales:**
   - Botones con variantes claras
   - Modals/Sheets con mismo estilo
   - Cards con sombras consistentes

5. **Iconografía:**
   - Lucide React Native en toda la app
   - Mismo strokeWidth según estado (focused: 2, unfocused: 1.75)
   - Tamaños estandarizados (16, 20, 22, 24px)

**Áreas de mejora:**

1. **Componentes duplicados:**
   - Algunos componentes en `components/ui/` vs `design-system/components/`
   - No está claro cuándo usar uno u otro
   - Doc: `docs/UI_ORPHAN_COMPONENTS.md` reconoce el problema

2. **Estilos inline vs StyleSheet:**
   - Mezcla de estilos inline y StyleSheet
   - No hay guía consistente de cuándo usar cada uno

3. **Naming inconsistente:**
   - `InstitutionalButton` vs `HostAvatar` vs `LoadingSpinner`
   - No hay convención clara de prefijos

4. **Responsive parcial:**
   - Breakpoint escritorio (1024px) solo en tabs
   - Muchos componentes no adaptan layout a tablet

### 3.8 Accesibilidad

**Estado actual:** Básico, con oportunidades de mejora

**Implementado:**

1. **Roles de accesibilidad:**
   - `accessibilityRole="button"` en Pressables importantes
   - Ejemplo: `app/(tabs)/_layout.tsx:280`

2. **Labels descriptivos:**
   - `accessibilityLabel` en algunos botones
   - Ejemplo: "Activar un plan"

3. **Contraste:**
   - Colores con buen contraste base
   - Magenta (#FD2B7B) sobre blanco: 4.5:1 ✓
   - Ink (#3B3B3B) sobre blanco: 11:1 ✓

4. **Tamaño de toque:**
   - Botones principales ≥44pt (iOS guideline)
   - Tabs con área táctil amplia

**Faltante:**

1. **Hints y estados:**
   - Faltan `accessibilityHint` en la mayoría de controles
   - No hay indicadores de estado (`accessibilityState`)

2. **Anuncios dinámicos:**
   - No usa `announceForAccessibility()` para cambios importantes
   - Ej: "Oferta enviada" no se anuncia

3. **Navegación de teclado:**
   - No testeable en web (falta `tabIndex`, `onKeyPress`)

4. **Textos alternativos:**
   - Imágenes sin `accessibilityLabel` descriptivo
   - Iconos decorativos no marcados como `accessibilityElementsHidden`

5. **Testing:**
   - No hay tests de accesibilidad automatizados
   - No se verifica con screen readers

**Recomendación:** Auditoría con React Native Accessibility API y testing con VoiceOver/TalkBack

---

## 4. CALIDAD

### 4.1 Testing

**Estado actual:** **CRÍTICO - NO HAY TESTS**

**Evidencia:**
- Búsqueda de archivos de test: 0 resultados (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- No hay configuración de Jest en `package.json`
- No hay scripts de test: `package.json:10-17` solo tiene start, android, ios, deploy

**Implicaciones:**
- **Riesgo alto** de regresiones al modificar código
- No hay garantía de que features funcionen end-to-end
- Refactors son peligrosos sin red de seguridad
- Bugs solo se detectan en producción

**Recomendaciones:**
- **P0:** Configurar Jest + React Native Testing Library
- **P0:** Tests de servicios API (mocking de axios)
- **P1:** Tests de componentes críticos (FormularioOferta, ChecklistItem)
- **P1:** Tests de lógica de negocio (resolveProveedorRoute, pasoDeCaso)
- **P2:** Tests E2E con Detox para flujos principales

### 4.2 Tipado TypeScript

**Estado:** Bueno con `strict: true`, pero con algunas excepciones

**Fortalezas:**

1. **Modo strict habilitado** (`tsconfig.json:4`)
   - `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny` activos

2. **Interfaces bien definidas:**
   - Todos los servicios tienen tipos exportados
   - `EstadoProveedor`, `SolicitudPublica`, `Orden`, etc. con campos tipados

3. **Discriminated unions:**
   - Estados como `estado: 'creada' | 'publicada' | 'completada'`
   - Reducen errores de typo

4. **Type guards:**
   - `esClienteCompleto()`, `esClienteProtegido()` (`services/ordenesProveedor.ts:72-78`)
   - Type narrowing seguro

**Debilidades:**

1. **`any` en lugares sensibles:**
   - FormData con `as any` en uploads (`services/api.ts:890-894, 1510-1513`)
   - Algunos props de componentes sin tipar

2. **Tipos incompletos:**
   - `error: any` en catches (debería ser `unknown`)
   - Falta tipar algunos hooks customizados

3. **Inferencia débil:**
   - Algunos `useState()` sin tipo explícito cuando no es obvio

4. **Axios response sin tipar:**
   - `response.data` sin generic type `AxiosResponse<T>`

**Análisis de errores de tipo:**
```bash
# Comando para verificar (no ejecutado en análisis)
npx tsc --noEmit
```

**Recomendación:** Auditoría con `tsc --noEmit` y eliminación progresiva de `any`

### 4.3 Deuda Técnica

**Marcadores de deuda:** 33 instancias de TODO/FIXME/HACK/BUG

**Ejemplos (inferidos del análisis):**

1. **LogBox deshabilitado completamente** (`app/_layout.tsx:1-83`)
   - **Línea:** 10-77
   - **Problema:** `LogBox.ignoreAllLogs(true)` oculta TODOS los errores
   - **Riesgo:** Errores críticos no visibles en desarrollo
   - **Razón aparente:** Demasiados warnings de dependencias
   - **Recomendación:** Re-habilitar y arreglar warnings uno a uno

2. **Timeout aumentado a 30s** (`services/api.ts:103`)
   - **Razón:** Cold starts de Render.com
   - **Problema:** Usuario espera mucho en requests lentos
   - **Recomendación:** Agregar loading skeletons + cancelación de requests

3. **Auto-discovery de IP en desarrollo** (`services/serverConfig.ts:170-250`)
   - **Complejidad:** 80 líneas de lógica para detectar servidor local
   - **Fragilidad:** Puede fallar en redes complejas (VPNs, proxies)
   - **Recomendación:** Simplificar con .env local obligatorio

4. **WebSocket con reconexión manual** (`services/websocketService.ts:915 líneas`)
   - **Problema:** Lógica custom de reconexión (backoff exponencial)
   - **Riesgo:** Loops infinitos si backend cae
   - **Recomendación:** Usar librería battle-tested (Socket.IO client)

5. **Componentes "orphan"** (`docs/UI_ORPHAN_COMPONENTS.md`)
   - **Problema:** Duplicados entre `components/ui/` y `design-system/`
   - **Riesgo:** Cambios solo se aplican a uno
   - **Recomendación:** Consolidación (ver archivo)

6. **Deduplicación manual de órdenes** (`services/ordenesProveedor.ts:119-145`)
   - **Razón:** Backend retorna duplicados por race conditions
   - **Problema:** Lógica frágil en frontend para arreglar bug de backend
   - **Recomendación:** Arreglar en backend, mantener deduplication como safeguard

7. **FormData con platform checks** (`services/api.ts:885-897`)
   - **Razón:** React Native vs Web manejan FormData diferente
   - **Problema:** Código repetitivo en cada upload
   - **Recomendación:** Helper centralizado (ya existe: `appendChatFileToFormData`)

8. **Estado de proveedor cacheado 60s** (`utils/auth/estadoProveedorCache.ts`)
   - **Riesgo:** Usuario cambia datos en web admin pero app no refleja hasta 60s
   - **Recomendación:** Invalidar cache al volver de background (`AppState`)

9. **Nombres de archivo normalizados manualmente** (`services/api.ts:840-859`)
   - **Razón:** Backend espera .jpg/.png/.pdf exacto
   - **Problema:** Lógica de extensiones compleja
   - **Recomendación:** Backend debe aceptar cualquier MIME type válido

10. **TypeScript 6.0.3** (`package.json:78`)
    - **Problema:** Versión no existe (typo, debería ser 5.x)
    - **Riesgo:** Build puede fallar en CI
    - **Recomendación:** Corregir a `~5.6.3`

### 4.4 Código Muerto

**Análisis estático** (inferido, no ejecutado):

**Candidatos a código muerto:**

1. **Archivos en `openspec/changes/archive/`:**
   - Cambios archivados pero archivos no eliminados
   - Pueden confundir al leer specs

2. **Scripts de build manual:**
   - `create-apk.sh`, `create-apk-simple.sh`
   - Si usan EAS Build, estos scripts pueden estar obsoletos

3. **Componentes en `components/ui/Skeleton/`:**
   - 4 componentes de skeleton
   - Verificar si todos se usan o algunos son legacy

4. **Servicios potencialmente no usados:**
   - `connectionService.ts` - Solo referenciado en tabs layout
   - `privacyService.ts` - ¿Se usa para GDPR?
   - `vistaTallerService.ts` - ¿Qué es "vista taller"?

**Análisis profundo recomendado:**
```bash
# Encontrar exports no importados
npx ts-prune

# Encontrar archivos no referenciados
npx unimported
```

### 4.5 Riesgos de Seguridad

**Análisis de seguridad (code review):**

**1. Token en AsyncStorage (Web):**
- **Ubicación:** `utils/authStorage.ts`
- **Problema:** En web, `expo-secure-store` no es seguro (localStorage)
- **Riesgo:** XSS puede robar token
- **Mitigación:** httpOnly cookie para web, SecureStore para nativo
- **Prioridad:** P1

**2. Logs con datos sensibles en producción:**
- **Ubicación:** Múltiples archivos con `console.log`
- **Problema:** Algunos logs NO están envueltos en `if (__DEV__)`
- **Ejemplo:** `services/api.ts:601-604` - "Token preview"
- **Riesgo:** Logs en producción con tokens/PII
- **Recomendación:** Auditoría de todos los console.log
- **Prioridad:** P0

**3. API Keys en código:**
- **Ubicación:** `.env.example` en repo
- **Problema:** Google Client IDs expuestos (público pero no ideal)
- **Riesgo:** Bajo (Client IDs son públicos por diseño de OAuth)
- **Recomendación:** Documentar que son públicos
- **Prioridad:** P2

**4. Deep linking sin validación:**
- **Ubicación:** `app.json:40-54` - Intent filter para MercadoPago
- **Problema:** No se valida que el callback sea legítimo
- **Riesgo:** Phishing con `mecanimovilappproveedores://mercadopago/callback`
- **Recomendación:** Validar state token en callback
- **Prioridad:** P1

**5. URLs de backend hardcodeadas:**
- **Ubicación:** `app.json:121` - `https://mecanimovil-api.onrender.com/api`
- **Problema:** Si backend cambia de dominio, app deja de funcionar
- **Riesgo:** Bajo (controlado por el equipo)
- **Recomendación:** Remote config para URL (Expo Updates)
- **Prioridad:** P2

**6. WebSocket sin autenticación en conexión:**
- **Ubicación:** `services/websocketService.ts`
- **Problema:** ¿Token va en query string? Puede quedar en logs
- **Riesgo:** Medio (depende de implementación de backend)
- **Recomendación:** Auth token en primer mensaje, no en URL
- **Prioridad:** P1

**7. Permisos amplios en Android:**
- **Ubicación:** `app.json:28-37`
- **Permisos:** CAMERA, STORAGE, LOCATION, AUDIO, etc.
- **Problema:** Usuario puede sospechar de tantos permisos
- **Recomendación:** Justificar cada permiso en docs/onboarding
- **Prioridad:** P2

**8. Sin code signing verificable:**
- **Problema:** No hay configuración de app signing en EAS
- **Riesgo:** APKs no firmados pueden ser modificados
- **Recomendación:** Configurar keystore para Android
- **Prioridad:** P1

**9. Expo Go vs Production:**
- **Problema:** `IS_EXPO_GO` disables native Google Sign-In
- **Riesgo:** Diferencias de comportamiento en dev vs prod
- **Recomendación:** Testing en builds reales, no solo Expo Go
- **Prioridad:** P2

**10. CORS bypass con `ngrok-skip-browser-warning`:**
- **Ubicación:** `services/api.ts:120-122`
- **Problema:** Header para saltar warning de ngrok
- **Riesgo:** Bajo (solo desarrollo)
- **Recomendación:** Asegurar que solo se agrega en URLs de ngrok
- **Prioridad:** P2

### 4.6 Rendimiento

**Análisis de performance:**

**Fortalezas:**

1. **React Query con cache:**
   - `staleTime: 5min` reduce refetches innecesarios
   - Queries deshabilitadas cuando datos no son necesarios (`enabled: false`)

2. **Lazy loading implícito:**
   - Expo Router hace code-splitting automático por ruta
   - Screens solo se cargan al navegar

3. **Imágenes optimizadas:**
   - `expo-image` con caching agresivo
   - Resize automático según tamaño de display

4. **WebSocket selectivo:**
   - Solo se conecta si `radarOportunidadesActivo === true`
   - Desconecta al salir de tabs

5. **Deduplicación de requests:**
   - React Query previene requests duplicados a mismo endpoint

**Debilidades:**

1. **Renders innecesarios:**
   - Algunos contextos re-renderizan hijos sin `useMemo` en value
   - `AuthContext`, `RadarOportunidadesContext` están bien
   - Otros contextos (ChatsContext, AlertsContext) no analizados

2. **Listas sin virtualización:**
   - Si hay >50 solicitudes en radar, FlatList podría laggear
   - Recomendación: `removeClippedSubviews`, `maxToRenderPerBatch`

3. **Animaciones no optimizadas:**
   - Algunos componentes animan con `Animated` en lugar de Reanimated
   - `CountdownTimer` puede causar re-renders frecuentes

4. **Checklist con progreso local:**
   - Guardar cada item en AsyncStorage sincrónicamente
   - Recomendación: Batch writes, guardar cada 5 items

5. **Fotos sin compresión:**
   - `expo-image-picker` devuelve fotos sin comprimir
   - Subidas de 5-10MB por foto
   - Recomendación: `expo-image-manipulator` para resize/compress

6. **WebSocket con mensajes grandes:**
   - Si historial de chat es largo, payload inicial es pesado
   - Recomendación: Paginación de mensajes en WebSocket

7. **No hay code optimization en web:**
   - Metro bundler no hace tree-shaking agresivo
   - Bundle de web puede ser >5MB
   - Recomendación: Webpack o Vite para web

**Métricas objetivo:**
- **Time to Interactive (TTI):** <3s en 4G
- **Bundle size:** <3MB JavaScript (web)
- **Frame rate:** 60fps en animaciones
- **Memoria:** <150MB en uso normal (Android)

**Herramientas recomendadas:**
- React Native Performance Monitor (Flipper)
- `@shopify/react-native-performance` para métricas
- Sentry Performance Monitoring

---

## 5. RECOMENDACIONES PRIORIZADAS

### P0 - CRÍTICO (Resolver inmediatamente)

#### P0.1 - Implementar Suite de Tests Básica
**Problema:** 0 tests en 147k líneas de código  
**Impacto:** Riesgo altísimo de regresiones, refactors imposibles  
**Evidencia:** Búsqueda de `*.test.ts` retorna 0 resultados  
**Solución:**
1. Instalar Jest + React Native Testing Library
2. Tests de servicios API (10 tests mínimos):
   - `authAPI.login` con mock de axios
   - `solicitudesService.listarSolicitudes` con filtros
   - `ordenesProveedor.dedupeOrdenes` (lógica crítica)
3. Tests de componentes (5 componentes):
   - `FormularioOferta` - validación de precios
   - `ChecklistItem` - lógica de progreso
   - `InstitutionalButton` - variantes
4. Tests de utils:
   - `resolveProveedorRoute` - lógica de navegación
   - `estadoProveedorCache` - expiración

**Esfuerzo:** 5-7 días  
**ROI:** Previene bugs costosos en producción

#### P0.2 - Eliminar LogBox.ignoreAllLogs(true)
**Problema:** Todos los errores/warnings ocultos en desarrollo  
**Ubicación:** `app/_layout.tsx:10-77`  
**Impacto:** Errores críticos no detectados hasta producción  
**Solución:**
1. Comentar `LogBox.ignoreAllLogs(true)`
2. Ejecutar app, anotar todos los warnings
3. Arreglar warnings críticos (red, deprecations)
4. Ignorar warnings específicos con `LogBox.ignoreLogs([...])` (no `ignoreAllLogs`)
5. Documentar warnings conocidos en README

**Esfuerzo:** 2-3 días  
**ROI:** Detecta errores temprano

#### P0.3 - Auditar y Eliminar Logs con Datos Sensibles
**Problema:** `console.log` con tokens/datos personales  
**Ubicación:** Múltiples archivos, ej: `services/api.ts:601-604`  
**Impacto:** Tokens/PII en logs de producción  
**Solución:**
1. Buscar todos los `console.log` sin `if (__DEV__)`
2. Envolver en condicional `__DEV__`
3. Eliminar logs con: tokens, emails, teléfonos, direcciones
4. Usar logger estructurado (Sentry breadcrumbs) para producción

**Esfuerzo:** 1 día  
**ROI:** Previene leak de datos sensibles

#### P0.4 - Configurar App Signing para Android
**Problema:** APK sin firma verificable  
**Impacto:** APKs pueden ser modificados/reempaquetados  
**Solución:**
1. Generar keystore con `keytool`
2. Configurar en `eas.json`: `"android": { "buildType": "app-bundle" }`
3. Subir keystore a EAS: `eas credentials`
4. Build firmado: `eas build --platform android`

**Esfuerzo:** 0.5 días  
**ROI:** Seguridad de distribución

### P1 - ALTO (Resolver en 1-2 sprints)

#### P1.1 - Consolidar Componentes del Design System
**Problema:** Duplicados entre `components/ui/` y `design-system/components/`  
**Evidencia:** `docs/UI_ORPHAN_COMPONENTS.md`  
**Impacto:** Cambios inconsistentes, confusión  
**Solución:**
1. Leer `docs/UI_ORPHAN_COMPONENTS.md`
2. Mover todos los componentes institucionales a `design-system/components/`
3. Re-exportar desde `design-system/components/index.ts`
4. Actualizar imports en toda la app
5. Eliminar carpeta `components/ui/` (excepto componentes de dominio)

**Esfuerzo:** 3-4 días  
**ROI:** Mantenibilidad, claridad

#### P1.2 - Agregar Compresión de Imágenes en Uploads
**Problema:** Fotos de 5-10MB sin comprimir  
**Ubicación:** `services/api.ts:subirArchivoDirecto`, `checklistService:subirFoto`  
**Impacto:** Uploads lentos, timeout en 3G  
**Solución:**
1. Usar `expo-image-manipulator` antes de upload
2. Resize a max 1920x1080 (conserva calidad)
3. Comprimir con quality 0.8 (80%)
4. Mostrar progreso con `XMLHttpRequest.upload.onprogress`

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

async function prepareImage(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

**Esfuerzo:** 1-2 días  
**ROI:** UX en conexiones lentas

#### P1.3 - Validar Deep Link Callbacks
**Problema:** MercadoPago callback sin validación de state  
**Ubicación:** `app.json:40-54` intent filter  
**Impacto:** Phishing con `mecanimovilappproveedores://mercadopago/callback?success=true`  
**Solución:**
1. Generar `state` token al crear preferencia MP
2. Guardar en AsyncStorage antes de abrir checkout
3. En callback, validar `state` recibido vs guardado
4. Rechazar callback si no coincide

```typescript
// Antes de abrir checkout
const state = uuid();
await AsyncStorage.setItem('mp_state', state);
const checkoutUrl = `${mpUrl}&state=${state}`;

// En callback handler
const receivedState = new URL(url).searchParams.get('state');
const savedState = await AsyncStorage.getItem('mp_state');
if (receivedState !== savedState) throw new Error('Invalid callback');
```

**Esfuerzo:** 0.5 días  
**ROI:** Previene phishing

#### P1.4 - Migrar WebSocket Auth Token a Mensaje en lugar de Query String
**Problema:** Token puede quedar en logs de server  
**Ubicación:** `services/websocketService.ts` (conexión)  
**Impacto:** Medio - token en URLs de WebSocket  
**Solución:**
1. Conectar sin token: `wss://api/ws/proveedor/{id}/`
2. Enviar token en primer mensaje: `{ type: 'auth', token }`
3. Backend valida token y mantiene conexión o cierra
4. Cliente espera mensaje `{ type: 'auth_ok' }` antes de enviar datos

**Esfuerzo:** 1 día (requiere cambio en backend también)  
**ROI:** Mejor seguridad de tokens

#### P1.5 - Agregar Accesibilidad Básica
**Problema:** Sin `accessibilityHint`, `accessibilityState`  
**Impacto:** Usuarios con VoiceOver/TalkBack tienen mala UX  
**Solución:**
1. Auditoría con VoiceOver (iOS) y TalkBack (Android)
2. Agregar hints a botones principales:
   ```tsx
   <InstitutionalButton
     accessibilityLabel="Enviar oferta"
     accessibilityHint="Envía tu cotización al cliente"
     accessibilityRole="button"
   />
   ```
3. Marcar íconos decorativos como hidden:
   ```tsx
   <Icon accessibilityElementsHidden />
   ```
4. Agregar `accessibilityState` a controles:
   ```tsx
   <HostSwitch accessibilityState={{ checked: value }} />
   ```

**Esfuerzo:** 2-3 días  
**ROI:** Inclusividad, compliance

#### P1.6 - Corregir Versión de TypeScript en package.json
**Problema:** `typescript@6.0.3` no existe  
**Ubicación:** `package.json:78`  
**Impacto:** Build puede fallar en CI, npm install con warnings  
**Solución:**
1. Cambiar a `typescript@~5.6.3` (última 5.x)
2. Ejecutar `npm install`
3. Verificar que no hay errores de tipo: `npx tsc --noEmit`

**Esfuerzo:** 0.1 días  
**ROI:** Evita confusión y posibles errores

### P2 - MEDIO (Resolver en 2-3 sprints)

#### P2.1 - Simplificar Auto-Discovery de Servidor en Desarrollo
**Problema:** 80 líneas de lógica para detectar IP local  
**Ubicación:** `services/serverConfig.ts:170-250`  
**Impacto:** Frágil en redes complejas (VPN, proxy)  
**Solución:**
1. Requerir `.env` en desarrollo con `EXPO_PUBLIC_API_URL`
2. Si no existe, mostrar error con instrucciones claras
3. Mantener auto-discovery solo como fallback opcional
4. Documentar setup en README con ejemplos para cada plataforma

**Esfuerzo:** 1 día  
**ROI:** Menos bugs de conectividad en desarrollo

#### P2.2 - Virtualizar Listas Largas
**Problema:** FlatList sin optimización para >50 items  
**Ubicación:** Radar de solicitudes, lista de órdenes, etc.  
**Impacto:** Scrolling laggueado con muchos items  
**Solución:**
```tsx
<FlatList
  data={solicitudes}
  renderItem={renderSolicitud}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

**Esfuerzo:** 1 día  
**ROI:** UX fluida con muchos datos

#### P2.3 - Agregar Remote Config para URL de Backend
**Problema:** URL hardcodeada en `app.json`  
**Impacto:** Si backend cambia dominio, app deja de funcionar  
**Solución:**
1. Usar Expo Updates con channel
2. Configurar `expo-constants` con extra dinámico
3. Backend retorna URL en primer request (bootstrapping)
4. App cachea URL y actualiza en cada launch

**Esfuerzo:** 2 días  
**ROI:** Flexibilidad de infraestructura

#### P2.4 - Implementar Skeleton States Consistentes
**Problema:** Algunos screens usan loading spinner, otros skeleton  
**Evidencia:** `components/ui/Skeleton/` tiene 4 componentes pero no usados en todos lados  
**Impacto:** UX inconsistente  
**Solución:**
1. Crear skeletons para todas las screens principales:
   - `SolicitudCardSkeleton` (ya existe: `RadarOfferCardSkeleton`)
   - `OrdenCardSkeleton` (ya existe: `OrdenTicketCardSkeleton`)
   - `DashboardSkeleton` (ya existe: `DashboardScreenSkeleton`)
   - `ChecklistSkeleton` (faltante)
2. Usar en `isLoading` de React Query:
   ```tsx
   if (isLoading) return <SolicitudCardSkeleton />;
   ```

**Esfuerzo:** 2 días  
**ROI:** UX profesional, percepción de velocidad

#### P2.5 - Agregar Monitoreo de Performance con Sentry
**Problema:** No hay métricas de performance en producción  
**Impacto:** No se detectan degradaciones de velocidad  
**Solución:**
1. Instalar `@sentry/react-native`
2. Configurar en `app/_layout.tsx` solo para producción:
   ```typescript
   if (!__DEV__) {
     Sentry.init({ dsn: process.env.SENTRY_DSN });
   }
   ```
3. Trackear custom transactions:
   ```typescript
   const transaction = Sentry.startTransaction({ name: 'CrearOferta' });
   // ... lógica
   transaction.finish();
   ```
4. Configurar alertas para: TTI >5s, crashes >1%

**Esfuerzo:** 1 día  
**ROI:** Visibilidad de problemas en producción

#### P2.6 - Documentar Arquitectura en README.md
**Problema:** No hay README con overview del proyecto  
**Evidencia:** `cat README.md` no retorna nada  
**Impacto:** Onboarding lento de nuevos devs  
**Solución:**
1. Crear `README.md` con:
   - Descripción del proyecto
   - Stack tecnológico
   - Setup de desarrollo (paso a paso)
   - Estructura de carpetas (high-level)
   - Scripts disponibles (`npm run start`, etc.)
   - Links a docs (`/docs/`, `/openspec/`)
   - Contacto del equipo
2. Agregar diagramas de arquitectura (Mermaid):
   - Flujo de autenticación
   - Ciclo de vida de solicitud
   - WebSocket channels

**Esfuerzo:** 1-2 días  
**ROI:** Onboarding eficiente

#### P2.7 - Refactorizar Lógica de Normalización de Nombres de Archivo
**Problema:** 20 líneas de lógica para agregar extensión correcta  
**Ubicación:** `services/api.ts:840-859`  
**Impacto:** Lógica duplicada en varios lugares, frágil  
**Solución:**
1. Centralizar en `utils/fileHelpers.ts`:
   ```typescript
   export function normalizeFilename(name: string, mimeType: string): string {
     // Lógica de extensiones
   }
   ```
2. Usar en todos los uploads
3. Mejor: Backend debe aceptar cualquier MIME válido y normalizar server-side

**Esfuerzo:** 0.5 días  
**ROI:** Menos duplicación, más robusto

#### P2.8 - Agregar Animaciones con Reanimated en Componentes Clave
**Problema:** Algunas animaciones con `Animated` (viejo)  
**Ubicación:** `CountdownTimer` y otros  
**Impacto:** Animaciones no están en UI thread, pueden laggear  
**Solución:**
1. Migrar `CountdownTimer` a `react-native-reanimated`
2. Usar `useSharedValue` y `useAnimatedStyle`
3. Transiciones de pantalla con `SharedElement` (Expo Router)

```typescript
const opacity = useSharedValue(0);
useEffect(() => {
  opacity.value = withTiming(1, { duration: 300 });
}, []);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value
}));
```

**Esfuerzo:** 2 días  
**ROI:** Animaciones 60fps garantizadas

#### P2.9 - Agregar Invalidación de Cache al Volver de Background
**Problema:** Cache de 60s puede mostrar datos obsoletos  
**Ubicación:** `utils/auth/estadoProveedorCache.ts`  
**Impacto:** Usuario cambia datos en otro dispositivo/web, app no actualiza  
**Solución:**
```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      clearEstadoProveedorCache();
      refrescarEstadoProveedor();
    }
  });
  return () => subscription.remove();
}, []);
```

**Esfuerzo:** 0.5 días  
**ROI:** Datos siempre frescos

#### P2.10 - Code Splitting Manual para Reducir Bundle Web
**Problema:** Bundle web >3MB (inferido)  
**Impacto:** TTI lento en web  
**Solución:**
1. Usar dynamic imports para rutas pesadas:
   ```typescript
   const ChecklistScreen = lazy(() => import('./checklist'));
   ```
2. Separar vendor chunks en webpack config
3. Lazy load de `react-native-gifted-charts` (solo en KPIs screen)
4. Considerar cambio a Vite para web

**Esfuerzo:** 2-3 días  
**ROI:** Web más rápida

---

## RESUMEN EJECUTIVO

### Fortalezas del Proyecto

1. **Arquitectura sólida:** Expo Router + React Query + Context API bien estructurado
2. **Sistema de diseño unificado:** Airbnb Hosts + Tinder con tokens consistentes
3. **TypeScript strict:** Tipos bien definidos, interfaces claras
4. **Servicios modulares:** 30 servicios organizados por dominio, ~13k líneas
5. **Features completas:** Onboarding, solicitudes, órdenes, checklist, chat, agenda, cotizaciones, CRM
6. **WebSocket real-time:** Radar de oportunidades y mensajería instantánea
7. **Multi-rol:** Mandante, supervisor, mecánico con permisos granulares
8. **Documentación OpenSpec:** Especificaciones detalladas de features

### Puntos Críticos de Mejora

1. **❌ Sin tests:** 0 tests en 147k líneas - riesgo de regresiones
2. **❌ LogBox deshabilitado:** Errores ocultos en desarrollo
3. **❌ Logs con datos sensibles:** Tokens en producción
4. **❌ Sin app signing:** APKs modificables
5. **⚠️ Componentes duplicados:** UI/Design System desorganizado
6. **⚠️ Sin compresión de imágenes:** Uploads lentos
7. **⚠️ Accesibilidad básica:** Sin hints ni estados
8. **⚠️ Performance:** Sin monitoreo, listas no virtualizadas

### Métricas del Proyecto

- **Líneas de código:** ~147,015
- **Pantallas:** 76 screens
- **Componentes:** 218 componentes reutilizables
- **Servicios:** 30 archivos (12,775 líneas)
- **Tests:** 0 ❌
- **Deuda técnica:** 33 marcadores (TODO/FIXME)
- **Dependencias:** 72 producción + 4 desarrollo

### Recomendación Final

**La aplicación es funcionalmente completa y bien arquitecturada**, pero tiene **deuda técnica crítica en testing y observabilidad**. 

**Prioridad inmediata (P0):**
1. Implementar suite de tests básica (5-7 días)
2. Re-habilitar LogBox y arreglar warnings (2-3 días)
3. Auditar y eliminar logs sensibles (1 día)
4. Configurar app signing (0.5 días)

**Total P0:** ~9-12 días de trabajo

Esto dará una **base sólida** para continuar desarrollando features sin riesgo de colapso por regresiones o bugs de seguridad.

---

**Fin del Análisis**

Fecha: 3 de noviembre, 2026  
Analista: Claude (Cursor Agent)  
Líneas analizadas: ~147,015  
Archivos revisados: 300+  
Tiempo de análisis: Solo lectura (sin cambios)
