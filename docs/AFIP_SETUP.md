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
Edita el archivo `.env` en la raíz (o las variables de entorno de tu servidor) con los siguientes campos:

```env
# Datos de la Empresa
COMPANY_NAME="Mi Negocio S.A."
COMPANY_CUIT="30123456789" # Solo números
COMPANY_ADDRESS="Calle Falsa 123, CABA"
COMPANY_EMAIL="facturacion@minegocio.com"

# Configuración AFIP
AFIP_CERT_PATH="C:/certificados/factura_afip.crt" # Ruta absoluta
AFIP_KEY_PATH="C:/certificados/privada.key"     # Ruta absoluta
NODE_ENV="development" # Usa "production" para el entorno real
```

## 4. Notas Técnicas
*   **Punto de Venta:** Por defecto la app usa el Punto de Venta `1`. Asegúrate de tenerlo creado en AFIP como "Web Services".
*   **Modo Simulación:** Si no configuras `AFIP_CERT_PATH` o `AFIP_KEY_PATH`, la app funcionará en **modo simulación**, generando CAEs falsos para que puedas seguir testeando la interfaz de usuario sin conexión real.
*   **Librería:** Utilizamos `@afipsdk/afip.js`.
