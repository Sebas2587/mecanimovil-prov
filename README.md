# MecaniMóvil - App Proveedores

Aplicación móvil para proveedores/mecánicos del servicio MecaniMóvil, construida con React Native, Expo SDK 57 y TypeScript.

## 📋 Requisitos

- Node.js 18+ (recomendado: 20+)
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Cuenta en Expo (https://expo.dev)

## 🚀 Instalación y Desarrollo

### 1. Instalar dependencias

```bash
npm install
```

**Nota:** El proyecto usa `.npmrc` configurado con `legacy-peer-deps=true` para resolver conflictos de peer dependencies entre paquetes de Expo/React Native. Esto permite que `npm install` funcione sin flags adicionales.

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (nunca commitear este archivo):

```bash
# Backend API
API_URL=https://api.mecanimovil.cl/api

# Google Sign-In (Android)
ANDROID_CLIENT_ID=tu-client-id.apps.googleusercontent.com

# Google Sign-In (iOS)
IOS_CLIENT_ID=tu-client-id.apps.googleusercontent.com

# Expo Project ID
EXPO_PROJECT_ID=tu-project-id
```

### 3. Ejecutar en desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# Para Android
npm run android

# Para iOS
npm run ios

# Para web
npm run web
```

## 🧪 Tests

El proyecto utiliza Jest + Testing Library para tests unitarios.

```bash
# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con coverage
npm run test:coverage
```

### Tests disponibles

- **Servicios de autenticación** (`services/__tests__/api.test.ts`): Login, logout, estado del proveedor
- **Lógica de órdenes** (`services/__tests__/ordenesProveedor.test.ts`): Deduplicación de órdenes
- **Navegación** (`utils/auth/__tests__/resolveProveedorRoute.test.ts`): Lógica de routing basada en estado

## 🔐 Configuración de Firma de App (EAS Build)

### Android

#### Opción 1: Credenciales gestionadas por EAS (Recomendado)

EAS Build puede generar y gestionar automáticamente tus credenciales de firma:

```bash
# Iniciar sesión en EAS
eas login

# Configurar el proyecto
eas build:configure

# Crear build de producción (EAS generará el keystore automáticamente)
eas build --platform android --profile production
```

EAS te preguntará si deseas que genere un nuevo keystore. Selecciona "Yes" para credenciales gestionadas.

#### Opción 2: Usar keystore existente

Si ya tienes un keystore Android:

1. Configura las credenciales en EAS:
   ```bash
   eas credentials
   ```

2. Selecciona Android → Keystore → Upload nuevo keystore

3. Proporciona:
   - Archivo keystore (.jks o .keystore)
   - Keystore password
   - Key alias
   - Key password

**IMPORTANTE:** Nunca commitear el archivo keystore en git. Mantenerlo solo en EAS o en un lugar seguro.

### iOS

#### Configurar credenciales de Apple

1. Asegúrate de tener una cuenta de Apple Developer activa

2. Configura las credenciales en EAS:
   ```bash
   eas credentials
   ```

3. Selecciona iOS y sigue las instrucciones para configurar:
   - Distribution Certificate
   - Provisioning Profile
   - Push Notification Keys (si usas notificaciones)

4. Alternativamente, EAS puede gestionar automáticamente tus certificados si le das acceso a tu cuenta de Apple Developer:
   ```bash
   eas build --platform ios --profile production
   ```

### Variables de entorno para Submit (Opcional)

Si deseas automatizar la subida a las tiendas, configura estas variables en Expo:

```bash
# Android - Service Account para Google Play Console
# 1. Crea un Service Account en Google Cloud Console
# 2. Descarga el archivo JSON
# 3. Guárdalo como google-service-account.json (en .gitignore)

# iOS - Credenciales de App Store Connect
APPLE_ID=tu-apple-id@example.com
ASC_APP_ID=1234567890  # ID de tu app en App Store Connect
APPLE_TEAM_ID=ABCD123456  # Team ID de Apple Developer
```

**NUNCA commitear estas credenciales en git.** Usa el archivo `.gitignore` provisto.

### Builds de Producción

```bash
# Android (AAB para Play Store)
eas build --platform android --profile production

# Android (APK para distribución directa)
eas build --platform android --profile production-apk

# iOS (para App Store)
eas build --platform ios --profile production

# Ambas plataformas
eas build --platform all --profile production
```

### Builds de Preview/Testing

```bash
# Android APK para testing interno
eas build --platform android --profile preview

# iOS para TestFlight
eas build --platform ios --profile preview
```

### Submit a las tiendas

```bash
# Submit Android a Google Play Console
eas submit --platform android --profile production

# Submit iOS a App Store Connect
eas submit --platform ios --profile production
```

## 📦 Estructura del Proyecto

```
mecanimovil-app-proveedores/
├── app/                     # Pantallas de Expo Router
│   ├── (auth)/             # Pantallas de autenticación
│   ├── (tabs)/             # Pantallas principales con tab navigation
│   ├── (onboarding)/       # Flujo de onboarding
│   └── _layout.tsx         # Layout raíz con configuración
├── components/             # Componentes reutilizables
├── context/               # React Context (AuthContext, etc.)
├── design-system/         # Sistema de diseño
│   ├── components/        # Componentes del design system
│   ├── styles/           # Estilos compartidos
│   └── tokens/           # Tokens de diseño (colores, tipografía, etc.)
├── services/             # Servicios y lógica de negocio
│   ├── api.ts           # Cliente API principal
│   ├── auth/            # Servicios de autenticación
│   ├── ordenesProveedor.ts
│   └── solicitudesService.ts
├── utils/               # Utilidades
│   ├── auth/           # Helpers de autenticación
│   ├── authStorage.ts  # Gestión de almacenamiento
│   └── logger.ts       # Logger seguro (P0)
├── __tests__/          # Tests unitarios
├── eas.json           # Configuración de EAS Build
├── app.config.ts      # Configuración de Expo
├── package.json
└── tsconfig.json
```

## 🔒 Seguridad

### Logger Seguro

El proyecto incluye un logger seguro (`utils/logger.ts`) que:

- **Solo imprime logs en modo desarrollo** (`__DEV__`)
- **Redacta automáticamente datos sensibles**: tokens, passwords, emails, credenciales
- **Nunca expone información sensible en producción**

**Uso del logger:**

```typescript
import logger from '@/utils/logger';

// En lugar de console.log
logger.log('Información general');
logger.info('Información');
logger.warn('Advertencia');
logger.error('Error');
logger.debug('Debug info');
```

**IMPORTANTE:** Nunca usar `console.log` directamente para loggear:
- Tokens de autenticación
- Passwords o credenciales
- Información personal identificable (emails, teléfonos, RUTs)
- API keys o secrets

### LogBox

LogBox está habilitado en desarrollo para detectar errores reales. Solo se ignoran warnings específicos conocidos y ruidosos:

- `Non-serializable values were found in the navigation state`
- `VirtualizedLists should never be nested`
- `Remote debugger`
- `Animated: 'useNativeDriver' was not specified`

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm start                    # Iniciar servidor de desarrollo
npm run start:clear         # Iniciar limpiando cache
npm run android             # Correr en Android
npm run ios                 # Correr en iOS
npm run web                 # Correr en web

# Testing
npm test                    # Ejecutar tests
npm run test:watch          # Tests en modo watch
npm run test:coverage       # Tests con coverage

# Build y Deploy
npm run export              # Exportar para web
npm run export:web          # Exportar para web (alias)
npm run deploy:vercel:cli   # Deploy a Vercel (web)
npm run lint                # Linting con ESLint

# EAS Build (requiere eas-cli instalado globalmente)
eas build --profile development    # Build de desarrollo
eas build --profile preview        # Build de preview
eas build --profile production     # Build de producción
```

## 🧹 Verificación de Calidad

Antes de crear un PR o hacer deploy, ejecuta:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Tests
npm test

# 4. Verificar que la app exporta correctamente
npx expo export
```

Todos los comandos deben pasar sin errores.

## 📝 Convenciones de Código

- **TypeScript estricto**: Enabled (`strict: true`)
- **Path aliases**: Usar `@/` para imports desde raíz
  - `@/app/components` → `./components`
  - `@/app/services` → `./services`
  - `@/app/design-system` → `./design-system`
- **Logger seguro**: Usar `logger` en lugar de `console.log`
- **Tests**: Escribir tests para lógica de negocio crítica

## 🐛 Troubleshooting

### Error de dependencias de peer

```bash
npm install --legacy-peer-deps
```

### Cache de Expo

```bash
npx expo start -c
# o
npm run start:clear
```

### Error de TypeScript

```bash
# Limpiar cache de TypeScript
rm -rf node_modules/.cache
npx tsc --noEmit
```

### Tests fallando

```bash
# Limpiar cache de Jest
npx jest --clearCache
npm test
```

## 📚 Recursos

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)

## 📄 Licencia

Propiedad de MecaniMóvil. Todos los derechos reservados.
