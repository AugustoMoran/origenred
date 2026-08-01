# Configuración AFIP / ARCA (OsoSound)

Esta plataforma se conecta **directamente** a los web services de ARCA (WSAA + SOAP local). **No** necesitás `AFIP_ACCESS_TOKEN` de AfipSDK cloud.

## Datos de tu certificado actual

| Campo | Valor |
|---|---|
| Alias en ARCA | `OsoNueva` |
| CUIT emisor | `20202042644` |
| Archivo certificado | `OsoNueva_38146f35a69357ab.crt` |
| Vencimiento | 02/07/2028 |

## 1. Portal AFIP / ARCA (manual)

Con Clave Fiscal del CUIT **20202042644**:

1. Entrá a **Administrador de Relaciones de Clave Fiscal**.
2. Buscá el certificado con alias **OsoNueva**.
3. Delegá estos servicios al alias (producción):
   - `ws_sr_constancia_inscripcion` — búsqueda de CUIT en el POS
   - `wsfe` — facturación electrónica
   - (opcional) `ws_sr_padron_a5` — fallback de padrón

4. Verificá que el **punto de venta 7** exista y esté habilitado para **Web Services** en Facturación Electrónica.

Los cambios en ARCA pueden tardar unos minutos en propagarse.

## 2. Variables en Render (Backend)

Copiá **exactamente** estas variables. El certificado y la clave van en **variables separadas**.

```env
NODE_ENV=production
COMPANY_CUIT=20202042644
COMPANY_NAME=Oso Sound
COMPANY_ADDRESS=<tu domicilio fiscal>
COMPANY_EMAIL=<email facturación>

AFIP_PRODUCTION=true
AFIP_PTO_VTA=7

# Certificado SOLO (sin la clave privada)
AFIP_CERT_PEM=-----BEGIN CERTIFICATE-----\nMIIDQzCCAiugAwIBAgII...\n-----END CERTIFICATE-----

# Clave privada SOLO (la que usaste al generar el CSR de OsoNueva)
AFIP_KEY_PEM=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----

ENABLE_AFIP_QUEUE=true
REDIS_URL=redis://...
AFIP_ENQUEUE_TIMEOUT_MS=4000
```

### Formato al pegar en Render

- `AFIP_CERT_PEM` → **solo** el bloque `-----BEGIN CERTIFICATE-----` … `-----END CERTIFICATE-----`
- `AFIP_KEY_PEM` → **solo** el bloque `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`
- Podés pegar en una sola línea usando `\n` entre líneas (el backend los convierte automáticamente).
- **No** concatenes certificado + clave en la misma variable.
- La clave privada debe ser la pareja del CSR con el que pediste `OsoNueva_38146f35a69357ab.crt`.

### Errores comunes

| Síntoma | Causa probable |
|---|---|
| "AFIP no configurado" | Falta `AFIP_CERT_PEM` / `AFIP_KEY_PEM` o `COMPANY_CUIT` |
| Certificado y clave no coinciden | Clave de otro CSR (ej. certificado viejo OsoSound1) |
| `COMPANY_CUIT` distinto al cert | Debe ser `20202042644` |
| Búsqueda CUIT falla tras deploy | Servicio `ws_sr_constancia_inscripcion` no delegado al alias |
| Factura queda en FAILED | Falta `REDIS_URL` o `ENABLE_AFIP_QUEUE=true` |

## 3. Verificación después del deploy

Como admin autenticado:

```http
GET /api/afip/diagnostics?sampleCuit=20394100359
```

Respuesta esperada:

- `config.configured: true`
- `config.companyCuit: "20202042644"`
- `config.certCuit: "20202042644"`
- `services[].ok: true` para `ws_sr_constancia_inscripcion` y `wsfe`
- `sampleLookup.found: true` con nombre del contribuyente

## 4. Cola de facturación

La emisión de CAE es asíncrona (BullMQ + Redis):

- `ENABLE_AFIP_QUEUE=true`
- `REDIS_URL` apuntando a Redis de Render o Upstash

Sin Redis la venta se guarda pero la factura no se autoriza.

## 5. Generar un CSR nuevo (si renovás certificado)

```bash
openssl req -new -key private.key \
  -subj "/C=AR/O=OsoSound/CN=OsoNueva/serialNumber=CUIT 20202042644" \
  -out OsoNueva.csr
```

Subí el CSR en el portal ARCA → Certificados digitales → alias **OsoNueva**.

## 6. Notas técnicas

- Librería: `@afipsdk/afip.js@0.8.1` con WSAA local (sin proxy cloud).
- `AFIP_ACCESS_TOKEN` **no** se usa; la versión 1.x de AfipSDK lo exige y generaba el error 401 anterior.
- Tokens WSAA se cachean en `uploads/.afip_tokens/` del servidor.
