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
