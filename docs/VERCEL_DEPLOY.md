# Deploy web — Vercel (mecanimovil-prov)

App Expo Router exportada como sitio estático (`expo export --platform web` → carpeta `dist/`).

## Error `404: NOT_FOUND` (gru1::…)

Suele aparecer cuando Vercel **no sirve archivos** del build, no cuando falla la app en el navegador.

### Causas habituales

1. **Output Directory incorrecto** (vacío, `public`, `web-build` en lugar de `dist`).
2. **Build Command** distinto o el build falló y no hay `index.html` en la salida.
3. **Falta `vercel.json`** en el repo (rewrites SPA + comando de build).
4. **Root Directory** apuntando a otra carpeta (debe ser `.` en el repo `mecanimovil-prov`).

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

## Variables de entorno (Production)

En Vercel → Project → Settings → Environment Variables:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Cualquier otra `EXPO_PUBLIC_*` que uses en `.env` local

Google OAuth: orígenes y redirect con tu dominio real (`docs/GOOGLE_AUTH_SETUP.md`).

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
