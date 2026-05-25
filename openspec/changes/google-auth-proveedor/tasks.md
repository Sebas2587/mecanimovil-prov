# Tasks: Google Auth Proveedor

## Backend
- [x] `google_login_proveedor` en `views.py`
- [x] URL `google-login-proveedor/` en `urls.py`
- [x] `GOOGLE_OAUTH_CLIENT_IDS` en `.env.example` (backend)

## Frontend
- [x] `services/auth/googleAuth.ts`
- [x] `hooks/auth/useGoogleSignInFlow.native.ts` + `.web.ts`
- [x] `loginWithGoogle` + GoogleSignin.configure en `AuthContext.tsx`
- [x] Refactor `app/(auth)/login.tsx` (3-step Canva + tokens + Lucide)
- [x] Prefill Google en `app/(auth)/registro.tsx`
- [x] `public/oauth-callback.html`
- [x] `app.json` plugin + googleServicesFile
- [x] `.env.example` (prov)
- [x] `package.json` @react-native-google-signin/google-signin

## Docs / OpenSpec
- [x] `docs/GOOGLE_AUTH_SETUP.md`
- [x] Actualizar `openspec/specs/auth-login/spec.md`
- [x] Change folder `openspec/changes/google-auth-proveedor/`

## Manual (usuario)
- [ ] Crear OAuth clients Firebase/GCP para `com.mecanimovil.proveedores`
- [ ] Descargar `google-services.json` → raíz prov
- [ ] Configurar `iosUrlScheme` en `app.json`
- [ ] Render: `GOOGLE_OAUTH_CLIENT_IDS` con todos los client IDs
- [ ] EAS/env: `EXPO_PUBLIC_GOOGLE_*`
- [ ] Web: redirect URIs producción + localhost
- [ ] Dev build (no Expo Go)
