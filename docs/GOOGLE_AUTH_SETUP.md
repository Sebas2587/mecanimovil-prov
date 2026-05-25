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
4. **No lo subas a git** si contiene datos sensibles; usa EAS secrets o CI.

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
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=85359766939-43i2uscgvk6gpg337chr6gffbvv7mne5.apps.googleusercontent.com
```

`app.config.ts` aplica `iosUrlScheme` automáticamente cuando `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` está definido.

Para EAS Build: ver `docs/RENDER_GOOGLE_ENV_VARS.md` (comandos `eas secret:create`).

## 6. Web — redirect URIs autorizadas

En el OAuth client **Web** de proveedores, registra:

**Authorized JavaScript origins**

- `http://localhost:8081` (dev)
- URL de producción web prov (dominio Vercel del proyecto, p. ej. `https://mecanimovil-proveedores.vercel.app`)

**Authorized redirect URIs**

- `http://localhost:8081/oauth-callback.html`
- `https://<tu-dominio-prov>/oauth-callback.html`

El archivo estático está en `public/oauth-callback.html`.

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
