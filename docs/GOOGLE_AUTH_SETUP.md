# Google Sign-In — App Proveedores

Checklist para habilitar login/registro con Google en **mecanimovil-prov**.

## 1. Firebase / Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/) (o Firebase → Project settings → Your apps).
2. Crea o selecciona el proyecto MecaniMóvil.
3. **APIs & Services → Credentials → Create OAuth client ID** (tipo según plataforma):

| Plataforma | Package / Bundle ID | Notas |
|------------|---------------------|-------|
| Android | `com.mecanimovil.proveedores` | SHA-1 del keystore de debug y release (EAS) |
| iOS | `com.mecanimovil.proveedores` | Bundle ID debe coincidir con `app.json` |
| Web | — | Para build web y popup OAuth |

4. Anota los **Client IDs** generados (formato `XXXX.apps.googleusercontent.com`).

## 2. google-services.json (Android)

1. En Firebase, agrega app Android con package `com.mecanimovil.proveedores`.
2. Descarga `google-services.json`.
3. Colócalo en la **raíz de mecanimovil-prov** (`./google-services.json`).
4. En el bloque `com.mecanimovil.proveedores`, el OAuth **Web** (`client_type: 3`) debe ser el mismo que `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`…cjebsrg7s5s48sumoh3gio83jf5tskj9`). El repo ya está alineado; si regeneras desde Firebase, verifica ese ID.
5. **No lo subas a git** si tu política lo exige; en este repo el archivo está versionado para EAS/Android builds.

## 3. app.json — iosUrlScheme

En el plugin `@react-native-google-signin/google-signin`:

```json
"iosUrlScheme": "com.googleusercontent.apps.123456789-abcdefg"
```

- Toma el **iOS Client ID** completo: `123456789-abcdefg.apps.googleusercontent.com`
- Invierte el prefijo: `com.googleusercontent.apps.` + la parte antes de `.apps.googleusercontent.com`
- Reemplaza el placeholder `REVERSED_IOS_CLIENT_ID_AQUI` en `app.json`.

## 4. Backend Render — GOOGLE_OAUTH_CLIENT_IDS

En el servicio **mecanimovil-api** (Render → Environment), pega el valor listo en:

**[`docs/RENDER_GOOGLE_ENV_VARS.md`](./RENDER_GOOGLE_ENV_VARS.md)** (sección 1).

Incluye usuarios + proveedores Android/Web; añade iOS proveedores cuando lo tengas.

Sin esto, el backend rechazará tokens con `Token de Google inválido`.

## 5. Variables EAS / entorno local (prov)

El repo ya incluye `.env` con Android y Web (desde `google-services.json`). Solo falta **iOS**:

```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=85359766939-vod9ceeb0fj4p8c7pvmp31flk0ai56fm.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=   # ← pegar cuando crees el cliente iOS en GCP
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com
```

`app.config.ts` aplica `iosUrlScheme` automáticamente cuando `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` está definido.

Para EAS Build: ver `docs/RENDER_GOOGLE_ENV_VARS.md` (comandos `eas secret:create`).

## 6. Web — Google Cloud (fix `redirect_uri_mismatch`)

El login web usa el cliente OAuth **Web** cuyo ID está en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`:

`85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com`

**No uses el cliente Web de la app usuarios** (`487744484665-…`); cada app tiene su propio client ID.

### Pasos en Google Cloud Console

1. Abre [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) (proyecto **mecanimovilapp** / Firebase MecaniMóvil).
2. En **OAuth 2.0 Client IDs**, edita el cliente tipo **Web application** cuyo ID termina en `…cjebsrg7s5s48sumoh3gio83jf5tskj9` (proveedores web).
3. En **Authorized JavaScript origins**, agrega **exactamente** (sin `/` final):

   | Entorno | URL |
   |---------|-----|
   | Producción Vercel | `https://mecanimovil-prov-web.vercel.app` |
   | Dev local (Expo web) | `http://localhost:8081` |

4. En **Authorized redirect URIs**, agrega **exactamente** (ruta completa, minúsculas):

   | Entorno | URL |
   |---------|-----|
   | Producción | `https://mecanimovil-prov-web.vercel.app/oauth-callback.html` |
   | Dev local | `http://localhost:8081/oauth-callback.html` |

5. **Save**. Los cambios en Google suelen aplicar en **1–5 minutos** (a veces hasta ~10 min).

### Comprobar

- Abre en el navegador: `https://mecanimovil-prov-web.vercel.app/oauth-callback.html` → debe cargar “Iniciando sesión con Google…” (HTTP 200).
- En login → **Usar Google**: el popup no debe mostrar `Error 400: redirect_uri_mismatch`.

### Errores frecuentes

| Error | Causa |
|-------|--------|
| `redirect_uri_mismatch` | Falta la redirect URI **exacta** de la tabla (incluye `/oauth-callback.html`). |
| Mismo error tras guardar | Cliente OAuth equivocado (editaste el de usuarios en lugar del de proveedores). |
| `origin_mismatch` | Falta el **JavaScript origin** sin path (`https://mecanimovil-prov-web.vercel.app`). |
| `https://mecanimovil-prov-web.vercel.app/` con barra final | Quitar la `/` final en **origins** (solo el origin, sin path). |

### Preview deployments (opcional)

Si pruebas URLs de preview de Vercel (`…-git-main-….vercel.app`), añade también ese origin y `…/oauth-callback.html` en el mismo cliente Web. Producción usa solo el dominio alias principal arriba.

El callback estático vive en `public/oauth-callback.html` y se exporta a `dist/oauth-callback.html`.

## 7. Dev build obligatorio (nativo)

Google Sign-In **no funciona en Expo Go**. Usa:

```bash
npx expo run:ios
# o
npx expo run:android
# o EAS dev build
```

## 8. Verificación rápida

1. Backend desplegado con `GOOGLE_OAUTH_CLIENT_IDS` actualizado.
2. Dev build prov instalado con `.env` / EAS vars.
3. Login → **Usar Google** → cuenta nueva → onboarding `tipo-cuenta`.
4. Cuenta solo cliente → mensaje *"Utiliza la aplicación de usuarios"*.

## Referencias en el repo

- Backend: `POST /api/usuarios/google-login-proveedor/`
- Frontend: `hooks/auth/useGoogleSignInFlow.*`, `context/AuthContext.tsx`
- OpenSpec: `openspec/changes/google-auth-proveedor/`
