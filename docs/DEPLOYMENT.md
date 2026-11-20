# Despliegue en producción — NailStudio (Nb_nails)

Guía para publicar la app 24/7 con enlace permanente `https://...` (PWA instalable, compatible con PWABuilder para Google Play).

## Arquitectura recomendada
- **Frontend PWA (`apps/web`)** → Vercel (o Netlify) — HTTPS, CDN, SPA rewrites.
- **API (`apps/api`)** → Render o Railway — Node.js, CORS, cookies seguras.
- **Persistencia:** el backend guarda datos en archivo JSON en `DATA_DIR` (citas, comprobantes en base64, inventario, bitácora, configuración, usuarios). Para que persistan entre reinicios/despliegues necesitas **disco/volumen persistente** en el host de la API (ver nota abajo).

> **Importante:** en Render el plan gratuito tiene sistema de archivos efímero (se pierde al reiniciar). Para persistencia real usa: Render con **Persistent Disk** (plan de pago), **Railway** con **Volume**, o migra a una base de datos externa (Prisma/MySQL/PostgreSQL) en una fase posterior.

---

## 1) Preparar el repositorio (GitHub)
1. Crea un repositorio en GitHub (o usa el tuyo) y sube el proyecto:
   ```bash
   git init
   git add .
   git commit -m "chore: prepare NailStudio for production deploy"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```
2. Asegúrate de **no** subir `.env` (ya está en `.gitignore`). Sube `.env.example`.

---

## 2) Desplegar la API (`apps/api`) — Render (recomendado)
1. Entra a https://render.com y crea cuenta → **New +** → **Web Service**.
2. Conecta tu repositorio de GitHub.
3. Configura:
   - **Name:** `nailstudio-api` (o el que prefieras)
   - **Root Directory:** `apps/api`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (pruebas) o plan con disco para persistencia
4. **Environment Variables** (Environment → Add):
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | una cadena larga y aleatoria (mín. 32 chars) |
   | `JWT_ACCESS_EXPIRES` | `15m` |
   | `REFRESH_TOKEN_EXPIRES_DAYS` | `7` |
   | `BCRYPT_ROUNDS` | `10` |
   | `CORS_ORIGINS` | `https://<tu-frontend>.vercel.app` (actualiza cuando tengas la URL) |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAME_SITE` | `none` |
   | `TRUST_PROXY` | `true` |
   | `DATA_DIR` | `/data` (si usas disco) o `./data` |
5. (Recomendado para persistencia) En **Disks** → Add Disk: mount path `/data`, tamaño 1GB. Ajusta `DATA_DIR=/data`.
6. Crea el servicio y espera el deploy. Tu API quedará en: `https://<nailstudio-api>.onrender.com`
7. Verifica: abre `https://<nailstudio-api>.onrender.com/health` → debe responder `{ "data": { "status": "ok" } }`.

### Alternativa: Railway
1. https://railway.app → New Project → Deploy from GitHub repo.
2. Configura el servicio con **Root Directory** `apps/api`.
3. **Build:** `npm install && npm run build` — **Start:** `npm start`.
4. Variables: mismas que arriba. Railway asigna `PORT` automáticamente.
5. Para persistencia: agrega un **Volume** y móntalo en `/data`, define `DATA_DIR=/data`.
6. Genera dominio público: Settings → Networking → Generate Domain.

---

## 3) Desplegar el Frontend PWA (`apps/web`) — Vercel (recomendado)
1. Entra a https://vercel.com → Add New → Project → importa tu repo.
2. Configura:
   - **Framework Preset:** Vite
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<tu-api>.onrender.com/api/v1` |
4. Deploy. Obtendrás un enlace permanente: `https://<tu-proyecto>.vercel.app`
5. **Actualiza CORS en la API:** vuelve a Render/Railway y pon `CORS_ORIGINS=https://<tu-proyecto>.vercel.app`, luego redeploy/restart la API.

### Alternativa: Netlify
1. https://app.netlify.com → Add new site → Import from Git.
2. **Base directory:** `apps/web` — **Build command:** `npm run build` — **Publish directory:** `apps/web/dist`.
3. Variable: `VITE_API_URL=https://<tu-api>.onrender.com/api/v1`.
4. El archivo `public/_redirects` (incluido) asegura el routing SPA.

---

## 4) Validar PWA instalable (requisito PWABuilder / Play Store)
1. Abre tu URL `https://<tu-proyecto>.vercel.app` en Chrome (Android o desktop).
2. DevTools → **Lighthouse** → selecciona **Progressive Web App** → Analyze. Debe pasar los requisitos de instalabilidad (manifest, service worker, HTTPS, íconos 192/512).
3. Comprueba: botón "📲 Instalar App" funciona; en Android aparece el prompt; en iPhone muestra instrucciones "Agregar a pantalla de inicio".
4. Para empaquetar a Android (TWA): https://www.pwabuilder.com → ingresa tu URL → genera paquete para Google Play.

---

## 5) Checklist de producción
- [ ] `JWT_SECRET` fuerte y único (no usar el de `.env.example`).
- [ ] `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, `TRUST_PROXY=true` en API.
- [ ] `CORS_ORIGINS` contiene exactamente la URL del frontend (https).
- [ ] `VITE_API_URL` apunta a la API con `/api/v1`.
- [ ] Disco/volumen persistente configurado si necesitas conservar datos entre reinicios.
- [ ] Probar flujo completo: cotizar → reservar → subir comprobante → aprobar en `/admin` → bitácora/inventario.
- [ ] (Opcional) Configurar SMTP en la API para recordatorios por correo cuando falte 1 hora.

## Credenciales seed (cambiar en producción)
- Admin: `admin@nailstudio.com` / `Admin1234` (accede en `/admin`)
- Estas cuentas se crean al iniciar si no hay datos persistidos. **Cambia la contraseña** o elimina/reemplaza usuarios en una versión con base de datos real antes de uso público.

## Notas
- Los comprobantes se almacenan como data URL (base64) en el store; con disco persistente se conservan. Para alto volumen, considera almacenamiento de archivos (S3/Cloudinary) en el futuro.
- La API actual usa almacenamiento en archivo JSON para facilitar el despliegue; el esquema Prisma (`apps/api/prisma/schema.prisma`) está listo para migrar a MySQL/PostgreSQL cuando se requiera escalabilidad.
