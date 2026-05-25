# Propuesta: Google Sign-In — App Proveedores

## Why
Los proveedores necesitan el mismo flujo de autenticación Google que la app usuarios (login rápido, selector de cuentas, registro automático), con guardrails invertidos: rechazar cuentas solo-cliente y permitir onboarding de proveedor.

## What Changes
- Backend: `POST /usuarios/google-login-proveedor/` con validación `id_token` (misma lógica que `google_login`).
- Frontend prov: hooks `useGoogleSignInFlow` (native/web), `loginWithGoogle` en AuthContext, login 3 pasos (accounts/methods/email).
- Config: plugin Google Sign-In en `app.json`, `oauth-callback.html`, `.env.example`.
- Docs: `docs/GOOGLE_AUTH_SETUP.md` (checklist Firebase/Render/EAS).

## Non-goals
- No modificar flujo Google de app usuarios.
- No crear perfil Cliente en auto-registro proveedor.
- No soportar Google en Expo Go (solo dev/production builds).

## Guardrails
- Cuenta existente solo cliente (`es_mecanico=false`, sin Taller/Mecánico) → 403 + alerta CLIENT_ACCOUNT.
- Cuenta proveedor o `es_mecanico=true` sin perfil → token + onboarding.
- Usuario nuevo → auto-create `es_mecanico=True`, sin Cliente.
