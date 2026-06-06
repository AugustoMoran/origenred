# Configuración de Facturación Electrónica AFIP 🇦🇷

Este sistema utiliza el Web Service de AFIP (WSFEv1) para autorizar facturas y obtener el CAE.

## 1. Requisitos Previos
Para que la integración funcione, necesitas:
*   **CUIT** de la empresa/monotributista.
*   **Certificado Digital (.crt)** y **Clave Privada (.key)**.
*   Estar dado de alta en el servicio "Facturación Electrónica" en AFIP.

## 2. Generación de Certificados (Entorno Testing/Homologación)
Si aún no tienes certificados de producción, puedes usar el entorno de pruebas:
1.  Genera una clave privada: `openssl genrsa -out privada.key 2048`
2.  Genera un pedido de certificado (CSR): `openssl req -new -key privada.key -subj "/C=AR/O=Empresa/CN=Nombre/serialNumber=CUIT20XXXXXXXXX" -out pedido.csr`
3.  Sube el `pedido.csr` a la web de AFIP (WSASS - Gestión de certificados) para obtener tu `.crt`.

## 3. Configuración en la App
Edita el archivo `.env` del backend (o las variables de entorno de tu servidor) con los siguientes campos:

```env
# Datos de la Empresa
COMPANY_NAME="Mi Negocio S.A."
COMPANY_CUIT="30123456789" # Solo números
COMPANY_ADDRESS="Calle Falsa 123, CABA"
COMPANY_EMAIL="facturacion@minegocio.com"

# Configuración AFIP (local)
AFIP_CERT_PATH="../secure/afip/tu-certificado.crt"
AFIP_KEY_PATH="../secure/afip/private.key"
AFIP_PTO_VTA="1"

# Cola AFIP
ENABLE_AFIP_QUEUE="true"
REDIS_URL="redis://localhost:6379"

NODE_ENV="development" # Usa "production" para entorno real
```

## 4. Deploy en Render (recomendado)

En Render no conviene depender de rutas de archivos locales. Lo recomendado es cargar certificado y clave como variables de entorno en formato PEM.

Variables mínimas en Render (Backend):

- `NODE_ENV=production`
- `MONGO_URI=<mongodb-uri-produccion>`
- `JWT_ACCESS_TOKEN_SECRET=<secreto-largo>`
- `JWT_REFRESH_TOKEN_SECRET=<secreto-largo>`
- `CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://*.vercel.app`
- `COMPANY_CUIT=<cuit-sin-guiones>`
- `AFIP_PTO_VTA=1`
- `ENABLE_AFIP_QUEUE=true`
- `REDIS_URL=<redis-de-render-o-upstash>`
- `AFIP_CERT_PEM="-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----"`
- `AFIP_KEY_PEM="-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----"`
- `BRAND_LOGO_PATH=<ruta-opcional-al-logo-para-PDFs>`

> El backend ya prioriza `AFIP_CERT_PEM`/`AFIP_KEY_PEM` y usa `AFIP_CERT_PATH`/`AFIP_KEY_PATH` solo como fallback para local.
> Para facturas/remitos, el backend busca logo en `BRAND_LOGO_PATH` y, si no está, usa fallback automático (`frontend/public/brand-logo.png`).

## 5. Notas Técnicas
*   **Punto de Venta:** Por defecto la app usa el Punto de Venta `1`. Asegúrate de tenerlo creado en AFIP como "Web Services".
*   **Sin certificado/clave:** si no configuras certificado y clave (`AFIP_CERT_PEM`/`AFIP_KEY_PEM` o `AFIP_CERT_PATH`/`AFIP_KEY_PATH`), AFIP queda deshabilitado y la API devolverá error de configuración al facturar.
*   **Librería:** Utilizamos `@afipsdk/afip.js`.
