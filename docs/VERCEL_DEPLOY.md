# Deploy web — Vercel (mecanimovil-prov)

App Expo Router exportada como sitio estático (`expo export --platform web` → carpeta `dist/`).

## Error `404: NOT_FOUND` (gru1::…)

Suele aparecer cuando Vercel **no sirve archivos** del build, no cuando falla la app en el navegador.

### Causa más común en este proyecto

Un deploy **vacío** (build de **0 ms**, sin `expo export`). El dominio existe pero no hay `index.html` en producción. Solución: redeploy con `vercel.json` en el repo o `npx vercel --prod` desde la raíz del proyecto.

### Otras causas

1. **Output Directory incorrecto** (vacío, `public`, `web-build` en lugar de `dist`).
2. **Build Command** distinto o el build falló y no hay `index.html` en la salida.
3. **Falta `vercel.json`** en el repo (rewrites SPA + comando de build).
4. **Root Directory** apuntando a otra carpeta (debe ser `.` en el repo `mecanimovil-prov`).
5. **Git no conectado** en Vercel → no hay deploys automáticos al hacer push.

### Checklist en Vercel (Settings → Build & Deployment)

| Campo | Valor |
|--------|--------|
| Framework Preset | Other (o dejar que lea `vercel.json`) |
| Root Directory | `.` |
| Build Command | `npx expo export --platform web` (o vacío si usas `vercel.json`) |
| Output Directory | `dist` |
| Install Command | `npm install` |

Tras subir `vercel.json` al repo, **Redeploy** (Deployments → ⋮ → Redeploy).

### Verificar el build en logs

En el log del deploy debe verse algo como `Exported: dist` y al final no errores. Luego en **Deployment → Source** debería existir `index.html` en la raíz del output.

### Probar en local

```bash
cd mecanimovil-prov
npm install
npx expo export --platform web
npx serve dist
```

Abre `http://localhost:3000` (o el puerto que indique `serve`).

## Variables de entorno (Production) — obligatorias para login web

En Vercel → Project → Settings → Environment Variables (marca **Production**):

| Variable | Uso |
|----------|-----|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Botón «Usar Google» (OAuth popup) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Opcional en web; útil si compartes build |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Solo nativo |

Sin `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, el build de web deja el client ID vacío y Google no abre.

Tras añadir variables → **Redeploy** (el valor se embebe en el bundle en tiempo de build).

Google OAuth (obligatorio para «Usar Google»): ver **`docs/GOOGLE_AUTH_SETUP.md` §6** — en GCP, cliente Web `…cjebsrg7s5s48sumoh3gio83jf5tskj9`:

- Origin: `https://mecanimovil-prov-web.vercel.app`
- Redirect: `https://mecanimovil-prov-web.vercel.app/oauth-callback.html`

## Deploy manual (CLI)

```bash
npx vercel link
npx vercel --prod
```

## Deploy Hook (opcional)

Vercel → Settings → Git → Deploy Hooks → crea hook y en `package.json`:

```json
"deploy:vercel": "curl -fsS -X POST <URL_DEL_HOOK> -H 'Content-Type: application/json'"
```
