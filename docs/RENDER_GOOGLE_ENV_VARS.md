# Variables Google para Render y EAS

Copia estos valores en **Render** (servicio `mecanimovil-api`) y en **EAS Secrets** / `.env` local de proveedores.

---

## 1. Render — `GOOGLE_OAUTH_CLIENT_IDS`

Variable de entorno en el backend Django. **Una sola línea**, IDs separados por coma (sin espacios).

### App usuarios (proyecto GCP `487744484665`)

```
487744484665-vn63daqqbpfeod7rkg1sqta6n7ej7gri.apps.googleusercontent.com
487744484665-otrorqrrqkkc7riu1kshlcqknakok0mm.apps.googleusercontent.com
487744484665-gpu5qn0pjsauugaq4i4ki7or6j0v60vf.apps.googleusercontent.com
```

### App proveedores (proyecto Firebase `85359766939` / `mecanimovilapp`)

```
85359766939-vod9ceeb0fj4p8c7pvmp31flk0ai56fm.apps.googleusercontent.com
85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com
```

### iOS proveedores (agregar cuando lo tengas)

```
<TU_IOS_PROV_CLIENT_ID>.apps.googleusercontent.com
```

### Valor completo para pegar en Render (sin iOS prov aún)

```
487744484665-vn63daqqbpfeod7rkg1sqta6n7ej7gri.apps.googleusercontent.com,487744484665-otrorqrrqkkc7riu1kshlcqknakok0mm.apps.googleusercontent.com,487744484665-gpu5qn0pjsauugaq4i4ki7or6j0v60vf.apps.googleusercontent.com,85359766939-vod9ceeb0fj4p8c7pvmp31flk0ai56fm.apps.googleusercontent.com,85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com
```

Cuando crees el cliente iOS de proveedores, **añádelo al final** de la misma variable (otra coma + el nuevo ID) y redeploy del backend.

---

## 2. EAS / `.env` local — mecanimovil-prov

Ya configurado en `.env` del repo (no subir a git si contiene datos sensibles; los Client IDs son públicos en la app).

| Variable | Valor |
|----------|--------|
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | `85359766939-vod9ceeb0fj4p8c7pvmp31flk0ai56fm.apps.googleusercontent.com` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | *(pendiente — pegar cuando lo crees)* |

Comandos EAS (opcional):

```bash
cd mecanimovil-prov
npx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "85359766939-vod9ceeb0fj4p8c7pvmp31flk0ai56fm.apps.googleusercontent.com" --scope project
npx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "85359766939-cjebsrg7s5s48sumoh3gio83jf5tskj9.apps.googleusercontent.com" --scope project
```

---

## 3. iOS — cuando tengas el Client ID

1. Pégalo en `.env` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...`
2. Agrégalo a `GOOGLE_OAUTH_CLIENT_IDS` en Render.
3. `app.config.ts` generará `iosUrlScheme` automáticamente en el próximo build.
4. Nuevo build EAS iOS.

---

## 4. Después de guardar en Render

1. **Manual Deploy** del servicio API (o esperar auto-deploy si está ligado a git).
2. Probar login Google en APK proveedores.
