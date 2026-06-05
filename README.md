# Plataforma de Facturación Premium

## Resumen del Sistema
Sistema de facturación y gestión de inventario multi-sucursal con diseño "Dark Premium".

### Características Principales
- **Inventario Multi-sucursal:** Gestión de stock independiente por sucursal con movimientos atómicos.
- **Facturación AFIP (Arquitecturada):** Procesamiento de facturas mediante colas (BullMQ + Redis) para mayor confiabilidad.
- **Seguridad:** Autenticación JWT y sistema de permisos basado en roles (Admin/Vendedor).
- **Diseño Premium:** Interfaz oscura optimizada para POS y administración.
- **Imágenes:** Integración con Cloudinary para fotos de productos.

## Tecnologías
- **Frontend:** React, Vite, Tailwind CSS, RTK Query.
- **Backend:** Node.js, Express, TypeScript, Mongoose.
- **Procesamiento:** BullMQ, Redis.
- **Almacenamiento:** MongoDB, Cloudinary.

## Estructura de Proyecto
- `backend/src/modules`: Estructura modular (Stock, Sales, Users, Branches).
- `frontend/src`: Componentes atómicos y servicios via RTK Query.

## Instalación
1. Clonar el repositorio.
2. Instalar dependencias en root, backend y frontend.
3. Configurar `.env` (MongoDB, Cloudinary, Redis, AFIP Credentials).
4. `npm run dev` en ambas carpetas.

- docker/
- nginx/
- scripts/
- docs/
- docker-compose.yml

Instrucciones rápidas:

1. Copiar `.env.sample` a `.env` y rellenar variables.
2. `docker-compose up --build` para levantar servicios en desarrollo/prod (ver `docker/`).

Este repositorio es un scaffold inicial con arquitectura modular, seguridad y despliegue en mente.# plataforma-de-facturacion
Sistema profesional de facturación y gestión comercial desarrollado con React, TypeScript, Express y MongoDB. Incluye control de stock por sucursal, ventas, facturación AFIP, roles y permisos dinámicos, comisiones, códigos de barras, sincronización en tiempo real, reportes, autenticación segura con JWT HttpOnly y arquitectura lista para producción.

## Deploy de Producción (Render + Vercel)

### Backend en Render
- **Root Directory:** `backend`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run start`

Variables recomendadas en Render:
- `NODE_ENV=production`
- `PORT=4000`
- `MONGO_URI=<mongodb-uri-produccion>`
- `JWT_ACCESS_TOKEN_SECRET=<secreto-largo>`
- `JWT_REFRESH_TOKEN_SECRET=<secreto-largo>`
- `CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://*.vercel.app`
- `FRONTEND_URL=https://tu-frontend.vercel.app`
- `REDIS_URL=<opcional-si-activas-colas-afip>`
- `ENABLE_AFIP_QUEUE=false` (o `true` si Redis está listo)

### Frontend en Vercel
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Variable requerida en Vercel:
- `VITE_API_URL=https://tu-backend.onrender.com/api`

El archivo `frontend/vercel.json` ya incluye rewrite SPA para que las rutas de React funcionen correctamente.
