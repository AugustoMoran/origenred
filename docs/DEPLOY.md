# Deploy OrigenRed — Render + Vercel

## Backend (Render)

1. Crear **Web Service** en [Render](https://render.com)
2. Conectar repo `origenred` → branch `main`
3. Configuración:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (usa `backend/Dockerfile`)
   - **Health Check Path:** `/health`
4. Variables de entorno (mínimas):

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_TOKEN_SECRET` | Secreto largo aleatorio |
| `JWT_REFRESH_TOKEN_SECRET` | Secreto largo aleatorio |
| `FRONTEND_URL` | URL Vercel, ej. `https://origenred.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | Misma URL + dominio custom si aplica |
| `R2_*` | Cloudflare R2 (imágenes) |
| `MERCADOPAGO_*` | Pagos + webhook |
| `MERCADOPAGO_WEBHOOK_URL` | `https://<render-api>/api/marketplace/checkout/webhook` |

5. Tras deploy, anotar URL: `https://origenred-api.onrender.com`

Alternativa: usar `render.yaml` en la raíz del repo (Blueprint).

---

## Frontend (Vercel)

1. Importar repo en [Vercel](https://vercel.com)
2. Configuración:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Variables de entorno:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://<render-api>/api` |
| `VITE_COMPANY_NAME` | `OrigenRed` |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Public key MP |

4. `frontend/vercel.json` ya incluye rewrites SPA.

---

## Mobile (Expo)

En `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://<render-api>/api
```

Para builds de producción: `eas build` con projectId en `app.json`.

---

## Post-deploy checklist

- [ ] `npm run seed` contra Atlas (admin + categorías)
- [ ] MP webhook apuntando al backend Render
- [ ] R2 bucket público / CDN configurado
- [ ] Meilisearch (opcional) — host accesible desde Render
- [ ] Probar login, checkout, webhook de pago
