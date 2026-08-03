# OrigenRed — Marketplace Argentino

Plataforma marketplace multi-vendedor con panel admin propio (AFIP/POS/inventario) y módulo independiente para vendedores terceros.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Node.js + Express + TypeScript + Mongoose
- **DB:** MongoDB Atlas
- **Storage:** Cloudflare R2
- **Búsqueda:** Meilisearch (opcional, activa con env)
- **Pagos:** Mercado Pago Connect (split 95/5)
- **Envíos:** EnvíoPack (opcional, activa con env)
- **Deploy:** Render (backend) + Vercel (frontend)

## Estructura
```
backend/src/modules/
  marketplace/     ← Vendedores terceros, listings, OrigenRank, favoritos, denuncias
  inventory/       ← Productos propios (admin)
  sales/           ← POS y ventas propias
  afip/            ← Facturación electrónica propia
frontend/src/
  pages/marketplace/   ← Home, búsqueda, registro vendedor
  pages/admin/         ← Panel admin (incluye gestión marketplace)
  pages/dashboard/     ← POS, inventario propio
```

## Setup local
1. Copiar `backend/.env.example` → `backend/.env` y completar variables
2. Copiar `frontend/.env.example` → `frontend/.env`
3. `cd backend && npm install && npm run seed` (crea admin + categorías)
4. `cd backend && npm run dev`
5. `cd frontend && npm install && npm run dev`

### Admin seed
- Email: `admin@origenred.com.ar`
- Password: `OrigenRed2026!`

### Integraciones (activación automática al completar .env)
| Variable | Servicio |
|----------|----------|
| `R2_*` | Cloudflare R2 imágenes |
| `MEILISEARCH_*` | Búsqueda avanzada |
| `MERCADOPAGO_*` | Pagos + Connect OAuth |
| `ENVIOPACK_*` | Cotización envíos |

## API Marketplace
- `GET /api/marketplace/home` — datos home
- `GET /api/marketplace/listings` — catálogo público
- `POST /api/marketplace/sellers/register` — registro vendedor
- `GET /api/marketplace/admin/sellers/pending` — aprobar vendedores (admin)

## Docker
```bash
docker-compose up --build
```
Incluye MongoDB, Redis y Meilisearch local.

### Meilisearch
1. Con Docker: `MEILISEARCH_HOST=http://localhost:7700` y la master key definida en `docker-compose.yml`.
2. Al iniciar el backend se crea el índice `listings` automáticamente.
3. Reindexar productos activos (admin): `POST /api/marketplace/admin/search/reindex`
4. Sin Meilisearch, la búsqueda usa MongoDB (fallback en `listingService`).
